import {
  endOfMonth,
  endOfQuarter,
  startOfMonth,
  startOfQuarter,
  subMonths,
  subQuarters,
} from "date-fns";
import type { PillTone } from "@/components/inbox/v2/ui";
import type {
  ConfigFieldType,
  GstPeriod,
  ItcTableColumn,
  MappingConfig,
  TaxDifferenceTableColumn,
} from "@/types/pages/inbox/gst";

/**
 * GST reconciliation's static config — production's
 * config/pages/gst-reconciliation/index.ts, with its Tailwind palette classes
 * (emerald / teal / amber / red / purple, #CA3500) swapped for the prototype's
 * tokens. Labels and copy are verbatim.
 */

/* ----------------------------------------------------------------- periods */

/** April, 0-based: the Indian financial year starts in April. */
const FY_START_MONTH = 3;

const financialYear = (date: Date, back = 0): GstPeriod => {
  const start =
    date.getMonth() >= FY_START_MONTH
      ? date.getFullYear()
      : date.getFullYear() - 1;
  return {
    from: new Date(start - back, FY_START_MONTH, 1),
    to: endOfMonth(new Date(start - back + 1, FY_START_MONTH - 1, 1)),
  };
};

export type PeriodPreset = {
  label: string;
  getValue: (today: Date) => GstPeriod;
};

/** production's dateRangesForPeriodPicker; "Year" is the financial year. */
export const PERIOD_PRESETS: PeriodPreset[] = [
  {
    label: "This Month",
    getValue: (t) => ({ from: startOfMonth(t), to: endOfMonth(t) }),
  },
  {
    label: "This Quarter",
    getValue: (t) => ({ from: startOfQuarter(t), to: endOfQuarter(t) }),
  },
  { label: "This Year", getValue: (t) => financialYear(t) },
  {
    label: "Previous Month",
    getValue: (t) => ({
      from: startOfMonth(subMonths(t, 1)),
      to: endOfMonth(subMonths(t, 1)),
    }),
  },
  {
    label: "Previous Quarter",
    getValue: (t) => ({
      from: startOfQuarter(subQuarters(t, 1)),
      to: endOfQuarter(subQuarters(t, 1)),
    }),
  },
  { label: "Previous Year", getValue: (t) => financialYear(t, 1) },
];

/**
 * PROTOTYPE: production opens on the current month (defaultPeriod). The
 * prototype opens on Aug 2026, the period the mocks have already reconciled,
 * so the results are on screen without first running anything.
 */
export const DEFAULT_PERIOD: GstPeriod = {
  from: new Date(2026, 7, 1),
  to: endOfMonth(new Date(2026, 7, 1)),
};

/** The month picker's floor, as production's MonthRangeCalendar minYear. */
export const PERIOD_MIN_YEAR = 2020;

/* ------------------------------------------------------------ PR mapping */

const DEFAULT_PR_DATE_FORMAT = "%d/%m/%y";

export const defaultColumnMapping: MappingConfig = {
  headerOffset: 0,
  sheetName: "",
  mappings: {
    gstin: "",
    vendorName: "",
    invoiceNo: "",
    invoiceDate: "",
    voucherDate: "",
    invoiceAmount: [],
    documentType: "Regular",
    placeOfSupply: "",
    rate: [],
    taxableAmount: [],
    cess: [],
    sgst: [],
    cgst: [],
    igst: [],
    invoiceDateFormat: DEFAULT_PR_DATE_FORMAT,
    voucherDateFormat: DEFAULT_PR_DATE_FORMAT,
    remarks: [],
  },
  columns: [],
};

export const COLUMN_MAPPING_CONFIG: Record<
  string,
  { label: string; type: ConfigFieldType; isRequired: boolean }
> = {
  gstin: { label: "GSTIN", type: "single", isRequired: true },
  vendorName: { label: "Vendor Name", type: "single", isRequired: true },
  invoiceNo: { label: "Invoice Number", type: "single", isRequired: true },
  invoiceDate: { label: "Invoice Date", type: "single", isRequired: true },
  voucherDate: { label: "Voucher Date", type: "single", isRequired: true },
  invoiceAmount: { label: "Invoice Amount", type: "multi", isRequired: true },
  placeOfSupply: {
    label: "Place of Supply",
    type: "single",
    isRequired: false,
  },
  rate: { label: "Rate", type: "multi", isRequired: false },
  taxableAmount: { label: "Taxable Amount", type: "multi", isRequired: false },
  cess: { label: "CESS", type: "multi", isRequired: false },
  sgst: { label: "SGST", type: "multi", isRequired: false },
  cgst: { label: "CGST", type: "multi", isRequired: false },
  igst: { label: "IGST", type: "multi", isRequired: false },
  remarks: { label: "Remarks", type: "multi", isRequired: false },
};

export type ColumnMappingKey = keyof typeof COLUMN_MAPPING_CONFIG;
export const COLUMN_MAPPING_KEYS = Object.keys(
  COLUMN_MAPPING_CONFIG
) as ColumnMappingKey[];

export const headerRowOptions = Array.from({ length: 20 }, (_, i) => ({
  label: `${i + 1}`,
  value: `${i}`,
}));

export const voucherTypeOptions = [
  { label: "Regular", value: "Regular" },
  { label: "Credit Note", value: "Credit Note" },
  { label: "Debit Note", value: "Debit Note" },
];

export const prDateFormatOptions = [
  { label: "yyyy/MM/dd", value: "%Y/%m/%d" },
  { label: "MM/dd/yyyy", value: "%m/%d/%Y" },
  { label: "dd/MM/yyyy", value: "%d/%m/%Y" },
  { label: "dd/MM/yy", value: "%d/%m/%y" },
  { label: "MM/dd/yy", value: "%m/%d/%y" },
  { label: "yyyy.MM.dd", value: "%Y.%m.%d" },
  { label: "MM.dd.yyyy", value: "%m.%d.%Y" },
  { label: "dd.MM.yyyy", value: "%d.%m.%Y" },
  { label: "dd.MM.yy", value: "%d.%m.%y" },
  { label: "MM.dd.yy", value: "%m.%d.%y" },
  { label: "yy.MM.dd", value: "%y.%m.%d" },
  { label: "yyyy-MM-dd", value: "%Y-%m-%d" },
  { label: "MM-dd-yyyy", value: "%m-%d-%Y" },
  { label: "dd-MM-yyyy", value: "%d-%m-%Y" },
];

/** Upload limits, both dropzones. */
export const GST_MAX_FILE_SIZE = 20 * 1024 * 1024;
export const GSTR2B_ALLOWED_EXTENSIONS = [".json", ".xlsx"];
export const PR_ALLOWED_EXTENSIONS = [".xlsx", ".csv"];

/**
 * PROTOTYPE: production downloads GST_PR_Template.xlsx from a public bucket.
 * The prototype builds the same header row as a CSV in the browser.
 */
export const PR_TEMPLATE_FILE_NAME = "GST_PR_Template.csv";
export const PR_TEMPLATE_HEADERS = [
  "Supplier GSTIN",
  "Party Name",
  "Supplier Invoice No",
  "Invoice Date",
  "Voucher Date",
  "Place of Supply",
  "GST Rate",
  "Taxable Value",
  "CGST",
  "SGST",
  "IGST",
  "Cess",
  "Invoice Value",
  "Narration",
];

/* --------------------------------------------------------- file statuses */

export const PrFileStatusEnums = {
  IN_PROGRESS: "in_progress",
  EXTRACTED_PARTIALLY: "extracted_partially",
  EXTRACTION_SUCCESSFUL: "extraction_successful",
  EXTRACTION_FAILED: "extraction_failed",
  MAPPING_REQUIRED: "mapping_required",
} as const;

export type PrFileStatusEnumsKeyType = keyof typeof PrFileStatusEnums;
export type PrFileStatusEnumsValueType =
  (typeof PrFileStatusEnums)[PrFileStatusEnumsKeyType];

export const Gstr2BStatusEnums = {
  IN_PROGRESS: "in_progress",
  EXTRACTED_PARTIALLY: "extracted_partially",
  EXTRACTION_SUCCESSFUL: "extraction_successful",
  EXTRACTION_FAILED: "extraction_failed",
} as const;

export type Gstr2BStatusEnumsKeyType = keyof typeof Gstr2BStatusEnums;
export type Gstr2BStatusEnumsValueType =
  (typeof Gstr2BStatusEnums)[Gstr2BStatusEnumsKeyType];

/** production's fileCategories, the two this module uses. */
export const GST_FILE_CATEGORIES = {
  GSTR2B: "two_b_file",
  PR_FILE: "pr_file",
} as const;

/** The entity type of a portal fetch, beside an uploaded "two_b_file". */
export const GSTR2B_PORTAL_ENTITY = "2b_data";

/**
 * Production's GSTR2B_STATUS_MESSAGE_CONFIG ("Failed " carries a trailing
 * space there; trimmed here) with a Pill tone in place of its #CA3500 text.
 */
export const GSTR2B_STATUS_CONFIG: Record<
  Gstr2BStatusEnumsValueType,
  { label: string; tone: PillTone }
> = {
  [Gstr2BStatusEnums.EXTRACTION_FAILED]: { label: "Failed", tone: "error" },
  [Gstr2BStatusEnums.EXTRACTED_PARTIALLY]: {
    label: "Partially Extracted",
    tone: "warn",
  },
  [Gstr2BStatusEnums.EXTRACTION_SUCCESSFUL]: {
    label: "Extracted Successfully",
    tone: "ok",
  },
  [Gstr2BStatusEnums.IN_PROGRESS]: { label: "In Progress", tone: "info" },
};

/** Production's PR_FILE_STATUS_CONFIG labels, with a tone and delete rule. */
export const PR_FILE_STATUS_CONFIG: Record<
  PrFileStatusEnumsValueType,
  { label: string; tone: PillTone; showDeleteButton: boolean }
> = {
  [PrFileStatusEnums.IN_PROGRESS]: {
    label: "In Progress",
    tone: "info",
    showDeleteButton: false,
  },
  [PrFileStatusEnums.EXTRACTION_SUCCESSFUL]: {
    label: "Extraction Successful",
    tone: "ok",
    showDeleteButton: true,
  },
  [PrFileStatusEnums.EXTRACTED_PARTIALLY]: {
    label: "Partially Extracted",
    tone: "warn",
    showDeleteButton: true,
  },
  [PrFileStatusEnums.EXTRACTION_FAILED]: {
    label: "Failed",
    tone: "error",
    showDeleteButton: true,
  },
  [PrFileStatusEnums.MAPPING_REQUIRED]: {
    label: "Mapping Required",
    tone: "warn",
    showDeleteButton: true,
  },
};

/* ------------------------------------------------------------ match types */

export const GSTR2B_MATCH_TYPE = {
  FULLY_MATCHED: "fully_matched",
  AI_MATCHED: "ai_matched",
  AI_PROBABLE_MATCH: "ai_probable_match",
  MISSING_IN_2B: "missing_in_2b",
  MISSING_IN_PR: "missing_in_pr",
  MANUALLY_MATCHED: "manually_matched",
} as const;

export type Gstr2bMatchTypeKeyType = keyof typeof GSTR2B_MATCH_TYPE;
export type Gstr2bMatchTypeValueType =
  (typeof GSTR2B_MATCH_TYPE)[Gstr2bMatchTypeKeyType];

/** Summary View's row order. */
export const GSTR2B_MATCH_TYPE_ORDER: Gstr2bMatchTypeValueType[] = [
  GSTR2B_MATCH_TYPE.FULLY_MATCHED,
  GSTR2B_MATCH_TYPE.AI_MATCHED,
  GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH,
  GSTR2B_MATCH_TYPE.MISSING_IN_2B,
  GSTR2B_MATCH_TYPE.MISSING_IN_PR,
  GSTR2B_MATCH_TYPE.MANUALLY_MATCHED,
];

export const GSTR2B_MATCH_TYPE_LABELS: Record<
  Gstr2bMatchTypeValueType,
  string
> = {
  [GSTR2B_MATCH_TYPE.FULLY_MATCHED]: "Fully Matched",
  [GSTR2B_MATCH_TYPE.AI_MATCHED]: "AI Match",
  [GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]: "AI Probable Match",
  [GSTR2B_MATCH_TYPE.MISSING_IN_2B]: "Missing in 2B",
  [GSTR2B_MATCH_TYPE.MISSING_IN_PR]: "Missing in PR",
  [GSTR2B_MATCH_TYPE.MANUALLY_MATCHED]: "Manually Matched",
};

/**
 * Designer-approved tone for each match type, in place of production's
 * emerald / teal / amber / red / purple chips. Missing in PR goes neutral:
 * the 2B line exists and can be claimed once booked, so it reads as "to do",
 * not as an error.
 */
export const GSTR2B_MATCH_TYPE_TONE: Record<
  Gstr2bMatchTypeValueType,
  PillTone
> = {
  [GSTR2B_MATCH_TYPE.FULLY_MATCHED]: "ok",
  [GSTR2B_MATCH_TYPE.MANUALLY_MATCHED]: "ok",
  [GSTR2B_MATCH_TYPE.AI_MATCHED]: "info",
  [GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]: "warn",
  [GSTR2B_MATCH_TYPE.MISSING_IN_2B]: "error",
  [GSTR2B_MATCH_TYPE.MISSING_IN_PR]: "neutral",
};

/** Month and Vendor views' Status Breakdown buckets. */
export const MATCHED_TYPES: Gstr2bMatchTypeValueType[] = [
  GSTR2B_MATCH_TYPE.FULLY_MATCHED,
  GSTR2B_MATCH_TYPE.AI_MATCHED,
  GSTR2B_MATCH_TYPE.MANUALLY_MATCHED,
];
export const MISSING_TYPES: Gstr2bMatchTypeValueType[] = [
  GSTR2B_MATCH_TYPE.MISSING_IN_2B,
  GSTR2B_MATCH_TYPE.MISSING_IN_PR,
];

/**
 * The keys a row's remarks[] carries for a field that differs between 2B and
 * PR. The values are the backend's own strings, so they stay snake_case.
 */
export const REMARK_KEY_BY_COLUMN = {
  gstin: "gstin",
  invoiceDate: "invoice_date",
  invoiceNo: "invoice_no",
  taxableAmount: "taxable_amount",
  invoiceAmount: "invoice_amount",
  cgst: "cgst",
  sgst: "sgst",
  igst: "igst",
  cess: "cess",
  totalGst: "total_gst",
  taxStructure: "tax_structure",
  documentType: "document_type",
} as const;

export type RemarkKey =
  (typeof REMARK_KEY_BY_COLUMN)[keyof typeof REMARK_KEY_BY_COLUMN];

export const AMENDED_SHEET_TYPES = new Set(["b2ba", "cdnra"]);
export const AMENDED_TOOLTIP = "This is an amended record from GSTR-2B";

/* ------------------------------------------------------------------- ITC */

export const ITC_ACTION_VALUES = {
  PENDING: "pending",
  CLAIM: "claim",
  INELIGIBLE: "ineligible",
  REVERSE: "reverse",
  REJECT: "reject",
} as const;
export type ITC_ACTION_VALUES_KEY_TYPE = keyof typeof ITC_ACTION_VALUES;
export type ITC_ACTION_VALUES_VALUE_TYPE =
  (typeof ITC_ACTION_VALUES)[ITC_ACTION_VALUES_KEY_TYPE];

export const ITC_ACTION_OPTIONS = [
  { value: ITC_ACTION_VALUES.PENDING, label: "Pending" },
  { value: ITC_ACTION_VALUES.CLAIM, label: "Claim" },
  { value: ITC_ACTION_VALUES.INELIGIBLE, label: "Ineligible" },
  { value: ITC_ACTION_VALUES.REVERSE, label: "Reverse" },
  { value: ITC_ACTION_VALUES.REJECT, label: "Reject" },
];

/** As production: the three ITC buckets are tax amounts, No Action a count. */
export const ITC_TABLE_CONFIG: ItcTableColumn[] = [
  { label: "ITC Claim", key: "itcClaim", type: "amount" },
  { label: "ITC Ineligible", key: "itcIneligible", type: "amount" },
  { label: "ITC Reverse Charge", key: "itcReverseCharge", type: "amount" },
  { label: "No Action", key: "noAction", type: "count" },
];

export const TAX_DIFF_TABLE_COLUMNS: TaxDifferenceTableColumn[] = [
  { key: "source", label: "Source" },
  { key: "count", label: "No of Documents" },
  { key: "taxable", label: "Taxable Value" },
  { key: "tax", label: "Tax Value" },
  { key: "difference", label: "Tax Difference (2B − PR)" },
];

/* -------------------------------------------------------------- results */

export const GST_RECON_TABS = [
  { value: "summary", label: "Summary View" },
  { value: "month", label: "Month View" },
  { value: "vendor", label: "Vendor View" },
  { value: "invoice", label: "Invoice View" },
] as const;

/** Production's column filter copy (components/gst-reconciliation/common/filters). */
export const INVOICE_FILTER_COPY = {
  matchType: {
    title: "Reconciliation Status",
    subtitle: "Filter by Reconciliation Status",
    searchPlaceholder: "Search status",
  },
  documentType: {
    title: "Invoice Type",
    subtitle: "Filter by Invoice Type",
    searchPlaceholder: "Search invoice type",
  },
  gstin: {
    title: "GSTIN",
    subtitle: "Filter by GSTIN",
    searchPlaceholder: "Search GSTIN",
  },
  vendorName: {
    title: "Vendor Name",
    subtitle: "Filter by vendor name",
    searchPlaceholder: "Search vendor name",
  },
  invoiceNo: {
    title: "Invoice No",
    subtitle: "Filter by Invoice No",
    searchPlaceholder: "Search invoice no",
  },
  itcStatus: {
    title: "ITC Status",
    subtitle: "Filter by ITC Status",
    searchPlaceholder: "Search ITC status",
  },
  invoiceDate: { title: "Invoice Date", subtitle: "Filter by Date Range" },
  invoiceAmount: {
    title: "Invoice Amount",
    subtitle: "Filter by Invoice Amount",
  },
  taxableAmount: {
    title: "Taxable Value",
    subtitle: "Filter by Taxable Value",
  },
  sgst: { title: "SGST", subtitle: "Filter by SGST" },
  cgst: { title: "CGST", subtitle: "Filter by CGST" },
  igst: { title: "IGST", subtitle: "Filter by IGST" },
  cess: { title: "CESS", subtitle: "Filter by CESS" },
} as const;

/** Simulated waits, so each in-progress state is visible. */
export const GST_TIMINGS = {
  /** Portal fetch: In Progress → N invoice(s). */
  fetch2b: 3000,
  /** Upload: In Progress → Extracted Successfully. */
  upload2b: 2500,
  /** Map & Import: In Progress → Extraction Successful. */
  prIngest: 2500,
  /** Run Reconciliation. */
  reconcile: 3000,
  /** Send / verify OTP. */
  otp: 700,
} as const;
