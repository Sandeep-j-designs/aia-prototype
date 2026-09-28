import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";
import {
  Check,
  ArrowRight,
  Copy,
  FileWarning,
  ShieldCheck,
  Trash2,
  ChevronDown,
  FilePlus2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  GripVertical,
  ListFilter,
  Lock,
  Loader2,
  Mail,
  MessageCircle,
  MoreVertical,
  Pin,
  PinOff,
  RotateCcw,
  Search,
  Sparkles,
  Keyboard,
  Info,
  Lightbulb,
  Slash,
  Undo2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import useGuide from "@/hooks/pages/guide/use-guide";
import {
  GUIDE_ACTION_EVENT,
  type GuideAction,
} from "@/components/guide/actions";
import FileIcon from "@/components/inbox/common/file-icon";
import JournalVoucher from "@/components/inbox/journal";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import PageTopBar from "@/components/common/page-top-bar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SidebarLayout from "@/components/sidebar-layout";
// Aliased: `Sheet` in this file already means the AP spreadsheet component.
import {
  Sheet as Drawer,
  SheetContent as DrawerContent,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ColumnFilter, FilterPanel } from "./filter-panel";
import { format, parseISO } from "date-fns";
import FilterChip from "@/components/common/filter-chip";
import DateFilter from "@/components/common/date-filter";
import type { FilterOption } from "./filter-panel";
import Preview from "./preview";
import EditableCell from "./editable-cell";
import BulkActionBar from "@/components/common/bulk-action-bar";
import CreateMasterDialog from "./create-master-dialog";
import { InboxWelcomeDialog } from "./kickstart";
import {
  ACTIONS_WIDTH,
  COLUMN_SIZES,
  DEFAULT_WIDTHS,
  SELECT_WIDTH,
  clampWidth,
  readWidths,
  sizeColumns,
} from "./table-sizing";
import { ApprovedDetails, RecordBanner } from "./record-details";
import Sheet from "./sheet";
import InvoiceSheet from "./invoice-sheet";
import RouteSwitchLoader from "./route-switch-loader";
import {
  CountPill,
  DateField,
  EditedMark,
  Field,
  FieldCard,
  Notice,
  PageDialog,
  Pill,
  Req,
  Spinner,
  StatusPill,
  tablePillClass,
  T,
} from "./ui";
import {
  actor,
  applyBulkAction,
  BULK_VOUCHER_TYPES,
  senderUser,
  missingFields,
  VOUCHER_GROUPS,
  type BulkField,
  type BulkResult,
  approve,
  companies,
  configure,
  event,
  Form,
  getState,
  hardMatch,
  ingest,
  demoUploadDocuments,
  resetCompany,
  beginUploadedExtraction,
  init,
  issue,
  Item,
  manual,
  remove,
  retry,
  Route,
  ROUTE_LABELS,
  routeNames,
  routes,
  setPermissions,
  switchRoute,
  update,
  updatePosted,
  useStore,
  withinNewWindow,
  NEW_TAG_DAYS,
  applyScenario,
  REGISTERED_WHATSAPP,
  AIA_WHATSAPP,
  type Scenario,
} from "./store";
import { useTallySync } from "@/hooks/pages/inbox/use-tally-sync";
import SyncConfirmModal from "./sync/sync-confirm-modal";
import SyncProgressModal from "./sync/sync-progress-modal";
import { RunRowList } from "./progress-run";
import UploadAnimation from "./upload-animation";
import uploadStyles from "./upload-dialog.module.css";
import Register, { type RegisterSyncState } from "./register";
import SyncResultModal from "./sync/sync-result-modal";
import SyncCloud from "./sync/sync-cloud";
import SyncChromeButton from "./sync/sync-chrome-button";
import {
  gridCellId,
  useGridKeyboard,
} from "@/hooks/pages/inbox/use-grid-keyboard";
import KeyboardShortcuts from "./keyboard-shortcuts";
const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n
  );
/** "24 Sep 2026, 2:33 am" — the Bloocks date, with the time it arrived. */
/** The Bloocks AmountCell's figure: rupees in en-IN groups, paise small and muted. */
const AmountText = ({ value }: { value: number }) => {
  const [rupees, paise] = Math.abs(value).toFixed(2).split(".");
  return (
    <>
      {value < 0 && "−"}₹{new Intl.NumberFormat("en-IN").format(Number(rupees))}
      <span className="text-caption-1 text-secondary-foreground">.{paise}</span>
    </>
  );
};
const stamp = (s: string) => format(new Date(s), "d MMM yyyy, h:mm aaa");
/**
 * The upload cap, named rather than inlined: the modal states it, the list
 * warns against it and the submit button enforces it, and three literals would
 * be three chances for them to disagree.
 */
const MAX_UPLOAD_FILES = 50;
const age = (s: string) => {
  const m = Math.max(0, Math.floor((Date.now() - +new Date(s)) / 60000));
  return m < 60
    ? `${m}m ago`
    : m < 1440
      ? `${Math.floor(m / 60)}h ago`
      : `${Math.floor(m / 1440)}d ago`;
};
const tabs = ["All", "Need review", "Approved", "Duplicate"];
/*
  The fourth tab is duplicates, and only duplicates.

  It was "Exception", and it collected Failed alongside Duplicate — two states
  that have nothing to do with each other and are not acted on the same way. A
  duplicate is a document we read correctly and already have; a failure is one
  we could not read at all. Grouping them put a queue of "resolve or dismiss"
  next to a queue of "retry", under a heading that named neither, and the count
  on the tab was the sum of two unrelated backlogs.

  Failed is still a status, but a failed upload is not a document in the
  Inbox: nothing was read, so there is nothing to review, approve or post. The
  upload panel is where a failure is reported and retried, and the table
  leaves Failed out of every tab, All included (24 Sep 2026).
*/
/**
 * Toast copy, written for the accountant clearing a queue: the count or the
 * voucher first, then what happened, then what to do or where it goes next
 * (Tally, the review form). Lower-case field names mid-sentence, Tally's own
 * words (voucher, ledger, post, sync), no internal codes.
 */
/** A bulk field as it reads mid-sentence. */
const FIELD_LABEL: Partial<Record<BulkField, string>> = {
  "GST Registration": "GST registration",
  "Voucher Type": "Voucher type",
};
const docs = (n: number) => `${n} document${n === 1 ? "" : "s"}`;
/** "due date", "ledger and GST registration", "vendor, due date and ledger". */
const fieldList = (fields: string[]) => {
  const words = fields.map((f) => (/^GST/.test(f) ? f : f.toLowerCase()));
  return words.length < 2
    ? words.join("")
    : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
};
/**
 * The store's reasons for refusing a row, said the way the toast reads them:
 * "2 already approved", "1 duplicate of a posted voucher".
 */
const PLAIN_REASON: Record<string, string> = {
  "Item unavailable": "no longer in this Inbox",
  "No write access": "you don’t have posting access",
  "Hard-block duplicate": "duplicate of a posted voucher",
  "Not in Needs Review": "not waiting for review",
  "Not editable": "already approved or still being read",
  "Choose a value": "no value chosen",
  "Invalid GST registration": "GST registration not set up for this company",
  "Invalid voucher type": "voucher type not recognised",
  "Invalid route": "voucher type not recognised",
  "No ledger lines": "no line to set a ledger on",
  "Approved record is read-only": "already approved, so kept on record",
  "Already deleted": "already deleted",
};
const plainReason = (reason: string) =>
  PLAIN_REASON[reason] ??
  (reason.startsWith("No write access to ")
    ? `you can’t post to ${reason.slice("No write access to ".length)}`
    : reason.replace(/\.$/, "").replace(/^./, (c) => c.toLowerCase()));
/** "2 missing ledger · 1 duplicate of a posted voucher", largest first. */
const reasonBreakdown = (reasons: Iterable<string>) => {
  const counts = new Map<string, number>();
  for (const reason of reasons)
    counts.set(reason, (counts.get(reason) || 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => `${count} ${reason}`)
    .join(" · ");
};
const matchesTab = (item: Item, tab: string) => {
  if (tab === "All") return !["Deleted", "Failed"].includes(item.status);
  if (tab === "Duplicate") return item.status === "Duplicate";
  if (tab === "Need review") return item.status === "Needs Review";
  return item.status === "Approved";
};
/**
 * The Tally voucher types the AI predicts into, and what Reassign Voucher Type
 * offers.
 *
 * PRD §4.4.2 lists seven and omits Sales, which cannot be right while Accounts
 * Receivable is a route: every AR item the Inbox creates carries "Sales", so
 * the list filtered on a value this list had no way to set, and bulk Reassign
 * offered an accountant seven types none of which was the one the row already
 * had — picking any of them moved a sales invoice off Sales with no way back.
 *
 * Flagged for the PRD rather than worked around here.
 */
const voucherTypes = [
  "Purchase",
  "Sales",
  "Journal",
  "Debit Note",
  "Credit Note",
  "Receipt",
  "Payment",
  "Contra",
];
const EMPTY_STATES: Record<string, { title: string; body: string }> = {
  All: {
    title: "Nothing in the Inbox",
    body: "Bills, invoices and journals arrive here by email, WhatsApp or upload. Approved ones stay on as a record of what was posted.",
  },
  "Need review": {
    title: "Nothing waiting on you",
    body: "You are caught up. New documents appear here when AI Accountant has prepared them for your review.",
  },
  Approved: {
    title: "No approved documents yet",
    body: "Approve a document and its record appears here, with the voucher it created and the file it came from.",
  },
  Duplicate: {
    title: "No duplicates",
    body: "A document that matches one you already have waits here until you keep it or discard it.",
  },
};
/**
 * The default order, set on 24 Sep 2026: what the document is
 * (File, Vendor, Voucher type, GST Registration, Amount), then where it stands
 * (Status), then where it came from (Source, User, Received).
 */
const columns = [
  "File",
  "Vendor",
  "Voucher type",
  "GST Registration",
  "Amount",
  "Status",
  "Source",
  "User",
  "Received",
];
const sourceLabels = { email: "Email", whatsapp: "WhatsApp", upload: "Upload" };

/**
 * How a document arrived, said in words.
 *
 * Not a pill: the five badge tones are all spoken for by Status, and a chip
 * here put a second coloured thing in the row that meant something else
 * entirely. Not an icon either — an envelope and a speech bubble are a legend
 * to learn, and the column is read, not scanned. The word is the shortest
 * thing that needs no key.
 */

/**
 * What the AI Route column calls each route.
 *
 * The queue names the voucher the document is about to become rather than the
 * ledger group it belongs to: an accountant reading a row is deciding what to
 * post, and "Purchase Voucher" is the thing they post. "Accounts Payable" is
 * where it ends up afterwards, which the module pages already say.
 *
 * The Post as picker names vouchers too: it is the same decision the column
 * reports, so the two read as one thought rather than two vocabularies.
 *
 * Separate from `routeNames`, which stays the name of the module itself — the
 * registers and the sync modal name modules, because those are places, not acts.
 *
 * Lives in the store now, because the selection bar sets the route by the same
 * label and the reverse lookup has to agree with this one.
 */
const aiRouteLabels = ROUTE_LABELS;
const columnVisibilityKey = `inbox.columns.v5:${encodeURIComponent(actor)}`;
const defaultColumns = (companyId: string) =>
  columns.filter(
    (c) =>
      c !== "GST Registration" ||
      (companies.find((company) => company.id === companyId)?.branches.length ||
        0) > 1
  );
const RESIZABLE = new Set(columns);
/**
 * Locking and pinning are separate.
 *
 * A locked column is always shown: its visibility checkbox is fixed on and it
 * carries a padlock. File and Status are locked, because File identifies the
 * row at all and Status is what the accountant reads to decide whether to open
 * it, so a queue missing either cannot be worked.
 *
 * A pinned column holds the front of the grid and cannot be dragged while
 * pinned. Any column can be pinned, locked or not. File is pinned by default;
 * Status sits where the default order puts it, after Amount, until someone
 * pins it.
 */
const LOCKED_COLUMNS = new Set(["File", "Status"]);
/** File leads the grid until someone unpins it. */
const DEFAULT_PINNED = ["File"];
/**
 * Motion for the Columns list. One duration and one curve for the rows sliding
 * aside and for the dragged row settling into its slot, so the drop reads as
 * the same gesture finishing rather than a second, separate animation.
 *
 * The curve is a decelerating ease — quick off the mark, slow into the stop,
 * which is what makes a row look like it was placed rather than teleported.
 */
const SETTLE_MS = 200;
const EASE = "cubic-bezier(0.2, 0, 0, 1)";
/**
 * Fallback row height, for the frame before a row has been measured.
 * 45px — Figma 24421:72764, where every body row is 45 and the header is 40.
 */
const ROW_HEIGHT = 45;
/** Reading layout before paint is the point; on the server there is none. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;
/**
 * A stored column order, made safe to render from. The grid renders from the
 * order, so anything wrong with it is a missing column rather than a cosmetic
 * slip: unknown labels are dropped, duplicates collapsed, and columns the
 * stored order never heard of appended after the ones it did.
 *
 * The pinned columns are then floated to the front, which is the one invariant
 * the rest of the screen relies on: "pinned" and "leading" have to mean the
 * same thing, or the padlocks in the list stop describing the grid.
 */
const normaliseOrder = (raw: unknown, pinned: string[]): string[] => {
  const list = Array.isArray(raw)
    ? raw.filter((c): c is string => typeof c === "string")
    : [];
  const kept = list.filter(
    (c, i) => columns.includes(c) && list.indexOf(c) === i
  );
  const full = [...kept, ...columns.filter((c) => !kept.includes(c))];
  return [
    ...pinned.filter((c) => full.includes(c)),
    ...full.filter((c) => !pinned.includes(c)),
  ];
};
/**
 * Column-keyed multi-select, plus the two ranges that are not lists of values.
 * Keying by column label means the header funnels and the filter panel read and
 * write the same place, so they cannot disagree.
 */
const defaultFilters = {
  search: "",
  from: "",
  to: "",
  min: "",
  max: "",
  cols: {} as Record<string, string[]>,
};
type Filters = typeof defaultFilters;

/** The sortable/filterable value behind a column, for one item. */
const cellValue = (x: Item, column: string): string | number => {
  switch (column) {
    case "File":
      return x.file.name;
    case "Source":
      return x.source;
    case "User":
      return senderUser(x);
    case "Vendor":
      return x.form.party;
    case "Voucher type":
      return x.form.voucherType;
    case "GST Registration":
      return x.form.gst;
    case "Amount":
      return x.amount;
    case "Received":
      return x.received;
    case "Status":
      return x.status;
    default:
      return "";
  }
};

/** Amount and Received are ranges, so they filter from the panel, not a funnel. */
/**
 * The two columns promoted out of the Filters panel and onto the bar as their
 * own dropdowns (Figma 716:15029). They stay in the panel as well — this is a
 * second way into the same `filters.cols` state, not a separate filter, so the
 * bar, the panel and the column-header funnel can never disagree about what is
 * applied.
 */
const QUICK_FILTERS = ["Source", "Voucher type"] as const;
const FILTERABLE = new Set([
  "Source",
  "User",
  "Vendor",
  "Voucher type",
  "GST Registration",
  "Status",
]);
const SORTABLE = new Set(columns);
const ledgerOptions = [
  "General Expenses",
  "Sales",
  "Rent",
  "Bank Charges",
  "Accounts Payable",
  "Accounts Receivable",
  "Cash",
  "Bank",
];

const PAGE_SIZES = [10, 25, 50, 100];

/*
  The three beats of the upload → table handoff, named so the sequence that
  schedules them reads as a sequence rather than as four magic numbers.

  DIALOG_EXIT matches the dialog primitive's own `duration-200`; change one and
  the table's entrance starts against an overlay that is still there.
*/
/** The cap the drop zone states. Files themselves are never sent anywhere. */
const MAX_UPLOAD_MB = 500;

/**
 * The ways an upload fails, each said the way an accountant would need it:
 * what happened, then what fixes it. `retry` is whether sending the same file
 * again can work — it decides which group a failed row lands in, and whether
 * it gets Retry or Choose file.
 *
 * `short` is the word the panel's summary line counts it by ("2 interrupted ·
 * 1 password-protected").
 */
const UPLOAD_FAILURES = {
  interrupted: {
    title: "Upload interrupted",
    detail: "Your internet connection dropped partway through.",
    short: "interrupted",
    retry: true,
  },
  password: {
    title: "Password-protected PDF",
    detail: "Remove the password, then upload it again.",
    short: "password-protected",
    retry: false,
  },
  damaged: {
    title: "File is damaged",
    detail: "It can’t be opened. Export or scan it again.",
    short: "damaged",
    retry: false,
  },
} as const;
type UploadFailureKind = keyof typeof UPLOAD_FAILURES;
const failureText = (kind: UploadFailureKind) =>
  `${UPLOAD_FAILURES[kind].title}. ${UPLOAD_FAILURES[kind].detail}`;
/**
 * Read a failure back from its message. The three simulated kinds are
 * recognised by their title; anything else — a real `ingest` rejection such as
 * an unsupported format or a bank statement — is its own reason, retryable
 * only when the save itself did not complete.
 */
const classifyFailure = (reason: string) => {
  const kind = (Object.keys(UPLOAD_FAILURES) as UploadFailureKind[]).find(
    (key) => reason.startsWith(UPLOAD_FAILURES[key].title)
  );
  if (kind) return { key: kind as string, ...UPLOAD_FAILURES[kind] };
  const retry = reason.startsWith("could not save");
  return {
    key: reason,
    title: retry ? "Couldn’t save the file" : reason,
    detail: retry ? "Something went wrong on our side." : "",
    short: retry ? "not saved" : "can’t be used",
    retry,
  };
};

/**
 * What to know before choosing a file, from the bulk upload frame.
 *
 * "Bill" in the source copy is "document" here: this queue takes vendor bills,
 * sales invoices and journals, and a guideline that names only one of them
 * reads as a rule about which are allowed.
 */
const UPLOAD_GUIDELINES = [
  "Printed or handwritten documents are welcome.",
  "Use a clear, straight photo or scan for best results.",
  "Keep each document to 12 pages or fewer.",
  "We’ll let you know when your documents are ready to review.",
];

const DIALOG_DWELL_MS = 800;
const DIALOG_EXIT_MS = 200;
const TABLE_ENTER_MS = 420;

/**
 * The URL that opens one document.
 *
 * The id travels in the query, not the path. `/inbox/[id]` is a static page
 * whose paths come from MOCK_INBOX_ITEMS, and the store mints ids that list
 * never saw: POSTED-2041 and ACME-1001 at seed, and a DEMO-<company>-<uuid>
 * for every document the demo upload creates. Pushing one of those at
 * `/inbox/<id>` asks Next for a prerendered page that does not exist, and
 * `fallback: false` answers with the 404 — which is what a click on a bill
 * landed on. Staying on /inbox keeps every open on the one route that is
 * always prerendered, and `router.query.id` reads the same either way, so the
 * detail view below is unchanged.
 *
 * `/inbox/[id]` stays for deep links to the seeded ids that it does cover.
 */
const detailHref = (id: string, extra?: string) =>
  `/inbox?id=${encodeURIComponent(id)}${extra ? `&${extra}` : ""}`;

/** AP's --gutter, applied to every full-width band on the screen. */
/** 24px — the page gutter every band lines up on (Figma 24200:218735). */
const gutter = "px-6";
/**
 * Which of the review form's fields the sheet marks with an asterisk. Taken
 * from the bills sheet's own required set, so a journal asks for the same
 * things in the same way — Cost Centre and its class stay optional there too.
 */
const REQUIRED_FIELDS = new Set([
  "gst",
  "voucherType",
  "voucherNo",
  "invoiceNo",
  "date",
  "due",
  "party",
]);
/** A horizontal band of controls. */
const band = "flex flex-wrap items-center gap-2";
/**
 * One column's filter, promoted onto the bar (Figma 716:15029).
 *
 * The trigger is a Bloocks FilterChip, the same as the Received date chip
 * beside it. The body is `ColumnFilter` — the same searchable multi-select the
 * column-header funnel opens — rather than a second list written to look like
 * it, so "Source" means one thing wherever it is answered.
 *
 * The chip says what is applied because it is the only place an applied quick
 * filter shows: a dropdown that silently filters the grid is worse than a wide
 * one.
 */
const QuickFilter = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
}) => (
  <Popover>
    <PopoverTrigger asChild>
      {/* A Bloocks FilterChip: it names what is applied ("Source:
          WhatsApp", or a count for several) and its × clears in place. */}
      <FilterChip
        label={label}
        selectionType="multiple"
        value={selected.map(
          (value) => options.find((o) => o.value === value)?.label ?? value
        )}
        onClearButtonClick={() => onChange([])}
      />
    </PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0">
      <ColumnFilter
        label={label}
        options={options}
        selected={selected}
        onChange={onChange}
      />
    </PopoverContent>
  </Popover>
);
/**
 * `issue()`'s validator labels, as sentences for the Approve tooltip.
 *
 * Only the journal's own blocks are here. The other two things `issue()` can
 * return — no write access, and a hard-block duplicate — are said with more
 * context than a lookup can hold (which route, which matching voucher), so
 * they are written at the call site instead.
 */
const JV_BLOCK_COPY: Record<string, string> = {
  "Required fields missing":
    "Fill the fields marked * in Journal Details before approving.",
  "Journal out of balance":
    "Debits and credits don’t match. Balance the journal to approve.",
  "Ledger required": "Every debit and credit line needs a ledger.",
};

// Keep the upload-led entry point for each company across client navigation.
// Persisted company flags prevent replaying the demo batch after a reload.
const startedInboxCompanies = new Set<string>();

export default function Workspace() {
  const state = useStore(),
    router = useRouter();
  const [kickstartPreview, setKickstartPreview] = useState(
    () =>
      !state.startedCompanies?.includes(state.company) &&
      !startedInboxCompanies.has(state.company)
  );
  useEffect(() => {
    setKickstartPreview(
      !state.startedCompanies?.includes(state.company) &&
        !startedInboxCompanies.has(state.company)
    );
  }, [state.company, state.startedCompanies]);
  /*
    The launch guide no longer starts itself.

    It used to run on the first queue with anything in it. With the welcome a
    dialog, that queue is now there on first load for anyone whose WhatsApp
    documents arrived before launch — so the tour would have opened on top of,
    or straight after, the welcome: two introductions back to back. The welcome
    offers it instead ("Take the tour"), and the Guide button still has it.
  */
  const guide = useGuide();
  const [ready, setReady] = useState(false),
    [dialog, setDialog] = useState(""),
    /**
     * Whether Approve has been pressed on the journal currently open.
     *
     * The journal's faults are shown on attempt rather than on sight: a
     * voucher the AI has half-filled would otherwise open with both amount
     * cells of every incomplete line already red, which says the accountant
     * did something wrong before they have done anything at all.
     */
    [attempted, setAttempted] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [filters, setFilters] = useState(defaultFilters),
    [tab, setTab] = useState("Need review"),
    [page, setPage] = useState(0),
    [pageSize, setPageSize] = useState(25),
    [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(
      null
    ),
    [visibilityByCompany, setVisibilityByCompany] = useState<
      Record<string, string[]>
    >({}),
    // Which columns show and what order they sit in are separate: hiding a
    // column and showing it again should put it back where the user left it,
    // not at the end, so the order has to survive being deselected.
    [order, setOrder] = useState(() => normaliseOrder(columns, DEFAULT_PINNED)),
    [pinned, setPinned] = useState(DEFAULT_PINNED),
    [widths, setWidths] = useState<Record<string, number>>({});
  const [resizing, setResizing] = useState<string | null>(null);

  /**
   * Bulk edits waiting to be written. Picking a value on the bar only stages
   * it; nothing on the rows changes until Save writes the staged values, or
   * Save & approve writes them and approves in the same step. Dropped when
   * the selection is emptied.
   */
  const [bulkStaged, setBulkStaged] = useState<
    Partial<Record<BulkField, string>>
  >({});
  useEffect(() => {
    if (!selected.length) setBulkStaged({});
  }, [selected.length]);
  /**
   * Ledgers and vendors created this session — from the bulk bar, a journal
   * line or a table cell. One list, so a master made in one place is offered
   * in all of them.
   */
  const [createdMasters, setCreatedMasters] = useState<{
    Ledger: string[];
    Vendor: string[];
  }>({ Ledger: [], Vendor: [] });
  /**
   * The create dialog in flight. `then` is what the caller does with the new
   * name: stage it on the bar, set it on a journal line, write it to a cell.
   */
  const [creating, setCreating] = useState<{
    field: "Ledger" | "Vendor";
    name: string;
    then: (name: string) => void;
    /** The dialog's line on what happens next; the bar's wording if unset. */
    description?: string;
  } | null>(null);
  const resizeCleanup = useRef<(() => void) | null>(null);
  const gridElement = useRef<HTMLDivElement | null>(null);
  useEffect(() => () => resizeCleanup.current?.(), []);
  const visible =
    visibilityByCompany[state.company] ?? defaultColumns(state.company);
  const setVisible = (next: React.SetStateAction<string[]>) =>
    setVisibilityByCompany((previous) => {
      const current = previous[state.company] ?? defaultColumns(state.company);
      return {
        ...previous,
        [state.company]: typeof next === "function" ? next(current) : next,
      };
    });
  /**
   * The Columns dropdown applies as you go — it is a popover with two reset
   * actions and no Save, so the grid behind it is the preview.
   */
  const [columnsOpen, setColumnsOpen] = useState(false),
    [columnSearch, setColumnSearch] = useState(""),
    /**
     * The whole drag, held as one object so a row can work out where it sits
     * from a single render: which row is up, the slot it started in, the slot
     * it would land in, how far the pointer has taken it, and whether it is
     * still tracking the pointer or running out its drop animation.
     */
    [drag, setDrag] = useState<{
      key: string;
      from: number;
      to: number;
      dy: number;
      height: number;
      settling: boolean;
    } | null>(null);
  const dragging = drag?.key ?? null;
  const columnSearchRef = useRef<HTMLInputElement>(null);
  const columnList = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number>();
  // The drop commits on a timer, so a popover closed mid-flight must not leave
  // it to fire into a list that is no longer there.
  useEffect(() => () => window.clearTimeout(settleTimer.current), []);
  // The register's party filter. Its own state rather than a column filter on
  // `filters.cols`, because the register does not have the Inbox's columns.
  const [registerParty, setRegisterParty] = useState(""),
    [source, setSource] = useState<Item["source"]>("upload"),
    [sender, setSender] = useState(actor),
    [files, setFiles] = useState<Pick<File, "name" | "size">[]>([]),
    [dragOver, setDragOver] = useState(false),
    [busy, setBusy] = useState(false),
    [uploadErrors, setUploadErrors] = useState<string[]>([]),
    [waRegistered, setWaRegistered] = useState(true),
    [environment, setEnvironment] = useState("Production");
  const uploadLock = useRef(false);
  const [uploadStatus, setUploadStatus] = useState<
    ("Queued" | "Uploading" | "Uploaded" | "Failed")[]
  >([]);
  /**
   * The beat between the last file landing and the Inbox taking over. Only
   * the setter is read now: the line that reported the handoff in words is
   * gone, but the beat itself still paces the dialog's exit.
   */
  const [, setHandoff] = useState(false);
  /** Set for one beat after the dialog leaves, so the table can enter. */
  const [justUploaded, setJustUploaded] = useState(false);
  const sheetSend = useRef<(type: string) => void>(() => {});
  /**
   * The design system's toaster is already mounted in _app.tsx.
   *
   * Typed, because the Tost component always carries a status circle and a
   * bare `toast()` renders none — every notice on this screen used to arrive
   * as an untyped one, so none of them showed the icon the component is built
   * around. Success is the default: most of these confirm something that
   * worked, and the ones that don't say so at the call site.
   *
   * A second line in `message` becomes the subtitle, matching the component's
   * title-and-subtext variant.
   */
  const notify = (
    message: string,
    kind: "success" | "error" | "warning" | "info" = "success"
  ) => {
    const [title, ...rest] = message.split("\n");
    toast[kind](title, {
      duration: 5500,
      description: rest.length ? rest.join(" ") : undefined,
    });
  };
  /**
   * A bulk action's result. It lands bottom-right like every toast, which puts
   * it over the selection bar's end, so it always shows its ×: the house toast
   * reveals the close button on hover only, and a toast sitting on the bar's
   * buttons has to be dismissable at a glance.
   */
  const bulkToast = (
    kind: "success" | "warning" | "error",
    title: string,
    description?: string,
    action?: { label: string; onClick: () => void }
  ) =>
    toast[kind](title, {
      description,
      duration: kind === "success" ? 5500 : 12000,
      action,
      classNames: { closeButton: "!opacity-100 !pointer-events-auto" },
    });
  useEffect(() => {
    init();
    setReady(true);
    try {
      const saved = sessionStorage.getItem(columnVisibilityKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const valid: Record<string, string[]> = {};
          for (const [companyId, values] of Object.entries(parsed)) {
            if (!Array.isArray(values)) continue;
            // Locked columns are forced back in, for the same reason the pins
            // are: a stored session must not restore a table without them.
            const known = columns.filter(
              (c) => values.includes(c) || LOCKED_COLUMNS.has(c)
            );
            if (known.length) valid[companyId] = known;
          }
          setVisibilityByCompany(valid);
        }
      }
      const pn = sessionStorage.getItem("inbox.pinned.v4");
      // Pins are the user's, locked columns included; only unknown labels
      // are dropped.
      const storedPins: string[] = pn
        ? JSON.parse(pn).filter((c: unknown) => columns.includes(c as string))
        : DEFAULT_PINNED;
      setPinned(storedPins);
      const od = sessionStorage.getItem("inbox.order.v4");
      // Reconciled against the current column list rather than trusted: a
      // session stored before a column existed would otherwise drop it from the
      // table for good, since the order is what the grid renders from. Read
      // after the pins, because the pins decide what leads it.
      setOrder(normaliseOrder(od ? JSON.parse(od) : columns, storedPins));
      const ws = sessionStorage.getItem(
        `inbox.widths.v4:${encodeURIComponent(actor)}`
      );
      // Store only finite, bounded manual widths. Missing columns use defaults.
      if (ws) setWidths(readWidths(JSON.parse(ws)));
      const fs = sessionStorage.getItem("inbox.filters.v3");
      if (fs) {
        const v = JSON.parse(fs);
        // The stored shape changed when filters became multi-select; merging
        // over the defaults keeps an old session from crashing the screen.
        setFilters({ ...defaultFilters, ...(v.filters ?? {}) });
        // A session stored before the Exception tab became Duplicate lands on
        // Duplicate rather than silently on All — including the older sessions
        // that stored the status itself as the tab name.
        setTab(
          ["Exception", "Failed", "Duplicate"].includes(v.tab)
            ? "Duplicate"
            : v.tab === "Needs Review"
              ? "Need review"
              : tabs.includes(v.tab)
                ? v.tab
                : "All"
        );
      }
    } catch {}
    const handler = () =>
      toast(
        "Browser storage is full. Export the audit log and free space before continuing.",
        { duration: 5500 }
      );
    window.addEventListener("inbox-storage-error", handler);
    return () => window.removeEventListener("inbox-storage-error", handler);
  }, []);
  useEffect(() => {
    if (ready) {
      sessionStorage.setItem(
        columnVisibilityKey,
        JSON.stringify(visibilityByCompany)
      );
      sessionStorage.setItem("inbox.order.v4", JSON.stringify(order));
      sessionStorage.setItem("inbox.pinned.v4", JSON.stringify(pinned));
      if (!resizing)
        sessionStorage.setItem(
          `inbox.widths.v4:${encodeURIComponent(actor)}`,
          JSON.stringify(widths)
        );
      sessionStorage.setItem(
        "inbox.filters.v3",
        JSON.stringify({ filters, tab })
      );
    }
  }, [
    visibilityByCompany,
    order,
    pinned,
    widths,
    filters,
    tab,
    ready,
    resizing,
  ]);
  const resizeColumn = (column: string, value: number) => {
    setWidths((previous) => ({
      ...previous,
      ...colWidths,
      [column]: clampWidth(column, value),
    }));
  };
  const startResize = (column: string, event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeCleanup.current?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointerId = event.pointerId;
    const before = widths;
    const frozen = { ...widths, ...colWidths };
    const startX = event.clientX;
    const startScroll = gridElement.current?.scrollLeft || 0;
    const oldCursor = document.body.style.cursor;
    const oldSelect = document.body.style.userSelect;
    let frame = 0;
    let latest = colWidth(column);
    setResizing(column);
    setWidths(frozen);
    const publish = () => {
      frame = 0;
      setWidths({ ...frozen, [column]: latest });
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      latest = clampWidth(
        column,
        frozen[column] +
          e.clientX -
          startX +
          (gridElement.current?.scrollLeft || 0) -
          startScroll
      );
      if (!frame) frame = requestAnimationFrame(publish);
    };
    const cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("blur", cancel);
      document.body.style.cursor = oldCursor;
      document.body.style.userSelect = oldSelect;
      resizeCleanup.current = null;
    };
    const finish = (cancelled: boolean) => {
      cleanup();
      setWidths(cancelled ? before : { ...frozen, [column]: latest });
      setResizing(null);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId === pointerId) finish(false);
    };
    const cancel = () => finish(true);
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        finish(true);
      }
    };
    resizeCleanup.current = cleanup;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("blur", cancel);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  /**
   * The "/" on the search field is a promise, so it has to be kept: while the
   * dropdown is open, "/" puts the caret in the column search. Guarded on the
   * event target, or typing a slash into any other field on the screen would
   * yank focus out from under it.
   */
  useEffect(() => {
    if (!columnsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el?.tagName === "INPUT" ||
        el?.tagName === "TEXTAREA" ||
        el?.isContentEditable;
      if (e.key !== "/" || typing) return;
      e.preventDefault();
      columnSearchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [columnsOpen]);
  /**
   * Searching narrows the list, which makes "drop it here" meaningless — the
   * row above the gap may not be the row above it in the real order. So a
   * filtered list is read-only for ordering, and the grips come off.
   */
  const filteringColumns = columnSearch.trim().length > 0;
  const columnMatches = order.filter((c) =>
    c.toLowerCase().includes(columnSearch.trim().toLowerCase())
  );
  /**
   * Pinning moves the column to the back of the pinned block, so pins stack up
   * left to right in the order they were made. Unpinning leaves it exactly
   * where it is — which is the first unpinned slot, where the user last saw it.
   */
  const togglePin = (column: string) => {
    if (pinned.includes(column)) {
      setPinned((p) => p.filter((c) => c !== column));
      return;
    }
    const next = [...pinned, column];
    setPinned(next);
    setOrder((prev) => normaliseOrder(prev, next));
    // A pinned column cannot be hidden, so pinning a hidden one shows it.
    setVisible((v) => (v.includes(column) ? v : [...v, column]));
  };
  const toggleColumn = (column: string, on: boolean) => {
    if (!on && LOCKED_COLUMNS.has(column)) return;
    if (!on && visible.length === 1) return;
    if (!on) setPinned((pins) => pins.filter((c) => c !== column));
    setVisible((v) => {
      if (on) return [...v, column];
      // A table with no columns is not a state worth being able to reach.
      const next = v.filter((c) => c !== column);
      return next.length ? next : v;
    });
  };
  const resetWidths = () => setWidths({});
  const resetColumns = () => {
    setPinned(DEFAULT_PINNED);
    setOrder(normaliseOrder(columns, DEFAULT_PINNED));
    setVisible(defaultColumns(state.company));
    setWidths({});
    setColumnSearch("");
  };
  /** Move `column` to slot `to`, clamped to the unpinned part of the list. */
  const moveColumn = (column: string, to: number) =>
    setOrder((prev) => {
      const from = prev.indexOf(column);
      const target = Math.min(Math.max(to, pinned.length), prev.length - 1);
      if (from < 0 || from === target || pinned.includes(column)) return prev;
      const next = [...prev];
      next.splice(target, 0, next.splice(from, 1)[0]);
      return next;
    });
  /** Row nodes, so a drag can work out which one the pointer is over. */
  const rowNodes = useRef(new Map<string, HTMLElement>());
  /**
   * Drag to reorder. The listeners go on `window` for the same reason the
   * column resize does it — a 28px grip is not something the pointer stays
   * inside once the drag has any speed to it.
   *
   * The order itself is not touched until the pointer comes up. Reordering the
   * array on every crossing is what made this feel abrupt: the row under the
   * cursor and the row being dragged swapped places in one frame, with nothing
   * in between. Instead the list holds still and the drag is expressed purely
   * as transforms — the dragged row tracks the pointer, the rows it has passed
   * slide one slot out of its way, and the array is rewritten once, at the end,
   * to the arrangement already on screen.
   */
  const startRowDrag = (column: string, event: React.PointerEvent) => {
    event.preventDefault();
    const height = rowNodes.current.get(column)?.offsetHeight ?? ROW_HEIGHT;
    const from = order.indexOf(column),
      startY = event.clientY,
      // The pinned block leads the list and nothing may land inside it.
      first = pinned.length,
      last = order.length - 1,
      list = columnList.current,
      startScroll = list?.scrollTop ?? 0;
    let to = from,
      dy = 0;
    setDrag({ key: column, from, to, dy, height, settling: false });
    const move = (e: PointerEvent) => {
      // Measured against the list's own scroll position, so a wheel mid-drag
      // moves the row with the list instead of leaving it behind.
      dy = e.clientY - startY + ((list?.scrollTop ?? 0) - startScroll);
      to = Math.min(Math.max(from + Math.round(dy / height), first), last);
      setDrag({ key: column, from, to, dy, height, settling: false });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      // A tap on the grip that never moved: nothing to settle.
      if (to === from && Math.abs(dy) < 2) return setDrag(null);
      // Otherwise run the row from wherever the pointer left it to the exact
      // slot it is about to occupy, and only commit once it has landed there.
      // Committing straight from an arbitrary offset is the jump at the end.
      setDrag({
        key: column,
        from,
        to,
        dy: (to - from) * height,
        height,
        settling: true,
      });
      settleTimer.current = window.setTimeout(() => {
        moveColumn(column, to);
        setDrag(null);
      }, SETTLE_MS);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };
  /**
   * The order also changes without a drag — pinning sends a row to the front,
   * an arrow key moves one a slot, Reset Default rearranges the lot — and every
   * one of those used to teleport. This animates them the same way the drag
   * does, by the old trick: measure where each row was, put it back there with
   * a transform the instant the new layout lands, then release it on the next
   * frame and let the transition carry it to its real place.
   *
   * No dependency array, because the previous positions have to stay current
   * through renders that move nothing — searching the list, for one. The
   * animation itself is gated on the order actually having changed.
   */
  const rowTops = useRef(new Map<string, number>());
  const layoutKey = `${order.join("|")}::${pinned.join("|")}`;
  const lastLayoutKey = useRef(layoutKey);
  useIsomorphicLayoutEffect(() => {
    const reordered = lastLayoutKey.current !== layoutKey;
    lastLayoutKey.current = layoutKey;
    const tops = rowTops.current;
    for (const [key, node] of rowNodes.current) {
      // Includes the row's own transform, which is what makes this agree with
      // the drag: a row settled into place has already been measured there, so
      // committing the order behind it moves nothing and animates nothing.
      const top = node.getBoundingClientRect().top;
      const was = tops.get(key);
      if (
        reordered &&
        !drag &&
        was !== undefined &&
        Math.abs(was - top) > 0.5
      ) {
        node.style.transition = "none";
        node.style.transform = `translateY(${was - top}px)`;
        requestAnimationFrame(() => {
          node.style.transition = `transform ${SETTLE_MS}ms ${EASE}`;
          node.style.transform = "translateY(0px)";
        });
      }
      tops.set(key, top);
    }
    // Closing the popover unmounts the rows; drop them, or reopening would
    // animate every row in from wherever it sat last time.
    for (const key of [...tops.keys()])
      if (!rowNodes.current.has(key)) tops.delete(key);
  });
  /**
   * Where a row sits while a drag is in flight. The dragged row follows the
   * pointer; every row between its old slot and its new one steps one place
   * towards the gap it left behind. Both are transforms, so nothing reflows and
   * the browser can keep the whole thing on the compositor.
   */
  const rowShift = (index: number, isDragged: boolean) => {
    if (!drag) return 0;
    if (isDragged) return drag.dy;
    if (drag.from < drag.to && index > drag.from && index <= drag.to)
      return -drag.height;
    if (drag.from > drag.to && index >= drag.to && index < drag.from)
      return drag.height;
    return 0;
  };
  /**
   * Content width of the grid scroller, measured rather than guessed at from a
   * breakpoint: the sidebar collapses and the preview pane opens and closes, so
   * the space left for the table has no fixed relationship to the viewport.
   * null until the client has measured, which keeps SSR on the natural width.
   */
  const [avail, setAvail] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  // A callback ref, not useRef + useEffect: the scroller lives inside the list
  // branch, so it mounts and unmounts as the detail view opens, and an effect
  // would need that branch's condition in its dep array to keep up.
  const gridRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    gridElement.current = el;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setAvail(el.clientWidth));
    ro.observe(el);
    observer.current = ro;
    setAvail(el.clientWidth);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  /**
   * What the grid renders: the visible columns, in the order the user arranged
   * them. Everything downstream — widths, headers, cells — reads this, so the
   * two pieces of state can never disagree about the shape of the table.
   */
  const shown = useMemo(
    () => order.filter((c) => visible.includes(c)),
    [order, visible]
  );
  const colWidths = sizeColumns(shown, avail, widths);
  const colWidth = (c: string) => colWidths[c] ?? DEFAULT_WIDTHS[c];
  // Both fixed bookends count: the checkbox at one end, the kebab at the other.
  /**
   * Where each pinned column sticks. Pinned columns lead `shown`, so each one
   * sticks just right of the checkbox column and the pinned columns before it,
   * and they hold still while the rest of the table scrolls under them.
   */
  const stickyLeft: Record<string, number> = {};
  shown
    .filter((c) => pinned.includes(c))
    .reduce((left, c) => {
      stickyLeft[c] = left;
      return left + colWidth(c);
    }, SELECT_WIDTH);
  /**
   * A pinned cell paints its own ground, or the columns scrolling under it
   * show through. The row's hover tint goes on as a background image over
   * that ground, the same way the Actions cell does it.
   */
  const STICKY_CELL = "sticky z-[1]";
  /**
   * Bloocks row states: hovering tints the one cell under the pointer, and a
   * ticked row takes the tint across. Sticky cells paint an opaque ground so
   * the columns scrolling under them don't show through, so they get the same
   * tint as a colour of their own; the rest let the row's ground through.
   */
  const cellGround = (rowSelected: boolean, sticky: boolean) =>
    rowSelected
      ? sticky && "bg-accent"
      : cn(sticky && "bg-background", "hover:bg-accent");
  const tableWidth =
    SELECT_WIDTH +
    ACTIONS_WIDTH +
    shown.reduce((sum, c) => sum + colWidth(c), 0);
  const company = companies.find((c) => c.id === state.company)!;
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const moduleRoute = routes.includes(router.query.module as Route)
    ? (router.query.module as Route)
    : undefined;
  const item = state.items.find(
    (x) => x.id === id && x.company === state.company
  );
  // Attempting to approve one voucher says nothing about the next, and
  // Approve & Next walks straight into it — so the marks come off at the door.
  useEffect(() => setAttempted(false), [id, item?.route]);
  /**
   * Whether this item is still a decision — the states that fall through to the
   * review surface below, rather than to an approved receipt, a delete notice,
   * an extraction spinner or a failure. "Post as" belongs to the header only
   * while the route is still the accountant's to change, so the same condition
   * that picks the review branch has to gate it up there too.
   */
  /**
   * Which approved record is open for editing. Approved means posted, so the
   * form is a record by default — this is the deliberate step back into it.
   */
  const [editingApproved, setEditingApproved] = useState<string | null>(null);
  const reviewable =
    !!item &&
    !["Approved", "Deleted", "Received", "Extracting", "Failed"].includes(
      item.status
    );
  /**
   * One document on screen means the shell goes: sidebar and top bar both. Any
   * detail view qualifies, not just the reviewable ones — an approved receipt
   * or a failed extraction is still a single document being read, and having
   * the chrome appear and disappear according to status would be worse than
   * either state on its own.
   */
  const fullScreen = !!id && !!item;
  // The duplicate's match target is a voucher from before the Inbox, not a
  // document in it — see `priorVoucher`. It stays openable by id; it just never
  // counts as one of the queue's rows.
  //
  // A company nothing has been sent to yet shows an empty queue. The seeded
  // documents behind it are the demo batch the first upload brings in, not
  // arrivals — see `upload`.
  const all = kickstartPreview
    ? []
    : state.items.filter((x) => x.company === state.company && !x.priorVoucher);
  /*
    The welcome dialog: once per company, on its first visit to the Inbox.

    It opens over the queue whatever is in it — an empty Inbox, or one that
    WhatsApp has been filling since before launch — and what it says adapts to
    which (see `arrivals`). Not over a register or a document: those are
    reached from the Inbox, and a first visit that lands on one directly is
    welcomed when it comes back to the queue.
  */
  const welcomed = !!state.welcomed?.includes(state.company);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  useEffect(() => {
    if (ready && !welcomed && !moduleRoute && !id) setWelcomeOpen(true);
  }, [ready, welcomed, moduleRoute, id, state.company]);
  /*
    Documents still being read arrive as a toast, not a banner over the queue:
    it says so once when a batch lands and then gets out of the way, like every
    other notice here. It fires when the count goes up (a new upload, or
    opening the queue with some already in progress), not as it counts down,
    because each document turning up in the table says the rest.

    Never under the welcome: that dialog already reports the batch. While it is
    open, or about to open, the toast waits; when it closes it fires only if
    documents are still being read, and not at all once they are all ready.
  */
  const preparing = all.filter((x) =>
    ["Received", "Extracting"].includes(x.status)
  ).length;
  const welcomePending = welcomeOpen || (!welcomed && !moduleRoute && !id);
  const preparingBefore = useRef(0);
  const welcomeWasPending = useRef(false);
  useEffect(() => {
    const welcomeClosed = welcomeWasPending.current && !welcomePending;
    welcomeWasPending.current = welcomePending;
    if (
      !moduleRoute &&
      !welcomePending &&
      preparing > 0 &&
      (welcomeClosed || preparing > preparingBefore.current)
    )
      toast.info(
        `Preparing ${preparing} document${preparing === 1 ? "" : "s"}`,
        {
          description:
            preparing === 1
              ? "It appears here for review as soon as it is ready."
              : "Each one appears here for review as soon as it is ready.",
          duration: 5500,
        }
      );
    preparingBefore.current = preparing;
  }, [preparing, moduleRoute, welcomePending]);
  const closeWelcome = () => {
    setWelcomeOpen(false);
    const seen = getState().welcomed || [];
    if (!seen.includes(state.company))
      configure({ welcomed: [...seen, state.company] });
  };
  /** Close the welcome, then do the thing — never a dialog over a dialog. */
  const afterWelcome = (next: () => void) => {
    closeWelcome();
    window.setTimeout(next, DIALOG_EXIT_MS);
  };
  const arrivals = useMemo(() => {
    const queue = all.filter(
      (x) => !["Approved", "Deleted"].includes(x.status)
    );
    return {
      total: queue.length,
      ready: queue.filter((x) => x.status === "Needs Review").length,
      whatsapp: queue.filter((x) => x.source === "whatsapp").length,
      whatsappNumber: REGISTERED_WHATSAPP,
      botNumber: AIA_WHATSAPP,
    };
  }, [all]);
  /**
   * Tally sync. Scoped to the route when the workspace is showing one module's
   * posted vouchers — that view is the Figma's "Accounts Payable - All Bills"
   * screen, and its Current Module is not a guess.
   */
  const sync = useTallySync({ items: all, route: moduleRoute ?? null });
  const searchInput = useRef<HTMLInputElement | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const filtered = useMemo(
    () =>
      all
        .filter((x) =>
          moduleRoute
            ? x.status === "Approved" && x.route === moduleRoute
            : matchesTab(x, tab)
        )
        // "See what failed" narrows to what Tally rejected on the last run. It
        // sits outside the filter panel because it is about the run, not about
        // the documents, and it clears itself when the next run starts.
        .filter((x) => !sync.reviewingFailures || sync.failedSyncIds.has(x.id))
        .filter(
          (x) =>
            (!filters.from || x.received.slice(0, 10) >= filters.from) &&
            (!filters.to || x.received.slice(0, 10) <= filters.to) &&
            (!filters.min || x.amount >= Number(filters.min)) &&
            (!filters.max || x.amount <= Number(filters.max)) &&
            Object.entries(filters.cols).every(
              ([column, values]) =>
                !values.length || values.includes(String(cellValue(x, column)))
            ) &&
            [x.file.name, x.form.party, x.sender, x.form.invoiceNo].some((s) =>
              s.toLowerCase().includes(filters.search.toLowerCase())
            )
        )
        .sort((a, b) => {
          if (!sort) return 0;
          const av = cellValue(a, sort.key),
            bv = cellValue(b, sort.key);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv), undefined, {
                  numeric: true,
                });
          return sort.dir === "asc" ? cmp : -cmp;
        }),
    [
      all,
      moduleRoute,
      tab,
      filters,
      sort,
      sync.reviewingFailures,
      sync.failedSyncIds,
    ]
  );

  /** The rows actually on screen — what a row index in the grid refers to. */
  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize]
  );
  /**
   * Everything on this company's books for the module being shown, in the
   * register's order — newest first, which is the order a register is read in.
   */
  const moduleItems = useMemo(
    () =>
      moduleRoute
        ? all
            .filter((x) => x.route === moduleRoute)
            .slice()
            .sort((a, b) => b.received.localeCompare(a.received))
        : [],
    [all, moduleRoute]
  );
  /** Where Tally stands on one voucher, in the register's four words. */
  const registerSyncState = (item: Item): RegisterSyncState =>
    sync.inFlightIds.has(item.id)
      ? "syncing"
      : sync.failedSyncIds.has(item.id)
        ? "failed"
        : sync.syncedIds.has(item.id)
          ? "synced"
          : "pending";
  /** Whether the selection has been widened past the page it started on. */
  const allFilteredSelected =
    !!filtered.length && filtered.every((x) => selected.includes(x.id));
  /**
   * The Voucher type dropdown, grouped by the voucher each type posts as.
   * Groups for a route this role cannot write to are left out: offering one
   * would be offering a pick the store then refuses.
   */
  const voucherTypeGroups = VOUCHER_GROUPS.filter((group) =>
    state.permissions.includes(group.route)
  ).map((group) => ({ heading: group.label, options: group.types }));

  /**
   * What each reassignable field can be set to.
   *
   * Vendors and ledgers are read off the queue itself — the names in play are
   * the ones worth offering — while voucher types and registrations are fixed
   * lists. Same sources the drawer used; they moved, they did not change.
   */
  const bulkOptions = (field: BulkField): string[] => {
    if (field === "Voucher Type") return [...BULK_VOUCHER_TYPES];
    if (field === "GST Registration") return company.branches;
    return [
      ...new Set(
        field === "Vendor"
          ? [...createdMasters.Vendor, ...all.map((x) => x.form.party)]
          : [
              ...createdMasters.Ledger,
              ...ledgerOptions,
              ...all.flatMap((x) => x.form.lines.map((line) => line.ledger)),
            ]
      ),
    ]
      .filter(Boolean)
      .sort();
  };

  /** Distinct values for a column, for the funnel and the panel. */
  const optionsFor = (column: string) =>
    [...new Set(all.map((x) => String(cellValue(x, column))))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((v) => ({ value: v, label: v }));

  const colFilter = (column: string) => filters.cols[column] ?? [];
  const setColFilter = (column: string, values: string[]) => {
    setFilters((f) => ({ ...f, cols: { ...f.cols, [column]: values } }));
    setPage(0);
    setSelected([]);
  };
  const toggleSort = (column: string) =>
    setSort((prev) =>
      prev?.key === column
        ? prev.dir === "asc"
          ? { key: column, dir: "desc" }
          : null
        : { key: column, dir: "asc" }
    );
  const activeFilterCount =
    Object.values(filters.cols).reduce((n, v) => n + (v?.length ?? 0), 0) +
    ["from", "to", "min", "max"].filter((k) => filters[k as keyof Filters])
      .length;
  /** What the Filters button's badge counts: the date has its own chip. */
  const panelFilterCount =
    activeFilterCount -
    ["from", "to"].filter((k) => filters[k as keyof Filters]).length;
  const setFilter = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
    setSelected([]);
  };
  const open = (x: Item) => {
    configure({ queue: filtered.map((x) => x.id) });
    event("Inbox Item Viewed", x, {
      ai_route: x.aiRoute,
      item_status: x.status,
    });
    void router.push(detailHref(x.id));
  };
  /**
   * Keyboard navigation. Mounted here rather than inside the table because the
   * entry points (`/`, `Shift+/`, `Alt+T`) are page-level: they have to work
   * before the grid has focus, which is the point of them.
   */
  const grid = useGridKeyboard({
    gridRef: gridElement,
    rowCount: pageRows.length,
    colCount: shown.length,
    onOpenShortcuts: () => setShortcutsOpen((v) => !v),
    onFocusSearch: () => searchInput.current?.focus(),
    onActivateRow: (row) => {
      const item = pageRows[row];
      if (item) open(item);
    },
    onSortColumn: (col) => {
      const column = shown[col];
      if (column && SORTABLE.has(column)) toggleSort(column);
    },
    onFilterColumn: (col) => {
      const column = shown[col];
      if (!column || !FILTERABLE.has(column)) return;
      // Click the funnel rather than lifting every popover into controlled
      // state: Radix already owns opening it, placing it and moving focus
      // inside, and a second source of truth for "is this one open" is how
      // two popovers end up open at once.
      gridElement.current
        ?.querySelector<HTMLButtonElement>(
          `[data-filter-trigger="${CSS.escape(column)}"]`
        )
        ?.click();
    },
  });

  /*
    Two different "next". Approve & Next is walking a review queue, so it skips
    to the next thing that still needs a decision. The pager's Next is walking
    the table you opened the record from, whatever those rows are — it used to
    hunt for a reviewable item too, so from an approved record it found none and
    dropped you back on the table instead of moving to the next approved file.
  */
  const nextItem = (reviewableOnly = false) => {
    if (!item) return;
    const queue = getState().queue;
    const ix = queue.indexOf(item.id);
    const ids = ix < 0 ? queue : queue.slice(ix + 1);
    const next = ids
      .map((id) =>
        getState().items.find((x) => x.id === id && x.company === state.company)
      )
      .find(
        (x) =>
          x &&
          (reviewableOnly
            ? ["Needs Review", "Duplicate"].includes(x.status)
            : !["Deleted", "Failed"].includes(x.status))
      );
    void router.push(next ? detailHref(next.id) : "/inbox");
  };
  const approveItem = () => {
    if (!item) return;
    setAttempted(true);
    const error = approve(item.id);
    if (error) {
      /*
        Both of the forms the Inbox renders itself say their own faults in
        place — the journal's imbalance banner and its per-cell "Required
        Field", the invoice's marked income-ledger cells. Repeating those as a
        toast would put the same sentence in two places and point away from the
        cell that fixes it. Anything the form has no way to show still surfaces.
      */
      const shownOnForm = (
        {
          JV: [
            "Debit and credit totals don’t match.",
            "One line is missing its ledger or amount.",
          ],
          AR: ["Every line needs an income ledger."],
          AP: [],
        } as Record<Route, string[]>
      )[item.route].includes(error);
      if (!shownOnForm) notify(error, "error");
      return;
    }
    notify(
      `${getState().items.find((x) => x.id === item.id)?.form.voucherNo || item.file.name} approved. Ready to sync to Tally.`
    );
    nextItem(true);
  };
  /**
   * Closing an edited posted voucher. The flag is raised on what actually
   * changed rather than on the act of opening the form, so re-reading a record
   * and closing it again leaves it alone.
   */
  const finishApprovedEdit = () => {
    if (!item) return;
    const current = getState().items.find((x) => x.id === item.id);
    setEditingApproved(null);
    if (!current) return;
    const changed =
      JSON.stringify(current.form) !== JSON.stringify(current.snapshot);
    if (!changed) {
      notify("No changes made. Tally is already up to date.");
      return;
    }
    /*
      Only a voucher Tally already has can fall behind it. Approved-but-never-
      synced is not "edited after syncing" — it is still just waiting for its
      first run, and the cloud says so.
    */
    if (!sync.syncedIds.has(current.id)) {
      notify("Changes saved. They go to Tally with the next sync.");
      return;
    }
    if (!current.resyncNeeded) updatePosted(current.id, { resyncNeeded: true });
    /*
      No re-sync flow, and none is needed: the voucher goes back into the
      syncable pool, so the next ordinary run carries it exactly as it would a
      document that had never been across.
    */
    sync.markForResync(current.id);
    notify(
      "Changes saved. Sync again to update this voucher in Tally.",
      "warning"
    );
  };
  const edit = (patch: Partial<Form>) => {
    if (!item) return;
    const next = {
      form: { ...item.form, ...patch },
      edited: [...new Set([...item.edited, ...Object.keys(patch)])],
      firstAttempt: false,
    };
    // A posted voucher only takes edits through the door it was opened with.
    if (approvedEditing) updatePosted(item.id, next);
    else update(item.id, next);
  };
  const matched = item ? hardMatch(item) : undefined;
  const reason = item ? issue(item) : "";
  const approvedEditing =
    !!item && item.status === "Approved" && editingApproved === item.id;
  // Paging to another record closes the one you had open for editing.
  useEffect(() => {
    if (editingApproved && editingApproved !== item?.id)
      setEditingApproved(null);
  }, [item?.id, editingApproved]);
  const canReview =
    item &&
    (["Needs Review", "Duplicate"].includes(item.status) || approvedEditing) &&
    state.permissions.includes(item.route);
  /**
   * Why Approve is unavailable, said to the person it stops.
   *
   * The button used to carry `issue()`'s own return value on a `title`, which
   * failed twice over. A disabled button receives no pointer events, so the
   * native tooltip never fires — the control was inert with no stated reason,
   * and on a hard-block duplicate that is the one thing the screen most owes
   * the accountant. And the strings themselves are the validator's labels,
   * not sentences: "Ledger required", "Not in Needs Review".
   *
   * The clauses mirror the button's own `disabled` expression exactly, in the
   * same order, so the two cannot drift into disagreeing about whether there
   * is anything to explain.
   *
   * A journal's own faults are NOT here. They disable nothing — the voucher
   * answers for them on the form, where the cell that fixes each one is, which
   * a tooltip on a button at the other end of the header cannot point at.
   */
  /*
    A Post as change re-reads the document on the backend, which takes 20s or
    more. Until it lands the form isn't the new voucher yet, so nothing on it
    can be approved.
  */
  const switching =
    !!item?.routeSwitch && item.routeSwitch.until > Date.now();
  const blockReason =
    !item || !reviewable
      ? ""
      : switching
        ? `Still preparing this as a ${ROUTE_LABELS[item.route]}. Approve once it’s ready.`
        : !state.permissions.includes(item.route)
        ? `Your role can’t post to ${routeNames[item.route]}. Change the route above, or ask an administrator for access.`
        : matched
          ? `Same invoice number as ${matched.form.voucherNo} for ${item.form.party}. Change the vendor or the invoice number to approve.`
          : "";
  const deleteItem = () =>
    item &&
    askDelete(`“${item.file.name}”`, () => {
      remove(item.id);
      notify(`Deleted ${item.file.name}.`);
      nextItem();
    });
  // Production's sidebar entries map onto the three module views this
  // prototype actually has; the rest are real nav in the app but unbuilt here,
  // so they say so rather than routing into a 404.
  const NAV_TO_ROUTE: Record<string, Route> = {
    purchases: "AP",
    sales: "AR",
    // Both the group and its first child land on the same register, so
    // pressing Accounting opens what it contains rather than nothing.
    accounting: "JV",
    "journal-vouchers": "JV",
  };
  const ROUTE_TO_NAV: Record<Route, string> = {
    AP: "purchases",
    AR: "sales",
    // Journals sit under Accounting, which is a group — the entry that reads
    // as current is the child, not the parent.
    JV: "journal-vouchers",
  };
  const navId = moduleRoute ? ROUTE_TO_NAV[moduleRoute] : "inbox";
  const selectNav = (navItemId: string) => {
    if (navItemId === "inbox") {
      setFilters(defaultFilters);
      void router.push("/inbox");
      return;
    }
    if (navItemId === "dashboard") {
      setDialog("dashboard");
      return;
    }
    const route = NAV_TO_ROUTE[navItemId];
    if (route) {
      setFilters(defaultFilters);
      void router.push(`/inbox?module=${route}`);
      return;
    }
    notify("That screen is part of the app, but not this prototype.", "info");
  };
  const changeCompany = (value: string) => {
    configure({ company: value, queue: [] });
    setSelected([]);
    setFilters(defaultFilters);
    setTab("Need review");
    void router.push("/inbox");
  };
  const downloadAudit = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          state.events.filter((e) => e.company === state.company),
          null,
          2
        ),
      ],
      { type: "application/json" }
    );
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = "inbox-audit.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  };
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const editTableField = (item: Item, field: BulkField, value: string) => {
    const result = applyBulkAction([item.id], field, value);
    if (!result.changed) {
      const reason = Object.keys(result.reasons)[0];
      notify(
        reason
          ? `${FIELD_LABEL[field] || field} not changed: ${plainReason(reason)}.`
          : "This voucher is posted. Use Edit entry to change it.",
        "error"
      );
      return false;
    }
    notify(`${FIELD_LABEL[field] || field} changed to ${value}.`);
    return true;
  };
  /**
   * Approve one row from its Status dropdown. The same check as the review
   * form; the table has no red fields to point at, so a refusal names what is
   * missing instead.
   */
  const approveRow = (x: Item) => {
    const error = approve(x.id);
    if (error) {
      const current = getState().items.find((item) => item.id === x.id);
      const missing = current ? missingFields(current) : [];
      // Title says which document, description says what to do about it.
      notify(
        `${x.file.name} not approved\n${
          missing.length
            ? `Add the ${fieldList(missing)}, then approve.`
            : error
        }`,
        "error"
      );
      return;
    }
    notify(
      `${getState().items.find((item) => item.id === x.id)?.form.voucherNo || x.file.name} approved. Ready to sync to Tally.`
    );
  };
  const canEditTableItem = (item: Item) =>
    !moduleRoute &&
    ["Needs Review", "Duplicate"].includes(item.status) &&
    state.permissions.includes(item.route);

  const reportBulk = (verb: string, result: BulkResult) => {
    const total = result.changed + result.skipped;
    const breakdown = Object.entries(result.reasons)
      .map(([reason, count]) => `${count} ${plainReason(reason)}`)
      .join(" · ");
    const done = verb.toLowerCase();
    notify(
      !result.skipped
        ? `${docs(result.changed)} ${done}.`
        : result.changed
          ? `${result.changed} of ${total} ${done}\n${breakdown}.`
          : `None of the ${total} ${done}\n${breakdown}.`,
      !result.skipped ? "success" : result.changed ? "warning" : "error"
    );
    setSelected([]);
  };
  /**
   * Apply the staged edits, then approve.
   *
   * Voucher type goes first, because it can move a row to another route, and a
   * vendor or ledger set before that is set against the wrong one. A row that
   * refuses any staged edit is not approved: approving it would post values
   * the accountant did not choose. The toast counts it as skipped, with why.
   */
  /**
   * Write the staged edits to one row, in `BULK_APPLY_ORDER`. Returns why the
   * row refused, or "" when every edit landed.
   */
  const applyStaged = (id: string) => {
    for (const field of BULK_APPLY_ORDER) {
      const value = bulkStaged[field];
      if (!value) continue;
      const result = applyBulkAction([id], field, value);
      if (result.skipped)
        return plainReason(Object.keys(result.reasons)[0] || "Edit refused");
    }
    return "";
  };
  /**
   * Save the staged edits without approving.
   *
   * For the accountant who has fixed what they can for now and will approve
   * later, or wants someone else to. The rows stay selected and in Needs
   * Review; only the staged values are written.
   */
  const bulkSave = () => {
    const refused = new Map<string, string>();
    for (const id of selected) {
      const reason = applyStaged(id);
      if (reason) refused.set(id, reason);
    }
    setBulkStaged({});
    const saved = selected.length - refused.size;
    if (!refused.size) {
      bulkToast(
        "success",
        `Changes saved to ${docs(saved)}.`,
        "They stay in Needs Review until approved."
      );
      return;
    }
    bulkToast(
      saved ? "warning" : "error",
      saved
        ? `Changes saved to ${saved} of ${selected.length}`
        : `No changes saved`,
      `${reasonBreakdown(refused.values())}.`
    );
  };
  const bulkApprove = () => {
    /** Why each row that did not get approved did not, by document id. */
    const held = new Map<string, string>();
    for (const id of selected) {
      let refused = applyStaged(id);
      if (!refused) {
        const result = applyBulkAction([id], "Approve");
        if (!result.skipped) continue;
        // Say what is missing rather than "Fill the fields marked in red":
        // there are no red fields on a table row. Read from the store, not
        // this render's snapshot, so the staged edits just applied count.
        const current = getState().items.find((x) => x.id === id);
        const missing = current ? missingFields(current) : [];
        refused = missing.length
          ? `missing ${fieldList(missing)}`
          : plainReason(Object.keys(result.reasons)[0] || "Not approved");
      }
      held.set(id, refused);
    }
    setBulkStaged({});
    const approvedCount = selected.length - held.size;
    if (!held.size) {
      bulkToast(
        "success",
        `${docs(approvedCount)} approved.`,
        "Ready to sync to Tally."
      );
      setSelected([]);
      return;
    }
    /*
      Partial approval. The complete documents are approved; the rest stay
      selected, so the bar is already pointed at exactly the documents that
      need fixing: stage the missing value, Save & approve again. The toast
      says what each one lacks, grouped, and Review opens the first.
    */
    const heldIds = [...held.keys()];
    setSelected(heldIds);
    const first = getState().items.find((x) => x.id === heldIds[0]);
    bulkToast(
      approvedCount ? "warning" : "error",
      approvedCount
        ? `${approvedCount} of ${selected.length} approved. ${held.size} need${held.size === 1 ? "s" : ""} attention.`
        : `None of the ${selected.length} approved`,
      // What is wrong, then where to fix it: the held ones are still selected.
      `${reasonBreakdown(held.values())}. Still selected, so you can fix them from the bar.`,
      first ? { label: "Review", onClick: () => open(first) } : undefined
    );
  };
  /*
    Every delete asks first, and asks in one place.

    Delete is the only destructive action on this screen that is one click
    from a menu — Approve posts and can be reversed, a reassignment is another
    reassignment away from where it was. The review page's Delete sat beside
    Approve and took the document away mid-read with no way back into it.

    The wording says what is true. There is no Deleted tab and no Restore: a
    deleted document leaves the Inbox and that is the end of it, which is
    exactly why the question is worth asking. An earlier draft promised a tab
    to get it back from — the tab does not exist, and a confirmation that
    reassures you with something untrue is worse than no confirmation.
  */
  const [confirmDelete, setConfirmDelete] = useState<{
    target: string;
    many: boolean;
    run: () => void;
  } | null>(null);
  const askDelete = (target: string, run: () => void, many = false) =>
    setConfirmDelete({ target, many, run });
  /*
    One row's delete, run through the same guard as the bar's.

    An approved voucher is read-only and an already-deleted one is nothing to
    do, and the kebab is reachable on both — so the refusal has to come from
    the same place the bulk path gets it from, or the two disagree about what
    a deletable row is.
  */
  const deleteRow = (x: Item) =>
    askDelete(`“${x.file.name}”`, () => {
      const result = applyBulkAction([x.id], "Delete");
      if (!result.changed) {
        notify(
          Object.keys(result.reasons).join(" · ") ||
            "This row can’t be deleted.",
          "error"
        );
        return;
      }
      notify(`Deleted ${x.file.name}.`);
    });
  /*
    A pick stages the value; Approve applies it. Picking the staged value again
    takes it back off.
  */
  const stageBulk = (field: BulkField, value: string) =>
    setBulkStaged((staged) => {
      const next = { ...staged };
      if (next[field] === value) delete next[field];
      else next[field] = value;
      return next;
    });
  // First intake simulates the full dataset; later selections add one document.
  // Pass files directly: React state may still contain the previous selection.
  const addFiles = (
    incoming: FileList | null,
    intakeSource: Item["source"] = source
  ) => {
    const list = Array.from(incoming || []);
    if (!list.length || uploadLock.current) return;
    if (list.length > MAX_UPLOAD_FILES) {
      notify(
        `Up to ${MAX_UPLOAD_FILES} files at a time. Choose fewer and upload again.`,
        "warning"
      );
      return;
    }
    if (intakeSource === "whatsapp" && !waRegistered) {
      notify(
        "This number isn’t registered with AI Accountant. Register it to send documents on WhatsApp.",
        "warning"
      );
      return;
    }
    if (!state.permissions.length) {
      notify(
        "You need posting access to upload documents. Ask your admin.",
        "error"
      );
      return;
    }
    void upload(list.slice(0, 1), intakeSource);
  };
  /**
   * What a retry needs from the run it is retrying: where the batch was going,
   * and the demo documents that did not make it, by their row in the panel.
   * A file the user chose is its own `File` in `files`; a demo sample is not a
   * file at all, so the item it stands for is kept here until it lands.
   */
  const retryRun = useRef<{
    company: string;
    source: Item["source"];
    samples: Map<number, Item>;
  }>({ company: "", source: "upload", samples: new Map() });
  /**
   * Rows being sent again. While there are any, the panel keeps the list of
   * failures on screen — each row showing its own attempt — instead of
   * swapping to the full run list, where the row being retried would be one
   * of thirty-six and scrolled out of view.
   */
  const [retrying, setRetrying] = useState<number[]>([]);
  /**
   * Which group each failed row sits in: `retry` (the same file can go again)
   * or `replace` (it needs a new file). Fixed when the row fails, so a row
   * being retried stays where it is instead of jumping groups the moment its
   * error clears.
   */
  const [failGroups, setFailGroups] = useState<
    Record<number, "retry" | "replace">
  >({});
  const markFailed = (index: number, errors: string[]) => {
    if (!errors.length) return;
    const reason = errors[0].slice(errors[0].indexOf(": ") + 2).trim();
    setFailGroups((current) => ({
      ...current,
      [index]: classifyFailure(reason).retry ? "retry" : "replace",
    }));
  };
  /**
   * Which kind of upload the panel was opened for.
   *
   * - `bulk` — from the welcome dialog. Always the full demo batch alongside
   *   the file chosen: the welcome is where the Inbox is being introduced, and
   *   a batch arriving, being read and landing is the thing it introduces.
   * - `single` — from Upload Documents above the table. Only the file chosen:
   *   this is the everyday button, and it does what it says.
   * - `auto` — anything else (the guide, the intake demos): bulk on a
   *   company's first upload, single after.
   *
   * Set by each entry point, and back to `auto` once a run finishes so an
   * "Upload more" from the result panel is an ordinary upload.
   *
   * DEV: prototype-only. Production uploads the files it is given.
   */
  const intakeMode = useRef<"bulk" | "single" | "auto">("auto");
  const upload = async (
    selectedFiles: File[],
    intakeSource: Item["source"],
    /**
     * The guided walkthrough's own batch.
     *
     * It sends documents in with no file of the user's involved, so the demo
     * samples are seeded whatever the company's history is, and nothing in the
     * batch is made to fail — a tour is not the place to introduce a problem
     * the viewer cannot act on. Everything after this line is the ordinary
     * upload: the same panel, the same extraction, the same queue.
     */
    demo?: { count: number }
  ) => {
    const targetCompany =
      intakeSource === "whatsapp" ? state.waCompany : state.company;
    const firstUpload =
      !state.startedCompanies?.includes(targetCompany) &&
      !startedInboxCompanies.has(targetCompany);
    const mode = intakeMode.current;
    intakeMode.current = "auto";
    const bulk = mode === "bulk" || (mode === "auto" && firstUpload);
    const samples = demo
      ? demoUploadDocuments(targetCompany, demo.count)
      : bulk
        ? demoUploadDocuments(targetCompany, 35, {
            source: intakeSource,
            sender: intakeSource === "upload" ? actor : sender,
          })
        : [];
    const batch = [
      ...selectedFiles,
      ...samples.map((item) => ({
        name: item.file.name,
        size: (parseFloat(item.file.size) || 240) * 1024,
      })),
    ];
    /*
      Two of the demo documents fail on the way up, by default.

      An upload that has never once failed is not a thing anyone has watched:
      the interesting question this screen answers is what a batch looks like
      when part of it does not land, and a run that is always clean never asks
      it. The picks are positional rather than random so the same upload is the
      same demo twice, and they are spread — one early, one late — so the
      failure is seen arriving and seen surviving the rest of the run.

      Only samples fail. A file the user actually chose is theirs, and losing
      it to a simulation would be the prototype inventing a problem with their
      document.
    */
    /*
      Three of them, two ways: two uploads interrupted (a retry fixes those)
      and one password-protected PDF (only a new file does). A demo that fails
      only one way never shows the panel sorting failures by what fixes them.
    */
    const failAt = new Map<number, UploadFailureKind>(
      samples.length && !demo
        ? [
            [selectedFiles.length + 3, "interrupted"],
            [
              selectedFiles.length + Math.floor(samples.length * 0.45),
              "password",
            ],
            [
              selectedFiles.length + Math.floor(samples.length * 0.7),
              "interrupted",
            ],
          ]
        : []
    );

    const receivedIds: string[] = [];
    // Collected here as well as in state: the checks after the loop run in the
    // same tick as the last setState, which has not been applied yet.
    const failures: string[] = [];
    const landed: typeof samples = [];
    const dropped: typeof samples = [];
    retryRun.current = {
      company: targetCompany,
      source: intakeSource,
      samples: new Map(),
    };
    setFailGroups({});
    uploadLock.current = true;
    setBusy(true);
    setFiles(batch);
    setUploadErrors([]);
    setUploadStatus(batch.map(() => "Queued"));
    setDialog("upload");
    let received = 0;
    try {
      for (const [index, file] of batch.entries()) {
        setUploadStatus((current) =>
          current.map((status, i) => (i === index ? "Uploading" : status))
        );
        let errors: string[];
        try {
          // Keep each transition visible in this prototype, even for tiny files.
          const [result] = await Promise.all([
            selectedFiles[index]
              ? ingest(
                  [selectedFiles[index]],
                  intakeSource,
                  intakeSource === "upload" ? actor : sender,
                  targetCompany,
                  { deferExtraction: true, receivedIds }
                )
              : Promise.resolve<string[]>([]),
            new Promise<void>((resolve) =>
              /*
                One steady beat per file. It used to be `100 + (index % 3) * 45`
                — a 100/145/190 cycle that made the bar stutter forward at three
                different speeds and read as random rather than as progress.
              */
              window.setTimeout(resolve, demo ? 600 : bulk ? 120 : 800)
            ),
          ]);
          const simulated = failAt.get(index);
          errors = simulated
            ? [`${file.name}: ${failureText(simulated)}`]
            : result;
        } catch (error) {
          errors = [`${file.name}: could not save file. ${String(error)}`];
        }
        if (!errors.length && selectedFiles[index]) received++;
        /*
          A document that did not finish uploading is not in the Inbox. It used
          to be published regardless, because nothing in the batch could fail —
          so the failure would have been a message about a row that was sitting
          in the table behind it.
        */
        const sample = samples[index - selectedFiles.length];
        if (sample) (errors.length ? dropped : landed).push(sample);
        if (sample && errors.length)
          retryRun.current.samples.set(index, sample);
        failures.push(...errors);
        markFailed(index, errors);
        setUploadErrors((current) => [...current, ...errors]);
        setUploadStatus((current) =>
          current.map((status, i) =>
            i === index ? (errors.length ? "Failed" : "Uploaded") : status
          )
        );
      }
      // `landed` as well as `received`: the guide's batch is all samples and
      // no file of the user's, and it still has to be published and extracted.
      if (received || landed.length) {
        /*
          The handoff, in four beats.

          1  DWELL     the count lands on its final figure and the line under
                       it names where this is going. Without a pause the last
                       document settles and the dialog is already gone, so the
                       run has no ending — just a disappearance.
          2  CLOSE     the dialog plays its own 200ms exit.
          3  HAND OVER the table's entrance starts while the overlay is still
                       clearing, so the two overlap rather than leaving a gap
                       of bare screen between them. It used to start in the
                       same tick as the close, which ran the whole entrance
                       behind a dialog that had not finished leaving — by the
                       time you could see the table it had stopped moving.
          4  RESET     the panel's contents go last. Cleared any sooner and it
                       flips back to the empty drop zone mid-fade, so the last
                       thing seen on the way out is a screen asking for files.

          A failed run gets the same handoff. What it does not get is silence:
          the toast names the count, and the documents that did not make it are
          not in the table behind it.
        */
        const wait = (ms: number) =>
          new Promise<void>((resolve) => window.setTimeout(resolve, ms));

        setHandoff(true);
        await wait(DIALOG_DWELL_MS);

        beginUploadedExtraction(
          targetCompany,
          landed,
          receivedIds,
          dropped.map((item) => item.id)
        );
        startedInboxCompanies.add(targetCompany);
        configure({ tourDone: true });
        if (targetCompany === state.company) setKickstartPreview(false);
        setFilters(defaultFilters);
        setPage(0);
        setTab("All");
        setSort(null);
        setSelected([]);

        /*
          A run that lost documents keeps its panel.

          The table behind it is already live — the batch was published a few
          lines up — so the screen it is going to arrive at has arrived; it is
          just under the overlay. What stays open is the list naming what did
          not make it, and it closes when the reader closes it, not on a timer
          they did not set. Everything else is identical to a clean run, which
          is why only the dismissal differs here.
        */
        if (failures.length) {
          setHandoff(false);
          return;
        }

        setDialog("");
        window.setTimeout(() => setJustUploaded(true), DIALOG_EXIT_MS * 0.6);
        window.setTimeout(
          () => setJustUploaded(false),
          DIALOG_EXIT_MS + TABLE_ENTER_MS
        );
        window.setTimeout(() => {
          setFiles([]);
          setUploadStatus([]);
          setHandoff(false);
        }, DIALOG_EXIT_MS);
      }
    } finally {
      uploadLock.current = false;
      setBusy(false);
    }
  };
  /**
   * Send the failed documents of the last run again, in place.
   *
   * Each row goes back through the same beats as the first attempt — Uploading,
   * then Uploaded or Failed — so the panel, the count and the drawing all move
   * the way they did the first time. What lands is published and extracted
   * like any upload. When nothing is left failing, the panel closes the way a
   * clean run does; otherwise it stays, listing only what is still missing.
   *
   * In the prototype the connection drop is the only failure a retry can fix,
   * and the second attempt always gets through — see `canRetry`.
   */
  const retryUploads = async (
    indexes: number[],
    /** Choose file: a corrected copy sent in place of the row's file. */
    replacement?: { index: number; file: File }
  ) => {
    if (uploadLock.current || !indexes.length) return;
    const { company: target, source: from, samples } = retryRun.current;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    const receivedIds: string[] = [];
    const recovered: Item[] = [];
    let stillFailing = uploadStatus.filter(
      (status) => status === "Failed"
    ).length;
    uploadLock.current = true;
    setBusy(true);
    setRetrying(indexes);
    try {
      for (const index of indexes) {
        const previous = files[index];
        const file = replacement?.index === index ? replacement.file : previous;
        if (!file || !previous) continue;
        if (file !== previous) {
          // The replacement is the user's own file: it stands in for the
          // row, and the demo document the row was standing for goes.
          samples.delete(index);
          setFiles((current) =>
            current.map((entry, i) => (i === index ? file : entry))
          );
        }
        setUploadStatus((current) =>
          current.map((status, i) => (i === index ? "Uploading" : status))
        );
        let errors: string[];
        try {
          const [result] = await Promise.all([
            file instanceof File
              ? ingest(
                  [file],
                  from,
                  from === "upload" ? actor : sender,
                  target,
                  { deferExtraction: true, receivedIds }
                )
              : Promise.resolve<string[]>([]),
            wait(800),
          ]);
          errors = result;
        } catch (error) {
          errors = [`${file.name}: could not save file. ${String(error)}`];
        }
        markFailed(index, errors);
        if (!errors.length && file !== previous)
          notify(`${file.name} uploaded in place of ${previous.name}.`);
        if (!errors.length) {
          stillFailing--;
          const sample = samples.get(index);
          if (sample) {
            recovered.push(sample);
            samples.delete(index);
          }
        }
        setUploadErrors((current) => [
          ...current.filter(
            (entry) =>
              !entry.startsWith(`${previous.name}:`) &&
              !entry.startsWith(`${file.name}:`)
          ),
          ...errors,
        ]);
        setUploadStatus((current) =>
          current.map((status, i) =>
            i === index ? (errors.length ? "Failed" : "Uploaded") : status
          )
        );
      }
      if (recovered.length || receivedIds.length)
        beginUploadedExtraction(target, recovered, receivedIds);
      if (stillFailing > 0) return;
      // Everything is in: the same ending as a clean run.
      setHandoff(true);
      await wait(DIALOG_DWELL_MS);
      setDialog("");
      window.setTimeout(() => setJustUploaded(true), DIALOG_EXIT_MS * 0.6);
      window.setTimeout(
        () => setJustUploaded(false),
        DIALOG_EXIT_MS + TABLE_ENTER_MS
      );
      window.setTimeout(() => {
        setFiles([]);
        setUploadStatus([]);
        setUploadErrors([]);
        setHandoff(false);
        setRetrying([]);
      }, DIALOG_EXIT_MS);
    } finally {
      uploadLock.current = false;
      setBusy(false);
      // A clean finish keeps its rows up until the panel has gone (above).
      if (stillFailing > 0) setRetrying([]);
    }
  };
  /*
    The guided walkthrough asking the screen to do something.

    The journey demonstrates the flow instead of waiting for a document the
    viewer may not have to hand, and sending one in is the screen's to do. The
    listener is re-attached every render on purpose: it reads `all` and the
    dialog setters, and a handler pinned once would send the guide's bill into
    the company that was open when the tour started.

    DEV: delete with components/guide/actions on transplant — production's
    guide service narrates the user's own upload and asks for nothing here.
  */
  useEffect(() => {
    const onGuideAction = (event: Event) => {
      const action = (event as CustomEvent<{ action: GuideAction }>).detail
        ?.action;
      if (action === "open-upload") {
        intakeMode.current = "auto";
        setSource("upload");
        setFiles([]);
        setUploadStatus([]);
        setUploadErrors([]);
        setDialog("upload");
      }
      if (action === "demo-upload") void upload([], "upload", { count: 3 });
      if (action === "open-record") {
        /*
          Extraction is still running when this arrives — the step before it
          is the one watching documents come out of it — so the open is
          retried rather than fired once at a queue that has nothing ready in
          it yet. It reads the store directly each time: `all` is this
          render's list, and the document being waited for is by definition
          not in it.
        */
        let tries = 0;
        const attempt = () => {
          const ready = getState().items.find(
            (x) =>
              x.company === state.company &&
              ["Needs Review", "Duplicate"].includes(x.status)
          );
          if (ready) open(ready);
          else if (++tries < 20) window.setTimeout(attempt, 400);
        };
        attempt();
      }
      if (action === "reset-demo") {
        resetCompany(state.company);
        startedInboxCompanies.delete(state.company);
        // Back to how this company started: empty for a new user, the WhatsApp
        // backlog for one who registered before launch.
        setKickstartPreview(
          !getState().startedCompanies?.includes(state.company)
        );
        setDialog("");
        setFiles([]);
        setUploadStatus([]);
        setUploadErrors([]);
        setHandoff(false);
        setFilters(defaultFilters);
        setTab("Need review");
        setPage(0);
        setSelected([]);
        /* The tour's last steps run on a document, and a document is `?id=`
           on this same route — so it is the query that has to go, not the
           path. Left alone, the review screen stays up over an Inbox that has
           been emptied behind it. */
        if (router.asPath !== "/inbox") void router.push("/inbox");
      }
    };
    window.addEventListener(GUIDE_ACTION_EVENT, onGuideAction);
    return () => window.removeEventListener(GUIDE_ACTION_EVENT, onGuideAction);
  });
  const uploadedCount = uploadStatus.filter((s) => s === "Uploaded").length;
  /*
    The one reason every failure in this batch shares, or "" if they differ.

    Each entry in `uploadErrors` is "<file name>: <reason>", so the reason is
    what follows the first colon. When a batch fails the same way throughout —
    a dropped connection takes everything still in flight — printing that
    sentence under each filename is a column of identical grey text the eye
    stops reading, so it is said once in the heading instead. A mixed batch
    keeps its reasons on the rows, where they belong to a file.
  */
  const failureReasons = [
    ...new Set(
      uploadErrors.map((error) => error.slice(error.indexOf(": ") + 2).trim())
    ),
  ];
  const sharedFailureReason =
    failureReasons.length === 1 ? failureReasons[0] : "";
  /** This file's own reason, for a batch that failed more than one way. */
  const reasonFor = (name: string) => {
    const error = uploadErrors.find((entry) => entry.startsWith(`${name}:`));
    return error ? error.slice(error.indexOf(": ") + 2).trim() : "";
  };
  const failedCount = uploadStatus.filter((s) => s === "Failed").length;
  /**
   * Whether sending a failed file again could work. A dropped connection or a
   * save that did not complete can; a wrong format or a bank statement will
   * fail the same way every time, so those rows get no Retry.
   */
  const canRetry = (name: string) => classifyFailure(reasonFor(name)).retry;
  const retryableIndexes = uploadStatus.flatMap((status, i) =>
    status === "Failed" && files[i] && canRetry(files[i].name) ? [i] : []
  );
  const settledCount = uploadedCount + failedCount;
  if (!ready)
    return (
      <div className="flex h-screen flex-col bg-background text-foreground">
        <p className={cn(T.value, "p-8")}>Loading Inbox…</p>
      </div>
    );
  const content = (
    <>
      <div className="flex h-full min-h-0 flex-col">
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {!state.permissions.length ? (
            <EmptyState title="Inbox access required">
              <p className={T.value}>
                Your role needs write access to Accounts Payable, Journal or
                Accounts Receivable. Ask an administrator for access.
              </p>
              <p className={T.sub}>
                Prototype permission-nudge treatment; final no-access behavior
                is pending product/security agreement.
              </p>
            </EmptyState>
          ) : id && !item ? (
            <EmptyState title="Item unavailable in this company">
              <Button
                variant="outline"
                onClick={() => void router.push("/inbox")}
              >
                Back to Inbox
              </Button>
            </EmptyState>
          ) : item ? (
            <>
              {/* Document routing and status lead; navigation and actions sit on the right. */}
              <div
                className={cn(
                  band,
                  gutter,
                  "shrink-0 border-b border-neutral-gray bg-background py-3"
                )}
              >
                <PageButton
                  label="Back to Inbox"
                  disabled={false}
                  onClick={() => void router.push("/inbox")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </PageButton>
                {reviewable && (
                  <>
                    <Label
                      htmlFor="inbox-post-as"
                      className="whitespace-nowrap text-sm text-secondary-foreground"
                    >
                      Post as
                    </Label>
                    <Select
                      value={item.route}
                      disabled={switching}
                      onValueChange={(v) => switchRoute(item.id, v as Route)}
                    >
                      <SelectTrigger
                        id="inbox-post-as"
                        data-guide-id="inbox-route"
                        aria-label="Post as"
                        title="Change where this document posts"
                        className={cn(
                          // rounded-md, which is 6px here: --radius is 0.5rem
                          // and md subtracts 2. Matches the back chevron.
                          "h-9 w-auto gap-1.5 rounded-md border-0 bg-accent px-3 shadow-none",
                          "text-sm font-semibold text-accent-foreground",
                          "hover:bg-muted focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring",
                          "[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:opacity-70"
                        )}
                      >
                        {switching && <Spinner />}
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {routes
                          .filter((r) => state.permissions.includes(r))
                          .map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROUTE_LABELS[r]}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {/*
                      The reason explains the AI's pick, so it comes off the
                      moment the pick is no longer what the screen shows. It
                      used to sit beside the new route and read as a
                      justification for it: "Accounts Receivable · Your company
                      is the buyer on this vendor invoice", which is an argument
                      for the opposite of what the chip beside it says.
                    */}
                    {/*
                      Marked as the AI's line rather than the screen's: the
                      sparkle and the primary tint say a model wrote this,
                      which the muted grey it used to wear did not.
                    */}
                    {item.reason && item.route === item.aiRoute && (
                      <span
                        className={cn(
                          T.sub,
                          "inline-flex items-center gap-1.5 text-primary"
                        )}
                      >
                        <Sparkles
                          className="h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                        {item.reason}
                      </span>
                    )}
                    {item.route !== item.aiRoute && (
                      <Pill tone="warn">
                        Overridden — AI suggested {routeNames[item.aiRoute]}
                      </Pill>
                    )}
                  </>
                )}
                {!reviewable && <StatusPill status={item.status} />}
                {/*
                  Where Tally stands on this voucher, as a marker rather than a
                  band across the screen. It replaced two full-width banners —
                  "Approved & posted" and "Editing a posted voucher" — that
                  between them said one thing the status pill beside this had
                  already said, and one thing this says on hover.
                */}
                {item.status === "Approved" && (
                  <SyncCloud
                    className="h-4 w-4"
                    side="bottom"
                    state={
                      sync.inFlightIds.has(item.id)
                        ? "syncing"
                        : sync.syncedIds.has(item.id)
                          ? "synced"
                          : // resyncNeeded is only ever raised on a voucher
                            // Tally had, so off the synced set it means the
                            // copy over there is the older one.
                            item.resyncNeeded
                            ? "stale"
                            : "pending"
                    }
                  />
                )}
                <span className="flex-1" />
                {/*
                  The pager reads as one object: arrows flanking the count they
                  move through, the count in the brand at full weight and the
                  arrows in it at low emphasis, so the position is what you read
                  and the controls are what you reach for.

                  Both arrows always render, the first disabled at the head of
                  the queue. Previous used to appear only past the first document,
                  which shifted Next sideways the moment you paged off it.
                */}
                <div className="flex items-center gap-1">
                  <PageButton
                    label="Previous document"
                    disabled={state.queue.indexOf(item.id) <= 0}
                    className="text-primary/40 hover:bg-accent hover:text-primary disabled:opacity-40"
                    onClick={() =>
                      void router.push(
                        detailHref(
                          state.queue[state.queue.indexOf(item.id) - 1]
                        )
                      )
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </PageButton>
                  <span className="whitespace-nowrap text-sm font-semibold text-primary">
                    {router.query.voucher ? "Voucher" : "Documents"}{" "}
                    {Math.max(0, state.queue.indexOf(item.id)) + 1} of{" "}
                    {state.queue.includes(item.id) ? state.queue.length : 1}
                  </span>
                  <PageButton
                    label="Next document"
                    // Wrapped, not passed: the click event is an argument, and
                    // a truthy one would put the pager back on the review-only
                    // walk this button is not doing.
                    disabled={
                      state.queue.indexOf(item.id) >= state.queue.length - 1
                    }
                    className="text-primary/40 hover:bg-accent hover:text-primary disabled:opacity-40"
                    onClick={() => nextItem()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PageButton>
                </div>
                {/*
                  The actions, at the end of the row that already holds
                  everything else about this document. They had a docked bar of
                  their own along the bottom, which spent a full band of a
                  document-reading screen on two buttons and put the decision
                  as far from the pager as the window allowed.

                  Delete takes the slot Save draft held. Save draft is gone:
                  the sheet already writes a draft on every edit — that is what
                  the snapshot in the PRD v2 bridge does — so the button
                  promised an action that had already happened.
                */}
                {item.status !== "Deleted" && (
                  <>
                    {/*
                      A posted voucher opens as a record; this is the door into
                      the form, and Done editing is the same door closing. Both
                      used to be carried by a banner under this row, one button
                      on a band of its own.
                    */}
                    {item.status === "Approved" && !approvedEditing && (
                      <Button
                        variant="secondary"
                        disabled={!state.permissions.includes(item.route)}
                        onClick={() => setEditingApproved(item.id)}
                      >
                        Edit entry
                      </Button>
                    )}
                    <DangerButton onClick={deleteItem}>Delete</DangerButton>
                    {/* Last, where Approve & Next sits in review — the filled
                        button is the way out of the state you are in, and it
                        should not move between the two. */}
                    {approvedEditing && (
                      <Button onClick={finishApprovedEdit}>Done editing</Button>
                    )}
                    {reviewable && (
                      <BlockedReason reason={blockReason}>
                        <Button
                          data-guide-id="inbox-approve"
                          // Default size, level with Delete, the route chip
                          // and the pager: it stays the loudest thing in the
                          // row by being the only filled control, not by being
                          // taller.
                          /*
                            A journal's own faults no longer disable this. They
                            are answered on the form — the imbalance banner and
                            the per-cell "Required Field" marks — and a button
                            that cannot be pressed can never reveal them. What
                            still disables it is everything the form has no way
                            to say: no write access, and a hard-block duplicate.
                          */
                          disabled={!canReview || switching || !!matched}
                          onClick={() => {
                            // Both embedded sheets defer to their own
                            // validation — pressing this presses their Create
                            // Bill / Create Invoice, which is what raises the
                            // unresolved-field summary on the form. JV has no
                            // sheet; it is validated by `issue` and answers on
                            // the inbox's own form.
                            if (item.route === "AP" || item.route === "AR")
                              sheetSend.current("approve");
                            else approveItem();
                          }}
                        >
                          Approve &amp; Next
                        </Button>
                      </BlockedReason>
                    )}
                  </>
                )}
              </div>
              {item.status === "Approved" && !approvedEditing ? (
                <>
                  {/*
                    No banner. "Approved & posted" restated the status pill in
                    the header, and its one piece of new information — whether
                    Tally has this copy — is the cloud up there beside the pill.
                    Edit entry went with it, into the action group.
                  */}
                  <div className="min-h-0 flex-1 overflow-auto bg-accent/30">
                    <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(280px,35%)_1fr]">
                      <div className="lg:sticky lg:top-0 lg:h-[calc(100vh-160px)]">
                        <Preview item={item} />
                      </div>
                      <div className="min-w-0 p-5 lg:pl-1">
                        {item.route === "JV" ? (
                          <JournalVoucher
                            item={item}
                            attempted={false}
                            readOnly
                            onEdit={() => {}}
                          />
                        ) : (
                          <ApprovedDetails item={item} company={company.name} />
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : item.status === "Deleted" ? (
                /*
                  Only reachable by a link to a document deleted since — a
                  back button, a second tab, a bookmarked id. It offered to
                  restore it, which is not a thing this product does; what it
                  owes the reader now is why the page is empty and the way
                  back to the queue.
                */
                <EmptyState title="This document was deleted">
                  <p className={T.value}>
                    It is no longer in the Inbox. Its audit history is kept.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => void router.push("/inbox")}
                  >
                    Back to Inbox
                  </Button>
                </EmptyState>
              ) : ["Received", "Extracting"].includes(item.status) ? (
                <>
                  <EmptyState
                    title={
                      item.status === "Received"
                        ? `Queued: ${item.file.name}`
                        : `Extracting ${item.file.name}`
                    }
                    icon={<Spinner className="h-5 w-5" />}
                  >
                    <p className={T.value}>
                      {item.status === "Received"
                        ? "File received — extraction is about to start."
                        : "AI Accountant is reading the document, preparing its details, and suggesting the right voucher and ledgers."}
                    </p>
                  </EmptyState>
                </>
              ) : item.status === "Failed" ? (
                <>
                  <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(280px,40%)_1fr]">
                    <Preview item={item} />
                    <section className="min-h-0 overflow-auto p-5 lg:pl-2">
                      <div className="mx-auto mt-4 max-w-xl overflow-hidden rounded-2xl border border-neutral-gray bg-background shadow-sm lg:mt-10">
                        <div className="space-y-5 p-7">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-gray bg-accent text-primary">
                            <FileWarning className="h-6 w-6" aria-hidden />
                          </div>
                          <div>
                            <p className="mb-2 text-label-3 font-medium uppercase tracking-widest text-secondary-foreground">
                              Extraction failed
                            </p>
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                              Let’s get this document ready
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-secondary-foreground">
                              We couldn’t read all the details. Try again, or
                              use the original document to complete them
                              yourself.
                            </p>
                          </div>
                          <div className="rounded-lg border border-neutral-gray bg-accent/40 p-4">
                            <h3 className="mb-1 text-sm font-semibold">
                              What we couldn’t read
                            </h3>
                            <p className="text-sm leading-6 text-secondary-foreground">
                              {item.error ||
                                item.original.failure?.body ||
                                "The document could not be read reliably. Check that its text and amounts are clearly visible."}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-5 border-t border-neutral-gray px-7 py-6">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="max-w-xs">
                              <h3 className="text-sm font-semibold">
                                Try reading the file again
                              </h3>
                              <p className="mt-1 text-xs leading-5 text-secondary-foreground">
                                Useful if extraction was interrupted.
                              </p>
                            </div>
                            <Button onClick={() => retry(item.id)}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Retry extraction
                            </Button>
                          </div>
                          <div className="flex flex-wrap items-start justify-between gap-3 border-t border-neutral-gray pt-5">
                            <div className="max-w-xs">
                              <h3 className="text-sm font-semibold">
                                Enter the details yourself
                              </h3>
                              <p className="mt-1 text-xs leading-5 text-secondary-foreground">
                                Use the document alongside the voucher form.
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => manual(item.id)}
                            >
                              Fill manually
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 border-t border-neutral-gray px-7 py-4 text-xs leading-5 text-secondary-foreground">
                          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                          <span>
                            Your original document is preserved and stays
                            attached.
                          </span>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <>
                  {/* Editing a posted voucher says so in the header — the
                      Approved pill, the cloud that turns amber once an edit
                      lands, and Done editing in the action group. It used to
                      take a banner to say the same three things. */}
                  {/* "Post as", its reason and the override flag now live in
                      the header row above, which is the only row this screen
                      has. The confidence percentage is gone with them: it
                      restated what the route and its reason already say. */}
                  {matched && (
                    <RecordBanner
                      tone="warning"
                      title="Duplicate invoice detected"
                      label="Approval blocked"
                      action={
                        <Button
                          variant="outline"
                          onClick={() =>
                            void router.push(
                              detailHref(matched.id, "voucher=1")
                            )
                          }
                        >
                          View {matched.form.voucherNo}
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <span className="font-medium text-foreground">
                        {item.form.party} · {item.form.invoiceNo}
                      </span>{" "}
                      matches an existing voucher.
                      <span className="block">
                        Review the match, or correct the vendor or invoice
                        number below.
                      </span>
                    </RecordBanner>
                  )}
                  {item.softRef && (
                    <RecordBanner
                      tone="warning"
                      title="This file was uploaded before"
                      label="Review required"
                    >
                      Matches {item.softRef}. Check the earlier document before
                      approving.
                    </RecordBanner>
                  )}
                  {/*
                    Three layouts, and which one a route gets is decided by one
                    thing: whether its sheet draws the source document itself.

                    AP hands the whole width to its sheet, which is already a
                    document-beside-form split with its own splitter. Wrapping
                    it in a second split was what halved the form and tripped
                    its container query into folding every field into one
                    column.

                    AR's sheet has no document pane — standalone, an invoice is
                    raised rather than read off paper — but an inbox item always
                    has a file behind it, so the inbox supplies the preview and
                    the sheet takes the rest. Resizable rather than fixed,
                    because the invoice's Item Details table is 1702px of
                    columns and no fixed share is going to seat it.

                    JV uses the journal prototype beside a resizable source preview.
                    Its fields respond to the available pane width.

                    This is the rule hooks/pages/inbox/use-inbox-detail.ts
                    already encodes as `isTwoPane`; that module drives
                    components/inbox/detail, which this workspace replaced.
                  */}
                  {switching && item.routeSwitch ? (
                    <RouteSwitchPanel item={item} />
                  ) : item.route === "JV" ? (
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="min-h-0 flex-1"
                    >
                      <ResizablePanel
                        defaultSize={32}
                        minSize={18}
                        className="min-w-0"
                      >
                        <Preview item={item} />
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel
                        defaultSize={68}
                        minSize={40}
                        className="min-w-0"
                      >
                        <div
                          data-guide-id="inbox-fields"
                          className="h-full min-w-0 overflow-auto"
                        >
                          <JournalVoucher
                            key={`${item.id}-${item.route}`}
                            item={item}
                            attempted={attempted}
                            readOnly={!canReview}
                            onEdit={edit}
                            createdLedgers={createdMasters.Ledger}
                            onCreateLedger={(name, assign) =>
                              setCreating({
                                field: "Ledger",
                                name,
                                description:
                                  "It is added to your books and set on this line.",
                                then: (created) => {
                                  assign(created);
                                  notify(
                                    `Ledger “${created}” created and set on the line.`
                                  );
                                },
                              })
                            }
                          />
                        </div>
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  ) : item.route === "AR" ? (
                    <ResizablePanelGroup
                      direction="horizontal"
                      className="min-h-0 flex-1"
                    >
                      <ResizablePanel
                        defaultSize={32}
                        minSize={18}
                        className="min-w-0"
                      >
                        <Preview item={item} />
                      </ResizablePanel>
                      <ResizableHandle withHandle />
                      <ResizablePanel
                        data-guide-id="inbox-fields"
                        defaultSize={68}
                        minSize={40}
                        className="flex min-w-0 flex-col"
                      >
                        <InvoiceSheet
                          key={`${item.id}-${item.route}`}
                          item={item}
                          allowEdits={approvedEditing}
                          onApproved={approveItem}
                          onReady={(send) => {
                            sheetSend.current = send;
                          }}
                        />
                      </ResizablePanel>
                    </ResizablePanelGroup>
                  ) : (
                    /* No guide anchor here: the AP sheet is an embedded
                       document that draws both the preview and the form, and
                       its own panes carry the anchors. Marking the wrapper
                       would highlight the whole screen. */
                    <div className="flex min-h-0 flex-1 flex-col">
                      <Sheet
                        key={`${item.id}-${item.route}`}
                        item={item}
                        allowEdits={approvedEditing}
                        onApproved={approveItem}
                        onReady={(send) => {
                          sheetSend.current = send;
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </>
          ) : moduleRoute ? (
            /*
              Purchases, Sales and Journal Vouchers are registers of posted
              records, not the document queue with a filter on it — see
              ./register. The Inbox's table stays behind for the Inbox.
            */
            <Register
              /*
                Keyed by route: the three registers are the same element in the
                tree, so without this the tab and page you left Purchases on
                came with you to Sales — and "Needs Review" is not even one of
                the tabs Sales has.
              */
              key={moduleRoute}
              route={moduleRoute}
              items={moduleItems}
              syncState={registerSyncState}
              selected={selected}
              onSelectedChange={setSelected}
              onOpen={(x) => {
                configure({ queue: moduleItems.map((row) => row.id) });
                void router.push(
                  detailHref(
                    x.id,
                    x.status === "Approved" ? "voucher=1" : undefined
                  )
                );
              }}
              onDelete={(x) =>
                askDelete(`“${x.form.voucherNo || x.file.name}”`, () => {
                  remove(x.id);
                  notify(`Deleted ${x.form.voucherNo || x.file.name}.`);
                })
              }
              onUnbuilt={(what) =>
                notify(
                  `${what} is part of the app, but not this prototype.`,
                  "info"
                )
              }
              search={filters.search}
              onSearchChange={(value) => setFilter("search", value)}
              /*
                The register's filters ride on the workspace's own filter
                state, so leaving a module and coming back finds the register
                as you left it — and Reset Filters is the one control that
                clears both screens' idea of "filtered".
              */
              filters={{
                party: registerParty,
                from: filters.from,
                to: filters.to,
                min: filters.min,
                max: filters.max,
              }}
              onFilterChange={(key, value) =>
                key === "party"
                  ? setRegisterParty(value)
                  : setFilter(key, value)
              }
              onResetFilters={() => {
                setFilters(defaultFilters);
                setRegisterParty("");
              }}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizes={PAGE_SIZES}
            />
          ) : (
            <>
              {/* Controls stay outside the table's two-axis scroll area. */}
              {/* The positioning context the floating selection bar hangs off.
                  It wraps the scroller rather than sitting inside it, so the
                  bar stays put while the rows move under it. */}
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                {/* The page's scroller, and the only one on this view. It used to
                  sit on the table region alone, which pinned the title, tabs and
                  filter strip in place and scrolled the rows underneath them —
                  a grid inside a page rather than a page. Moved up here the
                  whole column scrolls, and the table header's `sticky top-0`
                  now resolves against this box, so the header rides up with the
                  rows and stops at the top of the content area.

                  Both axes, deliberately: a sticky header cannot survive an
                  `overflow-x` ancestor of its own — the x scroller would become
                  the scrollport the header sticks to — so the horizontal scroll
                  a widened table needs has to live on this same element. The
                  controls below stay pinned horizontally. Disable native
                  overscroll as well: containment alone still allows the native
                  edge bounce to expose blank space during trackpad scrolling. */}
                <div
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 flex-col overflow-auto overscroll-none",
                    /*
                      Picks up where the dialog left off: the table rises into
                      place instead of being there the instant the modal is
                      gone. It starts while the overlay is still clearing —
                      see the handoff sequence in `upload` — so the two read as
                      one movement handing over, not as a cut between screens.

                      Transform and opacity only, on the enter curve, and a
                      little longer than the dialog's exit so the table is
                      still arriving as the last of the overlay goes.
                    */
                    justUploaded &&
                      "animate-in fade-in-0 slide-in-from-bottom-3 duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
                  )}
                >
                  {/* Title, tabs and strip pinned against the horizontal scroll as ONE
                  block. They have to live inside this scroller to scroll away
                  vertically, and the scroller owns both axes because a sticky
                  table header cannot survive an `overflow-x` ancestor of its
                  own — so they need `left-0` to hold still while the table
                  moves under them. One sticky layer rather than three: each one
                  is a separate thing for the compositor to keep in place per
                  frame, and three of them lagged visibly during a drag, showing
                  a sliver of unpainted background at the right before catching
                  up. Keep this block on its own compositor layer so it stays
                  painted in place during asynchronous horizontal scrolling. */}
                  <div className="sticky left-0 z-20 shrink-0 bg-background will-change-transform">
                    <PageTopBar
                      className={cn(
                        "shrink-0 flex-wrap gap-2 pb-3 pt-5",
                        gutter
                      )}
                      title={
                        moduleRoute
                          ? `${routeNames[moduleRoute]} · Posted vouchers`
                          : "Inbox"
                      }
                      primaryText={moduleRoute ? undefined : "Upload Documents"}
                      primaryIcon={Upload}
                      overflowActions={
                        moduleRoute
                          ? undefined
                          : [
                              {
                                label: "How Inbox works",
                                icon: Info,
                                onClick: () => setWelcomeOpen(true),
                              },
                            ]
                      }
                      onPrimaryButtonClick={() => {
                        intakeMode.current = "single";
                        setSource("upload");
                        setSender(actor);
                        setUploadErrors([]);
                        setFiles([]);
                        setUploadStatus([]);
                        setDialog("upload");
                      }}
                    />
                    {!moduleRoute && (
                      <Tabs
                        value={tab}
                        onValueChange={(t) => {
                          setTab(t);
                          setPage(0);
                          setSelected([]);
                        }}
                        className="mx-6 shrink-0 overflow-x-auto border-b border-neutral-gray"
                      >
                        <TabsList className="h-auto gap-2 rounded-none bg-transparent p-0">
                          {tabs.map((t) => (
                            <TabsTrigger
                              key={t}
                              value={t}
                              data-guide-id={
                                t === "Need review"
                                  ? "inbox-tab-review"
                                  : undefined
                              }
                              className="gap-2 rounded-none border-b-2 border-transparent px-2.5 py-3 text-sm text-secondary-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
                            >
                              {t}
                              <CountPill>
                                {all.filter((x) => matchesTab(x, t)).length}
                              </CountPill>
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    )}
                    <div
                      className={cn(band, gutter, "shrink-0 flex-wrap py-3")}
                    >
                      <div className="relative w-full sm:w-[198px]">
                        <Input
                          ref={searchInput}
                          aria-label="Search Inbox"
                          // 198px and "Search..." per Figma 716:15029. The long
                          // placeholder the box used to carry named the fields it
                          // covers; at this width it only truncates, so what it
                          // searches is the aria-label's job now.
                          placeholder="Search..."
                          value={filters.search}
                          onChange={(e) => setFilter("search", e.target.value)}
                          className={cn("h-9 pr-9", T.cell, "text-foreground")}
                        />
                        {/* The key that gets you here, shown where you would look
                        for it (Figma 24142:49994). It hides once there is text
                        in the box, where it would read as part of the query. */}
                        {!filters.search && (
                          <span
                            aria-hidden
                            className="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-section"
                          >
                            <Slash className="h-3 w-3 text-secondary-foreground" />
                          </span>
                        )}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          {/* Icon-only, 36x36 — the default icon button, level
                          with the search field (Figma 716:15029 drew it at 32). The count rides on
                          it as a corner badge rather than inline: without the
                          "Filters" label there is nothing else on the bar that
                          says filters are applied, and a strip with two of them
                          set would otherwise look identical to a clean one. */}
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={
                              panelFilterCount
                                ? `Filters, ${panelFilterCount} applied`
                                : "Filters"
                            }
                            title="Filters"
                            className="relative shrink-0"
                          >
                            <ListFilter className="h-4 w-4" />
                            {panelFilterCount ? (
                              <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-caption-1 font-semibold tabular-nums text-primary-foreground">
                                {panelFilterCount}
                              </span>
                            ) : null}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-auto overflow-hidden p-0"
                        >
                          <FilterPanel
                            categories={[
                              ...[...FILTERABLE].map((column) => ({
                                id: column,
                                label: column,
                                options: optionsFor(column),
                                selected: colFilter(column),
                                onChange: (next: string[]) =>
                                  setColFilter(column, next),
                                activeCount: colFilter(column).length,
                              })),
                              // Amount stays a panel category. The date is not
                              // here: it has its own chip in the bar (Received),
                              // with presets, since "what came in this month"
                              // is the filter people reach for most.
                              ...(
                                [
                                  [
                                    "Amount",
                                    [
                                      ["min", "Minimum amount", "number"],
                                      ["max", "Maximum amount", "number"],
                                    ],
                                  ],
                                ] as const
                              ).map(([label, fields]) => ({
                                id: label,
                                label,
                                activeCount: fields.filter(
                                  ([key]) => filters[key as keyof Filters]
                                ).length,
                                custom: (
                                  <div className="flex flex-col gap-4">
                                    {fields.map(([key, fieldLabel, type]) => (
                                      <Field
                                        key={key}
                                        label={fieldLabel}
                                        htmlFor={`filter-${key}`}
                                      >
                                        <Input
                                          id={`filter-${key}`}
                                          type={type}
                                          value={filters[key]}
                                          onChange={(e) =>
                                            setFilter(key, e.target.value)
                                          }
                                        />
                                      </Field>
                                    ))}
                                  </div>
                                ),
                              })),
                            ]}
                          />
                        </PopoverContent>
                      </Popover>
                      {/* The rule separates the two things that open panels from
                      the two that answer a question in place (Figma
                      716:15029). */}
                      <span className="h-6 w-px flex-none bg-neutral-gray" />
                      {QUICK_FILTERS.map((column) => (
                        <QuickFilter
                          key={column}
                          label={column}
                          options={optionsFor(column)}
                          selected={colFilter(column)}
                          onChange={(next) => setColFilter(column, next)}
                        />
                      ))}
                      <DateFilter
                        label="Received"
                        presetsLabel="Show documents received"
                        maxDate={new Date()}
                        value={{
                          from: filters.from
                            ? parseISO(filters.from)
                            : undefined,
                          to: filters.to ? parseISO(filters.to) : undefined,
                        }}
                        onChange={({ from, to }) => {
                          setFilters((f) => ({
                            ...f,
                            from: from ? format(from, "yyyy-MM-dd") : "",
                            to: to ? format(to, "yyyy-MM-dd") : "",
                          }));
                          setPage(0);
                          setSelected([]);
                        }}
                      />
                      {/* Set by "See what failed" on a partial or failed run, and
                      the only way out is to dismiss it — it is not one of the
                      filters, so Reset Filters must not silently take it off. */}
                      {sync.reviewingFailures && (
                        <Button
                          variant="secondary"
                          onClick={sync.clearFailureReview}
                        >
                          Didn&rsquo;t reach Tally
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      <span className="flex-1" />
                      {/*
                    Reset sits with Columns at the end of the bar, not with the
                    filters it clears (Figma 24415:71283). Ghost, because it is
                    an undo: it only matters once something has been set, and a
                    bordered button competing with Columns would read as a third
                    filter rather than the way out of the first two.
                  */}
                      {/* Only once there is something to undo — `resetFilters` is a
                      prop on the Figma component, not a fixture. The search box
                      counts: Reset clears it too, so a bar that showed nothing
                      to reset and then wiped the query would be lying. */}
                      {(activeFilterCount > 0 || filters.search) && (
                        <Button
                          variant="ghost"
                          // Plain ghost, not the red Figma 716:15029 drew:
                          // clearing filters is an undo, not a removal, and
                          // red is kept for the buttons that delete things.
                          onClick={() => {
                            setFilters(defaultFilters);
                            setSelected([]);
                            setPage(0);
                          }}
                        >
                          <Undo2 className="h-3 w-3" />
                          Reset Filters
                        </Button>
                      )}
                      <Popover
                        open={columnsOpen}
                        onOpenChange={(next) => {
                          setColumnsOpen(next);
                          if (!next) setColumnSearch("");
                        }}
                      >
                        <PopoverTrigger asChild>
                          {/* The Bloocks ColumnCustomizer trigger: a 26px chip
                              that turns blue while any column is hidden, so a
                              table missing columns says so from the toolbar. */}
                          <button
                            type="button"
                            aria-label="Customize columns"
                            className={cn(
                              "inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-1 text-label-3 font-medium transition-[border-color,background-color] duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              order.some((c) => !visible.includes(c))
                                ? "border-popover-border bg-accent text-primary"
                                : "border-border text-foreground hover:border-[hsl(var(--palette-neutral-300-hsl))] hover:bg-neutral-gray"
                            )}
                          >
                            <Columns3 className="size-3.5" aria-hidden />
                            Columns
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="end"
                          className="w-[300px] p-0"
                          // The grid behind the popover is the preview, so a drag
                          // that leaves the panel must not read as "dismiss".
                          onPointerDownOutside={(e) =>
                            dragging && e.preventDefault()
                          }
                        >
                          {/* Bloocks panel search, without the panel's
                              "Columns" title: the trigger already names it. */}
                          <div className="flex items-center gap-2 border-b border-neutral-gray px-4 py-2">
                            <Search
                              className="size-4 flex-none text-secondary-foreground"
                              aria-hidden
                            />
                            <input
                              ref={columnSearchRef}
                              aria-label="Search columns"
                              placeholder="Search…"
                              className="w-full min-w-0 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-secondary-foreground"
                              value={columnSearch}
                              onChange={(e) => setColumnSearch(e.target.value)}
                            />
                            {columnSearch && (
                              <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                  setColumnSearch("");
                                  columnSearchRef.current?.focus();
                                }}
                                className="flex-none text-secondary-foreground hover:text-foreground"
                              >
                                <X className="size-4" aria-hidden />
                              </button>
                            )}
                          </div>
                          {/*
                        The list holds every column, hidden ones included: the
                        order is a property of the column and not of the current
                        selection, so unchecking something and checking it again
                        has to put it back where you left it.
                      */}
                          <div
                            ref={columnList}
                            className="max-h-[320px] overflow-y-auto px-2.5 py-1 [scrollbar-color:hsl(var(--popover-border))_transparent] [scrollbar-width:thin]"
                          >
                            {columnMatches.length === 0 ? (
                              <p className={cn(T.sub, "px-3 py-8 text-center")}>
                                No column matches “{columnSearch.trim()}”.
                              </p>
                            ) : (
                              columnMatches.map((c, i) => {
                                const locked = pinned.includes(c);
                                // Pinned by the user, or pinned by the screen.
                                const fixed = LOCKED_COLUMNS.has(c);
                                const checked = visible.includes(c);
                                const isDragged = drag?.key === c;
                                return (
                                  <div
                                    key={c}
                                    ref={(node) => {
                                      if (node) rowNodes.current.set(c, node);
                                      else rowNodes.current.delete(c);
                                    }}
                                    style={{
                                      transform: `translateY(${rowShift(i, isDragged)}px)`,
                                      // The dragged row is pinned to the pointer, so
                                      // it must not ease — easing a value that is
                                      // already being updated every frame just adds
                                      // lag. Everything else eases, and so does the
                                      // dragged row once it is settling into place.
                                      transition:
                                        isDragged && !drag?.settling
                                          ? "none"
                                          : `transform ${SETTLE_MS}ms ${EASE}`,
                                      willChange: drag
                                        ? "transform"
                                        : undefined,
                                    }}
                                    className={cn(
                                      // Bloocks: 32px rows, the pin revealed on hover.
                                      "group/row relative flex h-8 items-center gap-2 rounded-md px-1",
                                      isDragged &&
                                        // Lifted off the list: opaque, so the rows
                                        // sliding under it stay hidden, and above
                                        // them in the stacking order.
                                        "z-10 bg-background shadow-lg ring-1 ring-neutral-gray"
                                    )}
                                  >
                                    {locked || filteringColumns ? (
                                      // Holds the grip's place so every label starts
                                      // on the same x, draggable row or not.
                                      <span className="size-5 flex-none" />
                                    ) : (
                                      <button
                                        type="button"
                                        aria-label={`Reorder ${c}`}
                                        onPointerDown={(e) =>
                                          startRowDrag(c, e)
                                        }
                                        // Arrow keys do the same job for anyone not
                                        // using a pointer: a drag handle with no
                                        // keyboard equivalent makes the order
                                        // unreachable, not just awkward.
                                        onKeyDown={(e) => {
                                          if (
                                            e.key !== "ArrowUp" &&
                                            e.key !== "ArrowDown"
                                          )
                                            return;
                                          e.preventDefault();
                                          moveColumn(
                                            c,
                                            order.indexOf(c) +
                                              (e.key === "ArrowDown" ? 1 : -1)
                                          );
                                        }}
                                        className="inline-flex size-5 flex-none cursor-grab touch-none items-center justify-center rounded-md text-secondary-foreground hover:text-foreground active:cursor-grabbing"
                                      >
                                        <GripVertical className="size-3" />
                                      </button>
                                    )}
                                    {fixed ? (
                                      // A locked column is always shown, so
                                      // there is no choice to offer: a padlock
                                      // in the checkbox's place, not a checkbox
                                      // that is ticked and cannot be unticked.
                                      <span
                                        className="flex size-3 flex-none items-center justify-center text-secondary-foreground"
                                        title={`${c} is always shown`}
                                      >
                                        <Lock className="size-3" aria-hidden />
                                        <span className="sr-only">
                                          {c} is locked
                                        </span>
                                      </span>
                                    ) : (
                                      <Checkbox
                                        id={`col-${c}`}
                                        checked={checked}
                                        disabled={
                                          checked && visible.length === 1
                                        }
                                        onCheckedChange={(next) =>
                                          toggleColumn(c, !!next)
                                        }
                                        // Bloocks sm checkbox: 12px, 4px corners.
                                        className="size-3 rounded-[4px] [&_svg]:size-2.5"
                                      />
                                    )}
                                    <Label
                                      htmlFor={`col-${c}`}
                                      className={cn(
                                        "flex-1 truncate text-label-2 font-normal text-foreground",
                                        !locked && "cursor-pointer"
                                      )}
                                    >
                                      {c}
                                    </Label>
                                    {
                                      <button
                                        type="button"
                                        onClick={() => togglePin(c)}
                                        aria-label={
                                          locked ? `Unpin ${c}` : `Pin ${c}`
                                        }
                                        aria-pressed={locked}
                                        title={
                                          locked
                                            ? "Unpin — lets the column be reordered"
                                            : "Pin — moves the column to the front"
                                        }
                                        className={cn(
                                          "inline-flex size-5 flex-none items-center justify-center rounded-md transition-opacity duration-150 hover:bg-neutral-gray focus-visible:opacity-100",
                                          locked
                                            ? "text-primary"
                                            : "text-secondary-foreground opacity-0 hover:text-foreground group-hover/row:opacity-100"
                                        )}
                                      >
                                        {locked ? (
                                          <PinOff className="size-3" />
                                        ) : (
                                          <Pin className="size-3" />
                                        )}
                                      </button>
                                    }
                                  </div>
                                );
                              })
                            )}
                          </div>
                          {/* Bloocks' footer, in neutral rather than its red:
                              a reset is an undo, and red is kept for deletes. */}
                          <div className="flex items-start gap-2.5 border-t border-neutral-gray px-4 pb-3 pt-2">
                            {(
                              [
                                ["Reset Width", resetWidths],
                                ["Reset Default", resetColumns],
                              ] as const
                            ).map(([label, onClick]) => (
                              <button
                                key={label}
                                type="button"
                                onClick={onClick}
                                className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md p-1 text-label-2 font-medium text-secondary-foreground hover:bg-neutral-gray hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <Undo2 className="size-3" aria-hidden />
                                {label}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                      {/*
                    The shortcuts drawer, opened from its own button at the end
                    of the toolbar (Figma 24156:151931). Controlled, because
                    Shift+/ opens it too and a panel that only its trigger could
                    open would make the shortcut a lie.
                  */}
                      {/* Same chip as Columns beside it, square: 26px. */}
                      <button
                        type="button"
                        aria-label="Keyboard shortcuts"
                        title="Keyboard shortcuts"
                        onClick={() => setShortcutsOpen(true)}
                        className="inline-flex size-[26px] items-center justify-center rounded-lg border border-border bg-background text-foreground transition-[border-color,background-color] duration-150 ease-in-out hover:border-[hsl(var(--palette-neutral-300-hsl))] hover:bg-neutral-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Keyboard className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {/*
                  table-fixed, not the default table-auto: under auto layout a
                  set width is only a hint, and a long filename would widen its
                  column back out the moment you let go of the handle.
                */}
                  <div
                    ref={gridRef}
                    role="grid"
                    aria-label="Inbox documents"
                    aria-rowcount={pageRows.length + 1}
                    aria-colcount={shown.length}
                    // One tab stop for the whole grid, with the cursor moved by
                    // the arrow keys — the roving pattern. The cell itself never
                    // takes DOM focus; activedescendant is what tells a screen
                    // reader which one the cursor is on.
                    tabIndex={0}
                    aria-activedescendant={grid.activeDescendant}
                    onKeyDown={grid.onGridKeyDown}
                    // No scrolling of its own any more — the column above owns it.
                    // Left as a focusable region because the grid's keyboard
                    // navigation is bound here.
                    // The active cell already draws the keyboard focus ring.
                    // Ringing this horizontally scrollable wrapper produced a
                    // full-height blue line at the viewport edge, which looked
                    // like a broken column divider when keyboard mode started.
                    className="min-w-0 focus-visible:outline-none"
                  >
                    <Table
                      style={{ width: tableWidth }}
                      // role="none" on the table, role="grid" on the div that
                      // holds the focus and the cursor. Two nested grid-ish
                      // roles would make the rows belong to the inner one, and
                      // the inner one is not what aria-activedescendant is on.
                      // The rows and cells below re-declare their roles because
                      // role="none" here drops the implicit ones with it.
                      role="none"
                      className="table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-neutral-gray [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-neutral-gray [&_th:last-child]:border-r-0"
                    >
                      <TableHeader
                        role="rowgroup"
                        className="sticky top-0 z-10 bg-accent [&_tr]:shadow-none [&_th]:border-b [&_th]:border-t [&_th]:border-neutral-gray"
                      >
                        <TableRow role="row" aria-rowindex={1}>
                          <TableHead
                            role="columnheader"
                            style={{ width: SELECT_WIDTH }}
                            // Pinned to the left edge, as Actions is to the
                            // right.
                            className="sticky left-0 z-10 h-10 bg-accent px-3 py-0 align-middle"
                          >
                            {/* This page, and only this page. Reaching across
                              pages is what the bar's "Select all" button is
                              for, because it is a different claim and has to
                              be made on purpose. */}
                            <Checkbox
                              aria-label="Select every document on this page"
                              checked={
                                !!pageRows.length &&
                                pageRows.every((x) => selected.includes(x.id))
                              }
                              onCheckedChange={(checked) =>
                                setSelected(
                                  checked ? pageRows.map((x) => x.id) : []
                                )
                              }
                            />
                          </TableHead>
                          {shown.map((c) => (
                            <TableHead
                              key={c}
                              role="columnheader"
                              id={gridCellId(-1, shown.indexOf(c))}
                              aria-colindex={shown.indexOf(c) + 1}
                              // Absent, not "none", when the column is not
                              // sortable: aria-sort on a column that cannot be
                              // sorted offers the user a control that is not
                              // there.
                              aria-sort={
                                !SORTABLE.has(c)
                                  ? undefined
                                  : sort?.key !== c
                                    ? "none"
                                    : sort.dir === "asc"
                                      ? "ascending"
                                      : "descending"
                              }
                              style={{
                                width: colWidth(c),
                                left: stickyLeft[c],
                              }}
                              // Row -1 is the header in the grid's coordinate
                              // space, so arrowing up out of the first value
                              // lands on the column that names it.
                              data-grid-row={-1}
                              data-grid-col={shown.indexOf(c)}
                              // 40px tall, pl-3 / pr-2 (Figma 24421:72539).
                              //
                              // py-0 and a fixed h-10 rather than the spec's
                              // py-3: the row is the max of its cells, so any one
                              // cell with a tall control in it grows all of them
                              // past 40. Height-then-centre pins the box and puts
                              // the same 12px above and below a 16px line.
                              //
                              // Dividers come from the rules on <Table>.
                              className={cn(
                                "relative h-10 whitespace-nowrap px-3 py-0 align-middle",
                                c in stickyLeft && "sticky z-10 bg-accent",
                                T.head,
                                grid.isCursor(-1, shown.indexOf(c)) &&
                                  "ring-2 ring-inset ring-primary"
                              )}
                            >
                              <div
                                className={cn(
                                  // h-4: the 40px header is 12 + 16 + 12, so the
                                  // content row has to be exactly one 16px line.
                                  // The icon buttons overflow it on purpose —
                                  // they keep a 16px hit area without growing the
                                  // cell (Figma 24421:72539).
                                  "flex h-4 min-w-0 items-center gap-1",
                                  c === "Amount" && "justify-end"
                                )}
                              >
                                <span className="truncate" title={c}>
                                  {c}
                                </span>
                                {SORTABLE.has(c) ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleSort(c)}
                                    aria-label={`Sort by ${c}`}
                                    className="grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted"
                                  >
                                    {sort?.key === c ? (
                                      sort.dir === "asc" ? (
                                        <ArrowUp className="h-3 w-3 text-primary" />
                                      ) : (
                                        <ArrowDown className="h-3 w-3 text-primary" />
                                      )
                                    ) : (
                                      <ArrowUpDown className="h-3 w-3 text-secondary-foreground" />
                                    )}
                                  </button>
                                ) : null}
                                {FILTERABLE.has(c) ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        // Space on the header cell finds the
                                        // funnel through this.
                                        data-filter-trigger={c}
                                        aria-label={`Filter ${c}`}
                                        className={cn(
                                          "grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted",
                                          colFilter(c).length
                                            ? "text-primary"
                                            : "text-secondary-foreground"
                                        )}
                                      >
                                        <ListFilter className="h-3 w-3" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      align="start"
                                      className="w-auto p-0"
                                    >
                                      <ColumnFilter
                                        label={c}
                                        options={optionsFor(c)}
                                        selected={colFilter(c)}
                                        onChange={(v) => setColFilter(c, v)}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ) : null}
                              </div>
                              {RESIZABLE.has(c) ? (
                                // Sits over the cell's right border. Double-click
                                // puts the column back to its default width.
                                <span
                                  role="separator"
                                  aria-orientation="vertical"
                                  aria-label={`Resize ${c}`}
                                  tabIndex={0}
                                  aria-valuemin={COLUMN_SIZES[c].min}
                                  aria-valuemax={COLUMN_SIZES[c].max}
                                  aria-valuenow={colWidth(c)}
                                  aria-valuetext={`${colWidth(c)} pixels`}
                                  title={`${colWidth(c)} px · Drag or use arrow keys to resize. Double-click or Enter to reset.`}
                                  onPointerDown={(e) => startResize(c, e)}
                                  onDoubleClick={() => {
                                    if (Object.keys(widths).length)
                                      resizeColumn(c, DEFAULT_WIDTHS[c]);
                                  }}
                                  onKeyDown={(e) => {
                                    const step = e.shiftKey ? 40 : 10;
                                    const next =
                                      e.key === "ArrowRight"
                                        ? colWidth(c) + step
                                        : e.key === "ArrowLeft"
                                          ? colWidth(c) - step
                                          : e.key === "Home"
                                            ? COLUMN_SIZES[c].min
                                            : e.key === "End"
                                              ? COLUMN_SIZES[c].max
                                              : e.key === "Enter"
                                                ? DEFAULT_WIDTHS[c]
                                                : null;
                                    if (next !== null) {
                                      e.preventDefault();
                                      resizeColumn(c, next);
                                    }
                                  }}
                                  className={cn(
                                    "group absolute top-0 z-20 flex h-full w-[10px] cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none",
                                    c === shown[shown.length - 1]
                                      ? "right-0"
                                      : "-right-[5px]"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-[2px] transition-colors group-hover:bg-primary group-focus-visible:bg-primary",
                                      resizing === c
                                        ? "bg-primary"
                                        : "bg-transparent"
                                    )}
                                  />
                                </span>
                              ) : null}
                            </TableHead>
                          ))}
                          {/*
                            Outside `shown`, like the checkbox at the other
                            end: Actions holds no value, so sorting, filtering,
                            hiding and resizing all have nothing to act on, and
                            a column in that list is offered every one of them.
                          */}
                          {/*
                            Pinned to the right edge of the scroller, the way
                            the toolbar above is pinned to the left. The kebab
                            is how a row is acted on, and a widened table put
                            it past the edge — the one control you always want
                            within reach was the first thing to scroll out of
                            sight.

                            Sticky inside a sticky: this cell holds its
                            horizontal place within a header that is already
                            holding its vertical one, which is why it carries
                            the header's own ground rather than a transparent
                            one — rows must pass under it, not through it.
                          */}
                          <TableHead
                            role="columnheader"
                            style={{ width: ACTIONS_WIDTH }}
                            className="sticky right-0 z-10 h-10 border-l border-neutral-gray bg-accent px-3 py-0 align-middle"
                          >
                            <span className="flex h-4 items-center truncate">
                              Actions
                            </span>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody role="rowgroup">
                        {pageRows.map((x, rowIndex) => (
                          <TableRow
                            key={x.id}
                            role="row"
                            // The guide points at the first row it finds; the
                            // step is about what a row is, not about this one.
                            data-guide-id={
                              rowIndex === 0 ? "inbox-row" : undefined
                            }
                            // +2, not +1: row 1 is the header.
                            aria-rowindex={rowIndex + 2}
                            aria-selected={selected.includes(x.id)}
                            onClick={() => open(x)}
                            // `group` so the pinned Actions cell can pick the
                            // row's hover tint back up — it paints its own
                            // ground and would otherwise stay pale.
                            className={cn(
                              "group cursor-pointer hover:bg-transparent",
                              selected.includes(x.id) &&
                                "bg-accent hover:bg-accent"
                            )}
                          >
                            <TableCell
                              role="gridcell"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "left-0 h-[45px] px-3 py-0 align-middle",
                                STICKY_CELL,
                                cellGround(selected.includes(x.id), true)
                              )}
                            >
                              <Checkbox
                                aria-label={`Select ${x.file.name}`}
                                checked={selected.includes(x.id)}
                                onCheckedChange={(checked) =>
                                  setSelected((ids) =>
                                    checked
                                      ? [...ids, x.id]
                                      : ids.filter((id) => id !== x.id)
                                  )
                                }
                              />
                            </TableCell>
                            {shown.map((c, colIndex) => (
                              <TableCell
                                key={c}
                                role="gridcell"
                                data-guide-id={
                                  rowIndex === 0 && c === "Status"
                                    ? "inbox-status"
                                    : undefined
                                }
                                id={gridCellId(rowIndex, colIndex)}
                                aria-colindex={colIndex + 1}
                                // The range, not the checkbox column: this is
                                // "inside the copied block", which is a
                                // different question from whether the row is
                                // ticked for a bulk action.
                                aria-selected={grid.isSelected(
                                  rowIndex,
                                  colIndex
                                )}
                                data-grid-row={rowIndex}
                                data-grid-col={colIndex}
                                style={{ left: stickyLeft[c] }}
                                // Figma 603:1640 / 603:1658: both variants are 50px.
                                // The fixed inner box caps intrinsic table height;
                                // a height on <td> alone is only a minimum.
                                className={cn(
                                  "h-[45px] overflow-hidden px-3 py-0 align-middle",
                                  c in stickyLeft && STICKY_CELL,
                                  cellGround(
                                    selected.includes(x.id),
                                    c in stickyLeft
                                  ),
                                  T.cell,
                                  // Range first, cursor second: the cursor sits
                                  // inside its own selection and has to win.
                                  grid.isSelected(rowIndex, colIndex) &&
                                    "bg-accent",
                                  grid.isCursor(rowIndex, colIndex) &&
                                    "ring-2 ring-inset ring-primary"
                                )}
                              >
                                <div className="flex h-[44px] min-w-0 flex-col justify-center overflow-hidden [&>.inline-flex]:self-start">
                                  {c === "File" ? (
                                    <div className="flex min-w-0 items-center gap-2.5">
                                      <FileIcon ext="pdf" />
                                      <div className="min-w-0">
                                        <span className="flex min-w-0 items-center gap-1.5">
                                          <strong
                                            className="truncate font-normal text-primary"
                                            title={x.file.name}
                                          >
                                            {x.file.name}
                                          </strong>
                                          {/* Whether Tally has this one yet. */}
                                          {sync.inFlightIds.has(x.id) ? (
                                            <SyncCloud state="syncing" />
                                          ) : sync.syncedIds.has(x.id) ? (
                                            <SyncCloud state="synced" />
                                          ) : null}
                                        </span>
                                        <span className="mt-0.5 block truncate text-caption-1 text-secondary-foreground">
                                          {x.file.size}
                                        </span>
                                      </div>
                                    </div>
                                  ) : c === "Source" ? (
                                    // Only the channel. Which inbox address a
                                    // mail was sent to is the company's own,
                                    // so it said nothing, and who sent it is
                                    // the User column's job.
                                    <span className="truncate">
                                      {sourceLabels[x.source]}
                                    </span>
                                  ) : c === "User" ? (
                                    <span
                                      className="block truncate"
                                      title={x.sender}
                                    >
                                      {senderUser(x) || "—"}
                                    </span>
                                  ) : ["Received", "Extracting"].includes(
                                      x.status
                                    ) &&
                                    [
                                      "Vendor",
                                      "Voucher type",
                                      "GST Registration",
                                      "Amount",
                                    ].includes(c) ? (
                                    <span className="text-secondary-foreground">
                                      —
                                    </span>
                                  ) : c === "Vendor" ? (
                                    <EditableCell
                                      onClosed={grid.refocusGrid}
                                      label={
                                        x.route === "AR"
                                          ? "Customer name"
                                          : "Vendor name"
                                      }
                                      open={activeCell === `${x.id}:party`}
                                      onOpenChange={(open) =>
                                        setActiveCell(
                                          open ? `${x.id}:party` : null
                                        )
                                      }
                                      value={x.form.party}
                                      options={[
                                        ...(x.route === "AR"
                                          ? []
                                          : createdMasters.Vendor),
                                        ...all
                                          .filter(
                                            (candidate) =>
                                              candidate.route === x.route
                                          )
                                          .map(
                                            (candidate) => candidate.form.party
                                          ),
                                      ]
                                        .filter(Boolean)
                                        .sort()}
                                      editable={canEditTableItem(x)}
                                      onChange={(value) =>
                                        editTableField(x, "Vendor", value)
                                      }
                                      // Vendors only: there is no customer
                                      // master to create from the Inbox.
                                      createNoun="vendor"
                                      onCreate={
                                        x.route === "AR"
                                          ? undefined
                                          : (name) =>
                                              setCreating({
                                                field: "Vendor",
                                                name,
                                                description: `It is added to your books and set on ${x.file.name}.`,
                                                // editTableField says what
                                                // changed, so no second toast.
                                                then: (created) => {
                                                  editTableField(
                                                    x,
                                                    "Vendor",
                                                    created
                                                  );
                                                },
                                              })
                                      }
                                    />
                                  ) : c === "Voucher type" ? (
                                    <EditableCell
                                      onClosed={grid.refocusGrid}
                                      label="Voucher type"
                                      open={
                                        activeCell === `${x.id}:voucherType`
                                      }
                                      onOpenChange={(open) =>
                                        setActiveCell(
                                          open ? `${x.id}:voucherType` : null
                                        )
                                      }
                                      value={x.form.voucherType}
                                      options={BULK_VOUCHER_TYPES}
                                      groups={voucherTypeGroups}
                                      editable={canEditTableItem(x)}
                                      onChange={(value) =>
                                        editTableField(x, "Voucher Type", value)
                                      }
                                    />
                                  ) : c === "GST Registration" ? (
                                    <EditableCell
                                      onClosed={grid.refocusGrid}
                                      label="GST registration"
                                      open={activeCell === `${x.id}:gst`}
                                      onOpenChange={(open) =>
                                        setActiveCell(
                                          open ? `${x.id}:gst` : null
                                        )
                                      }
                                      value={x.form.gst}
                                      options={company.branches}
                                      editable={canEditTableItem(x)}
                                      onChange={(value) =>
                                        editTableField(
                                          x,
                                          "GST Registration",
                                          value
                                        )
                                      }
                                    />
                                  ) : c === "Amount" ? (
                                    <div
                                      className="truncate text-right tabular-nums"
                                      title={money(x.amount)}
                                    >
                                      <AmountText value={x.amount} />
                                    </div>
                                  ) : c === "Received" ? (
                                    <div
                                      className="space-y-0.5"
                                      title={stamp(x.received)}
                                    >
                                      <time
                                        dateTime={x.received}
                                        className="block truncate"
                                      >
                                        {stamp(x.received)}
                                      </time>
                                      <span className="block truncate text-caption-1 text-secondary-foreground">
                                        {age(x.received)}
                                      </span>
                                    </div>
                                  ) : x.status === "Needs Review" &&
                                    canEditTableItem(x) ? (
                                    // Needs Review → Approved is the one
                                    // status change the table offers. Nothing
                                    // goes back from Approved, and Duplicate
                                    // is the system's finding, not a choice,
                                    // so every other status stays a plain pill.
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    >
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            aria-label={`Change status of ${x.file.name}`}
                                            className="flex max-w-full items-center rounded-md hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                          >
                                            {/* The chevron is inside the pill:
                                                beside it, the column's edge
                                                clipped it off. */}
                                            <StatusPill
                                              status={x.status}
                                              className={tablePillClass}
                                              trailing={
                                                <ChevronDown
                                                  aria-hidden
                                                  // Inline: Badge sets its label
                                                  // in one truncating span, and an
                                                  // svg is a block by default.
                                                  className="ml-1 inline size-3 align-[-2px]"
                                                />
                                              }
                                            />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="start"
                                          className="min-w-[160px]"
                                        >
                                          <DropdownMenuItem
                                            onSelect={() => approveRow(x)}
                                          >
                                            <StatusPill
                                              status="Approved"
                                              className={tablePillClass}
                                            />
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  ) : (
                                    <StatusPill
                                      status={x.status}
                                      className={tablePillClass}
                                    />
                                  )}
                                </div>
                              </TableCell>
                            ))}
                            <TableCell
                              role="gridcell"
                              // The row opens the document on click; the menu
                              // and everything in it must not, or choosing
                              // Delete would navigate into the record it just
                              // removed.
                              onClick={(e) => e.stopPropagation()}
                              /*
                                bg-background, not transparent: a sticky cell
                                with no ground lets the columns it is holding
                                still slide through it.

                                The row's hover tint is then painted as a
                                background IMAGE over that ground, not as a
                                background colour. `group-hover:bg-muted/30`
                                replaced the opaque colour with a 30%-alpha
                                one, which is transparent by another name —
                                the hovered row's Received column showed
                                straight through the kebab. A gradient of one
                                flat colour is the tint with the ground still
                                under it.
                              */
                              className={cn(
                                "sticky right-0 z-[1] h-[45px] border-l border-neutral-gray px-3 py-0 align-middle",
                                cellGround(selected.includes(x.id), true)
                              )}
                            >
                              <RowActions
                                item={x}
                                onView={() => open(x)}
                                onDelete={() => deleteRow(x)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {!filtered.length &&
                      /*
                    Three different nothings, and they used to be one.

                    A narrowed queue is the only one of them the user can undo,
                    so it is the only one that carries an action — and it has to
                    be tested first, because a filter that excludes everything
                    looks exactly like an empty tab from the row count alone.

                    Then the company that has never received a document: the
                    state of the whole queue rather than of the tab in front of
                    it, so Needs Review and Duplicate both say the same true
                    thing and point at the channels.

                    Everything else is a tab that is legitimately empty, which
                    is a fact and not a prompt.
                  */
                      (() => {
                        const narrowed =
                          activeFilterCount > 0 || !!filters.search;
                        if (narrowed)
                          return (
                            <EmptyState title="No documents match these filters">
                              <p className={T.value}>
                                {tab === "All"
                                  ? "Nothing in the Inbox matches."
                                  : `Nothing in ${tab} matches. Another tab may hold what you’re looking for.`}
                              </p>
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  setFilters(defaultFilters);
                                  setSelected([]);
                                  setPage(0);
                                }}
                              >
                                Reset all
                              </Button>
                            </EmptyState>
                          );
                        if (moduleRoute)
                          return (
                            <EmptyState
                              title={`No posted ${routeNames[moduleRoute]} vouchers`}
                            >
                              <p className={T.value}>
                                Approving a document in the Inbox with this
                                route posts the voucher and lists it here.
                              </p>
                            </EmptyState>
                          );
                        if (!all.length)
                          return (
                            <EmptyState title="Nothing received yet">
                              <p className={T.value}>
                                Forward a document to this company’s address,
                                send one from a registered WhatsApp number, or
                                upload a file. Every document lands in the Inbox
                                first.
                              </p>
                              <Button
                                variant="secondary"
                                onClick={() => setDialog("intake")}
                              >
                                Receive documents
                              </Button>
                            </EmptyState>
                          );
                        // `tab` is restored from sessionStorage unchecked, so a
                        // session stored under a tab name that no longer exists
                        // would index this to undefined and take the screen down.
                        const empty = EMPTY_STATES[tab] ?? EMPTY_STATES.All;
                        return (
                          <EmptyState title={empty.title}>
                            <p className={T.value}>{empty.body}</p>
                          </EmptyState>
                        );
                      })()}
                  </div>
                </div>
                {/*
                Over the table, not under it.

                The bar used to be `sticky bottom-0` inside this column, which
                is a row of layout however few rows are selected — the table
                gave up a band of itself to hold it. Absolute inside the
                relative wrapper, it floats above the last rows instead, and
                the wrapper takes no pointer events so the rows behind it stay
                reachable everywhere the bar is not.
              */}
                {selected.length > 0 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
                    {/* The Bloocks BulkActionBar. Its fields stage a value for
                        the selection; Save writes the staged values and
                        Save & approve writes them and approves. */}
                    <BulkActionBar
                      className="pointer-events-auto"
                      selectedCount={selected.length}
                      // The header checkbox speaks for the page; this speaks
                      // for the filter, and goes once all of it is selected.
                      totalCount={filtered.length}
                      onSelectAll={
                        allFilteredSelected
                          ? undefined
                          : () => setSelected(filtered.map((x) => x.id))
                      }
                      fields={BULK_FIELDS.map((field) => ({
                        key: field,
                        label: BULK_SHORT[field] || field,
                        value: bulkStaged[field],
                        options: bulkOptions(field).map((value) => ({
                          label: value,
                          value,
                        })),
                        optionGroups:
                          field === "Voucher Type"
                            ? voucherTypeGroups.map((group) => ({
                                label: group.heading,
                                options: group.options.map((value) => ({
                                  label: value,
                                  value,
                                })),
                              }))
                            : undefined,
                        createNoun: field === "Vendor" ? "vendor" : "ledger",
                        onCreate:
                          field === "Ledger" || field === "Vendor"
                            ? (name: string) =>
                                setCreating({
                                  field,
                                  name,
                                  then: (created) => {
                                    notify(
                                      `${field === "Vendor" ? "Vendor" : "Ledger"} “${created}” created\nSave to set it on the selected documents.`
                                    );
                                    setBulkStaged((staged) => ({
                                      ...staged,
                                      [field]: created,
                                    }));
                                  },
                                })
                            : undefined,
                      }))}
                      onFieldChange={(key, value) =>
                        stageBulk(key as BulkField, value)
                      }
                      actions={[
                        // Only once something is staged: with nothing to
                        // write, Save would be a button that does nothing.
                        ...(Object.keys(bulkStaged).length
                          ? [{ label: "Save", onClick: bulkSave }]
                          : []),
                        {
                          // Says when it will also write the staged edits, so
                          // the bar never changes rows the user did not expect.
                          label: Object.keys(bulkStaged).length
                            ? "Save & approve"
                            : "Approve",
                          onClick: bulkApprove,
                          variant: "primary" as const,
                        },
                      ]}
                      deleteLabel={`Delete ${selected.length} selected`}
                      onDelete={() =>
                        askDelete(
                          `${selected.length} document${selected.length === 1 ? "" : "s"}`,
                          () =>
                            reportBulk(
                              "Deleted",
                              applyBulkAction(selected, "Delete")
                            ),
                          selected.length !== 1
                        )
                      }
                      onClearSelection={() => setSelected([])}
                    />
                  </div>
                )}
              </div>
              <Footer>
                <div className="flex items-center gap-2">
                  <span className={cn(T.cell, "text-foreground")}>
                    Rows per page:
                  </span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(0);
                    }}
                  >
                    <SelectTrigger
                      aria-label="Rows per page"
                      className={cn(
                        "h-auto w-[72px] rounded-md border-border px-2 py-1",
                        T.cell,
                        "text-foreground"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-0 sm:gap-1">
                  <PageButton
                    label="First page"
                    disabled={page === 0}
                    onClick={() => setPage(0)}
                  >
                    <ChevronsLeft />
                  </PageButton>
                  <PageButton
                    label="Previous page"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft />
                  </PageButton>
                  <span
                    className={cn(T.cell, "px-2 tabular-nums text-foreground")}
                  >
                    {filtered.length
                      ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`
                      : "0 of 0"}
                  </span>
                  <PageButton
                    label="Next page"
                    disabled={(page + 1) * pageSize >= filtered.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight />
                  </PageButton>
                  <PageButton
                    label="Last page"
                    disabled={(page + 1) * pageSize >= filtered.length}
                    onClick={() =>
                      setPage(
                        Math.max(0, Math.ceil(filtered.length / pageSize) - 1)
                      )
                    }
                  >
                    <ChevronsRight />
                  </PageButton>
                </div>
              </Footer>
            </>
          )}
        </main>
      </div>
      <PageDialog
        open={dialog === "intake" || dialog === "whatsapp"}
        title={
          dialog === "whatsapp" ? "Send via WhatsApp" : "Receive documents"
        }
        onClose={() => setDialog("")}
      >
        {dialog !== "whatsapp" && (
          <>
            <section className="space-y-3">
              <h2 className={T.section}>Forward by email</h2>
              <p className={T.value}>
                Each attachment becomes one Inbox item. Sender and subject are
                retained.
              </p>
              <div className={band}>
                <code className="rounded-md border border-neutral-gray bg-section px-2.5 py-1.5 text-xs text-foreground">
                  {company.slug}@inbox.aiaccountant.app
                </code>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(
                      `${company.slug}@inbox.aiaccountant.app`
                    );
                    notify("Forwarding address copied.");
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className={T.sub}>
                Local demonstration. Production address provisioning uses a
                random suffix.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  configure({
                    emailSuffix: {
                      ...state.emailSuffix,
                      [company.id]: crypto.randomUUID(),
                    },
                  });
                  notify(
                    "Demo forwarding address regenerated. Production email provisioning requires the backend."
                  );
                }}
              >
                Regenerate address (admin)
              </Button>
            </section>
            <Separator className="my-6 bg-neutral-gray" />
          </>
        )}
        <section className="space-y-3">
          {dialog !== "whatsapp" && (
            <h2 className={T.section}>Send via WhatsApp</h2>
          )}
          <Select value={environment} onValueChange={setEnvironment}>
            <SelectTrigger
              aria-label="WhatsApp environment"
              className="h-9 w-[180px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Production">Production</SelectItem>
              <SelectItem value="UAT">UAT</SelectItem>
            </SelectContent>
          </Select>
          <p className={cn(T.value, "text-foreground")}>
            {environment === "Production"
              ? "+91 63665 75567"
              : "+91 81233 89976"}
          </p>
          <p className={T.value}>
            Only phone numbers registered on an AI Accountant account can send
            documents. For multiple companies, choose a company on the first
            document. The selection persists until you send a company-switch
            message; it does not expire.
          </p>
          <div className={band}>
            <Button
              variant="secondary"
              onClick={() => {
                intakeMode.current = "auto";
                setSource("whatsapp");
                setSender("+91 90000 00001");
                setFiles([]);
                setUploadStatus([]);
                setUploadErrors([]);
                setDialog("upload");
              }}
            >
              Try WhatsApp intake
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                intakeMode.current = "auto";
                setSource("email");
                setSender("vendor@example.com");
                setFiles([]);
                setUploadStatus([]);
                setUploadErrors([]);
                setDialog("upload");
              }}
            >
              Try email intake
            </Button>
          </div>
        </section>
      </PageDialog>
      <PageDialog
        open={dialog === "upload"}
        // Short screens get a tighter inset, so the whole panel — tips open
        // included — stays on screen without scrolling. See upload-dialog.module.css.
        className="[@media(max-height:640px)]:p-5"
        /*
          The title carries the state, so the body no longer has to: "Bulk
          upload" plus a count plus a sentence saying the same thing was three
          lines for one fact.
        */
        title={
          source !== "upload"
            ? `Demo ${source} intake`
            : !files.length
              ? "Upload documents"
              : retrying.length && busy
                ? `Retrying ${retrying.length} upload${retrying.length === 1 ? "" : "s"}`
                : settledCount < files.length
                  ? `Uploading ${files.length} document${files.length === 1 ? "" : "s"}`
                  : // What landed, counted, whether or not anything was lost.
                    // "Uploaded 34 of 36" made the reader do the subtraction to
                    // find the good news; the failures are named directly below,
                    // so the header is free to say the part that went right.
                    `${uploadedCount} Upload${uploadedCount === 1 ? "" : "s"} Successful`
        }
        // No description. The formats and the cap are in the drop zone, where
        // they are read at the moment of choosing; the Banking-statements line
        // that used to sit here was removed at product's request.
        /*
          Closing is what ends a finished run. The batch is cleared here rather
          than when the run stops, because on a failed run the list of what did
          not make it is the reason the panel is still open — clearing it with
          the dialog still up would empty the thing being read.
        */
        onClose={() => {
          if (busy) return;
          setDialog("");
          window.setTimeout(() => {
            setFiles([]);
            setUploadStatus([]);
            setUploadErrors([]);
            setHandoff(false);
          }, DIALOG_EXIT_MS);
        }}
      >
        <div className="space-y-4">
          {source !== "upload" && (
            <Field label="Sender" htmlFor="intake-sender">
              <Input
                id="intake-sender"
                disabled={busy}
                value={sender}
                onChange={(e) => setSender(e.target.value)}
              />
            </Field>
          )}
          {source === "whatsapp" && (
            <>
              <Label className="flex cursor-pointer items-center gap-2.5 text-sm font-normal">
                <Checkbox
                  checked={waRegistered}
                  disabled={busy}
                  onCheckedChange={(checked) => setWaRegistered(!!checked)}
                />
                Number is registered on an AI Accountant account
              </Label>
              <Field label="Company (persists until changed)">
                <Select
                  value={state.waCompany}
                  disabled={busy}
                  onValueChange={(v) => configure({ waCompany: v })}
                >
                  <SelectTrigger aria-label="WhatsApp company" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          {/*
            A label wrapping a visually-hidden input, so the whole panel is the
            control: the browser's own file button is the one element on this
            screen the design system cannot reach, and dressing it with `file:`
            pseudo-elements left a native widget sitting inside a designed one.
            Hidden rather than `display:none` — a hidden input keeps its place
            in the tab ring, and the label's focus-within is what shows it.
          */}
          {!files.length && (
            <>
              {/*
                The drop zone, at the size it is worth: a tall dashed field with
                the icon and the rules side by side, rather than a thin strip of
                centred text. Built from the bulk upload frame.
              */}
              <label
                data-guide-id="inbox-drop-zone"
                className={cn(
                  uploadStyles.dropZone,
                  dragOver && uploadStyles.dragging
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
              >
                <span className={uploadStyles.artwork} aria-hidden="true">
                  <span className={uploadStyles.paperBack} />
                  <span className={uploadStyles.paper}>
                    <FilePlus2 size={25} strokeWidth={1.4} />
                    <i />
                    <i />
                  </span>
                  <span className={uploadStyles.uploadBadge}>
                    <Upload size={18} />
                  </span>
                </span>
                <span className={uploadStyles.dropTitle}>
                  {dragOver ? (
                    "Release to add your documents"
                  ) : (
                    <>Drop bills, invoices or expenses here</>
                  )}
                </span>
                <span className={uploadStyles.browse}>
                  or{" "}
                  <span>
                    browse files <ArrowRight size={13} />
                  </span>
                </span>
                <span className={uploadStyles.formats}>
                  <span>PDF</span>
                  <span>JPG</span>
                  <span>PNG</span>
                  <span className={uploadStyles.limit}>
                    Up to {MAX_UPLOAD_MB} MB
                  </span>
                </span>
                <input
                  aria-label="Choose documents"
                  type="file"
                  disabled={busy}
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    // Cleared so re-picking the same file fires change again —
                    // otherwise removing a file and choosing it back does nothing.
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>
              {/*
                What the reader needs to know before they choose, not after
                they are wrong: what it can read, what it reads best, where the
                limit is and how long it takes.
              */}
              {/* Collapsed by default: the tips are there for whoever wants
                  them, and the drop zone stays the one thing the panel is
                  about. A native disclosure, so Enter and Space work on it. */}
              <details className={uploadStyles.guidelines}>
                <summary className={uploadStyles.guidelinesTitle}>
                  <Lightbulb className="h-4 w-4" aria-hidden />
                  Tips for smooth upload
                  <ChevronDown
                    className={cn("h-4 w-4", uploadStyles.guidelinesChevron)}
                    aria-hidden
                  />
                </summary>
                <ul className={uploadStyles.tips}>
                  {UPLOAD_GUIDELINES.map((line) => (
                    <li key={line} className={uploadStyles.tip}>
                      <span aria-hidden className={uploadStyles.tipDot} />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </details>
              {/*
                The other two channels, named where the choice is being made.

                Email and WhatsApp are introduced on the kickstart screen, and
                the kickstart is gone the moment the first batch lands — so an
                Inbox in daily use advertised uploading and nothing else, and
                the two channels that do not need this dialog at all were
                never mentioned again.

                Always, now that the welcome is a dialog: it has closed by the
                time this opens, so nothing behind this panel names the other
                channels any more. Only for an upload — the demo Email and
                WhatsApp intakes are already that channel.
              */}
              {source === "upload" && (
                <section
                  aria-label="Other ways to send documents"
                  className={uploadStyles.channels}
                >
                  <span className={uploadStyles.channelsTitle}>Or send in</span>
                  <span className={uploadStyles.channel}>
                    <Mail aria-hidden />
                    <code>{company.slug}@inbox.aiaccountant.app</code>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label="Copy forwarding email address"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `${company.slug}@inbox.aiaccountant.app`
                          );
                          notify(
                            "Forwarding address copied. Paste it into your email client."
                          );
                        } catch {
                          notify(
                            "Couldn’t copy the address. Select it and copy it manually.",
                            "warning"
                          );
                        }
                      }}
                    >
                      <Copy />
                    </Button>
                  </span>
                  <span
                    aria-hidden="true"
                    className={uploadStyles.channelDivider}
                  />
                  {/* Registered already: name the number that is connected,
                      rather than offering to set up what is set up. */}
                  {state.scenario === "whatsapp" ? (
                    <span className={uploadStyles.channel}>
                      <MessageCircle aria-hidden />
                      WhatsApp
                      <code>{REGISTERED_WHATSAPP}</code>
                    </span>
                  ) : (
                    <span className={uploadStyles.channel}>
                      <MessageCircle aria-hidden />
                      WhatsApp
                      {/* A link, not a button: it sits inside a line of
                          text, so it takes the line's size rather than a
                          button's height and padding. */}
                      <Button
                        variant="link"
                        className="h-auto shrink-0 p-0 text-xs"
                        onClick={() => setDialog("whatsapp")}
                      >
                        Set up
                      </Button>
                    </span>
                  )}
                </section>
              )}
            </>
          )}
          {files.length > 0 && (
            <section
              data-guide-id="inbox-upload-progress"
              className="space-y-3"
            >
              {/*
                The same drawing the Tally sync run uses: a count that is the
                headline, and the documents themselves naming what has landed.
                A batch of files going across one at a time is one event, so it
                gets one shape wherever it happens.
              */}
              {/*
                The headline counts what landed, not what finished.

                Settled would have the bar full and the number level with the
                total on a run that lost two documents — a complete-looking
                count over an error list. Uploaded is the figure the title and
                the toast use, so all three agree, and the gap between it and
                the total is the failure, visible without reading anything.
              */}
              <UploadAnimation
                uploaded={uploadedCount}
                total={files.length}
                failed={failedCount}
                active={busy}
              />
              {/* The list still follows every settle, a failure included — it
                  is the row in flight it is chasing, not the count.

                  Fixed height rather than max-height: growing to fit the first
                  four rows moved the panel's bottom edge — and everything
                  under it — four times in the first half-second of a run. The
                  box is the size it will end up at from the first frame. */}
              {/*
                While it runs, every document. Once it has stopped with
                failures, only those.

                The running list is what you watch; a finished one is a wall of
                green ticks with the two rows that matter scrolled somewhere
                inside it. A count alone ("2 failed") names none of them, which
                leaves the reader to work out what is missing from a table of
                thirty-four.

                The running list is pinned at 180px so it cannot grow under the
                reader mid-run. This one is not: the run has stopped, two
                failures are two rows, and holding the taller box open would be
                180px of empty panel below them.
              */}
              {!retrying.length && (busy || !failedCount) ? (
                <RunRowList
                  className="h-[180px]"
                  settled={settledCount}
                  rows={files.map((f, i) => {
                    const status = uploadStatus[i] || "Queued";
                    return {
                      id: `${f.name}-${f.size}-${i}`,
                      label: f.name,
                      state:
                        status === "Uploaded"
                          ? "done"
                          : status === "Failed"
                            ? "failed"
                            : status === "Uploading"
                              ? "active"
                              : "queued",
                    };
                  })}
                />
              ) : (
                (() => {
                  /*
                    Failures, sorted by what fixes them.

                    A retry fixes an interrupted upload; nothing but a new file
                    fixes a password-protected or damaged one. So the rows split
                    into those two groups, each with its own action, and Retry
                    all belongs to the first group only — it never offers to fix
                    what it cannot. When every failure is the same kind there is
                    one group, and the headings go: the panel header says the
                    reason once.
                  */
                  const rows = files.flatMap((f, i) =>
                    uploadStatus[i] === "Failed" || retrying.includes(i)
                      ? [{ f, i, group: failGroups[i] ?? "retry" }]
                      : []
                  );
                  const retryRows = rows.filter((r) => r.group === "retry");
                  const replaceRows = rows.filter((r) => r.group === "replace");
                  const grouped = !!retryRows.length && !!replaceRows.length;
                  const kinds = new Map<
                    string,
                    { n: number; info: ReturnType<typeof classifyFailure> }
                  >();
                  rows.forEach(({ f, i }) => {
                    if (uploadStatus[i] !== "Failed") return;
                    const info = classifyFailure(reasonFor(f.name));
                    const entry = kinds.get(info.key);
                    kinds.set(info.key, { n: (entry?.n ?? 0) + 1, info });
                  });
                  const kindList = [...kinds.values()];
                  const oneKind =
                    kindList.length === 1 ? kindList[0].info : null;
                  const running = busy && !!retrying.length;
                  /* The reason a row carries itself: only when nothing above
                     it has already said it. */
                  const retryKinds = new Set(
                    retryRows
                      .filter(({ i }) => uploadStatus[i] === "Failed")
                      .map(({ f }) => classifyFailure(reasonFor(f.name)).key)
                  );
                  const retryHeading =
                    retryKinds.size === 1
                      ? classifyFailure(
                          reasonFor(
                            retryRows.find(
                              ({ i }) => uploadStatus[i] === "Failed"
                            )!.f.name
                          )
                        )
                      : null;
                  const retryAll = !busy && retryableIndexes.length > 1 && (
                    <Button
                      variant="secondary"
                      className="flex-none"
                      onClick={() => void retryUploads(retryableIndexes)}
                    >
                      <RotateCcw aria-hidden />
                      Retry all
                    </Button>
                  );
                  const renderRow = ({
                    f,
                    i,
                    group,
                  }: (typeof rows)[number]) => {
                    const status = uploadStatus[i];
                    const waiting =
                      running && retrying.includes(i) && status === "Failed";
                    const info = classifyFailure(reasonFor(f.name));
                    const size =
                      f.size >= 1024 * 1024
                        ? `${(f.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${Math.max(1, Math.round(f.size / 1024))} KB`;
                    // Said above already (one kind overall, or one kind in
                    // this group): the row just says it did not make it.
                    const saidAbove =
                      !!oneKind ||
                      (group === "retry" && grouped && !!retryHeading);
                    const [stateText, stateClass] =
                      status === "Uploading"
                        ? ["Uploading…", "text-primary"]
                        : status === "Uploaded"
                          ? ["Uploaded", "text-success-green-foreground"]
                          : waiting
                            ? ["Waiting to retry", "text-secondary-foreground"]
                            : [
                                saidAbove ? "Not uploaded" : info.title,
                                "text-destructive-foreground",
                              ];
                    const showDetail =
                      status === "Failed" &&
                      !waiting &&
                      !saidAbove &&
                      !!info.detail;
                    return (
                      <li
                        key={`${f.name}-${f.size}-${i}`}
                        className="flex items-center gap-3 border-b border-neutral-gray px-4 py-2.5 last:border-b-0"
                      >
                        <span
                          className="grid h-[18px] w-[18px] flex-none place-items-center self-start pt-0.5"
                          aria-hidden
                        >
                          {status === "Uploading" ? (
                            <Loader2 className="h-[18px] w-[18px] animate-spin text-primary motion-reduce:animate-none" />
                          ) : status === "Uploaded" ? (
                            <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-status-success">
                              <Check
                                className="h-3 w-3 text-white"
                                strokeWidth={3}
                              />
                            </span>
                          ) : waiting ? (
                            <span className="box-border h-[15px] w-[15px] rounded-full border-2 border-neutral-gray" />
                          ) : (
                            <XCircle className="h-[18px] w-[18px] text-destructive-foreground" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-foreground">
                            {f.name}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs">
                            <span className="text-secondary-foreground">
                              {size}
                            </span>
                            <span
                              className="text-secondary-foreground"
                              aria-hidden
                            >
                              ·
                            </span>
                            <span className={stateClass} role="status">
                              {stateText}
                            </span>
                          </span>
                          {showDetail && (
                            <span className={cn(T.sub, "mt-0.5 block")}>
                              {info.detail}
                            </span>
                          )}
                        </span>
                        {!busy &&
                          status === "Failed" &&
                          (group === "retry" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-none"
                              aria-label={`Retry ${f.name}`}
                              onClick={() => void retryUploads([i])}
                            >
                              <RotateCcw aria-hidden />
                              Retry
                            </Button>
                          ) : (
                            /* A label around a hidden input, like the drop zone:
                             the button is the file picker. */
                            <label
                              className={cn(
                                buttonVariants({
                                  variant: "ghost",
                                  size: "sm",
                                }),
                                "relative flex-none cursor-pointer focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
                              )}
                            >
                              <Upload aria-hidden />
                              Choose file
                              <input
                                type="file"
                                className="sr-only"
                                accept=".pdf,.png,.jpg,.jpeg"
                                aria-label={`Choose a new file for ${f.name}`}
                                onChange={(e) => {
                                  const picked = e.target.files?.[0];
                                  e.target.value = "";
                                  if (picked)
                                    void retryUploads([i], {
                                      index: i,
                                      file: picked,
                                    });
                                }}
                              />
                            </label>
                          ))}
                      </li>
                    );
                  };
                  const groupHeading = (
                    title: string,
                    detail?: string,
                    action?: React.ReactNode
                  ) => (
                    <div className="flex items-center gap-3 border-b border-neutral-gray px-4 py-2">
                      <p className="min-w-0 flex-1 text-xs">
                        <span className="font-semibold text-foreground">
                          {title}
                        </span>
                        {detail ? (
                          <span className="text-secondary-foreground">
                            {" "}
                            · {detail}
                          </span>
                        ) : null}
                      </p>
                      {action}
                    </div>
                  );
                  return (
                    <section
                      aria-label="Documents that did not upload"
                      className="overflow-hidden rounded-lg border border-neutral-gray"
                    >
                      <header className="flex items-center gap-3 border-b border-neutral-gray bg-section px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-foreground">
                            {running
                              ? "Sending again"
                              : failedCount
                                ? `${failedCount} document${failedCount === 1 ? "" : "s"} didn’t upload`
                                : "All documents uploaded"}
                          </h3>
                          <p className={cn(T.sub, "mt-0.5")}>
                            {running
                              ? `${retrying.filter((i) => uploadStatus[i] === "Uploaded").length} of ${retrying.length} uploaded`
                              : !failedCount
                                ? "They’re being prepared for review."
                                : oneKind
                                  ? `${oneKind.title}. ${oneKind.detail}`.trim()
                                  : kindList
                                      .map(
                                        ({ n, info }) => `${n} ${info.short}`
                                      )
                                      .join(" · ")}
                          </p>
                        </div>
                        {!grouped && retryAll}
                      </header>
                      {/* The list takes whatever height the dialog has left under its 90vh
                          cap (the rest of the panel is ~464px, ~397px once the
                          short-screen rules kick in), so the dialog itself
                          never scrolls; the list does, if it must. */}
                      <div className="max-h-[clamp(72px,calc(90vh-464px),280px)] overflow-y-auto [@media(max-height:640px)]:max-h-[clamp(72px,calc(90vh-397px),280px)]">
                        {grouped ? (
                          <>
                            {groupHeading(
                              retryHeading
                                ? retryHeading.title
                                : "Can be retried",
                              retryHeading?.detail,
                              retryAll
                            )}
                            <ul>{retryRows.map(renderRow)}</ul>
                            <div className="border-t border-neutral-gray" />
                            {groupHeading("Needs a new file")}
                            <ul>{replaceRows.map(renderRow)}</ul>
                          </>
                        ) : (
                          <ul>{rows.map(renderRow)}</ul>
                        )}
                      </div>
                    </section>
                  );
                })()
              )}
              {/*
                The batch size and the handoff line are gone.

                Every fact on that row is said better somewhere else by the
                time it appears: the header counts what landed, the drawing
                counts what failed, and the list underneath names them. What
                was left was a total in megabytes — a number nobody acts on —
                beside a sentence about where the good documents went, on a
                panel whose whole subject at that moment is the ones that did
                not.
              */}
            </section>
          )}
          {/* A run that stopped short is the only one that ends on buttons. A
              clean one has already left. */}
          {!!files.length && !busy && !!failedCount && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setFiles([]);
                  setUploadStatus([]);
                  setUploadErrors([]);
                }}
              >
                Upload more
              </Button>
              <Button
                onClick={() => {
                  setDialog("");
                  window.setTimeout(() => {
                    setFiles([]);
                    setUploadStatus([]);
                    setUploadErrors([]);
                  }, DIALOG_EXIT_MS);
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </PageDialog>
      <InboxWelcomeDialog
        open={welcomeOpen}
        onClose={closeWelcome}
        companyName={company.name}
        email={`${company.slug}@inbox.aiaccountant.app`}
        maxFiles={MAX_UPLOAD_FILES}
        arrivals={arrivals.total ? arrivals : undefined}
        onReview={() => {
          closeWelcome();
          setFilters(defaultFilters);
          setTab("Need review");
          setPage(0);
          setSelected([]);
        }}
        onTour={() => afterWelcome(() => guide.startJourney("inbox"))}
        onSkip={closeWelcome}
        onCopy={async () => {
          try {
            await navigator.clipboard.writeText(
              `${company.slug}@inbox.aiaccountant.app`
            );
            notify(
              "Forwarding address copied. Paste it into your email client."
            );
            return true;
          } catch {
            notify(
              "Couldn’t copy the address. Select it and copy manually.",
              "error"
            );
            return false;
          }
        }}
        onCopyNumber={async () => {
          try {
            await navigator.clipboard.writeText(AIA_WHATSAPP);
            notify(
              "WhatsApp number copied. Send your bills to it from your registered phone."
            );
            return true;
          } catch {
            notify(
              "Couldn’t copy the number. Select it and copy manually.",
              "error"
            );
            return false;
          }
        }}
        onWhatsApp={() => afterWelcome(() => setDialog("whatsapp"))}
        onUpload={(incoming) =>
          afterWelcome(() => {
            intakeMode.current = "bulk";
            setSource("upload");
            setSender(actor);
            setUploadErrors([]);
            setFiles([]);
            setUploadStatus([]);
            if (incoming) addFiles(incoming, "upload");
            setDialog("upload");
          })
        }
      />
      <PageDialog
        open={dialog === "demo"}
        title="Prototype settings"
        description="Choose the modules this role can post to. These are local scenarios, not production access controls."
        onClose={() => setDialog("")}
      >
        {/*
          Which first visit the prototype tells. Switching starts the demo over
          in that story — the same as a reload, which keeps the choice.
        */}
        <section className="mb-5 space-y-2">
          <h2 className={T.section}>First visit</h2>
          <div
            role="radiogroup"
            aria-label="First visit scenario"
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {(
              [
                [
                  "whatsapp",
                  "WhatsApp registered before launch",
                  "Documents are already waiting when Inbox opens.",
                ],
                ["new", "New user", "Inbox opens empty."],
              ] as [Scenario, string, string][]
            ).map(([value, label, detail]) => {
              const active = (state.scenario || "whatsapp") === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    if (active) return;
                    applyScenario(value);
                    startedInboxCompanies.clear();
                    setDialog("");
                    setFiles([]);
                    setUploadStatus([]);
                    setUploadErrors([]);
                    setHandoff(false);
                    setFilters(defaultFilters);
                    setTab("Need review");
                    setPage(0);
                    setSelected([]);
                    if (router.asPath !== "/inbox") void router.push("/inbox");
                  }}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-accent"
                      : "border-neutral-gray hover:bg-accent/50"
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">
                    {label}
                  </span>
                  <span className={T.sub}>{detail}</span>
                </button>
              );
            })}
          </div>
        </section>
        <h2 className={cn(T.section, "mb-2")}>Posting access</h2>
        <div className="space-y-1">
          {routes.map((r) => (
            <Label
              className="flex cursor-pointer items-center gap-2.5 rounded-md p-2 text-sm font-normal hover:bg-accent"
              key={r}
            >
              <Checkbox
                checked={state.permissions.includes(r)}
                onCheckedChange={(checked) =>
                  setPermissions(
                    checked
                      ? [...state.permissions, r]
                      : state.permissions.filter((v) => v !== r)
                  )
                }
              />
              {routeNames[r]}
            </Label>
          ))}
        </div>
        <div className={cn(band, "mt-5")}>
          <Button
            variant="outline"
            onClick={() => {
              setDialog("");
              guide.startJourney("inbox");
            }}
          >
            Replay launch guide
          </Button>
          {/*
            The launch tag has no other way to be seen in both of its states —
            a prototype is always on day zero, so without this the fifteenth
            day is undemonstrable. Backdating past the window is what retires
            it and hands the Inbox entry back to its count.
          */}
          <Button
            variant="outline"
            onClick={() => {
              const isNew = withinNewWindow(state.launchedAt);
              configure({
                launchedAt: new Date(
                  Date.now() - (isNew ? (NEW_TAG_DAYS + 1) * 86400_000 : 0)
                ).toISOString(),
              });
              notify(
                isNew
                  ? `Launch backdated past ${NEW_TAG_DAYS} days. The Inbox entry shows its Needs Review count again.`
                  : `Launch reset to today. The Inbox entry carries the NEW tag for ${NEW_TAG_DAYS} days.`
              );
            }}
          >
            {withinNewWindow(state.launchedAt)
              ? "Retire NEW tag"
              : "Restore NEW tag"}
          </Button>
        </div>
        <p className={cn(T.sub, "mt-4")}>
          Production connections are not configured. Files, vouchers and audit
          events are stored locally.
        </p>
      </PageDialog>
      <PageDialog
        open={dialog === "audit"}
        title="Audit history and event outbox"
        description="Local transition history and PRD telemetry events. No events are sent to Mixpanel."
        onClose={() => setDialog("")}
      >
        <div className="mb-4">
          <Button variant="outline" onClick={downloadAudit}>
            Export JSON
          </Button>
        </div>
        <div className="max-h-[400px] overflow-auto rounded-md border border-neutral-gray">
          {state.events
            .filter((e) => e.company === state.company)
            .slice()
            .reverse()
            .map((e) => (
              <details
                key={e.id}
                className="border-b border-neutral-gray p-2.5 last:border-b-0"
              >
                <summary className="cursor-pointer text-xs text-foreground">
                  {e.event} · {e.itemId}{" "}
                  <span className={T.sub}>
                    {stamp(e.at)} · {e.actor}
                  </span>
                </summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-section p-2.5 text-label-3 leading-4 text-secondary-foreground">
                  {JSON.stringify(e.properties, null, 2)}
                </pre>
              </details>
            ))}
        </div>
      </PageDialog>
      {/* One create dialog for every picker that offers "+ Create …". */}
      <CreateMasterDialog
        kind={
          creating?.field === "Vendor" ? "vendor" : creating ? "ledger" : null
        }
        initialName={creating?.name || ""}
        existing={creating ? bulkOptions(creating.field) : []}
        description={creating?.description}
        onClose={() => setCreating(null)}
        onCreate={(name) => {
          if (!creating) return;
          const { field, then } = creating;
          // DEV: POST /api/accounting-masters/ledgers (see the dialog), whichever
          // picker asked for it.
          setCreatedMasters((masters) => ({
            ...masters,
            [field]: [...masters[field], name],
          }));
          setCreating(null);
          then(name);
        }}
      />
      {/*
        One dialog for every Delete on the screen — the row kebab, the
        selection bar, the review page and the register all set the same
        state. Separate confirmations drift: four wordings for one act, and
        the one that gets skipped is the one someone forgot to add.

        Delete stays the primary button rather than hiding behind Cancel.
        The reader opened this by choosing Delete; making them hunt for it a
        second time is friction spent on the answer they already gave. Cancel
        is first and takes the Escape key, which is where a change of mind
        actually goes.
      */}
      <PageDialog
        open={!!confirmDelete}
        // Names the thing in the title, so a selection of twelve and a single
        // file are not the same sentence with the count buried in the body.
        title={`Delete ${confirmDelete?.target ?? "this document"}?`}
        onClose={() => setConfirmDelete(null)}
        className="max-w-[460px]"
      >
        <p className={T.value}>
          {confirmDelete?.many
            ? "They are removed from the Inbox. This can’t be undone."
            : "It is removed from the Inbox. This can’t be undone."}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
          {/* Filled red: the confirmation is the one place the removal
              carries full weight. The Delete that opened this dialog is a
              red ghost, so the colour carries through without shouting. */}
          <Button
            isDestructive
            onClick={() => {
              confirmDelete?.run();
              setConfirmDelete(null);
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </PageDialog>
      <PageDialog
        open={dialog === "dashboard"}
        title="Launch dashboard"
        description="Local prototype metrics; extraction latency and query performance need production measurement."
        onClose={() => setDialog("")}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {routes.map((r) => {
            const approved = all.filter(
              (x) => x.status === "Approved" && x.route === r
            );
            return (
              <div
                className="rounded-lg border border-neutral-gray bg-section p-5"
                key={r}
              >
                <h2 className={T.section}>{routeNames[r]}</h2>
                <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
                  {approved.length}{" "}
                  <span className={cn(T.sub, "font-normal")}>approved</span>
                </p>
                <p className={T.sub}>
                  {approved.length
                    ? Math.round(
                        (approved.filter((x) => x.route === x.aiRoute).length /
                          approved.length) *
                          100
                      )
                    : 0}
                  % route acceptance
                </p>
              </div>
            );
          })}
        </div>
        <dl className="mt-5 space-y-2">
          <Stat label="Permission redirects">
            {all.filter((x) => x.aiRoute !== x.topChoice).length}
          </Stat>
          <Stat label="First-attempt approvals">
            {
              all.filter((x) => x.status === "Approved" && x.firstAttempt)
                .length
            }
          </Stat>
          <Stat label="Channel mix">
            {["email", "whatsapp", "upload"]
              .map((s) => `${s}: ${all.filter((x) => x.source === s).length}`)
              .join(" · ")}
          </Stat>
        </dl>
        <div className="mt-5">
          <Button variant="outline" onClick={() => setDialog("audit")}>
            Inspect bulk and recovery events
          </Button>
        </div>
      </PageDialog>
    </>
  );

  /*
    Reviewing one document drops the SIDEBAR but keeps the top bar. The review
    surface is a document beside a form that the accountant resizes, and the
    sidebar's width was taken from the half they were reading — but the bar is
    50px and it is where Sync lives, and a sync is not a property of the screen
    you happen to be on. Losing the control the moment you opened a document
    meant you had to navigate away from your work to start one.

    The chevron at the head of the header row is still the way back; the bar
    adds no second navigation, it carries the app-level actions.

    Deciding this here rather than inside SidebarLayout is deliberate — that
    component is a stub mirroring production's props contract and is deleted at
    handoff, so it must not grow a prop production does not have.
  */
  const syncButton = (
    <SyncChromeButton
      onClick={sync.openConfirm}
      isSyncing={sync.isRunning}
      connection={sync.connection}
    />
  );
  /**
   * Mounted in both shells, not just the list. A run started from the list and
   * then followed into a document must keep reporting — closing the shell it
   * was launched from is not the same as cancelling it.
   */
  const syncModals = (
    <>
      {/*
        445px — the width the panel was drawn at (Figma 24496:57272). Full
        height, because the list is twelve rows and a reference you scroll is
        better than one that is cut off.
      */}
      <Drawer open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DrawerContent
          side="right"
          className="w-full gap-0 overflow-y-auto border-neutral-gray p-0 sm:max-w-[445px]"
        >
          <KeyboardShortcuts />
        </DrawerContent>
      </Drawer>
      <SyncConfirmModal
        open={sync.phase === "confirm"}
        onOpenChange={(open) =>
          open ? sync.openConfirm() : sync.closeConfirm()
        }
        currentModule={sync.currentModule}
        includedModules={sync.includedModules}
        selectedKeys={sync.selectedKeys}
        onToggleModule={sync.toggleModule}
        connection={sync.connection}
        selectedCount={sync.selectedCount}
        onConfirm={sync.start}
      />
      <SyncProgressModal
        open={sync.phase === "running"}
        docs={sync.docs}
        settledCount={sync.settledCount}
        modules={sync.runModules}
        moduleProgress={sync.moduleProgress}
        onStop={sync.stop}
        onContinueInBackground={sync.continueInBackground}
      />
      <SyncResultModal
        open={sync.phase === "result"}
        run={sync.run}
        onDone={sync.dismissResult}
        onReviewFailures={sync.reviewFailures}
      />
    </>
  );

  /* Reviewing a document is the one screen with no app top bar. Everything that
     bar carried belongs to moving between documents, not to reading the one on
     screen: the company is fixed for the length of a cohort, a sync cannot run
     against a record being edited, and the way out is the back arrow the page
     bar already has. The list view keeps the bar via SidebarLayout below. */
  return fullScreen ? (
    <div className="flex h-screen min-h-0 flex-col bg-background text-foreground">
      {content}
      {syncModals}
    </div>
  ) : (
    <SidebarLayout
      inboxCount={all.filter((x) => x.status === "Needs Review").length}
      inboxNew={withinNewWindow(state.launchedAt)}
      activeNavId={navId}
      onNavSelect={selectNav}
      onGuide={guide.openLauncher}
      companies={companies.map((c) => ({ id: c.id, name: c.name }))}
      companyId={state.company}
      onCompanyChange={changeCompany}
      companyAction={syncButton}
    >
      {content}
      {syncModals}
    </SidebarLayout>
  );
}

/* ------------------------------------------------------------ local chrome */

/**
 * Explains a disabled control, or gets out of the way.
 *
 * With no reason this renders its child and nothing else, so an enabled
 * Approve is exactly the button it always was — no wrapper span in the flex
 * row, no tooltip that opens on an action that is available anyway.
 *
 * With one, the child is wrapped: a disabled button swallows nothing because
 * it receives nothing, so the hover has to be caught by an element above it.
 * That element takes `tabIndex` too — a disabled button is skipped by the tab
 * ring, and a reason only a mouse can reach is not a reason a keyboard user
 * has been given.
 */
const BlockedReason = ({
  reason,
  children,
}: {
  reason: string;
  children: React.ReactNode;
}) =>
  reason ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex rounded-md">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-[280px]">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <>{children}</>
  );

/** The switch's loading state beside the document it is re-reading. */
const RouteSwitchPanel = ({ item }: { item: Item }) => (
  <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
    <ResizablePanel defaultSize={32} minSize={18} className="min-w-0">
      <Preview item={item} />
    </ResizablePanel>
    <ResizableHandle withHandle />
    <ResizablePanel defaultSize={68} minSize={40} className="min-w-0">
      <RouteSwitchLoader item={item} />
    </ResizablePanel>
  </ResizablePanelGroup>
);

/**
 * The review page's Delete — a destructive ghost, the lowest-emphasis red.
 *
 * Red marks it as the one control on the bar that removes something; ghost
 * keeps it quieter than every other button so it never competes with
 * Approve. The confirmation's filled red button is where the weight goes.
 */
const DangerButton = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <Button variant="ghost" isDestructive onClick={onClick}>
    {children}
  </Button>
);

/**
 * Per-row actions, behind a kebab.
 *
 * View and Delete only. Everything else a row can do — approve, retry, convert
 * — is either a bulk action on the bar or a decision the detail view is built
 * to take with the document in front of you; a menu that repeats them makes
 * the row a second, smaller version of the screen it opens.
 *
 * A row whose document is already deleted drops Delete altogether: it is a
 * no-op dressed as a choice, and the store's guard would refuse it anyway.
 * (Such a row cannot appear in the queue — All excludes deleted documents —
 * but the guard costs nothing and the menu is built from the item, not the
 * tab.)
 */
const RowActions = ({
  item,
  onView,
  onDelete,
}: {
  item: Item;
  onView: () => void;
  onDelete: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Actions for ${item.file.name}`}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={onView}>View</DropdownMenuItem>
      {item.status !== "Deleted" && (
        <DropdownMenuItem onSelect={onDelete}>Delete</DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
);

/**
 * The fields a selection can be reassigned on, in the bar's order.
 *
 * There is no Route: Voucher type carries it, grouped by the voucher each type
 * posts as, the same as the table's dropdown.
 */
/**
 * What the bar's buttons call their fields. Short in both states, so the bar
 * fits beside a toast on a laptop screen, and a button does not change its
 * name the moment something is staged; the search box and the title still
 * give the full name.
 */
const BULK_SHORT: Partial<Record<BulkField, string>> = {
  "GST Registration": "GST",
  "Voucher Type": "Voucher",
};
/** The order staged edits are written in on Approve. See `bulkApprove`. */
const BULK_APPLY_ORDER: BulkField[] = [
  "Voucher Type",
  "Vendor",
  "GST Registration",
  "Ledger",
];
const BULK_FIELDS: BulkField[] = [
  "Vendor",
  "GST Registration",
  "Voucher Type",
  "Ledger",
];

const PageButton = ({
  label,
  disabled,
  onClick,
  children,
  className,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** For the cohort pager, which wants the brand at low emphasis, not grey. */
  className?: string;
}) => (
  <Button
    variant="ghost"
    size="icon"
    aria-label={label}
    title={label}
    className={cn(
      "text-secondary-foreground hover:bg-section hover:text-primary",
      className
    )}
    disabled={disabled}
    onClick={onClick}
  >
    {children}
  </Button>
);

/**
 * Publishes its own height as --inbox-footer-h.
 *
 * The embedded bill sheet pins two things to the viewport bottom — its line-item
 * bulk bar and its toast stack — from a time when it owned the whole window. In
 * the inbox this band belongs to the footer, so both would sit on top of Delete
 * and Approve & Next. The sheet's CSS offsets them by this variable rather than
 * a number, so the clearance survives anything that changes the footer's height.
 */
const Footer = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () =>
      document.documentElement.style.setProperty(
        "--inbox-footer-h",
        `${Math.round(el.getBoundingClientRect().height)}px`
      );
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      // Nothing is pinned above a footer that is no longer on screen.
      document.documentElement.style.removeProperty("--inbox-footer-h");
    };
  }, []);
  return (
    <div
      ref={ref}
      className={cn(
        band,
        gutter,
        // py-1.5: the pagination band is 6px vertical (Figma 24156:149264).
        "shrink-0 flex-wrap justify-between border-t border-neutral-gray bg-background py-1.5"
      )}
    >
      {children}
    </div>
  );
};

const EmptyState = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="m-auto flex max-w-[750px] flex-col items-center gap-3 p-14 text-center">
    {icon}
    <h1 className={T.title}>{title}</h1>
    {children}
  </div>
);

const Stat = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className={T.value}>{label}</dt>
    <dd className="text-sm font-semibold tabular-nums text-foreground">
      {children}
    </dd>
  </div>
);

/* -------------------------------------------------------------- review form */

function ReviewForm({
  item,
  onEdit,
  readOnly = false,
}: {
  item: Item;
  onEdit: (p: Partial<Form>) => void;
  readOnly?: boolean;
}) {
  const [mode, setMode] = useState("Item Mode");
  const f = readOnly ? item.snapshot || item.form : item.form;
  /**
   * Every field on this form is a string. `costClassEnabled` is the one member
   * of `Form` that is not, and it belongs to the journal, which has its own
   * form now — so it is excluded here rather than special-cased at each cell.
   */
  type TextField = Exclude<keyof Omit<Form, "lines">, "costClassEnabled">;
  const fields: [TextField, string, string][] = [
    ["gst", "GST Registration", "text"],
    ["voucherType", "Voucher Type", "text"],
    ["voucherNo", "Voucher No", "text"],
    [
      "invoiceNo",
      item.route === "AR" ? "Invoice No" : "Supplier Invoice No",
      "text",
    ],
    ["date", item.route === "AR" ? "Invoice Date" : "Bill Date", "date"],
    ["due", "Due Date", "date"],
    ["party", item.route === "AR" ? "Customer Name" : "Vendor Name", "text"],
    ["costClass", "Cost Centre Class", "text"],
    ["costCentre", "Cost Centre", "text"],
  ];
  const editLine = (index: number, patch: Partial<Form["lines"][number]>) =>
    onEdit({
      lines: f.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    });
  return (
    <div>
      {!readOnly && (
        <div className={cn(band, "px-5 pt-5")}>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList>
              {["Item Mode", "Accounting Mode"].map((m) => (
                <TabsTrigger key={m} value={m}>
                  {m}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      )}
      {/*
        Panelled and laid out like the sheet's own field cards, so the approved
        record reads as the same product as the sheet the bill was approved on.

        This form no longer serves the journal. A JV opens
        components/inbox/journal, which is a port of the Journals prototype's
        own screen — so everything here is a bill, and the Dr/Cr branches this
        component used to carry are gone with them.
      */}
      <div className="p-5">
        <FieldCard title="Bill Details">
          {fields.map(([key, label, type]) => (
            <Field
              key={key}
              htmlFor={`f-${key}`}
              label={
                REQUIRED_FIELDS.has(key) ? (
                  <>
                    <Req />
                    {label}
                  </>
                ) : (
                  label
                )
              }
              hint={item.edited.includes(key) ? <EditedMark /> : undefined}
            >
              {key === "gst" ? (
                <Select
                  value={f[key]}
                  disabled={readOnly}
                  onValueChange={(v) => onEdit({ [key]: v })}
                >
                  <SelectTrigger id={`f-${key}`} className="h-9">
                    <SelectValue placeholder="Select registration" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ...new Set(
                        [
                          f.gst,
                          ...companies.find((c) => c.id === item.company)!
                            .branches,
                        ].filter(Boolean)
                      ),
                    ].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : key === "voucherType" ? (
                <Select
                  value={f[key]}
                  disabled={readOnly}
                  onValueChange={(v) => onEdit({ [key]: v })}
                >
                  <SelectTrigger id={`f-${key}`} className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      ...new Set(
                        [...voucherTypes, "Sales", f.voucherType].filter(
                          Boolean
                        )
                      ),
                    ].map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : type === "date" ? (
                <DateField
                  id={`f-${key}`}
                  value={f[key]}
                  disabled={readOnly}
                  onChange={(iso) => onEdit({ [key]: iso })}
                />
              ) : (
                <Input
                  id={`f-${key}`}
                  type={type}
                  readOnly={readOnly}
                  value={f[key]}
                  onChange={(e) => onEdit({ [key]: e.target.value })}
                />
              )}
            </Field>
          ))}
        </FieldCard>
      </div>
      {/* On the sheet's ground too, so the lines read as a section of the same
          form rather than a table dropped below it. */}
      <div className="px-5 pb-5">
        <section className="space-y-4 rounded-md bg-section p-5">
          <h2 className={T.section}>
            {mode === "Accounting Mode" ? "Accounting entries" : "Line items"}
          </h2>
          <div className="overflow-x-auto rounded-md border border-neutral-gray bg-background">
            <Table>
              <TableHeader className="bg-section">
                <TableRow>
                  <TableHead className="text-xs font-medium">Ledger</TableHead>
                  <TableHead className="text-xs font-medium">
                    Description
                  </TableHead>
                  <TableHead className="text-xs font-medium">Amount</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {f.lines.map((l, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Input
                        aria-label={`Ledger ${i + 1}`}
                        list="ledgers"
                        value={l.ledger}
                        readOnly={readOnly}
                        onChange={(e) =>
                          editLine(i, { ledger: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`Description ${i + 1}`}
                        value={l.description}
                        readOnly={readOnly}
                        onChange={(e) =>
                          editLine(i, { description: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="w-[110px]">
                        <Input
                          aria-label={`Amount ${i + 1}`}
                          type="number"
                          min="0"
                          step=".01"
                          className="truncate text-right tabular-nums"
                          value={l.amount}
                          readOnly={readOnly}
                          onChange={(e) =>
                            editLine(i, { amount: Number(e.target.value) })
                          }
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove line ${i + 1}`}
                          // Grey until hovered: a red icon on every row would
                          // be the loudest thing in the table.
                          className="text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() =>
                            onEdit({ lines: f.lines.filter((_, n) => n !== i) })
                          }
                        >
                          ×
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <datalist id="ledgers">
            {ledgerOptions.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </datalist>
          {!readOnly && (
            <Button
              variant="secondary"
              onClick={() =>
                onEdit({
                  lines: [
                    ...f.lines,
                    {
                      description: "",
                      ledger: "",
                      amount: 0,
                      dr: 0,
                      cr: 0,
                      costCentre: "",
                    },
                  ],
                })
              }
            >
              Add line
            </Button>
          )}
          <p className="text-right text-sm font-semibold tabular-nums text-foreground">
            Total {money(f.lines.reduce((s, l) => s + l.amount, 0))}
          </p>
          <Field
            label="Narration"
            htmlFor="f-narration"
            hint={
              item.edited.includes("narration") ? <EditedMark /> : undefined
            }
          >
            <Textarea
              id="f-narration"
              rows={3}
              readOnly={readOnly}
              value={f.narration}
              onChange={(e) => onEdit({ narration: e.target.value })}
            />
          </Field>
        </section>
      </div>
    </div>
  );
}
