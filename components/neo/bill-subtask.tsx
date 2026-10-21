import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { configure, useStore } from "@/components/inbox/v2/store";
import { useBatches } from "@/hooks/pages/neo/use-batches";
import { useInboxSources } from "@/hooks/pages/inbox/use-inbox-sources";
import { useRecon } from "@/hooks/pages/neo/use-recon";
import {
  toggleBillCheck,
  useBillChecks,
} from "@/hooks/pages/neo/use-bill-checks";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import {
  billReview,
  collectedReview,
  reconReview,
  waiting,
} from "@/utils/pages/neo/bill-checks";
import { cn } from "@/lib/utils";

/**
 * A bill as a subtask of the chat that handed it over for review (20 Oct
 * 2026): a voucher-entry batch's draft, or a bill Document collection
 * prepared (utils/pages/neo/review-sets.ts).
 *
 * On such a bill, the dock is about that bill: a breadcrumb up to
 * the chat, the bill's checklist (what Neo did and what it wants you to look
 * at), then only the questions asked about this bill. Moving between bills
 * and approving stay on the form. Neo prepares, you approve.
 */

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** The bill on screen, the set it came in, and the set as the queue. */
export const useSubtask = () => {
  const neo = useNeo();
  const router = useRouter();
  const state = useStore();
  const { batches } = useBatches();
  const sources = useInboxSources();
  const recon = useRecon();
  const set = neo.subtask?.set;
  const batch = set?.batchId
    ? batches.find((b) => b.id === set.batchId)
    : undefined;
  const item =
    neo.subtask && state.items.find((x) => x.id === neo.subtask!.itemId);
  const queue = useMemo(
    () =>
      (set?.ids || [])
        .map((id) => state.items.find((x) => x.id === id))
        .filter((x): x is NonNullable<typeof x> => !!x),
    [set, state.items]
  );
  if (!set || !item || (set.kind === "batch" && !batch)) return null;
  const index = queue.findIndex((x) => x.id === item.id);
  const chat = neo.chats.find((c) => c.id === neo.chatId);
  // The next bill still waiting, after this one, then from the top.
  const after = [
    ...queue.slice(index + 1),
    ...queue.slice(0, Math.max(index, 0)),
  ];
  const next = after.find(waiting);
  const open = (id: string) => {
    configure({ queue: set.ids, queueFrom: `inbox:${set.name}` });
    void router.push(`/inbox?id=${encodeURIComponent(id)}`);
  };
  const run =
    set.kind === "recon"
      ? recon.runs.find((r) => r.id === set.runId)
      : undefined;
  const review = batch
    ? billReview(batch, item)
    : run
      ? reconReview(run, item)
      : collectedReview(
          item,
          [...sources.receipts]
            .reverse()
            .find((r) => r.itemId === item.id && r.company === item.company)
        );
  return {
    set,
    item,
    queue,
    index,
    next,
    open,
    review,
    chatTitle: chat?.title || "Chat",
    billNo: item.form.invoiceNo || item.file.name,
  };
};

/** The dock's title on a bill: up to the chat, then the bill. */
export const SubtaskTitle = () => {
  const neo = useNeo();
  const s = useSubtask();
  if (!s) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 items-center text-[14px]"
    >
      <button
        type="button"
        onClick={() => neo.setDockView("chat")}
        title={`Back to ${s.chatTitle}`}
        className="flex h-8 min-w-0 items-center gap-1 rounded-md px-1.5 text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <ChevronLeft className="h-4 w-4 flex-none" />
        <span className="truncate">{s.chatTitle}</span>
      </button>
      <span aria-hidden className="px-1 text-pi-faint">
        /
      </span>
      <span
        aria-current="page"
        className="code flex-none truncate font-semibold text-pi-ink"
      >
        {s.billNo}
      </span>
    </nav>
  );
};

/** On a subtask bill with the chat showing: the way back down to the bill. */
export const BackToBill = () => {
  const neo = useNeo();
  const s = useSubtask();
  if (!s) return null;
  return (
    <button
      type="button"
      onClick={() => neo.setDockView("bill")}
      className="flex flex-none items-center gap-2 border-b border-pi-line bg-pi-brand-tint px-4 py-2 text-left text-[13px] leading-5 text-pi-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border"
    >
      <span className="min-w-0 flex-1 truncate">
        You're on <span className="code font-semibold">{s.billNo}</span>
      </span>
      <span className="flex flex-none items-center gap-0.5 font-medium">
        Back to its checks
        <ChevronRight className="h-3.5 w-3.5" />
      </span>
    </button>
  );
};

/**
 * The bill's checklist, at the top of its subtask. "Needs you" are the calls
 * Neo made on this bill; ticking one is the accountant's note that they
 * looked. "Matched" is what came off the bill or followed a rule.
 */
export const BillChecks = () => {
  const neo = useNeo();
  const s = useSubtask();
  const ticks = useBillChecks();
  const [showFine, setShowFine] = useState(false);
  const review = s?.review;
  if (!s || !review) return null;
  const ticked = ticks[s.item.id] || [];
  const left = review.needs.filter((c) => !ticked.includes(c.id)).length;
  const done = !waiting(s.item);

  return (
    <section
      aria-label={`Checks for ${s.billNo}`}
      className="flex flex-col gap-4"
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-6 text-pi-ink">
            {s.item.form.party}
          </p>
          <p className="code truncate text-body-4 text-pi-body">
            {s.item.form.voucherNo} · {s.billNo}
          </p>
        </div>
        <div className="flex-none text-right">
          <p className="text-[15px] font-semibold leading-6 tabular-nums text-pi-ink">
            {inr(s.item.amount)}
          </p>
          <p
            className={cn(
              "text-body-4",
              done ? "text-pi-success" : "text-pi-body"
            )}
          >
            {s.item.status}
          </p>
        </div>
      </header>

      <div className="rounded-lg border border-pi-line">
        <p className="flex items-center justify-between border-b border-pi-line px-3 py-2 text-body-4 font-semibold text-pi-ink">
          Needs you
          <span className="font-normal text-pi-body">
            {review.needs.length
              ? left
                ? `${left} of ${review.needs.length} to look at`
                : "All looked at"
              : "None from Neo"}
          </span>
        </p>
        {review.needs.length ? (
          <ul>
            {review.needs.map((c) => {
              const on = ticked.includes(c.id);
              return (
                <li
                  key={c.id}
                  className="border-t border-pi-line first:border-t-0"
                >
                  <label className="flex cursor-pointer gap-3 px-3 py-2.5 hover:bg-pi-row-hover">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={done}
                      onChange={() => toggleBillCheck(s.item.id, c.id)}
                      className="mt-0.5 h-4 w-4 flex-none accent-[hsl(var(--primary))]"
                    />
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-[13px] font-medium leading-5",
                          on ? "text-pi-body" : "text-pi-ink"
                        )}
                      >
                        {c.title}
                      </span>
                      {c.detail && (
                        <span className="block text-body-4 text-pi-body">
                          {c.detail}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 py-2.5 text-[13px] leading-5 text-pi-body">
            Neo made no calls of its own here.
          </p>
        )}
        <button
          type="button"
          aria-expanded={showFine}
          onClick={() => setShowFine((v) => !v)}
          className="flex w-full items-center gap-1.5 border-t border-pi-line px-3 py-2 text-left text-body-4 text-pi-body hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border"
        >
          <Check className="h-3.5 w-3.5 text-pi-success" />
          <span className="flex-1">
            {review.fine.length}{" "}
            {s.set.kind === "batch"
              ? "matched the bill or your instruction"
              : s.set.kind === "recon"
                ? "rules passed"
                : "read off the bill as it came in"}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showFine && "rotate-180"
            )}
          />
        </button>
        {showFine && (
          <ul className="border-t border-pi-line px-3 py-2">
            {review.fine.map((c) => (
              <li key={c.id} className="py-1 text-body-4 text-pi-body">
                <span className="text-pi-ink">{c.title}</span>
                {c.detail && <span> · {c.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {done ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] leading-5 text-pi-body">
            {s.next
              ? `${s.item.status}. ${s.queue.filter(waiting).length} left in ${s.set.name}.`
              : `${s.item.status}. Every bill in ${s.set.name} is done.`}
          </p>
          {!s.next && (
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() => neo.setDockView("chat")}
            >
              Back to {s.chatTitle}
            </Button>
          )}
        </div>
      ) : (
        <p className="text-body-4 text-pi-faint">
          The form checks its own required fields when you approve.
        </p>
      )}
    </section>
  );
};
