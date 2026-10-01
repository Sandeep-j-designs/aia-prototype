/**
 * Bill Splitter — PRD ai-accountant-prds.vercel.app/bill-pdf-split/.
 *
 * A supplier packet (one PDF, several bills) is read, a split is proposed,
 * the accountant corrects it, and each confirmed bill enters the ordinary
 * extraction → Needs Review flow. Nothing here approves or posts.
 */

/** What detection read off one page. */
export type SplitPageKind = "start" | "continued" | "blank" | "uncertain";

export type SplitPage = {
  /** 1-based page number in the source PDF. */
  n: number;
  kind: SplitPageKind;
  /** Supplier read off the page, where one was. */
  vendor?: string;
  /** Invoice number read off the page, where one was. */
  invoiceNo?: string;
  /**
   * The accountant's name for the bill starting on this page, without
   * ".pdf". Unset means the name is derived from vendor and invoice number.
   */
  name?: string;
};

/**
 * The proposal, and the accountant's edits to it. Page numbers throughout.
 *
 * Every page is either inside a bill (the bill whose start it follows) or in
 * `excluded`. That is what makes "every page accounted for exactly once" true
 * by construction rather than something to check.
 */
export type SplitPlan = {
  pages: SplitPage[];
  /** Where each bill starts. Always includes the first kept page. */
  starts: number[];
  /** What detection proposed, so a removed suggestion can still say so. */
  suggestedStarts: number[];
  excluded: number[];
  /** Excluded by detection rather than the accountant — kept visible. */
  autoExcluded: number[];
  /** Boundaries detection could not settle. Each blocks Create until answered. */
  uncertain: number[];
};

/**
 * PRD states for a packet in Bill Uploads: In progress, Split ready, Failed,
 * Completed.
 */
export type SplitPacketStatus =
  "inProgress" | "splitReady" | "failed" | "completed";

export type SplitPacket = {
  id: string;
  company: string;
  fileName: string;
  /** Bytes, as the API would report them. */
  size: number;
  pageCount: number;
  status: SplitPacketStatus;
  /** ISO 8601. */
  uploadedAt: string;
  uploadedBy: string;
  /** The sample packet has no bytes; its pages are drawn. */
  sample: boolean;
  plan?: SplitPlan;
  /** Plain-language reason, when status is failed. */
  failure?: { reason: string; retryable: boolean };
  /** Filled on Create: how many bills it became. */
  billCount?: number;
};
