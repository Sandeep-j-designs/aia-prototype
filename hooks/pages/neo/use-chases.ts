import { useSyncExternalStore } from "react";
import { actor, getState, subscribeStore } from "@/components/inbox/v2/store";
import { MOCK_CHASES } from "@/config/pages/neo/mock-chases";
import { MOCK_PARTIES } from "@/config/pages/inbox/mock-parties";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { receiveSourceReply } from "@/hooks/pages/inbox/use-inbox-sources";
import type { Chase, ChaseAsk } from "@/types/pages/neo/chases";

/**
 * Chases: what Neo asked people outside the firm for, and whether they have
 * answered. Module-level like the other stores, so a chase sent from the
 * panel shows on the document and in the firm brief at once. In memory,
 * reseeded on load.
 *
 * A chase closes on its own when the document it was for stops needing it —
 * the bill or invoice is approved, or deleted — so nobody has to remember to
 * tidy the list.
 *
 * DEV: GET /api/neo/chases?company=…; POST /api/neo/chases on send. Replies
 * come from the inbound mail/WhatsApp webhook, not from the client.
 */

type State = { chases: Chase[] };

let state: State = { chases: [] };
let seeded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const ensureSeeded = () => {
  if (seeded || typeof window === "undefined") return;
  seeded = true;
  // DEV: replace with GET /api/neo/chases
  state = { chases: structuredClone(MOCK_CHASES) };
  subscribeStore(closeSettled);
};

/** Close chases whose document no longer needs an answer. */
const closeSettled = () => {
  const items = getState().items;
  let changed = false;
  const chases = state.chases.map((c) => {
    if (c.status === "closed" || !c.itemId || c.ask === "payment") return c;
    const item = items.find((x) => x.id === c.itemId);
    if (!item || !["Approved", "Deleted"].includes(item.status)) return c;
    changed = true;
    return {
      ...c,
      status: "closed" as const,
      closedAt: new Date().toISOString(),
      closedReason:
        item.status === "Approved" ? "Document approved" : "Document deleted",
    };
  });
  if (changed) {
    state = { chases };
    emit();
  }
};

const subscribe = (listener: () => void) => {
  ensureSeeded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const snapshot = () => {
  ensureSeeded();
  return state;
};

export const useChases = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);

export const getChases = () => snapshot().chases;

export const chasesFor = (company: string) =>
  snapshot().chases.filter((c) => c.company === company);

/** The open chase on a document, if there is one. */
export const openChaseOn = (itemId: string, ask?: ChaseAsk) =>
  snapshot().chases.find(
    (c) =>
      c.itemId === itemId && c.status !== "closed" && (!ask || c.ask === ask)
  );

export const ASK_WORDS: Record<ChaseAsk, string> = {
  gstin: "GSTIN",
  copy: "Clearer copy",
  invoice: "Tax invoice",
  credit: "Credit note",
  payment: "Payment date",
};

/** Record a chase the person just sent. */
export const recordChase = (
  chase: Omit<Chase, "id" | "status" | "sentAt" | "sentBy">
) => {
  ensureSeeded();
  const full: Chase = {
    ...chase,
    id: `chase-${crypto.randomUUID()}`,
    status: "waiting",
    sentAt: new Date().toISOString(),
    sentBy: actor,
  };
  state = { chases: [full, ...state.chases] };
  emit();
  return full;
};

/**
 * What each kind of chase gets back, for the prototype's simulated reply.
 * A GSTIN reply confirms the one printed on the bill; without one, a made-up
 * checksum-valid GSTIN stands in.
 */
const replyFor = (c: Chase) => {
  switch (c.ask) {
    case "gstin": {
      // The vendor confirms what their bill prints, when it prints one.
      const gstin = MOCK_PARTIES[c.party]?.gstin || "24AAHCA4419K1ZP";
      return {
        text: `Confirming our GSTIN is ${gstin}. Registration certificate attached.`,
        value: gstin,
      };
    }
    case "copy":
      return {
        text: "Attached a clearer PDF of the invoice.",
        value: undefined,
      };
    case "invoice":
      return { text: "Attached the final tax invoice.", value: undefined };
    case "credit":
      return { text: "Credit note issued, attached.", value: undefined };
    default:
      return {
        text: "Payment is scheduled for release on 24 Oct 2026.",
        value: "24 Oct 2026",
      };
  }
};

/**
 * Prototype-only: play the other side's reply.
 * DEV: delete — replies come from the inbound webhook.
 */
export const simulateReply = (id: string) => {
  const chase = state.chases.find((c) => c.id === id);
  if (!chase || chase.status !== "waiting") return;
  const reply = { at: new Date().toISOString(), ...replyFor(chase) };
  // A clearer copy of a collected attachment replaces it in the Inbox.
  if (chase.ask === "copy" && chase.runId) receiveSourceReply(chase.runId);
  state = {
    chases: state.chases.map((c) =>
      c.id === id ? { ...c, status: "received", reply } : c
    ),
  };
  logActivity({
    company: chase.company,
    actor: { kind: "ai", name: "Neo · Chase" },
    kind: "matched",
    module: chase.ask === "payment" ? "Sales" : "Purchases",
    action: "Linked reply to chase",
    subject: `${chase.party} · ${chase.docRef}`,
    reason: reply.text,
    ref: chase.itemId ? { kind: "document", id: chase.itemId } : undefined,
  });
  emit();
};

/** The person has used the reply, or no longer needs one. */
export const closeChase = (id: string, reason = "Marked done") => {
  const chase = state.chases.find((c) => c.id === id);
  if (!chase || chase.status === "closed") return;
  state = {
    chases: state.chases.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "closed",
            closedAt: new Date().toISOString(),
            closedReason: reason,
          }
        : c
    ),
  };
  logActivity({
    company: chase.company,
    actor: { kind: "person", name: actor },
    kind: "override",
    module: chase.ask === "payment" ? "Sales" : "Purchases",
    action: "Closed chase",
    subject: `${chase.party} · ${chase.docRef}`,
    reason,
    ref: chase.itemId ? { kind: "document", id: chase.itemId } : undefined,
  });
  emit();
};
