import React from "react";
import { ChevronRight } from "@/components/icons";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import { money } from "@/utils/pages/neo";
import { cn } from "@/lib/utils";
import { TONE } from "./tone";

type Props = {
  card: Extract<NeoCard, { kind: "list" }>;
  onRef: (ref: NeoRef) => void;
  /** Beside the chat there is room for every row. */
  all?: boolean;
};

/** Rows shown per group before "and N more" — the panel is a summary, the
 *  queue is where the full list lives. */
const VISIBLE = 5;

/**
 * Documents grouped by what they need, each group with its count and rupee
 * total, each row a way into the document.
 */
const ListCard = ({ card, onRef, all }: Props) => {
  const visible = all ? Infinity : VISIBLE;
  return (
  <div className="overflow-hidden rounded-lg border border-border bg-background text-foreground">
    <p className="bg-accent px-3 py-2 text-label-3 font-semibold text-foreground">
      {card.title}
    </p>
    {card.groups.map((g) => {
      const sum = g.rows.reduce((s, r) => s + (r.amount || 0), 0);
      return (
        <section key={g.label} className="border-t border-panel-border">
          <header className="flex items-center justify-between gap-2 px-3 pb-1 pt-2">
            <span
              className={cn(
                "rounded-sm px-1.5 py-0.5 text-body-4 font-semibold",
                TONE[g.tone]
              )}
            >
              {g.label} · {g.rows.length}
            </span>
            {sum > 0 && (
              <span className="text-body-4 font-semibold text-muted-foreground tabular-nums">
                {money(sum)}
              </span>
            )}
          </header>
          <ul className="pb-1">
            {g.rows.slice(0, visible).map((r) => (
              <li key={r.itemId}>
                <button
                  type="button"
                  onClick={() => onRef({ label: r.itemId, itemId: r.itemId })}
                  className="group flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-4 text-foreground">
                      {r.primary}
                    </span>
                    {r.secondary && (
                      <span className="block truncate text-body-4 text-muted-foreground">
                        {r.secondary}
                      </span>
                    )}
                  </span>
                  {r.amount !== undefined && (
                    <span className="flex-none text-body-4 tabular-nums">
                      {money(r.amount)}
                    </span>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 flex-none text-secondary-foreground" />
                </button>
              </li>
            ))}
            {g.rows.length > visible && (
              <li className="px-3 py-1 text-body-4 text-muted-foreground">
                and {g.rows.length - visible} more in the Inbox
              </li>
            )}
          </ul>
        </section>
      );
    })}
  </div>
);
};

export default ListCard;
