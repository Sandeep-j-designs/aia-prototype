import type { InboxItem } from "@/types/pages/inbox";

export type SourceProvider =
  "Forwarding" | "Gmail" | "Google Drive" | "WhatsApp Business";
export type AgentRunMode = "on-demand" | "continuous";
export type CollectionAgent = {
  company: string;
  configured: boolean;
  runMode: AgentRunMode;
  paused: boolean;
  /** The setup saved from Neo's chat; with `configured` false, a draft. */
  setup?: CollectionSetup;
};
export type CollectionRun = {
  id: string;
  company: string;
  trigger: "continuous" | "on-demand";
  status: "running" | "completed" | "partial" | "stopped" | "failed";
  startedAt: string;
  finishedAt?: string;
  itemIds: string[];
  summary: string;
};
export type InboxSource = {
  id: string;
  company: string;
  provider: SourceProvider;
  account: string;
  scope: string;
  since: string;
  status: "connected" | "paused" | "disconnected";
  lastChecked?: string;
  summary?: string;
};
export type SourceCandidate = {
  key: string;
  hash: string;
  provider: SourceProvider;
  location: string;
  received: string;
  problem?: "missing-reference" | "unreadable";
  /** Who sent it: an email address or a phone number. */
  sender: string;
  /** A vendor in the masters, or a member of staff. */
  knownSender: boolean;
  /** What the file is. Anything but a bill is never drafted. */
  kind: "bill" | "statement" | "advice" | "quote" | "newsletter";
  document: InboxItem;
};
export type SourceReceipt = {
  company: string;
  sourceId: string;
  candidateKey: string;
  itemId?: string;
  hash: string;
  location: string;
  collectedAt: string;
  outcome: "prepared" | "linked" | "needs-decision" | "skipped" | "failed";
  reason: string;
};
export type SourceRequest = {
  company: string;
  runId: string;
  sourceId: string;
  candidateKey: string;
  body: string;
  status: "waiting" | "received";
};

/**
 * Document Collection set up in Neo's chat (19 Oct 2026): the setup card's
 * fields. Neo fills them from the answers; a field the person changed on
 * the card is listed in `edited`, and Neo never overwrites it.
 */
export type CollectionChannel = {
  provider: SourceProvider;
  status: "connected" | "pending" | "skipped";
  account: string;
  scope: string;
};
export type CollectionBackfill = "period" | "30d" | "fy" | "new";
export type CollectionSetup = {
  channels: CollectionChannel[];
  /** "known" = vendors in the masters and staff. */
  senders: "known" | "anyone";
  /** "bills" = skip what isn't a bill; "all" = hold it for a person. */
  files: "bills" | "all";
  backfill: CollectionBackfill;
  schedule: "15m" | "manual";
  notify: "daily" | "each" | "off";
  allowed: string[];
  blocked: string[];
  edited: string[];
};
export type CollectionOutcome = SourceReceipt["outcome"];
/** One row of a dry run: what collecting would do, with nothing created. */
export type CollectionDryRunRow = {
  key: string;
  provider: SourceProvider;
  sender: string;
  file: string;
  vendor: string;
  amount: number;
  received: string;
  outcome: CollectionOutcome;
  reason: string;
  /** Set when the sender rule decided it, so the row can offer to change it. */
  senderRule?: "unknown" | "blocked";
};
