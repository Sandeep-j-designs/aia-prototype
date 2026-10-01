import type {
  Gstr2bMatchTypeValueType,
  Gstr2BStatusEnumsValueType,
  ITC_ACTION_VALUES_VALUE_TYPE,
  PrFileStatusEnumsValueType,
} from "@/config/pages/inbox/gst";

/**
 * GST reconciliation (GSTR-2B vs Purchase Register) contracts.
 *
 * Mirrors production's types/pages/gst-reconciliation/index.ts — same names,
 * same camelCase shapes — trimmed to what this prototype renders. Anything a
 * screen here does not draw (dedup payloads, conflict tables, GSTIN edit) is
 * left out rather than stubbed.
 */

export interface GstReconGstin {
  gstrGstDetailsUuid: string;
  companyUuid: string;
  ucUuid: string;
  pan: string;
  gstin: string;
  thirdPartyProduct: string | null;
  source: string;
  isActive: boolean;
}

export type GstReconGstinListResponse = GstReconGstin[];

export type GstinOption = {
  label: string;
  value: string;
  gstrGstDetailsUuid: string;
};

/* ------------------------------------------------------------ PR mapping */

export interface Mappings {
  gstin: string;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: string;
  voucherDate: string;
  invoiceAmount: string[];
  documentType: string;
  placeOfSupply: string;
  rate: string[];
  taxableAmount: string[];
  cess: string[];
  sgst: string[];
  cgst: string[];
  igst: string[];
  invoiceDateFormat?: string;
  voucherDateFormat?: string;
  remarks: string[];
}

export interface MappingConfig {
  headerOffset: number;
  sheetName: string;
  mappings: Mappings;
  columns: string[];
}

export type ConfigFieldType = "single" | "multi";

/* --------------------------------------------------------- file statuses */

export interface PrFileStatus {
  fileStatusUuid: string;
  thirdPartyProduct: string | null;
  periodFrom: string | null;
  periodTo: string | null;
  fileUuid: string;
  fileCategory: string;
  fileName: string;
  gstin: string | null;
  status: PrFileStatusEnumsValueType;
  companyUuid: string;
  isActive: boolean;
  creationDate: string;
  lastUpdateDate: string;
  /** Production carries a dedup payload here; the prototype never fills it. */
  errorPayload: { error?: string } | null;
  lastUpdatedBy: string | null;
}

export type PrFileStatusList = PrFileStatus[];

export interface gstr2BDataStatusType {
  creationDate: string;
  requestUuid?: string;
  fileName?: string;
  fileStatusUuid: string;
  fileUuid?: string;
  periodFrom: string | null;
  periodTo: string | null;
  gstin: string | null;
  /** "2b_data" for a portal fetch, "two_b_file" for an upload. */
  entityType: string;
  status: Gstr2BStatusEnumsValueType;
  errorMessage: string | null;
  lastUpdatedBy: string | null;
  lastUpdateDate: string;
  gstr2bLineCount: number;
}

export type CombinedGstReconStatusResponse = {
  twoB: gstr2BDataStatusType[];
  pr: PrFileStatusList;
};

export interface SavedAuthDataResponse {
  gstin: string;
  username: string;
  email: string;
  isSaved: boolean;
}

/* ------------------------------------------------------------ invoice view */

export interface InvoiceViewData {
  documentType: string;
  sheetType?: string;
  gstin: string;
  invoiceNo: string;
  vendorName: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalGst: number;
  isReverseChargeApplied: boolean;
  remarks: string;
}

export interface InvoiceViewGstr2bData extends InvoiceViewData {
  gstr2bLineUuid: string;
}

export interface InvoiceViewPrData extends InvoiceViewData {
  prLineUuid: string;
}

export type InvoiceViewRow = {
  matchType: Gstr2bMatchTypeValueType;
  /** Field keys (REMARK_KEY_BY_COLUMN values) that differ between the sides. */
  remarks: string[] | null;
  gstr2b: InvoiceViewGstr2bData | null;
  pr: InvoiceViewPrData | null;
  reconRunUuids: string[];
  /**
   * Production types this as the enum alone; its ITC cell shows "No Action"
   * for an empty value, so null is what the API sends before any action.
   */
  itcStatus: ITC_ACTION_VALUES_VALUE_TYPE | null;
};

export type InvoiceViewItcDetails = {
  itcClaim: number;
  itcIneligible: number;
  itcReverseCharge: number;
  noAction: number;
};

export type Gstr2bSummary = {
  gstr2bCount: number;
  gstr2bTaxableAmount: number;
  gstr2bTaxAmount: number;
};

export type PrSummary = {
  prCount: number;
  prTaxableAmount: number;
  prTaxAmount: number;
};

export type InvoiceViewSummary = {
  invoices: InvoiceViewRow[];
  gstr2b: Gstr2bSummary;
  pr: PrSummary;
  itcDetails: InvoiceViewItcDetails;
};

export type InvoiceTableFilterState = {
  matchType?: string[];
  itcStatus?: string[];
  documentType?: string[];
  gstin?: string[];
  invoiceNo?: string[];
  vendorName?: string[];
  invoiceDateFrom?: string;
  invoiceDateTo?: string;
  invoiceAmountFrom?: string;
  invoiceAmountTo?: string;
  taxableAmountFrom?: string;
  taxableAmountTo?: string;
  cgstFrom?: string;
  cgstTo?: string;
  sgstFrom?: string;
  sgstTo?: string;
  igstFrom?: string;
  igstTo?: string;
  cessFrom?: string;
  cessTo?: string;
};

export type SortingOrder = "asc" | "desc";

export type InvoiceTableSortKey =
  | "invoiceNoOrder"
  | "invoiceDateOrder"
  | "invoiceAmountOrder"
  | "taxableAmountOrder"
  | "cgstOrder"
  | "sgstOrder"
  | "igstOrder"
  | "cessOrder"
  | "matchTypeOrder"
  | "documentTypeOrder"
  | "gstinOrder"
  | "vendorNameOrder";

export type AmountRangeValue = {
  from?: string;
  to?: string;
};

/* ------------------------------------------------------- aggregate views */

export interface Gstr2bSummaryViewTableData {
  /** A match type value, or "total" for the footer row. */
  matchStatus: string;
  gstr2bCount: number;
  gstr2bTaxableValue: number;
  gstr2bTaxValue: number;
  prCount: number;
  prTaxableValue: number;
  prTaxValue: number;
  differenceCount: number;
  differenceTaxableValue: number;
  differenceTaxValue: number;
}

export type SummaryViewTableSortKey =
  | "gstr2bCountOrder"
  | "gstr2bTaxableValueOrder"
  | "gstr2bTaxValueOrder"
  | "prCountOrder"
  | "prTaxableValueOrder"
  | "prTaxValueOrder"
  | "differenceCountOrder"
  | "differenceTaxableValueOrder"
  | "differenceTaxValueOrder";

export interface Gstr2bMonthViewTableData {
  gstr2bCount: number;
  gstr2bTaxableValue: number;
  gstr2bTaxValue: number;
  prCount: number;
  prTaxableValue: number;
  prTaxValue: number;
  diffCount: number;
  diffTaxableValue: number;
  diffTaxValue: number;
  matchStatusMatched: number;
  matchStatusAiProbableMatch: number;
  matchStatusMissing: number;
  /** "Aug 2026", or "total" for the footer row. */
  month: string;
}

export type MonthViewTableSortKey =
  | "gstr2bCountOrder"
  | "prCountOrder"
  | "diffCountOrder"
  | "gstr2bTaxableValueOrder"
  | "prTaxableValueOrder"
  | "diffTaxableValueOrder"
  | "gstr2bTaxValueOrder"
  | "prTaxValueOrder"
  | "diffTaxValueOrder"
  | "matchStatusMatchedOrder"
  | "matchStatusAiProbableMatchOrder"
  | "matchStatusMissingOrder";

export interface Gstr2bVendorViewTableData {
  gstr2bCount: number;
  gstr2bTaxableValue: number;
  gstr2bTaxValue: number;
  prCount: number;
  prTaxableValue: number;
  prTaxValue: number;
  diffCount: number;
  diffTaxableValue: number;
  diffTaxValue: number;
  matchStatusMatched: number;
  matchStatusAiProbableMatch: number;
  matchStatusMissing: number;
  gstin: string;
  vendorName: string;
}

export type VendorViewTableSortKey =
  | "gstr2bCountOrder"
  | "prCountOrder"
  | "gstr2bTaxableValueOrder"
  | "prTaxableValueOrder"
  | "gstr2bTaxValueOrder"
  | "prTaxValueOrder"
  | "matchStatusMatchedOrder"
  | "matchStatusAiProbableMatchOrder"
  | "matchStatusMissingOrder";

/* ----------------------------------------------------------- link modals */

/** A PR line offered in "Link to an Existing Bill" (Linking for GSTR-2B). */
export interface PrDetails {
  prLineUuid: string;
  invoiceDate: string;
  invoiceNo: string;
  vendorName: string;
  taxableAmount: number;
  totalGst: number;
  invoiceAmount: number;
}

/** A 2B line offered in "Link to an Existing Bill" (Linking for PR). */
export interface Gstr2bDetails {
  gstr2bLineUuid: string;
  invoiceDate: string;
  invoiceNo: string;
  vendorName: string;
  taxableAmount: number;
  totalGst: number;
  invoiceAmount: number;
}

export type ItcTableColumnKey =
  "itcClaim" | "itcIneligible" | "itcReverseCharge" | "noAction";

export type ItcTableColumn = {
  label: string;
  key: ItcTableColumnKey;
  type: "amount" | "count";
};

export type TaxDifferenceTableColumnKey =
  "source" | "count" | "taxable" | "tax" | "difference";

export type TaxDifferenceTableColumn = {
  key: TaxDifferenceTableColumnKey;
  label: string;
};

/** A period, as the pickers hold it. */
export type GstPeriod = { from: Date; to: Date };

/** The mock spreadsheet a PR upload stands for: its header row and a sample. */
export type PrSourceSheet = {
  sheetName: string;
  columns: string[];
};
