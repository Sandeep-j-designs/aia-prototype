import type { Item } from "@/components/inbox/v2/store";
import { getBatch } from "@/hooks/pages/neo/use-batches";
import { getRun } from "@/hooks/pages/neo/use-recon";
import type { NeoMessage } from "@/types/pages/neo";
import { queueOf } from "./bill-checks";

/**
 * Drafts a chat handed over for review, as one set (20 Oct 2026). A bill in
 * a set of the chat on screen is that chat's subtask: the dock opens on the
 * bill's checklist, and the form walks the set in the chat's order.
 *
 * Three kinds so far: a voucher-entry batch (its drafts card), a list card
 * a task marks with `review` (Document collection's "Collection results"),
 * and a reconciliation run's sales drafts (its drafts card).
 */
export type ReviewSet = {
  key: string;
  kind: "batch" | "list" | "recon";
  /** What the form's counter and the dock call it: "Batch B-1020-01". */
  name: string;
  batchId?: string;
  runId?: string;
  /** The drafts, in the order the chat listed them. */
  ids: string[];
};

export const reviewSetsIn = (messages: NeoMessage[], items: Item[]) => {
  const sets = new Map<string, ReviewSet>();
  messages.forEach((m) => {
    const c = m.card;
    if (c?.kind === "batch") {
      const batch = getBatch(c.batchId);
      if (batch?.draftIds.length)
        sets.set(`batch:${batch.id}`, {
          key: `batch:${batch.id}`,
          kind: "batch",
          name: `Batch ${batch.id}`,
          batchId: batch.id,
          ids: queueOf(batch, items).map((x) => x.id),
        });
    }
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
    if (c?.kind === "list" && c.review) {
      const ids = [
        ...new Set(c.groups.flatMap((g) => g.rows.map((r) => r.itemId))),
      ].filter((id) =>
        items.some((x) => x.id === id && x.status !== "Deleted")
      );
      if (ids.length)
        sets.set(`list:${m.id}`, {
          key: `list:${m.id}`,
          kind: "list",
          name: c.review,
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
