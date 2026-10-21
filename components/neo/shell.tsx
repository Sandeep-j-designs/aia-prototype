import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { onNeoPage } from "@/utils/pages/neo/route";
import { cn } from "@/lib/utils";

type Props = { children: ReactNode };

/**
 * Makes room for the panel on wide screens. At 1440px and up the page moves
 * over and nothing is covered; below that the panel overlays, because at the
 * 1280 operator target the queue cannot give up the panel's 384–560px and still show the
 * columns an approval is decided on.
 */
const NeoShell = ({ children }: Props) => {
  const router = useRouter();
  // On Neo's own pages the panel isn't drawn, so nothing needs making room.
  const neo = useNeo();
  const open = neo.open && !onNeoPage(router.query);
  // Tells page-level chrome (the toaster) that the right edge is taken.
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.dataset.neoOpen = "";
    else delete root.dataset.neoOpen;
    root.style.setProperty("--neo-w", `${neo.panelWidth}px`);
  }, [open, neo.panelWidth]);
  return (
    <div className={cn("min-w-0", open && "min-[1440px]:pr-[var(--neo-w)]")}>
      {children}
    </div>
  );
};

export default NeoShell;
