import type { Deduction, ReconChannel } from "@/config/pages/neo/mock-recon";

/**
 * Three-way reconciliation (20 Oct 2026, from "3-Way Recon Skill
 * Architecture" v3): POS sales, PG/platform settlements and the bank
 * statement, proved against each other and drafted as Sales, Receipt,
 * Payment and Contra vouchers.
 *
 * DEV: the run is POST /api/recon/runs { files, outlet, period }; questions
 * come back as `needs_input` items and are answered with PATCH
 * /api/recon/runs/:id { answers }. Policy is GET/POST /api/recon/policy
 * (versioned, effective-dated). The engine below is the server's.
 */

export type RuleSeverity = "hard" | "soft" | "default";

/** A rule that fired, cited by ID wherever the screen explains itself. */
export type RuleHit = { rule: string; severity: RuleSeverity; text: string };

/* --------------------------------------------------------------- policy */

export type PolicyRowState =
  /** ≥ 10 vouchers, ≥ 90% consistent: shown once, not asked. */
  | "prefilled"
  /** Weaker evidence, or a company fact: asked, with the inferred choice. */
  | "asked"
  /** No history: the template default, asked when first needed. */
  | "assumed"
  /** History breaks a hard rule: not copied, corrected from a cut-off. */
  | "not-copied";

export type PolicyRow = {
  id: string;
  family: string;
  value: string;
  state: PolicyRowState;
  evidence: string;
  /** What the accountant answered, when the row was asked. */
  answer?: string;
};

export type ReconPolicy = {
  company: string;
  version: number;
  effectiveFrom: string;
  status: "draft" | "approved";
  rows: PolicyRow[];
};

/* ------------------------------------------------------------------ run */

export type ReconDocStatus = "read" | "rejected" | "blocked" | "duplicate";

export type ReconDoc = {
  file: string;
  purpose: string;
  provider: string;
  outlet: string;
  period: string;
  /** What one row stands for: a bill, a day-channel total, a payout. */
  detail: string;
  rows: number;
  status: ReconDocStatus;
  hits: RuleHit[];
};

export type PayoutRow = {
  id: string;
  provider: "card" | "upi" | "zomato" | "swiggy" | "ownly";
  label: string;
  from: string;
  to: string;
  payDate: string;
  gross: number;
  deductions: Deduction[];
  net: number;
  /** The bank credit it was tied to, when one exists. */
  bank?: number;
  bankKey?: string;
  /** How it was tied (MAT-02's key order). */
  key?: string;
  status: "matched" | "round-off" | "suspense" | "open" | "unknown-payer";
  hits: RuleHit[];
};

export type SalesCellState = "settled" | "open" | "booked";

export type SalesCell = {
  date: string;
  channel: ReconChannel;
  amount: number;
  state: SalesCellState;
  payout?: string;
};

export type BankLine = {
  key: string;
  date: string;
  narration: string;
  amount: number;
  side: "D" | "C";
  voucher: "Receipt" | "Payment" | "Contra";
  /** The ledger on the other side of the bank. */
  ledger: string;
  source: "payout" | "history" | "answer" | "learned" | "suspense";
  note: string;
  hits: RuleHit[];
};

export type VoucherLine = {
  ledger: string;
  dr?: number;
  cr?: number;
  /** Agst Ref / New Ref, when the line settles or raises a bill. */
  ref?: string;
};

export type ReconVoucher = {
  id: string;
  type: "Sales" | "Receipt" | "Payment" | "Contra";
  date: string;
  /** One line saying what it is: "Card sales · 8 Sep". */
  title: string;
  lines: VoucherLine[];
  narration: string;
  status: "ready" | "suspense" | "needs-input";
  hits: RuleHit[];
  channel?: ReconChannel;
  bankKey?: string;
};

export type ReconQuestion = {
  id: "pos-inclusive" | "ctrlx" | "llp" | "swiggy-short" | "amazon";
  /** Asked because a shadow rule wants its next confirmation (LRN-02). */
  confirms?: string;
  text: string;
  detail: string;
  rule: string;
  options: { id: string; label: string; hint?: string }[];
  answer: string;
  /** Set when the books settle it: the sheet folds it under "Settled". */
  settled?: string;
};

export type ReconPeriodId = "sep" | "oct";

/** One suspense line (SUS-02): why, whose, since when, and what became of it. */
export type SuspenseLine = {
  id: string;
  voucherId: string;
  bankKey: string;
  what: string;
  amount: number;
  reason: string;
  owner: string;
  since: string;
  state: "open" | "resolved" | "carried";
  /** The ledger it went to, once resolved. */
  ledger?: string;
};

/** A receivable open at period end, and what the next statement shows. */
export type CloseEvidence = {
  what: string;
  amount: number;
  state: "collected" | "not-due" | "overdue";
  /** The credit that settled it, when the next statement has one. */
  credit?: { date: string; amount: number; narration: string };
  expected: string;
};

/**
 * A rule the company taught Neo (Phase 4, LRN-02/03/06): a payer, a bank
 * narration or a report format. "always" answers are active at once; a
 * correction "from now on" runs as a shadow until three confirmations; a
 * rule touching GST, TDS or TCS ledgers needs one explicit approval.
 */
export type LearnedRule = {
  id: string;
  company: string;
  kind: "payer" | "narration" | "format";
  /** What it matches, as the bank or report prints it. */
  match: string;
  /** What it does, said plainly. */
  does: string;
  ledger?: string;
  state: "proposed" | "shadow" | "active" | "review" | "retired";
  confirmations: number;
  /** Confirmations needed before it applies on its own. */
  needed: number;
  contradictions: number;
  tax: boolean;
  source: string;
  createdAt: string;
  usedIn: string[];
};

export type ReconRun = {
  id: string;
  company: string;
  outlet: string;
  period: string;
  periodId: ReconPeriodId;
  from: string;
  to: string;
  files: string[];
  stage: "questions" | "register" | "created" | "undone";
  docs: ReconDoc[];
  questions: ReconQuestion[];
  answers: Record<string, string>;
  payouts: PayoutRow[];
  sales: SalesCell[];
  bank: BankLine[];
  vouchers: ReconVoucher[];
  /** What was deliberately not drafted, and the rule that kept it out. */
  skipped: { what: string; amount?: number; hit: RuleHit }[];
  /** Receivables still open on the last day of the period. */
  open: { what: string; amount: number; due: string }[];
  createdItemIds: string[];
  createdBankKeys: string[];
  /** Learned rules this run used without asking. */
  learned: string[];
  suspense: SuspenseLine[];
  /** Set once the next statement has been read for the close. */
  closeFile?: string;
  evidence?: CloseEvidence[];
  closed?: { at: string; by: string; carried: number };
};
