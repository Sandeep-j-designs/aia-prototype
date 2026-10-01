import type { PillTone } from "@/components/inbox/v2/ui";
import {
  AR_IMPORT_ALLOWED_FILE_EXTENSIONS,
  OPENABLE_AR_IMPORT_BATCH_STATUSES,
  mappingFieldGroups,
} from "@/config/pages/inbox/sales-upload";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ARBulkUploadFieldKey,
  type ArImportFileType,
  type FieldMappingConfig,
  type PreviewIssue,
  type PreviewPayload,
  type PreviewRowStatusValue,
  type ResponseARVoucherImportBatch,
  type ResponseARVoucherImportPreviewRow,
  type SalesCustomerMaster,
  type SampleSalesFile,
} from "@/types/pages/inbox/sales-upload";

/**
 * Pure helpers for the Sales upload flow. Most are production's, from
 * utils/pages/accounts-receivable/bulk-upload*.ts. The ones marked PROTOTYPE
 * stand in for work the backend does — reading the sheet into preview rows
 * and validating them — so the preview has something real to show.
 */

export type FieldMappings = Partial<
  Record<ARBulkUploadFieldKey, FieldMappingConfig>
>;

/** Production: getArImportFileType. */
export const getArImportFileType = (
  fileName: string
): ArImportFileType | null => {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (AR_IMPORT_ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as ArImportFileType)
    : null;
};

/** Production: formatFileSize in utils/components/bulk-upload. */
export const formatFileSize = (bytes: number) =>
  bytes >= 1048576
    ? `${(bytes / 1048576).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(1)} KB`;

/** Production: getArImportBatchReviewRoute, as a step rather than a URL. */
export const batchStep = (
  status: ARVoucherImportBatchStatus
): "mapping" | "preview" | null =>
  !OPENABLE_AR_IMPORT_BATCH_STATUSES.has(status)
    ? null
    : status === ARVoucherImportBatchStatus.PENDING_MAPPING
      ? "mapping"
      : "preview";

/* ------------------------------------------------------------------ mapping */

/** Field mappings (field → columns) as the table reads them (column → field). */
export const columnSelections = (mappings: FieldMappings) => {
  const out: Record<string, ARBulkUploadFieldKey> = {};
  (Object.keys(mappings) as ARBulkUploadFieldKey[]).forEach((key) =>
    mappings[key]?.sourceColumns.forEach((column) => {
      out[column] = key;
    })
  );
  return out;
};

/** Point one source column at a field, or at nothing. */
export const selectField = (
  mappings: FieldMappings,
  column: string,
  key: ARBulkUploadFieldKey | ""
): FieldMappings => {
  const next: FieldMappings = {};
  (Object.keys(mappings) as ARBulkUploadFieldKey[]).forEach((field) => {
    const columns = (mappings[field]?.sourceColumns ?? []).filter(
      (c) => c !== column
    );
    // One column per field: picking a field takes it off any other column.
    if (columns.length && field !== key)
      next[field] = { sourceColumns: columns };
  });
  if (key) next[key] = { sourceColumns: [column] };
  return next;
};

export const missingRequiredFieldLabels = (
  mode: VoucherViewMode,
  mappings: FieldMappings
) =>
  mappingFieldGroups(mode)
    .flatMap((group) => group.fields)
    .filter(
      (field) => field.required && !mappings[field.key]?.sourceColumns.length
    )
    .map((field) => field.label);

/** Production: getSuggestedTemplateName. */
export const getSuggestedTemplateName = (current: string | null) =>
  current ? `${current} (copy)` : "New Template";

/* ------------------------------------------------------------------ preview */

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (value: unknown) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const blank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

/** dd/mm/yyyy, as the sheet writes it, to the ISO date the payload holds. */
const isoDate = (value: unknown) => {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value ?? ""));
  return match
    ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
    : String(value ?? "");
};

const findMaster = (masters: SalesCustomerMaster[], name: unknown) =>
  masters.find(
    (m) =>
      m.name.toLowerCase() ===
      String(name ?? "")
        .trim()
        .toLowerCase()
  );

/**
 * PROTOTYPE: the backend's row validation, reduced to the four rules the demo
 * file exercises. Messages are production's (bulk-upload-preview-validation).
 */
const REQUIRED_FIELD_LABELS = {
  invoice_date: "Invoice Date",
  reference_number: "Reference No.",
  customer_name: "Customer Name",
  total_amount: "Total Amount",
} as const;

export const validatePreviewPayload = (
  payload: PreviewPayload,
  masters: SalesCustomerMaster[]
): PreviewIssue[] => {
  const issues: PreviewIssue[] = [];
  (
    [
      "invoice_date",
      "reference_number",
      "customer_name",
      "total_amount",
    ] as const
  ).forEach((field) => {
    if (blank(payload[field]))
      issues.push({
        group: "missing_data",
        code: "missing_required_field",
        field,
        severity: "error",
        // Production words these off the raw field key ("customer_name is
        // required."); the prototype names the column the reviewer sees.
        message: `${REQUIRED_FIELD_LABELS[field]} is required.`,
      });
  });
  const customer = payload.customer_name;
  if (!blank(customer)) {
    const master = findMaster(masters, customer);
    if (!master)
      issues.push({
        group: "customer_mismatch",
        code: "customer_not_found",
        field: "customer_name",
        severity: "error",
        message: `No match found for '${customer}'.`,
      });
    else if (blank(payload.gstin))
      issues.push({
        group: "missing_data",
        code: "missing_required_field",
        field: "gstin",
        severity: "error",
        message: "GSTIN is required.",
      });
  }
  const expected = round2(
    num(payload.item_amount) +
      num(payload.ledger_amount) +
      num(payload.tax_amount)
  );
  if (
    !blank(payload.total_amount) &&
    Math.abs(expected - num(payload.total_amount)) > 1
  )
    issues.push({
      group: "amount_mismatch",
      code: "total_mismatch",
      field: "total_amount",
      severity: "error",
      message: `total_amount does not reconcile with row amounts. Expected total_amount: ${expected.toFixed(2)}.`,
      expectedTotalAmount: expected.toFixed(2),
    });
  const hsn = String(payload.hsn_sac ?? "").trim();
  if (hsn && ![4, 6, 8].includes(hsn.length))
    issues.push({
      group: "format",
      code: "invalid_hsn_sac",
      field: "hsn_sac",
      severity: "warning",
      message: "hsn_sac must be a 4, 6, or 8 digit code.",
    });
  return issues;
};

/** A row's status and counts, from its issues. Created stays created. */
export const withIssues = (
  row: ResponseARVoucherImportPreviewRow,
  issues: PreviewIssue[]
): ResponseARVoucherImportPreviewRow => {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.length - errorCount;
  const rowStatus: PreviewRowStatusValue =
    row.rowStatus === "created"
      ? "created"
      : errorCount
        ? "error"
        : warningCount
          ? "warning"
          : "ready";
  return {
    ...row,
    rowStatus,
    isBlocking: errorCount > 0,
    errorCount,
    warningCount,
    primaryIssueGroup: issues[0]?.group ?? null,
    primaryIssueCode: issues[0]?.code ?? null,
    issuePayload: issues,
  };
};

/**
 * PROTOTYPE: what POST .../preview produces — the sheet read through the
 * mapping, with the AI's predictions (voucher type, sales ledger, cost
 * centre) and the customer master's GSTIN and state filled in, then
 * validated.
 */
export const buildPreviewRows = ({
  file,
  mappings,
  masters,
  gstRegistration,
  mode,
  batchId,
  limit,
}: {
  file: SampleSalesFile;
  mappings: FieldMappings;
  masters: SalesCustomerMaster[];
  gstRegistration: string;
  mode: VoucherViewMode;
  batchId: string;
  limit?: number;
}): ResponseARVoucherImportPreviewRow[] => {
  const index = (key: ARBulkUploadFieldKey) => {
    const column = mappings[key]?.sourceColumns[0];
    return column ? file.header.indexOf(column) : -1;
  };
  const rows = file.rows.slice(0, limit ?? file.rows.length);
  const groupSize = (ref: unknown) =>
    rows.filter((r) => r[index("reference_number")] === ref).length;
  return rows.map((source, n) => {
    const get = (key: ARBulkUploadFieldKey) => {
      const i = index(key);
      return i < 0 ? undefined : source[i];
    };
    const master = findMaster(masters, get("customer_name"));
    const igst = num(get("igst_amount"));
    const tax = blank(get("tax_amount"))
      ? round2(num(get("cgst_amount")) + num(get("sgst_amount")) + igst)
      : num(get("tax_amount"));
    const salesLedger = igst ? "Sales @ 5% (Interstate)" : "Sales @ 5% (Local)";
    const item = mode === VoucherViewMode.ITEM_MODE;
    const payload: PreviewPayload = {
      invoice_date: isoDate(get("invoice_date")),
      reference_number: get("reference_number") ?? "",
      voucher_number: get("voucher_number") ?? "",
      customer_name: get("customer_name") ?? "",
      voucher_type: "Sales",
      gstin: master?.gstin ?? "",
      place_of_supply: master?.state ?? "",
      cost_centre: master?.costCentre ?? "",
      sales_ledger: item ? (get("sales_ledger") ?? salesLedger) : "",
      item_name: item ? (get("item_name") ?? "") : "",
      hsn_sac: item ? String(get("hsn_sac") ?? "") : "",
      quantity: item ? num(get("quantity")) : "",
      unit_rate: item ? num(get("unit_rate")) : "",
      item_amount: item ? num(get("item_amount")) : "",
      ledger_name: item ? (get("ledger_name") ?? "") : salesLedger,
      ledger_amount: item
        ? blank(get("ledger_amount"))
          ? ""
          : num(get("ledger_amount"))
        : num(get("ledger_amount") ?? get("item_amount")),
      cgst_amount: num(get("cgst_amount")),
      sgst_amount: num(get("sgst_amount")),
      igst_amount: igst,
      tax_amount: tax,
      total_amount: num(get("total_amount")),
      narration: get("narration") ?? "",
      gst_registration: gstRegistration,
    };
    const ref = get("reference_number");
    const row: ResponseARVoucherImportPreviewRow = {
      importRowUuid: `${batchId}-row-${n + 1}`,
      referenceNumberKey: String(ref ?? ""),
      referenceNumberGroupSize: groupSize(ref),
      sourceRowNumber: n + 2,
      rowStatus: "ready",
      isBlocking: false,
      primaryIssueGroup: null,
      primaryIssueCode: null,
      warningCount: 0,
      errorCount: 0,
      sourcePayload: Object.fromEntries(
        file.header.map((h, i) => [h, source[i]])
      ),
      mappedPayload: payload,
      finalPayload: payload,
      issuePayload: [],
    };
    return withIssues(row, validatePreviewPayload(payload, masters));
  });
};

/**
 * An edit to one cell. The issue on that field goes — the accountant has
 * answered it — and the row's status is worked out again from what is left.
 * A customer renamed to one the masters know brings its GSTIN and state.
 *
 * DEV: PATCH /api/accounts-receivable/v2/import-batches/:id/preview/rows
 * returns the revalidated row; this stands in for that.
 */
export const editPreviewRow = (
  row: ResponseARVoucherImportPreviewRow,
  field: string,
  value: unknown,
  masters: SalesCustomerMaster[]
): ResponseARVoucherImportPreviewRow => {
  const finalPayload: PreviewPayload = { ...row.finalPayload, [field]: value };
  let issues = row.issuePayload.filter((issue) => issue.field !== field);
  if (field === "customer_name") {
    const master = findMaster(masters, value);
    if (master) {
      finalPayload.gstin = master.gstin;
      finalPayload.place_of_supply = master.state;
      if (master.gstin) issues = issues.filter((i) => i.field !== "gstin");
    }
  }
  return withIssues({ ...row, finalPayload }, issues);
};

/* -------------------------------------------------------------- batch counts */

/** The batch's row counts, from its rows — what the backend recomputes. */
export const withRowCounts = (
  batch: ResponseARVoucherImportBatch,
  rows: ResponseARVoucherImportPreviewRow[]
): ResponseARVoucherImportBatch => {
  const count = (status: PreviewRowStatusValue) =>
    rows.filter((r) => r.rowStatus === status).length;
  const createdRows = count("created");
  const pendingRows = rows.length - createdRows;
  return {
    ...batch,
    totalRows: rows.length,
    createdRows,
    pendingRows,
    readyRows: count("ready"),
    warningRows: count("warning"),
    errorRows: count("error"),
    status:
      rows.length && !pendingRows
        ? ARVoucherImportBatchStatus.COMPLETE
        : batch.status === ARVoucherImportBatchStatus.COMPLETE
          ? ARVoucherImportBatchStatus.NEEDS_REVIEW
          : batch.status,
    updatedAt: new Date().toISOString(),
  };
};

/* ---------------------------------------------------------------- row status */

/** Production: getPreviewStatusLabel, verbatim. */
export const getPreviewStatusLabel = (
  row: Pick<
    ResponseARVoucherImportPreviewRow,
    "rowStatus" | "primaryIssueGroup" | "errorCount" | "warningCount"
  >
) => {
  if (row.rowStatus === "created") return "Created";
  if (row.rowStatus === "ready") return "Valid";
  if (row.primaryIssueGroup === "missing_data") return "Missing Data";
  if (row.primaryIssueGroup === "customer_mismatch") return "Mismatch";
  if (row.errorCount + row.warningCount > 1) return "Multiple Issue";
  return row.rowStatus === "warning" ? "Warning" : "Issue";
};

/**
 * Production: getPreviewStatusClassName, as tones. Its green → ok, warning →
 * warn, accent → info. Missing Data is a one-off purple there
 * (bg-[#f1edff]), which has no token: it is warn here, because neutral grey
 * would read as "nothing to do" on a row that blocks creation.
 */
export const getPreviewStatusTone = (
  row: Pick<
    ResponseARVoucherImportPreviewRow,
    "rowStatus" | "primaryIssueGroup"
  >
): PillTone => {
  if (row.rowStatus === "ready" || row.rowStatus === "created") return "ok";
  if (row.primaryIssueGroup === "customer_mismatch") return "warn";
  if (row.primaryIssueGroup === "missing_data") return "warn";
  return "info";
};
