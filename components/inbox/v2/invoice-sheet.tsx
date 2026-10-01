import React, { useEffect, useRef } from "react";
import ArSheet from "@/components/inbox/v2/ar-sheet";
import { arDocumentFor } from "@/config/pages/inbox/ar-invoice";
import { Item, Form, companyOf, getState, update, updatePosted } from "./store";

/**
 * The inbox's half of the AR protocol — the mirror of ./sheet.tsx, which does
 * the same job for the bills sheet.
 *
 * Both sheets run in this document rather than in an iframe, so both ends of
 * the protocol are this window. It still goes over postMessage: each sheet's
 * half is written against `parent`, which is `window` when there is no frame,
 * and both guards still hold — ev.source is this window and the origin is our
 * own. Keeping the message boundary also keeps the seam honest, since the
 * engines remain separate units from the React tree.
 *
 * The one thing to know about the pairing: AP answers on `aia-ap` / `aia-ap-v2`
 * and AR on `aia-ar` / `aia-ar-v2`. Two sheets can be alive in the same
 * document while a route switch settles, and a shared source name would have
 * the bill's snapshot landing on the invoice's item.
 */
export default function InvoiceSheet({
  item,
  onApproved,
  allowEdits = false,
  onReady,
}: {
  item: Item;
  onApproved: () => void;
  /** Lets a posted voucher take drafts while it is deliberately open for edit. */
  allowEdits?: boolean;
  onReady: (send: (type: string) => void) => void;
}) {
  const seeded = useRef(false),
    latest = useRef(item),
    approveRef = useRef(onApproved),
    allowEditsRef = useRef(allowEdits);
  latest.current = item;
  approveRef.current = onApproved;
  allowEditsRef.current = allowEdits;

  useEffect(() => {
    /*
      Addressed to the AR sheet by name. The bills sheet answers `aia-inbox` and
      this one answers `aia-inbox-ar`, because for as long as a route switch is
      settling both engines are listening on this one document — and under a
      shared name the bills engine ran the invoice's seed through its own
      extraction against a DOM that had already been unmounted under it.
    */
    const send = (type: string, payload?: unknown, source = "aia-inbox-ar") =>
      window.postMessage({ source, type, payload }, location.origin);
    onReady((type) => send(type));

    const listener = (ev: MessageEvent) => {
      if (ev.source !== window || ev.origin !== location.origin) return;
      const m = ev.data;

      if (m?.source === "aia-ar" && m.type === "ready" && !seeded.current) {
        seeded.current = true;
        const i = latest.current;
        send(
          "context",
          {
            company: companyOf(i.company)?.name,
            form: i.form,
            sheet: i.sheet,
            manual: i.manual || !!i.file.blobId,
            route: i.route,
            fileName: i.file.name,
          },
          "aia-inbox-ar-v2"
        );
        /*
          No `preview` message follows this pair, and there is nothing missing.
          The AP sheet owns a document pane and has to be handed the uploaded
          bytes to show in it; this sheet has none — standalone, an invoice is
          raised rather than read — so the inbox keeps drawing the source
          document itself, beside the sheet, in components/inbox/v2/preview.
        */
        // A hand-raised invoice has nothing read off a document to seed it
        // with, so the sheet is told to start blank instead.
        send(
          i.created ? "blank" : "seed",
          i.created ? undefined : arDocumentFor(i)
        );
      }

      if (m?.source === "aia-ar-v2" && m.type === "edited") {
        const i = getState().items.find((x) => x.id === latest.current.id);
        if (i)
          (i.status === "Approved" ? updatePosted : update)(i.id, {
            edited: [...new Set([...i.edited, m.payload.field])],
            firstAttempt: false,
          });
      }

      if (m?.source === "aia-ar-v2" && m.type === "snapshot") {
        const i = getState().items.find((x) => x.id === latest.current.id);
        if (!i || (i.status === "Approved" && !allowEditsRef.current)) return;
        const form = m.payload.form as Form;
        const write = i.status === "Approved" ? updatePosted : update;
        write(
          i.id,
          { sheet: m.payload.sheet, form, amount: m.payload.amount },
          "Inbox Review Draft Updated"
        );
      }

      if (m?.source === "aia-ar-v2" && m.type === "approved")
        approveRef.current();
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
    // Seed exactly once per mounted item; draft changes must not reseed the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ArSheet
      // A new invoice, or the same invoice re-routed, needs a fresh evaluation
      // of the engine — it boots against the DOM and holds the invoice in
      // closure state.
      key={`${item.company}-${item.id}-${item.route}`}
      itemId={`${item.company}-${item.id}-${item.route}`}
    />
  );
}
