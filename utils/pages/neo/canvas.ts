import type { NeoCard } from "@/types/pages/neo";
import { getRun, registerCounts, rulesOf } from "@/hooks/pages/neo/use-recon";

/**
 * Which of Neo's cards are documents, opened beside the chat rather than
 * drawn inside it (19 Oct 2026, the chat apps' artifact pattern). Every
 * reconciliation step is something to read at full size; the chat keeps a
 * tile for it and the sign-off underneath. A decisions sheet stays in the
 * prompt box.
 */
export const opensInCanvas = (card?: NeoCard) => card?.kind === "recon";

/** The tile's name and one-line summary for a document card. */
export const canvasTitle = (card: NeoCard): { title: string; meta: string } => {
  switch (card.kind) {
    case "recon": {
      const run = card.runId ? getRun(card.runId) : undefined;
      const c = run && registerCounts(run);
      const views = {
        policy: ["Reconciliation policy", "Drafted from Jun–Aug vouchers"],
        reports: [
          "Reports",
          run
            ? `${run.docs.length} files · ${run.docs.filter((d) => d.status === "read").length} read`
            : "",
        ],
        payouts: [
          "Payouts to bank",
          run
            ? `${run.payouts.filter((p) => p.bank !== undefined).length} proved to the bank`
            : "",
        ],
        sales: [
          "Sales to payouts",
          run
            ? `${new Set(run.sales.map((x) => x.date)).size} days × 6 channels`
            : "",
        ],
        bank: [
          "Bank lines",
          run ? `${run.bank.length} rows accounted · HDFC ·0418` : "",
        ],
        register: [
          "Entry register",
          c ? `${c.total} vouchers · ${c.suspense} to suspense` : "",
        ],
        drafts: [
          "Reconciliation drafts",
          run
            ? `${run.createdItemIds.length} sales · ${run.createdBankKeys.length} bank lines`
            : "",
        ],
        close: [
          `Close ${run?.period.replace(" 2026", "") || "the period"}`,
          run?.closed
            ? "Closed"
            : run?.evidence
              ? "Evidence read"
              : "Not started",
        ],
        rules: [
          "What Neo has learned",
          `${rulesOf(card.company).length} rules for this client`,
        ],
      } as const;
      const [title, meta] = views[card.view];
      return { title, meta };
    }
    default:
      return { title: "Document", meta: "" };
  }
};

/**
 * Which document a card is, so a second showing of the same one updates it
 * instead of adding another (20 Oct 2026). Recon views read live from the
 * store, so the latest showing is the document; earlier tiles open it too.
 */
export const canvasKey = (card: NeoCard): string | null =>
  card.kind === "recon"
    ? `recon:${card.view}:${card.view === "policy" || card.view === "rules" ? card.company : card.runId}`
    : null;

/**
 * The three shapes a document takes: a ledger of rows and money, a
 * rulebook of terms, or a statement someone signs. Anything else is a
 * record drawn by its own card.
 */
export type DocShape = "ledger" | "rulebook" | "statement" | "record";

export const docShape = (card: NeoCard): DocShape => {
  if (card.kind !== "recon") return "record";
  if (card.view === "policy" || card.view === "rules") return "rulebook";
  if (card.view === "close") return "statement";
  return "ledger";
};

/** Whether the open canvas is this message's document (or a later showing of it). */
export const sameDoc = (
  messages: { id: string; card?: NeoCard }[],
  open: string | null | undefined,
  m: { id: string; card?: NeoCard }
) => {
  if (!open) return false;
  if (open === m.id) return true;
  const key = m.card && canvasKey(m.card);
  const other = messages.find((x) => x.id === open)?.card;
  return !!key && !!other && canvasKey(other) === key;
};
