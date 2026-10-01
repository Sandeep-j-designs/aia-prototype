import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Status } from "./store";

/**
 * The Unified Inbox's presentational vocabulary, expressed in design-system
 * tokens and primitives.
 *
 * Geometry is the Accounts Payable prototype's (Prototypes/Accounts Payable,
 * also embedded at /ap/index.html by ./sheet.tsx) so the Inbox chrome and the
 * bill sheet it wraps read as one screen. Colour is production's token set,
 * with the accessibility overrides marked in styles/globals.css.
 *
 * Nothing here holds state or product logic — it is shape and colour only.
 */

/* ---------------------------------------------------------------- type scale
   Mirrors the .t-* classes in the Accounts Payable prototype. */
export const T = {
  /** .t-title — page heading */
  title: "text-h5 font-medium text-foreground",
  /** .t-section — section heading inside a panel */
  section: "text-label-1 font-semibold text-secondary-foreground",
  /** .t-label — field label */
  label:
    "text-xs font-semibold leading-4 tracking-[-0.12px] text-secondary-foreground",
  /** .t-value — body value */
  value:
    "text-sm font-normal leading-5 tracking-[-0.16px] text-secondary-foreground",
  /**
   * Table cell — 12/16, -0.12px, text-primary.
   *
   * Figma "Label/Label-3/Regular" (24421:72574). The ink is `foreground`, not
   * `secondary-foreground`: cell values are the content of the screen, and the
   * grey belongs to the header that names them.
   */
  cell: "text-label-3 font-normal text-foreground",
  /**
   * Table header cell — 12/16 Medium, no letter-spacing, text-secondary.
   *
   * The Bloocks TableHead (components-table--docs). It replaced Figma's
   * SemiBold +0.12px (24421:72539) on 25 Sep 2026 to match the design system.
   */
  head: "text-label-3 font-medium tracking-normal text-secondary-foreground",
  /** secondary line under a cell or control */
  sub: "text-xs leading-5 text-secondary-foreground",
} as const;

/* --------------------------------------------------------------------- pills
   AP's .pill: 2px 8px, fully round, 11px/600. */
const pillBase = "max-w-full";

/** Figma 603:5002 table badges: 20px tall, caption text, 4px corners. */
export const tablePillClass =
  "gap-1 rounded-[4px] border-0 px-2 py-1 text-caption-1 font-medium leading-3 [&_svg]:size-2.5";

export type PillTone = "info" | "ok" | "warn" | "error" | "neutral";

const pillTone: Record<PillTone, string> = {
  info: "bg-badge-information text-badge-information-foreground",
  ok: "bg-badge-positive text-badge-positive-foreground",
  warn: "bg-badge-notice text-badge-notice-foreground",
  error: "bg-badge-negative text-badge-negative-foreground",
  neutral: "bg-badge-neutral text-badge-neutral-foreground",
};

export const Pill = ({
  tone = "info",
  className,
  children,
  ...props
}: { tone?: PillTone } & React.ComponentProps<typeof Badge>) => (
  // `outline` is the one Badge variant with no ground and no hover of its own —
  // a status pill is a label, not a target, so it must not light up under the
  // cursor the way the default variant does.
  <Badge
    variant="outline"
    className={cn(pillBase, pillTone[tone], className)}
    {...props}
  >
    {children}
  </Badge>
);

/**
 * The status column is the one thing an accountant scans to decide what to
 * open, so the mapping lives in exactly one place.
 */
const STATUS_TONE: Record<Status, PillTone> = {
  Received: "neutral",
  Extracting: "neutral",
  "Needs Review": "info",
  Approved: "ok",
  Failed: "error",
  Duplicate: "warn",
  Deleted: "neutral",
};

export const StatusPill = ({
  status,
  className,
  trailing,
}: {
  status: Status;
  className?: string;
  /** Drawn inside the pill after the word, e.g. a dropdown's chevron. */
  trailing?: React.ReactNode;
}) => (
  // max-w-full with a truncating label, so a narrow Status column ellipses the
  // word inside an intact pill rather than slicing the pill's ground off. The
  // tone survives truncation, and the tone is the part being scanned — which is
  // what lets the column's floor sit below "Needs Review" instead of on it.
  <Pill
    tone={STATUS_TONE[status]}
    className={cn("max-w-full gap-1", className)}
    maxWidth="100%"
    title={status}
    icon={
      status === "Extracting" ? (
        <Loader2
          aria-hidden
          className="size-2.5 flex-none animate-spin motion-reduce:animate-none"
        />
      ) : undefined
    }
  >
    {status}
    {trailing}
  </Pill>
);

/** A count chip on a tab or nav item. */
export const CountPill = ({ children }: { children: React.ReactNode }) => (
  <Pill tone="info" size="sm" className="min-w-5 justify-center tabular-nums">
    {children}
  </Pill>
);

/* ------------------------------------------------------------------ notices
   AP's tinted panel: a ground, a hairline biased to it, and matching ink. */
export type NoticeTone = "info" | "success" | "warning" | "danger";

const noticeTone: Record<NoticeTone, string> = {
  info: "border-neutral-gray bg-accent text-foreground",
  success:
    "border-success-green-border bg-success-green text-success-green-foreground",
  warning: "border-warning-border bg-warning text-warning-foreground",
  danger:
    "border-destructive-foreground/25 bg-destructive text-destructive-foreground",
};

export const Notice = ({
  tone = "info",
  className,
  children,
  ...props
}: { tone?: NoticeTone } & React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "rounded-md border px-4 py-3 text-sm leading-5",
      noticeTone[tone],
      className
    )}
    {...props}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------- spinner */
export const Spinner = ({ className }: { className?: string }) => (
  <Loader2
    aria-hidden
    className={cn(
      "h-3.5 w-3.5 shrink-0 animate-spin text-primary motion-reduce:animate-none",
      className
    )}
  />
);

/* --------------------------------------------------------------------- field
   AP pairs a .t-label with its control and keeps the label slot one height
   whether it holds text or a toggle, so rows stay aligned. */
export const Field = ({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
    <Label htmlFor={htmlFor} className={cn(T.label, "min-h-5")}>
      {label}
    </Label>
    {children}
    {hint}
  </div>
);

/** The red asterisk the sheet puts ahead of a required label. */
export const Req = () => (
  <span className="mr-0.5 text-destructive-foreground" aria-hidden>
    *
  </span>
);

/**
 * A field panel, matching the sheet's own.
 *
 * The bills sheet groups fields into cards — 20px of padding on the section
 * ground, two columns, generous gutters — and the JV form was a flat grid on
 * white beside it. Same shape here, from the token that holds the same value:
 * --section is #FBFBFE, which is the sheet's --bg-primary.
 */
export const FieldCard = ({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={cn("rounded-md bg-section p-5", className)}>
    {title ? <h2 className={cn(T.section, "mb-4")}>{title}</h2> : null}
    <div className="grid grid-cols-1 gap-x-[30px] gap-y-6 sm:grid-cols-2">
      {children}
    </div>
  </section>
);

/**
 * A date, written the way the sheet writes it.
 *
 * `<input type="date">` renders the browser's own control — "05/05/2026" and a
 * platform calendar glyph — which is the single loudest reason the JV form read
 * as a different application to the bill sheet beside it. This shows the
 * sheet's format behind a calendar button and keeps the stored value ISO, which
 * is what the store holds.
 */
export const DateField = ({
  id,
  value,
  onChange,
  disabled,
  className,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  disabled?: boolean;
  /** So a caller can match a surrounding field set — see the AR header card. */
  className?: string;
}) => {
  const parsed = value ? new Date(value) : undefined;
  const valid = !!parsed && !Number.isNaN(parsed.getTime());
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3",
            "text-left text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50",
            "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            className
          )}
        >
          <span className={cn("truncate", !valid && "text-muted-foreground")}>
            {valid ? format(parsed, "do MMMM, yyyy") : "Select date"}
          </span>
          <CalendarIcon className="h-4 w-4 flex-none text-secondary-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={valid ? parsed : undefined}
          defaultMonth={valid ? parsed : undefined}
          // The store keeps dates as yyyy-MM-dd; formatting locally rather than
          // via toISOString avoids the UTC shift turning a date into the one
          // before it for anyone east of Greenwich — which is everyone here.
          onSelect={(d) => d && onChange(format(d, "yyyy-MM-dd"))}
        />
      </PopoverContent>
    </Popover>
  );
};

/** The note that marks a field the accountant has changed. */
export const EditedMark = () => (
  <span className="text-label-3 leading-4 text-warning-foreground">
    Edited by you
  </span>
);

/* -------------------------------------------------------------------- dialog
   Radix gives focus trap, Escape and restore, so the screen no longer keeps
   its own keydown handler for that. */
export const PageDialog = ({
  title,
  description,
  open,
  onClose,
  className,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  open: boolean;
  /** Omit to make the dialog non-dismissible (the launch guide). */
  onClose?: () => void;
  className?: string;
  children: React.ReactNode;
}) => (
  <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
    <DialogContent
      className={cn(
        "max-h-[90vh] max-w-[650px] gap-0 overflow-y-auto rounded-lg border-neutral-gray p-7",
        !onClose && "[&>button]:hidden",
        className
      )}
      onEscapeKeyDown={(e) => !onClose && e.preventDefault()}
      onPointerDownOutside={(e) => !onClose && e.preventDefault()}
      onInteractOutside={(e) => !onClose && e.preventDefault()}
    >
      <DialogHeader className="mb-3">
        <DialogTitle className={T.title}>{title}</DialogTitle>
        {description ? (
          <DialogDescription className={cn(T.value, "pt-2")}>
            {description}
          </DialogDescription>
        ) : null}
      </DialogHeader>
      {children}
    </DialogContent>
  </Dialog>
);

/** The right-hand panel variant — AP's own side surface. */
export const SidePanel = ({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
    <SheetContent
      side="right"
      className="flex w-full flex-col gap-0 overflow-y-auto border-neutral-gray p-7 sm:max-w-[440px]"
    >
      <SheetHeader className="mb-3 space-y-0 text-left">
        <SheetTitle className={T.title}>{title}</SheetTitle>
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
);

/** The Bloocks AmountCell's figure: rupees in en-IN groups, paise small and muted. */
export const AmountText = ({ value }: { value: number }) => {
  const [rupees, paise] = Math.abs(value).toFixed(2).split(".");
  return (
    <>
      {value < 0 && "−"}₹{new Intl.NumberFormat("en-IN").format(Number(rupees))}
      <span className="text-caption-1 text-secondary-foreground">.{paise}</span>
    </>
  );
};

/** The pager's icon button — first, previous, next, last. */
export const PageButton = ({
  label,
  disabled,
  onClick,
  children,
  className,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** For the cohort pager, which wants the brand at low emphasis, not grey. */
  className?: string;
}) => (
  <Button
    variant="ghost"
    size="icon"
    aria-label={label}
    title={label}
    className={cn(
      "text-secondary-foreground hover:bg-section hover:text-primary",
      className
    )}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </Button>
);
