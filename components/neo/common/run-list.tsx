import React from "react";
import { Undo2 } from "@/components/icons";
import type { NeoRef, NeoRun } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { companyOf } from "@/components/inbox/v2/store";

type Props = {
  runs: NeoRun[];
  busy: boolean;
  onUndo: (runId: string) => void;
  onRef: (ref: NeoRef) => void;
};

const STATUS: Record<NeoRun["status"], { label: string; className: string }> = {
  partial: {
    label: "Partially completed",
    className: "bg-pi-warning-bg text-pi-warning",
  },
  waiting: {
    label: "Waiting for reply",
    className: "bg-pi-fill text-pi-body",
  },
  running: { label: "Running", className: "bg-pi-brand-tint text-primary" },
  "needs-you": {
    label: "Needs you",
    className: "bg-pi-warning-bg text-pi-warning",
  },
  done: {
    label: "Done",
    className: "bg-pi-success-bg text-pi-success",
  },
  failed: {
    label: "Failed",
    className: "bg-pi-danger-bg text-pi-danger",
  },
  stopped: {
    label: "Stopped",
    className: "bg-pi-fill text-pi-body",
  },
  undone: {
    label: "Undone",
    className: "bg-pi-fill text-pi-body",
  },
};

/**
 * Every run this session, newest first: what it was, where it got to, what it
 * touched, and the one-step Undo while nothing it made has been approved.
 */
const RunList = ({ runs, onUndo, onRef, busy }: Props) =>
  runs.length ? (
    <ul className="flex flex-col gap-3 p-5">
      {runs.map((r) => (
        <li key={r.id} className="rounded-xl border border-pi-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold leading-5 text-pi-ink">
              {r.title}
            </p>
            <span
              className={cn(
                "flex-none rounded-sm px-1.5 py-0.5 text-body-4 font-semibold",
                STATUS[r.status].className
              )}
            >
              {STATUS[r.status].label}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-pi-body tabular-nums">
            {companyOf(r.context.company || "")?.name} ·{" "}
            {new Date(r.startedAt).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          {r.summary && (
            <p className="mt-3 text-[13px] leading-5 text-pi-ink">
              {r.summary}
            </p>
          )}
          {(r.touched.length > 0 || r.undoable) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {r.touched.slice(0, 4).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onRef({ label: id, itemId: id })}
                  className="max-w-full truncate rounded-md border border-pi-line px-2 py-1 text-xs font-medium text-primary hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  title={id}
                >
                  {id}
                </button>
              ))}
              {r.touched.length > 4 && (
                <span className="text-body-4 text-pi-body">
                  +{r.touched.length - 4}
                </span>
              )}
              {r.undoable && (
                <button
                  type="button"
                  disabled={busy}
                  className="ml-auto flex h-6 items-center gap-1 rounded-md px-1.5 text-label-3 font-semibold text-pi-ink hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  onClick={() => onUndo(r.id)}
                >
                  <Undo2 className="h-3 w-3" />
                  Undo task
                </button>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p className="px-5 py-8 text-sm leading-6 text-pi-body">
      Nothing yet. Every task Neo runs is listed here, with an Undo for what it
      created.
    </p>
  );

export default RunList;
