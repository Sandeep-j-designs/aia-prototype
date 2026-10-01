import { useMemo, useSyncExternalStore } from "react";
import {
  MOCK_IMPORT_TEMPLATES,
  MOCK_SALES_CUSTOMERS,
  SALES_GST_REGISTRATION,
  SAMPLE_SALES_FILE,
  SUGGESTED_ACCOUNTING_MAPPING,
  SUGGESTED_ITEM_MAPPING,
  COMPLETE_ITEM_MAPPING,
  mockSalesBatches,
} from "@/config/pages/inbox/mock-sales-upload";
import { mappingFieldGroups } from "@/config/pages/inbox/sales-upload";
import {
  SEED_COMPANIES,
  createImportedInvoices,
  type ImportedInvoice,
} from "@/components/inbox/v2/store";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type ResponseARVoucherImportBatch,
  type ResponseARVoucherImportBatchMapping,
  type ResponseARVoucherImportPreviewRow,
  type ResponseARVoucherImportTemplate,
} from "@/types/pages/inbox/sales-upload";
import {
  buildPreviewRows,
  editPreviewRow,
  getArImportFileType,
  withRowCounts,
  type FieldMappings,
} from "@/utils/pages/inbox/sales-upload";

/**
 * Sales upload state — the import batches, their mappings and preview rows,
 * and the saved mapping templates.
 *
 * Module-level, so the Uploaded Invoice tab and the upload flow read the
 * same batches, and a batch keeps processing after you leave the screen that
 * started it (production polls; here a timer runs). In memory only: a reload
 * starts over, as the rest of the prototype does.
 *
 * Every function below is one API call in production, named on its DEV line.
 */

export type SalesBatchEntry = {
  companyId: string;
  batch: ResponseARVoucherImportBatch;
  /** GET .../import-batches/:id/mapping — null until the file is read. */
  mapping: ResponseARVoucherImportBatchMapping | null;
  /** The mapping as the accountant has it now (production's draft). */
  fieldMappings: FieldMappings;
  /** GET .../import-batches/:id/preview `results`. */
  rows: ResponseARVoucherImportPreviewRow[];
};

/** File read before mapping, then the AI pass before preview. */
const READ_MS = 1500;
const PREDICT_MS = 9000;
const PREDICT_TICK_MS = 300;
const CREATE_MS = 2000;

const suggestionFor = (mode: VoucherViewMode) =>
  mode === VoucherViewMode.ITEM_MODE
    ? SUGGESTED_ITEM_MAPPING
    : SUGGESTED_ACCOUNTING_MAPPING;

/** The mapping response for the sample file, in one mode. */
const mappingFor = (
  batch: ResponseARVoucherImportBatch,
  suggestion: FieldMappings
): ResponseARVoucherImportBatchMapping => ({
  importBatchUuid: batch.importBatchUuid,
  status: batch.status,
  importMode: batch.importMode,
  selectedSheetName: batch.selectedSheetName,
  headerRowIndex: batch.headerRowIndex,
  sheets: SAMPLE_SALES_FILE.sheets,
  detectedColumns: SAMPLE_SALES_FILE.header,
  mappingSchema: { fieldGroups: mappingFieldGroups(batch.importMode) },
  mappingPayload: suggestion,
  sampleRowPayload: Object.fromEntries(
    SAMPLE_SALES_FILE.header.map((h, i) => [
      h,
      SAMPLE_SALES_FILE.rows.slice(0, 3).map((row) => row[i]),
    ])
  ),
});

// Seeded for the organisations the prototype opens with; one created later
// starts with no batches.
let entries: SalesBatchEntry[] = SEED_COMPANIES.flatMap((company) =>
  mockSalesBatches(company.id).map(({ batch, rows }) => ({
    companyId: company.id,
    batch,
    rows,
    mapping:
      batch.status === ARVoucherImportBatchStatus.FAILED
        ? null
        : mappingFor(batch, COMPLETE_ITEM_MAPPING),
    fieldMappings:
      batch.status === ARVoucherImportBatchStatus.FAILED
        ? {}
        : COMPLETE_ITEM_MAPPING,
  }))
);
let templates: ResponseARVoucherImportTemplate[] = MOCK_IMPORT_TEMPLATES;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const find = (id: string) =>
  entries.find((e) => e.batch.importBatchUuid === id);
const patch = (
  id: string,
  change: (entry: SalesBatchEntry) => Partial<SalesBatchEntry>
) => {
  entries = entries.map((e) =>
    e.batch.importBatchUuid === id ? { ...e, ...change(e) } : e
  );
  emit();
};
const patchBatch = (
  id: string,
  change: Partial<ResponseARVoucherImportBatch>
) =>
  patch(id, (e) => ({
    batch: { ...e.batch, ...change, updatedAt: new Date().toISOString() },
  }));

const rebuildRows = (entry: SalesBatchEntry) =>
  buildPreviewRows({
    file: SAMPLE_SALES_FILE,
    mappings: entry.fieldMappings,
    masters: MOCK_SALES_CUSTOMERS,
    gstRegistration: SALES_GST_REGISTRATION,
    mode: entry.batch.importMode,
    batchId: entry.batch.importBatchUuid,
  });

const predicting = new Set<string>();

export const salesUpload = {
  /**
   * Upload a file and start reading it. The batch is processing until the
   * columns are found, then waits on mapping.
   *
   * DEV: POST /api/accounts-receivable/v2/import-batches (after the DMS
   * upload), then poll GET /api/accounts-receivable/v2/import-batches/:id
   * while status is processing.
   */
  createBatch(
    companyId: string,
    file: { name: string; size: number },
    template: ResponseARVoucherImportTemplate | null
  ) {
    const id = `import-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const importMode = template?.importMode ?? VoucherViewMode.ITEM_MODE;
    const batch: ResponseARVoucherImportBatch = {
      aiProcessedRowCount: 0,
      importBatchUuid: id,
      fileUuid: `${id}-file`,
      selectedTemplateUuid: template?.templateUuid ?? null,
      selectedTemplateName: template?.name ?? null,
      originalFileName: file.name,
      fileType: getArImportFileType(file.name) ?? "xlsx",
      fileSizeBytes: file.size,
      importMode,
      status: ARVoucherImportBatchStatus.PROCESSING,
      selectedSheetName: SAMPLE_SALES_FILE.sheets[0].name,
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
      createdAt: now,
      updatedAt: now,
    };
    entries = [
      { companyId, batch, mapping: null, fieldMappings: {}, rows: [] },
      ...entries,
    ];
    emit();
    window.setTimeout(() => {
      const suggestion = suggestionFor(importMode);
      patch(id, (e) => {
        const next = {
          ...e.batch,
          status: ARVoucherImportBatchStatus.PENDING_MAPPING,
          totalRows: SAMPLE_SALES_FILE.rows.length,
          pendingRows: SAMPLE_SALES_FILE.rows.length,
        };
        return {
          batch: next,
          mapping: mappingFor(next, suggestion),
          // A saved template prefills the mapping over the suggestion.
          fieldMappings: template?.configPayload.fieldMappings ?? suggestion,
        };
      });
    }, READ_MS);
    return id;
  },

  /** DEV: PATCH /api/accounts-receivable/v2/import-batches/:id/mapping */
  setFieldMappings(id: string, fieldMappings: FieldMappings) {
    patch(id, () => ({ fieldMappings }));
  },

  /**
   * Item Mode ⇄ Accounting Mode. The backend re-suggests for the new mode.
   * DEV: PATCH .../import-batches/:id/mapping { importMode }
   */
  setImportMode(id: string, importMode: VoucherViewMode) {
    patch(id, (e) => {
      const batch = { ...e.batch, importMode };
      const suggestion = suggestionFor(importMode);
      return {
        batch,
        mapping: mappingFor(batch, suggestion),
        fieldMappings: suggestion,
      };
    });
  },

  /** DEV: PATCH .../import-batches/:id/mapping { selectedSheetName, headerRowIndex } */
  setSheet(id: string, selectedSheetName: string, headerRowIndex: number) {
    patchBatch(id, { selectedSheetName, headerRowIndex });
  },

  /** DEV: POST /api/accounts-receivable/v2/import-batches/:id/mapping/reset */
  resetMapping(id: string) {
    patch(id, (e) => ({ fieldMappings: e.mapping?.mappingPayload ?? {} }));
  },

  /**
   * Run the AI pass and build the preview. Progress is counted in rows, as
   * production's ai-prediction-progress reports it.
   *
   * DEV: POST /api/accounts-receivable/v2/import-batches/:id/preview, then
   * poll GET /api/accounts-receivable/v2/ai-prediction-progress?batchUuid=…
   */
  startPreview(id: string) {
    const entry = find(id);
    if (!entry || predicting.has(id)) return;
    predicting.add(id);
    const total = SAMPLE_SALES_FILE.rows.length;
    patchBatch(id, {
      status: ARVoucherImportBatchStatus.PROCESSING,
      aiProcessedRowCount: 0,
      totalRows: total,
    });
    const started = Date.now();
    const tick = window.setInterval(() => {
      const done = Math.min(
        total,
        Math.floor(((Date.now() - started) / PREDICT_MS) * total)
      );
      if (done < total) {
        patchBatch(id, { aiProcessedRowCount: done });
        return;
      }
      window.clearInterval(tick);
      predicting.delete(id);
      patch(id, (e) => {
        const rows = rebuildRows(e);
        return {
          rows,
          batch: withRowCounts(
            {
              ...e.batch,
              aiProcessedRowCount: total,
              status: ARVoucherImportBatchStatus.NEEDS_REVIEW,
            },
            rows
          ),
        };
      });
    }, PREDICT_TICK_MS);
  },

  /**
   * "Edit Mapping?" → Go to Preview: the new mapping is applied without the
   * AI pass. Rows already created stay created.
   * DEV: PATCH .../mapping, then POST .../preview { skipPrediction: true }
   */
  applyMappingWithoutPrediction(id: string) {
    patch(id, (e) => {
      const created = new Set(
        e.rows
          .filter((r) => r.rowStatus === "created")
          .map((r) => r.importRowUuid)
      );
      const rows = rebuildRows(e).map((row) =>
        created.has(row.importRowUuid)
          ? { ...row, rowStatus: "created" as const }
          : row
      );
      return { rows, batch: withRowCounts(e.batch, rows) };
    });
  },

  /** DEV: PATCH /api/accounts-receivable/v2/import-batches/:id/preview/rows */
  updateRow(id: string, rowUuid: string, field: string, value: unknown) {
    patch(id, (e) => {
      const rows = e.rows.map((row) =>
        row.importRowUuid === rowUuid
          ? editPreviewRow(row, field, value, MOCK_SALES_CUSTOMERS)
          : row
      );
      return { rows, batch: withRowCounts(e.batch, rows) };
    });
  },

  /** DEV: DELETE /api/accounts-receivable/v2/import-batches/:id/preview/rows/bulk */
  deleteRows(id: string, rowUuids: string[]) {
    const drop = new Set(rowUuids);
    patch(id, (e) => {
      const rows = e.rows.filter((row) => !drop.has(row.importRowUuid));
      return { rows, batch: withRowCounts(e.batch, rows) };
    });
    return rowUuids.length;
  },

  /**
   * Create invoices from the given rows (or every eligible row). Rows with
   * errors are skipped and stay in preview.
   *
   * DEV: POST /api/accounts-receivable/v2/import-batches/:id/save
   */
  async createInvoices(id: string, rowUuids?: string[]) {
    await new Promise((resolve) => window.setTimeout(resolve, CREATE_MS));
    const entry = find(id);
    if (!entry) return { createdCount: 0, remainingErrorCount: 0 };
    const wanted = rowUuids ? new Set(rowUuids) : null;
    const eligible = entry.rows.filter(
      (row) =>
        (!wanted || wanted.has(row.importRowUuid)) &&
        (row.rowStatus === "ready" || row.rowStatus === "warning")
    );
    const ids = new Set(eligible.map((row) => row.importRowUuid));
    const rows = entry.rows.map((row) =>
      ids.has(row.importRowUuid)
        ? { ...row, rowStatus: "created" as const }
        : row
    );
    createImportedInvoices(
      entry.companyId,
      toInvoices(eligible, entry.batch.originalFileName)
    );
    patch(id, (e) => ({ rows, batch: withRowCounts(e.batch, rows) }));
    return {
      createdCount: eligible.length,
      remainingErrorCount: rows.filter((r) => r.rowStatus === "error").length,
    };
  },

  /** DEV: POST /api/accounts-receivable/v2/import-templates */
  saveTemplate(
    name: string,
    importMode: VoucherViewMode,
    fieldMappings: FieldMappings
  ) {
    const now = new Date().toISOString();
    const template: ResponseARVoucherImportTemplate = {
      templateUuid: `tpl-${crypto.randomUUID()}`,
      name,
      importMode,
      configPayload: { fieldMappings },
      createdAt: now,
      updatedAt: now,
    };
    templates = [...templates, template];
    emit();
    return template;
  },
};

/** Rows sharing a reference number are one invoice's lines. */
const toInvoices = (
  rows: ResponseARVoucherImportPreviewRow[],
  fileName: string
): ImportedInvoice[] => {
  const groups = new Map<string, ResponseARVoucherImportPreviewRow[]>();
  rows.forEach((row) => {
    const key = String(row.finalPayload.reference_number ?? row.importRowUuid);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  const n = (value: unknown) => Number(value) || 0;
  const s = (value: unknown) => String(value ?? "");
  return [...groups.values()].map((lines) => {
    const p = lines[0].finalPayload;
    const sum = (key: string) =>
      lines.reduce((total, row) => total + n(row.finalPayload[key]), 0);
    return {
      referenceNumber: s(p.reference_number),
      voucherNumber: s(p.voucher_number),
      invoiceDate: s(p.invoice_date),
      customerName: s(p.customer_name),
      gstin: s(p.gstin),
      salesLedger: s(p.sales_ledger || p.ledger_name),
      costCentre: s(p.cost_centre),
      totalAmount: Math.round(sum("total_amount") * 100) / 100,
      lines: lines.map((row) => ({
        itemName: s(row.finalPayload.item_name),
        description: s(
          row.finalPayload.item_description ||
            row.finalPayload.ledger_description
        ),
        quantity: n(row.finalPayload.quantity),
        unitRate: n(row.finalPayload.unit_rate),
        amount: n(
          row.finalPayload.item_amount || row.finalPayload.ledger_amount
        ),
      })),
      taxes: [
        { ledger: "Output CGST", amount: sum("cgst_amount") },
        { ledger: "Output SGST", amount: sum("sgst_amount") },
        { ledger: "Output IGST", amount: sum("igst_amount") },
      ],
      fileName,
    };
  });
};

const getEntries = () => entries;
const getTemplates = () => templates;

/** One company's batches, newest first. */
export const useSalesBatches = (companyId: string) => {
  const all = useSyncExternalStore(subscribe, getEntries, getEntries);
  return useMemo(
    () =>
      all
        .filter((e) => e.companyId === companyId)
        .sort((a, b) => b.batch.createdAt.localeCompare(a.batch.createdAt)),
    [all, companyId]
  );
};

export const useSalesBatch = (id?: string) => {
  const all = useSyncExternalStore(subscribe, getEntries, getEntries);
  return id ? all.find((e) => e.batch.importBatchUuid === id) : undefined;
};

/** DEV: GET /api/accounts-receivable/v2/import-templates */
export const useImportTemplates = () =>
  useSyncExternalStore(subscribe, getTemplates, getTemplates);
