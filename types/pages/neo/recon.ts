/**
 * Three-way reconciliation, as the AiA 2.0 PRD specifies it (v0.1, 15 Oct
 * 2026; aligned 21 Oct 2026). Bank transactions, PG/third-party settlement
 * records and the accounting books, for one company and one period.
 * Read-only (A2): a run produces match groups, exceptions and a reviewed,
 * exportable result. Nothing is posted and no entry is created or changed.
 *
 * Requirement IDs (FR-01…FR-12, R1–R8, US-01…US-08) are the PRD's.
 *
 * DEV: POST /api/recon/configs (FR-01) · POST /api/recon/runs/:id/sources
 * (FR-02) · POST /api/recon/runs/:id/validate (FR-03) · POST
 * /api/recon/runs/:id/execute (FR-04) · PATCH /api/recon/runs/:id/answers
 * (FR-05) · POST /api/recon/runs/:id/resolutions (FR-06) · POST
 * /api/recon/runs/:id/review (FR-07) · GET /api/recon/runs/:id/export
 * (FR-08). Matching is the server's; the engine in
 * hooks/pages/neo/use-recon.ts is its stand-in.
 */

export type RuleSeverity = "hard" | "soft" | "default";

/** A rule or requirement that applied, cited by its PRD ID (FR-04). */
export type RuleHit = { rule: string; severity: RuleSeverity; text: string };

/* ------------------------------------------------------------ config */

export type SourceKind = "bank" | "settlement" | "books";

/** One source the template requires (FR-01's checklist). */
export type SourceRequirement = {
  kind: SourceKind;
  label: string;
  /** What to upload, said plainly. */
  hint: string;
};

/**
 * A mapping the configuration carries from run to run. Only an explicit,
 * authorised confirmation puts one here (US-05: an answer in one run is
 * never a company rule on its own).
 */
export type ConfigMapping = {
  id: string;
  text: string;
  confirmedBy: string;
  confirmedAt: string;
  /** The run and question it came from. */
  from: { runId: string; questionId: string };
};

/** FR-01: a reconciliation template made specific to a company. */
export type ReconConfig = {
  id: string;
  company: string;
  version: number;
  template: string;
  timezone: string;
  currency: string;
  sources: SourceRequirement[];
  mappings: ConfigMapping[];
  confirmedBy: string;
  confirmedAt: string;
};

/* ----------------------------------------------------------- sources */

export type Adjustment = {
  kind: "fee" | "tax" | "withholding" | "refund" | "other";
  label: string;
  /** Negative takes away from gross, positive adds back. */
  amount: number;
};

/**
 * One parsed row, raw values kept beside parsed ones (R3). `id` is the
 * source's stable row identity (R2).
 */
export type SourceRow = {
  id: string;
  raw: Record<string, string>;
  date: string;
  amount: number;
  currency: string;
  /** Bank: the reference parsed from the narration; settlement: its ID. */
  ref?: string;
  /** Who paid or what was booked, as the source says it. */
  party: string;
  // Settlement rows (R2): batch identity, gross, explicit adjustments, net.
  batch?: string;
  gross?: number;
  adjustments?: Adjustment[];
  /** Settlement: when the money was due in the bank. */
  expected?: string;
  // Books rows: the account the entry was posted to.
  account?: string;
  side?: "D" | "C";
};

export type RejectedRow = {
  id: string;
  line: number;
  raw: Record<string, string>;
  reason: string;
  rule: string;
};

/** FR-02: one version of one supplied source. */
export type SourceVersion = {
  id: string;
  kind: SourceKind;
  file: string;
  version: number;
  provider: string;
  uploadedBy: string;
  /** "upload" or the AiA 1.0 connector it came through. */
  via: string;
  retrievedAt: string;
  hash: string;
  coverage: { from: string; to: string };
  accepted: SourceRow[];
  rejected: RejectedRow[];
  /** The version this one replaced (US-03). */
  replaces?: string;
};

/** A file that was not taken in, and why (FR-02). */
export type FileOutcome = {
  file: string;
  outcome: "rejected" | "duplicate";
  reason: string;
  rule: string;
};

/* ----------------------------------------------------------- results */

export type RowRef = { kind: SourceKind; id: string };

/** FR-04: a set of linked rows across the three sources. */
export type MatchGroup = {
  id: string;
  /** "exact" (R4), "batch" (R5), or linked by a person (US-06). */
  basis: "exact" | "batch" | "answer" | "manual";
  /** Automatic, or decided by a person: kept apart in every view (US-06). */
  origin: "automatic" | "human";
  rows: RowRef[];
  ref: string;
  label: string;
  compared: { kind: SourceKind; amount: number }[];
  /** Settlement gross to net, from explicit adjustments only (R6). */
  gross?: number;
  adjustments?: Adjustment[];
  difference: number;
  hits: RuleHit[];
  /** For a human link: who, when and why. */
  by?: { actor: string; at: string; reason: string };
};

export type ExceptionKind =
  "two-source" | "amount" | "no-reference" | "candidates" | "cross-period";

/** FR-04/R7: something that could not be matched automatically. */
export type ReconException = {
  id: string;
  kind: ExceptionKind;
  rows: RowRef[];
  /** Rows that could complete it, with why each is a candidate. */
  candidates: { rows: RowRef[]; why: string }[];
  ref: string;
  label: string;
  text: string;
  difference?: number;
  hits: RuleHit[];
  questionId?: string;
  /** US-06: deferred with a reason stays unresolved. */
  deferred?: { actor: string; at: string; reason: string };
};

/** US-05: a question attached to the exceptions it would settle. */
export type ReconQuestion = {
  id: string;
  text: string;
  detail: string;
  exceptionIds: string[];
  options: { id: string; label: string; hint?: string }[];
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  /** Saved to the configuration by an authorised user (US-05 AC4). */
  savedToConfig?: boolean;
};

export type SourceCounts = {
  accepted: number;
  matched: number;
  unmatched: number;
  exceptions: number;
  rejected: number;
};

/** FR-12: three state tracks, kept apart. */
export type ExecutionState =
  | "draft"
  | "validating"
  | "waiting-for-inputs"
  | "ready"
  | "running"
  | "needs-input"
  | "completed"
  | "failed"
  | "cancelled";

export type Completeness = "full" | "partial";

export type ReviewState =
  | "not-submitted"
  | "pending-review"
  | "reviewed"
  | "reviewed-with-exceptions"
  | "changes-requested";

/** An immutable result once completed; changes make a new one (FR-12). */
export type RunVersion = {
  n: number;
  createdAt: string;
  sourceVersions: string[];
  configVersion: number;
  ruleVersion: string;
  groups: MatchGroup[];
  exceptions: ReconException[];
  unmatched: RowRef[];
  counts: Record<SourceKind, SourceCounts>;
  completeness: Completeness;
  review: ReviewState;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  /** What changed from the version before it. */
  reason: string;
};

/** NFR-04: what happened, by whom, when; never edited. */
export type AuditEntry = {
  at: string;
  actor: string;
  action: string;
  detail?: string;
};

export type ReconPeriodId = "sep" | "oct";

export type ReconRun = {
  id: string;
  company: string;
  configId: string;
  configVersion: number;
  periodId: ReconPeriodId;
  period: { from: string; to: string; label: string };
  timezone: string;
  currency: string;
  execution: ExecutionState;
  sources: SourceVersion[];
  files: FileOutcome[];
  /** US-03: rows excluded on purpose, and who said so. */
  partialAck?: { actor: string; at: string; excluded: number };
  questions: ReconQuestion[];
  /** Human links, re-applied on every evaluation (US-06). */
  links: MatchGroup[];
  /** Deferred exceptions by exception ID, with the reason (US-06). */
  deferrals: Record<string, { actor: string; at: string; reason: string }>;
  versions: RunVersion[];
  history: AuditEntry[];
};

/**
 * A change a person asks for on a version, from the Excel report or the
 * chat (21 Oct 2026). Every change maps to a US-05/US-06 action; a set of
 * changes is applied together and the run is evaluated once, making one
 * new version. Source rows and amounts are never edited here (A2): a
 * wrong source is replaced as a new source version.
 */
export type ReconEdit =
  | {
      type: "link";
      exceptionId: string;
      /** Index into the exception's candidates; -1 links its own rows. */
      candidate: number;
      reason: string;
    }
  | { type: "defer"; exceptionId: string; reason: string }
  | { type: "reopen"; exceptionId: string; reason: string }
  | { type: "unlink"; groupId: string; reason: string }
  | { type: "answer"; questionId: string; answer: string };

/** Where a set of changes came from, for the version and the audit log. */
export type ReconEditOrigin =
  { via: "report"; file: string; fromVersion: number } | { via: "chat" };
