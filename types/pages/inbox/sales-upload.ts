/**
 * Sales spreadsheet upload — the AR bulk-upload contracts.
 *
 * Mirrors production's types/pages/accounts-receivable/bulk-upload.ts and
 * bulk-upload-preview.ts, name for name, so the hook's mock seam can be
 * swapped for the real services without touching a component. Field keys
 * inside payloads stay snake_case exactly as production keeps them: they are
 * values the backend owns (`invoice_date`), not object keys apiClient
 * converts.
 *
 * Trimmed to what this flow reads. Anything left out is still in production's
 * files; nothing here is shaped differently from them.
 */

import type { AdditionalFieldKey } from "@/config/pages/inbox/additional-fields";

/** Production: VoucherViewMode in config/pages/accounts-payable/tally. */
export enum VoucherViewMode {
  ITEM_MODE = "item_mode",
  ACCOUNTING_MODE = "accounting_mode",
}

export type ArImportFileType = "csv" | "xls" | "xlsx";

export enum ARVoucherImportBatchStatus {
  PROCESSING = "processing",
  PENDING_MAPPING = "pending_mapping",
  NEEDS_REVIEW = "needs_review",
  COMPLETE = "complete",
  FAILED = "failed",
}

export type ARVoucherImportBatchIssueCountsPayload = {
  byGroup?: Record<string, number>;
  byCode?: Record<string, number>;
  issueFieldCounts?: Record<string, { error?: number; warning?: number }>;
  issueFields?: Record<string, "error" | "warning">;
};

export type ARBulkUploadFieldKey =
  | "reference_number"
  | "invoice_date"
  | "customer_name"
  | "voucher_number"
  | "due_date"
  | "ledger_description"
  | "ledger_name"
  | "ledger_name_2"
  | "ledger_amount"
  | "ledger_amount_2"
  | "ledger_description_2"
  | "cgst_ledger"
  | "cgst_amount"
  | "sgst_ledger"
  | "sgst_amount"
  | "igst_ledger"
  | "igst_amount"
  | "tds_tcs_ledger"
  | "tds_amount"
  | "tax_amount"
  | "total_amount"
  | "narration"
  | "sales_ledger"
  | "item_description"
  | "item_name"
  | "hsn_sac"
  | "godown_location"
  | "quantity"
  | "uom"
  | "unit_rate"
  | "discount"
  | "item_amount"
  /* PROTOTYPE: the sales invoice's optional groups, mappable from Map
     Fields — picking one there switches it on in the company's Field
     Configuration. Not in production yet — see
     config/pages/inbox/additional-fields. */
  | AdditionalFieldKey;

export type FieldMappingTransform = "sum";
export type FieldOptionType = "date_format" | "discount_type" | "amount_type";
/** Production: DiscountType in config/pages/accounts-payable. */
export type MappingAmountType = "percentage" | "amount";
export type MappingDiscountType = MappingAmountType;

export interface FieldMappingConfig {
  sourceColumns: string[];
  /** Columns whose values are subtracted rather than added. */
  negativeAdjustmentColumns?: string[];
  /** Set once a "sum" field holds more than one column. */
  transform?: FieldMappingTransform;
  valueType?: MappingAmountType;
}

export interface MappingOption {
  label: string;
  value: string;
}

export interface MappingFieldSchema {
  key: ARBulkUploadFieldKey;
  label: string;
  required?: boolean;
  /** The field takes several columns and adds them up. */
  multiSelectTransform?: FieldMappingTransform;
  /** The inline control its row shows once mapped. */
  optionType?: FieldOptionType;
  supportsNegativeAdjustment?: boolean;
  /** PROTOTYPE: mandatory once this other field is mapped. */
  requiredWhen?: ARBulkUploadFieldKey;
  /** PROTOTYPE: an invoice field switched off inside a group that is on. */
  off?: boolean;
}

export interface MappingFieldGroupSchema {
  id: string;
  label: string;
  fields: MappingFieldSchema[];
  /** Item and ledger groups: each used entry maps at least one of these. */
  requiredAnyOf?: ARBulkUploadFieldKey[];
  /** PROTOTYPE: an optional invoice group the company has switched off. */
  off?: boolean;
}

export interface MappingSchemaPayload {
  fieldGroups: MappingFieldGroupSchema[];
  dateFormatOptions: MappingOption[];
  discountTypeOptions: MappingOption[];
  amountTypeOptions: MappingOption[];
}

export type MappingEntryCollection = "items" | "ledgers";

/** One item or ledger of a row — Item 1, Item 2, Ledger 1… */
export interface MappingEntry {
  /** Stable across saves; the number shown is its position. */
  id: string;
  fields: Partial<Record<ARBulkUploadFieldKey, FieldMappingConfig>>;
}

export type FieldMappingsPayload = Partial<
  Record<ARBulkUploadFieldKey, FieldMappingConfig>
>;

/** Production's draft: everything Map Fields edits, as PATCH .../mapping takes it. */
export interface MappingConfigPayload {
  payloadType: "mapping_config";
  importMode: VoucherViewMode;
  selection: {
    selectedSheetName: string | null;
    headerRowIndex: number | null;
  };
  options: {
    dateFormat: string;
    discountType: MappingDiscountType;
  };
  fieldMappings: FieldMappingsPayload;
  items?: MappingEntry[];
  ledgers?: MappingEntry[];
}

/** What a row of the mapping table points at: a header field, or a field of one entry. */
export type MappingFieldSelector =
  | ARBulkUploadFieldKey
  | {
      collection: MappingEntryCollection;
      entryId: string;
      field: ARBulkUploadFieldKey;
    };

export interface SheetSummary {
  name: string;
  rowCount: number;
  dataRowCount: number;
}

/** Column header → its first few values, as the mapping page previews them. */
export type SampleRowPayload = Record<string, unknown[]>;

export interface ResponseARVoucherImportTemplate {
  templateUuid: string;
  name: string;
  importMode: VoucherViewMode;
  configPayload: {
    selection?: {
      selectedSheetName: string | null;
      headerRowIndex: number | null;
    };
    options?: { dateFormat: string; discountType: MappingDiscountType };
    fieldMappings: FieldMappingsPayload;
    items?: MappingEntry[];
    ledgers?: MappingEntry[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ResponseARVoucherImportBatch {
  aiProcessedRowCount: number;
  importBatchUuid: string;
  fileUuid: string;
  selectedTemplateUuid: string | null;
  selectedTemplateName: string | null;
  originalFileName: string;
  fileType: string;
  fileSizeBytes: number;
  importMode: VoucherViewMode;
  status: ARVoucherImportBatchStatus;
  selectedSheetName: string | null;
  headerRowIndex: number | null;
  dateFormat: string | null;
  discountType: string | null;
  totalRows: number;
  pendingRows: number;
  readyRows: number;
  warningRows: number;
  errorRows: number;
  createdRows: number;
  issueCountsPayload: ARVoucherImportBatchIssueCountsPayload;
  failureCode: string | null;
  failureMessage: string | null;
  failureDetailPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResponseARVoucherImportBatchMapping {
  importBatchUuid: string;
  status: ARVoucherImportBatchStatus;
  importMode: VoucherViewMode;
  selectedSheetName: string | null;
  headerRowIndex: number | null;
  sheets: SheetSummary[];
  detectedColumns: string[];
  mappingSchema: MappingSchemaPayload;
  dateFormat: string | null;
  discountType: MappingDiscountType | null;
  /** The backend's suggestion — what Reset Mapping goes back to. */
  mappingPayload: {
    fieldMappings: FieldMappingsPayload;
    items: MappingEntry[];
    ledgers: MappingEntry[];
  };
  sampleRowPayload: SampleRowPayload;
}

export interface AIPredictionProgressResponse {
  completedRows: number;
  totalRows: number;
}

/* ------------------------------------------------------------------ preview */

export type ARBulkUploadPreviewFieldKey =
  | ARBulkUploadFieldKey
  | "voucher_type"
  | "gst_registration"
  | "gst_treatment"
  | "place_of_supply"
  | "customer_uuid"
  | "cost_centre"
  | "gstin";

export type PreviewFieldKey = Exclude<
  ARBulkUploadPreviewFieldKey,
  "customer_uuid"
>;

export type PreviewColumnKey = PreviewFieldKey | "row_status";
export type PreviewColumnPin = "left" | "right";

/** Production: PREVIEW_ROW_STATUS in config/.../bulk-upload-preview. */
export type PreviewRowStatusValue = "ready" | "warning" | "error" | "created";
export type PreviewIssueSeverityValue = "error" | "warning";

export type PreviewIssue = {
  group?: string;
  code?: string;
  type?: string;
  field?: string;
  severity?: PreviewIssueSeverityValue | string;
  message?: string;
  vchNo?: string | null;
  expectedTotalAmount?: string;
  expectedTaxAmount?: string;
};

export type PreviewPayload = Partial<
  Record<ARBulkUploadPreviewFieldKey | string, unknown>
>;

export interface ResponseARVoucherImportPreviewRow {
  importRowUuid: string;
  referenceNumberGroupSize?: number;
  referenceNumberKey?: string;
  sourceRowNumber: number;
  rowStatus: PreviewRowStatusValue;
  isBlocking: boolean;
  primaryIssueGroup: string | null;
  primaryIssueCode: string | null;
  warningCount: number;
  errorCount: number;
  sourcePayload: Record<string, unknown>;
  mappedPayload: PreviewPayload;
  finalPayload: PreviewPayload;
  issuePayload: PreviewIssue[];
}

export type PreviewColumnConfig = {
  key: PreviewColumnKey;
  label: string;
  fieldKey?: PreviewFieldKey;
  width: number;
  defaultVisible: boolean;
  pinned?: PreviewColumnPin;
};

export type PreviewSummary = {
  totalRecords: number;
  issueRows: number;
  validRows: number;
};

export type PreviewCreateInvoicesMode = "all" | "selected";

/** Production's ResponseARVoucherImportBatchSave, trimmed. */
export interface ResponseARVoucherImportBatchSave {
  batch: ResponseARVoucherImportBatch;
  createdCount: number;
  skippedCount: number;
  remainingErrorCount: number;
  createdVouchers: { importRowUuid: string; vchUuid: string }[];
}

/* -------------------------------------------------------------- sample file */

/**
 * PROTOTYPE ONLY — the spreadsheet a simulated upload "contains". There is no
 * xlsx parser in this repo, so every new upload reads this. In production the
 * backend parses the file and answers with ResponseARVoucherImportBatchMapping.
 */
export type SampleSalesFile = {
  sheets: SheetSummary[];
  /** Each sheet's cells, row 1 first — the header row is whichever is picked. */
  cells: Record<string, (string | number)[][]>;
};

/** One sheet read from a header row: its columns, and the rows under it. */
export type SheetTable = {
  header: string[];
  rows: (string | number)[][];
};

/**
 * PROTOTYPE ONLY — the customer masters the preview validates against.
 * Production checks GET /api/accounts/grouped-customer-accounts-list-taxes.
 */
export type SalesCustomerMaster = {
  name: string;
  gstin: string;
  state: string;
  costCentre: string;
};
