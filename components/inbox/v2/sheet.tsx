import React, { useEffect, useRef } from "react";
import ApSheet from "@/components/inbox/v2/ap-sheet";
import { apDocumentFor } from "@/config/pages/inbox/ap-document";
import {
  Item,
  Form,
  companyOf,
  fileUrl,
  getState,
  update,
  updatePosted,
} from "./store";
export default function Sheet({
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
      The sheet now runs in this document rather than an iframe, so both ends
      of the protocol are this window. It still goes over postMessage: the
      sheet's half is written against `parent`, which is `window` when there is
      no frame, and both guards still hold — ev.source is this window and the
      origin is our own. Keeping the message boundary also keeps the seam
      honest, since the engine remains a separate unit from the React tree.
    */
    const send = (type: string, payload?: unknown, source = "aia-inbox") =>
      window.postMessage({ source, type, payload }, location.origin);
    onReady((type) => send(type));
    const listener = (ev: MessageEvent) => {
      if (ev.source !== window || ev.origin !== location.origin) return;
      const m = ev.data;
      if (m?.source === "aia-ap" && m.type === "ready" && !seeded.current) {
        seeded.current = true;
        const i = latest.current;
        send(
          "context",
          {
            company: companyOf(i.company)?.name,
            form: i.form,
            sheet: i.sheet,
            // No externalPreview. It used to be sent unconditionally, and the
            // sheet answered it by hiding its own document pane and splitter
            // and dropping its form's width cap — which is why this screen
            // stopped looking like the bill review. The sheet keeps its layout
            // now, and a real upload reaches its pane via "preview" below.
            manual: i.manual || !!i.file.blobId,
            route: i.route,
            fileName: i.file.name,
          },
          "aia-inbox-v2"
        );
        const original = {
          ...i.original,
          bill: {
            ...i.original.bill,
            voucherNo: i.form.voucherNo,
            supplierInvoiceNo: i.form.invoiceNo,
            billDate: i.form.date,
            dueDate: i.form.due,
            gstReg: i.form.gst,
            costCentre: i.form.costCentre,
            flagged: [],
            items: i.form.lines.map((l) => ({
              desc: l.description,
              ledger: l.ledger,
              amount: l.amount,
            })),
            // A hand-raised bill borrows a seeded item's scaffolding, not its
            // tax lines.
            taxes: i.created ? {} : i.original.bill?.taxes || {},
            subTotal: i.form.lines.reduce((s, l) => s + l.amount, 0),
            grandTotal: i.amount,
          },
          vendor: i.form.party,
        };
        // A hand-raised bill has nothing read off a document: without a seed
        // the sheet stays the blank form it is standalone, and raises no
        // "Bill data extracted" toast.
        if (!i.created) send("seed", apDocumentFor(original));
        /*
          Real uploaded bytes, as their own message rather than a field on
          `context`. Resolving the blob URL is async and `seed` has to follow
          `context` immediately, so awaiting inside that pair would let seed
          overtake context. A later message has no ordering to break: the pane
          is showing its sample facsimile until this lands, then swaps.
        */
        if (i.file.blobId)
          void fileUrl(i.file.blobId).then((url) => {
            if (url) send("preview", { url, fileName: i.file.name });
          });
      }
      if (m?.source === "aia-ap-v2" && m.type === "edited") {
        const i = getState().items.find((x) => x.id === latest.current.id);
        if (i)
          (i.status === "Approved" ? updatePosted : update)(i.id, {
            edited: [...new Set([...i.edited, m.payload.field])],
            firstAttempt: false,
          });
      }
      if (m?.source === "aia-ap-v2" && m.type === "snapshot") {
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
      if (m?.source === "aia-ap-v2" && m.type === "approved")
        approveRef.current();
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
    // Seed exactly once per mounted item; draft changes must not reseed the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <ApSheet
      status={item.status}
      // A new bill, or the same bill re-routed, needs a fresh evaluation of the
      // engine — it boots against the DOM and holds the bill in closure state.
      key={`${item.company}-${item.id}-${item.route}`}
      itemId={`${item.company}-${item.id}-${item.route}`}
      noDocument={item.created}
    />
  );
}
