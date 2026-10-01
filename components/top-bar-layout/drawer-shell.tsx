import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

/**
 * The right-hand drawer the top bar opens. Production:
 * components/top-bar-layout/drawer-shell.tsx, on AppSheetContent — which
 * offsets the sheet below the top bar. The prototype has no
 * useAppSheetTopOffset, so the offset is the bar's own 50px, written once
 * here.
 */
const TOP_BAR_HEIGHT = 50;

export const TopBarDrawerShell = ({
  open,
  onClose,
  children,
  className,
}: Props) => {
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        overlayStyle={{ top: TOP_BAR_HEIGHT }}
        style={{ top: TOP_BAR_HEIGHT, bottom: 0, height: "auto" }}
        className={cn(
          "flex w-full flex-col gap-0 border-l border-panel-border bg-background p-0 shadow-floating-panel",
          className
        )}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
};

export default TopBarDrawerShell;
