import type {
  NotificationCategory,
  NotificationData,
  NotificationGroup,
  NotificationKind,
  NotificationModule,
  NotificationSeverity,
} from "@/types/pages/notifications";

/**
 * Every notice the product sends, in one table: what it is, how loud, which
 * settings row controls it, and its copy.
 *
 * Copy follows the toast voice (users are CAs and accounts teams posting to
 * Tally): lead with the count or the file, then what happened; the next step
 * is the button. Plain reasons, never internal codes, Tally's own words.
 *
 * DEV: production renders title and body server-side from the same data; this
 * table is the spec for those templates.
 */

type KindMeta = {
  category: NotificationCategory;
  module: NotificationModule;
  severity: NotificationSeverity;
  group: NotificationGroup;
  /** The button's label. The button opens `target.href`. */
  action: string;
  copy: (data: NotificationData) => { title: string; body?: string };
};

const n = (data: NotificationData, key: string) => Number(data[key] ?? 0);
const s = (data: NotificationData, key: string) => String(data[key] ?? "");
const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

/** What a book's documents are called, singular and plural. */
export const BOOK_NOUN: Record<string, [string, string]> = {
  AP: ["bill", "bills"],
  AR: ["sales invoice", "sales invoices"],
  JV: ["journal note", "journal notes"],
};

export const NOTIFICATION_KINDS: Record<NotificationKind, KindMeta> = {
  compliance_issue: {
    category: "action",
    module: "gst",
    severity: "critical",
    group: "gst",
    action: "Review checks",
    copy: (d) => ({
      title: `${n(d, "count")} compliance issues need review`,
      body: "Review the document evidence and prepare the correction.",
    }),
  },
  /* ------------------------------------------------------------ documents */
  documents_arrived: {
    category: "update",
    module: "inbox",
    severity: "info",
    group: "documents",
    action: "Open Inbox",
    copy: (d) => ({
      title: `${plural(n(d, "count"), "document", "documents")} arrived by ${s(d, "channel")}`,
      body: `From ${s(d, "sender")}. AI Accountant is reading them now.`,
    }),
  },
  review_ready: {
    category: "action",
    module: "purchases",
    severity: "info",
    group: "documents",
    action: "Review",
    copy: (d) => {
      const [one, many] = BOOK_NOUN[s(d, "route")] ?? BOOK_NOUN.AP;
      const count = n(d, "count");
      return {
        title: `${plural(count, one, many)} ready for review`,
        body:
          count === 1
            ? "Read and coded. Check it and approve to post."
            : "Read and coded. Check them and approve to post.",
      };
    },
  },
  extraction_failed: {
    category: "action",
    module: "inbox",
    severity: "critical",
    group: "documents",
    action: "Open",
    copy: (d) => ({
      title: `Couldn’t read ${s(d, "file")}`,
      body: s(d, "reason") || "Retry, or fill it in by hand.",
    }),
  },
  duplicate_detected: {
    category: "action",
    module: "inbox",
    severity: "warning",
    group: "documents",
    action: "Compare",
    copy: (d) => ({
      title: `${s(d, "file")} may be a duplicate`,
      body: s(d, "match")
        ? `It matches ${s(d, "match")}. Keep it or delete it.`
        : "The same file came in before. Keep it or delete it.",
    }),
  },
  route_switch_done: {
    category: "update",
    module: "inbox",
    severity: "success",
    group: "documents",
    action: "Open",
    copy: (d) => ({
      title: `${s(d, "file")} is ready as a ${s(d, "voucher")}`,
      body: "Read again for the new book. Review it before you approve.",
    }),
  },

  /* ----------------------------------------------------------------- sync */
  sync_completed: {
    category: "update",
    module: "sync",
    severity: "success",
    group: "sync",
    action: "View",
    copy: (d) => ({
      title: `${plural(n(d, "count"), s(d, "one"), s(d, "many"))} synced to Tally`,
      body: "Everything selected went through.",
    }),
  },
  sync_failed: {
    category: "action",
    module: "sync",
    severity: "critical",
    group: "sync",
    action: "See what failed",
    copy: (d) => {
      const failed = n(d, "failed");
      const total = n(d, "total");
      return {
        title: `${plural(failed, s(d, "one"), s(d, "many"))} didn’t reach Tally`,
        body:
          failed === total
            ? `None of the ${total} went through. Check Tally is open, then sync again.`
            : `${total - failed} of ${total} went through. Check the rest and sync again.`,
      };
    },
  },
  resync_needed: {
    category: "action",
    module: "sync",
    severity: "warning",
    group: "sync",
    action: "Open voucher",
    copy: (d) => ({
      title: `${s(d, "voucher")} changed after it went to Tally`,
      body: "The copy in Tally is out of date. It goes across with the next sync.",
    }),
  },
  master_sync_failed: {
    category: "action",
    module: "masters",
    severity: "critical",
    group: "sync",
    action: "Fix",
    copy: (d) => ({
      title: `${s(d, "type")} ${s(d, "name")} didn’t reach Tally`,
      body: s(d, "reason"),
    }),
  },

  /* -------------------------------------------------------------- banking */
  statement_extracted: {
    category: "update",
    module: "banking",
    severity: "success",
    group: "banking",
    action: "Review",
    copy: (d) => ({
      title: `${s(d, "file")} is read`,
      body: `${plural(n(d, "count"), "transaction is", "transactions are")} waiting in Needs Review for ${s(d, "account")}.`,
    }),
  },
  statement_rejected: {
    category: "action",
    module: "banking",
    severity: "warning",
    group: "banking",
    action: "Upload again",
    copy: (d) => ({
      title: `${s(d, "file")} couldn’t be used`,
      body: s(d, "reason"),
    }),
  },
  statement_paused: {
    category: "update",
    module: "banking",
    severity: "warning",
    group: "banking",
    action: "View statement",
    copy: (d) => ({
      title: `${s(d, "file")} is paused`,
      body: "A technical issue stopped the read. Our team is on it; nothing for you to do yet.",
    }),
  },
  bank_sync_failed: {
    category: "action",
    module: "banking",
    severity: "critical",
    group: "banking",
    action: "Open transactions",
    copy: (d) => ({
      title: `${plural(n(d, "count"), "bank entry", "bank entries")} didn’t reach Tally`,
      body: s(d, "reason"),
    }),
  },

  /* ------------------------------------------------------------------ GST */
  gst_portal_session: {
    category: "action",
    module: "gst",
    severity: "warning",
    group: "gst",
    action: "Reconnect",
    copy: () => ({
      title: "GST portal needs an OTP",
      body: "The session has expired. Verify an OTP to fetch GSTR-2B again.",
    }),
  },
  gstr2b_ready: {
    category: "update",
    module: "gst",
    severity: "success",
    group: "gst",
    action: "Open GST",
    copy: (d) => ({
      title: `GSTR-2B for ${s(d, "period")} is in`,
      body: n(d, "lines")
        ? `${plural(n(d, "lines"), "invoice", "invoices")} fetched. Reconcile them against your purchase register.`
        : "Reconcile it against your purchase register.",
    }),
  },
  gst_file_failed: {
    category: "action",
    module: "gst",
    severity: "critical",
    group: "gst",
    action: "Open GST",
    copy: (d) => ({
      title: `Couldn’t import ${s(d, "file")}`,
      body: s(d, "reason"),
    }),
  },
  pr_imported: {
    category: "update",
    module: "gst",
    severity: "success",
    group: "gst",
    action: "Open GST",
    copy: (d) => ({
      title: `${s(d, "file")} is imported`,
      body: "Your purchase register is ready to reconcile.",
    }),
  },
  reconciliation_ready: {
    category: "update",
    module: "gst",
    severity: "success",
    group: "gst",
    action: "See results",
    copy: (d) => ({
      title: `Reconciliation for ${s(d, "period")} is ready`,
      body: n(d, "open")
        ? `${plural(n(d, "open"), "invoice", "invoices")} to look at: ${n(d, "missing2b")} missing in 2B, ${n(d, "missingPr")} missing in your books, ${n(d, "probable")} probable matches.`
        : "Open the results to claim ITC.",
    }),
  },

  /* -------------------------------------------------------------- uploads */
  sales_preview_ready: {
    category: "action",
    module: "sales",
    severity: "info",
    group: "uploads",
    action: "Review",
    copy: (d) => ({
      title: `${s(d, "file")} is ready to check`,
      body: `${plural(n(d, "rows"), "row", "rows")} read and matched to customers. Create the invoices once they look right.`,
    }),
  },
  sales_import_failed: {
    category: "action",
    module: "sales",
    severity: "critical",
    group: "uploads",
    action: "Open upload",
    copy: (d) => ({
      title: `Couldn’t import ${s(d, "file")}`,
      body: s(d, "reason"),
    }),
  },
  split_ready: {
    category: "action",
    module: "purchases",
    severity: "info",
    group: "uploads",
    action: "Review split",
    copy: (d) => ({
      title: `${s(d, "file")} is ready to split`,
      body: `${plural(n(d, "bills"), "bill", "bills")} found across ${plural(n(d, "pages"), "page", "pages")}.`,
    }),
  },
  split_failed: {
    category: "action",
    module: "purchases",
    severity: "critical",
    group: "uploads",
    action: "Open Bill Uploads",
    copy: (d) => ({
      title: `Couldn’t split ${s(d, "file")}`,
      body: s(d, "reason"),
    }),
  },
};

export const MODULE_LABEL: Record<NotificationModule, string> = {
  inbox: "Inbox",
  purchases: "Purchases",
  sales: "Sales",
  journals: "Journals",
  banking: "Banking",
  gst: "GST",
  masters: "Masters",
  sync: "Tally sync",
};

/** The settings dialog's rows, in order, with what each one covers. */
export const NOTIFICATION_GROUPS: {
  id: NotificationGroup;
  label: string;
  covers: string;
}[] = [
  {
    id: "documents",
    label: "Documents",
    covers: "Arrivals, ready for review, unreadable files, duplicates",
  },
  {
    id: "sync",
    label: "Tally sync",
    covers: "Sync results, vouchers out of date, ledgers and items",
  },
  {
    id: "banking",
    label: "Banking",
    covers: "Statements read or rejected, bank entries",
  },
  {
    id: "gst",
    label: "GST",
    covers: "Portal session, GSTR-2B, purchase register, reconciliation",
  },
  {
    id: "uploads",
    label: "Uploads",
    covers: "Sales invoice imports, bill packets to split",
  },
];

/** A route's module, for the per-book notices. */
export const ROUTE_MODULE: Record<string, NotificationModule> = {
  AP: "purchases",
  AR: "sales",
  JV: "journals",
};
