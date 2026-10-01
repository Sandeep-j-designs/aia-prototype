import React from "react";
import { Cloud, CloudAlert, CloudUpload } from "lucide-react";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";

type Props = {
  status: string;
  syncDate?: string;
  syncProduct?: string;
  syncError?: string;
};

/**
 * production's components/common/table-column/sync-status.tsx: an icon for
 * synced, syncing and failed, nothing for not synced, and a tooltip that says
 * when or why. Drawn as Banking draws it (transactions-table.tsx).
 */
const SyncStatus = ({ status, syncDate, syncProduct, syncError }: Props) => {
  const product = syncProduct || "Tally";
  const config =
    status === "synced"
      ? {
          Icon: Cloud,
          ink: "text-primary",
          title: `Synced to ${product}`,
          detail: syncDate
            ? new Date(syncDate).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })
            : "",
        }
      : status === "in_progress" || status === "in_progress_initiated"
        ? {
            Icon: CloudUpload,
            ink: "text-warning-foreground",
            title: `Syncing to ${product}...`,
            detail: "Updates will appear shortly",
          }
        : status === "event_creations_failed" ||
            status === "event_processing_failed"
          ? {
              Icon: CloudAlert,
              ink: "text-destructive-foreground",
              title: "Failed to Sync",
              detail: syncError ?? "",
            }
          : null;
  if (!config) return null;
  const { Icon, ink, title, detail } = config;
  return (
    <Tooltip
      message={
        <span className="flex flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-secondary-foreground">{detail}</span>
        </span>
      }
    >
      <Icon aria-label={title} className={cn("h-4 w-4", ink)} />
    </Tooltip>
  );
};

export default SyncStatus;
