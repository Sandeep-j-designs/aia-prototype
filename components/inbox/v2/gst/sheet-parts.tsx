import React, { useRef, useState } from "react";
import { Info, RefreshCw, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import { GST_MAX_FILE_SIZE } from "@/config/pages/inbox/gst";
import { Pill, Spinner, T, type PillTone } from "@/components/inbox/v2/ui";

/**
 * The reconciliation sheet's two building blocks: the drop zone both upload
 * cards use, and the status row each 2B fetch, 2B file and PR file becomes.
 */

type DropZoneProps = {
  title: string;
  tooltip: string;
  /** The lines under the title — formats, size. */
  hint: React.ReactNode;
  extensions: string[];
  onFiles: (files: File[]) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  /** Production's compact PR card stacks the icon over the title. */
  stacked?: boolean;
  testId?: string;
};

/**
 * An upload card: production's accent card with a dashed edge added, so it
 * reads as a target. Click to browse, or drop files on it.
 */
export const DropZone = ({
  title,
  tooltip,
  hint,
  extensions,
  onFiles,
  onError,
  disabled,
  stacked,
  testId,
}: DropZoneProps) => {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const ok = Array.from(list).filter((file) => {
      const name = file.name.toLowerCase();
      if (!extensions.some((ext) => name.endsWith(ext))) {
        onError(
          `${file.name}: Invalid file type. Only ${extensions.join(", ")} are allowed.`
        );
        return false;
      }
      if (file.size > GST_MAX_FILE_SIZE) {
        onError(`${file.name}: File size exceeds 20MB limit.`);
        return false;
      }
      return true;
    });
    if (ok.length) onFiles(ok);
    if (input.current) input.current.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={title}
      data-testid={testId}
      onClick={() => !disabled && input.current?.click()}
      onKeyDown={(e) => {
        if (disabled || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        input.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-accent px-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        stacked ? "py-4" : "py-6",
        disabled
          ? "cursor-not-allowed opacity-60"
          : "cursor-pointer hover:border-primary",
        over && "border-primary bg-muted"
      )}
    >
      <div
        className={cn("flex items-center gap-2", stacked && "flex-col gap-1.5")}
      >
        <Upload className="h-3.5 w-3.5 text-primary" aria-hidden />
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{title}</span>
          <span onClick={(e) => e.stopPropagation()}>
            <Tooltip message={tooltip}>
              <Info className="h-3 w-3 text-primary" aria-label={tooltip} />
            </Tooltip>
          </span>
        </span>
      </div>
      <div className="flex flex-col items-center">{hint}</div>
      <input
        ref={input}
        type="file"
        multiple
        accept={extensions.join(",")}
        className="hidden"
        disabled={disabled}
        onChange={(e) => take(e.target.files)}
      />
    </div>
  );
};

type StatusItemProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  /** Under the title: a count, a date, or the error. */
  detail?: React.ReactNode;
  status: { label: string; tone: PillTone };
  busy?: boolean;
  /** The row is in trouble: the detail line reads as an error. */
  error?: boolean;
  onRetry?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
};

/** One upload or fetch, with its state as a Pill and its actions. */
export const StatusItem = ({
  icon: Icon,
  title,
  detail,
  status,
  busy,
  error,
  onRetry,
  onDelete,
  onClick,
}: StatusItemProps) => (
  <div
    className={cn(
      "grid w-full grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-3 rounded-lg border px-3 py-2",
      error
        ? "border-destructive-foreground/25 bg-destructive"
        : "border-neutral-gray bg-section"
    )}
  >
    <span className="grid h-8 w-8 place-items-center rounded-md border border-neutral-gray bg-background">
      {busy ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <Icon
          className={cn(
            "h-4 w-4",
            error ? "text-destructive-foreground" : "text-primary"
          )}
        />
      )}
    </span>
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className="flex min-w-0 flex-col items-start text-left disabled:cursor-default"
    >
      <span className="flex w-full min-w-0 items-center gap-2">
        <span
          className="truncate text-sm font-medium text-foreground"
          title={title}
        >
          {title}
        </span>
        <Pill tone={status.tone} className="flex-none">
          {status.label}
        </Pill>
      </span>
      {detail ? (
        <span
          className={cn(
            T.sub,
            "truncate",
            error && "whitespace-normal text-destructive-foreground"
          )}
        >
          {detail}
        </span>
      ) : null}
    </button>
    <span className="flex items-center gap-0.5">
      {onRetry ? (
        <Tooltip message="Retry">
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={`Retry ${title}`}
            className="text-secondary-foreground hover:text-primary"
            onClick={onRetry}
          >
            <RefreshCw />
          </Button>
        </Tooltip>
      ) : null}
      {onDelete ? (
        <Tooltip message="Delete">
          <Button
            variant="ghost"
            size="icon-xs"
            isDestructive
            aria-label={`Delete ${title}`}
            onClick={onDelete}
          >
            <Trash2 />
          </Button>
        </Tooltip>
      ) : null}
    </span>
  </div>
);
