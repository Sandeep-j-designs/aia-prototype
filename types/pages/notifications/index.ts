/**
 * Notification centre contracts — camelCase, as the API returns them once
 * apiClient has converted the payload.
 *
 * DEV: GET /api/notifications?companyId=…&cursor=… returns Notification[];
 * GET /api/notifications/unread-count returns NotificationCounts[] (one per
 * company the user belongs to); GET/PUT /api/notification-preferences
 * returns NotificationPreferences.
 */

/**
 * Two kinds of notice, and they leave differently.
 * - `action`: something is stuck until a person does something. Reading it
 *   does not clear it; doing the work does (`resolvedAt`).
 * - `update`: something finished or arrived. Reading it clears it.
 */
export type NotificationCategory = "action" | "update";

/** The part of the product a notice is about. Drives the glyph and filters. */
export type NotificationModule =
  | "inbox"
  | "purchases"
  | "sales"
  | "journals"
  | "banking"
  | "gst"
  | "masters"
  | "sync";

export type NotificationSeverity = "info" | "success" | "warning" | "critical";

export type NotificationKind =
  | "compliance_issue"
  // Inbox documents
  | "documents_arrived"
  | "review_ready"
  | "extraction_failed"
  | "duplicate_detected"
  | "route_switch_done"
  // Tally sync
  | "sync_completed"
  | "sync_failed"
  | "resync_needed"
  | "master_sync_failed"
  // Banking
  | "statement_extracted"
  | "statement_rejected"
  | "statement_paused"
  | "bank_sync_failed"
  // GST
  | "gst_portal_session"
  | "gstr2b_ready"
  | "gst_file_failed"
  | "pr_imported"
  | "reconciliation_ready"
  // Uploads
  | "sales_preview_ready"
  | "sales_import_failed"
  | "split_ready"
  | "split_failed";

/** Who or what caused the notice. "ai" is AI Accountant reading something. */
export type NotificationActor = {
  kind: "ai" | "user" | "system" | "channel";
  name?: string;
};

/** Where the notice's button goes. */
export type NotificationTarget = { href: string; label: string };

/** Values the copy is built from — the server renders title and body. */
export type NotificationData = Record<string, string | number>;

export type Notification = {
  id: string;
  companyId: string;
  kind: NotificationKind;
  category: NotificationCategory;
  module: NotificationModule;
  severity: NotificationSeverity;
  title: string;
  body?: string;
  data: NotificationData;
  actor: NotificationActor;
  target: NotificationTarget;
  /**
   * The records this notice is about (item ids, statement ids…). A grouped
   * notice ("6 bills ready for review") carries several; an action notice
   * resolves when its last ref is dealt with.
   */
  refs: string[];
  /** Notices with the same key fold into one while it is open. */
  groupKey?: string;
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
};

/** The groups the settings dialog lists, one row each. */
export type NotificationGroup =
  "documents" | "sync" | "banking" | "gst" | "uploads";

export type NotificationChannel = "inApp" | "email" | "whatsapp";

export type NotificationDigest = "off" | "daily" | "weekly";

export type NotificationPreferences = {
  channels: Record<NotificationGroup, Record<NotificationChannel, boolean>>;
  digest: NotificationDigest;
  /** Pop a toast for critical notices as they arrive. */
  urgentToasts: boolean;
};

export type NotificationCounts = {
  companyId: string;
  /** Unresolved action notices. */
  action: number;
  /** Unread notices of either category. */
  unread: number;
};

/** What a new notice needs; the store fills in the rest from the kind. */
export type NotificationInput = {
  companyId: string;
  kind: NotificationKind;
  data: NotificationData;
  target: NotificationTarget;
  actor?: NotificationActor;
  refs?: string[];
  groupKey?: string;
  createdAt?: string;
  readAt?: string | null;
  /** Overrides the kind's module (review_ready is per book). */
  module?: NotificationModule;
};
