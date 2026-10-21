import React, { useEffect, useState } from "react";
import {
  CircleCheck,
  CirclePause,
  Loader2,
  Pause,
  Play,
  Square,
} from "@/components/icons";
import type { NeoCard, NeoRef, NeoStageStatus } from "@/types/pages/neo";
import { cn } from "@/lib/utils";

type Props = {
  card: Extract<NeoCard, { kind: "pipeline" }>;
  live: boolean;
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRef: (ref: NeoRef) => void;
};

/** Lines of the activity log kept on screen; the rest is in the Inbox. */
const LOG_LINES = 7;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

const SEGMENT: Record<NeoStageStatus, string> = {
  waiting: "bg-pi-line",
  active: "bg-border",
  done: "bg-status-success",
  held: "bg-status-warning",
};

const TONE_DOT = {
  positive: "bg-status-success",
  notice: "bg-status-warning",
  negative: "bg-status-error",
  neutral: "bg-pi-faint",
};

/**
 * A live workflow, drawn native to the agent layer rather than as paper: a
 * six-segment track, the stages with what each has found, and the running
 * log. The clock runs until the run finishes; Pause holds it at the next safe
 * point between documents, never halfway through one.
 */
const PipelineCard = ({
  card,
  live,
  paused,
  onPause,
  onResume,
  onStop,
  onRef,
}: Props) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (card.finishedAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [card.finishedAt]);
  const elapsed = (card.finishedAt || now) - card.startedAt;
  const state = card.finishedAt
    ? "Finished"
    : paused
      ? "Paused"
      : live
        ? "Live"
        : "Stopped";

  return (
    <section
      aria-label={card.title}
      className="overflow-hidden rounded-xl border border-pi-line bg-pi-fill"
    >
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-body-4 font-bold uppercase tracking-wide",
            state === "Live"
              ? "bg-pi-brand-tint text-primary"
              : state === "Finished"
                ? "bg-pi-success-bg text-pi-success"
                : "bg-background text-pi-body"
          )}
        >
          {state}
        </span>
        <p className="text-label-3 font-semibold text-pi-ink">{card.title}</p>
        <span className="ml-auto font-mono text-label-3 text-pi-ink tabular-nums">
          {clock(elapsed)}
        </span>
        {live && !card.finishedAt && (
          <span className="flex gap-1">
            <button
              type="button"
              onClick={paused ? onResume : onPause}
              aria-label={paused ? "Resume run" : "Pause run"}
              title={paused ? "Resume" : "Pause"}
              className="grid h-6 w-6 place-items-center rounded-md text-pi-ink hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              {paused ? (
                <Play className="h-3 w-3 fill-current" />
              ) : (
                <Pause className="h-3 w-3 fill-current" />
              )}
            </button>
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop run"
              title="Stop — take over from here"
              className="grid h-6 w-6 place-items-center rounded-md text-pi-ink hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          </span>
        )}
      </header>

      <div className="flex gap-1 px-3" aria-hidden>
        {card.stages.map((s) => (
          <span
            key={s.id}
            className={cn(
              "relative h-1 flex-1 overflow-hidden rounded-full transition-colors duration-500",
              SEGMENT[s.status]
            )}
          >
            {s.status === "active" && !paused && (
              <span className="absolute inset-y-0 w-1/3 animate-progress-sheen bg-background/60 motion-reduce:hidden" />
            )}
          </span>
        ))}
      </div>

      <ol className="flex flex-col gap-1 px-3 py-2.5">
        {card.stages.map((s) => (
          <li
            key={s.id}
            className={cn(
              "flex items-center gap-2 text-body-4",
              s.status === "waiting" ? "text-pi-body" : "text-pi-ink"
            )}
          >
            {s.status === "done" ? (
              <CircleCheck className="h-3.5 w-3.5 flex-none text-status-success" />
            ) : s.status === "active" ? (
              paused ? (
                <CirclePause className="h-3.5 w-3.5 flex-none text-primary" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 flex-none animate-spin text-primary motion-reduce:animate-none" />
              )
            ) : s.status === "held" ? (
              <CirclePause className="h-3.5 w-3.5 flex-none text-status-warning" />
            ) : (
              <span className="grid h-3.5 w-3.5 flex-none place-items-center">
                <span className="h-2.5 w-2.5 rounded-full border border-pi-line" />
              </span>
            )}
            <span
              className={cn(
                "w-24 flex-none",
                s.status === "active" && "font-semibold"
              )}
            >
              {s.label}
            </span>
            <span className="min-w-0 truncate text-right text-pi-body tabular-nums [flex:1]">
              {s.detail}
            </span>
          </li>
        ))}
      </ol>

      {card.log.length > 0 && (
        <div className="border-t border-pi-line bg-background px-3 py-2">
          <p className="mb-1 text-body-4 font-semibold uppercase tracking-wide text-pi-body">
            Activity
          </p>
          <ol aria-live="polite" className="flex flex-col gap-1">
            {card.log.slice(-LOG_LINES).map((l) => (
              <li
                key={l.id}
                className="flex items-start gap-2 text-body-4 leading-4 text-pi-body duration-300 animate-in fade-in-0 slide-in-from-bottom-1 motion-reduce:animate-none"
              >
                <span className="w-9 flex-none font-mono tabular-nums">
                  {clock(l.at - card.startedAt)}
                </span>
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 flex-none rounded-full",
                    TONE_DOT[l.tone || "neutral"]
                  )}
                />
                {l.itemId ? (
                  <button
                    type="button"
                    onClick={() =>
                      onRef({
                        label: l.itemId!,
                        itemId: l.itemId,
                        target: "inbox",
                      })
                    }
                    className="min-w-0 text-left text-pi-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  >
                    {l.text}
                  </button>
                ) : (
                  <span className="min-w-0 text-pi-ink">{l.text}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export default PipelineCard;
