import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  CalendarClock,
  ClipboardCheck,
  FileSearch,
  FileSpreadsheet,
  Hourglass,
  Lock,
  Settings2,
} from "lucide-react";
import { ArrowRight, NeoStar } from "@/components/icons";
import { cn } from "@/lib/utils";
import { actor, useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { useComposer } from "@/hooks/pages/neo/use-composer";
import {
  todayFor,
  unavailableFor,
  type TodayItem,
} from "@/config/pages/neo/suggestions";
import Shortcuts from "@/components/neo/common/shortcuts";
import Canvas from "@/components/neo/common/canvas";
import Composer from "@/components/neo/common/composer";
import ContextChip from "@/components/neo/common/context-chip";
import DropZone from "@/components/neo/common/drop-zone";
import Thread, { useLiveMessage } from "@/components/neo/common/thread";
import { NeoMenuButton, useNeoColumnHidden } from "./index";
import ChatTitle from "./chat-title";

const NOTE =
  "Neo prepares; you approve. Nothing reaches your books without your click.";

/** "Good morning" before noon, "Good afternoon" to five, then evening. */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/** The row's tile: its tone, and a glyph for where the work stands. */
const GLYPH: Record<TodayItem["kind"], typeof Lock> = {
  setup: Settings2,
  "not-run": CalendarClock,
  waiting: Hourglass,
  review: FileSearch,
  pending: ClipboardCheck,
  done: FileSpreadsheet,
  save: BookmarkPlus,
};

/** The chip's glyph colour: notice is the next thing the books need. */
const TONE: Record<TodayItem["tone"], string> = {
  negative: "text-pi-danger-dot",
  notice: "text-pi-warning-dot",
  neutral: "text-pi-faint",
};

/**
 * Neo › Chat. Empty, it is a home that leads with where three-way
 * reconciliation stands at this client — "September reconciled, not
 * closed" — each one a job Neo runs. A client without POS sales is told
 * why there's nothing here.
 * Once something is asked, the conversation runs down the middle with the
 * box pinned beneath; a document Neo makes opens beside it.
 */
const NeoChat = () => {
  const neo = useNeo();
  const state = useStore();
  const box = useComposer(neo);
  const live = useLiveMessage(neo);
  const input = useRef<HTMLTextAreaElement>(null);
  const empty = !neo.messages.length;
  const columnHidden = useNeoColumnHidden();
  const first = actor.split(" ")[0];
  const [hello, setHello] = useState("Hello");
  useEffect(() => {
    setHello(greeting());
  }, []);
  const company = state.companies.find((c) => c.id === state.company);

  useEffect(() => {
    input.current?.focus();
  }, [neo.chatId]);

  // What the books say needs doing here, as requests Neo answers.
  const unavailable = unavailableFor(state.company);
  const today = useMemo(
    () => todayFor(state.company),
    // The store is a dependency: today's work follows the books.
    [state]
  );

  // Digits answer the open question, Esc stops a run — as in the panel.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing || e.defaultPrevented) return;
    const typing = (e.target as HTMLElement).closest(
      "input, textarea, select, [contenteditable=true]"
    );
    if (e.key === "Escape" && neo.busy) {
      e.preventDefault();
      neo.stop();
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
    }
  };

  // Expanded from the panel: what the panel was looking at comes along.
  const ctx = neo.runContext || neo.context;
  const carried = !!(ctx.itemId || ctx.selectedIds.length);

  const composer = (
    <Composer
      ref={input}
      variant="page"
      menuBelow={empty}
      value={box.draft}
      busy={!!neo.busy}
      attachments={box.attachments}
      onChange={box.setDraft}
      onSend={() => box.send()}
      onStop={neo.stop}
      onAttachFiles={box.attachFiles}
      onRemoveAttachment={box.removeAttachment}
      context={
        carried ? (
          <ContextChip
            variant="pill"
            context={ctx}
            onClear={neo.detach}
            locked={!!neo.runContext}
          />
        ) : undefined
      }
    />
  );

  return (
    <section
      aria-label="Neo chat"
      onKeyDown={onKeyDown}
      className="relative flex min-h-0 flex-1"
    >
      <DropZone
        onFiles={box.attachFiles}
        disabled={!!neo.busy}
        className="flex min-h-0 min-w-0 flex-1 flex-col"
      >
        {/* The chat's own bar: its title menu once there's a conversation.
            On the empty home only the column button shows, below 1024px. */}
        <header
          className={cn(
            "relative flex h-12 flex-none items-center gap-1 px-2 lg:px-4",
            empty ? !columnHidden && "lg:hidden" : "border-b border-pi-line"
          )}
        >
          <NeoMenuButton />
          {!empty && <ChatTitle compact />}
        </header>

        {empty ? (
          // my-auto centres the home in the page and still lets it scroll
          // from the top when the window is shorter than it.
          <div className="neo-home relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-5 py-10 sm:px-10">
            <div className="neo-home-backdrop" aria-hidden="true" />
            <div className="relative my-auto flex w-full flex-col items-center">
              <div className="relative">
                <span
                  className="neo-home-emblem neo-home-rise relative grid h-14 w-14 place-items-center rounded-[18px] text-pi-brand"
                  aria-label="Neo"
                >
                  <NeoStar className="h-7 w-7" />
                </span>
              </div>
              <h2 className="neo-home-rise relative mt-7 text-center text-[26px] font-medium leading-[1.15] tracking-[-0.03em] text-pi-ink [animation-delay:60ms] [text-wrap:balance] sm:text-[34px]">
                {hello}, {first}
              </h2>
              <div className="neo-home-prompt neo-home-rise relative mt-8 w-full max-w-[680px] [animation-delay:120ms]">
                {composer}
              </div>

              {unavailable && (
                <p className="relative mt-6 w-full max-w-[640px] text-center text-[13px] leading-5 text-pi-body">
                  Neo reconciles POS sales, settlements and the bank in this
                  phase, and {company?.name} doesn&apos;t sell through POS or
                  platforms. To try it, switch to Nandhini Deluxe in the top
                  bar.
                </p>
              )}

              {today.length > 0 && (
                <section
                  aria-labelledby="neo-today"
                  className="neo-home-rise relative mt-8 flex w-full max-w-[680px] flex-col items-center [animation-delay:180ms]"
                >
                  <h3
                    id="neo-today"
                    className="text-[12px] font-medium text-pi-faint"
                  >
                    Up next at {company?.name}
                  </h3>
                  <ul className="mt-3 flex flex-wrap justify-center gap-2">
                    {today.map((t) => {
                      const Glyph = GLYPH[t.kind];
                      return (
                        <li key={t.id}>
                          <button
                            type="button"
                            onClick={() => box.send(t.prompt)}
                            title={`${t.text}. ${t.detail}`}
                            className="neo-home-chip group flex h-9 items-center gap-2 rounded-full border border-pi-line-2 bg-background pl-3 pr-3.5 text-[13px] font-medium text-pi-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                          >
                            <Glyph
                              aria-hidden
                              className={cn("h-4 w-4 flex-none", TONE[t.tone])}
                            />
                            {t.prompt}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          </div>
        ) : (
          <>
            <Thread
              variant="page"
              onPrompt={(t) => box.send(t)}
              onOpenScope={(id) =>
                neo.goTo({ label: "", itemId: id, target: "open" })
              }
            />
            <div className="flex-none px-3 pb-3 pt-1 sm:px-6 sm:pb-4">
              <div className="mx-auto max-w-[760px]">
                {composer}
                {!neo.signedOff && (
                  <p className="mt-2 text-center text-body-4 text-pi-faint max-sm:hidden">
                    {NOTE}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DropZone>
      <Canvas variant="page" />
      <Shortcuts />
    </section>
  );
};

export default NeoChat;
