import React from "react";
import { ArrowRight } from "@/components/icons";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import { money } from "@/utils/pages/neo";
import { cn } from "@/lib/utils";

type Card = Extract<NeoCard, { kind: "changeset" }>;

type Props = {
  card: Card;
  /** Ticking is open while the card is waiting on the person. */
  editable: boolean;
  onChange: (card: Card) => void;
  onRef: (ref: NeoRef) => void;
};

/**
 * The sign-off for a change by rule: the rule, what it adds up to, and every
 * bill before → after with a tick. One decision for the set, instead of
 * Accept on each bill — and the rows Neo doubts arrive unticked, saying why,
 * so the exceptions are the person's call rather than buried in the batch.
 */
const ChangesetCard = ({ card, editable, onChange, onRef }: Props) => {
  const picked = card.rows.filter((r) => r.checked);
  const sum = picked.reduce((s, r) => s + r.amount, 0);
  const toggle = (itemId: string) =>
    onChange({
      ...card,
      rows: card.rows.map((r) =>
        r.itemId === itemId ? { ...r, checked: !r.checked } : r
      ),
    });

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <div className="border-b border-panel-border px-3 py-2.5">
        <p className="text-label-3 font-semibold text-foreground">
          {card.title}
        </p>
        <p className="mt-0.5 text-body-4 text-muted-foreground">
          Rule: {card.rule}
        </p>
      </div>
      <dl className="grid grid-cols-3 border-b border-panel-border">
        {[
          {
            term: `${picked.length} of ${card.rows.length} bill${card.rows.length === 1 ? "" : "s"}`,
            detail: card.company,
          },
          { term: money(sum), detail: `Changes ${card.field.toLowerCase()}` },
          {
            term: `${card.approvedSkipped} approved`,
            detail: "Never touched",
          },
        ].map((t) => (
          <div
            key={t.detail}
            className="min-w-0 border-r border-panel-border px-3 py-2 last:border-r-0"
          >
            <dt className="truncate text-label-3 font-semibold tabular-nums">
              {t.term}
            </dt>
            <dd className="truncate text-body-4 text-muted-foreground">
              {t.detail}
            </dd>
          </div>
        ))}
      </dl>
      <ul className="max-h-72 overflow-y-auto">
        {card.rows.map((r) => (
          <li
            key={r.itemId}
            className="flex items-start gap-2.5 border-t border-panel-border px-3 py-2 first:border-t-0"
          >
            <input
              type="checkbox"
              id={`neo-change-${r.itemId}`}
              checked={r.checked}
              disabled={!editable}
              onChange={() => toggle(r.itemId)}
              aria-label={`Include ${r.label}`}
              className="mt-0.5 h-4 w-4 flex-none accent-primary"
            />
            <div className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2 text-body-4">
                <button
                  type="button"
                  onClick={() => onRef({ label: r.label, itemId: r.itemId })}
                  className="code truncate text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  {r.label}
                </button>
                <span className="flex-none tabular-nums text-muted-foreground">
                  {money(r.amount)}
                </span>
              </span>
              <span
                className={cn(
                  "mt-0.5 flex items-center gap-1.5 text-body-4",
                  !r.checked && "opacity-60"
                )}
              >
                <span className="truncate text-muted-foreground line-through decoration-secondary-foreground">
                  {r.from}
                </span>
                <ArrowRight className="h-3 w-3 flex-none text-primary" />
                <span className="truncate font-semibold">{r.to}</span>
              </span>
              {r.doubt && (
                <span className="mt-1 block text-body-4 text-pi-warning">
                  Left unticked: {r.doubt}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-panel-border px-3 py-2 text-body-4 text-muted-foreground">
        Ticked bills stay in Needs review. Undo from Activity until
        they&rsquo;re approved.
      </p>
    </div>
  );
};

export default ChangesetCard;
