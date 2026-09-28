import { useSyncExternalStore } from "react";
import { MOCK_INBOX_ITEMS } from "@/config/pages/inbox/mock-inbox";
import type { InboxItem } from "@/types/pages/inbox";
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
export const companies = [
  {
    id: "shakun",
    name: "Shakunthalam Oil & Refineries",
    slug: "shakunthalam",
    branches: ["Karnataka HQ", "Maharashtra Branch"],
  },
  {
    id: "acme",
    name: "Acme Industries",
    slug: "acme-industries",
    branches: ["Karnataka HQ"],
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
};
export type Item = {
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
   * to open — "View PUR/25-26/041" is a real record, not a dead link. It is not
   * an inbox document, so it stays out of the queue, the tabs and the sync run.
   */
  priorVoucher?: boolean;
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
  retries: number;
  error?: string;
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
function seed(): State {
  const items: Item[] = MOCK_INBOX_ITEMS.filter(
    (x) => x.route !== "Banking" && !x.lineage
  ).map((x, n) => {
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
      costCentre: "",
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
    const taxes = taxBlock
      ? Object.values(taxBlock).reduce((s, v) => s + (v || 0), 0)
      : 0;
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
      costClass: "",
      costCentre: b?.costCentre || inv?.costCentre || "",
      costClassEnabled: false,
      narration: x.jv?.narration || x.source.subject || "",
      lines,
    };
    /*
      Nothing arrives Approved.

      The mock set marks three documents `done`, which read as vouchers already
      posted — on a queue nobody has worked yet, from an upload that has just
      finished. Approved is the state this dataset reaches by someone pressing
      Approve & Next, so those three land where every other document does, and
      the Approved tab opens empty until the queue has been worked.
    */
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
        route === "JV" ? lines.reduce((s, l) => s + l.dr, 0) : net + taxes,
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
      // No seeded document is Approved, so none arrives with an approval
      // snapshot or an approver on it — those are written by approving.
    };
  });
  // A posted record gives the hard duplicate a concrete, same-company match.
  const hard = items.find((x) => x.hardRef);
  if (hard)
    items.push({
      ...structuredClone(hard),
      id: "POSTED-2041",
      status: "Approved",
      priorVoucher: true,
      hardRef: undefined,
      snapshot: structuredClone(hard.form),
      doneAt: new Date().toISOString(),
      doneBy: actor,
    });
  const acme = structuredClone(items[0]);
  acme.id = "ACME-1001";
  acme.company = "acme";
  acme.routingAddress = "acme-industries@inbox.aiaccountant.app";
  items.push(acme);
  return {
    version: 2,
    company: "shakun",
    permissions: [...routes],
    items,
    events: [],
    tourDone: false,
    queue: [],
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

/** A fresh prototype state, told as the given first-visit story. */
function seedFor(scenario: Scenario): State {
  const base = { ...seed(), scenario };
  if (scenario === "whatsapp") return withWhatsAppBacklog(base, base.waCompany);
  // A new user has received nothing: the queue starts empty everywhere, and
  // only the books (posted vouchers) are there. The seeded queue lives on as
  // the templates `demoUploadDocuments` cuts batches from.
  return {
    ...base,
    items: base.items.filter((item) => item.priorVoucher || !seedable(item)),
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
 * Every page load starts the prototype over, on the empty state.
 *
 * This is a demo, and the thing being demonstrated is the arc: an Inbox with
 * nothing in it, documents arriving, extraction, review, approval. A restored
 * session skips the first beat and drops whoever is watching into the middle
 * of someone else's run — so refresh is the reset, and the way back to the
 * opening screen is the one every audience already knows.
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
      series — PUR/25-26/041 is a purchase number — and carrying it onto a sales
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
export function scheduleExtraction(id: string) {
  if (timers.has(id)) return;
  timers.add(id);
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
      persist();
    }, x.extractionDelay || 1200);
  }, 600);
}
export function retry(id: string) {
  const x = state.items.find((x) => x.id === id);
  if (!x) return;
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
      routingAddress: `${companies.find((c) => c.id === company)?.slug}@inbox.aiaccountant.app`,
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
  update(id, patch, name, false, true);
}

/**
 * Use the same demo documents in upload progress and the inbox table.
 *
 * Nothing that arrives this way is Approved. The batch is what a first upload
 * puts in front of someone who has approved nothing yet, so an Approved
 * document in it would be a voucher they never posted — and the Approved tab
 * would open with rows in it before the queue had been touched. Approved is a
 * state this dataset reaches by being worked, not by being seeded.
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
  state = { ...seedFor(scenario), company: state.company };
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
        !companies
          .find((c) => c.id === state.company)
          ?.branches.includes(nextValue)
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
