import { useSyncExternalStore } from "react";
import { actor } from "@/components/inbox/v2/store";
import {
  BOOKS_CORRECTED,
  RECON_PERIODS,
  RECON_SAMPLE,
  sampleFile,
  type MockSourceFile,
} from "@/config/pages/neo/mock-recon-sources";
import { dayLabel } from "@/config/pages/neo/mock-recon";
import { track } from "@/utils/pages/neo/recon-events";
import type {
  Adjustment,
  AuditEntry,
  Completeness,
  FileOutcome,
  MatchGroup,
  ReconConfig,
  ReconException,
  ReconPeriodId,
  ReconQuestion,
  ReconRun,
  RejectedRow,
  ReviewState,
  RowRef,
  RuleHit,
  ReconEdit,
  ReconEditOrigin,
  RunVersion,
  SourceCounts,
  SourceKind,
  SourceRow,
  SourceVersion,
} from "@/types/pages/neo/recon";

/**
 * Three-way reconciliation, to the AiA 2.0 PRD (v0.1, aligned 21 Oct
 * 2026). Read-only: a run takes the three sources, validates them, links
 * rows into match groups under R1–R8, leaves everything else as an
 * exception or unmatched, asks focused questions, records human
 * resolutions, and produces an immutable, reviewable, exportable version.
 * Nothing is posted; no entry is created or changed (A2).
 *
 * DEV: this is the server's engine, run in the browser. Every exported
 * function is one endpoint (see types/pages/neo/recon.ts).
 */

export const RULE_VERSION = "R1–R8 · PRD v0.1";
export const KINDS: SourceKind[] = ["bank", "settlement", "books"];
export const KIND_LABEL: Record<SourceKind, string> = {
  bank: "Bank",
  settlement: "Settlements",
  books: "Books",
};

/** Indian grouping, two decimals. */
export const inr = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
/** Decimal arithmetic in paise (R3): never add floats. */
const paise = (s: string | number) => Math.round(Number(s) * 100);
const rupees = (p: number) => p / 100;
const now = () => new Date().toISOString();
const uid = (p: string) =>
  `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/* ---------------------------------------------------------------- store */

type State = { configs: ReconConfig[]; runs: ReconRun[] };
let state: State = { configs: [], runs: [] };
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  listeners.forEach((f) => f());
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => state;
export const useRecon = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);

export const getRun = (id: string) => state.runs.find((r) => r.id === id);
export const configOf = (company: string) =>
  state.configs.find((c) => c.company === company);
/** The latest run for a period, the one a review or export reads. */
export const latestRun = (company: string, period: ReconPeriodId) =>
  [...state.runs]
    .reverse()
    .find((r) => r.company === company && r.periodId === period);
/** The company's most recent run, whatever its period. */
export const latestRunOf = (company: string) =>
  [...state.runs].reverse().find((r) => r.company === company);
export const currentVersion = (run: ReconRun): RunVersion | undefined =>
  run.versions[run.versions.length - 1];

const patchRun = (id: string, fn: (r: ReconRun) => ReconRun) =>
  set({ ...state, runs: state.runs.map((r) => (r.id === id ? fn(r) : r)) });
const log = (action: string, detail?: string): AuditEntry => ({
  at: now(),
  actor,
  action,
  detail,
});

/** The most recent answer not yet in the configuration (US-05 AC4). */
export const latestUnsavedAnswer = (company: string) => {
  for (const run of [...state.runs].reverse()) {
    if (run.company !== company) continue;
    const q = [...run.questions]
      .reverse()
      .find((x) => x.answer && x.answer !== "leave" && !x.savedToConfig);
    if (q) return { run, q };
  }
  return undefined;
};

/* ---------------------------------------------------- FR-01 · setup */

export const TEMPLATE = {
  id: "bank-settlement-books",
  name: "Bank ↔ settlements ↔ books",
  sources: [
    {
      kind: "bank" as const,
      label: "Bank statement",
      hint: "HDFC Current A/c ·0418, CSV from net banking",
    },
    {
      kind: "settlement" as const,
      label: "Settlement reports",
      hint: "Card, UPI, Zomato and Swiggy payouts, CSV",
    },
    {
      kind: "books" as const,
      label: "Books",
      hint: "Settlement receipts from Tally, through the AiA 1.0 integration",
    },
  ],
};

/** FR-01: confirm the template for this company, or a new version of it. */
export const confirmConfig = (
  company: string,
  opts: { timezone: string; currency: string }
) => {
  const prior = configOf(company);
  const config: ReconConfig = {
    id: prior?.id || uid("cfg"),
    company,
    version: (prior?.version || 0) + 1,
    template: TEMPLATE.name,
    timezone: opts.timezone,
    currency: opts.currency,
    sources: TEMPLATE.sources,
    mappings: prior?.mappings || [],
    confirmedBy: actor,
    confirmedAt: now(),
  };
  set({
    ...state,
    configs: [...state.configs.filter((c) => c.company !== company), config],
  });
  track("recon_setup_started", {
    configVersion: config.version,
    template: TEMPLATE.id,
  });
  return config;
};

/**
 * US-05 AC4: an answer becomes part of the configuration only through this
 * separate, authorised confirmation. It applies from the next run.
 */
export const saveAnswerToConfig = (runId: string, questionId: string) => {
  const run = getRun(runId);
  const q = run?.questions.find((x) => x.id === questionId);
  const cfg = run && configOf(run.company);
  if (!run || !q?.answer || !cfg) return undefined;
  const opt = q.options.find((o) => o.id === q.answer);
  const next: ReconConfig = {
    ...cfg,
    version: cfg.version + 1,
    mappings: [
      ...cfg.mappings.filter((m) => m.from.questionId !== questionId),
      {
        id: uid("map"),
        text: opt?.hint || opt?.label || q.answer,
        confirmedBy: actor,
        confirmedAt: now(),
        from: { runId, questionId },
      },
    ],
    confirmedBy: actor,
    confirmedAt: now(),
  };
  set({
    ...state,
    configs: state.configs.map((c) => (c.id === cfg.id ? next : c)),
  });
  patchRun(runId, (r) => ({
    ...r,
    questions: r.questions.map((x) =>
      x.id === questionId ? { ...x, savedToConfig: true } : x
    ),
    history: [
      ...r.history,
      log(
        "Saved an answer to the configuration",
        `Configuration v${next.version}`
      ),
    ],
  }));
  return next;
};

/* ------------------------------------------ FR-02/03 · sources, validation */

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const reject = (
  line: number,
  raw: Record<string, string>,
  id: string,
  reason: string,
  rule = "R3"
): RejectedRow => ({ id: id || `line-${line}`, line, raw, reason, rule });

/** S2: map one file's columns and validate every row (FR-03, R2, R3). */
const parse = (
  f: MockSourceFile,
  version: number,
  replaces?: string
): SourceVersion => {
  const accepted: SourceRow[] = [];
  const rejected: RejectedRow[] = [];
  f.rows.forEach((raw, i) => {
    const line = i + 2;
    if (f.kind === "bank") {
      const id = raw["Txn ID"];
      const credit = raw.Credit;
      const debit = raw.Debit;
      if (!id)
        return rejected.push(reject(line, raw, id, "No transaction ID", "R2"));
      if (!DATE.test(raw["Txn Date"]))
        return rejected.push(
          reject(
            line,
            raw,
            id,
            `Date “${raw["Txn Date"]}” isn't in the declared format YYYY-MM-DD`
          )
        );
      if (!credit === !debit)
        return rejected.push(
          reject(line, raw, id, "Needs exactly one of Debit or Credit")
        );
      accepted.push({
        id,
        raw,
        date: raw["Txn Date"],
        amount: rupees(paise(credit || debit)),
        currency: raw.Currency,
        ref: raw.Reference || undefined,
        party: raw.Narration,
        side: credit ? "C" : "D",
      });
      return;
    }
    if (f.kind === "settlement") {
      const id = raw["Settlement ID"];
      if (!id)
        return rejected.push(reject(line, raw, id, "No settlement ID", "R2"));
      if (!DATE.test(raw["Expected Credit"]))
        return rejected.push(
          reject(
            line,
            raw,
            id,
            `Date “${raw["Expected Credit"]}” isn't in the declared format YYYY-MM-DD`
          )
        );
      const adjustments: Adjustment[] = [
        { kind: "fee", label: "Fees", amount: -Number(raw.Fees) },
        {
          kind: "tax",
          label: "Tax on fees",
          amount: -Number(raw["Tax on Fees"]),
        },
        { kind: "withholding", label: "TDS", amount: -Number(raw.TDS) },
        { kind: "refund", label: "Refunds", amount: Number(raw.Refunds) },
      ].filter((a) => a.amount !== 0) as Adjustment[];
      accepted.push({
        id,
        raw,
        date: raw["Expected Credit"],
        expected: raw["Expected Credit"],
        amount: rupees(paise(raw.Net)),
        currency: raw.Currency,
        ref: raw["Bank Reference"] || undefined,
        party: raw.Provider,
        batch: raw["Batch ID"] || undefined,
        gross: rupees(paise(raw.Gross)),
        adjustments,
      });
      return;
    }
    // books
    const id = raw.GUID;
    if (!id)
      return rejected.push(
        reject(
          line,
          raw,
          raw["Voucher No"],
          "No entry ID (GUID); the row can't be identified",
          "R2"
        )
      );
    if (!DATE.test(raw.Date))
      return rejected.push(
        reject(
          line,
          raw,
          id,
          `Date “${raw.Date}” isn't in the declared format YYYY-MM-DD; it could be ${dayLabel("2026-10-09")} or ${dayLabel("2026-09-10")}`
        )
      );
    accepted.push({
      id,
      raw,
      date: raw.Date,
      amount: rupees(paise(raw.Amount)),
      currency: raw.Currency,
      ref: raw.Ref || undefined,
      party: raw.Narration,
      account: raw.Ledger,
    });
  });
  const dates = accepted.map((r) => r.date).sort();
  return {
    id: uid("src"),
    kind: f.kind as SourceKind,
    file: f.name,
    version,
    provider: f.provider,
    uploadedBy: f.via === "Upload" ? actor : "AiA 1.0 Tally integration",
    via: f.via,
    retrievedAt: now(),
    hash: f.hash,
    coverage: { from: dates[0] || "", to: dates[dates.length - 1] || "" },
    accepted,
    rejected,
    replaces,
  };
};

/** The source versions in use: each file's latest, not the ones replaced. */
export const liveSources = (run: ReconRun) =>
  run.sources.filter((s) => !run.sources.some((x) => x.replaces === s.id));

/** What stops a run from being ready (FR-02, FR-03). */
export const readiness = (run: ReconRun) => {
  const live = liveSources(run);
  const missing = KINDS.filter((k) => !live.some((s) => s.kind === k));
  const blockers: RuleHit[] = [];
  live.forEach((s) =>
    s.accepted
      .filter((r) => r.currency !== run.currency)
      .slice(0, 1)
      .forEach((r) =>
        blockers.push({
          rule: "FR-03",
          severity: "hard",
          text: `${s.file} has ${r.currency} rows; this run is ${run.currency} only. Correct the file and replace it.`,
        })
      )
  );
  live.forEach((s) => {
    const seen = new Map<string, string>();
    s.accepted.forEach((r) => {
      const prior = seen.get(r.id);
      const body = JSON.stringify(r.raw);
      if (prior && prior !== body)
        blockers.push({
          rule: "FR-03",
          severity: "hard",
          text: `${s.file} has two different rows with ID ${r.id}.`,
        });
      seen.set(r.id, body);
    });
  });
  const rejected = live.reduce((n, s) => n + s.rejected.length, 0);
  return { missing, blockers, rejected };
};

const stateAfterValidation = (run: ReconRun): ReconRun["execution"] => {
  const r = readiness(run);
  if (r.missing.length || r.blockers.length) return "waiting-for-inputs";
  if (r.rejected && !run.partialAck) return "needs-input";
  return "ready";
};

/** FR-02: take in a set of files. Duplicates and unsupported files are named. */
const ingest = (run: ReconRun, names: string[]) => {
  const files: FileOutcome[] = [...run.files];
  const sources = [...run.sources];
  names.forEach((name) => {
    const f = sampleFile(name);
    if (!f) {
      files.push({
        file: name,
        outcome: "rejected",
        reason:
          "This prototype reads only its sample files. Supported input is CSV in the agreed schema.",
        rule: "A4",
      });
      return;
    }
    if (f.kind === "unsupported") {
      files.push({
        file: name,
        outcome: "rejected",
        reason:
          "PDF isn't a supported input in this release. Download the statement as CSV from net banking.",
        rule: "A4",
      });
      return;
    }
    const same = sources.find((s) => s.hash === f.hash);
    if (same) {
      files.push({
        file: name,
        outcome: "duplicate",
        reason: `Same content as ${same.file}, already attached. Its rows aren't counted twice.`,
        rule: "FR-02",
      });
      return;
    }
    sources.push(parse(f, 1));
  });
  return { ...run, files, sources };
};

/** Start a run: the period, the configuration, and the files (US-01/02). */
export const startRun = (
  company: string,
  periodId: ReconPeriodId,
  names?: string[]
) => {
  const cfg = configOf(company)!;
  const p = RECON_PERIODS[periodId];
  let run: ReconRun = {
    id: uid("run"),
    company,
    configId: cfg.id,
    configVersion: cfg.version,
    periodId,
    period: { from: p.from, to: p.to, label: p.label },
    timezone: cfg.timezone,
    currency: cfg.currency,
    execution: "validating",
    sources: [],
    files: [],
    questions: [],
    links: [],
    deferrals: {},
    versions: [],
    history: [
      log(
        "Started a run",
        `${p.label} · configuration v${cfg.version} · ${RULE_VERSION}`
      ),
    ],
  };
  run = ingest(
    run,
    names?.length ? names : RECON_SAMPLE[periodId].map((f) => f.name)
  );
  run = { ...run, execution: stateAfterValidation(run) };
  set({ ...state, runs: [...state.runs, run] });
  const r = readiness(run);
  track("source_validation_completed", {
    sources: liveSources(run).length,
    rejectedRows: r.rejected,
    rejectedFiles: run.files.filter((f) => f.outcome === "rejected").length,
    duplicateFiles: run.files.filter((f) => f.outcome === "duplicate").length,
    missingSources: r.missing.length,
  });
  return run;
};

/** US-03: replace a source; a new version, and earlier results go stale. */
export const replaceSource = (
  runId: string,
  oldFile: string,
  newFile: string
) => {
  const f = sampleFile(newFile);
  patchRun(runId, (r) => {
    const old = liveSources(r).find((s) => s.file === oldFile);
    if (!f || !old) return r;
    const next = parse(f, old.version + 1, old.id);
    const run: ReconRun = {
      ...r,
      sources: [...r.sources, next],
      partialAck: undefined,
      history: [
        ...r.history,
        log(
          "Replaced a source",
          `${old.file} v${old.version} → ${next.file} v${next.version}`
        ),
      ],
    };
    return { ...run, execution: stateAfterValidation(run) };
  });
  return getRun(runId)!;
};

/** US-03: run without the rejected rows, said out loud. */
export const acknowledgePartial = (runId: string) => {
  patchRun(runId, (r) => {
    const excluded = readiness(r).rejected;
    const run: ReconRun = {
      ...r,
      partialAck: { actor, at: now(), excluded },
      history: [
        ...r.history,
        log("Ran as partial", `${excluded} rejected rows excluded`),
      ],
    };
    return { ...run, execution: stateAfterValidation(run) };
  });
  return getRun(runId)!;
};

export const sampleCorrection = () => BOOKS_CORRECTED.name;

/* --------------------------------------------- FR-04 · matching, R4–R8 */

type Rows = Record<SourceKind, Map<string, SourceRow>>;

const rowsOf = (run: ReconRun): Rows => {
  const out: Rows = {
    bank: new Map(),
    settlement: new Map(),
    books: new Map(),
  };
  liveSources(run).forEach((s) =>
    s.accepted.forEach((r) => out[s.kind].set(r.id, r))
  );
  return out;
};

export const rowOf = (run: ReconRun, ref: RowRef) =>
  rowsOf(run)[ref.kind].get(ref.id);
/** Every accepted row of the live sources, by source. */
export const allRows = (run: ReconRun) => rowsOf(run);

const labelOf = (s: SourceRow) =>
  s.batch
    ? `${s.party.split(" (")[0]} · ${s.batch.split(" · ")[1] || s.batch}`
    : `${s.party.split(" · ")[0]} · ${dayLabel(String(s.raw["Sale Date"] || s.date))}`;

/** The question an absent bank reference raises, per provider (US-05). */
const NO_REF_Q = (provider: string): ReconQuestion => ({
  id: `no-ref:${provider}`,
  text: `${provider}'s bank credits carry no payout reference. How should this run treat them?`,
  detail:
    "Without a shared reference there's no automatic three-way match (R4, R7). Your answer applies to this run only; saving it to the configuration is a separate step.",
  exceptionIds: [],
  options: [
    {
      id: "link",
      label: "Link exact amounts on the expected date",
      hint: `Link each ${provider} payout to the one credit from the payer with its exact net, on its expected date or up to 2 days after`,
    },
    {
      id: "leave",
      label: "Leave them as exceptions",
      hint: "Resolve each one yourself",
    },
  ],
});

type Evaluation = Pick<
  RunVersion,
  "groups" | "exceptions" | "unmatched" | "counts"
> & { questions: ReconQuestion[] };

/**
 * One deterministic evaluation (US-04 AC4): the same sources, rules,
 * answers and resolutions always give the same groups and exceptions.
 */
export const evaluate = (run: ReconRun): Evaluation => {
  const rows = rowsOf(run);
  const used = new Set<string>();
  const key = (r: RowRef) => `${r.kind}:${r.id}`;
  const take = (refs: RowRef[]) => refs.forEach((r) => used.add(key(r)));
  const free = (r: RowRef) => !used.has(key(r));
  const groups: MatchGroup[] = [];
  const exceptions: ReconException[] = [];
  const questions = new Map<string, ReconQuestion>(
    run.questions.map((q) => [q.id, { ...q, exceptionIds: [] }])
  );

  // Human links first: a row in one cannot be used again (R8, US-06 AC2).
  run.links.forEach((g) => {
    if (g.rows.every(free)) {
      take(g.rows);
      groups.push(g);
    }
  });

  const settlements = [...rows.settlement.values()].sort((a, b) =>
    a.id.localeCompare(b.id)
  );
  const bankCredits = [...rows.bank.values()].filter((b) => b.side === "C");

  settlements.forEach((s) => {
    const sRef: RowRef = { kind: "settlement", id: s.id };
    if (!free(sRef)) return;
    const label = labelOf(s);
    const net = paise(s.amount);
    const books = [...rows.books.values()].filter(
      (k) => k.ref === s.id && free({ kind: "books", id: k.id })
    );
    const bRef = (b: SourceRow): RowRef => ({ kind: "bank", id: b.id });
    const kRef = (k: SourceRow): RowRef => ({ kind: "books", id: k.id });
    const hits: RuleHit[] = [];

    // R6: gross to net from explicit adjustments only.
    const adj = (s.adjustments || []).reduce((n, a) => n + paise(a.amount), 0);
    const balances = s.gross === undefined || paise(s.gross) + adj === net;

    // R7: due after the period ends.
    if (s.expected && s.expected > run.period.to) {
      const id = `cross-period:${s.id}`;
      exceptions.push({
        id,
        kind: "cross-period",
        rows: [sRef, ...books.map(kRef)],
        candidates: [],
        ref: s.id,
        label,
        text: `Due in the bank on ${dayLabel(s.expected)}, after ${run.period.label} ends. It reconciles in the period it lands in.`,
        hits: [
          { rule: "R7", severity: "soft", text: "Cross-period settlement" },
        ],
      });
      take([sRef, ...books.map(kRef)]);
      return;
    }

    const byRef = s.ref
      ? bankCredits.filter((b) => b.ref === s.ref && free(bRef(b)))
      : [];
    let bank = byRef.length === 1 ? byRef[0] : undefined;
    let basis: MatchGroup["basis"] = s.batch ? "batch" : "exact";
    let origin: MatchGroup["origin"] = "automatic";

    if (byRef.length > 1) {
      const id = `candidates:${s.id}`;
      exceptions.push({
        id,
        kind: "candidates",
        rows: [sRef],
        candidates: byRef.map((b) => ({
          rows: [bRef(b)],
          why: `Same reference ${s.ref}, ₹${inr(b.amount)} on ${dayLabel(b.date)}`,
        })),
        ref: s.id,
        label,
        text: `${byRef.length} bank credits carry this reference. Neo won't choose between them.`,
        hits: [{ rule: "R7", severity: "soft", text: "Several candidates" }],
      });
      take([sRef]);
      return;
    }

    if (!bank && !s.ref) {
      // R7: no reference. Only an explicit answer may link it.
      const provider = s.party.split(" (")[0];
      const q = questions.get(`no-ref:${provider}`) || NO_REF_Q(provider);
      questions.set(q.id, q);
      const window = (b: SourceRow) =>
        b.date >= (s.expected || s.date) &&
        b.date <= addDays(s.expected || s.date, 2);
      const payerWord = s.raw.Provider.match(/\((\w+)/)?.[1]?.toUpperCase();
      const fromPayer = bankCredits.filter(
        (b) =>
          free(bRef(b)) &&
          !!payerWord &&
          b.party.toUpperCase().includes(payerWord) &&
          window(b)
      );
      const exact = fromPayer.filter((b) => paise(b.amount) === net);
      if (q.answer === "link" && exact.length === 1) {
        bank = exact[0];
        basis = "answer";
        origin = "human";
        hits.push({
          rule: "US-05",
          severity: "default",
          text: `Linked by your answer: ${q.options[0].hint}`,
        });
      } else {
        const id = `no-reference:${s.id}`;
        exceptions.push({
          id,
          kind:
            q.answer === "link" && exact.length > 1
              ? "candidates"
              : "no-reference",
          rows: [sRef, ...books.map(kRef)],
          candidates: fromPayer.map((b) => ({
            rows: [bRef(b)],
            why:
              paise(b.amount) === net
                ? `${b.party.split(" PVT")[0]}, exact net, ${dayLabel(b.date)}`
                : `${b.party.split(" PVT")[0]}, ₹${inr(rupees(Math.abs(paise(b.amount) - net)))} ${paise(b.amount) < net ? "short" : "over"}, ${dayLabel(b.date)}`,
          })),
          ref: s.id,
          label,
          text:
            q.answer === "link" && !exact.length
              ? `No credit from the payer has the exact net ₹${inr(s.amount)}. ${fromPayer.length ? "The nearest is listed; tolerance is zero (R6)." : "None arrived in the window."}`
              : "The bank credit carries no payout reference, so no automatic link is made.",
          hits: [
            {
              rule: "R7",
              severity: "soft",
              text: "Absent reference",
            },
          ],
          questionId: q.id,
        });
        q.exceptionIds.push(id);
        take([sRef, ...books.map(kRef)]);
        return;
      }
    }

    if (!bank) {
      const id = `two-source:${s.id}`;
      exceptions.push({
        id,
        kind: "two-source",
        rows: [sRef, ...books.map(kRef)],
        candidates: [],
        ref: s.id,
        label,
        text: books.length
          ? "In the settlement report and the books, but no bank credit carries its reference."
          : "Only in the settlement report.",
        hits: [
          { rule: "R4", severity: "soft", text: "Not in all three sources" },
        ],
      });
      take([sRef, ...books.map(kRef)]);
      return;
    }

    const bankP = paise(bank.amount);
    if (books.length !== 1) {
      const id = `two-source:${s.id}`;
      exceptions.push({
        id,
        kind: books.length ? "candidates" : "two-source",
        rows: [sRef, bRef(bank)],
        candidates: books.map((k) => ({
          rows: [kRef(k)],
          why: `${k.raw["Voucher No"]}, ₹${inr(k.amount)} on ${dayLabel(k.date)}`,
        })),
        ref: s.id,
        label,
        text: books.length
          ? `${books.length} books entries carry this reference.`
          : "In the bank and the settlement report, not in the books. Two sources aren't a three-way match.",
        difference: bankP !== net ? rupees(bankP - net) : undefined,
        hits: [
          {
            rule: books.length ? "R7" : "R4",
            severity: "soft",
            text: books.length ? "Several candidates" : "Missing in books",
          },
        ],
      });
      take([sRef, bRef(bank)]);
      return;
    }

    const k = books[0];
    const kP = paise(k.amount);
    const rowRefs = [sRef, bRef(bank), kRef(k)];
    if (bankP !== net || kP !== net || !balances) {
      const id = `amount:${s.id}`;
      const diff = bankP !== net ? bankP - net : kP - net;
      exceptions.push({
        id,
        kind: "amount",
        rows: rowRefs,
        candidates: [],
        ref: s.id,
        label,
        text: !balances
          ? "The report's gross less its adjustments doesn't equal its net. No balancing adjustment is invented."
          : bankP !== net
            ? `The bank received ₹${inr(bank.amount)} against a net of ₹${inr(s.amount)}. Tolerance is zero.`
            : `The books hold ₹${inr(k.amount)} against a net of ₹${inr(s.amount)}${s.gross !== undefined && kP === paise(s.gross) ? ", which is the gross" : ""}. Tolerance is zero.`,
        difference: rupees(diff),
        hits: [{ rule: "R6", severity: "soft", text: "Amounts differ" }],
      });
      take(rowRefs);
      return;
    }

    take(rowRefs);
    groups.push({
      id: `${basis}:${s.id}`,
      basis,
      origin,
      rows: rowRefs,
      ref: s.ref || s.id,
      label,
      compared: [
        { kind: "settlement", amount: s.amount },
        { kind: "bank", amount: bank.amount },
        { kind: "books", amount: k.amount },
      ],
      gross: s.gross,
      adjustments: s.adjustments,
      difference: 0,
      hits: [
        ...(basis === "answer"
          ? hits
          : [
              {
                rule: basis === "batch" ? "R5" : "R4",
                severity: "default" as const,
                text:
                  basis === "batch"
                    ? `Declared batch ${s.batch}; net equals the bank credit and the books entry`
                    : `Shared reference ${s.ref}; equal amounts in all three sources`,
              },
            ]),
        ...(s.adjustments?.length
          ? [
              {
                rule: "R6",
                severity: "default" as const,
                text: "Gross to net from the report's own adjustment lines",
              },
            ]
          : []),
      ],
    });
  });

  // Deferrals ride on the exception's stable ID (US-06).
  exceptions.forEach((e) => {
    const d = run.deferrals[e.id];
    if (d) e.deferred = d;
  });

  // R8: every accepted row is matched, an exception, or unmatched.
  const unmatched: RowRef[] = [];
  KINDS.forEach((k) =>
    rows[k].forEach((_, id) => {
      if (free({ kind: k, id })) unmatched.push({ kind: k, id });
    })
  );
  const counts = {} as Record<SourceKind, SourceCounts>;
  const live = liveSources(run);
  KINDS.forEach((k) => {
    const inGroups = new Set(
      groups.flatMap((g) => g.rows.filter((r) => r.kind === k).map((r) => r.id))
    );
    const inExc = new Set(
      exceptions.flatMap((e) =>
        e.rows.filter((r) => r.kind === k).map((r) => r.id)
      )
    );
    counts[k] = {
      accepted: rows[k].size,
      matched: inGroups.size,
      exceptions: inExc.size,
      unmatched: unmatched.filter((u) => u.kind === k).length,
      rejected: live
        .filter((s) => s.kind === k)
        .reduce((n, s) => n + s.rejected.length, 0),
    };
  });
  return {
    groups,
    exceptions,
    unmatched,
    counts,
    questions: [...questions.values()].filter(
      (q) => q.exceptionIds.length || q.answer
    ),
  };
};

const completenessOf = (run: ReconRun): Completeness =>
  readiness(run).rejected > 0 ? "partial" : "full";

/**
 * Record an evaluation. Before the run completes the working result is
 * replaced; after, every change is a new version and the old one is kept
 * (FR-12), unreviewed again.
 */
const record = (run: ReconRun, reason: string): ReconRun => {
  const e = evaluate(run);
  const cv = currentVersion(run);
  const version: RunVersion = {
    n: run.execution === "completed" && cv ? cv.n + 1 : cv?.n || 1,
    createdAt: now(),
    sourceVersions: liveSources(run).map((s) => `${s.file} v${s.version}`),
    configVersion: run.configVersion,
    ruleVersion: RULE_VERSION,
    groups: e.groups,
    exceptions: e.exceptions,
    unmatched: e.unmatched,
    counts: e.counts,
    completeness: completenessOf(run),
    review: "not-submitted",
    reason,
  };
  const versions =
    run.execution === "completed"
      ? [...run.versions, version]
      : [...run.versions.slice(0, -1), version];
  const open = e.questions.some((q) => !q.answer);
  return {
    ...run,
    questions: e.questions,
    versions,
    execution: open ? "needs-input" : "completed",
  };
};

/** US-04: run the matching. */
export const executeRun = (runId: string) => {
  patchRun(runId, (r) => {
    const run = record({ ...r, execution: "running" }, "First result");
    return {
      ...run,
      history: [...run.history, log("Ran reconciliation", RULE_VERSION)],
    };
  });
  const run = getRun(runId)!;
  const v = currentVersion(run)!;
  track("recon_run_started", {
    period: run.periodId,
    configVersion: run.configVersion,
  });
  v.exceptions.forEach((e) =>
    track("exception_presented", { kind: e.kind, run: run.id, version: v.n })
  );
  if (run.execution === "completed") completedEvent(run);
  return run;
};

const completedEvent = (run: ReconRun) => {
  const v = currentVersion(run)!;
  track("recon_run_completed", {
    version: v.n,
    completeness: v.completeness,
    groups: v.groups.length,
    exceptions: v.exceptions.length,
  });
};

/** US-05: answer a question; affected rows are re-evaluated, once. */
export const answerQuestion = (runId: string, qid: string, answer: string) => {
  const before = getRun(runId)!;
  patchRun(runId, (r) =>
    record(
      {
        ...r,
        questions: r.questions.map((q) =>
          q.id === qid
            ? { ...q, answer, answeredBy: actor, answeredAt: now() }
            : q
        ),
        history: [...r.history, log("Answered a question", qid)],
      },
      "Answer applied"
    )
  );
  const run = getRun(runId)!;
  if (before.execution !== "completed" && run.execution === "completed")
    completedEvent(run);
  return run;
};

/** The match group a person's link makes (US-06): rows, amounts, who and why. */
const manualGroup = (
  run: ReconRun,
  e: ReconException,
  candidate: number,
  reason: string
): MatchGroup => {
  const c = e.candidates[candidate];
  const rows = [...e.rows, ...(c?.rows || [])];
  const all = rowsOf(run);
  const amountOf = (k: SourceKind) =>
    rows
      .filter((r) => r.kind === k)
      .reduce((n, r) => n + paise(all[k].get(r.id)?.amount || 0), 0);
  const sP = amountOf("settlement");
  return {
    id: `manual:${e.ref}`,
    basis: "manual",
    origin: "human",
    rows,
    ref: e.ref,
    label: e.label,
    compared: KINDS.filter((k) => rows.some((r) => r.kind === k)).map((k) => ({
      kind: k,
      amount: rupees(amountOf(k)),
    })),
    difference: rupees(
      Math.max(
        ...KINDS.filter(
          (k) => k !== "settlement" && rows.some((r) => r.kind === k)
        ).map((k) => Math.abs(amountOf(k) - sP)),
        0
      )
    ),
    hits: [
      { rule: "US-06", severity: "default", text: "Resolved by a person" },
    ],
    by: { actor, at: now(), reason: reason.trim() },
  };
};

/** Whether an exception can be linked at all (US-06): an amount gap, or candidates. */
export const linkable = (e: ReconException) =>
  e.kind === "amount" || e.candidates.length > 0;

/** US-06: link an exception to one of its candidates, with a reason. */
export const linkException = (
  runId: string,
  exceptionId: string,
  candidate: number,
  reason: string
) => {
  const run = getRun(runId)!;
  const e = currentVersion(run)?.exceptions.find((x) => x.id === exceptionId);
  if (!e || !reason.trim()) return { ok: false, why: "A reason is required." };
  const group = manualGroup(run, e, candidate, reason);
  const v = currentVersion(run)!;
  const taken = v.groups.some((g) =>
    g.rows.some((r) =>
      group.rows.some((x) => x.kind === r.kind && x.id === r.id)
    )
  );
  if (taken)
    return { ok: false, why: "A row here is already in another match group." };
  patchRun(runId, (r) =>
    record(
      {
        ...r,
        links: [...r.links, group],
        history: [
          ...r.history,
          log(
            "Linked rows by hand",
            `${e.label}: ${group.rows.map((x) => `${x.kind} ${x.id}`).join(", ")}. Before: exception (${e.kind}). After: match group. Reason: ${reason.trim()}`
          ),
        ],
      },
      `Linked ${e.label} by hand`
    )
  );
  track("exception_resolved", { kind: e.kind, how: "manual-link" });
  return { ok: true as const };
};

/** US-06: defer an exception with a reason; it stays unresolved. */
export const deferException = (
  runId: string,
  exceptionId: string,
  reason: string
) => {
  if (!reason.trim()) return { ok: false, why: "A reason is required." };
  const e = currentVersion(getRun(runId)!)?.exceptions.find(
    (x) => x.id === exceptionId
  );
  patchRun(runId, (r) =>
    record(
      {
        ...r,
        deferrals: {
          ...r.deferrals,
          [exceptionId]: { actor, at: now(), reason: reason.trim() },
        },
        history: [
          ...r.history,
          log("Deferred an exception", `${e?.label}: ${reason.trim()}`),
        ],
      },
      `Deferred ${e?.label}`
    )
  );
  track("exception_resolved", { kind: e?.kind || "", how: "deferred" });
  return { ok: true as const };
};

/** The run stopped by a person: never shown as complete (US-10). */
export const cancelRun = (runId: string) =>
  patchRun(runId, (r) =>
    r.execution === "completed"
      ? r
      : {
          ...r,
          execution: "cancelled",
          history: [...r.history, log("Cancelled the run")],
        }
  );

/* ------------------------------------------------------ FR-07 · review */

export const unresolved = (v: RunVersion) => v.exceptions.length;

export const submitForReview = (runId: string) =>
  patchRun(runId, (r) => {
    const v = currentVersion(r)!;
    return {
      ...r,
      versions: [
        ...r.versions.slice(0, -1),
        { ...v, review: "pending-review" },
      ],
      history: [...r.history, log("Submitted for review", `Version ${v.n}`)],
    };
  });

export const recordReview = (
  runId: string,
  outcome: "reviewed" | "changes-requested",
  note: string
) => {
  patchRun(runId, (r) => {
    const v = currentVersion(r)!;
    const review: ReviewState =
      outcome === "changes-requested"
        ? "changes-requested"
        : unresolved(v)
          ? "reviewed-with-exceptions"
          : "reviewed";
    return {
      ...r,
      versions: [
        ...r.versions.slice(0, -1),
        {
          ...v,
          review,
          reviewNote: note,
          reviewedBy: actor,
          reviewedAt: now(),
        },
      ],
      history: [
        ...r.history,
        log(
          `Review recorded: ${REVIEW_LABEL[review]}`,
          `Version ${v.n}${note ? ` · ${note}` : ""}`
        ),
      ],
    };
  });
  const v = currentVersion(getRun(runId)!)!;
  track("review_recorded", {
    review: v.review,
    version: v.n,
    exceptions: v.exceptions.length,
  });
  return v;
};

export const REVIEW_LABEL: Record<ReviewState, string> = {
  "not-submitted": "Not submitted",
  "pending-review": "Pending review",
  reviewed: "Reviewed",
  "reviewed-with-exceptions": "Reviewed with exceptions",
  "changes-requested": "Changes requested",
};

export const EXECUTION_LABEL: Record<ReconRun["execution"], string> = {
  draft: "Draft",
  validating: "Validating",
  "waiting-for-inputs": "Waiting for inputs",
  ready: "Ready",
  running: "Running",
  "needs-input": "Needs input",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const exportRecorded = (runId: string, files: string) => {
  const run = getRun(runId)!;
  const v = currentVersion(run)!;
  patchRun(runId, (r) => ({
    ...r,
    history: [...r.history, log("Exported", `Version ${v.n} · ${files}`)],
  }));
  track("export_completed", {
    version: v.n,
    completeness: v.completeness,
    review: v.review,
  });
};

/** Totals per source for the summary (US-04 AC3). */
export const totals = (run: ReconRun, v: RunVersion) => {
  const rows = rowsOf(run);
  const sumOf = (refs: RowRef[], k: SourceKind) =>
    rupees(
      refs
        .filter((r) => r.kind === k)
        .reduce((n, r) => n + paise(rows[k].get(r.id)?.amount || 0), 0)
    );
  return KINDS.map((k) => ({
    kind: k,
    matched: sumOf(
      v.groups.flatMap((g) => g.rows),
      k
    ),
    exceptions: sumOf(
      v.exceptions.flatMap((e) => e.rows),
      k
    ),
    unmatched: sumOf(v.unmatched, k),
  }));
};

/* ------------------------------------- changes from the report or chat */

/**
 * Short codes a person can type or read in the report: E1… for a
 * version's exceptions, G1… for its match groups. They are per version;
 * the stable IDs travel in the report's hidden columns.
 */
export const exceptionCode = (v: RunVersion, id: string) =>
  `E${v.exceptions.findIndex((e) => e.id === id) + 1}`;
export const groupCode = (v: RunVersion, id: string) =>
  `G${v.groups.findIndex((g) => g.id === id) + 1}`;

/** One line per change, as the version, the audit log and the chat say it. */
export const describeEdit = (run: ReconRun, edit: ReconEdit) => {
  const v = currentVersion(run)!;
  const exc = (id: string) => v.exceptions.find((e) => e.id === id);
  switch (edit.type) {
    case "link": {
      const e = exc(edit.exceptionId);
      const c = e?.candidates[edit.candidate];
      return `Link ${e?.label}${c ? ` to candidate ${edit.candidate + 1}` : " as matched"}: ${edit.reason}`;
    }
    case "defer":
      return `Defer ${exc(edit.exceptionId)?.label}: ${edit.reason}`;
    case "reopen":
      return `Reopen ${exc(edit.exceptionId)?.label}${edit.reason ? `: ${edit.reason}` : ""}`;
    case "unlink":
      return `Unlink ${v.groups.find((g) => g.id === edit.groupId)?.label}: ${edit.reason}`;
    case "answer": {
      const q = run.questions.find((x) => x.id === edit.questionId);
      return `Answer “${q?.text}”: ${q?.options.find((o) => o.id === edit.answer)?.label || edit.answer}`;
    }
  }
};

/**
 * Everything wrong with a set of changes, checked against the current
 * version before any of it is applied. One problem stops the whole set:
 * an accountant's batch of decisions is applied together or not at all.
 */
export const checkEdits = (run: ReconRun, edits: ReconEdit[]) => {
  const v = currentVersion(run)!;
  const problems: { edit: ReconEdit; why: string }[] = [];
  const claimed = new Set<string>();
  const key = (r: RowRef) => `${r.kind}:${r.id}`;
  const inGroups = new Set(v.groups.flatMap((g) => g.rows.map(key)));
  edits.forEach((edit) => {
    const bad = (why: string) => problems.push({ edit, why });
    if (edit.type === "answer") {
      const q = run.questions.find((x) => x.id === edit.questionId);
      if (!q) bad("That question isn't on this run.");
      else if (!q.options.some((o) => o.id === edit.answer))
        bad(`“${edit.answer}” isn't one of the answers.`);
      return;
    }
    if (!edit.reason.trim() && edit.type !== "reopen")
      return bad("A reason is required (US-06).");
    if (edit.type === "unlink") {
      const g = v.groups.find((x) => x.id === edit.groupId);
      if (!g) return bad(`That match group isn't in version ${v.n}.`);
      if (g.basis !== "manual")
        return bad(
          g.basis === "answer"
            ? "This group comes from an answer. Change the answer in Questions instead."
            : "Automatic matches follow R4 and R5 and can't be unlinked."
        );
      return;
    }
    const e = v.exceptions.find((x) => x.id === edit.exceptionId);
    if (!e)
      return bad(
        `Not an open exception in version ${v.n}; it may already be resolved.`
      );
    if (edit.type === "reopen" && !e.deferred) return bad("It isn't deferred.");
    if (edit.type === "defer" && e.deferred)
      return bad("It's already deferred.");
    if (edit.type !== "link") return;
    if (!linkable(e))
      return bad("This exception has nothing to link to. Defer it instead.");
    if (edit.candidate >= e.candidates.length)
      return bad(`There's no candidate ${edit.candidate + 1}.`);
    const rows = [...e.rows, ...(e.candidates[edit.candidate]?.rows || [])];
    if (rows.some((r) => inGroups.has(key(r)) || claimed.has(key(r))))
      return bad("A row here is already in another match group.");
    rows.forEach((r) => claimed.add(key(r)));
  });
  return problems;
};

/**
 * Apply a set of changes and run the reconciliation again, once: one new
 * version holds all of them (FR-12). The version before is kept as it
 * was, with its review. Call checkEdits first.
 *
 * DEV: POST /api/recon/runs/:id/resolutions with { edits, origin }; the
 * server re-evaluates and returns the new version.
 */
export const applyEdits = (
  runId: string,
  edits: ReconEdit[],
  origin: ReconEditOrigin
) => {
  const before = getRun(runId)!;
  const v = currentVersion(before)!;
  const where =
    origin.via === "report"
      ? `in the Excel report (${origin.file}, from version ${origin.fromVersion})`
      : "in the chat";
  patchRun(runId, (r) => {
    let next: ReconRun = { ...r };
    edits.forEach((edit) => {
      const e =
        "exceptionId" in edit
          ? v.exceptions.find((x) => x.id === edit.exceptionId)
          : undefined;
      if (edit.type === "link" && e)
        next = {
          ...next,
          links: [
            ...next.links,
            manualGroup(next, e, edit.candidate, edit.reason),
          ],
        };
      if (edit.type === "defer")
        next = {
          ...next,
          deferrals: {
            ...next.deferrals,
            [edit.exceptionId]: {
              actor,
              at: now(),
              reason: edit.reason.trim(),
            },
          },
        };
      if (edit.type === "reopen") {
        const { [edit.exceptionId]: _gone, ...rest } = next.deferrals;
        next = { ...next, deferrals: rest };
      }
      if (edit.type === "unlink")
        next = {
          ...next,
          links: next.links.filter((g) => g.id !== edit.groupId),
        };
      if (edit.type === "answer")
        next = {
          ...next,
          questions: next.questions.map((q) =>
            q.id === edit.questionId
              ? {
                  ...q,
                  answer: edit.answer,
                  answeredBy: actor,
                  answeredAt: now(),
                  savedToConfig: false,
                }
              : q
          ),
        };
    });
    const lines = edits.map((edit) => describeEdit(r, edit));
    return record(
      {
        ...next,
        history: [
          ...next.history,
          ...lines.map((l) => log(`Changed ${where}`, l)),
          log("Ran reconciliation again", RULE_VERSION),
        ],
      },
      `${edits.length} change${edits.length === 1 ? "" : "s"} ${where}: ${lines.join("; ")}`
    );
  });
  edits.forEach((edit) => {
    const e =
      "exceptionId" in edit
        ? v.exceptions.find((x) => x.id === edit.exceptionId)
        : undefined;
    if (edit.type === "link" || edit.type === "defer")
      track("exception_resolved", {
        kind: e?.kind || "",
        how: edit.type === "link" ? "manual-link" : "deferred",
        via: origin.via,
      });
  });
  track("recon_rerun", { edits: edits.length, via: origin.via });
  return getRun(runId)!;
};
