import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { useOptionalNeo } from "@/hooks/pages/neo/use-neo";
import { onNeoChatPage, onNeoPage } from "@/utils/pages/neo/route";
import { cn } from "@/lib/utils";
import NeoMark from "./neo-mark";

type Props = { className?: string };

/**
 * Neo's button in the app top bar. Registering tells the panel a launcher is
 * on screen, so the edge tab it shows on bare screens (the full-screen
 * review) stays out of the way here.
 */
const NeoLauncher = ({ className }: Props) => {
  const neo = useOptionalNeo();
  const router = useRouter();
  // Inside Neo the button has no panel to open; it takes you to Neo's
  // prompt box instead.
  const onPage = onNeoPage(router.query);
  const register = neo?.registerLauncher;
  useEffect(() => register?.(), [register]);
  if (!neo) return null;
  return (
    <button
      type="button"
      aria-label="Ask Neo"
      aria-pressed={onPage || neo.open}
      title="Ask Neo (Ctrl J)"
      onClick={async () => {
        if (!onPage) return neo.setOpen(!neo.open);
        if (!onNeoChatPage(router.query))
          await router.push("/inbox?module=NEO");
        window.setTimeout(
          () => document.getElementById("neo-composer")?.focus(),
          60
        );
      }}
      className={cn(
        "flex h-8 shrink-0 items-center gap-2 rounded-lg px-1.5 text-label-2 font-normal transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-topnav-text",
        className,
        // The bar is dark here, so on reads as the bar's raised fill.
        (onPage || neo.open) && "bg-surface-muted"
      )}
    >
      {/* No spinner here (23 Oct 2026): the chat already shows Neo at work. */}
      <NeoMark className="h-5 w-5 rounded-md" />
      <span className="hidden sm:inline">Neo</span>
      {neo.busy && <span className="sr-only">Neo is working</span>}
    </button>
  );
};

export default NeoLauncher;
