import React from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { importBatchStatusConfig } from "@/config/pages/inbox/sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  type ResponseARVoucherImportPreviewRow,
} from "@/types/pages/inbox/sales-upload";
import {
  getPreviewStatusLabel,
  getPreviewStatusTone,
} from "@/utils/pages/inbox/sales-upload";
import { Pill, T } from "../ui";

/**
 * The band across the top of each upload step: title and file on the left,
 * Close on the right. The Inbox's detail header geometry (px-6, py-3, a
 * hairline under it); the words are production's BulkUploadPageHeader.
 */
export const FlowHeader = ({
  title,
  fileName,
  onClose,
  closeDisabled,
}: {
  title: string;
  fileName?: string;
  onClose: () => void;
  closeDisabled?: boolean;
}) => (
  <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-neutral-gray bg-background px-6 py-3">
    <h1 className={cn(T.title, "text-2xl")}>{title}</h1>
    {fileName ? (
      <span
        className={cn(
          T.cell,
          "max-w-[360px] truncate rounded-full bg-accent px-3 py-1 font-medium"
        )}
        title={fileName}
      >
        {fileName}
      </span>
    ) : null}
    <span className="flex-1" />
    <Button
      variant="ghost"
      onClick={onClose}
      disabled={closeDisabled}
      className="text-secondary-foreground hover:text-foreground"
    >
      <X aria-hidden />
      Close
    </Button>
  </div>
);

/** A batch's status, in production's words and the prototype's tones. */
export const BatchStatusPill = ({
  status,
}: {
  status: ARVoucherImportBatchStatus;
}) => {
  const config = importBatchStatusConfig[status];
  return (
    <Pill
      tone={config.tone}
      size="sm"
      icon={
        status === ARVoucherImportBatchStatus.PROCESSING ? (
          <Loader2
            aria-hidden
            className="size-2.5 animate-spin motion-reduce:animate-none"
          />
        ) : undefined
      }
    >
      {config.label}
    </Pill>
  );
};

/**
 * A preview row's status. Rows with issues open a card listing them, as
 * production's ErrorHoverCard does on the status cell.
 */
export const RowStatusPill = ({
  row,
}: {
  row: ResponseARVoucherImportPreviewRow;
}) => {
  const pill = (
    <Pill tone={getPreviewStatusTone(row)} size="sm">
      {getPreviewStatusLabel(row)}
    </Pill>
  );
  if (!row.issuePayload.length) return pill;
  return (
    <HoverCard openDelay={100} closeDelay={0}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`${getPreviewStatusLabel(row)}: ${row.issuePayload
            .map((issue) => issue.message)
            .join(" ")}`}
        >
          {pill}
        </button>
      </HoverCardTrigger>
      <IssueCardContent issues={row.issuePayload} />
    </HoverCard>
  );
};

export const IssueCardContent = ({
  issues,
}: {
  issues: ResponseARVoucherImportPreviewRow["issuePayload"];
}) => (
  <HoverCardContent align="end" side="top" className="w-80 p-0">
    <div className="border-b border-neutral-gray px-3 py-2">
      <span className={cn(T.sub, "font-semibold text-foreground")}>
        {issues.length === 1 ? "1 issue" : `${issues.length} issues`}
      </span>
    </div>
    <ul className="flex flex-col gap-2 px-3 pb-3 pt-2">
      {issues.map((issue, i) => (
        <li key={i} className="flex gap-2">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-1.5 flex-none rounded-full",
              issue.severity === "error"
                ? "bg-destructive-foreground"
                : "bg-warning-foreground"
            )}
          />
          <span className={cn(T.sub, "text-foreground")}>{issue.message}</span>
        </li>
      ))}
    </ul>
  </HoverCardContent>
);
