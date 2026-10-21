import React, { useState } from "react";
import {
  Check,
  Copy,
  RotateCcw,
  ThumbsDown,
  Undo2,
  ThumbsUp,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NeoMessage, NeoRef } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { SourcesButton } from "./source-pill";

export const ACTION_BUTTON =
  "grid h-7 w-7 place-items-center rounded-md text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:pointer-events-none disabled:opacity-40";

/** An icon button with its name on hover, as the chat apps do it. */
export const IconAction = ({
  label,
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className={cn(ACTION_BUTTON, className)}
        {...rest}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

const REASONS = [
  "Wrong figure",
  "Wrong records",
  "Not what I asked",
  "Too long",
];

type Props = {
  /** Neo's messages in this turn. */
  messages: NeoMessage[];
  /** The message a rating is filed against: the turn's last answer. */
  rated?: NeoMessage;
  sources: NeoRef[];
  canRetry: boolean;
  onRetry: () => void;
  onRate: (value: "up" | "down", note?: string) => void;
  onRef: (ref: NeoRef) => void;
  /** The run changed records that can still be put back. */
  onUndo?: () => void;
};

/**
 * The row under an answer: copy it, ask again, rate it, see what it rested
 * on. A thumbs-down asks what was wrong in one tap, with room for a line.
 */
const TurnActions = ({
  messages,
  rated,
  sources,
  canRetry,
  onRetry,
  onRate,
  onRef,
  onUndo,
}: Props) => {
  const [copied, setCopied] = useState(false);
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const text = messages
    .map((m) => m.text)
    .filter(Boolean)
    .join("\n\n");
  const value = rated?.feedback?.value;

  return (
    <div className="flex items-center gap-0.5">
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="mr-1 flex h-7 items-center gap-1.5 rounded-md border border-pi-line px-2 text-[12px] font-medium text-pi-ink-2 transition-colors hover:border-pi-line-2 hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
      )}
      {text && (
        <IconAction
          label={copied ? "Copied" : "Copy"}
          onClick={() => {
            void navigator.clipboard?.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </IconAction>
      )}
      <IconAction label="Retry" disabled={!canRetry} onClick={onRetry}>
        <RotateCcw className="h-3.5 w-3.5" />
      </IconAction>
      {rated && (
        <>
          <IconAction
            label="Good answer"
            aria-pressed={value === "up"}
            onClick={() => onRate("up")}
            className={cn(value === "up" && "text-pi-ink")}
          >
            <ThumbsUp
              className={cn("h-3.5 w-3.5", value === "up" && "fill-pi-fill")}
            />
          </IconAction>
          <Popover
            open={asking}
            onOpenChange={(o) => {
              setAsking(o);
              if (!o) {
                setReason(null);
                setNote("");
              }
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Bad answer"
                aria-pressed={value === "down"}
                onClick={(e) => {
                  if (value === "down") {
                    e.preventDefault();
                    onRate("down");
                  }
                }}
                className={cn(ACTION_BUTTON, value === "down" && "text-pi-ink")}
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-3">
              <p className="text-[13px] font-semibold text-pi-ink">
                What was wrong?
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={reason === r}
                    onClick={() => setReason((x) => (x === r ? null : r))}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-[12px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                      reason === r
                        ? "border-pi-brand-border bg-pi-brand-tint text-pi-brand"
                        : "border-pi-line text-pi-ink-2 hover:bg-pi-fill"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="What should Neo have said? (optional)"
                className="mt-2.5 w-full resize-none rounded-sm border border-pi-line-2 bg-background px-2.5 py-1.5 text-[13px] text-pi-ink placeholder:text-pi-faint focus-visible:border-primary focus-visible:outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAsking(false)}
                  className="h-8 rounded-sm px-3 text-[13px] text-pi-body hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRate(
                      "down",
                      [reason, note.trim()].filter(Boolean).join(" · ")
                    );
                    setAsking(false);
                  }}
                  className="h-8 rounded-sm border border-pi-btn-primary-edge bg-pi-btn-fill px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                >
                  Send feedback
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
      {sources.length > 0 && (
        <>
          <span aria-hidden className="mx-1 h-4 w-px bg-pi-line" />
          <SourcesButton sources={sources} onRef={onRef} />
        </>
      )}
      {value === "down" && rated?.feedback?.note !== undefined && (
        <span className="ml-2 text-body-4 text-pi-faint duration-200 animate-in fade-in-0">
          Thanks. This goes to the Neo team.
        </span>
      )}
    </div>
  );
};

export default TurnActions;
