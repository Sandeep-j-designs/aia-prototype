import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Loader2,
} from "@/components/icons";
import type { NeoRef, NeoStep } from "@/types/pages/neo";
import { cn } from "@/lib/utils";

type Props = {
  steps: NeoStep[];
  onRef: (ref: NeoRef) => void;
  /** The run these steps belong to is still going. */
  running?: boolean;
};

/**
 * "2.4s", "12s" — how long the work took, once it took long enough to be
 * worth saying. A quick answer shows no time: "0.6s" reads as a stopwatch,
 * not as information.
 */
const took = (steps: NeoStep[]) => {
  const start = Math.min(...steps.map((s) => s.startedAt ?? Infinity));
  const end = Math.max(...steps.map((s) => s.endedAt ?? -Infinity));
  if (!isFinite(start) || !isFinite(end) || end < start) return "";
  const s = (end - start) / 1000;
  if (s < 2) return "";
  return s < 10 ? `${s.toFixed(1)}s` : `${Math.round(s)}s`;
};

const Icon = ({ s }: { s: NeoStep }) =>
  s.status === "running" ? (
    <Loader2 className="mt-[3px] h-3.5 w-3.5 flex-none animate-spin text-pi-brand motion-reduce:animate-none" />
  ) : s.status === "failed" ? (
    <CircleAlert className="mt-[3px] h-3.5 w-3.5 flex-none text-status-error" />
  ) : (
    <CircleCheck className="mt-[3px] h-3.5 w-3.5 flex-none text-pi-faint" />
  );

const Line = ({ s, onRef }: { s: NeoStep; onRef: Props["onRef"] }) => (
  <li
    className={cn(
      "flex items-start gap-2 text-[13px] leading-5",
      s.status === "running" ? "text-pi-ink" : "text-pi-body",
      s.status === "failed" && "text-status-error"
    )}
  >
    <Icon s={s} />
    <span className="min-w-0">
      <span className={cn(s.status === "running" && "neo-shimmer")}>
        {s.label}
      </span>
      {s.cite && (
        <button
          type="button"
          onClick={() => onRef(s.cite!)}
          className="ml-1.5 rounded-sm font-medium text-pi-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          {s.cite.label}
        </button>
      )}
    </span>
  </li>
);

/**
 * What Neo did to get the answer, as the chat apps show their work: open
 * while it runs, one line per step, then folded to a single line — "Checked
 * 31 clients · 3 steps · 1.2s" — once the answer starts. Opening it again
 * shows every step and the record each one read. A failure never folds.
 *
 * A step reads as done only once the store has accepted the write behind it.
 */
const Steps = ({ steps, onRef, running }: Props) => {
  const failed = steps.some((s) => s.status === "failed");
  const active = steps.some((s) => s.status === "running");
  const [open, setOpen] = useState(!!running || failed);
  useEffect(() => {
    if (failed || active) setOpen(true);
    else if (!running) setOpen(false);
  }, [running, active, failed]);

  if (steps.length === 1 && !failed)
    return (
      <ol className="flex flex-col">
        <Line s={steps[0]} onRef={onRef} />
      </ol>
    );

  const last = [...steps].reverse().find((s) => s.status !== "running");
  const current = steps.find((s) => s.status === "running");
  const time = took(steps);
  const summary = current
    ? current.label
    : [last?.label, `${steps.length} steps`, time].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-h-7 max-w-full items-center gap-2 self-start rounded-md py-0.5 pr-1.5 text-left text-[13px] leading-5 text-pi-body transition-colors hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {current ? (
          <Loader2 className="h-3.5 w-3.5 flex-none animate-spin text-pi-brand motion-reduce:animate-none" />
        ) : failed ? (
          <CircleAlert className="h-3.5 w-3.5 flex-none text-status-error" />
        ) : (
          <CircleCheck className="h-3.5 w-3.5 flex-none text-pi-faint" />
        )}
        <span
          className={cn(
            "min-w-0 truncate",
            current && "neo-shimmer text-pi-ink"
          )}
        >
          {summary}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 flex-none text-pi-faint transition-transform duration-200 group-hover:text-pi-body",
            open && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <ol
          className="ml-[7px] flex min-h-0 flex-col gap-1.5 overflow-hidden border-l border-pi-line pl-4"
          aria-hidden={!open}
        >
          <li aria-hidden className="h-0.5" />
          {steps.map((s) => (
            <Line key={s.id} s={s} onRef={onRef} />
          ))}
          <li aria-hidden className="h-0.5" />
        </ol>
      </div>
    </div>
  );
};

export default Steps;
