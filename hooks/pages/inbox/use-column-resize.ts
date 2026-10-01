import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
  clampWidth,
  readWidths,
  sizeColumns,
  type ColumnSizes,
} from "@/components/inbox/v2/table-sizing";

type UseColumnResizeArgs = {
  /** The columns on screen, in order. */
  shown: string[];
  sizes: ColumnSizes;
  /** sessionStorage key for the user's own widths. */
  storageKey: string;
};

/**
 * Column resizing for a fixed-layout table, by the rules in
 * components/inbox/v2/TABLE-RESIZING.md: automatic widths fill the measured
 * container between each column's min and max; the first drag snapshots them
 * and from then on only the dragged column moves; Escape, pointer cancel or
 * losing window focus puts a drag back; only user-chosen widths are stored.
 *
 * The Inbox grid carries the same logic inline in workspace.tsx, where it is
 * tangled with pinning and column order. This is that logic without them, for
 * tables that have neither.
 */
export const useColumnResize = ({
  shown,
  sizes,
  storageKey,
}: UseColumnResizeArgs) => {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);
  const [avail, setAvail] = useState<number | null>(null);
  const element = useRef<HTMLDivElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setWidths(readWidths(JSON.parse(saved), sizes));
    } catch {}
  }, [storageKey]);

  // Written only between drags: a width mid-drag is not a choice yet.
  useEffect(() => {
    if (resizing) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(widths));
    } catch {}
  }, [widths, resizing, storageKey]);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      observer.current?.disconnect();
    },
    []
  );

  /** A callback ref, so the measurement follows the scroller as it mounts. */
  const gridRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    element.current = el;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    observer.current = ro;
    setAvail(el.clientWidth);
  }, []);

  const colWidths = sizeColumns(shown, avail, widths, sizes);
  const colWidth = (column: string) =>
    colWidths[column] ?? sizes[column].preferred;
  const tableWidth =
    SELECT_WIDTH +
    ACTIONS_WIDTH +
    shown.reduce((sum, column) => sum + colWidth(column), 0);

  /** Keyboard steps, double-click and Enter: one column, everything else held. */
  const resizeColumn = (column: string, value: number) =>
    setWidths((previous) => ({
      ...previous,
      ...colWidths,
      [column]: clampWidth(column, value, sizes),
    }));

  const startResize = (column: string, event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    cleanupRef.current?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerId = event.pointerId;
    const before = widths;
    const frozen = { ...widths, ...colWidths };
    const startX = event.clientX;
    const startScroll = element.current?.scrollLeft || 0;
    const oldCursor = document.body.style.cursor;
    const oldSelect = document.body.style.userSelect;
    let frame = 0;
    let latest = colWidth(column);
    setResizing(column);
    setWidths(frozen);
    const publish = () => {
      frame = 0;
      setWidths({ ...frozen, [column]: latest });
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      latest = clampWidth(
        column,
        frozen[column] +
          e.clientX -
          startX +
          (element.current?.scrollLeft || 0) -
          startScroll,
        sizes
      );
      if (!frame) frame = requestAnimationFrame(publish);
    };
    const cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
      document.body.style.cursor = oldCursor;
      document.body.style.userSelect = oldSelect;
      cleanupRef.current = null;
    };
    const finish = (cancelled: boolean) => {
      cleanup();
      setWidths(cancelled ? before : { ...frozen, [column]: latest });
      setResizing(null);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointerId) finish(false);
    };
    const cancel = () => finish(true);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(true);
      }
    };
    cleanupRef.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return {
    gridRef,
    gridElement: element,
    colWidth,
    tableWidth,
    resizing,
    /** Whether any width is the user's rather than automatic. */
    isManual: Object.keys(widths).length > 0,
    resizeColumn,
    startResize,
  };
};
