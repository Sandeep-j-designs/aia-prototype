import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { PermissionKey } from "@/types/permissions";

export type QuickActionOverflowAction = {
  dataTestId?: string;
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  id?: string;
  permission?: PermissionKey | PermissionKey[];
};

export type QuickActionsProps = {
  primaryText?: string;
  onPrimaryButtonClick?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  onExport?: () => void;
  showExportButton?: boolean;
  syncIcon?: LucideIcon;
  primaryIcon?: LucideIcon;
  exportIcon?: LucideIcon;
  secondaryIcon?: LucideIcon;
  secondaryButtonText?: string;
  onSecondaryButtonClick?: () => void;
  primaryPermission?: PermissionKey | PermissionKey[];
  secondaryPermission?: PermissionKey | PermissionKey[];
  overflowActions?: QuickActionOverflowAction[];
  leadingActions?: ReactNode;
  primaryTestId?: string;
  secondaryTestId?: string;
  overflowTriggerTestId?: string;
};

export type PageTopBarProps = QuickActionsProps & {
  title: string;
  onBulkUpload?: () => void;
  bulkUploadIcon?: LucideIcon;
  className?: string;
  /** The left of the actions' row: the page's view tabs, when it has them. */
  leading?: ReactNode;
};
