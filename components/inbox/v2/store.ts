import { useSyncExternalStore } from "react";
import {
  MOCK_INBOX_ITEMS,
  SAHYADRI_FIRST_BILL,
  COMPLEX_POSTED_BILL,
} from "@/config/pages/inbox/mock-inbox";
import type { InboxItem } from "@/types/pages/inbox";
import { mockAutoApprovalBills } from "@/config/pages/inbox/mock-trust";
import { AI_DOCUMENTS } from "@/config/pages/inbox/mock-ai-documents";
import { MOCK_CUSTOMER_PO } from "@/config/pages/inbox/mock-purchase-order";
import { NANDHINI_DOCUMENTS } from "@/config/pages/inbox/mock-nandhini";
import { runComplianceChecks } from "@/hooks/pages/inbox/use-compliance";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import {
  judge,
  recordApproval,
  revokeTrust,
} from "@/hooks/pages/inbox/use-auto-approve";
import type { UserCompany } from "@/types/pages/organisation";
import {
  AR_FIELD_DEFAULTS,
  type ArInvoiceState,
  type ArItemRow,
  type ArLedgerRow,
} from "@/types/pages/inbox/ar-invoice";
export type Route = "AP" | "JV" | "AR";
export type Status =
  | "Received"
  | "Extracting"
  | "Needs Review"
  | "Approved"
  | "Failed"
  | "Duplicate"
  | "Deleted";
export const routes: Route[] = ["AP", "JV", "AR"];
export const routeNames = {
  AP: "Accounts Payable",
  JV: "Journal",
  AR: "Accounts Receivable",
};
/**
 * One organisation the user belongs to, as the prototype keeps it.
 *
 * `id` keys everything else — items, events and every module's mock store —
 * so it never changes. Production's equivalent is `UserCompany`
 * (types/pages/organisation.ts); the top bar is handed that shape.
 */
export type Company = {
  id: string;
  name: string;
  /**
   * The routing address's local part. Fixed at creation: renaming an
   * organisation keeps it, so a forwarding rule set up against the old
   * address keeps delivering.
   */
  slug: string;
  branches: string[];
  /** Primary GSTIN, "" when none is registered yet. */
  gstin: string;
  /** State of the primary registration, "" when unknown. */
  state: string;
  /** The accounting tool connected, or null for none. */
  tool: "tally" | "zoho" | null;
};

/**
 * The organisations the prototype opens with.
 *
 * DEV: GET /api/companies/user?userUuid=… returns these as UserCompany[]
 * (useUserCompaniesStore.fetchCompanies). New ones are added by
 * `createCompany`, so the live list is `state.companies`, not this.
 */
export const SEED_COMPANIES: Company[] = [
  {
    id: "shakun",
    name: "Shakunthalam Oil & Refineries",
    slug: "shakunthalam",
    branches: ["Karnataka HQ", "Maharashtra Branch"],
    gstin: "29AAWCS8421F1ZR",
    state: "Karnataka",
    tool: "tally",
  },
  {
    // A partnership firm machining engineering components in Chakan, Pune —
    // smaller than Shakunthalam, one registration, its own books in every module.
    id: "acme",
    name: "Sahyadri Precision Works",
    slug: "sahyadri-precision",
    branches: ["Pune HQ"],
    gstin: "27AABFS5582A1ZC",
    state: "Maharashtra",
    tool: "tally",
  },
  {
    // A restaurant with two outlets in Bengaluru, selling at the counter and
    // through Zomato, Swiggy and Ownly: the three-way reconciliation client
    // (20 Oct 2026). Its September lives in config/pages/neo/mock-recon.ts.
    id: "nandhini",
    name: "Nandhini Deluxe",
    slug: "nandhini-deluxe",
    branches: ["JP Nagar", "Koramangala"],
    gstin: "29AADCN5532H1ZD",
    state: "Karnataka",
    tool: "tally",
  },
];
export const actor = "Sandeep Balaji";
export type Form = {
  gst: string;
  voucherType: string;
  voucherNo: string;
  /** Supplier Invoice No on a bill; Reference Number on a journal. */
  invoiceNo: string;
  /** Bill Date on a bill; Voucher Date on a journal. */
  date: string;
  /** Due Date on a bill; Reference Date on a journal, where it is optional. */
  due: string;
  party: string;
  costClass: string;
  costCentre: string;
  /**
   * Whether the journal's Cost Centre Class picker is on.
   *
   * Separate from `costClass` holding a value, because the switch is a
   * statement about the voucher and survives the picker being empty — turning
   * it off drops the class without touching allocations already made on lines.
   */
  costClassEnabled: boolean;
  narration: string;
  lines: {
    description: string;
    ledger: string;
    amount: number;
    dr: number;
    cr: number;
    /** The journal's Allocation column — a cost centre name, or "". */
    costCentre: string;
  }[];
  /**
   * A sales invoice's optional fields (Consignee, Order, E-Way Bill…), keyed
   * by the AR sheet's field ids — see config/pages/inbox/additional-fields.
   * Only what was filled; absent on everything else.
   */
  extra?: Record<string, string>;
};
export type Item = {
  /** Entered by Neo in a batch, under this instruction (Neo voucher entry). */
  batch?: { id: string; instruction: string };
  preparedBy?: {
    agent: "Neo";
    runId: string;
    onBehalfOf: string;
    fromId?: string;
  };
  id: string;
  company: string;
  status: Status;
  route: Route;
  aiRoute: Route;
  topChoice: Route;
  confidence: number;
  reason: string;
  source: "email" | "whatsapp" | "upload";
  sender: string;
  subject: string;
  routingAddress: string;
  file: {
    name: string;
    size: string;
    ext: string;
    hash?: string;
    blobId?: string;
  };
  received: string;
  form: Form;
  amount: number;
  original: InboxItem;
  manual?: boolean;
  edited: string[];
  hardRef?: string;
  softRef?: string;
  deletedFrom?: Status;
  doneAt?: string;
  doneBy?: string;
  snapshot?: Form;
  sheet?: Record<string, unknown>;
  /**
   * The sales invoice's own tables — items, ledgers, taxes, field config.
   *
   * `form` stays the projection the queue reads; this is the document behind
   * it. See `deriveLines`, which is what keeps the two in step.
   */
  arSheet?: ArInvoiceState;
  /** The arSheet as it stood at approval, for the read-only record. */
  arSnapshot?: ArInvoiceState;
  /**
   * An approved voucher has already been posted, so an edit to one leaves the
   * copy in Tally behind. The record stays Approved and carries this until it
   * is pushed again.
   */
  resyncNeeded?: boolean;
  /**
   * A voucher that was already on the books before this Inbox existed.
   *
   * It is here so a hard duplicate has something concrete to match against and
   * to open — "View PUR/26-27/0312" is a real record, not a dead link. It is not
   * an inbox document, so it stays out of the queue, the tabs and the sync run.
   */
  priorVoucher?: boolean;
  /**
   * Raised by hand from a register's Create Bill / Create Invoice / New
   * Journal Voucher, not read off a document. There is no file behind it, so
   * it never joins the Inbox queue — it lives in its own register.
   */
  created?: boolean;
  routeDrafts?: Partial<
    Record<Route, { form: Form; sheet?: Record<string, unknown> }>
  >;
  /**
   * Set while a "Post as" change is being prepared. Re-extracting a document
   * into another voucher type takes the backend 20 seconds or more, so the
   * form stays behind a loading state until `until`. A timestamp rather than a
   * flag, so a reload mid-switch still knows when it ends.
   */
  routeSwitch?: { from: Route; to: Route; startedAt: number; until: number };
  /**
   * Approved by the AI on its own, because the bill met a trusted vendor +
   * ledger pattern (Automation › Rules & learning › Auto-approve). `activity`
   * is the log entry Undo reverses; until the voucher reaches Tally, Undo puts
   * the bill back in Needs Review.
   */
  autoApproved?: { evidence: string; at: string; activity?: string };
  /**
   * From a trusted vendor, but it did not meet the evidence (an amount far off
   * the usual), so it was held for a person. The reason says why.
   */
  autoHold?: { reason: string; at: string };
  retries: number;
  error?: string;
  collectionFailure?: boolean;
  firstAttempt: boolean;
  extractionResult?: Pick<
    Item,
    "form" | "amount" | "status" | "hardRef" | "softRef" | "error"
  >;
  extractionDelay?: number;
};
export type Event = {
  id: string;
  event: string;
  at: string;
  actor: string;
  company: string;
  itemId?: string;
  properties: Record<string, unknown>;
};
type State = {
  version: 2;
  company: string;
  /** Every organisation the user can switch to. Grows with `createCompany`. */
  companies: Company[];
  permissions: Route[];
  items: Item[];
  events: Event[];
  tourDone: boolean;
  startedCompanies?: string[];
  /**
   * Companies whose welcome dialog has been seen this run. Closing it by any
   * route counts — the dialog is an introduction, not a gate, and it does not
   * come back on its own once someone has chosen to move past it.
   */
  welcomed?: string[];
  /** Which first-visit story the prototype is telling. See `Scenario`. */
  scenario?: Scenario;
  queue: string[];
  /** Where the review queue was opened from, so Back returns there (set by Neo). */
  queueFrom?: string;
  emailSuffix: Record<string, string>;
  waCompany: string;
  /**
   * When Inbox went live for this user, ISO. The "NEW" tag on the sidebar
   * entry runs for NEW_TAG_DAYS from here and then stops for good (PRD §4.1).
   *
   * It is state rather than a constant because the tag has to be demonstrable:
   * a prototype seeded at first run is always inside the window, so there is no
   * way to show what the entry looks like afterwards without being able to move
   * this. Prototype settings does exactly that.
   */
  launchedAt: string;
};

/** PRD §4.1 — the tag runs for 14 days after launch, then never again. */
export const NEW_TAG_DAYS = 14;

/** Whether the launch tag is still inside its window. */
export const withinNewWindow = (launchedAt: string) =>
  Date.now() - +new Date(launchedAt) < NEW_TAG_DAYS * 86400_000;
const KEY = "aia.inbox.prd.v2";
const date = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[ \/]([A-Za-z]+|\d{1,2})[ \/](\d{4})$/);
  if (match) {
    const month = /^\d+$/.test(match[2])
      ? Number(match[2])
      : [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ].indexOf(match[2].slice(0, 3).toLowerCase()) + 1;
    return `${match[3]}-${String(month).padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return new Date().toISOString().slice(0, 10);
};
export const blankForm = (): Form => ({
  gst: "Karnataka HQ",
  voucherType: "Purchase",
  voucherNo: "",
  invoiceNo: "",
  date: "",
  due: "",
  party: "",
  costClass: "",
  costCentre: "",
  costClassEnabled: false,
  narration: "",
  lines: [],
});
/*
   The AR row helpers sit above `seed` deliberately: `seed` is evaluated at
   module scope, so anything it reaches for has to already exist. Declared
   below it, `blankArSheet` was in its temporal dead zone and the whole
   store threw on import.
*/
let arRowSeq = 0;
export const arRowId = () => `ar-${++arRowSeq}`;
export const blankArItem = (): ArItemRow => ({
  id: arRowId(),
  description: "",
  item: "",
  godown: "",
  costCentre: "",
  tax: "",
  quantity: 0,
  unitRate: 0,
  discount: 0,
  amount: 0,
});
export const blankArLedger = (): ArLedgerRow => ({
  id: arRowId(),
  description: "",
  ledger: "",
  tax: "",
  costCentre: "",
  amount: 0,
});
export const blankArSheet = (): ArInvoiceState => ({
  mode: "item",
  salesLedger: "",
  items: [blankArItem()],
  ledgers: [blankArLedger()],
  taxes: [],
  fields: { ...AR_FIELD_DEFAULTS },
});
/** One mock document read into the Inbox's shape, as seeding does it. */
export const itemFromMock = (x: InboxItem, n: number): Item => {
  const route = (x.route || "AP") as Route;
  const b = x.bill;
  /*
    An AR item is ONE sales invoice we issued (PRD §4.5.4), and it seeds from
    its own extraction exactly the way a bill does.

    It used to seed from `x.ar.rows[0]` — the first row of a sales REGISTER,
    a spreadsheet standing for a thousand separate invoices. That took a
    1,000-row, ₹1.47cr workbook and made an Inbox row reading ₹8,000 against
    whichever customer happened to sit on line one, discarded the other 999,
    and would have posted a single voucher for the lot. Registers are a
    different unit of work; they are not in v2 (PRD §8).
  */
  const inv = x.invoice;
  const lines = b?.items.map((l) => ({
    description: l.desc,
    ledger: l.ledger,
    amount: l.amount,
    dr: l.amount,
    cr: 0,
    costCentre: l.costCentre || "",
  })) ||
    inv?.items.map((l) => ({
      description: l.desc,
      ledger: l.ledger,
      amount: l.amount,
      dr: l.amount,
      cr: 0,
      costCentre: "",
    })) ||
    x.jv?.lines.map((l) => ({
      description: "",
      ledger: l.ledger,
      amount: l.dr || l.cr || 0,
      dr: l.dr || 0,
      cr: l.cr || 0,
      costCentre: "",
    })) || [
      {
        description: "Service invoice",
        ledger: route === "AR" ? "Sales" : "General Expenses",
        amount: x.amount || 0,
        dr: x.amount || 0,
        cr: 0,
        costCentre: "",
      },
    ];
  const net = lines.reduce((s, l) => s + l.amount, 0);
  // A sales invoice carries output GST the same way a bill carries input GST,
  // so both sides read their own tax block. Neither is recomputed here: the
  // figures come off the document, and the totals panel says so.
  const taxBlock = b?.taxes || inv?.taxes;
  const taxes = b?.taxLedgers
    ? b.taxLedgers.reduce((s, l) => s + l.amount, 0)
    : taxBlock
      ? Object.values(taxBlock).reduce((s, v) => s + (v || 0), 0)
      : 0;
  // TDS comes off what is payable; rounding goes on. RCM is our own
  // liability, not the vendor's dues, so it stays out of the amount.
  const tds = (b?.tds || []).reduce((s, l) => s + l.amount, 0);
  const adjustments = (b?.adjustments || []).reduce((s, l) => s + l.amount, 0);
  const f: Form = {
    gst: "Karnataka HQ",
    voucherType:
      route === "JV"
        ? "Journal"
        : route === "AR"
          ? "Sales"
          : x.voucherType || "Purchase",
    voucherNo: b?.voucherNo || inv?.voucherNo || `${route}-${n + 101}`,
    // Whose number this is depends on which way the invoice points: the
    // vendor's on a bill, ours on a sales invoice.
    invoiceNo: b?.supplierInvoiceNo || inv?.invoiceNo || x.id,
    date: date(b?.billDate || inv?.invoiceDate || "2026-09-10"),
    due: date(b?.dueDate || inv?.dueDate || "2026-10-10"),
    // The counterparty, named from the side the document is read from — a
    // vendor billed us, we billed a customer.
    party:
      route === "AR"
        ? inv?.customer || x.customer || "Customer"
        : x.vendor && x.vendor !== "—"
          ? x.vendor
          : x.customer || "General counterparty",
    costClass: b?.costCentreClass || "",
    costCentre: b?.costCentre || inv?.costCentre || "",
    costClassEnabled: !!b?.costCentreClass,
    narration: x.jv?.narration || x.source.subject || "",
    lines,
  };
  // Upload templates start unapproved. The default demo scenario adds a
  // small set of posted examples separately, in seedFor().
  const status: Status =
    x.status === "deleted"
      ? "Deleted"
      : x.status === "failed"
        ? "Failed"
        : ["extracting", "retrying"].includes(x.status)
          ? "Extracting"
          : x.status.startsWith("duplicate")
            ? "Duplicate"
            : "Needs Review";
  return {
    id: x.id,
    company: "shakun",
    status,
    route,
    aiRoute: route,
    topChoice: route,
    confidence: x.ai.confidence || 0.85,
    reason:
      route === "AR"
        ? "Your company is the seller on this invoice."
        : route === "JV"
          ? "This counterparty has previously been booked through Journal."
          : "Your company is the buyer on this vendor invoice.",
    source: x.source.channel === "drive" ? "upload" : x.source.channel,
    sender:
      x.source.channel === "upload" || x.source.channel === "drive"
        ? actor
        : x.source.sender,
    subject: x.source.subject,
    routingAddress: "shakunthalam@inbox.aiaccountant.app",
    file: { ...x.file },
    received: x.receivedAt,
    form: f,
    amount:
      route === "JV"
        ? lines.reduce((s, l) => s + l.dr, 0)
        : Math.round((net + taxes - tds + adjustments) * 100) / 100,
    original: x,
    edited: [],
    hardRef: x.status === "duplicate-hard" ? "POSTED-2041" : undefined,
    softRef:
      x.status === "duplicate-soft" || x.status === "duplicate-cross-type"
        ? "POSTED-FILE-100"
        : undefined,
    retries: 0,
    firstAttempt: true,
    // A sales invoice opens on its own tables, seeded from what extraction
    // read off the document — each item line becomes a row in Item Details,
    // and the tax block becomes the Taxes table.
    ...(route === "AR"
      ? {
          arSheet: {
            ...blankArSheet(),
            salesLedger: inv?.items[0]?.ledger || "Sales",
            items: (inv?.items || []).map((l) => ({
              ...blankArItem(),
              description: l.desc,
              quantity: 1,
              unitRate: l.amount,
              amount: l.amount,
            })),
            ledgers: [blankArLedger()],
            taxes: Object.entries(inv?.taxes || {})
              .filter(([, v]) => !!v)
              .map(([key, value]) => ({
                id: arRowId(),
                ledger: `Output ${key.toUpperCase()}`,
                costCentre: "",
                amount: value as number,
              })),
          },
        }
      : {}),
    // Approval snapshots are added by the demo scenario or by approving.
  };
};
function seed(): State {
  const fromMock = itemFromMock;
  const items: Item[] = MOCK_INBOX_ITEMS.filter(
    (x) => x.route !== "Banking" && !x.lineage
  ).map(fromMock);
  // A posted record gives the hard duplicate a concrete, same-company match.
  const hard = items.find((x) => x.hardRef);
  if (hard)
    items.push({
      ...structuredClone(hard),
      id: "POSTED-2041",
      status: "Approved",
      // DEV: payment and attachments come with the bill from GET /bills.
      original: {
        ...structuredClone(hard.original),
        paymentStatus: "paid",
        attachmentCount: 3,
      },
      priorVoucher: true,
      hardRef: undefined,
      snapshot: structuredClone(hard.form),
      doneAt: new Date().toISOString(),
      doneBy: actor,
    });
  // A dense posted bill, listed with the Approved records, for checking the
  // approved page at full complexity. It is on the books, so neither demo
  // scenario treats it as an arrival.
  // DEV: prototype-only fixture; delete on transplant.
  const dense = fromMock(COMPLEX_POSTED_BILL, items.length);
  items.push({
    ...dense,
    status: "Approved",
    snapshot: structuredClone(dense.form),
    doneAt: new Date().toISOString(),
    doneBy: actor,
  });
  // Sahyadri's first document is its own supplier's bill, read the same way.
  const acme = fromMock(SAHYADRI_FIRST_BILL, items.length);
  acme.company = "acme";
  acme.routingAddress = "sahyadri-precision@inbox.aiaccountant.app";
  acme.form = { ...acme.form, gst: "Pune HQ" };
  items.push(acme);
  NANDHINI_DOCUMENTS.forEach(({ item: mock, approved }, n) => {
    const item = fromMock(mock, 1600 + n);
    item.company = "nandhini";
    item.routingAddress = "nandhini-deluxe@inbox.aiaccountant.app";
    item.form.gst = "JP Nagar";
    if (item.route === "JV") {
      item.form.date = "2026-10-20";
      item.form.voucherNo = `ND/JV/26-27/${mock.id.split("-").at(-1)}`;
      item.form.costCentre = "JP Nagar";
    }
    if (approved) {
      item.status = "Approved";
      item.snapshot = structuredClone(item.form);
      item.arSnapshot = item.arSheet ? structuredClone(item.arSheet) : undefined;
      item.doneAt = "2026-10-21T09:30:00Z";
      item.doneBy = actor;
    }
    items.push(item);
  });
  return {
    version: 2,
    // Nandhini Deluxe opens by default (21 Oct 2026): it is the client
    // with settlement data, so Neo's reconciliation works from the start.
    company: "nandhini",
    companies: structuredClone(SEED_COMPANIES),
    permissions: [...routes],
    items,
    events: [],
    tourDone: false,
    queue: [],
    startedCompanies: ["nandhini"],
    emailSuffix: {},
    waCompany: "shakun",
    // First run is day zero, so a fresh prototype opens inside the window with
    // the tag showing — which is the state the launch guide describes.
    launchedAt: new Date().toISOString(),
  };
}
/**
 * The two ways someone meets the Inbox for the first time.
 *
 * - `new` — nothing has been sent in yet. The welcome dialog opens over an
 *   empty queue and the first upload brings the demo batch in with it.
 * - `whatsapp` — the user registered with the WhatsApp bot before Inbox
 *   launched, so documents were already arriving before they ever opened it.
 *   The welcome dialog opens over a queue that is already full, and says so.
 *
 * The choice is kept in sessionStorage, not in the reset-on-load state: it is
 * how the demo is set up rather than what happened in it, like the table's
 * column layout, so refreshing replays the chosen story instead of switching
 * it back.
 *
 * DEV: prototype-only. Production reads the queue it has; delete on transplant.
 */
export type Scenario = "new" | "whatsapp";
const SCENARIO_KEY = "aia.inbox.scenario";
export const DEFAULT_SCENARIO: Scenario = "whatsapp";
function readScenario(): Scenario {
  try {
    const stored = sessionStorage.getItem(SCENARIO_KEY);
    if (stored === "new" || stored === "whatsapp") return stored;
  } catch {}
  return DEFAULT_SCENARIO;
}

/** How many documents the WhatsApp story has waiting on first visit. */
const WHATSAPP_BACKLOG = 18;
/**
 * The number the user registered with the WhatsApp bot. The welcome dialog
 * shows it on the WhatsApp card, so they can see which phone is connected.
 */
export const REGISTERED_WHATSAPP = "+91 98450 12342";
/**
 * AI Accountant's own WhatsApp number — where the registered phone sends its
 * bills. Placeholder until the real number is confirmed.
 */
export const AIA_WHATSAPP = "+91 80000 00000";
/**
 * Whoever sent them. The registered number sends most of them; the rest are
 * teammates on the same account, reused.
 */
const WHATSAPP_SENDERS = [
  `${REGISTERED_WHATSAPP} (Priya R.)`,
  "+91 99001 XXX17 (Ramesh K.)",
  "+91 97411 XXX08 (Divya S.)",
  "+91 90080 XXX63 (Arjun M.)",
];

/**
 * Turn one company's seeded queue into documents that came in on WhatsApp in
 * the days before the user first opened the Inbox.
 *
 * Only the queue is rewritten. Posted records (Approved, and the prior voucher
 * the hard duplicate matches) are the books, not arrivals, and stay as seeded.
 * Documents still being read are kept first so the story always has a few
 * finishing while the welcome dialog is up; the rest are the ones ready to
 * review. Anything else in the seeded queue is dropped — a backlog of failures
 * is not what a WhatsApp user who has never opened the Inbox would find.
 */
function withWhatsAppBacklog(base: State, company: string): State {
  const queue = base.items.filter(
    (item) => item.company === company && !item.priorVoucher && seedable(item)
  );
  const rank = (item: Item) =>
    ["Received", "Extracting"].includes(item.status)
      ? 0
      : item.status === "Duplicate"
        ? 1
        : item.status === "Needs Review"
          ? 2
          : 3;
  const picked = queue
    .filter((item) => rank(item) < 3)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, WHATSAPP_BACKLOG);
  const keep = new Set(picked.map((item) => item.id));
  const now = Date.now();
  const arrivals = picked.map((item, index): Item => ({
    ...item,
    source: "whatsapp",
    sender: WHATSAPP_SENDERS[index % WHATSAPP_SENDERS.length],
    subject: "—",
    // Newest first, spread over the last three days. The ones still being
    // read are the newest: they arrived minutes ago.
    received: new Date(
      now - (index < 4 ? (index + 1) * 4 * 60_000 : index * 3.8 * 3_600_000)
    ).toISOString(),
    // Slow enough that the welcome dialog opens while they are still being
    // read, and counts them down as they finish.
    ...(["Received", "Extracting"].includes(item.status)
      ? { extractionDelay: 9000 + index * 3500 }
      : {}),
  }));
  const replaced = new Map(arrivals.map((item) => [item.id, item]));
  return {
    ...base,
    startedCompanies: [...new Set([...(base.startedCompanies || []), company])],
    items: base.items
      .filter(
        (item) =>
          item.company !== company ||
          item.priorVoucher ||
          !seedable(item) ||
          keep.has(item.id)
      )
      .map((item) => replaced.get(item.id) || item),
  };
}

/**
 * Shakunthalam's overnight bills from trusted vendors (13 Oct 2026, Automation
 * › Auto-approve): three met their pattern's evidence and were approved by
 * the AI on its own; one, a ₹47,200 Airtel equipment charge against a usual
 * ₹4,720, was held for a person. Added after the WhatsApp backlog so they keep
 * their own channel (Airtel and Zoho email their bills).
 *
 * Only in the WhatsApp story: a brand-new Inbox has received nothing, so
 * nothing could have been approved on its own.
 */
function withAutoApprovals(base: State): State {
  const now = Date.now();
  const extra = mockAutoApprovalBills().map(
    ({ bill, outcome, minutesAgo }, n): Item => {
      const item = itemFromMock(bill, 900 + n);
      const at = new Date(now - minutesAgo * 60_000).toISOString();
      const verdict = judge(
        "shakun",
        item.form.party,
        item.form.lines.map((l) => l.ledger),
        item.amount
      );
      if (outcome === "approved" && verdict?.ok)
        return {
          ...item,
          status: "Approved",
          snapshot: structuredClone(item.form),
          doneAt: at,
          doneBy: "Neo · Auto-approve",
          autoApproved: { evidence: verdict.evidence, at },
        };
      return {
        ...item,
        autoHold:
          verdict && !verdict.ok ? { reason: verdict.reason, at } : undefined,
      };
    }
  );
  return { ...base, items: [...extra, ...base.items] };
}

/** A fresh prototype state, told as the given first-visit story. */
function seedFor(scenario: Scenario): State {
  const base = { ...seed(), scenario };
  if (scenario === "whatsapp") {
    // Keep representative posted records ready to inspect on every refresh:
    // an electricity bill, a supplier bill, a sales invoice and a journal.
    const approvedExamples = new Set([
      "INB-2048",
      "INB-2052",
      "INB-2031",
      "INB-2046",
    ]);
    const doneAt = new Date().toISOString();
    base.items = base.items.map((item): Item =>
      approvedExamples.has(item.id)
        ? {
            ...item,
            status: "Approved",
            snapshot: structuredClone(item.form),
            arSnapshot: item.arSheet
              ? structuredClone(item.arSheet)
              : undefined,
            doneBy: actor,
            doneAt,
          }
        : item
    );
    return withAiDocuments(
      withAutoApprovals(withWhatsAppBacklog(base, base.waCompany))
    );
  }
  // A new user has received nothing: the queue starts empty everywhere, and
  // only the books (posted vouchers) are there. The seeded queue lives on as
  // the templates `demoUploadDocuments` cuts batches from.
  return {
    ...base,
    items: base.items.filter((item) => item.company === "nandhini" || item.priorVoucher || !seedable(item)),
  };
}

function withAiDocuments(base: State): State {
  // DEV: GET /api/inbox returns these records with company scope and approval state.
  const items = AI_DOCUMENTS.map(({ company, item: mock, approved }, n) => {
    const item = itemFromMock(mock, 1100 + n);
    item.company = company;
    item.form.gst = company === "acme" ? "Pune HQ" : "Karnataka HQ";
    if (approved) {
      item.status = "Approved";
      item.snapshot = structuredClone(item.form);
      item.arSnapshot = item.arSheet
        ? structuredClone(item.arSheet)
        : undefined;
      item.doneBy = "Priya Raghavan";
    }
    return item;
  });
  const po = itemFromMock(MOCK_CUSTOMER_PO, 1500);
  po.reason = "Customer purchase order — raised as a draft sales invoice";
  po.form.narration =
    "Customer PO RRL/KA/2610/1042 · Sales — Local (GST) from coding history";
  po.preparedBy = { agent: "Neo", runId: "po-intake", onBehalfOf: actor };
  return {
    ...base,
    startedCompanies: [
      ...new Set([...(base.startedCompanies || []), "shakun", "acme"]),
    ],
    items: [po, ...items, ...base.items],
  };
}
let state: State = seed();
const server = state;
let loaded = false;
const listeners = new Set<() => void>();
function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      window.dispatchEvent(new CustomEvent("inbox-storage-error"));
    }
  }
  listeners.forEach((f) => f());
}
/**
 * The Inbox's `form.lines`, derived from the invoice's own tables.
 *
 * The queue's Amount column, `issue`'s ledger check and the store's own
 * recalculation all read `form.lines`, and the sales invoice has three tables
 * rather than one. Items and ledgers are both charges the customer is billed
 * for, so both become lines; taxes are not — they are what the charges attract,
 * and the totals panel adds them on top rather than listing them as though the
 * customer bought them.
 *
 * Empty rows are dropped. A blank row is the row the table always keeps, not a
 * line worth carrying into the projection.
 */
export function deriveLines(sheet: ArInvoiceState): Form["lines"] {
  const fromItems = sheet.items
    .filter((r) => r.amount || r.description || r.item)
    .map((r) => ({
      description: r.description || r.item,
      ledger: sheet.salesLedger,
      amount: r.amount,
      dr: r.amount,
      cr: 0,
      costCentre: r.costCentre,
    }));
  const fromLedgers = sheet.ledgers
    .filter((r) => r.amount || r.description || r.ledger)
    .map((r) => ({
      description: r.description,
      ledger: r.ledger,
      amount: r.amount,
      dr: r.amount,
      cr: 0,
      costCentre: r.costCentre,
    }));
  return [...fromItems, ...fromLedgers];
}
/** What the invoice's three tables come to. The panel renders these. */
export function arTotals(sheet: ArInvoiceState) {
  const subTotal = r2(
    [...sheet.items, ...sheet.ledgers].reduce((s, r) => s + r.amount, 0)
  );
  const discount = r2(
    sheet.items.reduce(
      (s, r) => s + (r.quantity * r.unitRate * r.discount) / 100,
      0
    )
  );
  const tax = r2(sheet.taxes.reduce((s, r) => s + r.amount, 0));
  return { subTotal, discount, tax, grandTotal: r2(subTotal + tax) };
}
/**
 * Every page load resets the prototype to its selected demo scenario.
 * The default includes an incoming backlog and approved examples; the new
 * user scenario starts with an empty inbox.
 *
 * The stored session is cleared rather than ignored, so a refresh genuinely
 * leaves nothing behind. `persist` still writes, and is still what surfaces a
 * full-quota browser through `inbox-storage-error` — it is the reading side
 * that is deliberately gone. Nothing here migrates a stored shape forward any
 * more either: `seed()` is always the current shape, so there is no older one
 * left to bring up to date.
 *
 * The table's own layout — which columns are shown, their order, pinning,
 * widths, filters — is in sessionStorage, not here, and is untouched: it is
 * how the grid is set up rather than what is in it, and resetting the demo
 * should not also undo the columns someone arranged to present.
 */
export function init() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("inbox.date-normalization.v2");
  } catch {}
  state = seedFor(readScenario());
  logSeededActivity();
  listeners.forEach((f) => f());
  state.items
    .filter((x) => ["Received", "Extracting"].includes(x.status))
    .forEach((x) => scheduleExtraction(x.id));
}
export function useStore() {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => state,
    () => server
  );
}
export const getState = () => state;
export const subscribeStore = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * The top bar's view of an organisation — production's `UserCompany`, which
 * GET /api/companies/user returns. The prototype has one user, so the
 * membership ids are derived rather than stored.
 */
export const toUserCompany = (company: Company): UserCompany => ({
  ucUuid: `uc-${company.id}`,
  companyUuid: company.id,
  companyName: company.name,
  companyId: company.id,
  organisationId: "org-aiaccountant",
  isActive: true,
  thirdPartyTool: company.tool ?? undefined,
});

/** The organisation with this id, from the live list. */
export const companyOf = (id: string) =>
  state.companies.find((company) => company.id === id);

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "organisation";

/**
 * A new organisation: no registration, no branches, no tool connected — every
 * module opens on its empty state for it.
 *
 * DEV: POST /api/companies { companyName, userUuid, createdBy } →
 * { companyUuid, ucUuid }. Production then refetches the company list.
 */
export function createCompany(name: string): Company {
  const base = slugify(name);
  const taken = new Set(state.companies.map((c) => c.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const company: Company = {
    id: `org-${crypto.randomUUID().slice(0, 8)}`,
    name,
    slug,
    branches: [],
    gstin: "",
    state: "",
    tool: null,
  };
  state = { ...state, companies: [...state.companies, company] };
  persist();
  return company;
}

/**
 * Rename an organisation. Only the name moves: the id keys its data and the
 * slug its routing address, and neither should change under the user.
 *
 * DEV: PUT /api/companies { companyUuid, companyName, userUuid, updatedBy }.
 */
export function renameCompany(id: string, name: string) {
  state = {
    ...state,
    companies: state.companies.map((c) => (c.id === id ? { ...c, name } : c)),
  };
  persist();
}
export function event(
  name: string,
  item?: Item,
  properties: Record<string, unknown> = {}
) {
  const e: Event = {
    id: crypto.randomUUID(),
    event: name,
    at: new Date().toISOString(),
    actor,
    company: item?.company || state.company,
    itemId: item?.id,
    properties,
  };
  state = { ...state, events: [...state.events, e] };
  persist();
}
export function configure(p: Partial<Omit<State, "items" | "events">>) {
  state = { ...state, ...p };
  persist();
}
export function update(
  id: string,
  patch: Partial<Item>,
  name = "Inbox Item Edited",
  internal = false,
  /**
   * An approved voucher is posted, so it is closed to ordinary edits — the
   * guard below is what keeps a stray patch from rewriting a record that is
   * already in Tally. Reopening one for editing is deliberate, and says so.
   */
  allowPosted = false
) {
  const old = state.items.find((x) => x.id === id);
  if (
    !old ||
    (old.status === "Approved" && !allowPosted) ||
    (old.company !== state.company && !internal)
  )
    return;
  const next = { ...old, ...patch };
  if (patch.form && !patch.amount)
    next.amount =
      next.route === "JV"
        ? next.form.lines.reduce((sum, l) => sum + l.dr, 0)
        : next.form.lines.reduce((sum, l) => sum + l.amount, 0);
  if (["Needs Review", "Duplicate"].includes(next.status)) {
    const match = hardMatch(next);
    next.hardRef = match?.id;
    next.status = match || next.softRef ? "Duplicate" : "Needs Review";
  }
  state = { ...state, items: state.items.map((x) => (x.id === id ? next : x)) };
  event(name, next, {
    item_id: id,
    source: next.source,
    ai_route: next.aiRoute,
    ai_route_confidence: next.confidence,
    retry_count: next.retries,
    previous_error_code: old.error,
    extraction_engine: "local-demo",
    error_code: next.error ? "DEMO_PARSE_FAILED" : undefined,
    error_message: next.error,
    item_age_sec: Math.round((Date.now() - +new Date(next.received)) / 1000),
    deletion_reason: name === "Inbox Item Deleted" ? "User deleted" : undefined,
    failed_fields: next.manual ? Object.keys(next.form) : undefined,
    prior: old.status,
    new: next.status,
    changed: Object.keys(patch),
    prior_values: patch.form ? old.form : undefined,
    new_values: patch.form ? next.form : undefined,
  });
  persist();
}
/**
 * Write the invoice's tables, and re-project them onto `form.lines`.
 *
 * The single place the two representations meet. Every edit on the sales
 * invoice goes through here, so the queue's Amount column and `issue`'s checks
 * cannot fall out of step with the tables the accountant is actually looking
 * at — which is the failure the AP sheet's `snapshot` message exists to avoid
 * on its own side.
 */
export function setArSheet(id: string, sheet: ArInvoiceState, field?: string) {
  const x = state.items.find((x) => x.id === id);
  if (!x) return;
  const lines = deriveLines(sheet);
  update(id, {
    arSheet: sheet,
    form: { ...x.form, lines },
    amount: arTotals(sheet).grandTotal,
    edited: field ? [...new Set([...x.edited, field])] : x.edited,
    firstAttempt: field ? false : x.firstAttempt,
  });
}
export function hardMatch(item: Item) {
  return state.items.find(
    (x) =>
      x.company === item.company &&
      x.id !== item.id &&
      x.status === "Approved" &&
      /*
        Same route, or this is not a duplicate.

        The PRD's rule is "vendor + supplier invoice number" (§4.7), and that
        is an AP fact: the number belongs to the vendor who issued it. The
        receivable side has a mirror of it — customer plus the invoice number we
        issued — but the two live in different namespaces. A vendor's INV-2200
        and our own INV-2200 are not the same document, and without this a
        sales invoice could hard-block on a purchase bill and refuse to post
        until the accountant changed a number that was never wrong.
      */
      x.route === item.route &&
      x.form.party.trim().toLowerCase() ===
        item.form.party.trim().toLowerCase() &&
      x.form.invoiceNo.trim() === item.form.invoiceNo.trim() &&
      !!item.form.invoiceNo.trim()
  );
}
/**
 * A journal's totals, at the precision its rows are entered at.
 *
 * Two decimals, because a raw float compare calls 0.1 + 0.2 unbalanced and the
 * screen exists to drive one figure to zero. Same rule as the Journals
 * prototype this form is a port of.
 */
const r2 = (n: number) => Math.round(n * 100) / 100;
export function journalTotals(form: Form) {
  const totalDebit = r2(form.lines.reduce((sum, l) => sum + l.dr, 0));
  const totalCredit = r2(form.lines.reduce((sum, l) => sum + l.cr, 0));
  const difference = r2(Math.abs(totalDebit - totalCredit));
  return {
    totalDebit,
    totalCredit,
    difference,
    isBalanced: difference < 0.005,
  };
}
/**
 * Lines a journal cannot post with. Two kinds, both drawn by the frames:
 *
 *  - a line that names a ledger but carries no amount — incomplete, and BOTH
 *    amount cells are marked because entering either one resolves it;
 *  - a line carrying an amount but no ledger, which is the same fault seen
 *    from the other side. The Journals screen does not guard this one, but a
 *    figure with nowhere to post is not something to hand to Tally.
 *
 * A line that is blank on both counts is neither — it is the empty row the
 * table always keeps, and an untouched voucher is not a broken one.
 */
export type JournalLineError = { index: number; kind: "amount" | "ledger" };
export function journalLineErrors(form: Form): JournalLineError[] {
  return form.lines.flatMap((line, index): JournalLineError[] => {
    const hasAmount = !!(line.dr || line.cr);
    if (line.ledger && !hasAmount) return [{ index, kind: "amount" }];
    if (hasAmount && !line.ledger) return [{ index, kind: "ledger" }];
    return [];
  });
}
/**
 * The required fields a document is missing, by the names the review form
 * gives them. `issue` answers "can this be approved"; this answers "what is
 * stopping it", for places that cannot point at a red field, like the toast a
 * bulk approve leaves behind. Mirrors `issue`'s required set per route.
 */
export function missingFields(item: Item): string[] {
  const f = item.form;
  const party = item.route === "AR" ? "Customer" : "Vendor";
  const required: [string, string | undefined][] =
    item.route === "JV"
      ? [
          ["GST registration", f.gst],
          ["Voucher type", f.voucherType],
          ["Voucher number", f.voucherNo],
          ["Date", f.date],
        ]
      : item.route === "AR"
        ? [
            ["GST registration", f.gst],
            ["Voucher type", f.voucherType],
            ["Voucher number", f.voucherNo],
            ["Invoice number", f.invoiceNo],
            ["Invoice date", f.date],
            [party, f.party],
          ]
        : [
            [party, f.party],
            ["Invoice number", f.invoiceNo],
            ["Invoice date", f.date],
            ["Due date", f.due],
            ["GST registration", f.gst],
            ["Voucher number", f.voucherNo],
          ];
  const missing = required
    .filter(([, value]) => !String(value || "").trim())
    .map(([name]) => name);
  if (item.form.lines.some((line) => !line.ledger)) missing.push("Ledger");
  if (item.route !== "JV" && !item.form.lines.length)
    missing.push("Line items");
  return missing;
}

export function issue(item: Item) {
  if (!state.permissions.includes(item.route))
    return "You don’t have posting access to this module. Ask an admin.";
  if (!["Needs Review", "Duplicate"].includes(item.status))
    return "This document isn’t waiting for review.";
  if (hardMatch(item))
    return "Same vendor and invoice number as a voucher already posted.";
  /*
    A journal is required to answer less than a bill, because it has less to
    answer. It posts against ledgers rather than a party, so there is no vendor
    to name; and Reference Number and Reference Date are the entry's optional
    external handle, not its identity — which is what the frames mark with an
    asterisk and what the bill's own required set has no equivalent of.
  */
  if (item.route === "JV") {
    if (
      ![
        item.form.gst,
        item.form.voucherType,
        item.form.voucherNo,
        item.form.date,
      ].every((value) => value.trim())
    )
      return "Fill the fields marked in red.";
    if (!item.form.lines.some((l) => l.dr || l.cr))
      return "Add at least one line with an amount.";
    if (journalLineErrors(item.form).length)
      return "One line is missing its ledger or amount.";
    if (!journalTotals(item.form).isBalanced)
      return "Debit and credit totals don’t match.";
    return "";
  }
  /*
    A sales invoice asks for its own number, not a supplier's, and it has no
    due date it must answer for: the receivable exists the moment it is issued,
    and the payment terms are a fact about the customer rather than something
    the entry cannot post without (PRD §4.5.4).
  */
  if (item.route === "AR") {
    if (
      !item.form.gst ||
      !item.form.voucherType ||
      !item.form.voucherNo ||
      !item.form.invoiceNo ||
      !item.form.date ||
      !item.form.party
    )
      return "Fill the fields marked in red.";
    if (!item.form.lines.length) return "Add at least one item or ledger line.";
    if (item.form.lines.some((l) => !l.ledger))
      return "Every line needs an income ledger.";
    return "";
  }
  if (
    !item.form.party ||
    !item.form.invoiceNo ||
    !item.form.date ||
    !item.form.due ||
    !item.form.gst ||
    !item.form.voucherNo
  )
    return "Fill the fields marked in red.";
  if (!item.form.lines.length || item.form.lines.some((l) => !l.ledger))
    return "Every line needs a ledger.";
  return "";
}
export function approve(id: string) {
  const item = state.items.find((x) => x.id === id);
  if (!item || item.company !== state.company)
    return "This document isn’t in this company’s Inbox.";
  const error = issue(item);
  if (error) return error;
  const next = {
    ...item,
    status: "Approved" as Status,
    snapshot: structuredClone(item.form),
    // The invoice's tables are snapshotted alongside the form, or the approved
    // record would render today's draft rather than what was posted.
    arSnapshot: item.arSheet ? structuredClone(item.arSheet) : undefined,
    doneAt: new Date().toISOString(),
    doneBy: actor,
  };
  state = { ...state, items: state.items.map((x) => (x.id === id ? next : x)) };
  event("Inbox Item Approved", next, {
    final_route: item.route,
    ai_route: item.aiRoute,
    was_ai_route_accepted: item.route === item.aiRoute,
    voucher_type: item.form.voucherType,
    time_in_inbox_sec: Math.round(
      (Date.now() - +new Date(item.received)) / 1000
    ),
    first_attempt: item.firstAttempt,
    prior: item.status,
    new: "Approved",
  });
  event(
    item.route === "AP"
      ? "AP Bill Created"
      : item.route === "JV"
        ? "Journal Voucher Created"
        : "AR Invoice Created",
    next,
    {
      inbox_item_id: id,
      source: item.source,
      ai_route_taken: item.route,
      ai_route_confidence: item.confidence,
      was_ai_route_accepted: item.route === item.aiRoute,
      time_in_inbox_sec: Math.round(
        (Date.now() - +new Date(item.received)) / 1000
      ),
      attachment: item.file.blobId || item.file.name,
    }
  );
  recordPersonApproval(next);
  runComplianceChecks(next.company, next.id);
  persist();
  return "";
}
export function remove(id: string) {
  const x = state.items.find((x) => x.id === id);
  if (x && x.status !== "Approved" && x.status !== "Deleted") {
    update(
      id,
      { deletedFrom: x.status, status: "Deleted" },
      "Inbox Item Deleted"
    );
  }
}
/*
  There is no restore. Deleting takes a document out of the Inbox and that is
  the end of it — the status is kept so the audit log can still account for
  what happened to the file, not so the queue can hand it back.
*/
export function setRoute(id: string, route: Route) {
  const x = state.items.find((x) => x.id === id);
  if (!x || x.route === route || !state.permissions.includes(route)) return;
  const routeDrafts = {
    ...x.routeDrafts,
    [x.route]: { form: structuredClone(x.form), sheet: x.sheet },
  };
  let form = structuredClone(routeDrafts[route]?.form || x.form);
  if (!routeDrafts[route])
    form.voucherType =
      route === "JV" ? "Journal" : route === "AR" ? "Sales" : "Purchase";
  if (!routeDrafts[route] && route === "JV" && x.route !== "JV") {
    form.lines = [
      {
        description: "Expense",
        ledger: "General Expenses",
        amount: x.amount,
        dr: x.amount,
        cr: 0,
        costCentre: "",
      },
      {
        // The party is not a field on a journal, so what it contributed to the
        // bill becomes the credit side's ledger and nothing else.
        description: form.party || "Counterparty",
        ledger: "Accounts Payable",
        amount: x.amount,
        dr: 0,
        cr: x.amount,
        costCentre: "",
      },
    ];
  } else if (!routeDrafts[route] && x.route === "JV" && route !== "JV")
    form.lines = form.lines
      .filter((l) => l.dr > 0)
      .map((l) => ({ ...l, amount: l.dr }));
  /*
    AP ⇄ AR is the party flip, and it moves every line to the other side of the
    chart of accounts: a vendor becomes a customer, input GST becomes output
    GST, and an expense becomes income. Carrying the ledgers across would leave
    "Cloud Services" sitting on a sales invoice — a plausible-looking line that
    posts revenue to an expense head.

    So the ledgers come off, and `issue` blocks the approval until the
    accountant picks from the right side. Clearing is the honest move here;
    guessing an income ledger for an expense one would be a silent mistake
    rather than a visible gap.
  */
  if (
    !routeDrafts[route] &&
    ((x.route === "AP" && route === "AR") ||
      (x.route === "AR" && route === "AP"))
  ) {
    form.lines = form.lines.map((l) => ({ ...l, ledger: "" }));
    /*
      The voucher number goes with them, for the same reason. It belongs to a
      series — PUR/26-27/0312 is a purchase number — and carrying it onto a sales
      voucher numbers the invoice out of a book it was never in. Blanking a
      required field is the visible version of that problem; leaving it filled
      with the wrong series is the invisible one.
    */
    form.voucherNo = "";
  }
  update(
    id,
    {
      route,
      form,
      sheet: routeDrafts[route]?.sheet,
      routeDrafts,
      edited: [...new Set([...x.edited, "route"])],
    },
    "Inbox Route Selection"
  );
  event("Inbox AI Route Overridden", x, {
    original_ai_route: x.aiRoute,
    new_route: route,
    ai_route_confidence: x.confidence,
  });
  logActivity({
    company: x.company,
    actor: { kind: "person", name: actor },
    kind: "override",
    module: "Inbox",
    action: "Changed the book",
    subject: subjectOf(x),
    ref: { kind: "document", id },
    change: { from: MODULE_OF[x.route], to: MODULE_OF[route] },
    reason:
      route !== x.aiRoute
        ? `The AI had sent it to ${MODULE_OF[x.aiRoute]}`
        : undefined,
  });
  persist();
}
/** How long a "Post as" change takes to prepare. The backend needs 20s+. */
export const ROUTE_SWITCH_MS = 20000;
/**
 * The accountant's own route change, from the Post as selector. Same move as
 * `setRoute`, plus the wait the backend imposes while it re-reads the
 * document into the new voucher type. Permission redirects and group moves
 * call `setRoute` directly and stay instant.
 */
export function switchRoute(id: string, route: Route) {
  const from = state.items.find((x) => x.id === id)?.route;
  setRoute(id, route);
  if (!from || state.items.find((x) => x.id === id)?.route === from) return;
  const startedAt = Date.now();
  update(
    id,
    {
      routeSwitch: {
        from,
        to: route,
        startedAt,
        until: startedAt + ROUTE_SWITCH_MS,
      },
    },
    "Inbox Route Switch Started"
  );
  setTimeout(() => finishRouteSwitch(id), ROUTE_SWITCH_MS);
}
/** Clears a finished switch. Safe to call early or twice; it checks the time. */
export function finishRouteSwitch(id: string) {
  const x = state.items.find((x) => x.id === id);
  if (!x?.routeSwitch || x.routeSwitch.until > Date.now()) return;
  update(id, { routeSwitch: undefined }, "Inbox Route Switch Finished", true);
}
export function setPermissions(permissions: Route[]) {
  configure({ permissions });
  for (const x of state.items.filter(
    (x) =>
      x.company === state.company &&
      x.status !== "Approved" &&
      x.status !== "Deleted"
  ))
    if (!permissions.includes(x.route) && permissions.length) {
      const route = permissions[0];
      setRoute(x.id, route);
      update(x.id, {
        aiRoute: route,
        reason: `${routeNames[route]} selected because your role doesn't include ${routeNames[x.topChoice]} access.`,
      });
      event("Inbox Permission Redirect", x, {
        ai_route_top_choice: x.topChoice,
        ai_route: route,
        ai_route_permission_redirect: true,
      });
    }
  persist();
}
export function manual(id: string) {
  const x = state.items.find((x) => x.id === id);
  if (!x) return;
  update(
    id,
    {
      manual: true,
      status: "Needs Review",
      sheet: undefined,
      form: {
        ...blankForm(),
        gst: "",
        voucherType:
          x.route === "JV"
            ? "Journal"
            : x.route === "AR"
              ? "Sales"
              : "Purchase",
      },
      edited: [],
      firstAttempt: false,
    },
    "Inbox Manual Fill Triggered"
  );
}
const timers = new Set<string>();
/**
 * When each running extraction started and how long it is expected to take,
 * for the loader's progress. Kept beside the timers rather than on the item:
 * it is the timers' own schedule, and it resets with them on load.
 */
const extractionTimes = new Map<
  string,
  { startedAt: number; duration: number }
>();
export const extractionTiming = (id: string) => extractionTimes.get(id);
export function scheduleExtraction(id: string) {
  if (timers.has(id)) return;
  timers.add(id);
  extractionTimes.set(id, {
    startedAt: Date.now(),
    duration:
      600 + (state.items.find((x) => x.id === id)?.extractionDelay || 1200),
  });
  setTimeout(() => {
    const x = state.items.find((x) => x.id === id);
    if (!x || !["Received", "Extracting"].includes(x.status)) {
      timers.delete(id);
      return;
    }
    update(id, { status: "Extracting" }, "Inbox Extraction Started", true);
    setTimeout(() => {
      const y = state.items.find((x) => x.id === id);
      timers.delete(id);
      if (!y || y.status !== "Extracting") return;
      if (y.extractionResult) {
        const completed = {
          ...y,
          ...y.extractionResult,
          extractionResult: undefined,
          extractionDelay: undefined,
        };
        /*
          A document only becomes a duplicate once its fields are known, so the
          match is looked for here rather than carried in the staged result —
          which is a copy of how this document was classified the last time it
          was seeded, not a reading of the books as they stand now.

          Without this, a bill matching a posted voucher finished extraction as
          "Needs Review" and sat in that queue wearing an approval-blocked
          banner: a queue of work you cannot do. Duplicates are exceptions.
        */
        const match =
          completed.status === "Needs Review"
            ? hardMatch(completed)
            : undefined;
        if (match) {
          completed.status = "Duplicate";
          completed.hardRef = match.id;
        }
        state = {
          ...state,
          items: state.items.map((item) => (item.id === id ? completed : item)),
        };
        event("Inbox Extraction Completed", completed);
        tryAutoApprove(id);
        return;
      }
      if (y.file.name.toLowerCase().includes("fail")) {
        update(
          id,
          {
            status: "Failed",
            error: "Demo extraction could not parse this file.",
          },
          "Inbox Extraction Failed",
          true
        );
        return;
      }
      const ref = state.items.find(
        (x) =>
          x.id !== id &&
          x.company === y.company &&
          y.file.hash &&
          x.file.hash === y.file.hash
      );
      // Only the hash match is decided here. The voucher-level one is `update`'s
      // job — it re-runs `hardMatch` on anything landing in these two states.
      update(
        id,
        { status: ref ? "Duplicate" : "Needs Review", softRef: ref?.id },
        "Inbox Extraction State Changed",
        true
      );
      event("OCR Extraction Completed", y, {
        inbox_item_id: id,
        source: y.source,
        ai_route: y.route,
        ai_route_confidence: y.confidence,
      });
      event("Inbox Extraction Completed", y, {
        ai_route: y.route,
        ai_route_top_choice: y.topChoice,
        ai_route_permission_redirect: y.route !== y.topChoice,
        ai_route_confidence: y.confidence,
        processing_time_ms: 1800,
        fields_extracted: y.form.lines.length ? 8 : 0,
      });
      if (ref)
        event("Inbox Duplicate Detected", y, {
          duplicate_kind: "file_hash",
          matched_item_id: ref.id,
        });
      tryAutoApprove(id);
      persist();
    }, x.extractionDelay || 1200);
  }, 600);
}
export function retry(id: string) {
  const x = state.items.find((x) => x.id === id);
  if (!x) return;
  if (x.collectionFailure) {
    update(
      id,
      {
        retries: x.retries + 1,
        error:
          "The same source attachment is still unreadable. Ask Neo for a clearer copy.",
      },
      "Source extraction retried"
    );
    return;
  }
  update(
    id,
    { status: "Received", retries: x.retries + 1, firstAttempt: false },
    "Inbox Extraction Retried"
  );
  scheduleExtraction(id);
}
export async function putFile(file: File) {
  const id = crypto.randomUUID();
  await dbOperation("readwrite", (store) => store.put(file, id));
  const bytes = await file.arrayBuffer();
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return { id, hash };
}
function dbOperation(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("aia-inbox-files", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("files", mode);
      const op = fn(tx.objectStore("files"));
      let result: unknown;
      op.onsuccess = () => {
        result = op.result;
      };
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}
export async function fileUrl(id: string) {
  const blob = await dbOperation("readonly", (s) => s.get(id));
  return blob instanceof Blob ? URL.createObjectURL(blob) : "";
}
export async function ingest(
  files: File[],
  source: Item["source"] = "upload",
  sender = actor,
  company = state.company,
  options: { deferExtraction?: boolean; receivedIds?: string[] } = {}
) {
  const results: string[] = [];
  for (const file of files) {
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name)) {
      results.push(`${file.name}: unsupported format`);
      continue;
    }
    if (/statement/i.test(file.name)) {
      results.push(`${file.name}: use Banking reconciliation for statements`);
      continue;
    }
    const saved = await putFile(file);
    const id = `INB-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const topChoice: Route = /sales|customer/i.test(file.name)
      ? "AR"
      : /journal|receipt|rent/i.test(file.name)
        ? "JV"
        : "AP";
    const route = state.permissions.includes(topChoice)
      ? topChoice
      : state.permissions[0] || "AP";
    const form = {
      ...blankForm(),
      gst: companyOf(company)?.branches[0] ?? "",
      voucherNo: `${route}-${Date.now().toString().slice(-7)}`,
      voucherType:
        route === "JV" ? "Journal" : route === "AR" ? "Sales" : "Purchase",
    };
    const item: Item = {
      id,
      company,
      status: "Received",
      route,
      aiRoute: route,
      topChoice,
      confidence: 0.7,
      reason:
        route !== topChoice
          ? `${routeNames[route]} selected because your role doesn't include ${routeNames[topChoice]} access.`
          : "Demo route suggestion from filename. Review and fill the document fields.",
      source,
      sender,
      subject: source === "email" ? "Forwarded invoice" : "",
      routingAddress: `${companyOf(company)?.slug}@inbox.aiaccountant.app`,
      file: {
        name: file.name,
        size: `${Math.ceil(file.size / 1024)} KB`,
        ext: file.name.split(".").pop() || "pdf",
        hash: saved.hash,
        blobId: saved.id,
      },
      received: new Date().toISOString(),
      form,
      amount: 0,
      original: MOCK_INBOX_ITEMS[0],
      edited: [],
      retries: 0,
      firstAttempt: true,
    };
    state = { ...state, items: [item, ...state.items] };
    event("Inbox Document Received", item, {
      item_id: id,
      source,
      file_type: item.file.ext,
      file_size_kb: Math.ceil(file.size / 1024),
      org_id: company,
    });
    if (source === "upload")
      event("Bill Upload Completed", item, { inbox_item_id: id, source });
    persist();
    options.receivedIds?.push(id);
    if (!options.deferExtraction) scheduleExtraction(id);
  }
  return results;
}

/**
 * Edits a voucher that has already been posted. Everything else goes through
 * `update`, which refuses these on purpose; this is the one path that is meant
 * to, and its callers raise `resyncNeeded` so Tally can be brought back level.
 */
export function updatePosted(
  id: string,
  patch: Partial<Item>,
  name = "Approved Voucher Edited"
) {
  const before = state.items.find((x) => x.id === id);
  update(id, patch, name, false, true);
  // An auto-approved bill a person had to correct: the pattern it was
  // trusted on was wrong this time, so it stops being trusted.
  if (before?.autoApproved && patch.form) {
    const ledger = before.form.lines[0]?.ledger || "";
    revokeTrust(
      before.company,
      before.form.party,
      ledger,
      `Edited after auto-approval on ${subjectOf(before)}`
    );
    update(
      id,
      { autoApproved: undefined, doneBy: actor },
      "Inbox Auto-approval Corrected",
      true,
      true
    );
  }
}

/**
 * Use the same demo documents in upload progress and the inbox table.
 *
 * Nothing that arrives this way is Approved. The batch is what a first upload
 * puts in front of someone who has approved nothing yet, so an Approved
 * document in it would be a voucher they never posted. The default scenario's
 * approved examples are separate from these newly uploaded documents.
 */
const seedable = (item: Item) =>
  item.status !== "Deleted" && item.status !== "Approved";

/**
 * A batch of new demo documents, cut from the company's seeded queue.
 *
 * Always new items with ids of their own. It used to reuse whatever was
 * already in the store first — fine while a bulk upload only ever happened on
 * an empty Inbox, but a bulk upload over the WhatsApp backlog would have
 * pulled those documents back into extraction as if they had just been sent.
 *
 * `from` stamps the channel the batch came in on; left out, each document
 * keeps the channel it was seeded with.
 */
export function demoUploadDocuments(
  company: string,
  count: number,
  from?: Pick<Item, "source" | "sender">
): Item[] {
  const templates = seed().items.filter(
    (item) => item.company === company && seedable(item) && !item.priorVoucher
  );
  return Array.from({ length: count }, (_, index) => {
    const template = structuredClone(templates[index % templates.length]);
    return {
      ...template,
      ...(from || {}),
      id: `DEMO-${company}-${crypto.randomUUID()}`,
      file: {
        ...template.file,
        // A second pass over the templates is numbered, so no two rows in
        // one batch share a file name.
        name:
          index < templates.length
            ? template.file.name
            : `Document ${index + 1} · ${template.file.name}`,
      },
    };
  });
}

/**
 * Publish a finished upload batch, then reveal extraction results gradually.
 *
 * `droppedIds` are documents that did not finish uploading. They have to be
 * named rather than simply left out of `samples`: the demo batch is built from
 * the items already in the store, so a sample omitted here is a row that stays
 * exactly where it was — which would put a document in the Inbox that the
 * panel in front of it had just said never arrived.
 */
export function beginUploadedExtraction(
  company: string,
  samples: Item[],
  receivedIds: string[],
  droppedIds: string[] = []
) {
  const dropped = new Set(droppedIds);
  const staged = samples.map((item, index): Item => ({
    ...item,
    status: "Extracting",
    received: new Date().toISOString(),
    form: blankForm(),
    amount: 0,
    hardRef: undefined,
    softRef: undefined,
    error: undefined,
    extractionDelay: 3000 + index * 220,
    extractionResult: {
      form: item.form,
      amount: item.amount,
      status: ["Received", "Extracting"].includes(item.status)
        ? "Needs Review"
        : item.status,
      hardRef: item.hardRef,
      softRef: item.softRef,
      error: item.error,
    },
  }));
  const replacements = new Map(staged.map((item) => [item.id, item]));
  const existingIds = new Set(state.items.map((item) => item.id));
  state = {
    ...state,
    startedCompanies: [
      ...new Set([...(state.startedCompanies || []), company]),
    ],
    items: [
      ...staged.filter((item) => !existingIds.has(item.id)),
      ...state.items
        .filter((item) => !dropped.has(item.id))
        .map(
          (item) =>
            replacements.get(item.id) ||
            (receivedIds.includes(item.id)
              ? {
                  ...item,
                  status: "Extracting" as Status,
                  extractionDelay: 3500,
                }
              : item)
        ),
    ],
  };
  persist();
  [...staged.map((item) => item.id), ...receivedIds].forEach(
    scheduleExtraction
  );
}

/**
 * Bill Splitter's Create N bills: each confirmed bill enters as its own
 * upload and runs the ordinary extraction into Needs Review. Nothing is
 * approved — the PRD is explicit that the splitter never skips review.
 *
 * The extracted values come from a purchase template, as the demo upload's
 * do, with the vendor and invoice number read off the bill's own pages laid
 * over them where detection found them.
 *
 * DEV: POST /bill-splits/:id/bills returns the created documents.
 */
export function createSplitBills(
  company: string,
  bills: { fileName: string; vendor?: string; invoiceNo?: string }[]
) {
  const templates = seed().items.filter(
    (item) =>
      item.company === company &&
      item.route === "AP" &&
      seedable(item) &&
      !item.priorVoucher &&
      // A clean bill: each split bill should land in Needs Review on its own
      // merits, not arrive pre-flagged as a duplicate or a failure.
      ["Received", "Extracting", "Needs Review"].includes(item.status) &&
      !item.hardRef &&
      !item.softRef &&
      !item.error
  );
  if (!templates.length) return [];
  const created = bills.map((bill, index): Item => {
    const template = structuredClone(templates[index % templates.length]);
    return {
      ...template,
      id: `SPLIT-BILL-${crypto.randomUUID()}`,
      status: "Needs Review",
      source: "upload",
      sender: actor,
      route: "AP",
      aiRoute: "AP",
      topChoice: "AP",
      file: { ...template.file, name: bill.fileName, ext: "pdf" },
      form: {
        ...template.form,
        party: bill.vendor || template.form.party,
        invoiceNo: bill.invoiceNo || template.form.invoiceNo,
      },
    };
  });
  beginUploadedExtraction(company, created, []);
  return created;
}

/**
 * A blank voucher for one register, raised by hand rather than read off a
 * document — the same Purchase, Sales or Journal form the Inbox opens, empty.
 *
 * It borrows a seeded item of the route for the scaffolding the forms read
 * (`original` and friends) and blanks everything the accountant fills in.
 */
export function createBlank(route: Route) {
  const company = state.company;
  const template = seed().items.find(
    (item) => item.route === route && seedable(item) && !item.priorVoucher
  );
  if (!template) return;
  const now = new Date().toISOString();
  const voucherType =
    route === "JV" ? "Journal" : route === "AR" ? "Sales" : "Purchase";
  const item: Item = {
    ...structuredClone(template),
    id: `NEW-${route}-${crypto.randomUUID()}`,
    company,
    status: "Needs Review",
    route,
    aiRoute: route,
    topChoice: route,
    confidence: 1,
    reason: "",
    source: "upload",
    sender: actor,
    subject: "",
    file: { name: "", size: "", ext: "" },
    received: now,
    form: { ...blankForm(), gst: "", voucherType },
    amount: 0,
    manual: true,
    created: true,
    edited: [],
    hardRef: undefined,
    softRef: undefined,
    deletedFrom: undefined,
    doneAt: undefined,
    doneBy: undefined,
    snapshot: undefined,
    sheet: undefined,
    arSheet: route === "AR" ? blankArSheet() : undefined,
    arSnapshot: undefined,
    resyncNeeded: undefined,
    routeDrafts: undefined,
    routeSwitch: undefined,
    retries: 0,
    error: undefined,
    firstAttempt: true,
    extractionResult: undefined,
    extractionDelay: undefined,
  };
  state = { ...state, items: [...state.items, item] };
  event(
    route === "AP"
      ? "AP Bill Started"
      : route === "JV"
        ? "Journal Voucher Started"
        : "AR Invoice Started",
    item,
    { item_id: item.id, entry: "manual" }
  );
  persist();
  return item;
}

/**
 * Drop a hand-raised voucher that was left without anything entered. Opening
 * Create Bill and backing out should not leave an empty draft in the register.
 */
export function discardIfBlank(id: string) {
  const x = state.items.find((x) => x.id === id);
  if (!x?.created || x.status === "Approved" || x.edited.length) return;
  const f = x.form;
  const touched =
    f.party ||
    f.invoiceNo ||
    f.voucherNo ||
    f.date ||
    f.narration ||
    f.lines.some((l) => l.ledger || l.description || l.amount || l.dr || l.cr);
  if (touched) return;
  state = { ...state, items: state.items.filter((y) => y.id !== id) };
  persist();
}

/**
 * Put one company back to the state a fresh page load would give it.
 *
 * The guided walkthrough uploads, extracts and opens a document, and what it
 * demonstrates is the arc that starts from an empty Inbox — so it has to be
 * able to hand the screen back the way it found it. A page reload already does
 * this for the whole prototype (see `init`); this is the same reset scoped to
 * the company the tour ran in, so a second company someone had worked is left
 * alone.
 *
 * Extraction timers already in flight are not cancelled here: they resolve
 * against ids that are no longer in the store, and `scheduleExtraction`'s
 * update is a no-op for an item it cannot find.
 */
export function resetCompany(company: string) {
  const fresh = seedFor(state.scenario || DEFAULT_SCENARIO);
  state = {
    ...state,
    startedCompanies: [
      ...(state.startedCompanies || []).filter((id) => id !== company),
      ...(fresh.startedCompanies || []).filter((id) => id === company),
    ],
    items: [
      ...state.items.filter((item) => item.company !== company),
      ...fresh.items.filter((item) => item.company === company),
    ],
    events: state.events.filter((entry) => entry.company !== company),
    queue: [],
  };
  persist();
}

/** One sales invoice created from an uploaded spreadsheet's preview rows. */
export type ImportedInvoice = {
  referenceNumber: string;
  /** Blank when the sheet had none; the register numbers it. */
  voucherNumber: string;
  invoiceDate: string;
  customerName: string;
  gstin: string;
  salesLedger: string;
  costCentre: string;
  totalAmount: number;
  lines: {
    itemName: string;
    description: string;
    quantity: number;
    unitRate: number;
    amount: number;
  }[];
  taxes: { ledger: string; amount: number }[];
  /** The upload it came from, for the record's subject line. */
  fileName: string;
  /** Mapped optional fields, by AR sheet field id. */
  extra?: Record<string, string>;
};

/**
 * Sales upload's Create Invoices: each invoice lands in the Sales register's
 * All Invoices as a posted voucher. Created, not read off a document, so
 * like a hand-raised voucher it never joins the Inbox queue.
 *
 * DEV: POST /api/accounts-receivable/v2/import-batches/:id/save creates the
 * vouchers server-side; the register then lists them from its own endpoint.
 */
export function createImportedInvoices(
  company: string,
  invoices: ImportedInvoice[]
) {
  const template = seed().items.find(
    (item) => item.route === "AR" && seedable(item) && !item.priorVoucher
  );
  if (!template || !invoices.length) return [];
  const now = new Date().toISOString();
  let seq = state.items.filter(
    (x) => x.company === company && x.route === "AR"
  ).length;
  const created = invoices.map((invoice): Item => {
    const arSheet: ArInvoiceState = {
      ...blankArSheet(),
      salesLedger: invoice.salesLedger,
      items: invoice.lines.map((l) => ({
        ...blankArItem(),
        description: l.description,
        item: l.itemName,
        costCentre: invoice.costCentre,
        quantity: l.quantity,
        unitRate: l.unitRate,
        amount: l.amount,
      })),
      taxes: invoice.taxes
        .filter((t) => t.amount)
        .map((t) => ({
          id: arRowId(),
          ledger: t.ledger,
          costCentre: "",
          amount: t.amount,
        })),
    };
    const form: Form = {
      ...blankForm(),
      gst: invoice.gstin,
      voucherType: "Sales",
      voucherNo:
        invoice.voucherNumber || `SAL/26-27/${String(++seq).padStart(4, "0")}`,
      invoiceNo: invoice.referenceNumber,
      date: invoice.invoiceDate,
      party: invoice.customerName,
      costCentre: invoice.costCentre,
      lines: deriveLines(arSheet),
      ...(invoice.extra && Object.keys(invoice.extra).length
        ? { extra: invoice.extra }
        : {}),
    };
    return {
      ...structuredClone(template),
      id: `IMPORT-AR-${crypto.randomUUID()}`,
      company,
      status: "Approved",
      route: "AR",
      aiRoute: "AR",
      topChoice: "AR",
      confidence: 1,
      reason: "",
      source: "upload",
      sender: actor,
      subject: invoice.fileName,
      file: { name: "", size: "", ext: "" },
      received: now,
      form,
      amount: invoice.totalAmount,
      manual: true,
      created: true,
      edited: [],
      hardRef: undefined,
      softRef: undefined,
      deletedFrom: undefined,
      doneAt: now,
      doneBy: actor,
      snapshot: structuredClone(form),
      sheet: undefined,
      arSheet,
      arSnapshot: structuredClone(arSheet),
      resyncNeeded: undefined,
      routeDrafts: undefined,
      routeSwitch: undefined,
      retries: 0,
      error: undefined,
      firstAttempt: true,
      extractionResult: undefined,
      extractionDelay: undefined,
    };
  });
  state = { ...state, items: [...state.items, ...created] };
  persist();
  return created;
}

/**
 * Start the prototype over as the other first-visit story, without a reload.
 *
 * Everything goes — every company's documents, events and welcome flags — so
 * the switch lands exactly where a page load would. The company being viewed
 * is kept; being thrown to another one is not part of either story.
 */
export function applyScenario(scenario: Scenario) {
  try {
    sessionStorage.setItem(SCENARIO_KEY, scenario);
  } catch {}
  // The organisations are who the user is, not the story being told: ones
  // created in this run stay, and so does the one being looked at.
  state = {
    ...seedFor(scenario),
    company: state.company,
    companies: state.companies,
  };
  logSeededActivity();
  persist();
  state.items
    .filter((x) => ["Received", "Extracting"].includes(x.status))
    .forEach((x) => scheduleExtraction(x.id));
}

/**
 * The voucher types, grouped by the voucher they post as.
 *
 * The Voucher type dropdown is also where the route is chosen: the table no
 * longer carries a separate AI Route column. Picking a type from another group
 * moves the document to that group's route, through the same `setRoute` a
 * reassignment always used. Payment and Receipt sit with the purchase and sales
 * sides they settle, and Contra, a transfer between cash and bank, is
 * journal-like.
 */
export const VOUCHER_GROUPS: {
  route: Route;
  label: string;
  types: string[];
}[] = [
  {
    route: "AP",
    label: "Purchase",
    types: ["Purchase", "Debit Note", "Payment"],
  },
  { route: "AR", label: "Sales", types: ["Sales", "Credit Note", "Receipt"] },
  { route: "JV", label: "Journal", types: ["Journal", "Contra"] },
];
export const BULK_VOUCHER_TYPES: readonly string[] = VOUCHER_GROUPS.flatMap(
  (group) => group.types
);
export const ROUTE_BY_VOUCHER_TYPE: Record<string, Route> = Object.fromEntries(
  VOUCHER_GROUPS.flatMap((group) =>
    group.types.map((type) => [type, group.route])
  )
);

/**
 * Who sent a document in, for the User column.
 *
 * Uploads carry the uploader's name. WhatsApp carries the number with the
 * registered user's name in brackets, and the column shows the name. Email
 * shows the sending address, because a forwarded mail has no user behind it
 * that the Inbox can know.
 *
 * DEV: prototype-only parsing. Production should return the user on the item
 * (`sentBy`) instead of it being read out of `sender`.
 */
export const senderUser = (item: Pick<Item, "source" | "sender">): string => {
  if (item.source === "whatsapp")
    return item.sender.match(/\(([^)]+)\)\s*$/)?.[1] || item.sender;
  return item.sender;
};
export type BulkField =
  "Vendor" | "GST Registration" | "Voucher Type" | "Ledger" | "Route";

/**
 * What the queue calls each route, and the way back from the label.
 *
 * The Route field is set by name — the table cell and the selection bar both
 * offer the voucher names an accountant reads, not the two-letter codes the
 * store keys on — so the reverse map is what turns a pick into a Route.
 */
export const ROUTE_LABELS: Record<Route, string> = {
  AP: "Purchase Voucher",
  AR: "Sales Voucher",
  JV: "Journal Voucher",
};
export const ROUTE_BY_LABEL: Record<string, Route> = Object.fromEntries(
  Object.entries(ROUTE_LABELS).map(([route, label]) => [label, route as Route])
) as Record<string, Route>;
export type BulkResult = {
  changed: number;
  skipped: number;
  reasons: Record<string, number>;
};

/** Re-read each item so earlier changes in a batch participate in duplicate checks. */
export function applyBulkAction(
  ids: string[],
  action: "Approve" | "Delete" | BulkField,
  value = ""
): BulkResult {
  const result: BulkResult = { changed: 0, skipped: 0, reasons: {} };
  const uniqueIds = [...new Set(ids)];
  const skip = (reason: string) => {
    result.skipped++;
    result.reasons[reason] = (result.reasons[reason] || 0) + 1;
  };
  for (const id of uniqueIds) {
    const item = state.items.find(
      (x) => x.id === id && x.company === state.company
    );
    if (!item) {
      skip("Item unavailable");
      continue;
    }
    if (!state.permissions.includes(item.route)) {
      skip("No write access");
      continue;
    }
    if (action === "Approve") {
      if (hardMatch(item)) {
        skip("Hard-block duplicate");
        continue;
      }
      if (item.status !== "Needs Review") {
        skip("Not in Needs Review");
        continue;
      }
      const error = approve(id);
      if (error) {
        skip(error);
        continue;
      }
    } else if (action === "Delete") {
      if (item.status === "Approved" || item.status === "Deleted") {
        skip(
          item.status === "Approved"
            ? "Approved record is read-only"
            : "Already deleted"
        );
        continue;
      }
      remove(id);
    } else {
      if (!["Needs Review", "Duplicate"].includes(item.status)) {
        skip("Not editable");
        continue;
      }
      const nextValue = value.trim();
      if (!nextValue) {
        skip("Choose a value");
        continue;
      }
      if (
        action === "GST Registration" &&
        !companyOf(state.company)?.branches.includes(nextValue)
      ) {
        skip("Invalid GST registration");
        continue;
      }
      if (
        action === "Voucher Type" &&
        !(BULK_VOUCHER_TYPES as readonly string[]).includes(nextValue)
      ) {
        skip("Invalid voucher type");
        continue;
      }
      if (action === "Voucher Type") {
        // A type from another group moves the document to that group's route
        // first, so the voucher type and the route can never disagree.
        const nextRoute = ROUTE_BY_VOUCHER_TYPE[nextValue];
        if (nextRoute !== item.route) {
          if (!state.permissions.includes(nextRoute)) {
            skip(`No write access to ${routeNames[nextRoute]}`);
            continue;
          }
          setRoute(id, nextRoute);
        }
        const current = state.items.find((x) => x.id === id) || item;
        update(id, {
          form: { ...structuredClone(current.form), voucherType: nextValue },
          amount: current.amount,
          sheet: undefined,
          firstAttempt: false,
          edited: [...new Set([...current.edited, action])],
        });
        result.changed++;
        continue;
      }
      if (action === "Route") {
        const nextRoute = ROUTE_BY_LABEL[nextValue];
        if (!nextRoute) {
          skip("Invalid route");
          continue;
        }
        if (!state.permissions.includes(nextRoute)) {
          skip(`No write access to ${routeNames[nextRoute]}`);
          continue;
        }
        /*
          setRoute owns the rest: it carries the per-route draft across, clears
          a voucher number that belonged to the old route, and logs the
          override against the AI's original pick. Reassigning by hand and
          reassigning in bulk have to leave the same trail.
        */
        if (item.route !== nextRoute) setRoute(id, nextRoute);
        result.changed++;
        continue;
      }
      if (action === "Ledger" && !item.form.lines.length && !item.arSheet) {
        skip("No ledger lines");
        continue;
      }
      if (action === "Ledger" && item.route === "AR" && item.arSheet) {
        setArSheet(
          id,
          {
            ...item.arSheet,
            salesLedger: nextValue,
            ledgers: item.arSheet.ledgers.map((line) => ({
              ...line,
              ledger: nextValue,
            })),
          },
          action
        );
      } else {
        const form = structuredClone(item.form);
        if (action === "Vendor") form.party = nextValue;
        if (action === "GST Registration") form.gst = nextValue;
        if (action === "Ledger")
          form.lines = form.lines.map((line) => ({
            ...line,
            ledger: nextValue,
          }));
        update(id, {
          form,
          amount: item.amount,
          sheet: undefined,
          firstAttempt: false,
          edited: [...new Set([...item.edited, action])],
        });
      }
    }
    result.changed++;
  }
  event("Inbox Bulk Action Triggered", undefined, {
    action_type: ["Approve", "Delete"].includes(action)
      ? action
      : `Reassign ${action}`,
    item_count: uniqueIds.length,
    changed_count: result.changed,
    skipped_count: result.skipped,
    skip_reasons: result.reasons,
  });
  persist();
  return result;
}

/* ----------------------------------------------- activity and auto-approve */

/** The book a route posts to, as the activity log names it. */
const MODULE_OF: Record<Route, "Purchases" | "Sales" | "Journals"> = {
  AP: "Purchases",
  AR: "Sales",
  JV: "Journals",
};

/** "Bharti Airtel Ltd · BLR/2610/44871": a record as the log names it. */
const subjectOf = (item: Item) =>
  [item.form.party, item.form.invoiceNo].filter(Boolean).join(" · ") ||
  item.file.name;

/** The ledgers the AI read off the document, before anyone touched them. */
export const predictedLedgers = (item: Item) =>
  (
    item.original.bill?.items ||
    item.original.invoice?.items ||
    item.original.jv?.lines ||
    []
  ).map((l) => l.ledger);

const distinct = (list: string[]) => Array.from(new Set(list.filter(Boolean)));

/** Seeded documents the activity mock already describes. */
const DESCRIBED = new Set(["INB-2041", "INB-2051", "INB-2031"]);
const logged = new Set<string>();

/**
 * Give every seeded document its history: what the AI decided when it read
 * it, and what Auto-approve did. Without this a seeded document's History
 * would open empty, as if nobody had looked at it.
 *
 * DEV: prototype-only. Production's log is written by the actions themselves.
 */
function logSeededActivity() {
  const after = (iso: string, minutes: number) =>
    new Date(+new Date(iso) + minutes * 60_000).toISOString();
  state.items.forEach((item) => {
    if (item.priorVoucher || item.created) return;
    if (["Received", "Extracting", "Failed", "Deleted"].includes(item.status))
      return;
    const key = `${item.company}:${item.id}`;
    if (logged.has(key)) return;
    logged.add(key);
    const ref = { kind: "document" as const, id: item.id };
    const module = MODULE_OF[item.route];
    const subject = subjectOf(item);
    logActivity({
      company: item.company,
      at: after(item.received, 1),
      actor: { kind: "ai", name: "Neo · Document reading" },
      kind: "predicted",
      module,
      action: `Sent to ${module}`,
      subject,
      ref,
      reason: item.reason,
    });
    if (!DESCRIBED.has(item.id) && item.route !== "JV")
      distinct(predictedLedgers(item)).forEach((ledger) =>
        logActivity({
          company: item.company,
          at: after(item.received, 2),
          actor: { kind: "ai", name: "Neo · Bill reading" },
          kind: "predicted",
          module,
          action: "Predicted ledger",
          subject,
          ref,
          reason: item.original.ai.rationale
            ? `${ledger}: ${item.original.ai.rationale}`
            : `${ledger}, from the lines on the document`,
        })
      );
    if (item.status === "Duplicate" && !DESCRIBED.has(item.id))
      logActivity({
        company: item.company,
        at: after(item.received, 2),
        actor: { kind: "ai", name: "Neo · Duplicate check" },
        kind: "blocked",
        module: "Inbox",
        action: "Held as duplicate",
        subject,
        ref,
        reason: item.hardRef
          ? "Same vendor and invoice number as a voucher already in the books"
          : "The same file was received before",
      });
    if (item.autoApproved) logAutoApproval(item);
    if (item.autoHold)
      logActivity({
        company: item.company,
        at: item.autoHold.at,
        actor: { kind: "ai", name: "Neo · Auto-approve" },
        kind: "held",
        module,
        action: "Held for review",
        subject,
        ref,
        reason: item.autoHold.reason,
      });
  });
}

/** Log an auto-approval with its Undo, and keep the entry's id on the item. */
function logAutoApproval(item: Item) {
  if (!item.autoApproved) return;
  const entry = logActivity(
    {
      company: item.company,
      at: item.autoApproved.at,
      actor: { kind: "ai", name: "Neo · Auto-approve" },
      kind: "auto-approved",
      module: MODULE_OF[item.route],
      action: "Auto-approved",
      subject: subjectOf(item),
      ref: { kind: "document", id: item.id },
      reason: item.autoApproved.evidence,
      undoable: true,
    },
    () => undoAutoApprove(item.id)
  );
  state = {
    ...state,
    items: state.items.map((x) =>
      x.id === item.id && x.autoApproved
        ? { ...x, autoApproved: { ...x.autoApproved, activity: entry.id } }
        : x
    ),
  };
}

/**
 * Put an auto-approved bill back in Needs Review. Only before it reaches
 * Tally — the caller checks the sync state; the log closes the entry.
 *
 * DEV: POST /api/inbox/:id/undo-auto-approve
 */
export function undoAutoApprove(id: string) {
  const x = state.items.find((item) => item.id === id);
  if (!x || x.status !== "Approved" || !x.autoApproved) return;
  update(
    id,
    {
      status: "Needs Review",
      autoApproved: undefined,
      snapshot: undefined,
      doneAt: undefined,
      doneBy: undefined,
    },
    "Inbox Auto-approve Undone",
    true,
    true
  );
}

/**
 * A freshly read bill meets a trusted pattern: approve it on the AI's own
 * authority, or hold it with the reason it fell short. Anything that fails
 * the ordinary checks (`issue`) or is a duplicate stays where it is.
 */
function tryAutoApprove(id: string) {
  const item = state.items.find((x) => x.id === id);
  if (!item || item.status !== "Needs Review" || item.route !== "AP") return;
  const verdict = judge(
    item.company,
    item.form.party,
    item.form.lines.map((l) => l.ledger),
    item.amount
  );
  if (!verdict) return;
  const at = new Date().toISOString();
  if (!verdict.ok) {
    state = {
      ...state,
      items: state.items.map((x) =>
        x.id === id ? { ...x, autoHold: { reason: verdict.reason, at } } : x
      ),
    };
    logActivity({
      company: item.company,
      actor: { kind: "ai", name: "Neo · Auto-approve" },
      kind: "held",
      module: MODULE_OF[item.route],
      action: "Held for review",
      subject: subjectOf(item),
      ref: { kind: "document", id },
      reason: verdict.reason,
    });
    return;
  }
  if (issue(item)) return;
  const next: Item = {
    ...item,
    status: "Approved",
    snapshot: structuredClone(item.form),
    doneAt: at,
    doneBy: "Neo · Auto-approve",
    autoApproved: { evidence: verdict.evidence, at },
  };
  state = { ...state, items: state.items.map((x) => (x.id === id ? next : x)) };
  event("Inbox Item Auto-approved", next, { evidence: verdict.evidence });
  logAutoApproval(next);
}

/** A person approved a document: log it, and feed the vendor's evidence. */
function recordPersonApproval(item: Item) {
  const module = MODULE_OF[item.route];
  const subject = subjectOf(item);
  const ref = { kind: "document" as const, id: item.id };
  const before = distinct(predictedLedgers(item));
  const after = distinct(item.form.lines.map((l) => l.ledger));
  const changed =
    item.route !== "JV" &&
    before.length > 0 &&
    before.join("|") !== after.join("|");
  if (changed)
    logActivity({
      company: item.company,
      actor: { kind: "person", name: actor },
      kind: "override",
      module,
      action: "Changed ledger",
      subject,
      ref,
      change: { from: before.join(", "), to: after.join(", ") },
    });
  logActivity({
    company: item.company,
    actor: { kind: "person", name: actor },
    kind: "approved",
    module,
    action: "Approved",
    subject,
    ref,
  });
  if (item.route !== "JV" && after.length === 1)
    recordApproval(
      item.company,
      item.form.party,
      after[0],
      item.amount,
      changed
        ? `Ledger changed from ${before.join(", ")} to ${after[0]}`
        : undefined
    );
}

/**
 * Add a document Neo prepared. It enters where any document waiting for a
 * person does — Needs Review — because Neo prepares and never approves.
 *
 * DEV: POST /api/inbox/items with `prepared_by`; the backend writes the edit
 * log entry naming the agent and the user it acted for.
 */
export function neoCreate(item: Item, runId: string, fromId?: string) {
  return createDraft(item, runId, fromId);
}

/**
 * Add a draft a person started from a screen (a provision schedule, a
 * compliance fix). It is credited to them, not to Neo: the rule that built it
 * is evidence, not an author. `preparedBy` is only for work Neo ran.
 */
export function personCreate(item: Item, runId: string, fromId?: string) {
  return createDraft(item, runId, fromId, actor);
}

function createDraft(
  item: Item,
  runId: string,
  fromId?: string,
  person?: string
) {
  if (!state.permissions.includes(item.route))
    throw new Error("You do not have access to create this voucher type.");
  if (state.items.some((x) => x.id === item.id))
    throw new Error("This draft already exists.");
  if (
    fromId &&
    !state.items.some(
      (x) =>
        x.id === fromId && x.company === state.company && x.status !== "Deleted"
    )
  )
    throw new Error("The source is unavailable in this company.");
  const next: Item = {
    ...item,
    company: state.company,
    status: "Needs Review",
    preparedBy: person
      ? undefined
      : { agent: "Neo", runId, onBehalfOf: actor, fromId },
  };
  // A draft is an arrival: a company that had nothing sent yet now has its
  // Inbox started, or the queue's empty kickstart would hide the draft.
  state = {
    ...state,
    startedCompanies: [
      ...new Set([...(state.startedCompanies || []), next.company]),
    ],
    items: [next, ...state.items],
  };
  event(person ? "Draft Created" : "Neo Draft Created", next, {
    agent: person ? undefined : "Neo",
    on_behalf_of: actor,
    run_id: runId,
    route: next.route,
    prepared_from: fromId,
  });
  logActivity(
    {
      company: next.company,
      actor: person
        ? { kind: "person", name: person }
        : { kind: "ai", name: "Neo" },
      kind: person ? "override" : "predicted",
      module: "Inbox",
      action: "Prepared draft",
      subject: next.form.voucherNo,
      ref: { kind: "document", id: next.id },
      reason: next.reason,
      undoable: true,
    },
    () => {
      const result = neoDiscard([next], runId);
      if (!result.reversed.length)
        throw new Error(
          "The draft has changed or been approved; it cannot be undone."
        );
    }
  );
  return next;
}

/** Ingestion failures remain documents, not invented zero-value vouchers. */
export function sourceFailure(item: Item, runId: string) {
  const existing = state.items.find((x) => x.id === item.id);
  if (existing) return existing;
  const failed: Item = {
    ...item,
    company: state.company,
    status: "Failed",
    amount: 0,
    collectionFailure: true,
    error: "Unreadable source attachment. Request a clearer copy.",
    form: { ...item.form, lines: [] },
  };
  state = { ...state, items: [failed, ...state.items] };
  neoLog("Source extraction failed", runId, failed, { reason: failed.error });
  return failed;
}

export function neoReplaceFailed(item: Item, runId: string) {
  const existing = state.items.find(
    (x) => x.id === item.id && x.company === state.company
  );
  if (!existing || existing.status !== "Failed")
    throw new Error(
      "The failed document has changed; review it before replacing."
    );
  if (!state.permissions.includes(item.route))
    throw new Error("You do not have access to prepare this voucher.");
  const next: Item = {
    ...item,
    company: state.company,
    status: "Needs Review",
    preparedBy: { agent: "Neo", runId, onBehalfOf: actor },
  };
  state = {
    ...state,
    items: state.items.map((x) => (x.id === next.id ? next : x)),
  };
  neoLog("Prepared clearer replacement", runId, next, {
    reason:
      "Replaced unreadable attachment after a simulated supplier reply; awaiting review.",
  });
  return next;
}

/**
 * Undo for a Neo run: take out what it created. Only drafts go — anything
 * someone has approved since is a posted record, and stays.
 *
 * DEV: DELETE /api/neo/runs/:id/changes.
 */
export function neoDiscard(created: Item[], runId: string) {
  const ids = created.map((x) => x.id);
  const removed = state.items
    .filter(
      (x) =>
        x.preparedBy?.runId === runId &&
        x.company === state.company &&
        x.status === "Needs Review" &&
        created.some(
          (before) =>
            before.id === x.id && JSON.stringify(before) === JSON.stringify(x)
        )
    )
    .map((x) => x.id);
  state = {
    ...state,
    items: state.items.filter((x) => !removed.includes(x.id)),
  };
  event("Neo Run Undone", undefined, {
    agent: "Neo",
    run_id: runId,
    removed,
  });
  for (const item of created.filter((x) => removed.includes(x.id)))
    neoLog("Neo Draft Removed", runId, item);
  return {
    reversed: removed,
    skipped: ids.filter((id) => !removed.includes(id)),
  };
}

/**
 * Undo for a Neo run that edited documents: put each back as it was before
 * the run touched it. Approved records are skipped for the same reason as
 * above.
 */
export function neoRestore(snapshots: Item[], runId: string, expected: Item[]) {
  const byId = new Map(snapshots.map((x) => [x.id, x]));
  const restored: string[] = [];
  state = {
    ...state,
    items: state.items.map((x) => {
      const before = byId.get(x.id);
      const after = expected.find((item) => item.id === x.id);
      if (
        !before ||
        !after ||
        x.company !== state.company ||
        x.status === "Approved" ||
        JSON.stringify(x) !== JSON.stringify(after)
      )
        return x;
      restored.push(x.id);
      return structuredClone(before);
    }),
  };
  event("Neo Run Undone", undefined, {
    agent: "Neo",
    run_id: runId,
    restored,
  });
  for (const item of snapshots.filter((x) => restored.includes(x.id)))
    neoLog("Neo Draft Restored", runId, item);
  return {
    reversed: restored,
    skipped: snapshots.filter((x) => !restored.includes(x.id)).map((x) => x.id),
  };
}

/** Capture the accepted write now, so Undo cannot overwrite a later edit. */
export function neoUndoChanges(snapshots: Item[], runId: string) {
  snapshots = snapshots.filter((before) => {
    const current = state.items.find((x) => x.id === before.id);
    return (
      current &&
      current.company === state.company &&
      current.status !== "Approved" &&
      JSON.stringify(current) !== JSON.stringify(before)
    );
  });
  state = {
    ...state,
    items: state.items.map((x) =>
      snapshots.some((s) => s.id === x.id) && x.status !== "Approved"
        ? { ...x, preparedBy: { agent: "Neo", runId, onBehalfOf: actor } }
        : x
    ),
  };
  const expected = structuredClone(
    state.items.filter((x) => snapshots.some((s) => s.id === x.id))
  );
  for (const item of expected) neoLog("Neo Draft Changed", runId, item);
  return () => neoRestore(snapshots, runId, expected);
}

/** Log an agent action that changed nothing in the books, e.g. a message. */
export function neoLog(
  name: string,
  runId: string,
  item?: Item,
  properties: Record<string, unknown> = {}
) {
  logActivity({
    company: item?.company || state.company,
    actor: { kind: "ai", name: "Neo" },
    kind: "predicted",
    module: "Automation",
    action: name,
    subject: item?.form.voucherNo || runId,
    ref: item ? { kind: "document", id: item.id } : undefined,
    reason: String(properties.reason || "Scripted task requested by the user"),
  });
  event(name, item, {
    agent: "Neo",
    on_behalf_of: actor,
    run_id: runId,
    ...properties,
  });
}
