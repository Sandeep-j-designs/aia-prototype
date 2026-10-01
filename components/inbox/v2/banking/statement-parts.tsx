import React from "react";
import {
  CircleAlert,
  CircleCheck,
  CirclePause,
  Info,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import type { Statement } from "@/types/pages/inbox/banking";
import { PageDialog, Pill, T, type PillTone } from "@/components/inbox/v2/ui";

/**
 * A statement's status, resolved the way production does it
 * (utils/pages/bank/statement.ts): the extraction workflow's stage wins when
 * there is one, the file's own status otherwise.
 */

/** production's PAUSED_TOOLTIP_MESSAGE */
const PAUSED_TOOLTIP =
  "A technical issue occurred while processing this statement. Team is looking into it.";

type Resolved = {
  label: string;
  tone: PillTone;
  icon: "check" | "spin" | "alert" | "pause";
  /** An Info glyph after the pill, with this as its tooltip. */
  info?: string;
  /** The pill itself carries this tooltip (a failure's reason). */
  failure?: string;
};

export const resolveStatementStatus = (statement: Statement): Resolved => {
  const { workflowStage, enrichmentPercentage, workflowError } = statement;
  const stage =
    workflowError === "internal_error" ? "extraction_failed" : workflowStage;
  switch (stage) {
    case "extracted":
      break;
    case "extraction_failed":
      return { label: "Failed To Extract", tone: "error", icon: "alert" };
    case "paused":
      return {
        label: "Paused",
        tone: "warn",
        icon: "pause",
        info: PAUSED_TOOLTIP,
      };
    case "enriching":
      return {
        label:
          typeof enrichmentPercentage === "number"
            ? `Enriching ${Math.max(0, Math.min(100, Math.round(enrichmentPercentage)))}%`
            : "Enriching",
        tone: "info",
        icon: "spin",
      };
    case "not_found":
    case "extracting":
      return { label: "Extracting", tone: "info", icon: "spin" };
    default:
      if (statement.status === "file_hitl_rejected")
        return {
          label: "Failed To Extract",
          tone: "error",
          icon: "alert",
          failure: statement.statusMessage ?? undefined,
        };
      if (statement.status !== "file_hitl_success")
        return { label: "Processing", tone: "info", icon: "spin" };
  }
  const duplicates = statement.fileMetadata?.noOfDuplicates ?? 0;
  return {
    label: "Extracted",
    tone: "ok",
    icon: "check",
    info: duplicates
      ? `No. of Duplicates: ${duplicates}\nNo. of Lines Extracted: ${statement.fileMetadata?.noOfLinesExtracted ?? 0}`
      : undefined,
  };
};

const ICONS = {
  check: <CircleCheck aria-hidden className="size-2.5 flex-none" />,
  alert: <CircleAlert aria-hidden className="size-2.5 flex-none" />,
  pause: <CirclePause aria-hidden className="size-2.5 flex-none" />,
  spin: (
    <Loader2
      aria-hidden
      className="size-2.5 flex-none animate-spin motion-reduce:animate-none"
    />
  ),
};

export const StatementStatusPill = ({
  statement,
}: {
  statement: Statement;
}) => {
  const status = resolveStatementStatus(statement);
  const pill = (
    <Pill tone={status.tone} size="sm" icon={ICONS[status.icon]}>
      {status.label}
    </Pill>
  );
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {status.failure ? (
        <Tooltip message={status.failure}>{pill}</Tooltip>
      ) : (
        pill
      )}
      {status.info ? (
        <Tooltip
          message={<span className="whitespace-pre-line">{status.info}</span>}
        >
          <Info
            aria-label={status.info}
            className="h-3.5 w-3.5 flex-none cursor-help text-secondary-foreground"
          />
        </Tooltip>
      ) : null}
    </span>
  );
};

/** "1 Sep 2026 - 30 Sep 2026", or a dash before the period is known. */
export const periodOf = (statement: Statement) => {
  const fmt = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return statement.statementStartDate && statement.statementEndDate
    ? `${fmt(statement.statementStartDate)} - ${fmt(statement.statementEndDate)}`
    : "-";
};

/** Production lets a statement go only once extraction has finished. */
export const canDeleteStatement = (statement: Statement) =>
  statement.status === "file_hitl_success" ||
  statement.status === "file_hitl_rejected";

/** production's "Confirm Delete Statement" modal. */
export const DeleteStatementDialog = ({
  statement,
  onClose,
  onConfirm,
}: {
  statement: Statement | null;
  onClose: () => void;
  onConfirm: (statement: Statement) => void;
}) => (
  <PageDialog
    open={!!statement}
    title="Confirm Delete Statement"
    onClose={onClose}
    className="max-w-[460px]"
  >
    <p className={T.value}>
      You are about to delete a statement that contains categorized
      transactions. Deleting it will permanently remove its categorization data.
    </p>
    <p className={cn(T.value, "mt-2")}>Are you sure you want to proceed?</p>
    <div className="mt-6 flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button isDestructive onClick={() => statement && onConfirm(statement)}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
    </div>
  </PageDialog>
);
