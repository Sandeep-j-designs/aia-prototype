import { mockSalesBatches } from "@/config/pages/inbox/mock-sales-upload";
import { HDFC_ID, ICICI_ID } from "@/config/pages/inbox/mock-banking";
import { ARVoucherImportBatchStatus } from "@/types/pages/inbox/sales-upload";
import type {
  NotificationInput,
  NotificationPreferences,
} from "@/types/pages/notifications";

/**
 * The notification history the prototype opens with, for everything outside
 * the Inbox queue. Inbox notices (ready for review, unreadable files,
 * duplicates, arrivals) are derived from the seeded documents instead, by
 * `useInboxNotifications`, so the two can never disagree.
 *
 * Every entry stands on a state the module mocks already hold: a ledger whose
 * Tally sync failed, a statement that was rejected, the purchase register
 * that was reconciled. Nothing here is invented beside them.
 *
 * DEV: GET /api/notifications?companyId=… returns these as Notification[].
 * The server renders title and body; here the store renders them from the
 * kind (config/pages/notifications/kinds.ts).
 */

/** Minutes before the page loaded, so "2h ago" stays true on any day. */
const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const READ = ago(5);

const salesSeeds = (companyId: string): NotificationInput[] => {
  const batches = mockSalesBatches(companyId);
  const failed = batches.find((b) => b.batch.failureMessage)?.batch;
  const review = batches.find(
    (b) => b.batch.status === ARVoucherImportBatchStatus.NEEDS_REVIEW
  )?.batch;
  const seeds: NotificationInput[] = [];
  if (review)
    seeds.push({
      companyId,
      kind: "sales_preview_ready",
      data: {
        file: review.originalFileName,
        rows: review.totalRows - review.createdRows,
      },
      target: {
        href: `/inbox?module=AR&upload=${review.importBatchUuid}&step=preview`,
        label: "Sales upload",
      },
      actor: { kind: "ai" },
      refs: [review.importBatchUuid],
      createdAt: review.createdAt,
      readAt: READ,
    });
  if (failed)
    seeds.push({
      companyId,
      kind: "sales_import_failed",
      data: {
        file: failed.originalFileName,
        reason: failed.failureMessage ?? "",
      },
      target: { href: "/inbox?module=AR&tab=uploads", label: "Sales uploads" },
      actor: { kind: "ai" },
      refs: [failed.importBatchUuid],
      createdAt: failed.createdAt,
      readAt: READ,
    });
  return seeds;
};

export const MOCK_NOTIFICATIONS: NotificationInput[] = [
  /* ------------------------------------------- Shakunthalam Oil & Refineries */
  {
    companyId: "shakun",
    kind: "gst_portal_session",
    data: {},
    target: { href: "/inbox?module=GST", label: "GST reconciliation" },
    actor: { kind: "system" },
    refs: ["gst-portal:shakun"],
    createdAt: ago(48),
  },
  {
    companyId: "shakun",
    kind: "bank_sync_failed",
    data: {
      count: 2,
      reason:
        "Voucher number already exists in Tally for this voucher type: TDS challan of 7 Aug (HDFC) and LinkedIn Premium of 24 Aug (Axis card).",
    },
    target: { href: "/inbox?module=BANK", label: "Banking" },
    actor: { kind: "system" },
    refs: ["bank-sync:PMT/0987", "bank-sync:PMT/0998"],
    createdAt: ago(60 * 3),
  },
  {
    companyId: "shakun",
    kind: "master_sync_failed",
    data: {
      type: "Ledger",
      name: "Gokul Agro Resources Ltd",
      reason:
        "It already exists in Tally under Sundry Debtors. Rename it here, or move it in Tally.",
    },
    target: {
      href: "/inbox?module=COA&ledger=led-gokul-agro",
      label: "Chart of Accounts",
    },
    actor: { kind: "system" },
    refs: ["led-gokul-agro"],
    createdAt: ago(60 * 5),
  },
  {
    companyId: "shakun",
    kind: "master_sync_failed",
    data: {
      type: "Stock item",
      name: "Rice Bran Oil 1L Pouch",
      reason: "Unit 'Pcs' is not defined in Tally for this company.",
    },
    target: {
      href: "/inbox?module=INV&item=itm-0009-rbo-1l-pouch",
      label: "Stock items",
    },
    actor: { kind: "system" },
    refs: ["itm-0009-rbo-1l-pouch"],
    createdAt: ago(60 * 5 + 2),
  },
  {
    companyId: "shakun",
    kind: "master_sync_failed",
    data: {
      type: "Stock item",
      name: "Tin Cap with Seal",
      reason: "Stock group 'Packing Material' does not exist in Tally.",
    },
    target: {
      href: "/inbox?module=INV&item=itm-0019-tin-cap",
      label: "Stock items",
    },
    actor: { kind: "system" },
    refs: ["itm-0019-tin-cap"],
    createdAt: ago(60 * 5 + 3),
    readAt: READ,
  },
  {
    companyId: "shakun",
    kind: "statement_rejected",
    data: {
      file: "HDFC_50100123456_Jul2026_scan.pdf",
      reason:
        "It looks like a scanned copy. Download the statement from netbanking and upload it again.",
    },
    target: {
      href: `/inbox?module=BANK&logs=1`,
      label: "Statement logs",
    },
    actor: { kind: "ai" },
    refs: ["stmt:HDFC_50100123456_Jul2026_scan.pdf"],
    createdAt: ago(60 * 26),
    readAt: READ,
  },
  {
    companyId: "shakun",
    kind: "statement_paused",
    data: { file: "ICICI_CA_000405_Aug2026.pdf" },
    target: {
      href: `/inbox?module=BANK&account=${ICICI_ID}`,
      label: "ICICI Current A/c",
    },
    actor: { kind: "system" },
    refs: ["stmt:ICICI_CA_000405_Aug2026.pdf"],
    createdAt: ago(60 * 27),
    readAt: READ,
  },
  {
    companyId: "shakun",
    kind: "statement_extracted",
    data: {
      file: "HDFC_50100123456_Aug2026.pdf",
      count: 12,
      account: "HDFC Bank - 50100123456",
    },
    target: {
      href: `/inbox?module=BANK&account=${HDFC_ID}`,
      label: "HDFC Bank",
    },
    actor: { kind: "ai" },
    refs: ["stmt:HDFC_50100123456_Aug2026.pdf"],
    createdAt: ago(60 * 24 * 3),
    readAt: READ,
  },
  {
    companyId: "shakun",
    kind: "reconciliation_ready",
    data: {
      period: "Aug 2026",
      open: 36,
      missing2b: 12,
      missingPr: 14,
      probable: 10,
    },
    target: {
      href: "/inbox?module=GST&tab=invoice",
      label: "GST reconciliation",
    },
    actor: { kind: "user", name: "accounts@shakunthalam.in" },
    refs: ["recon:2026-08"],
    createdAt: "2026-09-12T10:55:10+05:30",
    readAt: READ,
  },
  {
    companyId: "shakun",
    kind: "gstr2b_ready",
    data: { period: "Aug 2026" },
    target: { href: "/inbox?module=GST", label: "GST reconciliation" },
    actor: { kind: "system" },
    refs: ["2b:2026-08"],
    createdAt: "2026-09-12T10:43:10+05:30",
    readAt: READ,
  },
  ...salesSeeds("shakun"),

  /* --------------------------------------------- Sahyadri Precision Works */
  {
    companyId: "acme",
    kind: "master_sync_failed",
    data: {
      type: "Stock item",
      name: "SS304 Round Bar Ø25",
      reason: "Unit 'Kgs' is not defined in Tally for this company.",
    },
    target: {
      href: "/inbox?module=INV&item=acme-itm-07-ss304-bar-25",
      label: "Stock items",
    },
    actor: { kind: "system" },
    refs: ["acme-itm-07-ss304-bar-25"],
    createdAt: ago(60 * 7),
  },
  ...salesSeeds("acme"),
];

/**
 * What a new user starts with: everything in the app, email for what needs
 * them, WhatsApp off (it is the channel documents arrive on, and a
 * notification there would read as a document).
 *
 * DEV: GET /api/notification-preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: {
    documents: { inApp: true, email: false, whatsapp: false },
    sync: { inApp: true, email: true, whatsapp: false },
    banking: { inApp: true, email: true, whatsapp: false },
    gst: { inApp: true, email: true, whatsapp: false },
    uploads: { inApp: true, email: false, whatsapp: false },
  },
  digest: "daily",
  urgentToasts: true,
};
