import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, NeoStar } from "@/components/icons";
import { actor, useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { useComposer } from "@/hooks/pages/neo/use-composer";
import {
  todayFor,
  unavailableFor,
  type TodayItem,
} from "@/config/pages/neo/suggestions";
import { JOBS } from "@/config/pages/neo/skills";
import Shortcuts from "@/components/neo/common/shortcuts";
import Canvas from "@/components/neo/common/canvas";
import Composer from "@/components/neo/common/composer";
import ContextChip from "@/components/neo/common/context-chip";
import DropZone from "@/components/neo/common/drop-zone";
import Thread, { useLiveMessage } from "@/components/neo/common/thread";
import { cn } from "@/lib/utils";
import { NeoMenuButton } from "./index";

const NOTE =
  "Neo prepares; you approve. Nothing reaches your books without your click.";

/** "Good morning" before noon, "Good afternoon" to five, then evening. */
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const DOT: Record<TodayItem["tone"], string> = {
  negative: "bg-pi-danger-dot",
  notice: "bg-pi-warning-dot",
  neutral: "bg-pi-line-strong",
};

/**
 * Neo › Chat. Empty, it is a home that leads with where three-way
 * reconciliation stands at this client — "September reconciled, not
 * closed" — each one a job Neo runs. The four jobs are one quiet link
 * below. A client without POS sales is told why there's nothing here.
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
  const first = actor.split(" ")[0];
  const [examples, setExamples] = useState(false);
  const [hello, setHello] = useState("Hello");
  useEffect(() => setHello(greeting()), []);
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
      onAttachSample={box.attachSample}
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
        {empty && <div aria-hidden className="neo-home-wash" />}
        {/* The title lives in the top bar's trail; below 1024px this row
            only carries the button that opens Neo's column. */}
        <header className="relative flex h-12 flex-none items-center gap-1 px-2 lg:hidden">
          <NeoMenuButton />
        </header>

        {empty ? (
          <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 pb-10 pt-[6vh] sm:px-6 sm:pt-[9vh]">
            <div className="flex items-center gap-3">
              <NeoStar className="h-7 w-7 flex-none text-pi-brand sm:h-8 sm:w-8" />
              <h2 className="neo-reading text-[28px] font-normal leading-9 tracking-[-0.01em] text-pi-ink [text-wrap:balance] sm:text-[36px] sm:leading-[44px]">
                {hello}, {first}
              </h2>
            </div>
            <div className="mt-8 w-full max-w-[720px]">{composer}</div>

            {unavailable && (
              <p className="mt-8 w-full max-w-[720px] rounded-xl border border-pi-line bg-background px-4 py-3 text-[13px] leading-5 text-pi-body">
                Neo reconciles POS sales, settlements and the bank in this
                phase, and {company?.name} doesn&apos;t sell through POS or
                platforms. To try it, switch to Nandhini Deluxe in the top bar.
              </p>
            )}

            {today.length > 0 && (
              <section
                aria-labelledby="neo-today"
                className="mt-8 w-full max-w-[720px]"
              >
                <h3
                  id="neo-today"
                  className="mb-2 px-1 text-body-4 font-semibold text-pi-faint"
                >
                  Today at {company?.name}
                </h3>
                <ul className="overflow-hidden rounded-xl border border-pi-line bg-background shadow-pi-1">
                  {today.map((t) => (
                    <li
                      key={t.id}
                      className="border-t border-pi-line first:border-t-0"
                    >
                      <button
                        type="button"
                        onClick={() => box.send(t.prompt)}
                        className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "mt-[7px] size-[7px] flex-none rounded-full",
                            DOT[t.tone]
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-medium leading-5 text-pi-ink">
                            {t.text}
                          </span>
                          <span className="block text-body-4 text-pi-body">
                            {t.detail}
                          </span>
                        </span>
                        <span className="mt-0.5 hidden flex-none items-center gap-1 text-[12px] font-medium text-pi-body group-hover:text-pi-ink sm:flex">
                          Ask Neo
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-5 w-full max-w-[720px]">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-expanded={examples}
                  onClick={() => setExamples((x) => !x)}
                  className="flex items-center gap-1 rounded-sm px-1 text-[13px] font-medium text-pi-body hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  What can Neo do?
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      examples && "rotate-180"
                    )}
                  />
                </button>
                <Link
                  href="/inbox?module=NEO&page=skills"
                  className="flex items-center gap-1 rounded-sm px-1 text-[13px] font-medium text-pi-body hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  How Neo works
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {examples && (
                <div className="mt-3 rounded-xl border border-pi-line bg-background px-4 py-2.5 shadow-pi-1 duration-200 animate-in fade-in-0 slide-in-from-top-1">
                  <ul>
                    {JOBS.map((j) => (
                      <li key={j.id}>
                        <button
                          type="button"
                          onClick={() => box.send(j.prompt)}
                          className="flex w-full items-baseline gap-3 rounded-sm py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                        >
                          <span className="code w-16 flex-none text-[12px] text-pi-faint">
                            /{j.slash}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium leading-5 text-pi-ink hover:underline">
                              {j.name}
                            </span>
                            <span className="block text-body-4 text-pi-body">
                              {j.does}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {!neo.signedOff && (
              <p className="mt-8 text-center text-body-4 text-pi-faint">
                {NOTE}
              </p>
            )}
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
