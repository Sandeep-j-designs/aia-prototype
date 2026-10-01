import React, { useEffect, useState } from "react";
import {
  endOfMonth,
  format,
  isSameMonth,
  isAfter,
  startOfMonth,
} from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { PERIOD_MIN_YEAR, PERIOD_PRESETS } from "@/config/pages/inbox/gst";
import type { GstPeriod } from "@/types/pages/inbox/gst";
import { formatPeriodLabel } from "@/utils/pages/inbox/gst";

/**
 * The GSTR period picker — production's components/common/period-picker:
 * the six presets down the left, and "Custom" opening a month grid to pick a
 * month or a run of months. A period is always whole months.
 *
 * Production's custom pane shows two financial years side by side; this one
 * shows one calendar year at a time with arrows, which covers the same picks
 * in half the width.
 */

type Props = {
  value: GstPeriod;
  onChange: (period: GstPeriod) => void;
  /** Stretch the trigger to its container (the sheet's Return Period). */
  block?: boolean;
  disabled?: boolean;
};

const sameRange = (a: GstPeriod, b: GstPeriod) =>
  isSameMonth(a.from, b.from) && isSameMonth(a.to, b.to);

const PeriodPicker = ({ value, onChange, block, disabled }: Props) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState<{ from?: Date; to?: Date }>(value);
  const [year, setYear] = useState(value.from.getFullYear());
  const today = new Date();

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    setYear(value.from.getFullYear());
    setCustom(!PERIOD_PRESETS.some((p) => sameRange(p.getValue(today), value)));
  }, [open]);

  const pickMonth = (month: Date) => {
    if (!draft.from || draft.to) return setDraft({ from: month });
    if (isAfter(draft.from, month)) return setDraft({ from: month });
    setDraft({ from: draft.from, to: month });
  };

  const apply = () => {
    if (!draft.from) return;
    onChange({
      from: startOfMonth(draft.from),
      to: endOfMonth(draft.to ?? draft.from),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 min-w-[200px] justify-between gap-3 text-secondary-foreground hover:text-primary",
            block && "w-full"
          )}
        >
          <span className="text-sm font-semibold">
            {formatPeriodLabel(value)}
          </span>
          <Calendar className="h-4 w-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={custom ? "end" : "start"} className="w-auto p-0">
        <div className="flex">
          <div
            role="listbox"
            aria-label="Period presets"
            className="flex w-[180px] flex-none flex-col gap-1 p-2"
          >
            {PERIOD_PRESETS.map((preset) => {
              const range = preset.getValue(today);
              const active = !custom && sameRange(range, value);
              return (
                <button
                  key={preset.label}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(range);
                    setCustom(false);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-9 items-center rounded-md px-3 text-left text-sm",
                    active
                      ? "bg-accent font-semibold text-primary"
                      : "text-foreground hover:bg-section"
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
            <button
              type="button"
              role="option"
              aria-selected={custom}
              onClick={() => setCustom(true)}
              className={cn(
                "flex h-9 items-center rounded-md px-3 text-left text-sm",
                custom
                  ? "bg-accent font-semibold text-primary"
                  : "text-foreground hover:bg-section"
              )}
            >
              Custom
            </button>
          </div>

          {custom && (
            <div className="flex w-[264px] flex-col gap-3 border-l border-neutral-gray p-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous year"
                  disabled={year <= PERIOD_MIN_YEAR}
                  onClick={() => setYear((y) => y - 1)}
                >
                  <ChevronLeft />
                </Button>
                <span className="text-sm font-semibold tabular-nums">
                  {year}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next year"
                  disabled={year >= today.getFullYear()}
                  onClick={() => setYear((y) => y + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, m) => {
                  const month = new Date(year, m, 1);
                  const future = isAfter(month, today);
                  const from = draft.from && startOfMonth(draft.from);
                  const to = draft.to && startOfMonth(draft.to);
                  const edge =
                    (!!from && isSameMonth(month, from)) ||
                    (!!to && isSameMonth(month, to));
                  const inside =
                    !!from &&
                    !!to &&
                    isAfter(month, from) &&
                    isAfter(to, month);
                  return (
                    <button
                      key={m}
                      type="button"
                      disabled={future}
                      aria-pressed={edge}
                      onClick={() => pickMonth(month)}
                      className={cn(
                        "h-9 rounded-md text-sm disabled:cursor-not-allowed disabled:opacity-40",
                        edge
                          ? "bg-primary font-semibold text-primary-foreground"
                          : inside
                            ? "bg-muted text-foreground"
                            : "text-foreground hover:bg-section"
                      )}
                    >
                      {format(month, "MMM")}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end border-t border-neutral-gray pt-3">
                <Button disabled={!draft.from} onClick={apply}>
                  Apply
                </Button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PeriodPicker;
