import React from "react";
import { Button } from "@/components/ui/button";
import { useSalesBatch } from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import { T } from "../ui";
import { FlowHeader } from "./common";
import MappingPage from "./mapping-page";
import PreviewPage from "./preview-page";
import UploadPage from "./upload-page";

export type SalesUploadStep = "upload" | "mapping" | "preview";

type Props = {
  step: SalesUploadStep;
  /** The import batch being mapped or previewed. Absent on the upload step. */
  batchId?: string;
  company: string;
  /** Move between steps. Every step is a URL, so Back works. */
  onNavigate: (step: SalesUploadStep, batchId?: string) => void;
  /** Leave the flow for the Sales register, on the given tab. */
  onExit: (tab?: "all" | "uploads") => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

/**
 * Upload Sales — production's AR bulk upload (pages/accounts-receivable/
 * bulk-upload/*), as three steps of the Sales module: Upload Invoice → Map
 * Fields → Preview. State is the shared import-batch store, so the
 * Uploaded Invoice tab sees every batch these steps create or change.
 */
const SalesUpload = ({
  step,
  batchId,
  company,
  onNavigate,
  onExit,
  notify,
}: Props) => {
  const entry = useSalesBatch(batchId);

  if (step === "upload")
    return (
      <UploadPage
        company={company}
        onMapping={(id) => onNavigate("mapping", id)}
        onExit={() => onExit("uploads")}
        notify={notify}
      />
    );

  if (!entry || entry.companyId !== company)
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <FlowHeader title="Upload Sales" onClose={() => onExit("uploads")} />
        <div className="m-auto flex max-w-md flex-col items-center gap-3 p-14 text-center">
          <h2 className={T.title}>This upload isn&apos;t here any more</h2>
          <p className={cn(T.value)}>
            Uploads live for this session only in the prototype. Start a new one
            from Upload Sales.
          </p>
          <Button variant="secondary" onClick={() => onExit("uploads")}>
            Go to Uploaded Invoices
          </Button>
        </div>
      </div>
    );

  if (step === "mapping")
    return (
      <MappingPage
        entry={entry}
        onPreview={() => onNavigate("preview", entry.batch.importBatchUuid)}
        onExit={onExit}
        notify={notify}
      />
    );

  return (
    <PreviewPage
      entry={entry}
      onEditMapping={() => onNavigate("mapping", entry.batch.importBatchUuid)}
      onExit={onExit}
      notify={notify}
    />
  );
};

export default SalesUpload;
