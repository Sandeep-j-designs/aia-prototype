import type { PillTone } from "@/components/inbox/v2/ui";
import {
  AR_ADDITIONAL_GROUPS,
  fieldConfigDefaults,
  type FieldConfig,
} from "@/config/pages/inbox/additional-fields";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ARBulkUploadFieldKey,
  type ArImportFileType,
  type MappingFieldGroupSchema,
  type MappingOption,
  type MappingSchemaPayload,
  type PreviewColumnConfig,
  type PreviewColumnKey,
  type PreviewRowStatusValue,
} from "@/types/pages/inbox/sales-upload";

/**
 * Static config for the Sales upload flow. Each constant is production's,
 * from config/pages/accounts-receivable/ar-voucher-v2.ts and
 * bulk-upload-preview.ts, with production's Tailwind colour classes swapped
 * for the prototype's Pill tones (see the notes on each map).
 */

export const AR_IMPORT_MAX_UPLOAD_SIZE_BYTES = 30 * 1024 * 1024;
export const AR_IMPORT_DEFAULT_IMPORT_MODE = VoucherViewMode.ITEM_MODE;
export const AR_IMPORT_ALLOWED_FILE_EXTENSIONS: readonly ArImportFileType[] = [
  "csv",
  "xls",
  "xlsx",
];
export const AR_IMPORT_ACCEPT_VALUE = ".csv,.xls,.xlsx";

export const AR_IMPORT_SAMPLE_TEMPLATES = [
  { downloadKey: "arAccountingInvoiceTemplate", label: "Accounting Invoice" },
  { downloadKey: "arItemInvoiceTemplate", label: "Item Invoice" },
] as const;

export const IMPORT_MODE_LABELS: Record<VoucherViewMode, string> = {
  [VoucherViewMode.ITEM_MODE]: "Item Mode",
  [VoucherViewMode.ACCOUNTING_MODE]: "Accounting Mode",
};

/**
 * Production's importBatchStatusConfig. Its classes map to tones:
 * amber → warn, accent → info, green → ok, destructive → error.
 */
export const importBatchStatusConfig: Record<
  ARVoucherImportBatchStatus,
  { label: string; tone: PillTone }
> = {
  [ARVoucherImportBatchStatus.PROCESSING]: {
    label: "Extracting...",
    tone: "warn",
  },
  [ARVoucherImportBatchStatus.PENDING_MAPPING]: {
    label: "Pending Mapping",
    tone: "warn",
  },
  [ARVoucherImportBatchStatus.NEEDS_REVIEW]: {
    label: "Needs Review",
    tone: "info",
  },
  [ARVoucherImportBatchStatus.COMPLETE]: { label: "Complete", tone: "ok" },
  [ARVoucherImportBatchStatus.FAILED]: { label: "Failed", tone: "error" },
};

/** Production: OPENABLE_AR_IMPORT_BATCH_STATUSES. */
export const OPENABLE_AR_IMPORT_BATCH_STATUSES =
  new Set<ARVoucherImportBatchStatus>([
    ARVoucherImportBatchStatus.PENDING_MAPPING,
    ARVoucherImportBatchStatus.NEEDS_REVIEW,
    ARVoucherImportBatchStatus.COMPLETE,
  ]);

/** Production: AR_IMPORT_MAX_MAPPING_ENTRIES — items or ledgers per row. */
export const AR_IMPORT_MAX_MAPPING_ENTRIES = 10;

/** Production: AR_ITEM_LEDGER_MAPPING_FIELDS, in the prototype's keys. */
export const AR_ITEM_LEDGER_MAPPING_FIELDS = {
  item: [
    "item_name",
    "quantity",
    "uom",
    "unit_rate",
    "discount",
    "item_amount",
    "hsn_sac",
    "godown_location",
    "item_description",
  ],
  ledger: ["ledger_name", "ledger_amount", "ledger_description"],
} as const satisfies Record<string, readonly ARBulkUploadFieldKey[]>;

/** Production: AR_MAPPING_TIME_ESTIMATE. */
export const AR_MAPPING_TIME_ESTIMATE = {
  rowsPerPage: 100,
  firstPageMinutes: { min: 2, max: 3 },
  additionalPageMinutes: { min: 0.75, max: 1.25 },
};

/** The formats a date column can be read in; the value is the backend's. */
export const DATE_FORMAT_OPTIONS: MappingOption[] = [
  { label: "DD/MM/YYYY", value: "dd/MM/yyyy" },
  { label: "DD-MM-YYYY", value: "dd-MM-yyyy" },
  { label: "MM/DD/YYYY", value: "MM/dd/yyyy" },
  { label: "YYYY-MM-DD", value: "yyyy-MM-dd" },
];

/** Production's DiscountType labels. */
export const AMOUNT_CHOICE_OPTIONS: MappingOption[] = [
  { label: "%", value: "percentage" },
  { label: "₹", value: "amount" },
];

/**
 * The mapping schema. Production receives it from GET .../import-batches/
 * :id/mapping (`mappingSchema`); this is the same shape, in the prototype's
 * snake_case keys.
 *
 * Items and ledgers are entry groups: a row can carry Item 1…Item 10 and
 * Ledger 1…Ledger 10, and each entry in use needs an amount — a ledger
 * may give its name instead (`requiredAnyOf`). Item 1 is required in Item
 * Mode, Ledger 1 in Accounting Mode; the item group is not offered in Accounting Mode at all.
 *
 * PROTOTYPE: after Totals come the invoice's optional groups, every one of
 * them — `off` where the company's Field Configuration has it switched off,
 * since picking a field there switches it on. The IRP's own three (Ack No,
 * Ack Date, IRN) are left out: they are issued when the e-invoice is
 * generated, so no spreadsheet has them. A conditional field ("Order Date,
 * once Order No(s) is filled") is required once its trigger is mapped.
 *
 * DEV: which fields sum, take a negative adjustment or carry an option is
 * the backend's call; these follow production's tests and fixtures, and TDS
 * taking a % or ₹ amount is the prototype's guess at `amount_type`.
 */
export const mappingSchemaFor = (
  mode: VoucherViewMode,
  config: FieldConfig = fieldConfigDefaults()
): MappingSchemaPayload => {
  const item = mode === VoucherViewMode.ITEM_MODE;
  const additional: MappingFieldGroupSchema[] = AR_ADDITIONAL_GROUPS.map(
    (g) => ({
      id: g.id,
      label: g.label,
      off: !config[g.id]?.on,
      fields: g.fields
        .filter((f) => !f.systemOnly)
        .map((f) => ({
          key: f.key,
          label: f.label,
          requiredWhen: f.req,
          // Read in the file's date format, so the row offers it.
          ...(f.type === "date" ? { optionType: "date_format" as const } : {}),
          ...(config[g.id]?.on && config[g.id].fields[f.id] === false
            ? { off: true }
            : {}),
        })),
    })
  );
  return {
    fieldGroups: [
      {
        id: "header",
        label: "Header",
        // Production's Header group, in its order.
        fields: [
          {
            key: "invoice_date",
            label: "Invoice Date",
            required: true,
            optionType: "date_format",
          },
          { key: "voucher_number", label: "Voucher/Invoice Number" },
          {
            key: "reference_number",
            label: "Reference Number",
            required: true,
          },
          { key: "customer_name", label: "Customer Name", required: true },
          // Item Mode adds the invoice up from its items.
          { key: "total_amount", label: "Total Amount", required: !item },
          {
            key: "due_date",
            label: "Due Date",
            required: true,
            optionType: "date_format",
          },
          { key: "narration", label: "Narration" },
          ...(item
            ? [
                {
                  key: "sales_ledger" as const,
                  label: "Sales Ledger",
                  required: true,
                },
              ]
            : []),
        ],
      },
      ...(item
        ? [
            {
              id: "item",
              label: "Item",
              // The invoice form stars a line's Amount, not its item.
              requiredAnyOf: ["item_amount"],
              fields: [
                { key: "item_name", label: "Item Name" },
                { key: "item_description", label: "Item Description" },
                { key: "hsn_sac", label: "HSN/SAC" },
                { key: "godown_location", label: "Godown/Location" },
                { key: "quantity", label: "Quantity" },
                { key: "uom", label: "UOM" },
                { key: "unit_rate", label: "Unit Rate" },
                {
                  key: "discount",
                  label: "Discount",
                  optionType: "discount_type",
                },
                {
                  key: "item_amount",
                  label: "Item Amount",
                  multiSelectTransform: "sum",
                },
              ],
            } satisfies MappingFieldGroupSchema,
          ]
        : []),
      {
        id: "ledger",
        label: "Ledger",
        requiredAnyOf: ["ledger_name", "ledger_amount"],
        fields: [
          { key: "ledger_name", label: "Ledger Name" },
          {
            key: "ledger_amount",
            label: "Ledger Amount",
            multiSelectTransform: "sum",
            supportsNegativeAdjustment: true,
          },
          { key: "ledger_description", label: "Ledger Description" },
        ],
      },
      {
        id: "taxes",
        label: "Taxes",
        fields: [
          { key: "cgst_ledger", label: "CGST Ledger" },
          { key: "cgst_amount", label: "CGST Amount" },
          { key: "sgst_ledger", label: "SGST/UTGST Ledger" },
          { key: "sgst_amount", label: "SGST/UTGST Amount" },
          { key: "igst_ledger", label: "IGST Ledger" },
          { key: "igst_amount", label: "IGST Amount" },
          { key: "tax_amount", label: "GST Total Amount" },
          { key: "tds_tcs_ledger", label: "TDS/TCS Ledger" },
          {
            key: "tds_amount",
            label: "TDS/TCS Amount",
            optionType: "amount_type",
          },
        ],
      },
      ...additional,
    ],
    dateFormatOptions: DATE_FORMAT_OPTIONS,
    discountTypeOptions: AMOUNT_CHOICE_OPTIONS,
    amountTypeOptions: AMOUNT_CHOICE_OPTIONS,
  };
};

/** Production: AR_AI_PROCESSING_STEPS_LABEL, verbatim. */
export const AR_AI_PROCESSING_STEPS_LABEL = [
  { label: "Reading your file", threshold: 10 },
  { label: "Scanning fields", threshold: 20 },
  { label: "Validating rows", threshold: 35 },
  { label: "AI mapping fields", threshold: 90 },
  { label: "Preparing preview", threshold: 100 },
];

/** Production: PREVIEW_ROW_STATUS_OPTIONS. */
export const PREVIEW_ROW_STATUS_OPTIONS: {
  label: string;
  value: PreviewRowStatusValue;
}[] = [
  { label: "Valid", value: "ready" },
  { label: "Warning", value: "warning" },
  { label: "Error", value: "error" },
  { label: "Created", value: "created" },
];

/** Production: DEFAULT_PREVIEW_ROW_STATUS_FILTER — everything but Created. */
export const DEFAULT_PREVIEW_ROW_STATUS_FILTER: PreviewRowStatusValue[] = [
  "ready",
  "warning",
  "error",
];

/**
 * Production's PREVIEW_COLUMNS, in order. Only the visible-by-default set is
 * listed with defaultVisible: true; the rest come back through Columns.
 */
export const PREVIEW_COLUMNS: PreviewColumnConfig[] = [
  {
    key: "invoice_date",
    label: "Invoice Date",
    fieldKey: "invoice_date",
    width: 132,
    defaultVisible: true,
    pinned: "left",
  },
  {
    key: "reference_number",
    label: "Reference No.",
    fieldKey: "reference_number",
    width: 142,
    defaultVisible: true,
    pinned: "left",
  },
  {
    key: "customer_name",
    label: "Customer Name",
    fieldKey: "customer_name",
    width: 168,
    defaultVisible: true,
    pinned: "left",
  },
  {
    key: "voucher_type",
    label: "Voucher Type",
    fieldKey: "voucher_type",
    width: 140,
    defaultVisible: true,
  },
  {
    key: "voucher_number",
    label: "Voucher/Invoice Number",
    fieldKey: "voucher_number",
    width: 154,
    defaultVisible: true,
  },
  {
    key: "due_date",
    label: "Due Date",
    fieldKey: "due_date",
    width: 132,
    defaultVisible: false,
  },
  {
    key: "gstin",
    label: "GSTIN",
    fieldKey: "gstin",
    width: 150,
    defaultVisible: true,
  },
  {
    key: "place_of_supply",
    label: "Place of Supply",
    fieldKey: "place_of_supply",
    width: 160,
    defaultVisible: true,
  },
  {
    key: "cost_centre",
    label: "Cost Centre",
    fieldKey: "cost_centre",
    width: 140,
    defaultVisible: true,
  },
  {
    key: "sales_ledger",
    label: "Sales Ledger",
    fieldKey: "sales_ledger",
    width: 150,
    defaultVisible: true,
  },
  {
    key: "item_name",
    label: "Item Name",
    fieldKey: "item_name",
    width: 160,
    defaultVisible: true,
  },
  {
    key: "hsn_sac",
    label: "HSN/SAC",
    fieldKey: "hsn_sac",
    width: 126,
    defaultVisible: true,
  },
  {
    key: "quantity",
    label: "Quantity",
    fieldKey: "quantity",
    width: 118,
    defaultVisible: false,
  },
  {
    key: "unit_rate",
    label: "Unit Rate",
    fieldKey: "unit_rate",
    width: 126,
    defaultVisible: false,
  },
  {
    key: "item_amount",
    label: "Item Amount",
    fieldKey: "item_amount",
    width: 132,
    defaultVisible: true,
  },
  {
    key: "ledger_name",
    label: "Ledger Name",
    fieldKey: "ledger_name",
    width: 150,
    defaultVisible: true,
  },
  {
    key: "ledger_amount",
    label: "Ledger Amount",
    fieldKey: "ledger_amount",
    width: 150,
    defaultVisible: true,
  },
  {
    key: "cgst_amount",
    label: "CGST Amount",
    fieldKey: "cgst_amount",
    width: 142,
    defaultVisible: false,
  },
  {
    key: "sgst_amount",
    label: "SGST/UTGST Amount",
    fieldKey: "sgst_amount",
    width: 142,
    defaultVisible: false,
  },
  {
    key: "igst_amount",
    label: "IGST Amount",
    fieldKey: "igst_amount",
    width: 142,
    defaultVisible: false,
  },
  {
    key: "tax_amount",
    label: "GST Total Amount",
    fieldKey: "tax_amount",
    width: 172,
    defaultVisible: true,
  },
  {
    key: "total_amount",
    label: "Total Amount",
    fieldKey: "total_amount",
    width: 136,
    defaultVisible: true,
  },
  {
    key: "narration",
    label: "Narration",
    fieldKey: "narration",
    width: 180,
    defaultVisible: false,
  },
  {
    key: "gst_registration",
    label: "MY GST Registration",
    fieldKey: "gst_registration",
    width: 152,
    defaultVisible: true,
  },
  {
    key: "row_status",
    label: "Status",
    width: 126,
    defaultVisible: true,
    pinned: "right",
  },
];

/** Production: FIXED_PREVIEW_COLUMN_KEYS — never hidden from Columns. */
export const FIXED_PREVIEW_COLUMN_KEY_SET = new Set<PreviewColumnKey>([
  "invoice_date",
  "reference_number",
  "customer_name",
  "row_status",
]);

/** Production: PREVIEW_RIGHT_ALIGNED_INPUT_COLUMNS, for the shown subset. */
export const PREVIEW_AMOUNT_COLUMNS = new Set<PreviewColumnKey>([
  "item_amount",
  "ledger_amount",
  "cgst_amount",
  "sgst_amount",
  "igst_amount",
  "tax_amount",
  "total_amount",
  "unit_rate",
]);
export const PREVIEW_NUMBER_COLUMNS = new Set<PreviewColumnKey>([
  ...PREVIEW_AMOUNT_COLUMNS,
  "quantity",
]);
export const PREVIEW_DATE_COLUMNS = new Set<PreviewColumnKey>([
  "invoice_date",
  "due_date",
  ...AR_ADDITIONAL_GROUPS.flatMap((g) => g.fields)
    .filter((f) => f.type === "date")
    .map((f) => f.key),
]);

/**
 * PROTOTYPE: the preview columns for an upload's mapped optional fields, in
 * the invoice's group order, shown by default — the accountant mapped them,
 * so they want to see what came through. They go in ahead of Status, which
 * stays pinned last.
 */
export const additionalPreviewColumns = (
  mappedKeys: string[]
): PreviewColumnConfig[] =>
  AR_ADDITIONAL_GROUPS.flatMap((g) => g.fields)
    .filter((f) => mappedKeys.includes(f.key))
    .map((f) => ({
      key: f.key,
      label: f.label,
      fieldKey: f.key,
      width: 160,
      defaultVisible: true,
    }));

/** Fields the backend sends as locked (production `metadata.lockedFields`). */
export const PREVIEW_LOCKED_FIELDS = new Set<PreviewColumnKey>([
  "voucher_type",
  "gst_registration",
]);
