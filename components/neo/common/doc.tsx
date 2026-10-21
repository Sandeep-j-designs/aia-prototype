import React, { useState } from "react";
import { ChevronDown } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { RuleHit } from "@/types/pages/neo/recon";

/**
 * The parts Neo's documents are written with (20 Oct 2026). A document in
 * the canvas is a page, not a card: no box, no grey title bar repeating the
 * header. It opens on what it found, in Neo's reading voice; sections are
 * headed by a rule, and rows carry a status only when they differ from the
 * rest of their section.
 *
 * Three shapes use these: a Ledger (rows of money, exceptions first), a
 * Rulebook (terms and what they mean), and a Statement (a record someone
 * signs).
 */

export type Tone = "ok" | "warn" | "bad" | "wait" | "muted";

const DOT: Record<Tone, string> = {
  ok: "bg-pi-success-dot",
  warn: "bg-pi-warning-dot",
  bad: "bg-pi-danger-dot",
  wait: "bg-pi-line-strong",
  muted: "bg-pi-faint",
};

const INK: Record<Tone, string> = {
  ok: "text-pi-success",
  warn: "text-pi-warning",
  bad: "text-pi-danger",
  wait: "text-pi-body",
  muted: "text-pi-body",
};

/** The page itself: white, a reading measure, room at the edges. */
export const DocPage = ({ children }: { children: React.ReactNode }) => (
  <article className="mx-auto max-w-[760px] px-10 pb-16 pt-8 text-pi-ink max-sm:px-4">
    {children}
  </article>
);

/**
 * What the document found, said first, in Neo's voice. `context` is the
 * one line that pins it down: client, outlet, period, account.
 */
export const DocLede = ({
  children,
  context,
}: {
  children: React.ReactNode;
  context?: React.ReactNode;
}) => (
  <header className="mb-8">
    <p className="neo-reading text-[19px] leading-[1.5] text-pi-ink [&_strong]:font-semibold">
      {children}
    </p>
    {context && <p className="mt-2 text-body-4 text-pi-body">{context}</p>}
  </header>
);

/**
 * The whole in one strip: each part's share, then a legend that doubles as
 * the totals. Only for documents that are a count of outcomes.
 */
export const DocBar = ({
  parts,
}: {
  parts: { tone: Tone; label: string; value: number; figure?: string }[];
}) => {
  const shown = parts.filter((p) => p.value > 0);
  const total = shown.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div className="mb-10">
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
        {shown.map((p) => (
          <span
            key={p.label}
            className={cn("h-full", DOT[p.tone])}
            style={{ flexGrow: p.value / total, minWidth: 6 }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
        {shown.map((p) => (
          <li
            key={p.label}
            className="flex items-center gap-2 text-body-4 text-pi-body"
          >
            <span
              className={cn("h-2 w-2 flex-none rounded-full", DOT[p.tone])}
            />
            {p.label}
            <span className="font-semibold tabular-nums text-pi-ink">
              {p.figure ?? p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * A section: a heading and its total on one line, a firm rule under it,
 * then the rows. Collapsible when `defaultOpen` is given.
 */
export const DocSection = ({
  title,
  aside,
  tone,
  defaultOpen,
  children,
  className,
}: {
  title: React.ReactNode;
  aside?: React.ReactNode;
  /** Colours the aside when it is the section's verdict. */
  tone?: Tone;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) => {
  const collapsible = defaultOpen !== undefined;
  const [open, setOpen] = useState(defaultOpen ?? true);
  const head = (
    <>
      <h3 className="flex-1 text-[15px] font-semibold leading-6">{title}</h3>
      {aside && (
        <span
          className={cn(
            "text-body-4 tabular-nums",
            tone ? cn("font-medium", INK[tone]) : "text-pi-body"
          )}
        >
          {aside}
        </span>
      )}
      {collapsible && (
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-none text-pi-faint transition-transform",
            !open && "-rotate-90"
          )}
        />
      )}
    </>
  );
  return (
    <section className={cn("mt-10 first:mt-0", className)}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-baseline gap-3 border-b border-pi-ink pb-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          {head}
        </button>
      ) : (
        <div className="flex items-baseline gap-3 border-b border-pi-ink pb-2">
          {head}
        </div>
      )}
      {open && children}
    </section>
  );
};

/** A status word, drawn only where a row differs from its section. */
export const Mark = ({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap text-body-4 font-medium",
      INK[tone]
    )}
  >
    <span className={cn("h-1.5 w-1.5 flex-none rounded-full", DOT[tone])} />
    {children}
  </span>
);

/**
 * Why Neo did something, said plainly. The rule's ID stays out of the
 * reading — it's in the tooltip for whoever audits the engine. A soft rule
 * asks for a look, so it reads amber; the rest are explanation.
 */
export const Notes = ({
  hits,
  className,
}: {
  hits: RuleHit[];
  className?: string;
}) =>
  hits.length ? (
    <ul className={cn("flex flex-col gap-0.5", className)}>
      {hits.map((h, i) => (
        <li
          key={`${h.rule}-${i}`}
          title={h.rule}
          className={cn(
            "text-body-4 leading-5",
            h.severity === "soft" ? "text-pi-warning" : "text-pi-body"
          )}
        >
          {h.text}
        </li>
      ))}
    </ul>
  ) : null;

/**
 * The standing rules behind a document, at its foot: one short paragraph
 * each, under a plain heading. Not a callout; it's the small print.
 */
export const DocFootnotes = ({
  title = "How Neo reads this",
  items,
}: {
  title?: string;
  items: RuleHit[];
}) => (
  <footer className="mt-12 border-t border-pi-line pt-4">
    <p className="text-body-4 font-semibold text-pi-ink-2">{title}</p>
    <ul className="mt-1.5 flex flex-col gap-1">
      {items.map((h) => (
        <li
          key={h.rule}
          title={h.rule}
          className="text-body-4 leading-5 text-pi-body"
        >
          {h.text}
        </li>
      ))}
    </ul>
  </footer>
);

/** Ledger table cells: a quiet head, hairline rows, figures right. */
export const TH =
  "py-2 pr-4 text-left text-body-4 font-medium text-pi-body whitespace-nowrap last:pr-0";
export const TD = "py-2.5 pr-4 align-top text-[13px] leading-5 last:pr-0";
export const NUM = "text-right tabular-nums whitespace-nowrap";
export const ROW = "border-b border-pi-line last:border-b-0";
