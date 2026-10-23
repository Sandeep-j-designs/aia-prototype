import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/types/pages/guide";

type Box = { top: number; left: number; width: number; height: number };

type Props = {
  step: TourStep;
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
};

const CARD_WIDTH = 320;
/** Gap between the highlighted element and the card, and off the viewport edge. */
const GAP = 12;
const EDGE = 16;

/**
 * Finds a step's anchor.
 *
 * One document-wide lookup is enough, including for the AP bill sheet: that
 * markup is injected into this document rather than framed, so its panes carry
 * `data-guide-id` like anything else and are found the same way.
 */
export const findAnchor = (anchor: string) => {
  // The newest one on screen: a sheet leaving and the one arriving can
  // share an anchor for a moment, and hidden copies have no box.
  const all = [
    ...document.querySelectorAll<HTMLElement>(`[data-guide-id="${anchor}"]`),
  ].filter((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 0 && r.height > 0 && !el.closest("[hidden],[aria-hidden=true]")
    );
  });
  return all[all.length - 1] ?? null;
};

const same = (a: Box | null, b: Box | null) =>
  a === b ||
  (!!a &&
    !!b &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

/**
 * Follows the step's anchor.
 *
 * The element is found by `data-guide-id` and re-measured on a short interval
 * as well as on scroll and resize. The interval is the part that matters: the
 * screens this runs over open sheets, swap tabs and settle animations, and
 * none of those fire an event this component could listen for. Measuring a
 * single rect four times a second is cheaper than the observers it replaces,
 * and state is only pushed when the numbers actually move.
 *
 * Returns null — not a zero box — when the anchor is absent, which is how the
 * caller knows to centre the card instead of pointing it at the origin.
 */
export const useAnchorBox = (anchor?: string) => {
  const [box, setBox] = useState<Box | null>(null);

  useEffect(() => {
    if (!anchor) {
      setBox(null);
      return;
    }
    let scrolled = false;
    const measure = () => {
      const el = findAnchor(anchor);
      if (!el) {
        setBox((prev) => (prev === null ? prev : null));
        return;
      }
      if (!scrolled) {
        scrolled = true;
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
      const r = el.getBoundingClientRect();
      const next = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };
      setBox((prev) => (same(prev, next) ? prev : next));
    };
    measure();
    const timer = window.setInterval(measure, 250);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [anchor]);

  return box;
};

/** Places the card beside the anchor, flipping and clamping to stay on screen. */
export const place = (
  box: Box,
  height: number,
  placement: TourStep["placement"],
  width = CARD_WIDTH
) => {
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const clamp = (value: number, max: number) =>
    Math.max(EDGE, Math.min(value, max - EDGE));

  const fitsBelow = box.top + box.height + GAP + height <= vh - EDGE;
  const fitsAbove = box.top - GAP - height >= EDGE;
  const fitsRight = box.left + box.width + GAP + width <= vw - EDGE;

  let side = placement ?? "bottom";
  if (side === "bottom" && !fitsBelow) side = fitsAbove ? "top" : "bottom";
  if (side === "top" && !fitsAbove) side = "bottom";
  if (side === "right" && !fitsRight) side = "left";
  if (side === "left" && box.left - GAP - width < EDGE) side = "right";

  if (side === "left" || side === "right") {
    const left =
      side === "right" ? box.left + box.width + GAP : box.left - GAP - width;
    /* A pane taller than the window has no meaningful top to sit level with —
       aligning to it puts the card over the page's own header. Those get the
       middle of the screen instead, which is where the eye is anyway. */
    const tall = box.height > vh * 0.8;
    return {
      top: clamp(tall ? vh / 2 - height / 2 : box.top, vh - height),
      left: clamp(left, vw - width),
    };
  }

  /* Horizontally the card hangs from whichever edge of the anchor keeps it on
     screen — left-aligned normally, right-aligned for a control that already
     sits near the right edge, which is where the toolbar buttons live. */
  const leftAligned = box.left;
  const rightAligned = box.left + box.width - width;
  const left = leftAligned + width > vw - EDGE ? rightAligned : leftAligned;
  return {
    top:
      side === "bottom" ? box.top + box.height + GAP : box.top - GAP - height,
    left: clamp(left, vw - width),
  };
};

const TourPopover = ({ step, index, total, onBack, onNext, onSkip }: Props) => {
  const box = useAnchorBox(step.anchor);
  const card = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(180);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    if (card.current) setHeight(card.current.offsetHeight);
  }, [step, box]);

  if (!mounted) return null;

  const position = box
    ? place(box, height, step.placement)
    : {
        top: Math.max(EDGE, window.innerHeight / 2 - height / 2),
        left: Math.max(EDGE, window.innerWidth / 2 - CARD_WIDTH / 2),
      };
  const last = index === total - 1;

  return createPortal(
    <>
      {/* The highlight is a ring on the real element, not a cut-out over a
          dimmed page: the step usually asks the user to look at the control
          rather than to press it, and dimming everything else makes the rest
          of the screen unreadable while they do. */}
      {box && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[65] rounded-md ring-2 ring-primary ring-offset-2 ring-offset-background"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
          }}
        />
      )}
      <div
        ref={card}
        role="dialog"
        aria-label={step.title}
        className={cn(
          "fixed z-[70] rounded-lg border border-panel-border bg-background p-4",
          "shadow-floating-panel"
        )}
        style={{ top: position.top, left: position.left, width: CARD_WIDTH }}
      >
        <button
          type="button"
          onClick={onSkip}
          aria-label="End guide"
          className="absolute right-3 top-3 rounded-sm text-secondary-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-caption-1 font-semibold uppercase tracking-[0.08em] text-primary">
          Step {index + 1} of {total}
        </p>
        <h2 className="mt-2 pr-6 text-label-1 font-semibold text-foreground">
          {step.title}
        </h2>
        <p className="mt-1 text-sm leading-5 text-secondary-foreground">
          {step.body}
        </p>
        {step.hint && (
          /* The step is waiting on the user, so it says what it is waiting
             for. Next stays put beside it — the hint is the shorter way
             through, not the only one. */
          <p className="mt-3 rounded-md bg-accent px-2.5 py-1.5 text-xs font-medium text-accent-foreground">
            {step.hint}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <Button variant="link-secondary" className="px-0" onClick={onSkip}>
            Skip tour
          </Button>
          <span className="flex-1" />
          {index > 0 && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button onClick={onNext}>{last ? "Finish" : "Next"}</Button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default TourPopover;
