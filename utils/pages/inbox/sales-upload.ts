import type { PillTone } from "@/components/inbox/v2/ui";
import {
  ADDITIONAL_LABELS,
  AR_ADDITIONAL_GROUPS,
  additionalField,
  fieldConfigDefaults,
  isAdditionalKey,
  isLive,
  resolveChoice,
  type FieldConfig,
} from "@/config/pages/inbox/additional-fields";
import {
  AR_IMPORT_ALLOWED_FILE_EXTENSIONS,
  OPENABLE_AR_IMPORT_BATCH_STATUSES,
} from "@/config/pages/inbox/sales-upload";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ARBulkUploadFieldKey,
  type ArImportFileType,
  type FieldMappingConfig,
  type MappingConfigPayload,
  type MappingEntry,
  type PreviewIssue,
  type PreviewPayload,
  type PreviewRowStatusValue,
  type ResponseARVoucherImportBatch,
  type ResponseARVoucherImportPreviewRow,
  type ResponseARVoucherImportTemplate,
  type SalesCustomerMaster,
  type SampleSalesFile,
  type SheetTable,
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

/** Every column the draft uses, header fields and entries alike. */
export const columnsInDraft = (draft: {
  fieldMappings: FieldMappings;
  items?: MappingEntry[];
  ledgers?: MappingEntry[];
}) =>
  new Set(
    [
      draft.fieldMappings,
      ...(draft.items ?? []).map((e) => e.fields),
      ...(draft.ledgers ?? []).map((e) => e.fields),
    ].flatMap((fields) =>
      Object.values(fields).flatMap((m) => m?.sourceColumns ?? [])
    )
  );

/**
 * PROTOTYPE: a mapping held to what the configuration offers. A field
 * switched off stops being part of the invoice, so its column goes back to
 * unmapped rather than feeding something nobody can see.
 */
export const pruneMappings = (
  mappings: FieldMappings,
  config: FieldConfig
): FieldMappings =>
  Object.fromEntries(
    Object.entries(mappings).filter(
      ([key]) => !isAdditionalKey(key) || isLive(config, key)
    )
  ) as FieldMappings;

/**
 * PROTOTYPE: the backend's suggestion for fields a configuration change has
 * just made available — taken only where the field and its column are both
 * still free, so nothing the accountant chose is moved.
 */
export const withSuggestions = (
  mappings: FieldMappings,
  suggestion: FieldMappings,
  config: FieldConfig,
  taken: Set<string>
): FieldMappings => {
  const next = { ...mappings };
  (Object.keys(suggestion) as ARBulkUploadFieldKey[]).forEach((key) => {
    const columns = suggestion[key]?.sourceColumns ?? [];
    if (
      isAdditionalKey(key) &&
      isLive(config, key) &&
      !next[key]?.sourceColumns.length &&
      columns.length &&
      columns.every((c) => !taken.has(c))
    ) {
      next[key] = { sourceColumns: columns };
      columns.forEach((c) => taken.add(c));
    }
  });
  return next;
};

/**
 * PROTOTYPE: the backend reading one sheet from a header row — that row's
 * cells become the columns (a blank one is "Column C", a repeat gets " (2)"),
 * and the rows under it are the data.
 */
export const readSheet = (
  file: SampleSalesFile,
  sheetName: string | null,
  headerRowIndex: number | null
): SheetTable => {
  const cells = file.cells[sheetName ?? ""] ?? Object.values(file.cells)[0];
  const at = Math.max(1, headerRowIndex ?? 1) - 1;
  const raw = cells[at] ?? [];
  const seen = new Map<string, number>();
  const header = raw.map((cell, i) => {
    const name =
      String(cell ?? "").trim() || `Column ${String.fromCharCode(65 + i)}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return n > 1 ? `${name} (${n})` : name;
  });
  return { header, rows: cells.slice(at + 1) };
};

/**
 * PROTOTYPE: whether a saved template fits this file — its sheet is there and
 * every column it maps is among the columns read. The backend answers this;
 * a template that doesn't fit leaves the batch at mapping with
 * failureCode "template_incompatible".
 */
export const templateFits = (
  template: ResponseARVoucherImportTemplate,
  file: SampleSalesFile,
  table: SheetTable
) => {
  const sheet = template.configPayload.selection?.selectedSheetName;
  if (sheet && !file.cells[sheet]) return false;
  const used = columnsInDraft(template.configPayload);
  return used.size > 0 && [...used].every((c) => table.header.includes(c));
};

/** PROTOTYPE: a template's mapping, held to the columns this file has. */
export const fitToColumns = <T extends { sourceColumns: string[] }>(
  fields: Partial<Record<string, T>>,
  columns: string[]
) =>
  Object.fromEntries(
    Object.entries(fields)
      .map(([key, config]) => [
        key,
        config && {
          ...config,
          sourceColumns: config.sourceColumns.filter((c) =>
            columns.includes(c)
          ),
        },
      ])
      .filter(([, config]) => (config as T | undefined)?.sourceColumns.length)
  ) as Partial<Record<string, T>>;

/* ------------------------------------------------------------------ preview */

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (value: unknown) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const blank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

/**
 * A sheet's date, read in the format Map Fields was told, to the ISO date the
 * payload holds. One the format doesn't fit stays as written, so the preview
 * shows what the sheet had.
 */
const DATE_PATTERNS: Record<string, [RegExp, ("d" | "m" | "y")[]]> = {
  "dd/MM/yyyy": [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, ["d", "m", "y"]],
  "dd-MM-yyyy": [/^(\d{1,2})-(\d{1,2})-(\d{4})$/, ["d", "m", "y"]],
  "MM/dd/yyyy": [/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, ["m", "d", "y"]],
  "yyyy-MM-dd": [/^(\d{4})-(\d{1,2})-(\d{1,2})$/, ["y", "m", "d"]],
};
const isoDate = (value: unknown, format = "dd/MM/yyyy") => {
  const [pattern, order] = DATE_PATTERNS[format] ?? DATE_PATTERNS["dd/MM/yyyy"];
  const match = pattern.exec(String(value ?? "").trim());
  if (!match) return String(value ?? "");
  const part = (p: "d" | "m" | "y") => match[order.indexOf(p) + 1];
  const [d, m] = [Number(part("d")), Number(part("m"))];
  if (m < 1 || m > 12 || d < 1 || d > 31) return String(value ?? "");
  return `${part("y")}-${part("m").padStart(2, "0")}-${part("d").padStart(2, "0")}`;
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
  masters: SalesCustomerMaster[],
  config: FieldConfig = fieldConfigDefaults()
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
  return [...issues, ...validateAdditional(payload, config)];
};

/**
 * PROTOTYPE: the sales invoice's own rules for its optional fields, applied
 * to the ones this upload mapped — the conditional pairs, the formats the
 * portal insists on, and list values the invoice has no entry for.
 */
export const validateAdditional = (
  payload: PreviewPayload,
  config: FieldConfig = fieldConfigDefaults()
): PreviewIssue[] => {
  const issues: PreviewIssue[] = [];
  /* The fields this row carries, and any its filled fields make mandatory —
     a template applied straight to preview can leave those unmapped, and
     the row still can't go to Tally without them. As on the invoice form,
     only a field Field Configuration has on is owed. */
  const owes = (f: { key: string; req?: string }) =>
    !!f.req && !blank(payload[f.req]) && isLive(config, f.key);
  const owed = AR_ADDITIONAL_GROUPS.flatMap((g) => g.fields)
    .filter((f) => !f.systemOnly && owes(f))
    .map((f) => f.key);
  [
    ...new Set([...Object.keys(payload).filter(isAdditionalKey), ...owed]),
  ].forEach((key) => {
    const field = additionalField(key)!;
    const value = String(payload[key] ?? "").trim();
    if (!value) {
      if (field.req && owes(field))
        issues.push({
          group: "missing_data",
          code: "missing_required_field",
          field: key,
          severity: "error",
          message: `${field.label} is required once ${ADDITIONAL_LABELS[field.req]} is filled.`,
        });
      return;
    }
    if (field.fmt && !field.fmt.test(value))
      issues.push({
        group: "format",
        code: "invalid_format",
        field: key,
        severity: "error",
        message: field.fmt.message,
      });
    if (field.type === "choice" && !resolveChoice(field, value))
      issues.push({
        group: "format",
        code: "unknown_value",
        field: key,
        severity: "warning",
        message: `'${value}' is not in the ${field.label} list. It will be left blank on the invoice.`,
      });
  });
  return issues;
};

/**
 * PROTOTYPE: the conditional fields this upload owes but never mapped — a
 * template applied straight to preview can leave them out. They get a
 * preview column, so a row's "Required once…" error can be answered in the
 * cell rather than only by going back to Map Fields.
 */
export const owedConditionalKeys = (
  mappedKeys: string[],
  config: FieldConfig
) =>
  AR_ADDITIONAL_GROUPS.flatMap((g) => g.fields)
    .filter(
      (f) =>
        !f.systemOnly &&
        !!f.req &&
        mappedKeys.includes(f.req) &&
        !mappedKeys.includes(f.key) &&
        isLive(config, f.key)
    )
    .map((f) => f.key);

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
  draft,
  masters,
  gstRegistration,
  batchId,
  limit,
  config = fieldConfigDefaults(),
}: {
  file: SheetTable;
  draft: MappingConfigPayload;
  masters: SalesCustomerMaster[];
  gstRegistration: string;
  batchId: string;
  limit?: number;
  /** The company's Field Configuration — which optional fields are owed. */
  config?: FieldConfig;
}): ResponseARVoucherImportPreviewRow[] => {
  const mode = draft.importMode;
  const mappings = draft.fieldMappings;
  const column = (name: string) => file.header.indexOf(name);
  /* One field's value in a row: the column as written, or — for a field
     that sums several columns or subtracts some — the signed total. */
  const valueIn = (
    source: (string | number)[],
    config?: FieldMappingConfig
  ): unknown => {
    if (!config?.sourceColumns.length) return undefined;
    const negative = config.negativeAdjustmentColumns ?? [];
    if (config.sourceColumns.length === 1 && !negative.length)
      return source[column(config.sourceColumns[0])];
    return round2(
      config.sourceColumns.reduce((total, c) => {
        const v = num(source[column(c)]);
        return total + (negative.includes(c) ? -v : v);
      }, 0)
    );
  };
  const rows = file.rows.slice(0, limit ?? file.rows.length);
  const refOf = (source: (string | number)[]) =>
    valueIn(source, mappings.reference_number);
  const groupSize = (ref: unknown) =>
    rows.filter((r) => refOf(r) === ref).length;
  return rows.map((source, n) => {
    const get = (key: ARBulkUploadFieldKey) => valueIn(source, mappings[key]);
    /* The row's items and ledgers. A row that carries several items (a
       sheet laid out wide: Product 1, Product 2…) reads as one line whose
       amount is theirs together. DEV: the backend splits them into lines. */
    const used = (entries: MappingEntry[] = []) =>
      entries
        .map((e) => ({
          get: (key: ARBulkUploadFieldKey) => valueIn(source, e.fields[key]),
        }))
        .filter(
          (e) =>
            !blank(e.get("item_name")) ||
            !blank(e.get("item_amount")) ||
            !blank(e.get("ledger_name")) ||
            !blank(e.get("ledger_amount"))
        );
    const items = used(draft.items);
    const ledgers = used(draft.ledgers);
    const one = items.length === 1 ? items[0] : null;
    const sumOf = (list: typeof items, key: ARBulkUploadFieldKey) =>
      list.some((e) => !blank(e.get(key)))
        ? round2(list.reduce((s, e) => s + num(e.get(key)), 0))
        : "";
    const master = findMaster(masters, get("customer_name"));
    const igst = num(get("igst_amount"));
    const tax = blank(get("tax_amount"))
      ? round2(num(get("cgst_amount")) + num(get("sgst_amount")) + igst)
      : num(get("tax_amount"));
    const salesLedger = igst ? "Sales @ 5% (Interstate)" : "Sales @ 5% (Local)";
    const item = mode === VoucherViewMode.ITEM_MODE;
    const ledgerName = String(ledgers[0]?.get("ledger_name") ?? "");
    const payload: PreviewPayload = {
      invoice_date: isoDate(get("invoice_date"), draft.options.dateFormat),
      reference_number: get("reference_number") ?? "",
      voucher_number: get("voucher_number") ?? "",
      customer_name: get("customer_name") ?? "",
      voucher_type: "Sales",
      gstin: master?.gstin ?? "",
      place_of_supply: master?.state ?? "",
      cost_centre: master?.costCentre ?? "",
      sales_ledger: item ? (get("sales_ledger") ?? salesLedger) : "",
      item_name: item
        ? items
            .map((e) => String(e.get("item_name") ?? ""))
            .filter(Boolean)
            .join(" + ")
        : "",
      hsn_sac: item ? String(items[0]?.get("hsn_sac") ?? "") : "",
      quantity: item && one ? num(one.get("quantity")) : "",
      unit_rate: item && one ? num(one.get("unit_rate")) : "",
      item_amount: item ? num(sumOf(items, "item_amount")) : "",
      ledger_name: item ? ledgerName : ledgerName || salesLedger,
      ledger_amount: sumOf(ledgers, "ledger_amount"),
      cgst_amount: num(get("cgst_amount")),
      sgst_amount: num(get("sgst_amount")),
      igst_amount: igst,
      tax_amount: tax,
      total_amount: blank(get("total_amount"))
        ? item
          ? round2(
              num(sumOf(items, "item_amount")) +
                num(sumOf(ledgers, "ledger_amount")) +
                tax
            )
          : ""
        : num(get("total_amount")),
      narration: get("narration") ?? "",
      gst_registration: gstRegistration,
    };
    /* Whatever optional fields this upload mapped, as the sheet wrote them.
       Dates come in as the sheet's dd/mm/yyyy, like the invoice date. */
    (Object.keys(mappings) as ARBulkUploadFieldKey[])
      .filter(isAdditionalKey)
      .forEach((key) => {
        const value = get(key);
        const field = additionalField(key)!;
        payload[key] =
          field.type === "date"
            ? isoDate(value, draft.options.dateFormat)
            : String(value ?? "").trim();
      });
    const ref = refOf(source);
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
    return withIssues(row, validatePreviewPayload(payload, masters, config));
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
  masters: SalesCustomerMaster[],
  config: FieldConfig = fieldConfigDefaults()
): ResponseARVoucherImportPreviewRow => {
  const finalPayload: PreviewPayload = { ...row.finalPayload, [field]: value };
  let issues = row.issuePayload.filter((issue) => issue.field !== field);
  /* An optional field can satisfy, or newly owe, its pair — so its rules are
     worked out again over the row rather than just cleared. */
  if (isAdditionalKey(field))
    issues = [
      ...issues.filter((i) => !i.field || !isAdditionalKey(i.field)),
      ...validateAdditional(finalPayload, config),
    ];
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
