import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleAlert,
  FileText,
  NeoStar,
} from "@/components/icons";
import type { NeoMessage, NeoRef, NeoStep } from "@/types/pages/neo";
import { RECON_JOURNEY } from "@/config/pages/neo/skills";
import { cn } from "@/lib/utils";

type Props = {
  message: NeoMessage;
  onRef: (ref: NeoRef) => void;
  /** This block is where the run is now: it stays open and moving. */
  current?: boolean;
};

const journey = (n?: number) => RECON_JOURNEY.find((j) => j.n === n);

/**
 * What a tool did, as the verb on its line — "Read", "Matched" — so the
 * result after it reads as a sentence: "Read · 6 sources taken in".
 */
const TOOL_VERB: Record<string, string> = {
  "doc.read": "Read",
  "doc.fingerprint": "Read",
  "schema.validate": "Validated",
  "recon.match": "Matched",
  "recon.export": "Exported",
  "config.get": "Looked up",
  "report.read": "Opened",
};
const verbOf = (s: NeoStep) =>
  s.by?.tools?.map((t) => TOOL_VERB[t]).find(Boolean);

/** "A", "A and b", "A, b and c": the journey steps a block covered. */
const sentence = (parts: string[]) => {
  const [first, ...rest] = parts;
  const tail = rest.map((p) => p.charAt(0).toLowerCase() + p.slice(1));
  if (!tail.length) return first;
  return `${[first, ...tail.slice(0, -1)].join(", ")} and ${tail[tail.length - 1]}`;
};

/**
 * The block's mark. Working: Neo's mark breathing inside a ring that ripples
 * out. Done: a tick that pops in where the mark was. Failed: the alert.
 */
const Mark = ({ working, failed }: { working: boolean; failed: boolean }) => (
  <span
    aria-hidden
    className="relative grid h-4 w-4 flex-none place-items-center"
  >
    {failed ? (
      <CircleAlert className="neo-pop h-4 w-4 text-status-error" />
    ) : working ? (
      <>
        <span className="neo-orb-halo absolute inset-0 rounded-full bg-pi-brand-tint" />
        <NeoStar className="neo-orb-star relative h-3.5 w-3.5 text-pi-brand" />
      </>
    ) : (
      <span className="neo-pop grid h-4 w-4 place-items-center rounded-full bg-pi-success-bg text-pi-success">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    )}
  </span>
);

/**
 * The label as a ticker: a new label arrives from below while the old one
 * leaves upward, so a change of work reads as progress, not a flicker.
 */
const Ticker = ({ text, shimmer }: { text: string; shimmer: boolean }) => {
  const [prev, setPrev] = useState<string | null>(null);
  const last = useRef(text);
  useEffect(() => {
    if (last.current === text) return;
    setPrev(last.current);
    last.current = text;
    const t = window.setTimeout(() => setPrev(null), 220);
    return () => window.clearTimeout(t);
  }, [text]);
  return (
    <span className="relative min-w-0 overflow-hidden">
      {prev && (
        <span aria-hidden className="neo-tick-out absolute inset-0 truncate">
          {prev}
        </span>
      )}
      <span
        key={text}
        className={cn(
          "block truncate",
          prev && "neo-tick-in",
          shimmer && "neo-shimmer"
        )}
      >
        {text}
      </span>
    </span>
  );
};

/** One line of the work, as the chat apps list it under "Thinking". */
const Line = ({
  s,
  onRef,
  i,
}: {
  s: NeoStep;
  onRef: Props["onRef"];
  i: number;
}) => {
  const verb = verbOf(s);
  const thought = s.kind === "thought";
  return (
    <li
      className="neo-step-in flex gap-2.5 text-[12.5px] leading-5"
      style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
    >
      <span
        aria-hidden
        className="mt-[4px] grid h-3 w-3 flex-none place-items-center"
      >
        {s.status === "failed" ? (
          <CircleAlert className="h-3 w-3 text-status-error" />
        ) : s.status === "running" ? (
          <span className="neo-spin h-2.5 w-2.5 rounded-full border-[1.5px] border-pi-line-2 border-t-pi-brand" />
        ) : thought ? (
          <span className="h-1 w-1 rounded-full bg-pi-line-strong" />
        ) : (
          <Check
            className="neo-tick h-3 w-3 text-pi-success"
            strokeWidth={2.5}
          />
        )}
      </span>
      <p
        className={cn(
          "min-w-0",
          s.status === "failed"
            ? "text-status-error"
            : thought
              ? "text-pi-body"
              : "text-pi-ink-2"
        )}
      >
        {verb && !thought && (
          <>
            <span className="font-semibold text-pi-ink">{verb}</span>
            <span className="text-pi-faint"> · </span>
          </>
        )}
        {s.label}
        {s.cite && (
          <button
            type="button"
            onClick={() => onRef(s.cite!)}
            className="ml-1.5 rounded-sm font-medium text-pi-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            {s.cite.label}
          </button>
        )}
      </p>
    </li>
  );
};

/**
 * Neo's reasoning, the way ChatGPT, Claude and Gemini show it: one line
 * above the answer, alive while Neo works (23 Oct 2026). The mark breathes,
 * the label ticks over as the work moves on, and the newest thought or tool
 * call slides in under it. When the work lands the mark becomes a tick and
 * the label a past-tense summary. A click opens the work itself, the steps
 * falling in one after another. No clock, no counts. A failure opens on its
 * own.
 */
const Reasoning = ({ message: m, onRef, current }: Props) => {
  const steps = m.steps || [];
  const failed = steps.some((s) => s.status === "failed");
  const running = steps.some((s) => s.status === "running");
  const working = !!current || running;

  const [open, setOpen] = useState(failed);
  // Each opening replays the steps falling in.
  const [opened, setOpened] = useState(0);
  useEffect(() => {
    if (failed) setOpen(true);
  }, [failed]);

  if (!steps.length && !m.sources?.length && !working) return null;

  const stages = [
    ...new Set(
      steps.map((s) => s.stage).filter((n): n is number => n !== undefined)
    ),
  ];
  const doing =
    steps.find((s) => s.status === "running" && s.kind !== "thought")?.label ||
    (journey(m.phase) || journey(stages[stages.length - 1]))?.doing ||
    "Thinking";
  const done = stages
    .map((n) => journey(n)?.done)
    .filter((d): d is string => !!d);
  const label = working
    ? doing
    : failed
      ? "Stopped on an error"
      : done.length
        ? sentence(done)
        : "Thought it through";
  // The newest thing Neo noticed or did, under the label while it works.
  const latest = [...steps].reverse().find((s) => s.label !== doing);
  const latestVerb = latest && latest.kind !== "thought" && verbOf(latest);

  return (
    <div className="flex flex-col" aria-live={working ? "polite" : undefined}>
      <button
        type="button"
        aria-expanded={open}
        data-guide-id={working ? "neo-reasoning-live" : undefined}
        onClick={() => {
          setOpen((o) => !o);
          setOpened((n) => n + 1);
        }}
        className={cn(
          "group -ml-1.5 flex min-h-7 max-w-full items-center gap-2 self-start rounded-lg px-1.5 py-0.5 text-left text-[13px] leading-5 transition-colors duration-150 hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
          working
            ? "font-medium text-pi-ink-2"
            : "text-pi-body hover:text-pi-ink"
        )}
      >
        <Mark working={working} failed={failed} />
        <Ticker text={label} shimmer={working} />
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 flex-none text-pi-faint transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-pi-body",
            open ? "rotate-90" : "group-hover:translate-x-0.5"
          )}
        />
      </button>

      {/* Working and folded: the newest line slides in under the label, so
          the work is seen moving. */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          working && !open && latest
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {latest && (
            <p
              key={latest.id + latest.status}
              className="neo-tick-in ml-[7px] mt-0.5 truncate border-l border-pi-line pl-[19px] text-[12px] leading-[18px] text-pi-faint"
            >
              {latestVerb && (
                <span className="font-medium text-pi-body">
                  {latestVerb} ·{" "}
                </span>
              )}
              {latest.label}
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div aria-hidden={!open} className="min-h-0 overflow-hidden">
          <div className="ml-[7px] mt-1.5 flex flex-col gap-2 border-l border-pi-line pb-1 pl-[19px]">
            {m.sources && m.sources.length > 0 && (
              <ul aria-label="Sources" className="flex flex-wrap gap-1.5">
                {m.sources.map((n, i) => (
                  <li
                    key={`${opened}-${n}`}
                    style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                    className="neo-step-in inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-pi-line bg-background px-2 text-[11.5px] text-pi-ink-2"
                  >
                    <FileText className="h-3 w-3 flex-none text-pi-faint" />
                    <span className="truncate">{n}</span>
                  </li>
                ))}
              </ul>
            )}
            <ol key={opened} className="flex flex-col gap-1.5">
              {steps.map((s, i) => (
                <Line key={s.id} s={s} onRef={onRef} i={i} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reasoning;
