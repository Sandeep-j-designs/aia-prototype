import React from "react";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import { money } from "@/utils/pages/neo";
import { cn } from "@/lib/utils";

type Props = {
  card: Extract<NeoCard, { kind: "voucher" }>;
  onRef: (ref: NeoRef) => void;
};

/**
 * The voucher exactly as it will post: Tally's own Dr/Cr reading, ledger by
 * ledger, with every value Neo chose — rather than read — highlighted, and the
 * reason underneath. This is the preview the approval rests on, so it shows
 * the entry, not a summary of it.
 */
const VoucherCard = ({ card, onRef }: Props) => {
  const dr = card.lines.filter((l) => l.side === "Dr");
  const cr = card.lines.filter((l) => l.side === "Cr");
  const total = dr.reduce((s, l) => s + l.amount, 0);
  const credit = cr.reduce((s, l) => s + l.amount, 0);
  const balanced = Math.abs(total - credit) < 0.005;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <div className="flex items-start justify-between gap-3 bg-accent px-3 py-2">
        <div className="min-w-0">
          <p className="text-label-3 font-semibold text-foreground">
            {card.company && (
              <span className="mb-1 block text-body-4 text-muted-foreground">
                {card.company}
              </span>
            )}
            {card.voucherType} · {card.voucherNo}
          </p>
          <p
            className="truncate text-body-4 text-muted-foreground"
            title={card.party}
          >
            {card.party}
          </p>
        </div>
        <div className="flex flex-none flex-col items-end gap-1">
          <span
            className={cn(
              "rounded-sm px-1.5 py-0.5 text-body-4 font-semibold",
              card.state === "Preview"
                ? "bg-background text-primary"
                : "bg-success-green text-success-green-foreground"
            )}
          >
            {card.state}
          </span>
          <span className="text-body-4 text-muted-foreground tabular-nums">
            {card.date}
          </span>
        </div>
      </div>
      {card.items && (
        <table className="w-full text-body-4">
          <caption className="px-3 py-2 text-left font-semibold">
            Invoice lines · before tax
          </caption>
          <thead>
            <tr>
              <th className="px-3 py-1 text-left">Source line</th>
              <th className="py-1 text-right">Cost</th>
              <th className="px-3 py-1 text-right">Sale</th>
            </tr>
          </thead>
          <tbody>
            {card.items.map((item, i) => (
              <tr key={i} className="border-t border-panel-border">
                <td className="px-3 py-2">{item.description}</td>
                <td className="text-right tabular-nums">{money(item.cost)}</td>
                <td className="px-3 text-right tabular-nums">
                  {money(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <details open={!card.items} className="border-t border-panel-border">
        <summary className="cursor-pointer px-3 py-2 text-label-3 font-semibold">
          Accounting entries · {money(total)}
        </summary>
        <table className="w-full text-body-4">
          <tbody>
            {[...dr, ...cr].map((l, i) => (
              <tr
                key={i}
                className="border-t border-panel-border first:border-t-0"
              >
                <td className="w-7 py-1.5 pl-3 align-top font-semibold text-muted-foreground">
                  {l.side}
                </td>
                <td className="py-1.5 pr-2 align-top">
                  <span
                    className={cn(
                      "rounded-sm",
                      l.inferred &&
                        "bg-warning px-1 text-foreground ring-1 ring-warning-border"
                    )}
                  >
                    {l.ledger}
                  </span>
                </td>
                <td className="whitespace-nowrap py-1.5 pr-3 text-right align-top tabular-nums">
                  {money(l.amount)}
                </td>
              </tr>
            ))}
            <tr className="border-t border-border font-semibold">
              <td />
              <td className="py-1.5 text-muted-foreground">
                {balanced ? "Dr = Cr" : "Unbalanced — review required"}
              </td>
              <td className="whitespace-nowrap py-1.5 pr-3 text-right tabular-nums">
                {money(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </details>
      {card.assumptions && (
        <div className="border-t border-panel-border px-3 py-2 text-body-4 leading-4">
          <p className="font-semibold">Review before creating</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {card.assumptions.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      )}
      {(card.why || card.source) && (
        <div className="border-t border-panel-border bg-section px-3 py-2 text-body-4 leading-4 text-muted-foreground">
          {card.why && (
            <p>
              <span className="mr-1 rounded-sm bg-warning px-1 text-foreground ring-1 ring-warning-border">
                Highlighted
              </span>
              = chosen by Neo. {card.why}
            </p>
          )}
          {card.source && (
            <button
              type="button"
              onClick={() => onRef(card.source!)}
              className="mt-1 font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Source: {card.source.label}
            </button>
          )}
          {!!card.evidence?.length && (
            <div className="mt-1 flex flex-wrap gap-2">
              Ledger evidence:{" "}
              {card.evidence.map((ref) => (
                <button
                  key={ref.itemId}
                  type="button"
                  onClick={() => onRef(ref)}
                  className="text-primary underline"
                >
                  {ref.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoucherCard;
