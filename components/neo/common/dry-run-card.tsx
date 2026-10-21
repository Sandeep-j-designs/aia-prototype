import React from "react";
import { useStore } from "@/components/inbox/v2/store";
import { ProviderIcon } from "@/components/agents/provider-icon";
import {
  dryRunCollection,
  patchCollectionDraft,
  sinceFor,
  useInboxSources,
} from "@/hooks/pages/inbox/use-inbox-sources";
import type { NeoCard } from "@/types/pages/neo";
import type {
  CollectionDryRunRow,
  CollectionOutcome,
} from "@/types/pages/inbox/sources";
import { money } from "@/utils/pages/neo";
import { cn } from "@/lib/utils";
import { dayOf } from "./collection-card";

type Props = {
  card: Extract<NeoCard, { kind: "collection-dry-run" }>;
};

const GROUPS: { outcome: CollectionOutcome; label: string; dot: string }[] = [
  { outcome: "prepared", label: "Would prepare", dot: "bg-pi-success-dot" },
  {
    outcome: "linked",
    label: "Already in your books",
    dot: "bg-pi-line-strong",
  },
  {
    outcome: "needs-decision",
    label: "Needs your decision",
    dot: "bg-pi-warning-dot",
  },
  { outcome: "skipped", label: "Skipped", dot: "bg-pi-line-strong" },
  { outcome: "failed", label: "Unreadable", dot: "bg-pi-danger-dot" },
];

/** The draft-only count the sign-off button names: "prepare 9 drafts". */
export const preparedCount = (rows: CollectionDryRunRow[]) =>
  rows.filter((r) => r.outcome === "prepared").length;

/** The rows a dry-run card shows: frozen once saved, else live. */
export const useDryRunRows = (
  card: Extract<NeoCard, { kind: "collection-dry-run" }>
) => {
  const sources = useInboxSources();
  // The Inbox is read too: what counts as "already in your books" follows it.
  useStore();
  const draft = sources.drafts.find((d) => d.company === card.company)?.setup;
  if (card.rows) return { rows: card.rows, draft: undefined };
  return {
    rows: draft ? dryRunCollection(card.company, draft) : [],
    draft,
  };
};

const ROW_ACTION =
  "flex-none rounded-sm px-1.5 py-0.5 text-body-4 font-semibold text-primary hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border";

/**
 * Document Collection's dry run: every file the backfill would reach, in
 * the five outcomes a real run has, with nothing created. While setting up,
 * a sender can be allowed or excluded from a row and the run redraws.
 */
const DryRunCard = ({ card }: Props) => {
  const { rows, draft } = useDryRunRows(card);
  const live = !!draft;
  const channels = new Set(rows.map((r) => r.provider)).size;
  const sender = (
    r: CollectionDryRunRow,
    change: "allow" | "block" | "unblock"
  ) => {
    if (!draft) return;
    patchCollectionDraft(
      card.company,
      change === "allow"
        ? { allowed: [...new Set([...draft.allowed, r.sender])] }
        : change === "block"
          ? { blocked: [...new Set([...draft.blocked, r.sender])] }
          : { blocked: draft.blocked.filter((s) => s !== r.sender) },
      true
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-pi-line bg-background text-pi-ink">
      <div className="px-4 pb-2 pt-3">
        <p className="text-label-2 font-semibold">Dry run</p>
        <p className="mt-0.5 text-body-4 text-pi-body">
          {rows.length} file{rows.length === 1 ? "" : "s"} on {channels} channel
          {channels === 1 ? "" : "s"}
          {draft && ` since ${dayOf(sinceFor(draft.backfill))}`}
          {live ? " · nothing has been created" : " · as it stood when saved"}
        </p>
      </div>
      {!rows.length && (
        <p className="border-t border-pi-line px-4 py-3 text-body-4 text-pi-body">
          Nothing in this window. New bills will be collected as they arrive.
        </p>
      )}
      {GROUPS.map((g) => {
        const list = rows.filter((r) => r.outcome === g.outcome);
        if (!list.length) return null;
        const sum = list.reduce((s, r) => s + r.amount, 0);
        return (
          <section key={g.outcome} className="border-t border-pi-line">
            <header className="flex items-center justify-between gap-2 px-4 pb-1 pt-2">
              <span className="flex items-center gap-2 text-body-4 font-semibold">
                <span
                  aria-hidden
                  className={cn("size-[7px] rounded-full", g.dot)}
                />
                {g.label} · {list.length}
              </span>
              {g.outcome === "prepared" && sum > 0 && (
                <span className="text-body-4 font-semibold tabular-nums text-pi-body">
                  {money(sum)}
                </span>
              )}
            </header>
            <ul className="pb-2">
              {list.map((r) => (
                <li key={r.key} className="flex items-start gap-2 px-4 py-1.5">
                  <ProviderIcon
                    provider={r.provider}
                    className="mt-0.5 size-6 [&>svg]:size-3.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline justify-between gap-2 text-body-4">
                      <span className="truncate">{r.vendor}</span>
                      {r.amount > 0 && (
                        <span className="flex-none tabular-nums">
                          {money(r.amount)}
                        </span>
                      )}
                    </p>
                    <p
                      className="truncate text-body-4 text-pi-body"
                      title={`${r.sender} · ${r.file}`}
                    >
                      {r.file} · {r.sender} · {dayOf(r.received)}
                    </p>
                    {g.outcome !== "prepared" && (
                      <p className="text-body-4 text-pi-faint">{r.reason}</p>
                    )}
                  </div>
                  {live &&
                    (r.senderRule === "unknown" ? (
                      <button
                        type="button"
                        className={ROW_ACTION}
                        onClick={() => sender(r, "allow")}
                      >
                        Allow sender
                      </button>
                    ) : r.senderRule === "blocked" ? (
                      <button
                        type="button"
                        className={ROW_ACTION}
                        onClick={() => sender(r, "unblock")}
                      >
                        Include again
                      </button>
                    ) : g.outcome === "prepared" ||
                      g.outcome === "needs-decision" ? (
                      <button
                        type="button"
                        className={cn(ROW_ACTION, "text-pi-body")}
                        onClick={() => sender(r, "block")}
                      >
                        Exclude sender
                      </button>
                    ) : null)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

export default DryRunCard;
