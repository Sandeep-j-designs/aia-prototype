import { useSyncExternalStore } from "react";
import {
  actor,
  applyBulkAction,
  companyOf,
  getState,
  itemFromMock,
  neoCreate,
  neoDiscard,
  type BulkResult,
  type Item,
} from "@/components/inbox/v2/store";
import { seedFor } from "@/config/pages/inbox/mock-chart-of-accounts";
import { COST_CENTRES } from "@/config/pages/inbox/mock-cost-centres";
import { AP_EXPENSE_LEDGERS } from "@/config/pages/neo/ap-ledgers";
import { partyNamed } from "@/config/pages/inbox/mock-parties";
import {
  MOCK_BATCH_DOCUMENTS,
  MOCK_VENDOR_TDS,
} from "@/config/pages/neo/mock-batch-documents";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { savePolicies } from "@/hooks/pages/inbox/use-client-policy";
import type { InboxItem } from "@/types/pages/inbox";
import type {
  Batch,
  BatchLine,
  BatchQuestion,
  BatchRow,
  BatchSettingKey,
  BatchSettings,
  BatchSource,
} from "@/types/pages/neo/batch";

/**
 * Neo voucher entry, phase A: a batch of purchase bills entered from the
 * documents plus the accountant's instruction.
 *
 * The flow is the plan's loop: read the instruction into settings the
 * accountant can see and change; read every document and apply them; ask
 * once per kind of exception; show the batch as a voucher register whose
 * totals reconcile to the documents; and only on sign-off make drafts. The
 * drafts are ordinary Inbox items in Needs Review — same form, same Approve,
 * same Sync — tagged with the batch and the instruction they were made under.
 *
 * The instruction reader is scripted: it understands the phrases an
 * accountant uses for this kind of batch (a month, "as on the bill", "freight
 * goes to …", "… cost centre", "deduct TDS on transporters"). Everything it
 * does not catch keeps its default and is shown as Neo's, not the user's.
 *
 * DEV: POST /api/neo/batches and friends (see types/pages/neo/batch.ts). The
 * reader, the checks and the register are server-side; this hook keeps the
 * shape and loses the logic.
 */

type State = { batches: Batch[] };
let state: State = { batches: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const set = (next: State) => {
  state = next;
  emit();
};
const subscribe = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};
const snapshot = () => state;

export const useBatches = () =>
  useSyncExternalStore(subscribe, snapshot, snapshot);
export const getBatch = (id: string) => state.batches.find((b) => b.id === id);

const patchBatch = (id: string, patch: Partial<Batch>) =>
  set({
    batches: state.batches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  });

/* ---------------------------------------------------------------- masters */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const ledgersOf = (company: string) => seedFor(company).ledgers;

/** Vendors the books already know: creditors in the chart, or a past bill. */
const knownVendors = (company: string) => {
  const names = ledgersOf(company)
    .filter((l) => l.ledgerGroupUuid === "grp-sundry-creditors")
    .map((l) => l.accountName);
  getState()
    .items.filter(
      (x) =>
        x.company === company && x.route === "AP" && x.status === "Approved"
    )
    .forEach((x) => names.push(x.form.party));
  return names;
};

const vendorInMasters = (company: string, vendor: string) =>
  knownVendors(company).find((n) => norm(n) === norm(vendor));

const words = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

/**
 * The AP book's ledger an instruction means: "Freight Inward" is the book's
 * "Freight & Cartage Inward" — every word said is in the name.
 */
const apLedgerNamed = (text: string) => {
  const said = words(text);
  if (!said.length) return undefined;
  return AP_EXPENSE_LEDGERS.find(
    (l) =>
      norm(l.name) === norm(text) ||
      said.every((w) => words(l.name).includes(w))
  );
};

/** The AP ledger a service code is filed on, for lines no rule covers. */
const apLedgerForSac = (sac = "") =>
  AP_EXPENSE_LEDGERS.find((l) => l.sac && l.sac === sac);

const centreNamed = (text: string) =>
  COST_CENTRES.find(
    (c) => norm(c.name) === norm(text) || norm(c.name).includes(norm(text))
  )?.name;

/* ------------------------------------------------------- the instruction */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const docsOf = (b: Pick<Batch, "docIds">) =>
  b.docIds
    .map((id) => MOCK_BATCH_DOCUMENTS.find((d) => d.id === id))
    .filter(Boolean) as InboxItem[];

/**
 * The instruction, read into settings. A setting the instruction states is
 * "instruction"; one Neo had to choose is "neo", and the page says so.
 */
export const readInstruction = (
  text: string,
  company: string,
  docs: InboxItem[]
): {
  settings: BatchSettings;
  sources: Record<BatchSettingKey, BatchSource>;
} => {
  const sources = {} as Record<BatchSettingKey, BatchSource>;
  const said = (key: BatchSettingKey, found: boolean) => {
    sources[key] = found ? "instruction" : "neo";
  };

  const month = text.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i
  );
  const fromDocs = (() => {
    const counts = new Map<string, number>();
    docs.forEach((d) => {
      const m = d.bill?.billDate.match(/[A-Za-z]{3}/)?.[0];
      if (m) counts.set(m, (counts.get(m) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "Sep";
  })();
  const mon = month
    ? MONTHS.find((m) => m.toLowerCase() === month[1].toLowerCase())!
    : fromDocs;
  said("period", !!month);

  const dateRule: BatchSettings["dateRule"] =
    /today|date of entry|entry date/i.test(text) ? "entry" : "bill";
  said("dateRule", /as on the bill|bill date|today|entry date/i.test(text));

  const ledgerText = text.match(
    /freight\s+(?:goes|go|should go|to go)?\s*(?:to|into|under)\s+([A-Za-z&' -]+?)(?:[,.;]|$)/i
  )?.[1];
  const freightLedger =
    (ledgerText && apLedgerNamed(ledgerText)?.name) ||
    ledgerText?.trim() ||
    "Freight & Cartage Inward";
  said("freightLedger", !!ledgerText);

  const centreText =
    text.match(/([A-Za-z][A-Za-z &-]*?)\s+cost\s*cent(?:re|er)/i)?.[1] ||
    text.match(
      /charge (?:them |it )?to ([A-Za-z][A-Za-z &-]*?)(?:[,.;]|$)/i
    )?.[1];
  // "charge to the Harihar cost centre" → "Harihar"
  const costCentre = centreText
    ? (
        centreText.split(/\b(?:to|the|a|an|and|in|on|for)\b/i).pop() || ""
      ).trim()
    : "";
  said("costCentre", !!centreText);

  const tds: BatchSettings["tds"] = /deduct tds|tds on|with tds|194c/i.test(
    text
  )
    ? "194C"
    : "none";
  said("tds", tds !== "none");

  // The branch: the plant's state, when the instruction names a plant.
  const company_ = companyOf(company);
  const plant = text.match(/\b([A-Z][a-z]+)\s+plant\b/)?.[1];
  const gstReg = company_?.branches[0] || "";
  sources.gstReg = "neo";

  const place = plant || costCentre || "";
  const narration = `Freight${place ? ` — ${place}` : ""}, ${mon} 26 · {bill}`;
  sources.narration = place ? "instruction" : "neo";

  return {
    settings: {
      period: `${mon} 2026`,
      dateRule,
      gstReg,
      freightLedger,
      costCentre,
      tds,
      narration,
    },
    sources,
  };
};

/* --------------------------------------------------------------- reading */

const isGoods = (d: InboxItem) =>
  !!d.bill?.items.some((l) => l.qty != null && !/^99/.test(l.hsn || ""));
const isFreight = (d: InboxItem) =>
  !!d.bill?.items.some((l) => /^9965/.test(l.hsn || ""));
const isCarriage = (d: InboxItem) =>
  !!d.bill?.items.some((l) => /^996(5|8)/.test(l.hsn || ""));
const taxOf = (d: InboxItem) => {
  const t = d.bill?.taxes || {};
  return (t.cgst || 0) + (t.sgst || 0) + (t.igst || 0);
};
/** A GTA freight bill printed with no tax: the recipient pays it (RCM). */
const isRcm = (d: InboxItem) => isFreight(d) && !taxOf(d);

const gstinOf = (vendor: string) => partyNamed(vendor)?.gstin || "";
const panOf = (vendor: string) => gstinOf(vendor).slice(2, 12);

/** Duplicates: within the batch, and against what is already in the books. */
const duplicateOf = (company: string, d: InboxItem, before: InboxItem[]) => {
  const same = (vendor?: string, no?: string) =>
    norm(vendor || "") === norm(d.vendor || "") &&
    norm(no || "") === norm(d.bill?.supplierInvoiceNo || "");
  const inBatch = before.find((x) => same(x.vendor, x.bill?.supplierInvoiceNo));
  if (inBatch)
    return `Same bill as ${inBatch.file.name} in this batch (${d.source.channel === "whatsapp" ? "a WhatsApp photo of it" : "sent twice"})`;
  const inBooks = getState().items.find(
    (x) =>
      x.company === company &&
      x.status !== "Deleted" &&
      same(x.form.party, x.form.invoiceNo)
  );
  if (inBooks)
    return `Already ${inBooks.status === "Approved" ? "posted" : "in the Inbox"} as ${inBooks.form.voucherNo || inBooks.id}${inBooks.batch ? ` (batch ${inBooks.batch.id})` : ""}`;
  return "";
};

/** The questions, one per kind of exception, each with Neo's suggestion. */
const questionsFor = (b: Batch): BatchQuestion[] => {
  const docs = docsOf(b);
  const out: BatchQuestion[] = [];

  const goods = docs.filter(isGoods);
  if (goods.length && b.settingSources.freightLedger === "instruction")
    out.push({
      id: "goods",
      text: `${goods.length} bill${goods.length === 1 ? "" : "s"} from ${[...new Set(goods.map((d) => d.vendor))].join(", ")} ${goods.length === 1 ? "is" : "are"} goods, not freight.`,
      detail: `HSN ${goods[0].bill?.items[0].hsn} with a quantity and rate. Your instruction sends freight to ${b.settings.freightLedger}; these are stock.`,
      docIds: goods.map((d) => d.id),
      options: [
        { id: "stock", label: "Book as stock items" },
        { id: "out", label: "Leave them out" },
      ],
      answer: "stock",
    });

  if (b.settings.costCentre && !centreNamed(b.settings.costCentre))
    out.push({
      id: "costCentre",
      text: `There's no cost centre called “${b.settings.costCentre}”.`,
      detail:
        "Your cost centres are departments, projects, regions and channels. The plant's spend sits under Operations elsewhere in your books.",
      docIds: [],
      options: [
        { id: "Operations", label: "Use Operations" },
        { id: "none", label: "No cost centre" },
      ],
      answer: "Operations",
    });

  const fresh = [
    ...new Set(
      docs
        .filter((d) => !vendorInMasters(b.company, d.vendor || ""))
        .map((d) => d.vendor || "")
    ),
  ];
  if (fresh.length)
    out.push({
      id: "newVendors",
      text: `${fresh.join(" and ")} ${fresh.length === 1 ? "isn't" : "aren't"} in your masters.`,
      detail: fresh
        .map((v) => {
          const pan = panOf(v);
          return `${v}: GSTIN ${gstinOf(v)} is valid, ${pan[3] === "C" ? "a company" : pan[3] === "F" ? "a firm" : "PAN type " + pan[3]}`;
        })
        .join(" · "),
      docIds: docs
        .filter((d) => fresh.includes(d.vendor || ""))
        .map((d) => d.id),
      options: [
        {
          id: "create",
          label:
            fresh.length === 1
              ? "Create the vendor with the bill"
              : `Create all ${fresh.length} with their bills`,
        },
        { id: "out", label: "Leave those bills out" },
      ],
      answer: "create",
    });

  if (b.settings.tds === "194C") {
    const declared = docs.filter(
      (d) => MOCK_VENDOR_TDS[d.vendor || ""]?.declaration194C6
    );
    if (declared.length) {
      const v = declared[0].vendor || "";
      const on = new Date(
        MOCK_VENDOR_TDS[v].declaration194C6!
      ).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      out.push({
        id: "c6",
        text: `${v} has declared it owns 10 or fewer goods carriages.`,
        detail: `Section 194C(6): no TDS when the transporter furnishes this declaration with its PAN. Declaration on file, dated ${on}.`,
        docIds: declared.map((d) => d.id),
        options: [
          { id: "nil", label: "No TDS, cite 194C(6)" },
          { id: "deduct", label: "Deduct anyway" },
        ],
        answer: "nil",
      });
    }
  }
  return out;
};

/* -------------------------------------------------------------- register */

const answerOf = (b: Batch, id: BatchQuestion["id"]) =>
  b.questions.find((q) => q.id === id)?.answer;

/** The cost centre the batch books to, once its question is answered. */
const centreFor = (b: Batch) => {
  if (!b.settings.costCentre) return "";
  const named = centreNamed(b.settings.costCentre);
  if (named) return named;
  const a = answerOf(b, "costCentre");
  return a && a !== "none" ? a : "";
};

/**
 * TDS under 194C: 1% for individuals and HUFs, 2% for everyone else (the
 * PAN's fourth letter). Deducted when the bill is over ₹30,000, or the year's
 * total to the vendor goes over ₹1,00,000 — counting this batch in order.
 */
const tdsFor = (
  b: Batch,
  d: InboxItem,
  taxable: number,
  runningTotal: number
) => {
  if (b.settings.tds !== "194C" || !isCarriage(d) || isGoods(d))
    return {
      tds: 0,
      note: isGoods(d) ? "Goods: no 194C" : "No TDS instruction",
    };
  const v = d.vendor || "";
  if (MOCK_VENDOR_TDS[v]?.declaration194C6 && answerOf(b, "c6") !== "deduct")
    return { tds: 0, note: "194C(6) declaration on file" };
  const pan = panOf(v);
  const rate = /[PH]/.test(pan[3] || "") ? 1 : 2;
  const year = runningTotal + taxable;
  if (taxable > 30000 || year > 100000)
    return {
      tds: Math.round((taxable * rate) / 100),
      note: `194C at ${rate}%${taxable > 30000 ? "" : `, year's total ₹${year.toLocaleString("en-IN")} is over ₹1,00,000`}`,
    };
  return {
    tds: 0,
    note: `Below 194C limits: bill under ₹30,000, year's total ₹${year.toLocaleString("en-IN")}`,
  };
};

const buildRows = (b: Batch): BatchRow[] => {
  const docs = docsOf(b);
  const centre = centreFor(b);
  const running = new Map<string, number>();
  const seen: InboxItem[] = [];
  return docs.map((d) => {
    const bill = d.bill!;
    const v = d.vendor || "";
    const taxable = bill.subTotal;
    const gst = taxOf(d);
    const dup = duplicateOf(b.company, d, seen);
    seen.push(d);
    const goods = isGoods(d);
    const fresh = !vendorInMasters(b.company, v);

    let ledger =
      apLedgerForSac(bill.items[0].hsn)?.name || bill.items[0].ledger;
    let ledgerSource: BatchSource = "neo";
    if (goods) {
      ledger = `Stock · ${bill.items[0].desc.split(",")[0]}`;
      ledgerSource = "rule";
    } else if (isFreight(d)) {
      ledger = b.settings.freightLedger;
      ledgerSource = b.settingSources.freightLedger;
    }

    const rcm = isRcm(d) ? Math.round(taxable * 0.05) : 0;
    const prior = running.has(v)
      ? running.get(v)!
      : MOCK_VENDOR_TDS[v]?.priorFyTotal || 0;
    const { tds, note: tdsNote } = dup
      ? { tds: 0, note: "" }
      : tdsFor(b, d, taxable, prior);
    const exempt =
      MOCK_VENDOR_TDS[v]?.declaration194C6 &&
      b.settings.tds === "194C" &&
      answerOf(b, "c6") !== "deduct"
        ? {
            section: "194C",
            reason: `194C(6) declaration on file, dated ${new Date(MOCK_VENDOR_TDS[v].declaration194C6!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
          }
        : undefined;
    if (!dup) running.set(v, prior + taxable);

    const tax = {
      cgst: bill.taxes.cgst || 0,
      sgst: bill.taxes.sgst || 0,
      igst: bill.taxes.igst || 0,
    };
    const lines: BatchLine[] = [
      {
        side: "Dr",
        ledger: goods
          ? `Purchase — ${bill.items[0].desc.split(",")[0]}`
          : ledger,
        amount: taxable,
        note: goods
          ? `${bill.items[0].qty} ${bill.items[0].unit} × ₹${bill.items[0].rate}`
          : centre
            ? `Cost centre ${centre}`
            : undefined,
      },
      ...(tax.igst
        ? [{ side: "Dr" as const, ledger: "Input IGST", amount: tax.igst }]
        : []),
      ...(tax.cgst
        ? [
            { side: "Dr" as const, ledger: "Input CGST", amount: tax.cgst },
            { side: "Dr" as const, ledger: "Input SGST", amount: tax.sgst },
          ]
        : []),
      ...(rcm
        ? [
            {
              side: "Dr" as const,
              ledger: "Input CGST (RCM)",
              amount: rcm / 2,
            },
            {
              side: "Dr" as const,
              ledger: "Input SGST (RCM)",
              amount: rcm / 2,
            },
          ]
        : []),
      {
        side: "Cr",
        ledger: v,
        amount: taxable + gst - tds,
        note: `New ref ${bill.supplierInvoiceNo} · due ${bill.dueDate}`,
      },
      ...(tds
        ? [
            {
              side: "Cr" as const,
              ledger: "TDS Payable — 194C",
              amount: tds,
              note: tdsNote,
            },
          ]
        : []),
      ...(rcm
        ? [
            {
              side: "Cr" as const,
              ledger: "CGST Payable (RCM)",
              amount: rcm / 2,
            },
            {
              side: "Cr" as const,
              ledger: "SGST Payable (RCM)",
              amount: rcm / 2,
            },
          ]
        : []),
    ];

    const leftOut = dup
      ? dup
      : goods && answerOf(b, "goods") === "out"
        ? "Left out: goods, at your answer"
        : fresh && answerOf(b, "newVendors") === "out"
          ? "Left out: vendor not in masters, at your answer"
          : "";
    const status: BatchRow["status"] = leftOut
      ? "left-out"
      : fresh
        ? "new-vendor"
        : ledgerSource === "neo" || rcm
          ? "check"
          : "ready";
    return {
      docId: d.id,
      file: d.file.name,
      vendor: v,
      billNo: bill.supplierInvoiceNo,
      billDate: bill.billDate,
      voucherType: rcm ? "Purchase — Reverse Charge" : "Purchase",
      ledger,
      ledgerSource,
      costCentre: goods ? "" : centre,
      costCentreSource: b.settingSources.costCentre,
      taxable,
      gst,
      rcm,
      tax,
      tds,
      tdsNote,
      fyPrior: prior,
      tdsExempt: exempt,
      total: taxable + gst,
      status,
      note: leftOut
        ? leftOut
        : status === "check" && rcm
          ? "Reverse charge: choose the liability ledger on the form before approving"
          : status === "check" && isFreight(d)
            ? `Your instruction didn't name a freight ledger, so Neo used ${ledger} for the batch's freight bills.`
            : status === "check"
              ? `${bill.items[0].desc.split(" — ")[0]} isn't freight, so the freight rule wasn't applied. Booked to ${ledger}, the ledger this code is filed on.`
              : status === "new-vendor"
                ? "Vendor is created in Tally when this is approved"
                : undefined,
      checked: !leftOut,
      lines,
    };
  });
};

/* ---------------------------------------------------------------- actions */

let seq = 0;
const batchId = () => {
  seq += 1;
  const d = new Date();
  return `B-${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${String(seq).padStart(2, "0")}`;
};

/** The sample documents an upload stands for, by file name. */
export const sampleFor = (name: string) =>
  MOCK_BATCH_DOCUMENTS.find((d) => d.file.name === name);

/**
 * Start a batch: read the instruction into settings. Files that are not
 * among the sample documents are kept as unreadable — this prototype has
 * no extraction for files it hasn't seen.
 */
export const startBatch = (
  instruction: string,
  docIds: string[],
  unreadable: string[] = [],
  company = getState().company
) => {
  const docs = docIds
    .map((id) => MOCK_BATCH_DOCUMENTS.find((d) => d.id === id))
    .filter(Boolean) as InboxItem[];
  const { settings, sources } = readInstruction(instruction, company, docs);
  const batch: Batch = {
    id: batchId(),
    company,
    instruction,
    createdAt: new Date().toISOString(),
    createdBy: actor,
    docIds,
    unreadable,
    stage: "settings",
    settings,
    settingSources: sources,
    questions: [],
    rows: [],
    draftIds: [],
  };
  set({ batches: [batch, ...state.batches] });
  return batch;
};

/** Change one setting by hand: it becomes the accountant's, not Neo's. */
export const setBatchSetting = <K extends BatchSettingKey>(
  id: string,
  key: K,
  value: BatchSettings[K]
) => {
  const b = getBatch(id);
  if (!b || b.stage !== "settings") return;
  patchBatch(id, {
    settings: { ...b.settings, [key]: value },
    settingSources: { ...b.settingSources, [key]: "instruction" },
  });
};

/** Settings confirmed: read the documents against them and ask. */
export const readBatch = (id: string) => {
  const b = getBatch(id);
  if (!b) return;
  const questions = questionsFor(b);
  const next = { ...b, questions };
  patchBatch(id, {
    questions,
    rows: buildRows(next),
    stage: questions.length ? "questions" : "register",
  });
};

export const answerBatch = (
  id: string,
  question: BatchQuestion["id"],
  answer: string
) => {
  const b = getBatch(id);
  if (!b) return;
  const questions = b.questions.map((q) =>
    q.id === question ? { ...q, answer } : q
  );
  patchBatch(id, { questions, rows: buildRows({ ...b, questions }) });
};

export const showRegister = (id: string) => {
  const b = getBatch(id);
  if (!b) return;
  patchBatch(id, { stage: "register", rows: buildRows(b) });
};

export const backToSettings = (id: string) =>
  patchBatch(id, { stage: "settings" });

/** From the register back to the questions, answers kept. */
export const backToQuestions = (id: string) =>
  patchBatch(id, { stage: "questions" });

export const toggleRow = (id: string, docId: string) => {
  const b = getBatch(id);
  if (!b || b.stage !== "register") return;
  patchBatch(id, {
    rows: b.rows.map((r) =>
      r.docId === docId && r.status !== "left-out"
        ? { ...r, checked: !r.checked }
        : r
    ),
  });
};

/** The register's reconciliation: vouchers against the documents' totals. */
export const reconcile = (b: Batch) => {
  const rows = b.rows.filter((r) => r.status !== "left-out");
  const docs = rows.map((r) =>
    MOCK_BATCH_DOCUMENTS.find((d) => d.id === r.docId)!
  );
  const vouchers = rows.reduce((s, r) => s + r.taxable + r.gst, 0);
  const printed = docs.reduce((s, d) => s + (d.bill?.grandTotal || 0), 0);
  return { vouchers, printed, difference: vouchers - printed };
};

/**
 * Sign-off: one draft per ticked row, into Needs Review, prepared by Neo
 * under this batch and its instruction. Each draft is an ordinary Inbox item
 * read from the same document, with the batch's settings applied — the
 * review form and the source document are the ones every bill gets.
 */
export const createBatchDrafts = (id: string) => {
  const b = getBatch(id);
  if (!b || b.stage !== "register") return [];
  const centre = centreFor(b);
  const created: Item[] = [];
  b.rows
    .filter((r) => r.checked && r.status !== "left-out")
    .forEach((r, n) => {
      const doc = structuredClone(
        MOCK_BATCH_DOCUMENTS.find((d) => d.id === r.docId)!
      );
      const bill = doc.bill!;
      if (r.ledgerSource !== "rule")
        bill.items = bill.items.map((l) => ({ ...l, ledger: r.ledger }));
      bill.costCentre = r.costCentre || null;
      doc.voucherType = r.voucherType;
      // What the bill form needs to show the batch's answers, not re-guess.
      doc.neo = {
        ledgerId:
          r.ledgerSource === "rule"
            ? undefined
            : AP_EXPENSE_LEDGERS.find((l) => l.name === r.ledger)?.id,
        costCentreId: COST_CENTRES.find((c) => c.name === r.costCentre)?.id,
        narration: `${b.settings.narration.replace("{bill}", r.billNo)}`,
        fyServices: r.fyPrior,
        tdsExempt: r.tdsExempt,
        reverseChargeRate: r.rcm ? 5 : undefined,
      };
      doc.receivedAt = new Date().toISOString();
      const base = itemFromMock(doc, 700 + n);
      const narration = b.settings.narration.replace("{bill}", r.billNo);
      const item: Item = {
        ...base,
        id: `${doc.id}-${b.id}`,
        company: b.company,
        received: doc.receivedAt,
        reason: `Prepared by Neo in batch ${b.id}, under your instruction.`,
        form: {
          ...base.form,
          gst: b.settings.gstReg || base.form.gst,
          costClassEnabled: !(centre && r.costCentre),
          costCentre: r.costCentre,
          narration,
          date:
            b.settings.dateRule === "entry"
              ? new Date().toISOString().slice(0, 10)
              : base.form.date,
        },
        batch: { id: b.id, instruction: b.instruction },
      };
      created.push(neoCreate(item, b.id));
    });
  logActivity(
    {
      company: b.company,
      actor: { kind: "ai", name: "Neo · Voucher entry" },
      kind: "predicted",
      module: "Purchases",
      action: `Entered batch ${b.id}`,
      subject: `${created.length} purchase drafts`,
      reason: `Under instruction from ${b.createdBy}: “${b.instruction}”`,
      undoable: true,
    },
    () => undoBatch(id)
  );
  patchBatch(id, {
    stage: "created",
    draftIds: created.map((x) => x.id),
  });
  return created;
};

/** Undo the batch: every draft nobody has touched goes; the rest stay. */
export const undoBatch = (id: string) => {
  const b = getBatch(id);
  if (!b) return { reversed: [] as string[], skipped: [] as string[] };
  const drafts = getState().items.filter((x) => b.draftIds.includes(x.id));
  const result = neoDiscard(drafts, id);
  patchBatch(id, {
    stage: result.reversed.length === b.draftIds.length ? "undone" : b.stage,
    draftIds: b.draftIds.filter((d) => !result.reversed.includes(d)),
  });
  return result;
};

/**
 * Drafts that can be approved together: nothing on them was Neo's own
 * guess, no new vendor, still waiting. Approving is the accountant's click.
 */
export const cleanDrafts = (b: Batch) => {
  const ready = new Set(
    b.rows.filter((r) => r.status === "ready").map((r) => `${r.docId}-${b.id}`)
  );
  return getState().items.filter(
    (x) =>
      b.draftIds.includes(x.id) &&
      ready.has(x.id) &&
      x.status === "Needs Review"
  );
};

export const approveClean = (id: string): BulkResult | undefined => {
  const b = getBatch(id);
  if (!b) return;
  return applyBulkAction(
    cleanDrafts(b).map((x) => x.id),
    "Approve"
  );
};

/** The instruction's freight rule, offered as client policy. */
export const policyFor = (b: Batch) => ({
  text: `Freight and cartage bills go to ${b.settings.freightLedger}`,
  covered: b.rows.filter(
    (r) => r.status !== "left-out" && r.ledger === b.settings.freightLedger
  ).length,
});

export const saveBatchPolicy = (id: string) => {
  const b = getBatch(id);
  if (!b || b.policySaved) return;
  savePolicies(b.company, [
    {
      id: `policy-${b.id}`,
      company: b.company,
      text: policyFor(b).text,
      condition: { description: "freight|cartage" },
      action: { ledger: b.settings.freightLedger },
      active: true,
    },
  ]);
  patchBatch(id, { policySaved: true });
};

/** Drafts of a batch, as they stand now. */
export const batchDrafts = (b: Batch) =>
  getState().items.filter((x) => b.draftIds.includes(x.id));
