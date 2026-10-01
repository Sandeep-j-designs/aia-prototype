import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ResponseARVoucherImportBatch,
  type ResponseARVoucherImportPreviewRow,
  type ResponseARVoucherImportTemplate,
  type SalesCustomerMaster,
  type SampleSalesFile,
} from "@/types/pages/inbox/sales-upload";
import {
  buildPreviewRows,
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
  do not add up, and 0425 and 0430 have five-digit HSN codes.
*/
// prettier-ignore
const LINES: Line[] = [
  line("01/09/2026", "0412", "Sri Lakshmi Traders", "29AAYFS1040D1Z2", "Karnataka", "sun", 40, 2150),
  line("02/09/2026", "0413", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "gnut", 25, 2650),
  line("02/09/2026", "0413", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "bran", 240, 145),
  line("03/09/2026", "0414", "Reliance Retail Ltd", "27AATCR8983C1ZM", "Maharashtra", "sun", 120, 2100, { inter: true }),
  line("04/09/2026", "0415", "Hotel Mayura Group", "29AAZCH6289B1ZT", "Karnataka", "palm", 30, 1720),
  line("05/09/2026", "0416", "Vijaya Provisions", "", "Karnataka", "mus", 60, 168),
  line("06/09/2026", "0417", "Sri Lakshmi Trader", "29AAYFS1040D1Z2", "Karnataka", "gnut", 20, 2650),
  line("08/09/2026", "0418", "Spar Hypermarket", "29AAKCM9936L1ZI", "Karnataka", "bran", 480, 142),
  line("09/09/2026", "0419", "Chennai Oil Depot", "33AAWFC7539W1Z4", "Tamil Nadu", "palm", 80, 1700, { inter: true }),
  line("10/09/2026", "0420", "Malabar Foods", "32AAVCM9572N1ZG", "Kerala", "sun", 50, 2150, { inter: true, totalOverride: 112785 }),
  line("11/09/2026", "0421", "Green Leaf Caterers", "29AAQFG5381H1ZU", "Karnataka", "gnut", 8, 2650),
  line("12/09/2026", "0422", "Hotel Mayura Group", "29AAZCH6289B1ZT", "Karnataka", "sun", 15, 2150),
  line("13/09/2026", "0423", "Reliance Retail Ltd", "27AATCR8983C1ZM", "Maharashtra", "mus", 600, 160, { inter: true }),
  line("15/09/2026", "0424", "Annapoorna Wholesale", "29AAFFA8764Y1Z3", "Karnataka", "palm", 45, 1720),
  line("16/09/2026", "0425", "Spar Hypermarket", "29AAKCM9936L1ZI", "Karnataka", "sun", 60, 2125, { hsn: "15121", totalOverride: 135000 }),
  line("17/09/2026", "0426", "Sri Lakshmi Traders", "29AAYFS1040D1Z2", "Karnataka", "bran", 300, 145),
  line("18/09/2026", "0427", "Chennai Oil Depot", "33AAWFC7539W1Z4", "Tamil Nadu", "gnut", 40, 2600, { inter: true }),
  line("19/09/2026", "0428", "Vijaya Provisions", "", "Karnataka", "sun", 10, 2150),
  line("22/09/2026", "0429", "Malabar Foods", "32AAVCM9572N1ZG", "Kerala", "bran", 200, 145, { inter: true }),
  line("23/09/2026", "0430", "Hotel Mayura Group", "29AAZCH6289B1ZT", "Karnataka", "gnut", 12, 2650, { hsn: "15081" }),
  line("24/09/2026", "0431", "Reliance Retail Ltd", "27AATCR8983C1ZM", "Maharashtra", "palm", 150, 1690, { inter: true }),
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
];

/**
 * What every simulated upload contains. DEV: the backend reads the real file
 * — GET .../import-batches/:id/mapping returns its columns and sample rows.
 */
export const SAMPLE_SALES_FILE: SampleSalesFile = {
  sheets: [
    {
      name: "Sales Register",
      rowCount: LINES.length + 1,
      dataRowCount: LINES.length,
    },
    { name: "Summary", rowCount: 14, dataRowCount: 12 },
  ],
  header: SALES_UPLOAD_HEADER,
  rows: LINES.map((l) => {
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
    ];
  }),
};

/** A CSV of the sample, for the sample-template download buttons. */
export const sampleCsv = (mode: "item" | "accounting") => {
  const header =
    mode === "item"
      ? SALES_UPLOAD_HEADER
      : SALES_UPLOAD_HEADER.filter(
          (h) => !["Item", "HSN", "Qty", "Rate"].includes(h)
        );
  const rows = SAMPLE_SALES_FILE.rows
    .slice(0, 3)
    .map((row) =>
      SALES_UPLOAD_HEADER.map((h, i) =>
        header.includes(h) ? row[i] : null
      ).filter((v) => v !== null)
    );
  return [header, ...rows]
    .map((r) => r.map((v) => `"${String(v)}"`).join(","))
    .join("\n");
};

/* ------------------------------------------------------------------ mapping */

/**
 * The backend's suggested mapping for the sample (`mappingPayload`). "Taxable
 * Value" is left unmatched on purpose — the AI was not sure it meant Item
 * Amount — so the required-fields banner has something to say. GSTIN and
 * Place of Supply are not mapping fields at all: production takes both from
 * the customer master.
 */
export const SUGGESTED_ITEM_MAPPING: FieldMappings = {
  invoice_date: { sourceColumns: ["Invoice Date"] },
  reference_number: { sourceColumns: ["Invoice No"] },
  customer_name: { sourceColumns: ["Customer"] },
  item_name: { sourceColumns: ["Item"] },
  hsn_sac: { sourceColumns: ["HSN"] },
  quantity: { sourceColumns: ["Qty"] },
  unit_rate: { sourceColumns: ["Rate"] },
  cgst_amount: { sourceColumns: ["CGST"] },
  sgst_amount: { sourceColumns: ["SGST"] },
  igst_amount: { sourceColumns: ["IGST"] },
  total_amount: { sourceColumns: ["Total"] },
};

/** The same file read in Accounting Mode: no items, a ledger line instead. */
export const SUGGESTED_ACCOUNTING_MAPPING: FieldMappings = {
  invoice_date: { sourceColumns: ["Invoice Date"] },
  reference_number: { sourceColumns: ["Invoice No"] },
  customer_name: { sourceColumns: ["Customer"] },
  ledger_description: { sourceColumns: ["Item"] },
  cgst_amount: { sourceColumns: ["CGST"] },
  sgst_amount: { sourceColumns: ["SGST"] },
  igst_amount: { sourceColumns: ["IGST"] },
  total_amount: { sourceColumns: ["Total"] },
};

/** A complete mapping — what a saved template, or a finished mapping, holds. */
export const COMPLETE_ITEM_MAPPING: FieldMappings = {
  ...SUGGESTED_ITEM_MAPPING,
  item_amount: { sourceColumns: ["Taxable Value"] },
};

/** GET /api/accounts-receivable/v2/import-templates */
export const MOCK_IMPORT_TEMPLATES: ResponseARVoucherImportTemplate[] = [
  {
    templateUuid: "tpl-tally-sales-register",
    name: "Tally Sales Register (Item)",
    importMode: VoucherViewMode.ITEM_MODE,
    configPayload: { fieldMappings: COMPLETE_ITEM_MAPPING },
    createdAt: "2026-08-04T06:10:00.000Z",
    updatedAt: "2026-08-04T06:10:00.000Z",
  },
  {
    templateUuid: "tpl-zoho-invoice-export",
    name: "Zoho Invoice Export",
    importMode: VoucherViewMode.ACCOUNTING_MODE,
    configPayload: {
      fieldMappings: {
        ...SUGGESTED_ACCOUNTING_MAPPING,
        ledger_amount: { sourceColumns: ["Taxable Value"] },
      },
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
  dateFormat: "DD/MM/YYYY",
  discountType: null,
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
    file: SAMPLE_SALES_FILE,
    mappings: COMPLETE_ITEM_MAPPING,
    masters: MOCK_SALES_CUSTOMERS,
    gstRegistration: SALES_GST_REGISTRATION,
    mode: VoucherViewMode.ITEM_MODE,
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
