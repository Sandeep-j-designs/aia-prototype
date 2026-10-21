/**
 * A chase: Neo asked someone outside the firm for something, on the
 * accountant's say-so, and is waiting for it.
 *
 * It lives from the send to the reply: waiting → received → closed. A reply
 * is received when it lands (a GSTIN in a message, a clearer copy, a payment
 * date); the chase closes when the document it was for no longer needs it —
 * the bill is approved, or the person marks it done.
 *
 * DEV: GET /api/neo/chases?company=…; replies arrive through the inbound
 * mail/WhatsApp webhook, which matches them to the open chase by thread.
 */
export type ChaseAsk = "gstin" | "copy" | "invoice" | "credit" | "payment";

export type ChaseStatus = "waiting" | "received" | "closed";

export type Chase = {
  id: string;
  company: string;
  ask: ChaseAsk;
  /** Vendor or customer name, as the document has it. */
  party: string;
  channel: "Email" | "WhatsApp";
  to: string;
  body: string;
  /** The document the chase is about. */
  itemId?: string;
  /** Voucher or invoice number, for the row. */
  docRef: string;
  status: ChaseStatus;
  sentAt: string;
  sentBy: string;
  runId?: string;
  reply?: {
    at: string;
    text: string;
    /** What the reply carries that can be applied: a GSTIN, a date. */
    value?: string;
  };
  closedAt?: string;
  closedReason?: string;
};
