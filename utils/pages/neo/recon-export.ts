import {
  EXECUTION_LABEL,
  KINDS,
  KIND_LABEL,
  REVIEW_LABEL,
  rowOf,
  totals,
} from "@/hooks/pages/neo/use-recon";
import type { ReconRun, RowRef, RunVersion } from "@/types/pages/neo/recon";

/**
 * US-08: the run version as three CSV files: the summary, the match groups
 * and the exceptions. Every file carries the run ID, version, period,
 * completeness and review status, so a file read on its own still says
 * what it is. Counts and totals are the version's own, the same figures
 * the screen shows (US-08 AC1).
 *
 * DEV: GET /api/recon/runs/:id/versions/:n/export?file=summary|groups|
 * exceptions, behind the company access check (US-08 AC3).
 */

/**
 * A cell a spreadsheet would run as a formula (=, +, -, @, tab, return)
 * is made text with a leading apostrophe. Numbers are left as numbers.
 */
export const safeCell = (v: string | number) => {
  if (typeof v === "number") return String(v);
  const s = /^[=+\-@\t\r]/.test(v) && !/^-?\d+(\.\d+)?$/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const csv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map(safeCell).join(",")).join("\n") + "\n";

const head = (run: ReconRun, v: RunVersion) => [
  ["Run ID", run.id],
  ["Version", v.n],
  ["Company", run.company],
  ["Period", `${run.period.from} to ${run.period.to}`],
  ["Timezone", run.timezone],
  ["Currency", run.currency],
  ["Execution", EXECUTION_LABEL[run.execution]],
  ["Completeness", v.completeness === "full" ? "Full" : "Partial"],
  ["Review", REVIEW_LABEL[v.review]],
  ["Sources", v.sourceVersions.join("; ")],
  ["Rules", v.ruleVersion],
  ["Configuration", `v${v.configVersion}`],
  [],
];

const refsOf = (run: ReconRun, refs: RowRef[], kind: RowRef["kind"]) =>
  refs
    .filter((r) => r.kind === kind)
    .map((r) => r.id)
    .join(" ");

const amountsOf = (run: ReconRun, refs: RowRef[], kind: RowRef["kind"]) =>
  refs
    .filter((r) => r.kind === kind)
    .reduce((n, r) => n + Math.round((rowOf(run, r)?.amount || 0) * 100), 0) /
  100;

export const exportFiles = (run: ReconRun, v: RunVersion) => {
  const t = totals(run, v);
  const stem = `recon-${run.company}-${run.periodId}-v${v.n}`;
  const summary = csv([
    ...head(run, v),
    [
      "Source",
      "Accepted rows",
      "Matched",
      "Exceptions",
      "Unmatched",
      "Rejected rows",
      "Matched amount",
      "Exception amount",
      "Unmatched amount",
    ],
    ...KINDS.map((k) => {
      const c = v.counts[k];
      const a = t.find((x) => x.kind === k)!;
      return [
        KIND_LABEL[k],
        c.accepted,
        c.matched,
        c.exceptions,
        c.unmatched,
        c.rejected,
        a.matched,
        a.exceptions,
        a.unmatched,
      ];
    }),
    [],
    ["Match groups", v.groups.length],
    ["Automatic", v.groups.filter((g) => g.origin === "automatic").length],
    [
      "Resolved by a person",
      v.groups.filter((g) => g.origin === "human").length,
    ],
    ["Exceptions open", v.exceptions.filter((e) => !e.deferred).length],
    ["Exceptions deferred", v.exceptions.filter((e) => e.deferred).length],
  ]);
  const groups = csv([
    ...head(run, v),
    [
      "Group",
      "Label",
      "Basis",
      "Origin",
      "Reference",
      "Settlement rows",
      "Bank rows",
      "Books rows",
      "Settlement amount",
      "Bank amount",
      "Books amount",
      "Difference",
      "Rules",
      "Resolved by",
      "Resolved at",
      "Reason",
    ],
    ...v.groups.map((g) => [
      g.id,
      g.label,
      g.basis,
      g.origin === "human" ? "Resolved by a person" : "Automatic",
      g.ref,
      refsOf(run, g.rows, "settlement"),
      refsOf(run, g.rows, "bank"),
      refsOf(run, g.rows, "books"),
      amountsOf(run, g.rows, "settlement"),
      amountsOf(run, g.rows, "bank"),
      amountsOf(run, g.rows, "books"),
      g.difference,
      g.hits.map((h) => h.rule).join(" "),
      g.by?.actor || "",
      g.by?.at || "",
      g.by?.reason || "",
    ]),
  ]);
  const exceptions = csv([
    ...head(run, v),
    [
      "Exception",
      "Label",
      "Kind",
      "State",
      "Reference",
      "Settlement rows",
      "Bank rows",
      "Books rows",
      "Difference",
      "What",
      "Candidates",
      "Rules",
      "Deferred by",
      "Deferral reason",
    ],
    ...v.exceptions.map((e) => [
      e.id,
      e.label,
      e.kind,
      e.deferred ? "Deferred, unresolved" : "Open, unresolved",
      e.ref,
      refsOf(run, e.rows, "settlement"),
      refsOf(run, e.rows, "bank"),
      refsOf(run, e.rows, "books"),
      e.difference ?? "",
      e.text,
      e.candidates.map((c) => c.why).join("; "),
      e.hits.map((h) => h.rule).join(" "),
      e.deferred?.actor || "",
      e.deferred?.reason || "",
    ]),
  ]);
  return [
    { name: `${stem}-summary.csv`, body: summary, rows: KINDS.length },
    { name: `${stem}-match-groups.csv`, body: groups, rows: v.groups.length },
    {
      name: `${stem}-exceptions.csv`,
      body: exceptions,
      rows: v.exceptions.length,
    },
  ];
};

/** Hand the files to the browser as downloads. */
export const download = (files: { name: string; body: string }[]) => {
  if (typeof document === "undefined") return;
  files.forEach((f) => {
    const url = URL.createObjectURL(
      new Blob([f.body], { type: "text/csv;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
};
