import type { Workbook, Worksheet } from "exceljs";
import { companyOf } from "@/components/inbox/v2/store";
import {
  EXECUTION_LABEL,
  KINDS,
  KIND_LABEL,
  REVIEW_LABEL,
  allRows,
  exceptionCode,
  groupCode,
  linkable,
  rowOf,
} from "@/hooks/pages/neo/use-recon";
import type {
  ReconEdit,
  ReconException,
  ReconRun,
  RowRef,
  RunVersion,
  SourceKind,
} from "@/types/pages/neo/recon";
import { track } from "@/utils/pages/neo/recon-events";

/**
 * The reconciliation report as an Excel workbook (21 Oct 2026). It
 * replaces the HTML result panel: the report is the file. Sheets:
 * Summary, Exceptions, Match groups, Rows, Questions, and a very hidden
 * "_run" sheet naming the run and version, so an edited copy can come
 * back.
 *
 * A person edits two columns only, Action and Reason (and Answer on
 * Questions). Those cells are yellow and unlocked; every other cell is
 * locked, and anything changed there anyway is reported and ignored when
 * the file comes back. Source rows and amounts are never edited (A2).
 *
 * DEV: GET /api/recon/runs/:id/versions/:n/report.xlsx builds this on the
 * server, and POST /api/recon/runs/:id/report reads an edited copy back
 * into ReconEdit[]. exceljs runs here only because the prototype has no
 * server; production has no spreadsheet library in the client.
 */

const FORMAT = "aia-recon-report";
const FORMAT_VERSION = 1;

/* ARGB colours for the workbook. A spreadsheet has no CSS tokens; these
 * are Excel's own conventions: grey headers, yellow cells to fill in. */
export const FILL_HEAD = "FFF2F2F2";
export const FILL_INPUT = "FFFFF2CC";
export const FILL_LOCKED = "FFFAFAFA";
export const INK_MUTED = "FF6B7280";
const LINE = "FFD9D9D9";
const FONT = "Arial";

/** Indian grouping with two decimals, in Excel's number format. */
export const INR =
  "[>=10000000]##\\,##\\,##\\,##0.00;[>=100000]##\\,##\\,##0.00;##,##0.00";

const load = async () => {
  const mod = await import("exceljs");
  return (mod.default ?? mod) as typeof import("exceljs");
};

export const reportName = (run: ReconRun, v: RunVersion, suffix = "") =>
  `recon-${(companyOf(run.company)?.name || run.company)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${run.periodId}-v${v.n}${suffix}.xlsx`;

/* --------------------------------------------------------- the content */

const EXC_KIND: Record<ReconException["kind"], string> = {
  "two-source": "Two sources only",
  amount: "Amounts differ",
  "no-reference": "No reference",
  candidates: "Several candidates",
  "cross-period": "After the period",
};

const BASIS: Record<string, string> = {
  exact: "Shared reference (R4)",
  batch: "Declared batch (R5)",
  answer: "Your answer",
  manual: "Linked by a person",
};

/** What a person can pick in a row's Action cell. Blank means no change. */
export const exceptionActions = (e: ReconException) => [
  ...(e.candidates.length
    ? e.candidates.map((_, i) => `Link to candidate ${i + 1}`)
    : linkable(e)
      ? ["Link as matched"]
      : []),
  e.deferred ? "Reopen" : "Defer",
];
const UNLINK = "Unlink";

const sumOf = (run: ReconRun, rows: RowRef[], kind: SourceKind) => {
  const p = rows
    .filter((r) => r.kind === kind)
    .reduce((n, r) => n + Math.round((rowOf(run, r)?.amount || 0) * 100), 0);
  return p ? p / 100 : "";
};
const date = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

type Cell = string | number;
type Col = {
  header: string;
  width: number;
  money?: boolean;
  /** A person fills this in. */
  input?: boolean;
  /** The stable ID the file is read back by. */
  id?: boolean;
  wrap?: boolean;
};

const EXC_COLS: Col[] = [
  { header: "Code", width: 7 },
  { header: "Item", width: 24 },
  { header: "Kind", width: 18 },
  { header: "What Neo found", width: 48, wrap: true },
  { header: "Settlement (₹)", width: 15, money: true },
  { header: "Bank (₹)", width: 15, money: true },
  { header: "Books (₹)", width: 15, money: true },
  { header: "Difference (₹)", width: 15, money: true },
  { header: "Candidates", width: 40, wrap: true },
  { header: "Rules", width: 9 },
  { header: "Status", width: 32, wrap: true },
  { header: "Action", width: 22, input: true },
  { header: "Reason", width: 40, input: true, wrap: true },
  { header: "Exception ID", width: 10, id: true },
];

const excRow = (run: ReconRun, v: RunVersion, e: ReconException): Cell[] => [
  exceptionCode(v, e.id),
  e.label,
  EXC_KIND[e.kind],
  e.text,
  sumOf(run, e.rows, "settlement"),
  sumOf(run, e.rows, "bank"),
  sumOf(run, e.rows, "books"),
  e.difference ?? "",
  e.candidates.map((c, i) => `${i + 1}. ${c.why}`).join("\n"),
  e.hits.map((h) => h.rule).join(" "),
  e.deferred
    ? `Deferred by ${e.deferred.actor}, ${date(e.deferred.at)}: ${e.deferred.reason}`
    : "Open",
  "",
  "",
  e.id,
];

const GROUP_COLS: Col[] = [
  { header: "Code", width: 7 },
  { header: "Item", width: 24 },
  { header: "Basis", width: 22 },
  { header: "Reference", width: 20 },
  { header: "Settlement (₹)", width: 15, money: true },
  { header: "Bank (₹)", width: 15, money: true },
  { header: "Books (₹)", width: 15, money: true },
  { header: "Difference (₹)", width: 15, money: true },
  { header: "Rules", width: 12 },
  { header: "Resolved by", width: 40, wrap: true },
  { header: "Action", width: 12, input: true },
  { header: "Reason", width: 40, input: true, wrap: true },
  { header: "Group ID", width: 10, id: true },
];

const groupRow = (
  run: ReconRun,
  v: RunVersion,
  g: RunVersion["groups"][number]
): Cell[] => [
  groupCode(v, g.id),
  g.label,
  BASIS[g.basis] || g.basis,
  g.ref,
  sumOf(run, g.rows, "settlement"),
  sumOf(run, g.rows, "bank"),
  sumOf(run, g.rows, "books"),
  g.difference || "",
  g.hits.map((h) => h.rule).join(" "),
  g.by ? `${g.by.actor}, ${date(g.by.at)}: ${g.by.reason}` : "",
  "",
  "",
  g.id,
];

const ROW_COLS: Col[] = [
  { header: "Source", width: 12 },
  { header: "Row ID", width: 18 },
  { header: "Date", width: 12 },
  { header: "Party or narration", width: 44 },
  { header: "Reference", width: 22 },
  { header: "Amount (₹)", width: 15, money: true },
  { header: "Status", width: 12 },
  { header: "In", width: 8 },
];

/** Every accepted row, with where it ended up (R8). */
const rowLines = (run: ReconRun, v: RunVersion): Cell[][] => {
  const place = new Map<string, [string, string]>();
  const key = (k: string, id: string) => `${k}:${id}`;
  v.groups.forEach((g) =>
    g.rows.forEach((r) =>
      place.set(key(r.kind, r.id), ["Matched", groupCode(v, g.id)])
    )
  );
  v.exceptions.forEach((e) =>
    e.rows.forEach((r) =>
      place.set(key(r.kind, r.id), ["Exception", exceptionCode(v, e.id)])
    )
  );
  const rows = allRows(run);
  return KINDS.flatMap((k) =>
    [...rows[k].values()].map((r) => {
      const [status, where] = place.get(key(k, r.id)) || ["Unmatched", ""];
      return [
        KIND_LABEL[k],
        r.id,
        r.date,
        r.party,
        r.ref || "",
        r.amount,
        status,
        where,
      ];
    })
  );
};

const Q_COLS: Col[] = [
  { header: "Question", width: 52, wrap: true },
  { header: "Why it's asked", width: 52, wrap: true },
  { header: "Affects", width: 16 },
  { header: "Answer", width: 34, input: true },
  { header: "Answered by", width: 26 },
  { header: "Question ID", width: 10, id: true },
];

const qRow = (
  run: ReconRun,
  v: RunVersion,
  q: ReconRun["questions"][number]
) => [
  q.text,
  q.detail,
  q.exceptionIds
    .map((id) =>
      v.exceptions.some((e) => e.id === id) ? exceptionCode(v, id) : ""
    )
    .filter(Boolean)
    .join(" "),
  q.options.find((o) => o.id === q.answer)?.label || "",
  q.answeredBy ? `${q.answeredBy}, ${date(q.answeredAt)}` : "",
  q.id,
];

/* ----------------------------------------------------------- writing */

const thin = { style: "thin" as const, color: { argb: LINE } };

/** A sheet's legend, header and rows, with input cells unlocked. */
const table = (
  ws: Worksheet,
  legend: string[],
  cols: Col[],
  rows: Cell[][],
  options: (rowIndex: number, col: Col) => string[] | null = () => null
) => {
  legend.forEach((line, i) => {
    const c = ws.getCell(i + 1, 1);
    c.value = line;
    c.font = {
      name: FONT,
      size: i ? 10 : 11,
      bold: !i,
      color: i ? { argb: INK_MUTED } : undefined,
    };
    ws.mergeCells(i + 1, 1, i + 1, Math.min(cols.length, 8));
  });
  const top = legend.length + 2;
  cols.forEach((col, i) => {
    const column = ws.getColumn(i + 1);
    column.width = col.width;
    if (col.id) column.hidden = true;
    const h = ws.getCell(top, i + 1);
    h.value = col.header;
    h.font = { name: FONT, size: 10, bold: true };
    h.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.input ? FILL_INPUT : FILL_HEAD },
    };
    h.border = { bottom: thin };
    h.alignment = { vertical: "middle" };
  });
  rows.forEach((values, r) => {
    const row = ws.getRow(top + 1 + r);
    values.forEach((value, i) => {
      const col = cols[i];
      const c = row.getCell(i + 1);
      c.value = value === "" ? null : value;
      c.font = { name: FONT, size: 10 };
      c.alignment = { vertical: "top", wrapText: !!col.wrap };
      if (col.money) c.numFmt = INR;
      c.border = { bottom: thin };
      const list = col.input ? options(r, col) : null;
      const open = col.input && (list === null || list.length > 0);
      if (open) {
        c.protection = { locked: false };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: FILL_INPUT },
        };
        if (list?.length)
          c.dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`"${list.join(",")}"`],
            showErrorMessage: true,
            errorTitle: "Pick from the list",
            error: "Choose an action from the list, or leave it blank.",
          };
      } else if (col.input)
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: FILL_LOCKED },
        };
    });
  });
  ws.views = [{ state: "frozen", ySplit: top }];
  ws.autoFilter = {
    from: { row: top, column: 1 },
    to: { row: top + Math.max(rows.length, 1), column: cols.length },
  };
  return top;
};

const protect = (ws: Worksheet) =>
  ws.protect("", {
    selectLockedCells: true,
    selectUnlockedCells: true,
    autoFilter: true,
    sort: true,
    formatColumns: true,
  });

export type BuildOptions = {
  /** Cells to fill in, as if a person had: by stable ID. */
  prefill?: Record<string, { action?: string; reason?: string }>;
  /** A locked cell to change anyway: exception ID and column header. */
  tamper?: { id: string; header: string; value: Cell };
};

/** The workbook itself, for Neo's viewer: the same object the file is written from. */
export const reportWorkbook = (
  run: ReconRun,
  v: RunVersion,
  opts: BuildOptions = {}
) => build(run, v, opts);

const build = async (
  run: ReconRun,
  v: RunVersion,
  opts: BuildOptions = {}
): Promise<Workbook> => {
  const ExcelJS = await load();
  const wb = new ExcelJS.Workbook();
  wb.creator = "Neo · AI Accountant";
  wb.created = new Date(v.createdAt);
  const company = companyOf(run.company)?.name || run.company;
  const rows = rowLines(run, v);
  const rowsLegend = [
    `Rows · ${rows.length} accepted rows · every one is matched, an exception, or unmatched (R8)`,
  ];
  // The Rows sheet's header row; Summary's formulas read the rows under it.
  const ROWS_TOP = rowsLegend.length + 2;

  /* Summary: who, what, and the counts, as formulas over Rows. */
  const sum = wb.addWorksheet("Summary", {
    properties: { tabColor: { argb: "FF3146B0" } },
  });
  sum.getColumn(1).width = 26;
  [2, 3, 4, 5, 6].forEach((i) => (sum.getColumn(i).width = 17));
  const put = (r: number, values: Cell[], bold = false) =>
    values.forEach((value, i) => {
      const c = sum.getCell(r, i + 1);
      c.value = value;
      c.font = { name: FONT, size: 10, bold };
    });
  sum.getCell(1, 1).value =
    `Three-way reconciliation · ${company} · ${run.period.label}`;
  sum.getCell(1, 1).font = { name: FONT, size: 14, bold: true };
  sum.getCell(2, 1).value =
    `Version ${v.n} · ${v.completeness === "full" ? "Full" : "Partial"} · ${REVIEW_LABEL[v.review]}. Read-only: nothing was posted or changed in the books.`;
  sum.getCell(2, 1).font = { name: FONT, size: 10, color: { argb: INK_MUTED } };
  const meta: [string, Cell][] = [
    ["Run ID", run.id],
    ["Period", `${run.period.from} to ${run.period.to}`],
    ["Timezone · currency", `${run.timezone} · ${run.currency}`],
    ["Execution", EXECUTION_LABEL[run.execution]],
    ["Sources", v.sourceVersions.join("; ")],
    ["Rules · configuration", `${v.ruleVersion} · v${v.configVersion}`],
    ["Version made", date(v.createdAt)],
  ];
  meta.forEach(([k, val], i) => {
    put(4 + i, [k]);
    sum.getCell(4 + i, 2).value = val;
    sum.getCell(4 + i, 2).font = { name: FONT, size: 10 };
  });

  let r = 4 + meta.length + 1;
  put(r, ["By source"], true);
  r += 1;
  put(
    r,
    ["Source", "Accepted", "Matched", "Exceptions", "Unmatched", "Rejected"],
    true
  );
  for (let i = 1; i <= 6; i++)
    sum.getCell(r, i).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: FILL_HEAD },
    };
  const span = `${ROWS_TOP + 1}:${ROWS_TOP + rows.length}`;
  const [from, to] = span.split(":");
  const rng = (col: string) => `Rows!$${col}$${from}:$${col}$${to}`;
  KINDS.forEach((k) => {
    r += 1;
    const c = v.counts[k];
    put(r, [KIND_LABEL[k]]);
    const label = KIND_LABEL[k];
    const count = (status?: string) =>
      status
        ? `COUNTIFS(${rng("A")},"${label}",${rng("G")},"${status}")`
        : `COUNTIFS(${rng("A")},"${label}")`;
    [
      [count(), c.accepted],
      [count("Matched"), c.matched],
      [count("Exception"), c.exceptions],
      [count("Unmatched"), c.unmatched],
    ].forEach(([formula, result], i) => {
      const cell = sum.getCell(r, i + 2);
      cell.value = { formula: formula as string, result: result as number };
      cell.font = { name: FONT, size: 10 };
    });
    sum.getCell(r, 6).value = c.rejected;
    sum.getCell(r, 6).font = { name: FONT, size: 10 };
  });
  r += 1;
  sum.getCell(r, 1).value =
    "Counts are formulas over the Rows sheet. Rejected rows never entered the run, so they are counted from validation.";
  sum.getCell(r, 1).font = { name: FONT, size: 9, color: { argb: INK_MUTED } };

  r += 2;
  put(r, ["Amounts by source (₹)"], true);
  r += 1;
  put(r, ["Source", "Matched", "In exceptions", "Unmatched"], true);
  for (let i = 1; i <= 4; i++)
    sum.getCell(r, i).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: FILL_HEAD },
    };
  KINDS.forEach((k) => {
    r += 1;
    put(r, [KIND_LABEL[k]]);
    const label = KIND_LABEL[k];
    ["Matched", "Exception", "Unmatched"].forEach((status, i) => {
      const result = rows
        .filter((x) => x[0] === label && x[6] === status)
        .reduce<number>((n, x) => n + Math.round(Number(x[5]) * 100), 0);
      const cell = sum.getCell(r, i + 2);
      cell.value = {
        formula: `SUMIFS(${rng("F")},${rng("A")},"${label}",${rng("G")},"${status}")`,
        result: result / 100,
      };
      cell.numFmt = INR;
      cell.font = { name: FONT, size: 10 };
    });
  });

  r += 2;
  put(r, ["Match groups", v.groups.length], true);
  put(r + 1, [
    "  Resolved by a person",
    v.groups.filter((g) => g.origin === "human").length,
  ]);
  put(
    r + 2,
    ["Exceptions open", v.exceptions.filter((e) => !e.deferred).length],
    true
  );
  put(r + 3, ["  Deferred", v.exceptions.filter((e) => e.deferred).length]);

  r += 5;
  put(r, ["How to change this report"], true);
  [
    "1. Only the yellow cells can be changed: Action and Reason on Exceptions and Match groups, and Answer on Questions.",
    "2. Pick an Action from the list and write a Reason. For example: Action “Defer”, Reason “Swiggy payout file due 3 Oct”.",
    "3. Save the file and drop it into the Neo chat. Neo checks every change, then runs the reconciliation again as a new version.",
    "4. Or tell Neo in the chat, using the codes: “Defer E4, Swiggy payout file due 3 Oct”.",
    "Amounts and source rows can't be changed here. To correct a source, attach a corrected export; it becomes a new source version.",
  ].forEach((line, i) => {
    const c = sum.getCell(r + 1 + i, 1);
    c.value = line;
    c.font = {
      name: FONT,
      size: 10,
      color: i === 4 ? { argb: INK_MUTED } : undefined,
    };
  });

  if (v.n > 1) {
    r += 8;
    put(r, [`Changes from version ${v.n - 1}`], true);
    v.reason
      .replace(/^[^:]*:\s*/, "")
      .split("; ")
      .forEach((line, i) => {
        const c = sum.getCell(r + 1 + i, 1);
        c.value = `• ${line}`;
        c.font = { name: FONT, size: 10 };
      });
  }
  await protect(sum);

  /* Exceptions: the rows a person decides. */
  const exc = wb.addWorksheet("Exceptions");
  const prefill = opts.prefill || {};
  const excRows = v.exceptions.map((e) => {
    const row = excRow(run, v, e);
    const p = prefill[e.id];
    if (p) {
      row[11] = p.action || "";
      row[12] = p.reason || "";
    }
    if (opts.tamper?.id === e.id) {
      const at = EXC_COLS.findIndex((c) => c.header === opts.tamper!.header);
      if (at >= 0) row[at] = opts.tamper.value;
    }
    return row;
  });
  table(
    exc,
    [
      `Exceptions · version ${v.n} · ${v.exceptions.length} unresolved`,
      "Pick an Action and write a Reason in the yellow cells. Blank means no change. Every link or deferral needs a reason (US-06).",
    ],
    EXC_COLS,
    excRows,
    (i, col) =>
      col.header === "Action" ? exceptionActions(v.exceptions[i]) : null
  );
  await protect(exc);

  /* Match groups: only a person's link can be undone. */
  const grp = wb.addWorksheet("Match groups");
  table(
    grp,
    [
      `Match groups · version ${v.n} · ${v.groups.length} groups`,
      "Automatic matches follow R4 and R5 and are locked. A group linked by a person can be unlinked, with a reason.",
    ],
    GROUP_COLS,
    v.groups.map((g) => {
      const row = groupRow(run, v, g);
      const p = prefill[g.id];
      if (p) {
        row[10] = p.action || "";
        row[11] = p.reason || "";
      }
      return row;
    }),
    (i) => (v.groups[i].basis === "manual" ? [UNLINK] : [])
  );
  await protect(grp);

  /* Rows: every accepted row and where it ended up (R8). */
  const rws = wb.addWorksheet("Rows");
  table(rws, rowsLegend, ROW_COLS, rows);
  await protect(rws);

  /* Questions: answers apply to this run only (US-05). */
  if (run.questions.length) {
    const qs = wb.addWorksheet("Questions");
    table(
      qs,
      [
        "Questions · answers apply to this run only",
        "Change an Answer from the list to re-evaluate the exceptions it affects. Saving an answer to the configuration is a separate step.",
      ],
      Q_COLS,
      run.questions.map((q) => qRow(run, v, q)),
      (i) => run.questions[i].options.map((o) => o.label.replace(/,/g, ""))
    );
    await protect(qs);
  }

  /* _run: what this file is, read when it comes back. */
  const meta2 = wb.addWorksheet("_run", { state: "veryHidden" });
  [
    ["format", FORMAT],
    ["formatVersion", FORMAT_VERSION],
    ["runId", run.id],
    ["version", v.n],
    ["company", run.company],
    ["periodId", run.periodId],
    ["exportedAt", new Date().toISOString()],
  ].forEach(([k, val], i) => {
    meta2.getCell(i + 1, 1).value = k;
    meta2.getCell(i + 1, 2).value = val;
  });
  return wb;
};

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A workbook as a File: the viewer's edits go back through this. */
export const workbookFile = async (wb: Workbook, name: string) =>
  new File([await wb.xlsx.writeBuffer()], name, { type: XLSX_TYPE });

/**
 * What the viewer sends when its edits are applied. The click on Apply is
 * the sign-off, so Neo doesn't ask again.
 */
export const APPLY_FROM_VIEWER = "Apply my changes to the report";

/** The report as a File, ready to download or to attach. */
export const reportFile = async (
  run: ReconRun,
  v: RunVersion,
  opts?: BuildOptions & { name?: string }
) => {
  const wb = await build(run, v, opts);
  const buf = await wb.xlsx.writeBuffer();
  return new File([buf], opts?.name || reportName(run, v), { type: XLSX_TYPE });
};

/** Hand the report to the browser as a download. */
export const downloadReport = async (run: ReconRun, v: RunVersion) => {
  const file = await reportFile(run, v);
  saveFile(file);
  track("report_downloaded", { version: v.n });
  return file;
};

export const saveFile = (file: File) => {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/* ----------------------------------------------------------- reading */

export type ReadReport =
  | { ok: false; why: string }
  | {
      ok: true;
      runId: string;
      version: number;
      edits: ReconEdit[];
      /** Action cells that couldn't be read, by code. */
      problems: { code: string; why: string }[];
      /** Locked cells changed anyway: reported, never applied. */
      ignored: {
        sheet: string;
        code: string;
        column: string;
        was: string;
        now: string;
      }[];
      /** A reason written with no action: nothing to apply. */
      orphanReasons: string[];
    };

const text = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    const o = v as {
      result?: unknown;
      richText?: { text: string }[];
      text?: string;
    };
    if (o.richText) return o.richText.map((t) => t.text).join("");
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return text(o.result);
  }
  return String(v).trim();
};
const same = (a: Cell | "", b: string) => {
  if (typeof a === "number")
    return Math.abs(a - Number(b.replace(/,/g, ""))) < 0.005;
  return String(a).trim() === b.trim();
};

/** The header row, and each header's column number. */
const headerOf = (ws: Worksheet, cols: Col[]) => {
  for (let r = 1; r <= 8; r++) {
    const row = ws.getRow(r);
    const at: Record<string, number> = {};
    row.eachCell((c, n) => (at[text(c.value)] = n));
    if (cols.every((c) => at[c.header])) return { top: r, at };
  }
  return undefined;
};

/** The sheet's rows as {header: text}, below its header row. */
const readTable = (ws: Worksheet | undefined, cols: Col[]) => {
  if (!ws) return undefined;
  const head = headerOf(ws, cols);
  if (!head) return undefined;
  const out: Record<string, string>[] = [];
  for (let r = head.top + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rec: Record<string, string> = {};
    cols.forEach(
      (c) => (rec[c.header] = text(row.getCell(head.at[c.header]).value))
    );
    if (Object.values(rec).some(Boolean)) out.push(rec);
  }
  return out;
};

/**
 * An edited report, read back against the version it was made from:
 * the changes in its Action, Reason and Answer cells, anything changed
 * in a locked cell (ignored), and actions that can't be read.
 */
export const readReport = async (
  file: File,
  runOf: (id: string) => ReconRun | undefined
): Promise<ReadReport> => {
  const ExcelJS = await load();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    return { ok: false, why: "It isn't an Excel workbook Neo can open." };
  }
  const meta = wb.getWorksheet("_run");
  const val = (k: string) => {
    let found = "";
    meta?.eachRow((row) => {
      if (text(row.getCell(1).value) === k) found = text(row.getCell(2).value);
    });
    return found;
  };
  if (!meta || val("format") !== FORMAT)
    return {
      ok: false,
      why: "It isn't a reconciliation report from Neo. Changes can only be read from a report Neo made.",
    };
  const run = runOf(val("runId"));
  const n = Number(val("version"));
  const v = run?.versions.find((x) => x.n === n);
  if (!run || !v)
    return { ok: false, why: "Its run isn't in this workspace any more." };

  const edits: ReconEdit[] = [];
  const problems: { code: string; why: string }[] = [];
  const ignored: Extract<ReadReport, { ok: true }>["ignored"] = [];
  const orphanReasons: string[] = [];
  const compare = (
    sheet: string,
    cols: Col[],
    rec: Record<string, string>,
    expected: Cell[],
    code: string
  ) =>
    cols.forEach((c, i) => {
      if (c.input || c.id) return;
      if (!same(expected[i], rec[c.header]))
        ignored.push({
          sheet,
          code,
          column: c.header,
          was: String(expected[i]),
          now: rec[c.header],
        });
    });

  const excs = readTable(wb.getWorksheet("Exceptions"), EXC_COLS);
  if (!excs)
    return {
      ok: false,
      why: "Its Exceptions sheet is missing or its headers were changed.",
    };
  excs.forEach((rec) => {
    const e = v.exceptions.find((x) => x.id === rec["Exception ID"]);
    if (!e) return;
    const code = exceptionCode(v, e.id);
    compare("Exceptions", EXC_COLS, rec, excRow(run, v, e), code);
    const action = rec.Action;
    const reason = rec.Reason;
    if (!action) {
      if (reason) orphanReasons.push(code);
      return;
    }
    if (!exceptionActions(e).includes(action))
      return problems.push({
        code,
        why: `“${action}” isn't one of its actions.`,
      });
    const cand = action.match(/^Link to candidate (\d+)$/);
    if (cand)
      edits.push({
        type: "link",
        exceptionId: e.id,
        candidate: Number(cand[1]) - 1,
        reason,
      });
    else if (action === "Link as matched")
      edits.push({ type: "link", exceptionId: e.id, candidate: -1, reason });
    else if (action === "Defer")
      edits.push({ type: "defer", exceptionId: e.id, reason });
    else if (action === "Reopen")
      edits.push({ type: "reopen", exceptionId: e.id, reason });
  });

  const groups = readTable(wb.getWorksheet("Match groups"), GROUP_COLS) || [];
  groups.forEach((rec) => {
    const g = v.groups.find((x) => x.id === rec["Group ID"]);
    if (!g) return;
    const code = groupCode(v, g.id);
    compare("Match groups", GROUP_COLS, rec, groupRow(run, v, g), code);
    if (rec.Action === UNLINK)
      edits.push({ type: "unlink", groupId: g.id, reason: rec.Reason });
    else if (rec.Action)
      problems.push({ code, why: `“${rec.Action}” isn't one of its actions.` });
    else if (rec.Reason) orphanReasons.push(code);
  });

  const qs = readTable(wb.getWorksheet("Questions"), Q_COLS) || [];
  qs.forEach((rec) => {
    const q = run.questions.find((x) => x.id === rec["Question ID"]);
    if (!q) return;
    const now = q.options.find((o) => o.label.replace(/,/g, "") === rec.Answer);
    const was = q.options.find((o) => o.id === q.answer);
    if (!rec.Answer || now?.id === was?.id) return;
    if (!now)
      return problems.push({
        code: "Question",
        why: `“${rec.Answer}” isn't one of the answers.`,
      });
    edits.push({ type: "answer", questionId: q.id, answer: now.id });
  });

  return {
    ok: true,
    runId: run.id,
    version: n,
    edits,
    problems,
    ignored,
    orphanReasons,
  };
};
