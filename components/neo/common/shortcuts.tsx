import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const KEYS: [string, string[]][] = [
  ["Open or close Neo", ["Ctrl", "J"]],
  ["New chat", ["Ctrl", "Shift", "O"]],
  ["Send", ["Enter"]],
  ["New line", ["Shift", "Enter"]],
  ["Edit your last request", ["↑"]],
  ["Name a vendor or customer", ["@"]],
  ["What Neo can do", ["/"]],
  ["Answer Neo's question", ["1–9"]],
  ["Take the main action (drafts only)", ["Ctrl", "Enter"]],
  ["Stop Neo, close a document, close Neo", ["Esc"]],
  ["This list", ["Ctrl", "/"]],
];

/**
 * Neo's keys, one press away (Ctrl /) instead of a legend under the prompt
 * box. Drawn by whichever Neo is on screen, the page or the panel.
 */
const Shortcuts = () => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neo keyboard shortcuts</DialogTitle>
          <DialogDescription>Press Ctrl / to show this again.</DialogDescription>
        </DialogHeader>
        <ul className="divide-y divide-pi-line">
          {KEYS.map(([what, keys]) => (
            <li key={what} className="flex items-center justify-between gap-4 py-2 text-[13px] text-pi-ink">
              {what}
              <span className="flex flex-none gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="grid h-6 min-w-6 place-items-center rounded-xs border border-pi-line-2 bg-pi-head-bg px-1.5 font-sans text-[11px] font-medium text-pi-ink-2"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
};

export default Shortcuts;
