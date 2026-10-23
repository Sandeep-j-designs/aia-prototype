import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Minimize } from "lucide-react";
import { ChevronLeft, ChevronRight, Maximize, X } from "@/components/icons";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { useRecon } from "@/hooks/pages/neo/use-recon";
import {
  canvasKey,
  canvasTitle,
  docShape,
  opensInCanvas,
} from "@/utils/pages/neo/canvas";
import { cn } from "@/lib/utils";
import type { NeoMessage } from "@/types/pages/neo";
import { CardBody, docIcon, useSignoff } from "./message";
import { useLiveMessage } from "./thread";

type Props = {
  /**
   * "page" sits beside the chat in Neo's page; "panel" opens over the work,
   * to the left of the docked panel, so the chat stays in view.
   */
  variant: "page" | "panel";
};

/**
 * The document Neo is working on, at full size beside the chat (19 Oct 2026,
 * the chat apps' artifact pattern): a voucher, a batch register, a change
 * set. It is the same card the thread used to draw — edits made here are the
 * edits the sign-off in the chat counts — with room to read every column.
 *
 * ‹ › steps through the other documents in this chat. Esc or × closes it;
 * the tile in the thread opens it again.
 */
const Canvas = ({ variant }: Props) => {
  const neo = useNeo();
  const [expanded, setExpanded] = useState(false);
  const surface = useRef<HTMLElement>(null);
  const placeholder = useRef<HTMLDivElement>(null);
  const origin = useRef<DOMRect | null>(null);
  const motion = useRef<Animation | null>(null);
  const restoring = useRef(false);

  const frame = (rect: DOMRect) => ({
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  const animate = (from: DOMRect, to: DOMRect, done?: () => void) => {
    motion.current?.cancel();
    const animation = surface.current?.animate([frame(from), frame(to)], {
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 320,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    });
    if (!animation) return done?.();
    motion.current = animation;
    animation.onfinish = () => {
      done?.();
      animation.cancel();
      motion.current = null;
    };
  };
  const restore = () => {
    if (restoring.current || !surface.current || !placeholder.current) return;
    restoring.current = true;
    animate(
      surface.current.getBoundingClientRect(),
      placeholder.current.getBoundingClientRect(),
      () => {
        setExpanded(false);
        restoring.current = false;
      }
    );
  };
  useLayoutEffect(() => {
    if (expanded && origin.current && surface.current) {
      animate(origin.current, surface.current.getBoundingClientRect());
    }
  }, [expanded]);
  useEffect(() => () => motion.current?.cancel(), []);
  // The header's title and count read the recon store: follow it.
  useRecon();
  const live = useLiveMessage(neo);
  // One entry per document: a recon view shown again in the same chat is
  // the same document, updated, so ‹ › steps documents, not showings.
  const docs = useMemo(() => {
    const out: { key: string; ids: string[]; latest: NeoMessage }[] = [];
    for (const msg of neo.messages) {
      if (!opensInCanvas(msg.card)) continue;
      const key = canvasKey(msg.card!) || msg.id;
      const at = out.find((d) => d.key === key);
      if (at) {
        at.ids.push(msg.id);
        at.latest = msg;
      } else out.push({ key, ids: [msg.id], latest: msg });
    }
    return out;
  }, [neo.messages]);
  const index = docs.findIndex((d) => d.ids.includes(neo.canvas || ""));
  const doc = docs[index];
  // The live one, when this document is waiting for a sign-off.
  const m = doc && (doc.ids.includes(live?.id || "") ? live! : doc.latest);

  useEffect(() => {
    if (!m) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement;
      if (t.closest("[role=dialog], [role=menu], [role=listbox]")) return;
      e.preventDefault();
      e.stopPropagation();
      if (expanded) restore();
      else neo.setCanvas(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [m, neo, expanded]);

  useEffect(() => {
    if (!m?.card) {
      motion.current?.cancel();
      restoring.current = false;
      setExpanded(false);
    }
  }, [!!m?.card]);

  if (!m?.card) return null;
  const { title, meta } = canvasTitle(m.card);
  const waiting = live?.id === m.id;
  const panel = variant === "panel";
  const page = docShape(m.card) !== "record";
  const Icon = docIcon(m.card);
  const sheet = m.card.kind === "recon-report";

  const paneStyle = panel
    ? {
        right: neo.panelWidth,
        width: `min(760px, calc(100vw - ${neo.panelWidth}px - 64px))`,
      }
    : undefined;
  const paneClass = cn(
    "flex min-h-0 flex-col bg-pi-page",
    panel
      ? // Below 1024px there's no room beside the panel: it covers all.
        "fixed top-0 z-40 h-dvh border-l border-pi-line shadow-popover-shadow duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none max-lg:!right-0 max-lg:!w-full max-lg:z-50"
      : // Beside the chat from 1440px. Below that it's a sheet over the
        // chat that leaves a 360px strip of the thread and its prompt
        // box in view (20 Oct 2026, small laptops); below 1024px, the
        // whole screen.
        "min-w-0 flex-[1.15] border-l border-pi-line duration-200 animate-in fade-in-0 slide-in-from-right-4 motion-reduce:animate-none max-[1439px]:absolute max-[1439px]:inset-y-0 max-[1439px]:left-[360px] max-[1439px]:right-0 max-[1439px]:z-30 max-[1439px]:shadow-popover-shadow max-lg:fixed max-lg:inset-0 max-lg:left-0 max-lg:z-50 max-lg:border-l-0"
  );

  return (
    <>
      {expanded && (
        <div
          ref={placeholder}
          aria-hidden="true"
          className={paneClass}
          style={{ ...paneStyle, visibility: "hidden" }}
        />
      )}
      <section
        ref={surface}
        aria-label={title}
        data-expanded={expanded}
        style={
          expanded
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100dvh",
                zIndex: 60,
              }
            : { ...paneStyle, ...(origin.current ? { animation: "none" } : {}) }
        }
        className={
          expanded
            ? "flex min-h-0 flex-col overflow-hidden bg-pi-page"
            : paneClass
        }
      >
        <header className="flex h-14 flex-none items-center gap-3 border-b border-pi-line bg-background pl-4 pr-2">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-md border border-pi-line bg-pi-fill text-pi-body">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <h2 className="truncate text-[14px] font-semibold leading-5 text-pi-ink">
              {title}
            </h2>
            <p className="truncate text-body-4 text-pi-body">
              {waiting ? (
                <span className="font-medium text-pi-brand">
                  Waiting for you ·{" "}
                </span>
              ) : null}
              {meta}
              {doc.ids.length > 1
                ? ` · updated ${doc.ids.length === 2 ? "once" : `${doc.ids.length - 1} times`} in this chat`
                : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label={expanded ? "Exit full screen" : "Expand panel"}
            aria-pressed={expanded}
            title={expanded ? "Exit full screen (Esc)" : "Full screen"}
            onClick={() => {
              if (expanded) restore();
              else if (surface.current) {
                origin.current = surface.current.getBoundingClientRect();
                setExpanded(true);
              }
            }}
            className="grid h-8 w-8 flex-none place-items-center rounded-md text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            {expanded ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
          {docs.length > 1 && (
            <div className="flex items-center text-[12px] tabular-nums text-pi-body">
              <button
                type="button"
                aria-label="Previous document"
                disabled={index <= 0}
                onClick={() => neo.setCanvas(docs[index - 1].latest.id)}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-pi-fill hover:text-pi-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {index + 1} / {docs.length}
              <button
                type="button"
                aria-label="Next document"
                disabled={index >= docs.length - 1}
                onClick={() => neo.setCanvas(docs[index + 1].latest.id)}
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-pi-fill hover:text-pi-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {waiting && (
            <SignoffButtons m={m} onAnswer={(v) => neo.answer(m.id, v)} />
          )}
          <button
            type="button"
            aria-label="Close document"
            title="Close (Esc)"
            onClick={() => neo.setCanvas(null)}
            className="grid h-8 w-8 flex-none place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div
          className={cn(
            "neo-canvas min-h-0 flex-1 overscroll-contain",
            // A workbook scrolls inside its own grid, with its tabs pinned.
            sheet
              ? "flex flex-col overflow-hidden bg-background"
              : "overflow-y-auto [overflow-wrap:anywhere]",
            // A document is a page; a record keeps its own card on the grey.
            !sheet && (page ? "bg-background" : "p-6")
          )}
        >
          <div
            className={
              sheet
                ? "flex min-h-0 flex-1 flex-col"
                : page
                  ? undefined
                  : "mx-auto max-w-[880px]"
            }
          >
            <CardBody
              message={m}
              live={waiting}
              running={!!m.runId && m.runId === neo.busy}
              paused={neo.paused}
              onEditCard={(card) => neo.editCard(m.id, card)}
              onRef={neo.goTo}
              onPause={neo.pause}
              onResume={neo.resume}
              onStop={neo.stop}
              expanded
            />
          </div>
        </div>
      </section>
    </>
  );
};

/**
 * The sign-off, repeated where the document is read: the same buttons as
 * the chat's, naming the same action, so the person signs where they look.
 */
const SignoffButtons = ({
  m,
  onAnswer,
}: {
  m: NeoMessage;
  onAnswer: (value: string) => void;
}) => {
  const { labelOf, blocked } = useSignoff(m);
  const actions = m.actions || [];
  const main = actions.find((a) => a.primary);
  const cancel = actions.find(
    (a) => !a.primary && /cancel|discard|don't|not now/i.test(a.label)
  );
  if (!main) return null;
  return (
    <div className="flex flex-none items-center gap-1.5">
      {cancel && (
        <button
          type="button"
          onClick={() => onAnswer(cancel.id)}
          className="h-8 rounded-sm border border-pi-line-2 bg-background px-3 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border max-sm:hidden"
        >
          {cancel.label}
        </button>
      )}
      <button
        type="button"
        disabled={blocked(main)}
        onClick={() => onAnswer(main.id)}
        className="h-8 rounded-sm border border-pi-btn-primary-edge bg-pi-btn-fill px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {labelOf(main)}
      </button>
    </div>
  );
};

export default Canvas;
