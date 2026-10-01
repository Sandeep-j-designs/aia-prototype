import type { PillTone } from "@/components/inbox/v2/ui";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ArImportFileType,
  type MappingFieldGroupSchema,
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

/**
 * The mapping schema's field groups. Production receives these from
 * GET .../import-batches/:id/mapping (`mappingSchema.fieldGroups`); the labels
 * are the preview column labels, which is what the backend sends.
 * Required-ness follows the import mode: item lines in Item Mode, ledger
 * lines in Accounting Mode.
 */
export const mappingFieldGroups = (
  mode: VoucherViewMode
): MappingFieldGroupSchema[] => {
  const item = mode === VoucherViewMode.ITEM_MODE;
  return [
    {
      id: "invoice",
      label: "Invoice",
      fields: [
        { key: "invoice_date", label: "Invoice Date", required: true },
        { key: "reference_number", label: "Reference No.", required: true },
        { key: "voucher_number", label: "Voucher/Invoice Number" },
        { key: "customer_name", label: "Customer Name", required: true },
        { key: "due_date", label: "Due Date" },
        { key: "narration", label: "Narration" },
      ],
    },
    ...(item
      ? [
          {
            id: "items",
            label: "Item Details",
            fields: [
              { key: "sales_ledger", label: "Sales Ledger" },
              { key: "item_name", label: "Item Name", required: true },
              { key: "item_description", label: "Item Description" },
              { key: "hsn_sac", label: "HSN/SAC" },
              { key: "godown_location", label: "Godown/Location" },
              { key: "quantity", label: "Quantity" },
              { key: "uom", label: "UOM" },
              { key: "unit_rate", label: "Unit Rate" },
              { key: "discount", label: "Discount" },
              { key: "item_amount", label: "Item Amount", required: true },
            ] as MappingFieldGroupSchema["fields"],
          },
        ]
      : []),
    {
      id: "ledgers",
      label: "Ledgers",
      fields: [
        { key: "ledger_name", label: "Ledger Name", required: !item },
        { key: "ledger_description", label: "Ledger Description" },
        { key: "ledger_amount", label: "Ledger Amount", required: !item },
        { key: "ledger_name_2", label: "Ledger Name 2" },
        { key: "ledger_description_2", label: "Ledger Description 2" },
        { key: "ledger_amount_2", label: "Ledger Amount 2" },
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
        { key: "tds_amount", label: "TDS/TCS Amount" },
      ],
    },
    {
      id: "totals",
      label: "Totals",
      fields: [{ key: "total_amount", label: "Total Amount", required: true }],
    },
  ];
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
]);

/** Fields the backend sends as locked (production `metadata.lockedFields`). */
export const PREVIEW_LOCKED_FIELDS = new Set<PreviewColumnKey>([
  "voucher_type",
  "gst_registration",
]);
