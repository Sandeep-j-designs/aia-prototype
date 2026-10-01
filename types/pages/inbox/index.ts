/**
 * Unified Inbox — page contracts.
 *
 * Every field is camelCase because production's apiClient converts camelCase to
 * snake_case on the way out and back again on the way in. This is what the
 * dev's fetch resolves to, with no mapping layer in between.
 *
 * Ported from the prototype's js/data.js (window.SEED). Two deliberate changes
 * from that file:
 *
 *  1. `receivedAt` is an ISO 8601 string, not a Date.now() offset. The original
 *     computed timestamps at module scope, which would differ between the
 *     server and client render and produce a hydration mismatch. An API returns
 *     an ISO timestamp anyway — format it for display at the point of use.
 *  2. `_batchTag` is `batchTag`. The underscore prefix was a prototype-ism.
 */

export type InboxChannel = "email" | "whatsapp" | "upload" | "drive";

/** The four posting destinations a document can be routed to. */
export type InboxRoute = "AP" | "AR" | "Banking" | "JV";

export type InboxStatus =
  | "extracting"
  | "retrying"
  | "failed"
  | "needs-review"
  | "duplicate-soft"
  | "duplicate-hard"
  | "duplicate-cross-type"
  | "done"
  | "deleted";

export type InboxFailureType = "scanned-pdf" | "password-protected";

export type InboxFile = {
  name: string;
  size: string;
  ext: string;
};

export type InboxSource = {
  channel: InboxChannel;
  sender: string;
  subject: string;
};

/** Classifier output. Both fields are null until extraction completes. */
export type InboxAi = {
  /** 0–1. The list renders this as a percentage against a confidence threshold. */
  confidence: number | null;
  rationale: string | null;
};

export type InboxFailure = {
  type: InboxFailureType;
  title: string;
  body: string;
};

/** Present only when `route` is null — the disambiguation fork. */
export type InboxCandidate = {
  route: InboxRoute;
  evidence: string;
};

/* ------------------------------------------------------------------ AP */

export type BillItem = {
  desc: string;
  ledger: string;
  amount: number;
} & PrintedLine;

/**
 * What the document itself printed against a line, when it printed it. A tax
 * invoice states an HSN or SAC per line and, for goods, a quantity and rate;
 * a service bill often states only the amount. Absent means not printed.
 */
export type PrintedLine = {
  hsn?: string;
  qty?: number;
  /** "Nos", "Tin", "MT", "Kg", "L" — as the document wrote it. */
  unit?: string;
  rate?: number;
};

export type BillTaxes = {
  cgst?: number;
  sgst?: number;
  igst?: number;
};

export type InboxBill = {
  voucherNo: string;
  supplierInvoiceNo: string;
  billDate: string;
  dueDate: string;
  gstReg: string;
  costCentre: string | null;
  /** Field names the classifier is unsure about — the UI marks these for review. */
  flagged: string[];
  items: BillItem[];
  taxes: BillTaxes;
  subTotal: number;
  grandTotal: number;
  /** Vendor is not in masters yet; confirming will propose creating it. */
  vendorMissing?: boolean;
};

/* ------------------------------------------------------------------- AR */

/**
 * A sales invoice the user has ISSUED — the receivable mirror of `InboxBill`.
 *
 * Deliberately the same shape, because the two documents are the same document
 * read from opposite sides: a line is a description, a ledger and an amount
 * either way. What changes is whose number the invoice carries and which side
 * of the ledger it lands on — so the ledger on a line here is an INCOME ledger,
 * and `customer` is the party we billed rather than the party who billed us.
 *
 * Not to be confused with `InboxAr`, which models a sales REGISTER: one
 * spreadsheet standing for a thousand invoices. That is a different unit of
 * work and out of scope for v2 (PRD §4.5.4 describes this one).
 */
export type InvoiceLine = {
  desc: string;
  /** An income ledger — Sales, Service Income, and so on. */
  ledger: string;
  amount: number;
} & PrintedLine;

export type InboxInvoice = {
  voucherNo: string;
  /** OUR invoice number. The vendor's equivalent is `supplierInvoiceNo`. */
  invoiceNo: string;
  invoiceDate: string;
  dueDate: string;
  gstReg: string;
  costCentre: string | null;
  customer: string;
  /** Field names the classifier is unsure about — the UI marks these. */
  flagged: string[];
  items: InvoiceLine[];
  taxes: BillTaxes;
  subTotal: number;
  grandTotal: number;
  /** Customer is not in masters yet; confirming will propose creating it. */
  customerMissing?: boolean;
};

/* -------------------------------------------------------------- Banking */

export type BankingTxn = {
  date: string;
  narration: string;
  dr: number | null;
  cr: number | null;
};

export type InboxBanking = {
  txnCount: number;
  dateRange: string;
  opening: number;
  closing: number;
  /** A preview slice, not the full set — `txnCount` is the real total. */
  sample: BankingTxn[];
};

/* ------------------------------------------------------------------ AR */

export type ArRowIssue =
  "missing-gstin" | "invalid-state" | "missing-data" | "multiple-issues";

export type ArDedupKind =
  "skipped-posted" | "skipped-converted" | "skipped-pending" | "converted";

export type ArDedup = {
  kind: ArDedupKind;
  ref: string;
};

export type ArRow = {
  invoiceDate: string;
  invoiceNo: string;
  customer: string;
  voucherType: string;
  gstin: string;
  state: string;
  ledger: string;
  amount: number;
  issue: ArRowIssue | null;
  dedup?: ArDedup | null;
};

export type ArSheet = {
  name: string;
  rows: number;
};

export type InboxAr = {
  rowCount: number;
  sheetName: string;
  headers?: string[];
  sheets?: ArSheet[];
  /** Recognised template name, or null when the headers matched nothing. */
  template: string | null;
  rows: ArRow[];
  validRows: number;
  invalidRows: number;
  /** Rows dedup-checked out on a re-upload — already posted, converted or pending. */
  skippedRows?: number;
  /** Rows already turned into another voucher type. */
  convertedRows?: number;
};

/* ------------------------------------------------------------------ JV */

export type JvLine = {
  ledger: string;
  dr: number | null;
  cr: number | null;
};

export type InboxJv = {
  narration: string;
  lines: JvLine[];
};

/* --------------------------------------------------------------- Done */

/**
 * A document whose content hash matches something already posted under a
 * *different* voucher type — e.g. a Bill matching an existing Journal Voucher.
 */
export type CrossTypeDuplicate = {
  id: string;
  type: string;
  postedBy: string;
  postedOn: string;
  amount: number;
};

export type InboxLineage = {
  sourceType: string;
  sourceId: string;
  sourcePostedOn: string;
  convertedTo: {
    type: string;
    id: string;
    postedOn: string;
    actor: string;
  };
};

/* --------------------------------------------------------------- Item */

/** Where payment against a posted bill stands. */
export type InboxPaymentStatus = "unpaid" | "partiallyPaid" | "paid";

export type InboxItem = {
  id: string;
  file: InboxFile;
  source: InboxSource;
  vendor?: string;
  customer?: string;
  voucherType: string;
  /** null when the classifier could not choose — see `candidates`. */
  route: InboxRoute | null;
  ai: InboxAi;
  /** null until extraction completes. */
  amount: number | null;
  /** ISO 8601. */
  receivedAt: string;
  status: InboxStatus;

  /** Sitting longer than the ageing threshold. */
  aged?: boolean;
  ambiguous?: boolean;
  candidates?: InboxCandidate[];
  failure?: InboxFailure;
  retryAttempt?: number;
  retryMax?: number;
  duplicateOf?: string;
  crossDupOf?: CrossTypeDuplicate;
  batchTag?: string;
  doneBy?: string;
  /** ISO 8601. */
  doneAt?: string;
  /** Where a done item landed — a voucher no, or a batch summary. */
  destination?: string;
  deletedBy?: string;
  /** ISO 8601. */
  deletedAt?: string;
  lineage?: InboxLineage;

  /**
   * Bills only, once posted. Absent reads as unpaid — a bill that has just
   * been posted has had nothing paid against it.
   */
  paymentStatus?: InboxPaymentStatus;
  /**
   * Files on the voucher, the source document included. Absent reads as 1:
   * the document it was made from.
   */
  attachmentCount?: number;

  /**
   * The conversion the UI should offer on this item — a Bill that should have
   * been an Invoice, or a JV that should have been one.
   */
  convertHint?: "bill-to-invoice" | "jv-to-invoice";
  /** This file has been seen before; rows are dedup-checked individually. */
  isReupload?: boolean;

  /**
   * Prototype-only. Drives the multi-user edit-conflict demo.
   * DEV: delete this field — production detects conflicts server-side.
   */
  conflictSim?: boolean;

  /** Route-specific payloads. Exactly one is present once extraction succeeds. */
  bill?: InboxBill;
  banking?: InboxBanking;
  /**
   * A sales REGISTER. Legacy: v2 treats an AR item as one sales invoice, so
   * nothing in the current mock set carries this. The type and the grid that
   * reads it (components/inbox/detail/native-ar) are kept for the phase that
   * takes registers on — see PRD §8.
   */
  ar?: InboxAr;
  /** A single sales invoice we issued. This is what an AR item is in v2. */
  invoice?: InboxInvoice;
  jv?: InboxJv;
};

/* ------------------------------------------------------------- Config */

export type RouteMeta = {
  short: string;
  label: string;
  /** The noun this route produces, used in action labels ("Create Bill"). */
  verb: string;
};

export type ChannelMeta = {
  label: string;
};
