import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusPill } from "./ui";
import type { Item } from "./store";
import { AP_SHEET_VERSION } from "@/components/inbox/v2/ap-sheet-version";
import { supersedeSheets } from "@/components/inbox/v2/sheet-generation";
import { asset } from "@/lib/base-path";
import { cn } from "@/lib/utils";

/**
 * The bills review sheet, mounted into the inbox's OWN document.
 *
 * It used to be an <iframe>. The sheet carries ten <dialog>s, and a dialog
 * opened with showModal() renders in the top layer of its own document — inside
 * an iframe that is the iframe's box, so "Create Vendor" was centred on the
 * frame, clipped by it, and could not overlay the inbox's header or footer.
 * In this document the same dialog centres on the viewport and covers the page.
 *
 * The three assets come from scripts/build-ap-sheet.cjs, which splits
 * public/ap/index.html — still the source of truth, still opens standalone:
 *
 *   sheet.css   the sheet's CSS with every selector scoped under .ap-sheet, so
 *               its `:root` tokens and `body` ground cannot reach the app's
 *   sheet.html  the markup, injected as-is
 *   sheet.js    the engine, wrapped in one function scope per evaluation
 *
 * DEV: on transplant this is the seam to replace. Production should render the
 * bill form as React components against the same endpoints; this keeps the
 * shipped AP sheet byte-identical in the meantime, which no hand-port of an
 * 11k-line engine could promise.
 */

type Props = {
  /** Remount key material — a new bill needs a fresh engine evaluation. */
  itemId: string;
  status: Item["status"];
  /**
   * A bill raised by hand has no document behind it, so the sheet's own
   * document pane and splitter go and the form has the width to itself.
   */
  noDocument?: boolean;
};

const CSS_ID = "ap-sheet-css";

const ApSheet = ({ itemId, status, noDocument }: Props) => {
  const host = useRef<HTMLDivElement>(null);
  const [statusHost, setStatusHost] = useState<HTMLElement | null>(null);
  const [markup, setMarkup] = useState<string | null>(null);

  // Mount the shared status badge beside the filename in the embedded viewer.
  useEffect(() => {
    const name = host.current?.querySelector<HTMLElement>("#preview-name");
    if (!name) return;
    const slot = document.createElement("span");
    slot.style.cssText = "flex-shrink:0;margin-right:auto;display:inline-flex";
    const previousFlex = name.style.flex;
    name.style.flex = "0 1 auto";
    name.after(slot);
    setStatusHost(slot);
    return () => {
      name.style.flex = previousFlex;
      slot.remove();
    };
  }, [markup]);

  // The stylesheet is document-wide and identical for every bill, so it is
  // added once and never removed — re-adding it per bill would restyle the
  // whole screen on every navigation.
  useEffect(() => {
    if (document.getElementById(CSS_ID)) return;
    const link = document.createElement("link");
    link.id = CSS_ID;
    link.rel = "stylesheet";
    link.href = asset(`/ap/sheet.css?v=${AP_SHEET_VERSION}`);
    document.head.append(link);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch(asset(`/ap/sheet.html?v=${AP_SHEET_VERSION}`))
      .then((r) => r.text())
      .then((html) => {
        if (!cancelled) setMarkup(html);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Markup first, then the engine: it boots against the DOM on evaluation, so a
  // script appended before the markup exists would find none of its own nodes.
  useEffect(() => {
    if (!markup || !host.current) return;
    const w = window as unknown as {
      AP_PARAMS: Record<string, string>;
    };
    /*
      There is no `mode` here any more. It used to carry "ap" | "ar", and the
      engine never read it — it queries AP_PARAMS for `inboxv2` and `dev` and
      nothing else — so an AR document opened the bill form verbatim, asking
      for a Supplier Invoice No against a vendor typeahead. AR has its own
      surface now (components/inbox/v2/ar-sheet); this sheet is the AP route's
      alone, and the two are addressed by name — see invoice-sheet.tsx.
    */
    w.AP_PARAMS = {
      embed: "1",
      inboxv2: "1",
      item: itemId,
    };
    /*
      Stamp a generation before the engine evaluates.

      Opening a bill evaluates the engine, and an evaluation cannot be undone:
      removing the <script> element below drops the tag, not the listeners it
      registered on window and document. Paging through bills therefore left
      one live engine per bill, all bound to the same ids in the same document,
      and every one of them answered the next seed — a new bill raised one
      toast per bill previously opened, which is what read as notifications
      firing at random.

      The engine's integration block reads this and stands down when it no
      longer matches, so only the newest evaluation drives the sheet. It stands
      the AR engines down too; see ./sheet-generation.
    */
    supersedeSheets();
    const script = document.createElement("script");
    // The version is what actually busts the cache; the item is there so the
    // request is legible in the network panel next to the bill it belongs to.
    script.src = asset(
      `/ap/sheet.js?v=${AP_SHEET_VERSION}&item=${encodeURIComponent(itemId)}`
    );
    document.body.append(script);
    return () => {
      script.remove();
    };
  }, [markup, itemId]);

  return (
    <>
      <div
        ref={host}
        className={cn(
          "ap-sheet min-h-0 flex-1 overflow-auto",
          noDocument && "[&_.doc-pane]:!hidden [&_.splitter]:!hidden"
        )}
        // The sheet's own markup, verbatim. It is generated from a file in this
        // repo, never from user or network content.
        dangerouslySetInnerHTML={markup ? { __html: markup } : undefined}
      />
      {statusHost &&
        createPortal(
          <StatusPill status={status} className="shrink-0" />,
          statusHost
        )}
    </>
  );
};

export default ApSheet;
