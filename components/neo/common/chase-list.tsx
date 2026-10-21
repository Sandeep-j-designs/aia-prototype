import React from "react";
import { Button } from "@/components/ui/button";
import { companyOf, useStore } from "@/components/inbox/v2/store";
import {
  ASK_WORDS,
  closeChase,
  simulateReply,
  useChases,
} from "@/hooks/pages/neo/use-chases";
import type { Chase } from "@/types/pages/neo/chases";
import { cn } from "@/lib/utils";

type Props = {
  /** Every client's chases (the brief), or only the open company's. */
  all?: boolean;
  /** Tighter rows for the Neo panel. */
  compact?: boolean;
  onOpen: (company: string, href: string) => void;
};

const STATUS: Record<Chase["status"], { label: string; dot: string }> = {
  received: { label: "Replied", dot: "bg-pi-success-dot" },
  waiting: { label: "Waiting", dot: "bg-pi-warning-dot" },
  closed: { label: "Closed", dot: "bg-pi-line-strong" },
};

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/**
 * What Neo asked people outside the firm for, and what came back. Replies
 * sit at the top: they are the ones with something to use. A chase closes on
 * its own once its document is approved; Mark done closes it by hand.
 */
const ChaseList = ({ all, compact, onOpen }: Props) => {
  const { chases } = useChases();
  const state = useStore();
  const order = { received: 0, waiting: 1, closed: 2 };
  const rows = chases
    .filter((c) => all || c.company === state.company)
    .sort(
      (a, b) =>
        order[a.status] - order[b.status] ||
        +new Date(b.sentAt) - +new Date(a.sentAt)
    );

  if (!rows.length)
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed border-pi-line-2 text-[13px] leading-5 text-pi-body",
          compact ? "px-4 py-3" : "px-5 py-4"
        )}
      >
        No chases yet. Ask Neo to request a GSTIN, a clearer copy or a payment
        date, and it tracks the reply here.
      </p>
    );

  return (
    <ul className="overflow-hidden rounded-lg border border-pi-line bg-background">
      {rows.map((c) => {
        const href = c.itemId
          ? `/inbox?id=${encodeURIComponent(c.itemId)}`
          : "/inbox";
        return (
          <li
            key={c.id}
            className={cn(
              "flex flex-col gap-2 border-b border-pi-line last:border-b-0",
              compact ? "px-4 py-3" : "px-5 py-3.5",
              c.status === "closed" && "opacity-70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-pi-ink">
                  {ASK_WORDS[c.ask]} · {c.party}
                </p>
                <p className="mt-0.5 truncate text-body-4 text-pi-body">
                  <span className="code">{c.docRef}</span>
                  {all && ` · ${companyOf(c.company)?.name ?? c.company}`}
                  {` · asked ${when(c.sentAt)} by ${c.channel.toLowerCase()}`}
                </p>
              </div>
              <span className="inline-flex flex-none items-center gap-1.5 text-body-4 text-pi-body">
                <span
                  aria-hidden
                  className={cn(
                    "size-[7px] rounded-full",
                    STATUS[c.status].dot
                  )}
                />
                {STATUS[c.status].label}
              </span>
            </div>
            {c.reply && c.status !== "closed" && (
              <p className="rounded-md bg-pi-fill px-3 py-2 text-[13px] leading-5 text-pi-ink">
                {c.reply.text}
                <span className="mt-0.5 block text-body-4 text-pi-body">
                  Replied {when(c.reply.at)} · linked to{" "}
                  <span className="code">{c.docRef}</span>
                </span>
              </p>
            )}
            {c.status === "closed" && c.closedReason && (
              <p className="text-body-4 text-pi-faint">
                {c.closedReason}
                {c.closedAt ? ` · ${when(c.closedAt)}` : ""}
              </p>
            )}
            {c.status !== "closed" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={c.status === "received" ? "default" : "outline"}
                  onClick={() => onOpen(c.company, href)}
                >
                  {c.status === "received"
                    ? "Use on document"
                    : "Open document"}
                </Button>
                {c.status === "waiting" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Prototype: play the other side's reply"
                    onClick={() => simulateReply(c.id)}
                  >
                    Simulate reply
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => closeChase(c.id)}
                  >
                    Mark done
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default ChaseList;
