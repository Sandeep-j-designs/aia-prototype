import React from "react";
import { ArrowRight, Sparkle, Undo2 } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { canUndo } from "@/hooks/pages/inbox/use-activity";
import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/types/pages/inbox/automation";
import { fullTime, timeAgo } from "@/utils/pages/notifications";

type Props = {
  entry: ActivityEntry;
  /** Open the document the entry is about. Absent: no Open link. */
  onOpen?: (entry: ActivityEntry) => void;
  onUndo?: (entry: ActivityEntry) => void;
  /** The full log names the record; a document's own History does not need to. */
  showSubject?: boolean;
  /** Tighter padding for the History panel. */
  compact?: boolean;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/**
 * Who acted, as a 28px mark: the AI's sparkle on its soft brand tile (the
 * same tile as the AI mark on a value), or a person's initials on a neutral
 * disc. Attribution is the point of the log, so it leads every row.
 */
export const ActorMark = ({ entry }: { entry: ActivityEntry }) =>
  entry.actor.kind === "ai" ? (
    <span
      aria-hidden
      className="grid size-7 flex-none place-items-center rounded-md bg-pi-brand-tint text-pi-brand"
    >
      <Sparkle className="size-4" />
    </span>
  ) : (
    <span
      aria-hidden
      className="grid size-7 flex-none place-items-center rounded-full bg-pi-fill text-[11px] font-semibold text-pi-body"
    >
      {initials(entry.actor.name)}
    </span>
  );

/**
 * One line of the activity log: who did what to which record, why, and what
 * changed. The reason is the evidence for an AI action ("6 of 6 past Airtel
 * bills") or a person's note; an edit shows its before and after.
 */
const ActivityRow = ({ entry, onOpen, onUndo, showSubject, compact }: Props) => {
  const undo = onUndo && canUndo(entry);
  return (
    <div
      className={cn(
        "group flex gap-3 transition-colors duration-100 hover:bg-pi-row-hover motion-reduce:transition-none",
        compact ? "px-4 py-3" : "px-6 py-4"
      )}
    >
      <ActorMark entry={entry} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-5 text-pi-ink">
          <span className="font-medium">{entry.action}</span>
          {showSubject ? (
            <span className="text-pi-body"> · {entry.subject}</span>
          ) : null}
        </p>
        {entry.change ? (
          <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] leading-4">
            <span className="text-pi-faint line-through decoration-pi-line-2">
              {entry.change.from}
            </span>
            <ArrowRight aria-hidden className="size-3 text-pi-faint" />
            <span className="font-medium text-pi-ink">{entry.change.to}</span>
          </p>
        ) : null}
        {entry.reason ? (
          <p className="mt-1 text-[12px] leading-4 text-pi-body">
            <span className="text-pi-faint">
              {entry.actor.kind === "ai" ? "Why: " : "Note: "}
            </span>
            {entry.reason}
          </p>
        ) : null}
        <p className="mt-1 text-[12px] leading-4 text-pi-faint">
          {entry.actor.name} · {entry.module} ·{" "}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <time dateTime={entry.at} className="cursor-default">
                  {timeAgo(entry.at)}
                </time>
              </TooltipTrigger>
              <TooltipContent>{fullTime(entry.at)}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </p>
      </div>
      {undo || (onOpen && entry.ref?.kind === "document") ? (
        <div className="flex flex-none items-start gap-1">
          {undo ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUndo?.(entry)}
            >
              <Undo2 className="h-4 w-4" />
              Undo
            </Button>
          ) : null}
          {onOpen && entry.ref?.kind === "document" ? (
            <Button variant="ghost" size="sm" onClick={() => onOpen(entry)}>
              Open
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default ActivityRow;
