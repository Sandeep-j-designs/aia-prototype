import React from "react";
import { Download, EllipsisVertical, RefreshCcw } from "lucide-react";
import PageHeader from "../PageHeader";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  PageTopBarProps,
  QuickActionsProps,
} from "@/types/components/common/page-top-bar";

/**
 * PROTOTYPE STUB — same path and the same PageTopBarProps contract as
 * components/common/page-top-bar/ in aiaccountant-app.
 *
 * Production wraps every action in a PermissionGate driven by usePermission and
 * the next-auth session, and disables Sync based on the accounting-tool
 * connection status. A prototype has neither, so the `primaryPermission` /
 * `secondaryPermission` props are ACCEPTED AND IGNORED here — keep passing them
 * so the call site is already correct for production.
 *
 * On handoff this file is DELETED and the real PageTopBar takes over.
 */

const QuickActions = ({
  primaryText,
  onPrimaryButtonClick,
  primaryIcon: PrimaryIcon,
  secondaryButtonText,
  onSecondaryButtonClick,
  secondaryIcon: SecondaryIcon,
  onSync,
  isSyncing,
  syncIcon: SyncIcon = RefreshCcw,
  onExport,
  showExportButton,
  exportIcon: ExportIcon = Download,
  overflowActions,
  leadingActions,
}: QuickActionsProps) => {
  return (
    <div className="flex items-center gap-2">
      {leadingActions}

      {onSync ? (
        <Button variant="outline" onClick={onSync}>
          <SyncIcon className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          Sync
        </Button>
      ) : null}

      {showExportButton ? (
        <Button variant="outline" onClick={onExport}>
          <ExportIcon className="h-4 w-4" />
          Export
        </Button>
      ) : null}

      {secondaryButtonText ? (
        <Button variant="outline" onClick={onSecondaryButtonClick}>
          {SecondaryIcon ? <SecondaryIcon className="h-4 w-4" /> : null}
          {secondaryButtonText}
        </Button>
      ) : null}

      {primaryText ? (
        <Button onClick={onPrimaryButtonClick}>
          {PrimaryIcon ? <PrimaryIcon className="h-4 w-4" /> : null}
          {primaryText}
        </Button>
      ) : null}

      {overflowActions?.length ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <EllipsisVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowActions.map(({ label, onClick, icon: Icon, id }) => (
              <DropdownMenuItem key={id ?? label} onClick={onClick}>
                {Icon ? <Icon className="mr-2 h-4 w-4" /> : null}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
};

const PageTopBar = ({
  title,
  className,
  onBulkUpload: _onBulkUpload,
  bulkUploadIcon: _bulkUploadIcon,
  showExportButton,
  leading,
  ...props
}: PageTopBarProps) => {
  return (
    <div className={cn("flex justify-between items-center", className)}>
      {/* With `leading` (Neo's pages: view tabs), the row carries the tabs and
          the title is for assistive tech only. */}
      {leading ? (
        <>
          <h1 className="sr-only">{title}</h1>
          <div className="min-w-0">{leading}</div>
        </>
      ) : (
        <PageHeader title={title} />
      )}
      <QuickActions {...props} showExportButton={showExportButton} />
    </div>
  );
};

export default PageTopBar;
