import type { NeoCard } from "@/types/pages/neo";
import { getRun, registerCounts, rulesOf } from "@/hooks/pages/neo/use-recon";

/**
 * Which of Neo's cards are documents, opened beside the chat rather than
 * drawn inside it (19 Oct 2026, the chat apps' artifact pattern). A voucher,
 * a batch, a change set or a dry run is something to read and edit at full
 * size; the chat keeps a tile for it and the sign-off underneath.
 *
 * Small cards stay in the thread: a short list, an outbound message (read
 * verbatim right beside its Send), an agent, a live pipeline.
 */
export const opensInCanvas = (card?: NeoCard) => {
  if (!card) return false;
  switch (card.kind) {
    case "voucher":
    case "batch":
    case "changeset":
    case "diff":
    case "collection-setup":
    case "collection-dry-run":
    case "recon":
      return true;
    case "list":
      return card.groups.reduce((n, g) => n + g.rows.length, 0) > 5;
    default:
      return false;
  }
};

/** The tile's name and one-line summary for a document card. */
export const canvasTitle = (card: NeoCard): { title: string; meta: string } => {
  switch (card.kind) {
    case "voucher":
      return {
        title: `${card.voucherType} · ${card.party}`,
        meta: `${card.state} · ${card.voucherNo}`,
      };
    case "batch":
      return {
        title:
          card.view === "settings"
            ? "Batch settings"
            : card.view === "register"
              ? "Batch register"
              : "Batch drafts",
        meta: card.batchId,
      };
    case "changeset":
      return {
        title: card.title,
        meta: `${card.rows.filter((r) => r.checked).length} of ${card.rows.length} ticked · ${card.field}`,
      };
    case "diff":
      return { title: card.title, meta: `${card.rows.length} changes` };
    case "collection-setup":
      return { title: "Document collection setup", meta: "Agent settings" };
    case "collection-dry-run":
      return { title: "Dry run", meta: "What collecting would do" };
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
    case "list":
      return {
        title: card.title,
        meta: `${card.groups.reduce((n, g) => n + g.rows.length, 0)} records`,
      };
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
    : // A voucher or change set is edited in its own message: each stays its own.
      null;

/**
 * The three shapes a document takes: a ledger of rows and money, a
 * rulebook of terms, or a statement someone signs. Anything else is a
 * record (a voucher, a change set) drawn by its own card.
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
