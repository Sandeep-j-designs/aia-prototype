import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowDown,
  ChevronRight,
  MessageSquareText,
  NeoStar,
} from "@/components/icons";
import { getState } from "@/components/inbox/v2/store";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import type { NeoRuntime } from "@/hooks/pages/neo/use-neo-runtime";
import type { NeoMessage, NeoRef } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { opensInCanvas, sameDoc } from "@/utils/pages/neo/canvas";
import Message, { DocStrip } from "./message";
import TurnActions from "./turn-actions";
import UserMessage from "./user-message";

/** The message the running task is waiting on, if any. */
export const useLiveMessage = (neo: NeoRuntime) =>
  useMemo(() => {
    if (!neo.busy) return undefined;
    return [...neo.messages]
      .reverse()
      .find(
        (m) =>
          m.runId === neo.busy &&
          ((m.ask && !m.ask.answer) || (m.actions?.length && !m.chosen))
      );
  }, [neo.busy, neo.messages]);

/** ↑ in an empty prompt box asks the thread to edit the last request. */
export const EDIT_LAST_EVENT = "neo:edit-last";

type Turn = { user?: NeoMessage; neo: NeoMessage[] };

/** A message that is only a document to open: no words, steps or buttons. */
const docOnly = (m: NeoMessage) =>
  !!m.card &&
  opensInCanvas(m.card) &&
  !m.text &&
  !m.steps &&
  !m.ask &&
  !m.actions?.length &&
  !m.links?.length &&
  !m.suggestions?.length;

/** Two or more documents in a row become one strip; the rest stay as they are. */
const segments = (ms: NeoMessage[]) => {
  const out: (NeoMessage | NeoMessage[])[] = [];
  for (const m of ms) {
    const last = out[out.length - 1];
    if (docOnly(m) && Array.isArray(last)) last.push(m);
    else if (docOnly(m)) out.push([m]);
    else out.push(m);
  }
  return out.map((x) => (Array.isArray(x) && x.length === 1 ? x[0] : x));
};

const turnsOf = (messages: NeoMessage[]) =>
  messages.reduce<Turn[]>((ts, m) => {
    if (m.role === "user") ts.push({ user: m, neo: [] });
    else if (ts.length) ts[ts.length - 1].neo.push(m);
    else ts.push({ neo: [m] });
    return ts;
  }, []);

/** Every record an answer rests on, once each. Links to screens aren't. */
const sourcesOf = (messages: NeoMessage[]): NeoRef[] => {
  const out = new Map<string, NeoRef>();
  const add = (r?: NeoRef) => {
    if (!r?.itemId) return;
    const key = r.itemId;
    if (!out.has(key)) out.set(key, { ...r, target: r.target || "open" });
  };
  messages.forEach((m) => {
    m.steps?.forEach((s) => add(s.cite));
    m.links?.forEach(add);
    const c = m.card;
    if (!c) return;
    if (c.kind === "list")
      c.groups.forEach((g) =>
        g.rows.forEach((r) => add({ label: r.primary, itemId: r.itemId }))
      );
    if (c.kind === "voucher") {
      add(c.source);
      c.evidence?.forEach(add);
    }
    if (c.kind === "diff")
      c.rows.forEach((r) => add({ label: r.party, itemId: r.itemId }));
    if (c.kind === "changeset")
      c.rows.forEach((r) => add({ label: r.label, itemId: r.itemId }));
  });
  return [...out.values()];
};

/** Neo's star, breathing while it works — the chat apps' "still here". */
export const NeoGlyph = ({ working }: { working?: boolean }) => (
  <NeoStar
    aria-hidden
    className={cn(
      "h-5 w-5 flex-none text-pi-brand",
      working && "neo-breathe motion-reduce:animate-none"
    )}
  />
);

type Props = {
  variant: "page" | "panel";
  onPrompt: (text: string) => void;
  /**
   * A bill's subtask: only the turns asked from that bill, under `header`
   * (its checklist). Without it the chat shows its own turns, and each
   * bill's subtask folds to one line where it was first asked.
   */
  scope?: string | null;
  header?: React.ReactNode;
  /** Opens a folded subtask: the bill, with its own view in the dock. */
  onOpenScope?: (itemId: string) => void;
};

/** One folded subtask in the chat: the bill and how much was said there. */
const SubtaskLine = ({
  label,
  asks,
  onOpen,
}: {
  label: string;
  asks: number;
  onOpen?: () => void;
}) => (
  <button
    type="button"
    onClick={onOpen}
    className="group flex w-full items-center gap-2 rounded-md border border-pi-line px-3 py-2 text-left text-[13px] leading-5 text-pi-body transition-colors hover:border-pi-line-2 hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
  >
    <MessageSquareText className="h-3.5 w-3.5 flex-none text-pi-faint" />
    <span className="min-w-0 flex-1 truncate">
      On <span className="font-medium text-pi-ink">{label}</span> · {asks}{" "}
      {asks === 1 ? "question" : "questions"}
    </span>
    <ChevronRight className="h-3.5 w-3.5 flex-none text-pi-faint transition-transform group-hover:translate-x-0.5" />
  </button>
);

/**
 * The conversation, as turns: the request, then everything Neo did and said
 * in reply, then one row of actions under the answer. Shared by Neo's page
 * and the docked panel, which differ only in measure.
 *
 * Scrolling follows the chat apps: a new request moves to the top of the
 * view and the answer arrives below it, rather than the view chasing the
 * bottom line by line. Scrolled away, "Jump to latest" brings you back.
 */
const Thread = ({ variant, onPrompt, scope, header, onOpenScope }: Props) => {
  const neo = useNeo();
  const live = useLiveMessage(neo);
  const page = variant === "page";
  const { scopeOf } = neo;
  // The turns this view shows; in the chat, each subtask's first turn
  // stands in for all of its turns, folded.
  const { visible, folds } = useMemo(() => {
    const folds = new Map<string, { scope: string; asks: number }>();
    if (scope)
      return {
        visible: neo.messages.filter((m) => scopeOf(m) === scope),
        folds,
      };
    const seen = new Map<string, { scope: string; asks: number }>();
    const visible = neo.messages.filter((m) => {
      const s = scopeOf(m);
      if (!s) return true;
      if (m.role !== "user") return false;
      const fold = seen.get(s);
      if (fold) {
        fold.asks += 1;
        return false;
      }
      const f = { scope: s, asks: 1 };
      seen.set(s, f);
      folds.set(m.id, f);
      return true;
    });
    return { visible, folds };
  }, [neo.messages, scope, scopeOf]);
  const turns = useMemo(() => turnsOf(visible), [visible]);
  const [editing, setEditing] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [below, setBelow] = useState(false);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const measure = () => {
    const el = scroller.current;
    if (el) setBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 48);
  };
  useEffect(measure, [visible, height]);

  // A chat opened from the list starts at its end.
  const chat = useRef(neo.chatId);
  useLayoutEffect(() => {
    if (chat.current === neo.chatId) return;
    chat.current = neo.chatId;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [neo.chatId, neo.messages]);

  // A new (or edited) request goes to the top of the view.
  const lastUser = [...visible]
    .reverse()
    .find((m) => m.role === "user" && !folds.has(m.id));
  const anchor = `${neo.chatId}:${lastUser?.id}:${lastUser?.version ?? 0}`;
  const anchored = useRef(anchor);
  useEffect(() => {
    if (anchored.current === anchor) return;
    const sameChat = anchored.current.split(":")[0] === neo.chatId;
    anchored.current = anchor;
    if (!sameChat || !lastUser) return;
    const el = scroller.current;
    const target = el?.querySelector<HTMLElement>(
      `[data-turn="${CSS.escape(lastUser.id)}"]`
    );
    if (!el || !target) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    el.scrollTo({
      top: target.offsetTop - (page ? 24 : 16),
      behavior: reduce ? "auto" : "smooth",
    });
  }, [anchor, lastUser, neo.chatId, page]);

  useEffect(() => {
    const onEditLast = () => {
      if (!neo.busy && lastUser) setEditing(lastUser.id);
    };
    window.addEventListener(EDIT_LAST_EVENT, onEditLast);
    return () => window.removeEventListener(EDIT_LAST_EVENT, onEditLast);
  }, [neo.busy, lastUser]);

  return (
    <TooltipProvider delayDuration={500}>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          onScroll={measure}
          className="h-full overflow-y-auto overscroll-contain [overflow-wrap:anywhere]"
        >
          <div
            className={cn(
              "mx-auto flex flex-col",
              page
                ? "max-w-[760px] gap-8 px-4 py-6 sm:px-6 sm:py-8"
                : "gap-8 px-5 py-5"
            )}
          >
            {header}
            {turns.map((t, i) => {
              const fold = t.user && folds.get(t.user.id);
              if (fold) {
                const bill = getState().items.find((x) => x.id === fold.scope);
                return (
                  <SubtaskLine
                    key={t.user!.id}
                    label={bill?.form.invoiceNo || bill?.file.name || "a bill"}
                    asks={fold.asks}
                    onOpen={onOpenScope && (() => onOpenScope(fold.scope))}
                  />
                );
              }
              const last = i === turns.length - 1;
              const running = last && !!neo.busy;
              const rated =
                [...t.neo].reverse().find((m) => m.text) ||
                t.neo[t.neo.length - 1];
              const streaming = t.neo.some((m) => m.streaming);
              const stepping = t.neo.some((m) =>
                m.steps?.some((s) => s.status === "running")
              );
              const waiting = running && !!live && t.neo.includes(live);
              const status = waiting
                ? "Waiting for you"
                : neo.paused
                  ? "Paused"
                  : neo.liveStatus?.text || "Thinking";
              return (
                <section
                  key={t.user?.id || `turn-${i}`}
                  data-turn={t.user?.id}
                  aria-label={t.user ? "Request and answer" : "Neo"}
                  className={cn(
                    "group/turn flex flex-col",
                    page ? "gap-6" : "gap-5",
                    "duration-300 animate-in fade-in-0 slide-in-from-bottom-2 motion-reduce:animate-none"
                  )}
                  // The last turn holds the view's height, so a new request
                  // can sit at the top with its answer arriving beneath.
                  style={
                    last && t.user && height
                      ? { minHeight: height - (page ? 64 : 40) }
                      : undefined
                  }
                >
                  {t.user && (
                    <UserMessage
                      message={t.user}
                      busy={!!neo.busy}
                      editing={editing === t.user.id}
                      onEditing={(on) => setEditing(on ? t.user!.id : null)}
                      onEdit={(text) => {
                        setEditing(null);
                        neo.edit(t.user!.id, text);
                      }}
                      onVersion={(n) => neo.switchVersion(t.user!.id, n)}
                    />
                  )}
                  {segments(t.neo).map((seg) =>
                    Array.isArray(seg) ? (
                      <DocStrip
                        key={seg[0].id}
                        messages={seg}
                        isOpen={(m) => sameDoc(neo.messages, neo.canvas, m)}
                        onOpen={(m) =>
                          neo.setCanvas(
                            sameDoc(neo.messages, neo.canvas, m) ? null : m.id
                          )
                        }
                      />
                    ) : (
                      ((m) => (
                        <Message
                          key={m.id}
                          message={m}
                          live={live?.id === m.id}
                          running={!!m.runId && m.runId === neo.busy}
                          paused={neo.paused}
                          onAnswer={(v) => neo.answer(m.id, v)}
                          onEditCard={(card) => neo.editCard(m.id, card)}
                          onRef={neo.goTo}
                          onPrompt={onPrompt}
                          onPause={neo.pause}
                          onResume={neo.resume}
                          onStop={neo.stop}
                          onOpenCanvas={() =>
                            neo.setCanvas(
                              sameDoc(neo.messages, neo.canvas, m) ? null : m.id
                            )
                          }
                          inCanvas={sameDoc(neo.messages, neo.canvas, m)}
                          onContinue={
                            m.stopped && last && !neo.busy
                              ? () => neo.continueRun(m.id)
                              : undefined
                          }
                          onRetry={
                            m.stopped && last && !neo.busy && t.user
                              ? () => neo.retry(t.user!.id)
                              : undefined
                          }
                          continueBlocked={
                            !m.stopped
                              ? undefined
                              : m.stopped.touched
                                ? "Continue would repeat changes already made. Start over asks again from the top."
                                : m.stopped.company !== neo.context.company
                                  ? "Switch back to the run's company to continue."
                                  : undefined
                          }
                        />
                      ))(seg)
                    )
                  )}
                  {running ? (
                    !streaming && !stepping ? (
                      <div
                        className="flex h-7 items-center gap-2.5 text-[13px] text-pi-body"
                        aria-live="polite"
                      >
                        <NeoGlyph working={!neo.paused && !waiting} />
                        <span
                          className={cn(
                            !waiting && !neo.paused && "neo-shimmer"
                          )}
                        >
                          {status}
                        </span>
                      </div>
                    ) : (
                      <NeoGlyph working />
                    )
                  ) : (
                    t.neo.length > 0 &&
                    !t.neo[t.neo.length - 1].stopped && (
                      <div
                        className={cn(
                          "-ml-1.5 flex items-center gap-1 transition-opacity duration-150",
                          last
                            ? "opacity-100"
                            : "opacity-0 focus-within:opacity-100 group-hover/turn:opacity-100"
                        )}
                      >
                        {last && (
                          <span className="grid h-7 w-7 place-items-center">
                            <NeoGlyph />
                          </span>
                        )}
                        <TurnActions
                          messages={t.neo}
                          rated={rated}
                          sources={sourcesOf(t.neo)}
                          canRetry={!!t.user && !neo.busy}
                          onRetry={() => t.user && neo.retry(t.user.id)}
                          onRate={(v, note) =>
                            rated && neo.rate(rated.id, v, note)
                          }
                          onRef={neo.goTo}
                          onUndo={(() => {
                            // Undo sits on the answer that made the change,
                            // until it is approved or undone.
                            const run = neo.runs.find(
                              (r) =>
                                r.undoable &&
                                t.neo.some((m) => m.runId === r.id)
                            );
                            return run && !neo.busy
                              ? () => neo.undo(run.id)
                              : undefined;
                          })()}
                        />
                      </div>
                    )
                  )}
                </section>
              );
            })}
          </div>
        </div>
        <button
          type="button"
          aria-label="Jump to latest"
          tabIndex={below ? 0 : -1}
          onClick={() =>
            scroller.current?.scrollTo({
              top: scroller.current.scrollHeight,
              behavior: "smooth",
            })
          }
          className={cn(
            "absolute bottom-3 left-1/2 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border border-pi-line-2 bg-background text-pi-ink shadow-pi-2 transition-[opacity,transform] duration-200 hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
            below
              ? "opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          )}
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      </div>
    </TooltipProvider>
  );
};

export default Thread;
