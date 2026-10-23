import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ResponseARVoucherImportBatch,
  type ResponseARVoucherImportPreviewRow,
  type ResponseARVoucherImportTemplate,
  type MappingConfigPayload,
  type MappingEntry,
  type MappingFieldSelector,
  type SalesCustomerMaster,
  type SampleSalesFile,
  type SheetTable,
} from "@/types/pages/inbox/sales-upload";
import {
  buildPreviewRows,
  readSheet,
  withIssues,
  withRowCounts,
  type FieldMappings,
} from "@/utils/pages/inbox/sales-upload";

/**
 * Mock responses for the Sales upload flow, shaped as the AR v2 import
 * endpoints return them (camelCase). Each block names the endpoint it stands
 * in for.
 */

/* -------------------------------------------------------------- the "file" */

type Line = {
  date: string;
  invoiceNo: string;
  customer: string;
  gstin: string;
  pos: string;
  item: string;
  hsn: string;
  qty: number;
  rate: number;
  /** Inter-state: IGST in place of CGST + SGST. */
  inter?: boolean;
  /** A total typed wrong in the source sheet. */
  totalOverride?: number;
  /** The buyer's purchase order, where the customer quoted one. */
  orderNo?: string;
  orderDate?: string;
};

const ITEMS: Record<string, { name: string; hsn: string }> = {
  sun: { name: "Refined Sunflower Oil 15L Tin", hsn: "1512" },
  gnut: { name: "Refined Groundnut Oil 15L Tin", hsn: "1508" },
  bran: { name: "Rice Bran Oil 1L Pouch", hsn: "1515" },
  palm: { name: "Palm Olein 15kg Tin", hsn: "1511" },
  mus: { name: "Kachi Ghani Mustard Oil 1L", hsn: "1514" },
};

const line = (
  date: string,
  invoiceNo: string,
  customer: string,
  gstin: string,
  pos: string,
  item: keyof typeof ITEMS,
  qty: number,
  rate: number,
  extra: Partial<Line> = {}
): Line => ({
  date,
  invoiceNo: `SOR/26-27/${invoiceNo}`,
  customer,
  gstin,
  pos,
  item: ITEMS[item].name,
  hsn: ITEMS[item].hsn,
  qty,
  rate,
  ...extra,
});

/*
  A month of the Harihar refinery's sales register, as Tally exports it. The
  awkward rows are deliberate — they are what the preview exists to catch:
  0417 and 0421 name customers the masters do not know, 0416 and 0428 are a
  registered customer with no GSTIN on file, 0420 and 0425 carry totals that
  do not add up, and 0425 and 0430 have five-digit HSN codes. The modern-trade
  buyers quote a PO; 0418's came without its date, which only matters once
  Order Details is switched on and the columns are mapped.
*/
// prettier-ignore
const LINES: Line[] = [
  line("01/09/2026", "0412", "Sri Lakshmi Traders", "29AAYFS1040D1Z2", "Karnataka", "sun", 40, 2150),
  line("02/09/2026", "0413", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "gnut", 25, 2650),
  line("02/09/2026", "0413", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "bran", 240, 145),
  line("03/09/2026", "0414", "Reliance Retail Ltd", "27AATCR8983C1ZM", "Maharashtra", "sun", 120, 2100, { inter: true, orderNo: "RRL/PO/55120", orderDate: "28/08/2026" }),
  line("04/09/2026", "0415", "Hotel Mayura Group", "29AAZCH6289B1ZT", "Karnataka", "palm", 30, 1720),
  line("05/09/2026", "0416", "Vijaya Provisions", "", "Karnataka", "mus", 60, 168),
  line("06/09/2026", "0417", "Sri Lakshmi Trader", "29AAYFS1040D1Z2", "Karnataka", "gnut", 20, 2650),
  line("08/09/2026", "0418", "Spar Hypermarket", "29AAKCM9936L1ZI", "Karnataka", "bran", 480, 142, { orderNo: "SPAR/PO/7781" }),
  line("09/09/2026", "0419", "Chennai Oil Depot", "33AAWFC7539W1Z4", "Tamil Nadu", "palm", 80, 1700, { inter: true, orderNo: "COD/0912", orderDate: "05/09/2026" }),
  line("10/09/2026", "0420", "Malabar Foods", "32AAVCM9572N1ZG", "Kerala", "sun", 50, 2150, { inter: true, totalOverride: 112785 }),
  line("11/09/2026", "0421", "Green Leaf Caterers", "29AAQFG5381H1ZU", "Karnataka", "gnut", 8, 2650),
  line("12/09/2026", "0422", "Hotel Mayura Group", "29AAZCH6289B1ZT", "Karnataka", "sun", 15, 2150),
  line("13/09/2026", "0423", "Reliance Retail Ltd", "27AATCR8983C1ZM", "Maharashtra", "mus", 600, 160, { inter: true, orderNo: "RRL/PO/55871", orderDate: "09/09/2026" }),
  line("15/09/2026", "0424", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "palm", 45, 1720),
  line("16/09/2026", "0425", "Spar Hypermarket", "29AAKCM9936L1ZI", "Karnataka", "sun", 60, 2125, { hsn: "15121", totalOverride: 135000 }),
  line("17/09/2026", "0426", "Sri Lakshmi Traders", "29AAYFS1040D1Z2", "Karnataka", "bran", 300, 145),
  line("18/09/2026", "0427", "Chennai Oil Depot", "33AAWFC7539W1Z4", "Tamil Nadu", "gnut", 40, 2600, { inter: true }),
  line("19/09/2026", "0428", "Vijaya Provisions", "", "Karnataka", "sun", 10, 2150),
  line("22/09/2026", "0429", "Malabar Foods", "32AAVCM9572N1ZG", "Kerala", "bran", 200, 145, { inter: true }),
  line("23/09/2026", "0430", "Hotel Mayura Group", "29AAZCH6289B1ZT", "Karnataka", "gnut", 12, 2650, { hsn: "15081" }),
  line("24/09/2026", "0431", "Reliance Retail Ltd", "27AATCR8983C1ZM", "Maharashtra", "palm", 150, 1690, { inter: true, orderNo: "RRL/PO/56240", orderDate: "20/09/2026" }),
  line("25/09/2026", "0432", "Sri Lakshmi Traders", "29AAYFS1040D1Z2", "Karnataka", "mus", 90, 168),
  line("25/09/2026", "0432", "Sri Lakshmi Traders", "29AAYFS1040D1Z2", "Karnataka", "sun", 20, 2150),
  line("26/09/2026", "0433", "Spar Hypermarket", "29AAKCM9936L1ZI", "Karnataka", "gnut", 30, 2640),
  line("29/09/2026", "0434", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "mus", 120, 165),
];

const r2 = (n: number) => Math.round(n * 100) / 100;

export const SALES_UPLOAD_HEADER = [
  "Invoice Date",
  "Invoice No",
  "Customer",
  "GSTIN",
  "Place of Supply",
  "Item",
  "HSN",
  "Qty",
  "Rate",
  "Taxable Value",
  "CGST",
  "SGST",
  "IGST",
  "Total",
  "Buyer's Order No",
  "Order Date",
];

const REGISTER_ROWS = LINES.map((l) => {
  const taxable = r2(l.qty * l.rate);
  const half = r2(taxable * 0.025);
  const igst = l.inter ? r2(taxable * 0.05) : 0;
  const cgst = l.inter ? 0 : half;
  const total = l.totalOverride ?? r2(taxable + cgst + cgst + igst);
  return [
    l.date,
    l.invoiceNo,
    l.customer,
    l.gstin,
    l.pos,
    l.item,
    l.hsn,
    l.qty,
    l.rate,
    taxable,
    cgst,
    cgst,
    igst,
    total,
    l.orderNo ?? "",
    l.orderDate ?? "",
  ];
});

/*
  The same month as the distributors' desk keeps it: one invoice per row, its
  products side by side (Product 1, Product 2), freight and packing charged on
  top, a cash discount taken off. It is what Map Fields' items, ledgers,
  summed columns and negative adjustments are for — the suggestion maps two
  items and sums Freight + Packing into Ledger 1, but leaves Discount Allowed
  alone, so until it is added to Ledger 1 as a negative adjustment the
  discounted rows don't add up.
*/
const WIDE_HEADER = [
  "Bill Date",
  "Bill No",
  "Party",
  "Product 1",
  "Qty 1",
  "Rate 1",
  "Amount 1",
  "Product 2",
  "Qty 2",
  "Rate 2",
  "Amount 2",
  "Freight",
  "Packing",
  "Discount Allowed",
  "CGST",
  "SGST",
  "IGST",
  "Grand Total",
];
type WideLine = [
  string,
  string,
  string,
  keyof typeof ITEMS,
  number,
  number,
  keyof typeof ITEMS | null,
  number,
  number,
  number,
  number,
  number,
  boolean,
];
// prettier-ignore
const WIDE: WideLine[] = [
  ["01/09/2026", "D/0101", "Sri Lakshmi Traders", "sun", 20, 2150, "gnut", 10, 2650, 850, 240, 0, false],
  ["03/09/2026", "D/0102", "Annapoorna Wholesale", "bran", 200, 145, null, 0, 0, 600, 120, 500, false],
  ["05/09/2026", "D/0103", "Chennai Oil Depot", "palm", 40, 1700, "sun", 15, 2150, 1800, 300, 0, true],
  ["08/09/2026", "D/0104", "Hotel Mayura Group", "gnut", 12, 2650, "mus", 60, 168, 450, 0, 300, false],
  ["10/09/2026", "D/0105", "Malabar Foods", "sun", 30, 2150, null, 0, 0, 1200, 180, 0, true],
  ["12/09/2026", "D/0106", "Spar Hypermarket", "bran", 300, 142, "mus", 120, 165, 900, 260, 1000, false],
  ["15/09/2026", "D/0107", "Vijaya Provisions", "mus", 40, 168, null, 0, 0, 250, 60, 0, false],
  ["18/09/2026", "D/0108", "Reliance Retail Ltd", "palm", 60, 1690, "gnut", 25, 2600, 2200, 400, 1500, true],
];
const WIDE_ROWS = WIDE.map(
  ([
    date,
    no,
    party,
    p1,
    q1,
    rate1,
    p2,
    q2,
    rate2,
    freight,
    packing,
    discount,
    inter,
  ]) => {
    const a1 = r2(q1 * rate1);
    const a2 = p2 ? r2(q2 * rate2) : 0;
    const taxable = r2(a1 + a2 + freight + packing - discount);
    const igst = inter ? r2(taxable * 0.05) : 0;
    const half = inter ? 0 : r2(taxable * 0.025);
    return [
      date,
      `SOR/26-27/${no}`,
      party,
      ITEMS[p1].name,
      q1,
      rate1,
      a1,
      p2 ? ITEMS[p2].name : "",
      p2 ? q2 : "",
      p2 ? rate2 : "",
      p2 ? a2 : "",
      freight,
      packing,
      discount,
      half,
      half,
      igst,
      r2(taxable + half + half + igst),
    ];
  }
);

/**
 * What every simulated upload contains: the register, and the same month
 * laid out wide on a second sheet. DEV: the backend reads the real file —
 * GET .../import-batches/:id/mapping returns its sheets, the columns of the
 * one picked, and sample rows.
 */
const CELLS: SampleSalesFile["cells"] = {
  "Sales Register": [SALES_UPLOAD_HEADER, ...REGISTER_ROWS],
  "Invoices (wide)": [WIDE_HEADER, ...WIDE_ROWS],
};
export const SAMPLE_SALES_FILE: SampleSalesFile = {
  sheets: Object.entries(CELLS).map(([name, cells]) => ({
    name,
    rowCount: cells.length,
    dataRowCount: cells.length - 1,
  })),
  cells: CELLS,
};
export const REGISTER_TABLE = readSheet(SAMPLE_SALES_FILE, "Sales Register", 1);

/** A CSV of the sample, for the sample-template download buttons. */
export const sampleCsv = (mode: "item" | "accounting") => {
  const header =
    mode === "item"
      ? SALES_UPLOAD_HEADER
      : SALES_UPLOAD_HEADER.filter(
          (h) => !["Item", "HSN", "Qty", "Rate"].includes(h)
        );
  const rows = REGISTER_ROWS.slice(0, 3).map((row) =>
    SALES_UPLOAD_HEADER.map((h, i) =>
      header.includes(h) ? row[i] : null
    ).filter((v) => v !== null)
  );
  return [header, ...rows]
    .map((r) => r.map((v) => `"${String(v)}"`).join(","))
    .join("\n");
};

/* ------------------------------------------------------------------ mapping */

type Target =
  ARKey | { collection: "items" | "ledgers"; index: number; field: ARKey };
type ARKey = Extract<MappingFieldSelector, string>;

const item = (index: number, field: ARKey): Target => ({
  collection: "items",
  index,
  field,
});
const ledger = (index: number, field: ARKey): Target => ({
  collection: "ledgers",
  index,
  field,
});

/*
  What the backend's AI recognises, column name → field, per mode. "Taxable
  Value" reads as Item 1's amount in Item Mode; in Accounting Mode the AI
  isn't sure it is the ledger amount, so Ledger 1 waits on the accountant —
  the required-fields banner has something to say. GSTIN is not a mapping
  field: production takes it from the customer master.

  PROTOTYPE: Place of Supply is not a mapping field either — the state comes
  from the customer master. The order columns map to Order Details, off by
  default, so they are held back until it is switched on.
*/
const RECOGNISED: Record<VoucherViewMode, [string, Target][]> = {
  [VoucherViewMode.ITEM_MODE]: [
    ["Invoice Date", "invoice_date"],
    ["Bill Date", "invoice_date"],
    ["Invoice No", "reference_number"],
    ["Bill No", "reference_number"],
    ["Customer", "customer_name"],
    ["Party", "customer_name"],
    ["Item", item(0, "item_name")],
    ["HSN", item(0, "hsn_sac")],
    ["Qty", item(0, "quantity")],
    ["Rate", item(0, "unit_rate")],
    ["Taxable Value", item(0, "item_amount")],
    ["Product 1", item(0, "item_name")],
    ["Qty 1", item(0, "quantity")],
    ["Rate 1", item(0, "unit_rate")],
    ["Amount 1", item(0, "item_amount")],
    ["Product 2", item(1, "item_name")],
    ["Qty 2", item(1, "quantity")],
    ["Rate 2", item(1, "unit_rate")],
    ["Amount 2", item(1, "item_amount")],
    ["Freight", ledger(0, "ledger_amount")],
    ["Packing", ledger(0, "ledger_amount")],
    ["CGST", "cgst_amount"],
    ["SGST", "sgst_amount"],
    ["IGST", "igst_amount"],
    ["Total", "total_amount"],
    ["Grand Total", "total_amount"],
    ["Buyer's Order No", "order_no"],
    ["Order Date", "order_date"],
  ],
  [VoucherViewMode.ACCOUNTING_MODE]: [
    ["Invoice Date", "invoice_date"],
    ["Bill Date", "invoice_date"],
    ["Invoice No", "reference_number"],
    ["Bill No", "reference_number"],
    ["Customer", "customer_name"],
    ["Party", "customer_name"],
    ["Item", ledger(0, "ledger_description")],
    ["Product 1", ledger(0, "ledger_description")],
    ["Amount 1", ledger(0, "ledger_amount")],
    ["Amount 2", ledger(0, "ledger_amount")],
    ["Freight", ledger(1, "ledger_amount")],
    ["Packing", ledger(1, "ledger_amount")],
    ["CGST", "cgst_amount"],
    ["SGST", "sgst_amount"],
    ["IGST", "igst_amount"],
    ["Total", "total_amount"],
    ["Grand Total", "total_amount"],
    ["Buyer's Order No", "order_no"],
    ["Order Date", "order_date"],
  ],
};

/**
 * PROTOTYPE: the backend's suggested mapping (`mappingPayload`) for the
 * columns read — what Reset Mapping and a new sheet or header row go back to.
 * A header row that isn't the real one reads as data, so nothing matches.
 * Two columns suggested for one amount are summed, as the field allows.
 */
export const suggestMapping = (
  table: SheetTable,
  mode: VoucherViewMode
): {
  fieldMappings: FieldMappings;
  items: MappingEntry[];
  ledgers: MappingEntry[];
} => {
  const fieldMappings: FieldMappings = {};
  const entries = {
    items: [] as MappingEntry[],
    ledgers: [] as MappingEntry[],
  };
  const add = (fields: FieldMappings, key: ARKey, column: string) => {
    const columns = [...(fields[key]?.sourceColumns ?? []), column];
    fields[key] = {
      sourceColumns: columns,
      ...(columns.length > 1 ? { transform: "sum" as const } : {}),
    };
  };
  for (const [column, target] of RECOGNISED[mode]) {
    if (!table.header.includes(column)) continue;
    if (typeof target === "string") add(fieldMappings, target, column);
    else {
      const list = entries[target.collection];
      while (list.length <= target.index)
        list.push({ id: crypto.randomUUID(), fields: {} });
      add(list[target.index].fields, target.field, column);
    }
  }
  for (const list of [entries.items, entries.ledgers])
    if (!list.length) list.push({ id: crypto.randomUUID(), fields: {} });
  return { fieldMappings, ...entries };
};

const REGISTER_ITEM_ONE = {
  item_name: { sourceColumns: ["Item"] },
  hsn_sac: { sourceColumns: ["HSN"] },
  quantity: { sourceColumns: ["Qty"] },
  unit_rate: { sourceColumns: ["Rate"] },
  item_amount: { sourceColumns: ["Taxable Value"] },
};
const REGISTER_HEADER: FieldMappings = {
  invoice_date: { sourceColumns: ["Invoice Date"] },
  reference_number: { sourceColumns: ["Invoice No"] },
  customer_name: { sourceColumns: ["Customer"] },
  cgst_amount: { sourceColumns: ["CGST"] },
  sgst_amount: { sourceColumns: ["SGST"] },
  igst_amount: { sourceColumns: ["IGST"] },
  total_amount: { sourceColumns: ["Total"] },
};

/** A finished Item Mode mapping of the register, as a reviewed batch holds it. */
export const completeRegisterDraft = (): MappingConfigPayload => ({
  payloadType: "mapping_config",
  importMode: VoucherViewMode.ITEM_MODE,
  selection: { selectedSheetName: "Sales Register", headerRowIndex: 1 },
  options: { dateFormat: "dd/MM/yyyy", discountType: "percentage" },
  fieldMappings: REGISTER_HEADER,
  items: [{ id: "seed-item-1", fields: REGISTER_ITEM_ONE }],
  ledgers: [{ id: "seed-ledger-1", fields: {} }],
});

/**
 * GET /api/accounts-receivable/v2/import-templates. The Tally one was saved
 * from this register, so it fits every simulated upload and the batch goes
 * straight to preview. The Zoho one was saved from a Zoho Books export — its
 * columns ("Invoice Number", "Item Total"…) aren't in this file, so the
 * batch stops at Map Fields with "Template mismatch detected".
 */
export const MOCK_IMPORT_TEMPLATES: ResponseARVoucherImportTemplate[] = [
  {
    templateUuid: "tpl-tally-sales-register",
    name: "Tally Sales Register (Item)",
    importMode: VoucherViewMode.ITEM_MODE,
    configPayload: {
      selection: { selectedSheetName: "Sales Register", headerRowIndex: 1 },
      options: { dateFormat: "dd/MM/yyyy", discountType: "percentage" },
      fieldMappings: REGISTER_HEADER,
      items: [{ id: "tpl-tally-item-1", fields: REGISTER_ITEM_ONE }],
      ledgers: [{ id: "tpl-tally-ledger-1", fields: {} }],
    },
    createdAt: "2026-08-04T06:10:00.000Z",
    updatedAt: "2026-08-04T06:10:00.000Z",
  },
  {
    templateUuid: "tpl-zoho-invoice-export",
    name: "Zoho Invoice Export",
    importMode: VoucherViewMode.ACCOUNTING_MODE,
    configPayload: {
      selection: { selectedSheetName: "Sales Register", headerRowIndex: 1 },
      options: { dateFormat: "yyyy-MM-dd", discountType: "amount" },
      fieldMappings: {
        invoice_date: { sourceColumns: ["Invoice Date"] },
        reference_number: { sourceColumns: ["Invoice Number"] },
        customer_name: { sourceColumns: ["Customer Name"] },
        total_amount: { sourceColumns: ["Total"] },
      },
      items: [{ id: "tpl-zoho-item-1", fields: {} }],
      ledgers: [
        {
          id: "tpl-zoho-ledger-1",
          fields: {
            ledger_name: { sourceColumns: ["Account"] },
            ledger_amount: { sourceColumns: ["Item Total"] },
          },
        },
      ],
    },
    createdAt: "2026-07-21T09:40:00.000Z",
    updatedAt: "2026-07-21T09:40:00.000Z",
  },
];

/* ------------------------------------------------------------------ masters */

/** GET /api/accounts/grouped-customer-accounts-list-taxes (trimmed). */
export const MOCK_SALES_CUSTOMERS: SalesCustomerMaster[] = [
  {
    name: "Sri Lakshmi Traders",
    gstin: "29AAYFS1040D1Z2",
    state: "Karnataka",
    costCentre: "Retail",
  },
  {
    name: "Annapoorna Wholesale",
    gstin: "29AAFFA8764Y1Z3",
    state: "Karnataka",
    costCentre: "Wholesale",
  },
  {
    name: "Reliance Retail Ltd",
    gstin: "27AATCR8983C1ZM",
    state: "Maharashtra",
    costCentre: "Modern Trade",
  },
  {
    name: "Hotel Mayura Group",
    gstin: "29AAZCH6289B1ZT",
    state: "Karnataka",
    costCentre: "HoReCa",
  },
  {
    name: "Vijaya Provisions",
    gstin: "",
    state: "Karnataka",
    costCentre: "Retail",
  },
  {
    name: "Spar Hypermarket",
    gstin: "29AAKCM9936L1ZI",
    state: "Karnataka",
    costCentre: "Modern Trade",
  },
  {
    name: "Chennai Oil Depot",
    gstin: "33AAWFC7539W1Z4",
    state: "Tamil Nadu",
    costCentre: "Wholesale",
  },
  {
    name: "Malabar Foods",
    gstin: "32AAVCM9572N1ZG",
    state: "Kerala",
    costCentre: "Wholesale",
  },
];

/** The company's own registration, which every row is raised under. */
export const SALES_GST_REGISTRATION = "29AAWCS8421F1ZR · Karnataka";

/* ------------------------------------------------------------------ batches */

const batch = (
  overrides: Partial<ResponseARVoucherImportBatch> &
    Pick<
      ResponseARVoucherImportBatch,
      "importBatchUuid" | "originalFileName" | "status" | "createdAt"
    >
): ResponseARVoucherImportBatch => ({
  aiProcessedRowCount: 0,
  fileUuid: `${overrides.importBatchUuid}-file`,
  selectedTemplateUuid: null,
  selectedTemplateName: null,
  fileType: overrides.originalFileName.split(".").pop() ?? "xlsx",
  fileSizeBytes: 48_213,
  importMode: VoucherViewMode.ITEM_MODE,
  selectedSheetName: "Sales Register",
  headerRowIndex: 1,
  dateFormat: "dd/MM/yyyy",
  discountType: "percentage",
  totalRows: 0,
  pendingRows: 0,
  readyRows: 0,
  warningRows: 0,
  errorRows: 0,
  createdRows: 0,
  issueCountsPayload: {},
  failureCode: null,
  failureMessage: null,
  failureDetailPayload: null,
  updatedAt: overrides.createdAt,
  ...overrides,
});

const previewOf = (batchId: string, limit?: number) =>
  buildPreviewRows({
    file: REGISTER_TABLE,
    draft: completeRegisterDraft(),
    masters: MOCK_SALES_CUSTOMERS,
    gstRegistration: SALES_GST_REGISTRATION,
    batchId,
    limit,
  });

/** Every row created: the issues were fixed before Create. */
const allCreated = (rows: ResponseARVoucherImportPreviewRow[]) =>
  rows.map((row) => ({
    ...withIssues(row, []),
    rowStatus: "created" as const,
  }));

/** The first `count` clean rows already created; the rest still in review. */
const someCreated = (
  rows: ResponseARVoucherImportPreviewRow[],
  count: number
) => {
  let left = count;
  return rows.map((row) =>
    row.rowStatus === "ready" && left-- > 0
      ? { ...row, rowStatus: "created" as const }
      : row
  );
};

export type MockSalesBatch = {
  batch: ResponseARVoucherImportBatch;
  /** GET .../import-batches/:id/preview `results`. */
  rows: ResponseARVoucherImportPreviewRow[];
};

/**
 * GET /api/accounts-receivable/v2/import-batches, one company's history:
 * one batch finished, one part-way through review, one the reader rejected.
 * Ids are scoped by the caller so each company has its own.
 */
export const mockSalesBatches = (scope: string): MockSalesBatch[] => {
  if (scope === "nandhini") {
    return ["2026-09", "2026-10"].map((period, index) => {
      const id = `nandhini-pos-${period}`;
      const rows = buildPreviewRows({
        file: {
          header: REGISTER_TABLE.header,
          rows: Array.from({ length: 12 }, (_, n) => {
            const qty = 25 + n * 3,
              rate = 240,
              net = qty * rate;
            return [
              `${period}-${String(n + 1).padStart(2, "0")}`,
              `ND/POS/${period}/${n + 1}`,
              "Walk-in Customers",
              "",
              "Karnataka",
              "Restaurant meals",
              "996331",
              qty,
              rate,
              net,
              net * 0.025,
              net * 0.025,
              0,
              net * 1.05,
              "",
              "",
            ];
          }),
        },
        draft: completeRegisterDraft(),
        masters: [
          {
            name: "Walk-in Customers",
            gstin: "",
            state: "Karnataka",
            costCentre: "JP Nagar",
          },
        ],
        gstRegistration: "29AADCN5532H1ZD · Karnataka",
        batchId: id,
      });
      const prepared = index === 0 ? allCreated(rows) : rows;
      return {
        batch: withRowCounts(
          batch({
            importBatchUuid: id,
            originalFileName: `Nandhini_POS_${period}.csv`,
            fileType: "csv",
            status:
              index === 0
                ? ARVoucherImportBatchStatus.COMPLETE
                : ARVoucherImportBatchStatus.NEEDS_REVIEW,
            createdAt: `${period}-14T07:15:00.000Z`,
            aiProcessedRowCount: rows.length,
          }),
          prepared
        ),
        rows: prepared,
      };
    });
  }
  const complete = `${scope}-aug-register`;
  const review = `${scope}-sep-week3`;
  const failed = `${scope}-export-v2`;
  const completeRows = allCreated(previewOf(complete, 18));
  const reviewRows = someCreated(previewOf(review), 6);
  return [
    {
      batch: withRowCounts(
        batch({
          importBatchUuid: failed,
          originalFileName: "invoices_export_v2.xls",
          status: ARVoucherImportBatchStatus.FAILED,
          createdAt: "2026-09-30T11:42:00.000Z",
          failureCode: "header_row_not_found",
          failureMessage:
            "We couldn't find a header row in this file. Check the sheet and upload it again.",
        }),
        []
      ),
      rows: [],
    },
    {
      batch: withRowCounts(
        batch({
          importBatchUuid: review,
          originalFileName: "sales-sep-week3.csv",
          fileType: "csv",
          status: ARVoucherImportBatchStatus.NEEDS_REVIEW,
          createdAt: "2026-09-28T07:15:00.000Z",
          aiProcessedRowCount: reviewRows.length,
        }),
        reviewRows
      ),
      rows: reviewRows,
    },
    {
      batch: withRowCounts(
        batch({
          importBatchUuid: complete,
          originalFileName: "sales-register-aug-2026.xlsx",
          status: ARVoucherImportBatchStatus.COMPLETE,
          createdAt: "2026-09-12T05:03:00.000Z",
          selectedTemplateUuid: "tpl-tally-sales-register",
          selectedTemplateName: "Tally Sales Register (Item)",
          aiProcessedRowCount: completeRows.length,
        }),
        completeRows
      ),
      rows: completeRows,
    },
  ];
};
