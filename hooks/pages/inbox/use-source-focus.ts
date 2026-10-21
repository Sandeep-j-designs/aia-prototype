import { useEffect, useState } from "react";
import {
  sourceTargetOf,
  type SourceTarget,
} from "@/utils/pages/inbox/source-field";

/**
 * The review-form field the reviewer is on, as a pointer into the source
 * document.
 *
 * Listens on the document rather than on one form: the AP and AR forms are
 * engines injected into this page and the journal is React, and all three
 * raise ordinary focus events. A pointer press counts too, because the
 * engines' pickers open on press and do not always move focus.
 *
 * Focus that lands outside every form — a picker's list, a dialog, the
 * document viewer itself — leaves the last answer standing, so reaching for a
 * dropdown does not make the highlight blink. A form field with nothing on the
 * page behind it (a ledger, the voucher number) clears it.
 */
export const useSourceFocus = (enabled: boolean) => {
  const [target, setTarget] = useState<SourceTarget | null>(null);

  useEffect(() => {
    if (!enabled) {
      setTarget(null);
      return;
    }
    const read = (event: Event) => {
      const el = event.target instanceof Element ? event.target : null;
      if (!el?.closest(".ap-sheet, .ar-sheet, .jv-form")) return;
      // Inside a form's document pane is the viewer, not a field.
      if (el.closest(".doc-pane, [data-source-viewer]")) return;
      const next = sourceTargetOf(el);
      setTarget((prev) =>
        prev &&
        next &&
        prev.keys.join() === next.keys.join() &&
        prev.lineText === next.lineText
          ? prev
          : next
      );
    };
    document.addEventListener("focusin", read, true);
    document.addEventListener("pointerdown", read, true);
    return () => {
      document.removeEventListener("focusin", read, true);
      document.removeEventListener("pointerdown", read, true);
    };
  }, [enabled]);

  return [target, () => setTarget(null)] as const;
};

export default useSourceFocus;
