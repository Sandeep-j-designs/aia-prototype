import React from "react";
import {
  ChevronRight,
  ListFilter,
  type IconComponent,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The one empty state (8 Oct 2026, user: "make the empty states more graphical
 * and impressive with useful information").
 *
 * The graphic is the information. An empty register or tab is rarely empty
 * because nothing exists — the documents are one stage back, waiting. So the
 * state draws the stages a document moves through (Received → Needs review →
 * Posted), with live counts, the stage on screen raised and its count zero,
 * and the action on the stage that actually holds documents. Nodes are plain
 * boxes joined by the ledger rule; the icons are the product's own set.
 *
 * Three uses:
 * - `flow`: the stages, for a list that fills from an earlier one.
 * - `icon`: one glyph tile, for a list with nothing before it (a master, a
 *   statement log).
 * - `filters` + `onClear`: something exists, the search or filters hide it.
 *   The active filters are listed, with one way out.
 */

export type FlowStep = {
  label: string;
  count: number;
  icon: IconComponent;
  /** The stage this screen lists. */
  current?: boolean;
};

export type ActiveFilter = { label: string };

type Props = {
  title: string;
  body?: React.ReactNode;
  flow?: FlowStep[];
  icon?: IconComponent;
  /** Present: the filtered-to-nothing variant. */
  filters?: ActiveFilter[];
  onClear?: () => void;
  actions?: React.ReactNode;
  /** Pin to the left of a wide, sideways-scrolling table. Default true. */
  sticky?: boolean;
  className?: string;
};

const fmt = (n: number) => n.toLocaleString("en-IN");

const Flow = ({ steps }: { steps: FlowStep[] }) => (
  <ol
    aria-label="Where your documents are"
    className="flex flex-wrap items-center justify-center gap-y-3"
  >
    {steps.map((step, i) => {
      const Icon = step.icon;
      const empty = step.count === 0;
      return (
        <li
          key={step.label}
          className="flex items-center animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both duration-300 motion-reduce:animate-none"
          style={{ animationDelay: `${i * 70}ms` }}
        >
          {i > 0 ? (
            // The ledger rule joining two stages, with the direction of
            // travel on it.
            <span aria-hidden className="relative mx-2 flex w-10 items-center sm:w-14">
              <span className="h-px w-full bg-[var(--pi-rule-ledger)]" />
              <ChevronRight className="absolute left-1/2 size-3.5 -translate-x-1/2 bg-background text-pi-faint" />
            </span>
          ) : null}
          <div
            aria-current={step.current ? "step" : undefined}
            className={cn(
              "flex min-w-[132px] items-center gap-3 rounded-lg border px-3.5 py-3",
              step.current
                ? "border-pi-brand-border bg-pi-brand-tint shadow-[0_0_0_3px_var(--pi-brand-tint)]"
                : "border-pi-line bg-background"
            )}
          >
            <span
              className={cn(
                "grid size-8 flex-none place-items-center rounded-md",
                step.current
                  ? "bg-background text-pi-brand"
                  : "bg-pi-fill text-pi-body"
              )}
            >
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "fig text-[22px] font-semibold leading-7 tracking-[-0.01em]",
                  step.current
                    ? "text-pi-brand"
                    : empty
                      ? "text-pi-faint"
                      : "text-pi-ink"
                )}
              >
                {fmt(step.count)}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[12px] leading-4",
                  step.current ? "font-medium text-pi-brand" : "text-pi-body"
                )}
              >
                {step.label}
              </span>
            </span>
          </div>
        </li>
      );
    })}
  </ol>
);

export const EmptyState = ({
  title,
  body,
  flow,
  icon: Icon,
  filters,
  onClear,
  actions,
  sticky = true,
  className,
}: Props) => {
  const filtered = !!filters;
  const Glyph = Icon ?? (filtered ? ListFilter : undefined);
  return (
    <div
      role="status"
      className={cn(
        "flex w-full max-w-[100vw] flex-col items-center px-6 text-center",
        sticky && "sticky left-0",
        flow ? "py-12" : "py-14",
        className
      )}
    >
      {flow?.length ? (
        <Flow steps={flow} />
      ) : Glyph ? (
        <span
          aria-hidden
          className="grid size-12 place-items-center rounded-lg border border-pi-line bg-pi-head-bg text-pi-body shadow-contact animate-in fade-in-0 zoom-in-95 duration-300 motion-reduce:animate-none"
        >
          <Glyph className="size-5" />
        </span>
      ) : null}

      <h2
        className={cn(
          "text-[16px] font-semibold leading-6 text-pi-ink",
          flow?.length || Glyph ? "mt-6" : null
        )}
      >
        {title}
      </h2>
      {body ? (
        <p className="mt-1.5 max-w-[440px] text-[13px] leading-5 text-pi-body">
          {body}
        </p>
      ) : null}

      {filters?.length ? (
        <ul
          aria-label="Active filters"
          className="mt-4 flex max-w-[560px] flex-wrap justify-center gap-1.5"
        >
          {filters.map((f) => (
            <li
              key={f.label}
              className="rounded-xs border border-pi-line-2 bg-background px-2 py-0.5 text-[12px] leading-4 text-pi-body"
            >
              {f.label}
            </li>
          ))}
        </ul>
      ) : null}

      {actions || onClear ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {onClear ? (
            <Button variant="outline" onClick={onClear}>
              Clear filters
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
};

export default EmptyState;
