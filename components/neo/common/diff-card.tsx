import React from "react";
import { ArrowRight } from "@/components/icons";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import { money } from "@/utils/pages/neo";

type Props = {
  card: Extract<NeoCard, { kind: "diff" }>;
  onRef: (ref: NeoRef) => void;
};

/** Every change a bulk edit would make, before it makes it. */
const DiffCard = ({ card, onRef }: Props) => {
  const changing = card.rows.filter((r) => r.from !== r.to).length;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <div className="flex items-center justify-between gap-2 bg-accent px-3 py-2">
        <p className="truncate text-label-3 font-semibold text-foreground">
          {card.title}
        </p>
        <span className="flex-none text-body-4 text-muted-foreground">
          {changing} {card.field.toLowerCase()} change
          {changing === 1 ? "" : "s"}
        </span>
      </div>
      <ul>
        {card.rows.map((r, i) => (
          <li key={i} className="border-t border-panel-border first:border-t-0">
            <button
              type="button"
              onClick={() => onRef({ label: r.itemId, itemId: r.itemId })}
              className="w-full px-3 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <span className="flex items-center justify-between gap-2 text-body-4 text-muted-foreground">
                <span className="truncate">{r.party}</span>
                <span className="flex-none tabular-nums">
                  {money(r.amount)}
                </span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-body-4">
                <span className="truncate text-muted-foreground line-through decoration-secondary-foreground">
                  {r.from}
                </span>
                <ArrowRight className="h-3 w-3 flex-none text-primary" />
                <span className="truncate font-semibold text-foreground">
                  {r.to}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DiffCard;
