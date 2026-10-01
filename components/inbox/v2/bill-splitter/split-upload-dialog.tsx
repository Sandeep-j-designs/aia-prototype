import React, { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DropFileGlyph, PdfGlyph } from "./glyphs";
import s from "./split-dialogs.module.css";

/**
 * Split a multi-bill PDF — Bill Upload's upload dialog in its split mode,
 * carried over as it looks there: the dashed drop zone, the transfer list
 * with a bar per file, and the hand-off to Bill Uploads a beat after the
 * last file lands. There is no submit button; dropping is the act.
 */

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The PDFs that finished uploading — each becomes a packet. */
  onUploaded: (files: File[]) => void;
};

type Transfer = { id: number; file: File; pct: number };

/** Bill Upload's size label: 41.0 KB, 1.8 MB. */
const kb = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;

/*
  Bill Upload's wire: a fast office link, 1.6–4 MB/s up, never quicker than
  0.8s so the bar is seen to fill, never longer than 6s.
  DEV: replace with the real upload's progress events.
*/
const transferMs = (bytes: number) => {
  const kbps = 1600 + Math.random() * 2400;
  return Math.min(6, Math.max(0.8, bytes / 1024 / kbps)) * 1000;
};
/** The pause after the last bar fills, before the dialog lifts off. */
const HAND_OFF_MS = 480;

const cx = (...names: (string | false | undefined)[]) =>
  names
    .filter(Boolean)
    .map((name) => s[name as string])
    .join(" ");

const SplitUploadDialog = ({ open, onOpenChange, onUploaded }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const seq = useRef(0);
  const handed = useRef(false);

  // A fresh dialog each time it opens.
  useEffect(() => {
    if (open) {
      setTransfers([]);
      handed.current = false;
    }
  }, [open]);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    const files = [...list];
    // Split asks for PDFs and means it: anything else is turned away at the
    // door, with the count, rather than failed three steps later.
    const pdfs = files.filter((f) => /\.pdf$/i.test(f.name));
    const turned = files.length - pdfs.length;
    if (turned)
      toast.error(
        `${turned} ${turned === 1 ? "file is" : "files are"} not a PDF. Split Purchases takes PDFs only — use Upload Purchases instead.`
      );
    if (!pdfs.length) return;
    handed.current = false;
    const added = pdfs.map((file) => ({ id: ++seq.current, file, pct: 0 }));
    setTransfers((current) => [...current, ...added]);
    added.forEach((transfer) => {
      const ms = transferMs(transfer.file.size);
      const start = performance.now();
      const tick = (now: number) => {
        const pct = Math.min(100, ((now - start) / ms) * 100);
        setTransfers((current) =>
          current.map((t) => (t.id === transfer.id ? { ...t, pct } : t))
        );
        if (pct < 100) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };

  const onWire = transfers.filter((t) => t.pct < 100).length;

  // The hand-off: once nothing is on the wire, a beat for the last bar to be
  // read, then the dialog lifts off onto Bill Uploads.
  useEffect(() => {
    if (!open || !transfers.length || onWire || handed.current) return;
    handed.current = true;
    const timer = window.setTimeout(() => {
      const files = transfers.map((t) => t.file);
      onUploaded(files);
      onOpenChange(false);
      window.setTimeout(
        () =>
          toast(
            `${files.length} ${files.length === 1 ? "PDF" : "PDFs"} uploaded. Finding the bills in Bill Uploads.`
          ),
        460
      );
    }, HAND_OFF_MS);
    return () => window.clearTimeout(timer);
  }, [open, onWire, transfers.length]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cx("scope", "scrim")}>
          <DialogPrimitive.Content
            className={cx("modal")}
            aria-describedby={undefined}
            // Focus lands on the dialog, not its first control: a ringed ×
            // on open reads as a selection nobody made.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
            }}
          >
            <div className={cx("modal__head")}>
              <DialogPrimitive.Title className={cx("modal__title")}>
                Split Purchases
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className={cx("modal__x")}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
            <div className={cx("modal__body")}>
              <div
                className={cx("dz", over && "is-over")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  take(e.dataTransfer.files);
                }}
              >
                <span className={cx("dz__ico")} aria-hidden>
                  <DropFileGlyph />
                </span>
                <div className={cx("dz__txt")}>
                  <p className={cx("dz__h")}>
                    Drop your PDFs or{" "}
                    <button
                      type="button"
                      className={cx("link")}
                      onClick={() => input.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                  <p className={cx("dz__p")}>
                    Each PDF can hold many bills. We&apos;ll split them and send
                    each bill to extraction
                  </p>
                  <p className={cx("dz__p")}>PDF only</p>
                </div>
              </div>
              <input
                ref={input}
                type="file"
                multiple
                accept=".pdf,application/pdf"
                hidden
                onChange={(e) => {
                  take(e.target.files);
                  e.target.value = "";
                }}
              />
              {!!transfers.length && (
                <div className={cx("ublock")}>
                  <h3 className={cx("ublock__h")}>
                    {onWire
                      ? `Uploading ${onWire} of ${transfers.length} ${transfers.length === 1 ? "file" : "files"}`
                      : `${transfers.length} ${transfers.length === 1 ? "file" : "files"} uploaded`}
                  </h3>
                  <div className={cx("ulist")}>
                    {transfers.map((t) => {
                      const done = t.pct >= 100;
                      return (
                        <div key={t.id} className={cx("uprow")}>
                          <span className={cx("ftile")} aria-hidden>
                            <PdfGlyph />
                          </span>
                          <div className={cx("uprow__body")}>
                            <p className={cx("uprow__name")}>{t.file.name}</p>
                            <span className={cx("bar")}>
                              <span
                                className={cx("bar__fill")}
                                style={{ transform: `scaleX(${t.pct / 100})` }}
                              />
                            </span>
                            <p className={cx("uprow__meta")}>
                              <span className={cx("num")}>
                                {kb((t.file.size * t.pct) / 100)} of{" "}
                                {kb(t.file.size)}
                              </span>
                            </p>
                          </div>
                          <span
                            className={cn(cx("uprow__st"), done && s["is-ok"])}
                          >
                            {done ? "Uploaded" : `${Math.round(t.pct)}%`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className={cx("modal__foot")}>
              <p className={cx("modal__note")}>
                You&apos;ll review every split before any purchase voucher is
                created.
              </p>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default SplitUploadDialog;
