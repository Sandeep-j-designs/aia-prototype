import { Sparkle } from "@/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The one AI mark (7 Oct 2026): the brand-indigo sparkles, drawn duotone on
 * a soft brand tile, on a value the AI decided and nobody has confirmed or
 * changed yet.
 *
 * When it is used:
 * - A value the AI *chose* gets it: a voucher type, ledger, item, HSN, column
 *   mapping, bank categorisation or bill-split boundary.
 * - Values copied off the document (numbers, dates, amounts, GSTIN) do not;
 *   the document beside them is their source. Nor do values worked out by a
 *   fixed rule, such as a due date from the credit period.
 * - The mark goes the moment the value is edited or picked by hand, and it
 *   is never drawn on a posted record.
 * - The reason is one hover or focus away, on the mark itself.
 *
 * The AP/AR engine sheets draw the same tile and glyph with `.ai-mark` (see
 * `aiMark` in public/{ap,ar}/index.html) so the two worlds look the same.
 *
 * The tooltip primitives are used directly, not the shared message Tooltip:
 * that one wraps its trigger in an inline span, whose line box set the mark
 * a few pixels above the text beside it.
 */
export function AiMark({
  reason,
  className,
  size = 14,
}: {
  /** Why the AI chose it. Shown on hover/focus and read by screen readers. */
  reason?: string;
  className?: string;
  /** The glyph; the tile is 6px larger. */
  size?: number;
}) {
  const label = reason ? `Suggested by AI: ${reason}` : "Suggested by AI";
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span
            role="img"
            tabIndex={0}
            aria-label={label}
            style={{ width: size + 6, height: size + 6 }}
            className={cn(
              "inline-flex flex-none cursor-help items-center justify-center rounded-[5px] bg-pi-brand-tint text-pi-brand outline-none transition-shadow hover:shadow-[inset_0_0_0_1px_var(--pi-brand-border)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              className
            )}
          >
            <Sparkle size={size} strokeWidth={1.75} aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[320px]">
          <span className="font-semibold">Suggested by AI</span>
          {reason ? <span> — {reason}</span> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
