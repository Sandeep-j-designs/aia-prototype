import type { Item } from "@/components/inbox/v2/store";
import { getRun } from "@/hooks/pages/neo/use-recon";
import type { NeoMessage } from "@/types/pages/neo";

/**
 * Drafts a chat handed over for review, as one set (20 Oct 2026). A bill in
 * a set of the chat on screen is that chat's subtask: the dock opens on the
 * bill's checklist, and the form walks the set in the chat's order.
 *
 * One kind in phase one: a reconciliation run's sales drafts (its drafts
 * card).
 */
export type ReviewSet = {
  key: string;
  kind: "recon";
  /** What the form's counter and the dock call it. */
  name: string;
  runId: string;
  /** The drafts, in the order the chat listed them. */
  ids: string[];
};

export const reviewSetsIn = (messages: NeoMessage[], items: Item[]) => {
  const sets = new Map<string, ReviewSet>();
  messages.forEach((m) => {
    const c = m.card;
    if (c?.kind === "recon" && c.view === "drafts" && c.runId) {
      const run = getRun(c.runId);
      const ids = (run?.createdItemIds || []).filter((id) =>
        items.some((x) => x.id === id && x.status !== "Deleted")
      );
      if (run && ids.length)
        sets.set(`recon:${run.id}`, {
          key: `recon:${run.id}`,
          kind: "recon",
          name: `Reconciliation ${run.outlet}, Sep`,
          runId: run.id,
          ids,
        });
    }
  });
  return [...sets.values()];
};

/** The latest set in the chat that holds this bill. */
export const reviewSetFor = (
  messages: NeoMessage[],
  items: Item[],
  itemId: string
) =>
  reviewSetsIn(messages, items)
    .reverse()
    .find((s) => s.ids.includes(itemId));
