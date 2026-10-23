import { unanswered } from "@/utils/pages/neo/decisions";
import React, { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import {
  ArrowRight,
  History,
  Maximize,
  SquarePen,
  X,
} from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { suggestionsFor } from "@/config/pages/neo/suggestions";
import { companyOf, useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { useComposer } from "@/hooks/pages/neo/use-composer";
import { onNeoPage } from "@/utils/pages/neo/route";
import Shortcuts from "./common/shortcuts";
import Canvas from "./common/canvas";
import Composer from "./common/composer";
import ContextChip from "./common/context-chip";
import DropZone from "./common/drop-zone";
import NeoMark from "./common/neo-mark";
import Thread, { useLiveMessage } from "./common/thread";
import ChatTitle from "./page/chat-title";
import { demoNote } from "@/config/pages/neo/demo";

const ICON_BUTTON =
  "grid h-8 w-8 shrink-0 place-items-center rounded-md text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-40";

/**
 * Neo, docked: the same chat as Neo's page, made small and set beside the
 * work (19 Oct 2026, "one Neo, two sizes"). It is for asking about what is
 * on screen, and its empty state offers the next reconciliation job; the
 * greeting, the agents and past chats live on Neo's page.
 * Expand opens the page on this chat, carrying its "this".
 *
 * Its left edge drags it wider (384–560px). A document Neo makes opens to
 * its left, over the work, so the sign-off in the chat stays in view.
 *
 * It is never drawn on Neo's own pages: Neo does not dock beside Neo.
 *
 * The panel owns its keys while focus is inside it — digits answer the open
 * question, Ctrl+Enter takes the card's main action, Esc stops a run or closes
 * — so none of them reach the queue's shortcuts behind it.
 */
const NeoPanel = () => {
  const router = useRouter();
  const neo = useNeo();
  const state = useStore();
  const box = useComposer(neo);
  const live = useLiveMessage(neo);
  const input = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(
    () => suggestionsFor(neo.context),
    // The store is a dependency: what can be suggested follows the queue.
    [neo.context, state]
  );

  useEffect(() => {
    if (neo.open) window.setTimeout(() => input.current?.focus(), 60);
  }, [neo.open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.defaultPrevented) return;
    const typing = (e.target as HTMLElement).closest(
      "input, textarea, select, [contenteditable=true]"
    );
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (neo.busy) neo.stop();
      else if (neo.canvas) neo.setCanvas(null);
      else neo.setOpen(false);
      return;
    }
    if (
      !neo.messages.length &&
      !box.draft &&
      !typing &&
      /^[1-4]$/.test(e.key) &&
      suggestions[Number(e.key) - 1]
    ) {
      e.preventDefault();
      box.send(suggestions[Number(e.key) - 1]);
      return;
    }
    if (
      live?.ask &&
      !live.ask.input &&
      !typing &&
      !box.draft &&
      /^[1-9]$/.test(e.key)
    ) {
      const option = live.ask.options[Number(e.key) - 1];
      if (option) {
        e.preventDefault();
        neo.answer(live.id, option.id);
      }
      return;
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const primary = live?.actions?.find((a) => a.primary);
      if (
        live &&
        primary &&
        !typing &&
        primary.risk !== "commit" &&
        primary.risk !== "external" &&
        !unanswered(live.card)
      )
        neo.answer(live.id, primary.id);
    }
    e.stopPropagation();
  };

  // Dragging the left edge sets the width; double-click resets it.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = neo.panelWidth;
    const move = (ev: PointerEvent) =>
      neo.setPanelWidth(startW + (startX - ev.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (onNeoPage(router.query)) return null;

  if (!neo.open)
    return neo.hasLauncher ? null : (
      <button
        type="button"
        onClick={() => neo.setOpen(true)}
        title="Ask Neo (Ctrl J)"
        className="fixed right-0 top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 rounded-l-xl bg-background px-1.5 py-3 text-pi-ink shadow-popover-shadow hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        <NeoMark className="h-6 w-6" live={!!neo.busy} />
        <span className="text-body-4 font-semibold [writing-mode:vertical-rl]">
          Ask Neo
        </span>
      </button>
    );

  const recent = neo.chats.filter((c) => c.id !== neo.chatId).slice(0, 8);
  const company = companyOf(neo.runContext?.company || state.company)?.name;
  const ctx = neo.runContext || neo.context;

  return (
    <>
      <aside
        aria-label="Neo"
        onKeyDown={onKeyDown}
        style={{ width: `min(100vw, ${neo.panelWidth}px)` }}
        className="neo-panel neo-scope fixed right-0 top-0 z-40 flex h-dvh max-w-full flex-col border-l border-pi-line bg-background text-pi-ink shadow-popover-shadow duration-200 animate-in slide-in-from-right-8 fade-in-0 motion-reduce:animate-none"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Neo"
          title="Drag to resize · double-click to reset"
          onPointerDown={startResize}
          onDoubleClick={() => neo.setPanelWidth(0)}
          className="absolute inset-y-0 -left-1 z-10 hidden w-2 cursor-col-resize after:absolute after:inset-y-0 after:left-[3px] after:w-0.5 after:bg-transparent after:transition-colors hover:after:bg-pi-brand-border sm:block"
        />
        <header className="flex h-14 flex-none items-center gap-1 border-b border-pi-line pl-3 pr-2">
          <NeoMark className="mr-1" live={!!neo.busy && !neo.paused} />
          <div className="flex min-w-0 flex-1 items-center">
            <ChatTitle compact />
          </div>
          {
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Recent chats"
                    title="Recent chats"
                    disabled={!!neo.busy || !recent.length}
                    className={ICON_BUTTON}
                  >
                    <History className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="text-body-4 font-semibold text-pi-faint">
                    Recent chats
                  </DropdownMenuLabel>
                  {recent.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onSelect={() => neo.openChat(c.id)}
                      className="truncate text-[13px]"
                    >
                      <span className="truncate">{c.title}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                type="button"
                aria-label="New chat"
                title="New chat (Ctrl Shift O)"
                disabled={!!neo.busy || !neo.messages.length}
                onClick={neo.reset}
                className={ICON_BUTTON}
              >
                <SquarePen className="h-4 w-4" />
              </button>
            </>
          }
          <button
            type="button"
            aria-label="Expand to Neo"
            title="Expand to Neo"
            onClick={neo.expand}
            className={ICON_BUTTON}
          >
            <Maximize className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Close Neo"
            title="Close (Esc)"
            onClick={() => neo.setOpen(false)}
            className={ICON_BUTTON}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <DropZone
          onFiles={box.attachFiles}
          disabled={!!neo.busy}
          className="flex min-h-0 flex-1 flex-col"
        >
          {neo.messages.length ? (
            <Thread
              variant="panel"
              onPrompt={(t) => box.send(t)}
              onOpenScope={(id) =>
                neo.goTo({ label: "", itemId: id, target: "open" })
              }
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <p className="neo-reading text-[22px] leading-8 text-pi-ink">
                What should Neo reconcile?
              </p>
              <ul className="mt-5 flex flex-col">
                {suggestions.map((s, i) => (
                  <li key={s} className="border-t border-pi-line last:border-b">
                    <button
                      type="button"
                      onClick={() => box.send(s)}
                      className="group flex w-full items-center gap-3 py-3 text-left text-[14px] leading-5 text-pi-ink-2 transition-colors hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                    >
                      <kbd className="grid h-5 min-w-5 flex-none place-items-center rounded-xs border border-pi-line font-sans text-[11px] font-medium text-pi-body group-hover:border-pi-brand-border group-hover:text-pi-brand">
                        {i + 1}
                      </kbd>
                      <span className="flex-1">{s}</span>
                      <ArrowRight className="h-3.5 w-3.5 flex-none text-pi-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() =>
                  neo.goTo({ label: "", href: "/inbox?module=NEO" })
                }
                className="mt-5 inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-pi-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                Open Neo for its agents and past chats
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <Composer
            ref={input}
            value={box.draft}
            busy={!!neo.busy}
            attachments={box.attachments}
            onChange={box.setDraft}
            onSend={() => box.send()}
            onStop={neo.stop}
            onAttachFiles={box.attachFiles}
            onRemoveAttachment={box.removeAttachment}
            placeholder={`Ask about ${company || "this company"}`}
            context={
              <ContextChip
                variant="pill"
                context={ctx}
                onClear={neo.detach}
                locked={!!neo.runContext}
              />
            }
          />
          {/* The company is the pill in the prompt box; this line only says
              the rule, until the person has signed off once. */}
          {(neo.runContext || !neo.signedOff) && (
            <p className="flex-none px-4 pb-2.5 text-center text-[11px] leading-4 text-pi-faint">
              {neo.runContext
                ? "Run scope is fixed"
                : demoNote("Scripted prototype") || "Neo prepares, you approve"}
            </p>
          )}
        </DropZone>
      </aside>
      <Canvas variant="panel" />
      <Shortcuts />
    </>
  );
};

export default NeoPanel;
