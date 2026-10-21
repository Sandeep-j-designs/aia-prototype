/**
 * Neo voucher entry — a batch: documents plus the accountant's instruction,
 * read into settings, the exceptions asked once by kind, and a voucher
 * register the accountant signs off before any draft is made.
 *
 * DEV: POST /api/neo/batches { files, instruction } → Batch; the questions
 * are answered with PATCH /api/neo/batches/:id { answers }, and
 * POST /api/neo/batches/:id/drafts creates the drafts from the ticked rows.
 */

/** Where a value on a voucher came from. Only "neo" carries the AI mark. */
export type BatchSource = "doc" | "instruction" | "master" | "rule" | "neo";

export type BatchSettings = {
  /** "Sep 2026". */
  period: string;
  /** Voucher date: the bill's own date, or the day of entry. */
  dateRule: "bill" | "entry";
  /** GST registration (branch) the bills are booked under. */
  gstReg: string;
  /** The ledger freight lines go to, as a master name. */
  freightLedger: string;
  /** The cost centre as the instruction named it ("Harihar"). */
  costCentre: string;
  tds: "194C" | "none";
  /** "Freight — Harihar, Sep 26 · {bill}". */
  narration: string;
};

export type BatchSettingKey = keyof BatchSettings;

export type BatchQuestion = {
  id: "goods" | "costCentre" | "newVendors" | "c6";
  text: string;
  /** The rule or fact the question rests on. */
  detail: string;
  docIds: string[];
  options: { id: string; label: string }[];
  /** Neo's suggestion, preselected. */
  answer: string;
};

export type BatchLine = {
  side: "Dr" | "Cr";
  ledger: string;
  amount: number;
  note?: string;
};

export type BatchRow = {
  docId: string;
  file: string;
  vendor: string;
  billNo: string;
  billDate: string;
  voucherType: string;
  /** What the voucher is booked to: a ledger, or "Stock · <item>". */
  ledger: string;
  ledgerSource: BatchSource;
  costCentre: string;
  costCentreSource: BatchSource;
  taxable: number;
  gst: number;
  /** Reverse-charge tax the company books itself, outside the bill total. */
  rcm: number;
  tax: { cgst: number; sgst: number; igst: number };
  tds: number;
  tdsNote: string;
  /** The vendor's services this year before this bill, batch included. */
  fyPrior: number;
  /** Set when the accountant confirmed a deduction not to make. */
  tdsExempt?: { section: string; reason: string };
  total: number;
  status: "ready" | "check" | "new-vendor" | "left-out";
  /** Why it is left out, or what to check. */
  note?: string;
  checked: boolean;
  lines: BatchLine[];
};

export type Batch = {
  id: string;
  company: string;
  instruction: string;
  createdAt: string;
  createdBy: string;
  docIds: string[];
  /** Uploaded files the prototype cannot read. */
  unreadable: string[];
  stage: "settings" | "questions" | "register" | "created" | "undone";
  settings: BatchSettings;
  /** Which settings came from the instruction; the rest Neo inferred. */
  settingSources: Record<BatchSettingKey, BatchSource>;
  questions: BatchQuestion[];
  rows: BatchRow[];
  draftIds: string[];
  policySaved?: boolean;
};
