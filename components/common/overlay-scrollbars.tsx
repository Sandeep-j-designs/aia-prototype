import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  /** The scroller these bars stand in for. Give it `scrollbar-hide`. */
  scroller: React.RefObject<HTMLElement | null>;
  className?: string;
};

type Thumb = { size: number; offset: number } | null;

/** Inset of each bar from the scroller's edges. */
const EDGE = 4;
/** Room left at the far end of each bar so the two never cross. */
const CORNER = 12;
const MIN_THUMB = 32;
const IDLE_MS = 900;

/**
 * Thin scrollbars that float over the content instead of reserving a strip
 * of their own: a native bar took a full band under the last row, which read
 * as an empty block between the table and the pager.
 *
 * Render this as a sibling of the scroller inside a `relative` parent whose
 * box matches the scroller's. The bars show while the pointer is over the
 * scroller, while it scrolls, and while a thumb is dragged. The track lets
 * pointer events through to the rows; only the thumb takes them.
 */
const OverlayScrollbars = ({ scroller, className }: Props) => {
  const [x, setX] = useState<Thumb>(null);
  const [y, setY] = useState<Thumb>(null);
  const [hovered, setHovered] = useState(false);
  const [moving, setMoving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const idle = useRef<number>();

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const axis = (client: number, total: number, position: number): Thumb => {
      if (total - client < 1) return null;
      const track = client - EDGE * 2 - CORNER;
      const size = Math.max(MIN_THUMB, (client / total) * track);
      const offset = (position / (total - client)) * (track - size);
      return { size, offset };
    };
    const same = (a: Thumb, b: Thumb) =>
      a === b ||
      (!!a &&
        !!b &&
        Math.abs(a.size - b.size) < 0.5 &&
        Math.abs(a.offset - b.offset) < 0.5);
    const nextX = axis(el.clientWidth, el.scrollWidth, el.scrollLeft);
    const nextY = axis(el.clientHeight, el.scrollHeight, el.scrollTop);
    setX((prev) => (same(prev, nextX) ? prev : nextX));
    setY((prev) => (same(prev, nextY) ? prev : nextY));
  }, [scroller]);

  const bound = useRef<HTMLElement | null>(null);
  const unbind = useRef<(() => void) | null>(null);
  useEffect(() => {
    // Every render of the owner: the content may have changed size.
    measure();
    const el = scroller.current;
    if (el === bound.current) return;
    unbind.current?.();
    unbind.current = null;
    bound.current = el;
    if (!el) return;
    const onScroll = () => {
      measure();
      setMoving(true);
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(() => setMoving(false), IDLE_MS);
    };
    const onEnter = () => setHovered(true);
    const onLeave = () => setHovered(false);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(el);
    window.addEventListener("resize", measure);
    unbind.current = () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  });
  useEffect(
    () => () => {
      unbind.current?.();
      window.clearTimeout(idle.current);
    },
    []
  );

  /** Drag a thumb: pointer travel maps onto scroll travel along its axis. */
  const drag =
    (axis: "x" | "y") => (event: React.PointerEvent<HTMLDivElement>) => {
      const el = scroller.current;
      const thumb = axis === "x" ? x : y;
      if (!el || !thumb || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      setDragging(true);
      const start = axis === "x" ? event.clientX : event.clientY;
      const from = axis === "x" ? el.scrollLeft : el.scrollTop;
      const client = axis === "x" ? el.clientWidth : el.clientHeight;
      const total = axis === "x" ? el.scrollWidth : el.scrollHeight;
      const track = client - EDGE * 2 - CORNER;
      const ratio = (total - client) / Math.max(1, track - thumb.size);
      const move = (e: PointerEvent) => {
        const delta = (axis === "x" ? e.clientX : e.clientY) - start;
        if (axis === "x") el.scrollLeft = from + delta * ratio;
        else el.scrollTop = from + delta * ratio;
      };
      const end = () => {
        setDragging(false);
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    };

  const shown = hovered || moving || dragging;
  const thumbClass = cn(
    "pointer-events-auto absolute rounded-full bg-pi-line-strong transition-[opacity,background-color] duration-150 hover:bg-pi-faint",
    dragging && "bg-pi-faint",
    shown ? "opacity-100" : "opacity-0 hover:opacity-100"
  );

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 z-30", className)}
    >
      {x && (
        <div
          className={cn(thumbClass, "h-1.5")}
          style={{ bottom: EDGE, left: EDGE + x.offset, width: x.size }}
          onPointerDown={drag("x")}
        />
      )}
      {y && (
        <div
          className={cn(thumbClass, "w-1.5")}
          style={{ right: EDGE, top: EDGE + y.offset, height: y.size }}
          onPointerDown={drag("y")}
        />
      )}
    </div>
  );
};

export default OverlayScrollbars;
