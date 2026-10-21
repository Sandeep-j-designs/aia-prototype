import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "@/components/icons";
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
  const settled = card.items.filter((i) => applies(card, i) && i.settled);
  const submitTab = asked.length;
  const [tab, setTab] = useState(asked.length ? 0 : submitTab);
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
    if (typing) input.current?.focus();
  }, [typing]);
  useEffect(() => {
    onActive?.(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, item?.id, live]);
  // Words from the prompt box answer the open question in your own words.
  useEffect(() => {
    if (!typed || !item?.other) return;
    onChange({
      ...card,
      items: card.items.map((i) =>
        i.id === item.id ? { ...i, pick: OTHER, note: typed.text } : i
      ),
    });
    setTab((t) => Math.min(t + 1, submitTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed?.n]);

  if (!live) return <Answered card={card} />;

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
      return;
    }
    patch(item.id, { pick: row.id, note: undefined });
    setTyping(false);
    next();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (typing && e.target === input.current) {
      if (e.key === "Enter" && item?.note?.trim()) {
        e.preventDefault();
        setTyping(false);
        box.current?.focus();
        next();
      }
      return;
    }
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
    } else if (e.key === "Enter") {
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
      className="overflow-hidden rounded-xl border border-pi-line bg-background shadow-contact"
    >
      <div
        ref={box}
        tabIndex={-1}
        onKeyDown={onKey}
        className="focus-visible:outline-none"
      >
        <header className="flex items-center gap-1 border-b border-pi-line px-2 py-1.5">
          <button
            type="button"
            aria-label="Previous question"
            disabled={tab === 0}
            onClick={() => setTab((t) => Math.max(t - 1, 0))}
            className="grid h-7 w-7 flex-none place-items-center rounded-sm text-pi-body hover:bg-pi-fill disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div
            role="tablist"
            aria-label={card.title}
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none]"
          >
            {asked.map((q, i) => (
              <Tab
                key={q.id}
                active={tab === i}
                done={answered(q)}
                onClick={() => setTab(i)}
              >
                {q.header || `Question ${i + 1}`}
              </Tab>
            ))}
            <Tab
              active={tab === submitTab}
              done={asked.every(answered)}
              onClick={() => setTab(submitTab)}
            >
              Submit
            </Tab>
          </div>
          <button
            type="button"
            aria-label="Next question"
            disabled={tab === submitTab}
            onClick={() => setTab((t) => Math.min(t + 1, submitTab))}
            className="grid h-7 w-7 flex-none place-items-center rounded-sm text-pi-body hover:bg-pi-fill disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </header>

        {item ? (
          <div role="tabpanel" className="px-4 pb-3 pt-3.5">
            <p className="text-[14px] font-semibold leading-5 text-pi-ink">
              {item.question}
            </p>
            {item.why && (
              <p className="mt-1 text-body-4 leading-5 text-pi-body">
                {item.why}
              </p>
            )}
            <ol
              role="listbox"
              aria-label={item.question}
              aria-activedescendant={`neo-q-${item.id}-${cursor}`}
              className="mt-3 flex flex-col gap-0.5"
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
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => choose(i)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md px-2.5 py-2 transition-colors",
                      here ? "bg-pi-fill" : "hover:bg-pi-fill"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-px grid h-5 w-5 flex-none place-items-center rounded-xs text-body-4 font-semibold tabular-nums",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-pi-body ring-1 ring-inset ring-pi-line-2"
                      )}
                    >
                      {on ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-[13.5px] leading-5 text-pi-ink",
                          on && "font-semibold"
                        )}
                      >
                        {r.label}
                        {r.id === item.recommended && (
                          <span className="font-normal text-pi-body">
                            {" "}
                            (Recommended)
                          </span>
                        )}
                      </span>
                      {r.hint && (
                        <span className="block text-body-4 leading-5 text-pi-body">
                          {r.hint}
                        </span>
                      )}
                      {r.id === OTHER && on && (
                        <input
                          ref={input}
                          value={item.note || ""}
                          onChange={(e) =>
                            patch(item.id, { note: e.target.value })
                          }
                          onClick={(e) => e.stopPropagation()}
                          placeholder={
                            item.other?.placeholder || "Type your answer"
                          }
                          aria-label={`${item.question}: your answer`}
                          className="mt-1.5 h-8 w-full rounded-sm border border-pi-line-2 bg-background px-2.5 text-[13px] text-pi-ink placeholder:text-pi-faint focus:border-primary focus-visible:outline-none"
                        />
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <Review card={card} asked={asked} settled={settled} onTab={setTab} />
        )}

        <p className="border-t border-pi-line px-4 py-2 text-body-4 text-pi-faint">
          {item
            ? "Enter to select · ↑↓ to move · ← → between questions"
            : asked.every(answered)
              ? "Check the answers, then submit"
              : "Answer the questions marked with a dot to submit"}
        </p>
      </div>
      {!item && footer && (
        <footer className="border-t border-pi-line bg-pi-head-bg px-4 py-3">
          {footer}
        </footer>
      )}
    </section>
  );
};

/** A question's answers, then "Something else" when it takes words. */
const rowsOf = (item: NeoDecisionItem) => [
  ...item.options,
  ...(item.other
    ? [
        {
          id: OTHER,
          label: "Something else",
          hint: "Say it in your own words",
        },
      ]
    : []),
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
      "flex h-7 flex-none items-center gap-1.5 whitespace-nowrap rounded-sm px-2 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
      active
        ? "bg-pi-fill font-semibold text-pi-ink"
        : "text-pi-body hover:bg-pi-fill hover:text-pi-ink"
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
  <div role="tabpanel" className="px-4 pb-3 pt-3.5">
    <p className="text-[14px] font-semibold leading-5 text-pi-ink">
      {card.title}
    </p>
    {asked.length > 0 && (
      <ul className="mt-2.5 flex flex-col">
        {asked.map((q, i) => (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onTab(i)}
              className="flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {answered(q) ? (
                <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-pi-success" />
              ) : (
                <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-pi-warning-dot" />
              )}
              <span className="min-w-0 text-[13px] leading-5">
                <span className="block text-pi-body">{q.question}</span>
                <span
                  className={cn(
                    "block font-medium",
                    answered(q) ? "text-pi-ink" : "text-pi-warning"
                  )}
                >
                  → {labelOf(q)}
                  {!!q.recommended && q.pick === q.recommended && (
                    <span className="font-normal text-pi-body">
                      {" "}
                      (Recommended)
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
    {settled.length > 0 && (
      <div className="mt-2.5 border-t border-pi-line pt-2.5">
        <p className="px-2 text-body-4 font-semibold text-pi-ink-2">
          Settled from your records
        </p>
        <ul className="mt-1 flex flex-col">
          {settled.map((q) => (
            <li
              key={q.id}
              className="flex items-start gap-2.5 px-2 py-1 text-[13px] leading-5"
            >
              <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-pi-success" />
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

/** After it's submitted: each question and its answer, as the chat's record. */
const Answered = ({ card }: { card: Card }) => {
  const items = card.items.filter((i) => applies(card, i));
  return (
    <section
      aria-label={card.title}
      className="rounded-xl border border-pi-line px-4 py-3"
    >
      <p className="text-body-4 font-semibold text-pi-ink-2">{card.title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {items.map((i) => (
          <li
            key={i.id}
            className="flex items-start gap-2 text-[13px] leading-5"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-pi-success" />
            <span className="min-w-0">
              <span className="text-pi-body">{i.question} </span>
              <span className="font-medium text-pi-ink">{labelOf(i)}</span>
              {i.settled && (
                <span className="text-body-4 text-pi-body">
                  {" "}
                  · settled: {i.settled}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default DecisionsCard;
