import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { onNeoChatPage } from "@/utils/pages/neo/route";
import { Pause, Play } from "@/components/icons";
import { useStore } from "@/components/inbox/v2/store";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import NeoMark from "./common/neo-mark";

/**
 * Neo, visible in the screens it is working in — not only in its panel.
 *
 * Rows it is on are marked in whatever list is showing (working, done, held),
 * and while a run is live a strip at the foot of the workspace says what it is
 * doing, how far it has got, and lets you pause it without opening the panel.
 *
 * Rows are marked by attribute rather than by prop so no list has to know Neo
 * exists: any row carrying `data-item-id` takes part. The marks are re-applied
 * after every store change, because a list re-rendering its rows is exactly
 * what happens while Neo works.
 *
 * DEV: production would render the mark from the row's own state (a
 * `neoState` field on the list item); delete the effect below on transplant.
 */
const NeoPresence = () => {
  const neo = useNeo();
  const state = useStore();
  const router = useRouter();

  useEffect(() => {
    const apply = () =>
      document
        .querySelectorAll<HTMLElement>("[data-item-id]")
        .forEach((row) => {
          const mark = neo.presence[row.dataset.itemId || ""];
          if (mark) row.dataset.neo = mark;
          else delete row.dataset.neo;
        });
    apply();
    const frame = window.requestAnimationFrame(apply);
    return () => window.cancelAnimationFrame(frame);
  }, [neo.presence, state]);

  const live = neo.liveStatus;
  // Neo's chat page shows the run in the thread itself; no strip over it.
  if (!live || onNeoChatPage(router.query)) return null;
  const pct = live.progress
    ? Math.min(
        100,
        Math.round((live.progress.done / live.progress.total) * 100)
      )
    : undefined;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 z-40 flex w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 overflow-hidden rounded-xl border border-surface-stroke bg-surface py-2 pl-2 pr-2 text-topnav-avatar-text shadow-popover-shadow duration-300 animate-in fade-in-0 slide-in-from-bottom-4 motion-reduce:animate-none"
      // Centred in the space the panel leaves, not under it.
      style={{
        left: neo.open ? `calc((100vw - ${neo.panelWidth}px) / 2)` : "50%",
      }}
    >
      <NeoMark className="h-6 w-6" live={!neo.paused} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-3 font-semibold">
          {neo.paused ? "Paused · " : ""}
          {live.text}
        </span>
        {pct !== undefined && (
          <span className="mt-1 block h-0.5 overflow-hidden rounded-full bg-surface-stroke">
            <span
              className="block h-full rounded-full bg-border transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={neo.paused ? neo.resume : neo.pause}
        className="flex h-7 flex-none items-center gap-1 rounded-lg border border-surface-stroke px-2 text-label-3 font-semibold hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {neo.paused ? (
          <Play className="h-3 w-3 fill-current" />
        ) : (
          <Pause className="h-3 w-3 fill-current" />
        )}
        {neo.paused ? "Resume" : "Pause"}
      </button>
      {!neo.open && (
        <button
          type="button"
          onClick={() => neo.setOpen(true)}
          className="h-7 flex-none rounded-lg bg-background px-2.5 text-label-3 font-semibold text-surface hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          Open Neo
        </button>
      )}
    </div>
  );
};

export default NeoPresence;
