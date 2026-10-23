import type { NeoCard } from "@/types/pages/neo";
import {
  REVIEW_LABEL,
  configOf,
  currentVersion,
  getRun,
  liveSources,
  readiness,
} from "@/hooks/pages/neo/use-recon";
import { reportName } from "@/utils/pages/neo/recon-workbook";

/**
 * Which of Neo's cards are documents, opened beside the chat rather than
 * drawn inside it (19 Oct 2026, the chat apps' artifact pattern). Every
 * reconciliation step is something to read at full size; the chat keeps a
 * tile for it and the sign-off underneath. A decisions sheet stays in the
 * prompt box.
 */
export const opensInCanvas = (card?: NeoCard) =>
  card?.kind === "recon" || card?.kind === "recon-report";

/** The tile's name and one-line summary for a document card. */
export const canvasTitle = (card: NeoCard): { title: string; meta: string } => {
  switch (card.kind) {
    case "recon": {
      if (card.view === "config") {
        const cfg = configOf(card.company);
        return {
          title: "Reconciliation configuration",
          meta: cfg
            ? `Version ${cfg.version} · ${cfg.currency} · ${cfg.timezone}`
            : "",
        };
      }
      const run = card.runId ? getRun(card.runId) : undefined;
      const v = run && currentVersion(run);
      const views = {
        sources: [
          "Sources and validation",
          run
            ? `${liveSources(run).length} sources · ${readiness(run).rejected} rows rejected`
            : "",
        ],
        results: [
          `Reconciliation · ${run?.period.label || ""}`,
          v
            ? `Version ${v.n} · ${v.groups.length} groups · ${v.exceptions.length} exceptions`
            : "",
        ],
        review: [
          "Review record",
          v ? `Version ${v.n} · ${REVIEW_LABEL[v.review]}` : "",
        ],
      } as const;
      const [title, meta] = views[card.view];
      return { title, meta };
    }
    case "recon-report": {
      const run = getRun(card.runId);
      const v = run?.versions.find((x) => x.n === card.version);
      const latest = run && currentVersion(run);
      if (!run || !v) return { title: "Reconciliation report", meta: "" };
      return {
        title: reportName(run, v),
        meta:
          latest && latest.n > v.n
            ? `Version ${v.n} · superseded by version ${latest.n}`
            : `Version ${v.n} · ${v.groups.length} groups · ${v.exceptions.filter((e) => !e.deferred).length} open · ${REVIEW_LABEL[v.review]}`,
      };
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
  card.kind === "recon-report"
    ? `recon-report:${card.runId}:${card.version}`
    : card.kind === "recon"
      ? `recon:${card.view}:${card.view === "config" ? card.company : card.runId}`
      : null;

/**
 * The three shapes a document takes: a ledger of rows and money, a
 * rulebook of terms, or a statement someone signs. Anything else is a
 * record drawn by its own card.
 */
export type DocShape = "ledger" | "rulebook" | "statement" | "record";

export const docShape = (card: NeoCard): DocShape => {
  if (card.kind === "recon-report") return "ledger";
  if (card.kind !== "recon") return "record";
  if (card.view === "config") return "rulebook";
  if (card.view === "review") return "statement";
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
