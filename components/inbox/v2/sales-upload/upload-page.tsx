import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  Lightbulb,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import {
  AR_IMPORT_ACCEPT_VALUE,
  AR_IMPORT_MAX_UPLOAD_SIZE_BYTES,
  AR_IMPORT_SAMPLE_TEMPLATES,
} from "@/config/pages/inbox/sales-upload";
import { sampleCsv } from "@/config/pages/inbox/mock-sales-upload";
import {
  salesUpload,
  useImportTemplates,
  useSalesBatch,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import { ARVoucherImportBatchStatus } from "@/types/pages/inbox/sales-upload";
import {
  formatFileSize,
  getArImportFileType,
} from "@/utils/pages/inbox/sales-upload";
import { DropFileGlyph } from "../bill-splitter/glyphs";
import s from "../bill-splitter/split-dialogs.module.css";
import { T } from "../ui";
import { FlowHeader } from "./common";

/**
 * Upload Invoice — production's BulkUploadPage: one spreadsheet, an optional
 * saved mapping template, then on to mapping. The drop zone is Split
 * Purchases' (dashed edge, file glyph, browse link) rather than production's,
 * so the two upload surfaces in the prototype are one design.
 */

type Props = {
  company: string;
  onMapping: (batchId: string) => void;
  onExit: () => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const cx = (...names: (string | false | undefined)[]) =>
  names
    .filter(Boolean)
    .map((name) => s[name as string])
    .join(" ");

const UploadPage = ({ company, onMapping, onExit, notify }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [templateUuid, setTemplateUuid] = useState("");
  const [pendingId, setPendingId] = useState("");
  const templates = useImportTemplates();
  const pending = useSalesBatch(pendingId);
  const submitting = !!pendingId;

  // Production polls the new batch until the file is read, then moves on.
  useEffect(() => {
    if (!pending) return;
    if (pending.batch.status === ARVoucherImportBatchStatus.PROCESSING) return;
    if (pending.batch.status === ARVoucherImportBatchStatus.FAILED) {
      setPendingId("");
      notify(
        pending.batch.failureMessage ?? "Failed to upload invoice.",
        "error"
      );
      return;
    }
    onMapping(pending.batch.importBatchUuid);
  }, [pending?.batch.status]);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    if (list.length > 1) {
      notify("Only one file can be uploaded at a time.", "error");
      return;
    }
    const next = list[0];
    if (!getArImportFileType(next.name)) {
      notify("Only .xls, .xlsx and .csv files are supported.", "error");
      return;
    }
    if (next.size > AR_IMPORT_MAX_UPLOAD_SIZE_BYTES) {
      notify("This file is larger than 30MB.", "error");
      return;
    }
    setFile(next);
  };

  const onContinue = () => {
    if (!file) {
      notify("Select a file before continuing.", "error");
      return;
    }
    const template = templates.find((t) => t.templateUuid === templateUuid);
    setPendingId(
      salesUpload.createBatch(
        company,
        { name: file.name, size: file.size },
        template ?? null
      )
    );
  };

  /*
    Production links each button to /api/downloads/by-key. There is no file
    store here, so the button writes the first rows of the demo register as a
    CSV in the browser — a real download of the expected column structure.
  */
  const download = (key: (typeof AR_IMPORT_SAMPLE_TEMPLATES)[number]) => {
    const item = key.downloadKey === "arItemInvoiceTemplate";
    const blob = new Blob([sampleCsv(item ? "item" : "accounting")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item
      ? "ar-item-invoice-template.csv"
      : "ar-accounting-invoice-template.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify(`${key.label} template downloaded.`);
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <FlowHeader title="Upload Sales" onClose={onExit} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8">
          <section className="flex flex-col gap-4">
            <h2 className="text-base font-medium text-foreground">Upload</h2>
            <div className={cx("scope")}>
              {file ? (
                <div className="relative">
                  {/* Production: the filled zone stays the target — click to
                      replace the file, × to clear it. */}
                  <div
                    role="button"
                    tabIndex={submitting ? -1 : 0}
                    aria-label="Replace selected file"
                    className={cn(
                      cx("dz"),
                      "cursor-pointer flex-col gap-2 border-primary"
                    )}
                    onClick={() => !submitting && input.current?.click()}
                    onKeyDown={(e) => {
                      if (submitting) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        input.current?.click();
                      }
                    }}
                  >
                    <span
                      className="grid size-10 flex-none place-items-center rounded-md border border-input bg-background text-primary"
                      aria-hidden
                    >
                      <FileSpreadsheet className="size-[18px]" />
                    </span>
                    <p className="max-w-full break-all px-8 text-center text-base font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs font-medium text-secondary-foreground">
                      {formatFileSize(file.size)} • Ready to process
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    aria-label="Remove selected file"
                    disabled={submitting}
                    onClick={() => setFile(null)}
                    className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 rounded-full bg-background text-secondary-foreground"
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Choose file"
                  className={cn(cx("dz", over && "is-over"), "cursor-pointer")}
                  onClick={() => input.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      input.current?.click();
                    }
                  }}
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
                      Drop your invoice file here{" "}
                      <span className={cx("link")}>or click to browse</span>
                    </p>
                    <p className={cx("dz__p")}>CSV, XLS, XLSX • max 30MB</p>
                  </div>
                </div>
              )}
              <input
                ref={input}
                type="file"
                accept={AR_IMPORT_ACCEPT_VALUE}
                hidden
                data-testid="sales-upload-input"
                onChange={(e) => {
                  take(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </section>

          {templates.length > 0 && (
            <section className="flex flex-col gap-2">
              <span className={T.label}>Load a saved mapping template</span>
              <ComboBox
                title="Select a saved template"
                options={templates.map((t) => ({
                  label: t.name,
                  value: t.templateUuid,
                }))}
                selectedValue={templateUuid}
                onChange={(value) =>
                  setTemplateUuid(Array.isArray(value) ? value[0] : value)
                }
                isMultiSelect={false}
                hasSearch={false}
                disabled={submitting}
              />
              <p className={T.sub}>
                If this file matches a structure you&apos;ve mapped before,
                select the template to prefill mapping before preview.
              </p>
            </section>
          )}

          <div className="flex justify-end">
            <Button
              onClick={onContinue}
              disabled={!file}
              loading={submitting}
              className="min-w-48"
            >
              {submitting ? "Preparing upload..." : "Continue to Mapping"}
              <ArrowRight aria-hidden />
            </Button>
          </div>

          <section className="flex flex-col gap-4 rounded-md bg-section p-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Lightbulb className="size-4" aria-hidden />
              Page Tips
            </h2>
            <ul className="list-disc space-y-3 pl-5 text-xs text-secondary-foreground">
              <li>Sync ledgers & customers before upload for auto-matching</li>
              <li>
                Use standard date formats (e.g., DD/MM/YYYY or YYYY-MM-DD)
              </li>
              <li>
                Download a sample template below if you need the expected column
                structure.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <p className={T.value}>
              Don&apos;t have your own file? Download a sample template
            </p>
            <div className="flex flex-wrap gap-3">
              {AR_IMPORT_SAMPLE_TEMPLATES.map((template) => (
                <Button
                  key={template.downloadKey}
                  variant="secondary"
                  onClick={() => download(template)}
                >
                  <Download aria-hidden />
                  {template.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
