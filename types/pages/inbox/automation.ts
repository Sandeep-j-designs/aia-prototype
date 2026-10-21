/**
 * Contracts for Automation: the screens that govern what the AI is allowed
 * to do on its own, and the log of everything it did.
 *
 * camelCase, shaped as the API returns them (production's apiClient converts
 * at the boundary). Mock data for each lives in
 * config/pages/inbox/mock-automation*.ts.
 */

/** Who took an action: the AI (named by the rule or model that acted) or a person. */
export type ActivityActor =
  { kind: "ai"; name: string } | { kind: "person"; name: string };

/** The screen an action belongs to, for the log's Module filter. */
export type ActivityModule =
  | "Inbox"
  | "Purchases"
  | "Sales"
  | "Journals"
  | "Banking"
  | "GST"
  | "Masters"
  | "Automation"
  | "Sync";

/**
 * What kind of moment it was. The log filters on these; the ones that carry
 * liability (an override, an auto-approval, an undo) are what a partner reads
 * before signing.
 */
export type ActivityKind =
  | "predicted"
  | "auto-approved"
  | "held"
  | "approved"
  | "override"
  | "undone"
  | "rule"
  | "matched"
  | "learned"
  | "blocked"
  | "synced"
  | "cleaned";

/** One line in the activity log. */
export type ActivityEntry = {
  id: string;
  company: string;
  /** ISO timestamp. */
  at: string;
  actor: ActivityActor;
  kind: ActivityKind;
  module: ActivityModule;
  /** Past-tense verb phrase, accountant's voice: "Auto-approved", "Changed ledger". */
  action: string;
  /** What it acted on, as the user would name it: "Airtel · BLR/2610/44871". */
  subject: string;
  /** The Inbox item, bank transaction or rule it links to, when there is one. */
  ref?: { kind: "document" | "transaction" | "rule"; id: string };
  /**
   * Why: the evidence for an AI action ("6 of 6 past Airtel bills, no
   * edits"), or the reason a person gave. Never a percentage.
   */
  reason?: string;
  /** A before → after for an edit: "Transportation → Freight Inward". */
  change?: { from: string; to: string };
  /** The action can still be reversed (nothing has gone to Tally yet). */
  undoable?: boolean;
};

/* --------------------------------------------------- auto-approve (Fork A) */

/**
 * One vendor + ledger pattern and the evidence behind trusting it.
 *
 * Trust is earned per pattern, not per vendor: Airtel's broadband bills to
 * Internet Charges and its postpaid bills to Telephone Charges are two
 * patterns, each with its own history.
 */
export type TrustPattern = {
  id: string;
  company: string;
  vendor: string;
  ledger: string;
  /** Bills from this vendor approved to this ledger. */
  approvals: number;
  /** Of those, how many a person changed before approving. */
  edits: number;
  /**
   * Approvals in a row since the last edit. Trust needs this to reach the
   * threshold: one edit starts the count again.
   */
  streak: number;
  /** When the last edit was made, ISO. */
  lastEditAt?: string;
  /** What changed on the last edit, in the accountant's words. */
  lastEditNote?: string;
  /** The usual bill total, in rupees. */
  usualAmount: number;
  /** When the last bill was approved, ISO. */
  lastSeenAt: string;
  /** Paused by hand, or by an edit after an auto-approval. */
  paused?: { by: string; at: string; reason: string };
};

/** The organisation's auto-approve switch and the evidence it asks for. */
export type AutoApproveSettings = {
  company: string;
  enabled: boolean;
  /** Past approvals to the same ledger, with no edits, before a pattern is trusted. */
  minApprovals: number;
  /** The bill must sit within this multiple of the usual amount, either way. */
  amountBand: number;
};

/** Where a pattern stands, worked out from its evidence and the settings. */
export type TrustStatus = "trusted" | "building" | "edited" | "paused";
