import React from "react";
import { FolderTree, Inbox, Mail, MessageCircle } from "@/components/icons";
import type { SourceProvider } from "@/types/pages/inbox/sources";
import { cn } from "@/lib/utils";

export const providerCopy: Record<SourceProvider, string> = {
  Forwarding: "Mail forwarded to your AI Accountant address",
  Gmail: "Invoice attachments from one Gmail label",
  "Google Drive": "Supplier invoices from one Drive folder",
  "WhatsApp Business": "Bills sent to your business number",
};

const ICON = {
  Forwarding: Inbox,
  Gmail: Mail,
  "Google Drive": FolderTree,
  "WhatsApp Business": MessageCircle,
} as const;

/** A channel's glyph in a small tile; email in brand, WhatsApp in green. */
export const ProviderIcon = ({
  provider,
  className,
}: {
  provider: SourceProvider;
  className?: string;
}) => {
  const Icon = ICON[provider];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-pi-line bg-background",
        provider === "WhatsApp Business"
          ? "text-pi-success"
          : provider === "Google Drive"
            ? "text-pi-body"
            : "text-pi-brand",
        className
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
};
