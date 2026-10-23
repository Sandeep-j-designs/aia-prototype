import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
} from "@/components/icons";
import type { NeoCard, NeoDecisionItem } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { answered, applies, OTHER } from "@/utils/pages/neo/decisions";

type Card = Extract<NeoCard, { kind: "decisions" }>;

type Props = {
  card: Card;
  /** Answerable: the run is waiting on these questions. */
  live: boolean;
  onChange: (card: Card) => void;
  /** The sign-off: what it risks and its buttons, on the Submit tab. */
  footer?: React.ReactNode;
  /**
   * Words sent from the prompt box under the card: the open question's
   * "Something else" (`n` counts sends, so the same words twice still land).
   */
  typed?: { text: string; n: number };
  /** Which question is open, so the prompt box can say what typing does. */
  onActive?: (item?: NeoDecisionItem) => void;
  /** Where the run is in the reconciliation journey, for the header. */
  stage?: { n: number; of: number };
};

/**
 * Neo's questions, asked the way Claude asks them (20 Oct 2026): one
 * question at a time in a card, a tab per question across the top with a
 * tick once answered, numbered answers with the recommended one first, and
 * a last Submit tab to review everything before the run goes on.
 *
 * Keys: 1–9 or ↑↓ and Enter pick and move on; ← → change question. A pick
 * Neo recommends is already filled in, so Submit can come straight away;
 * a question with no recommendation waits for an answer. "Something else"
 * takes your own words. What the records settle isn't asked: it's listed
 * on the Submit tab.
 */
const DecisionsCard = ({
  card,
  live,
  onChange,
  footer,
  typed,
  onActive,
}: Props) => {
  const asked = card.items.filter((i) => applies(card, i) && !i.settled);
  const submitTab = Math.max(0, asked.length - 1);
  const [tab, setTab] = useState(0);
  const item = asked[tab] as NeoDecisionItem | undefined;
  const rows = item ? rowsOf(item) : [];
  const [cursor, setCursor] = useState(0);
  const [typing, setTyping] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Each question opens with the cursor on its answer, or the first row.
  useEffect(() => {
    if (!item) return;
    const at = rows.findIndex((r) => r.id === item.pick);
    setCursor(at < 0 ? 0 : at);
    setTyping(item.pick === OTHER);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);
  useEffect(() => {
    if (live) box.current?.focus({ preventScroll: true });
  }, [live]);
  useEffect(() => {
    if (typing) input.current?.focus({ preventScroll: true });
  }, [typing]);
  useEffect(() => {
    onActive?.(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, item?.id, live]);
  // Words from the prompt box answer the open question in your own words.
  useEffect(() => {
    if (!typed || !item) return;
    onChange({
      ...card,
      items: card.items.map((i) =>
        i.id === item.id ? { ...i, pick: OTHER, note: typed.text } : i
      ),
    });
    setTab((t) => Math.min(t + 1, submitTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed?.n]);

  if (!live) return null;

  const patch = (id: string, p: Partial<NeoDecisionItem>) =>
    onChange({
      ...card,
      items: card.items.map((i) => (i.id === id ? { ...i, ...p } : i)),
    });
  const next = () => setTab((t) => Math.min(t + 1, submitTab));
  const choose = (i: number) => {
    if (!item) return;
    const row = rows[i];
    setCursor(i);
    if (row.id === OTHER) {
      patch(item.id, { pick: OTHER });
      setTyping(true);
      input.current?.focus({ preventScroll: true });
      return;
    }
    patch(item.id, { pick: row.id });
    setTyping(false);
    box.current?.focus({ preventScroll: true });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target === input.current) {
      if (e.key === "Enter" && item?.note?.trim()) {
        e.preventDefault();
        setTyping(false);
        box.current?.focus({ preventScroll: true });
        next();
      }
      return;
    }
    // Native buttons keep their own Enter/Space activation.
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setTab((t) => Math.min(t + 1, submitTab));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setTab((t) => Math.max(t - 1, 0));
    } else if (!item) {
      return;
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(cursor);
    } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= rows.length) {
      e.preventDefault();
      choose(Number(e.key) - 1);
    }
  };

  return (
    <section
      aria-label={card.title}
      data-guide-id="neo-sheet"
      className="neo-decision overflow-hidden"
    >
      <div
        ref={box}
        tabIndex={-1}
        onKeyDown={onKey}
        className="focus-visible:outline-none"
      >
        <header className="flex items-center gap-3 bg-pi-brand-tint/40 px-5 py-4 max-sm:px-4">
          <div className="min-w-0 flex-1">
            <h2
              title={item?.why}
              className="text-[15px] font-semibold leading-[22px] tracking-[-0.005em] text-pi-ink"
            >
              {item?.question || card.title}
            </h2>
          </div>
          {asked.length > 1 && (
            <div className="flex flex-none items-center gap-0.5 text-pi-faint">
              <button
                type="button"
                aria-label="Previous question"
                disabled={tab === 0}
                onClick={() => setTab((t) => Math.max(0, t - 1))}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pi-fill hover:text-pi-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[58px] text-center text-[13px] tabular-nums text-pi-body">
                {tab + 1} of {submitTab + 1}
              </span>
              <button
                type="button"
                aria-label="Next question"
                disabled={tab === submitTab}
                onClick={() => setTab((t) => Math.min(submitTab, t + 1))}
                className="grid h-8 w-8 place-items-center rounded-lg hover:bg-pi-fill hover:text-pi-ink disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </header>
        {asked.length > 1 && (
          <div
            className="flex gap-1 bg-pi-brand-tint/40 px-5 pb-3"
            aria-label="Question navigation"
          >
            {asked.map((question, index) => (
              <button
                key={question.id}
                type="button"
                aria-label={`Question ${index + 1}: ${question.question}`}
                aria-current={index === tab ? "step" : undefined}
                onClick={() => setTab(index)}
                className="group flex h-5 min-w-0 flex-1 items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <span
                  className={cn(
                    "h-1 w-full rounded-full transition-colors duration-200",
                    index === tab
                      ? "bg-pi-brand"
                      : answered(question)
                        ? "bg-pi-brand/30 group-hover:bg-pi-brand/50"
                        : "bg-pi-line-2"
                  )}
                />
              </button>
            ))}
          </div>
        )}

        {item ? (
          <div
            key={item.id}
            role="tabpanel"
            className="neo-question-enter rounded-t-[16px] border-t border-pi-line bg-background p-2.5"
          >
            {item.why && (
              <p className="px-3 pb-3 pt-2 text-[12px] leading-[18px] text-pi-body">
                {item.why}
              </p>
            )}
            <ol
              role="listbox"
              tabIndex={0}
              onFocus={() =>
                setCursor(
                  Math.max(
                    0,
                    rows.findIndex((r) => r.id === item.pick)
                  )
                )
              }
              aria-label={item.question}
              aria-activedescendant={`neo-q-${item.id}-${cursor}`}
              className="flex flex-col gap-1 rounded-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pi-brand-border"
            >
              {rows.map((r, i) => {
                const on = item.pick === r.id;
                const here = cursor === i;
                return (
                  <li
                    key={r.id}
                    id={`neo-q-${item.id}-${i}`}
                    role="option"
                    aria-selected={on}
                    onClick={() => choose(i)}
                    className={cn(
                      "neo-answer-option flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 motion-reduce:transition-none",
                      on
                        ? "bg-pi-brand-tint"
                        : here
                          ? "bg-pi-fill/50"
                          : "hover:bg-pi-fill/50"
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 flex-none place-items-center rounded-full border text-[12px] font-normal tabular-nums transition-colors duration-200",
                        on
                          ? "border-pi-brand bg-pi-brand text-white"
                          : "border-pi-line-2 bg-background text-pi-body"
                      )}
                    >
                      {on ? (
                        <Check
                          className="neo-choice-check h-3.5 w-3.5"
                          aria-hidden
                        />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[13.5px] font-medium leading-5 text-pi-ink",
                          r.id === OTHER && !on && "text-pi-faint"
                        )}
                      >
                        {r.label}
                        {r.id === item.recommended && (
                          <span className="ml-2 inline-flex items-center text-[11px] font-normal text-pi-faint">
                            Recommended
                          </span>
                        )}
                      </span>
                      {r.hint && (
                        <span className="mt-0.5 block text-[12px] leading-[18px] text-pi-body">
                          {r.hint}
                        </span>
                      )}
                      {r.id === OTHER && (
                        <div
                          className={cn(
                            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                            on
                              ? "grid-rows-[1fr] opacity-100"
                              : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="min-h-0 overflow-hidden">
                            <input
                              ref={input}
                              disabled={!on}
                              tabIndex={on ? 0 : -1}
                              value={item.note || ""}
                              onChange={(e) =>
                                patch(item.id, { note: e.target.value })
                              }
                              onClick={(e) => e.stopPropagation()}
                              placeholder={
                                item.other?.placeholder || "Type your answer"
                              }
                              aria-label={`${item.question}: your answer`}
                              className="mt-2 h-10 w-full rounded-lg border border-pi-line-2 bg-background px-3 text-[13px] text-pi-ink placeholder:text-pi-faint focus:border-primary focus-visible:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </div>
      {tab === submitTab && footer && (
        <footer className="neo-question-enter border-t border-pi-line bg-background px-5 pb-5 pt-3">
          {footer}
        </footer>
      )}
      {tab < submitTab && (
        <footer className="flex justify-end gap-3 bg-background px-5 pb-5 pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              box.current?.dispatchEvent(
                new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
              )
            }
            className="h-9 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!item || !answered(item)}
            onClick={next}
            className="h-9 px-4"
          >
            Continue
          </Button>
        </footer>
      )}
    </section>
  );
};

/** A question's answers, then "Something else" when it takes words. */
const rowsOf = (item: NeoDecisionItem) => [
  ...item.options,
  {
    id: OTHER,
    label: "Something else",
    hint: "",
  },
];

const labelOf = (item: NeoDecisionItem) =>
  item.pick === OTHER
    ? `“${item.note?.trim() || "…"}”`
    : item.options.find((o) => o.id === item.pick)?.label || "Not answered";

const Tab = ({
  active,
  done,
  onClick,
  children,
}: {
  active: boolean;
  done: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={active}
    onClick={onClick}
    className={cn(
      "flex h-7 flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[12px] font-medium transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
      active
        ? "bg-pi-brand-tint text-pi-brand shadow-contact ring-1 ring-inset ring-pi-brand-border"
        : "text-pi-body hover:text-pi-ink"
    )}
  >
    {done ? (
      <Check className="h-3 w-3 flex-none text-pi-success" />
    ) : (
      <span className="h-1.5 w-1.5 flex-none rounded-full bg-pi-warning-dot" />
    )}
    {children}
  </button>
);

/** The Submit tab: every answer, what the records settle, then the sign-off. */
const Review = ({
  card,
  asked,
  settled,
  onTab,
}: {
  card: Card;
  asked: NeoDecisionItem[];
  settled: NeoDecisionItem[];
  onTab: (i: number) => void;
}) => (
  <div role="tabpanel" className="neo-sheet-panel px-6 pb-5 max-sm:px-4">
    {asked.length > 0 && (
      <ul className="flex flex-col gap-2">
        {asked.map((q, i) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onTab(i)}
              className="group flex min-h-[60px] w-full items-center gap-3 rounded-xl border border-pi-brand-border bg-pi-brand-tint px-3.5 py-3 text-left transition-colors hover:border-pi-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border"
            >
              {answered(q) ? (
                <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-pi-warning-bg">
                  <span className="h-2 w-2 rounded-full bg-pi-warning-dot" />
                </span>
              )}
              <span className="min-w-0 flex-1 text-[13px] leading-5">
                <span className="block text-[12px] text-pi-body">
                  {q.question}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block font-semibold",
                    answered(q) ? "text-pi-ink" : "text-pi-warning"
                  )}
                >
                  {labelOf(q)}
                </span>
              </span>
              <span className="pr-1 text-[12px] font-medium text-pi-brand">
                Edit
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
    {settled.length > 0 && (
      <div className="mt-5 border-t border-pi-line pt-4">
        <p className="pb-2 text-[12px] font-medium text-pi-body">
          From your records
        </p>
        <ul className="flex flex-col">
          {settled.map((q) => (
            <li
              key={q.id}
              className="flex items-start gap-2.5 py-1.5 text-[12px] leading-5"
            >
              <Check className="mt-1 h-3 w-3 flex-none text-pi-faint" />
              <span className="min-w-0">
                <span className="text-pi-ink">{labelOf(q)}</span>
                <span className="text-pi-body"> · {q.settled}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/**
 * After it's submitted, the sheet reads back as the person's reply (22 Oct
 * 2026): the answers they gave, in order, each under the question it
 * answers, so the bubble reads on its own without matching it to a list on
 * Neo's side. What the records settled isn't theirs, so it stays out.
 */
export const replyOf = (card: Card) => {
  const items = card.items.filter((i) => applies(card, i) && !i.settled);
  return {
    // Kept for replies that skip the picks ("Not now"): the questions read
    // back on Neo's side so the bare reply under them answers something.
    asked:
      items.length === 1
        ? items[0].question
        : items.map((i, n) => `${n + 1}. ${i.question}`).join("\n"),
    pairs: items.map((i) => ({ question: i.question, answer: labelOf(i) })),
    text: items.map(labelOf).join(", "),
    title: undefined,
  };
};

export default DecisionsCard;
