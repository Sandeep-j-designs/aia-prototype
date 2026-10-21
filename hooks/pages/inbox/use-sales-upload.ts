import { useMemo, useSyncExternalStore } from "react";
import {
  MOCK_IMPORT_TEMPLATES,
  MOCK_SALES_CUSTOMERS,
  SALES_GST_REGISTRATION,
  SAMPLE_SALES_FILE,
  completeRegisterDraft,
  mockSalesBatches,
  suggestMapping,
} from "@/config/pages/inbox/mock-sales-upload";
import { mappingSchemaFor } from "@/config/pages/inbox/sales-upload";
import {
  additionalField,
  isAdditionalKey,
  isLive,
  resolveChoice,
  type FieldConfig,
} from "@/config/pages/inbox/additional-fields";
import { getFieldConfig } from "@/hooks/pages/inbox/use-field-config";
import {
  SEED_COMPANIES,
  createImportedInvoices,
  type ImportedInvoice,
} from "@/components/inbox/v2/store";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type MappingConfigPayload,
  type ResponseARVoucherImportBatch,
  type ResponseARVoucherImportBatchMapping,
  type ResponseARVoucherImportPreviewRow,
  type ResponseARVoucherImportTemplate,
} from "@/types/pages/inbox/sales-upload";
import {
  buildPreviewRows,
  columnsInDraft,
  editPreviewRow,
  fitToColumns,
  getArImportFileType,
  pruneMappings,
  readSheet,
  templateFits,
  withRowCounts,
  withSuggestions,
  type FieldMappings,
} from "@/utils/pages/inbox/sales-upload";
import { withoutItemFields } from "@/utils/pages/inbox/sales-upload-mapping";

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
  draft: MappingConfigPayload;
  /** A new sheet or header row being read; the table waits on it. */
  applyingStructure?: boolean;
  /** GET .../import-batches/:id/preview `results`. */
  rows: ResponseARVoucherImportPreviewRow[];
};

/** File read before mapping, then the AI pass before preview. */
const READ_MS = 1500;
const STRUCTURE_MS = 700;
const TEMPLATE_PREVIEW_MS = 2500;
const PREDICT_MS = 9000;
const PREDICT_TICK_MS = 300;
const CREATE_MS = 2000;

/** The sheet the batch reads, from the header row it reads it at. */
const tableOf = (batch: ResponseARVoucherImportBatch) =>
  readSheet(SAMPLE_SALES_FILE, batch.selectedSheetName, batch.headerRowIndex);

/** The mapping response for the file as the batch reads it. */
const mappingFor = (
  batch: ResponseARVoucherImportBatch,
  config: FieldConfig
): ResponseARVoucherImportBatchMapping => {
  const table = tableOf(batch);
  return {
    importBatchUuid: batch.importBatchUuid,
    status: batch.status,
    importMode: batch.importMode,
    selectedSheetName: batch.selectedSheetName,
    headerRowIndex: batch.headerRowIndex,
    dateFormat: batch.dateFormat,
    discountType: batch.discountType === "amount" ? "amount" : "percentage",
    sheets: SAMPLE_SALES_FILE.sheets,
    detectedColumns: table.header,
    // DEV: the backend filters the schema by the company's field configuration.
    mappingSchema: mappingSchemaFor(batch.importMode, config),
    mappingPayload: suggestMapping(table, batch.importMode),
    sampleRowPayload: Object.fromEntries(
      table.header.map((h, i) => [h, table.rows.slice(0, 3).map((r) => r[i])])
    ),
  };
};

/** A draft from a mapping, held to the fields this company's configuration offers. */
const draftFrom = (
  batch: ResponseARVoucherImportBatch,
  mapping: Pick<MappingConfigPayload, "fieldMappings" | "items" | "ledgers">,
  config: FieldConfig,
  options?: MappingConfigPayload["options"]
): MappingConfigPayload => ({
  payloadType: "mapping_config",
  importMode: batch.importMode,
  selection: {
    selectedSheetName: batch.selectedSheetName,
    headerRowIndex: batch.headerRowIndex,
  },
  options: options ?? {
    dateFormat: batch.dateFormat ?? "dd/MM/yyyy",
    discountType: batch.discountType === "amount" ? "amount" : "percentage",
  },
  fieldMappings: pruneMappings(mapping.fieldMappings, config),
  items: structuredClone(
    mapping.items ?? [{ id: crypto.randomUUID(), fields: {} }]
  ),
  ledgers: structuredClone(
    mapping.ledgers?.length
      ? mapping.ledgers
      : [{ id: crypto.randomUUID(), fields: {} }]
  ),
});

const EMPTY_DRAFT: MappingConfigPayload = {
  payloadType: "mapping_config",
  importMode: VoucherViewMode.ITEM_MODE,
  selection: { selectedSheetName: null, headerRowIndex: null },
  options: { dateFormat: "dd/MM/yyyy", discountType: "percentage" },
  fieldMappings: {},
  items: [],
  ledgers: [],
};

// Seeded for the organisations the prototype opens with; one created later
// starts with no batches.
let entries: SalesBatchEntry[] = SEED_COMPANIES.flatMap((company) =>
  mockSalesBatches(company.id).map(({ batch, rows }) => {
    const config = getFieldConfig(company.id);
    const failed = batch.status === ARVoucherImportBatchStatus.FAILED;
    return {
      companyId: company.id,
      batch,
      rows,
      mapping: failed ? null : mappingFor(batch, config),
      draft: failed
        ? EMPTY_DRAFT
        : draftFrom(batch, completeRegisterDraft(), config),
    };
  })
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
    file: tableOf(entry.batch),
    draft: entry.draft,
    masters: MOCK_SALES_CUSTOMERS,
    gstRegistration: SALES_GST_REGISTRATION,
    batchId: entry.batch.importBatchUuid,
    // DEV: the backend validates against the company's field configuration.
    config: getFieldConfig(entry.companyId),
  });

const predicting = new Set<string>();

export const salesUpload = {
  /**
   * Upload a file and start reading it. The batch is processing until the
   * columns are found, then waits on mapping.
   *
   * With a saved template: one that fits the file is applied by the
   * backend, which runs the preview too — the batch goes from processing
   * straight to needs_review, and the upload step opens the preview. One
   * that doesn't fit stops at mapping with failureCode
   * "template_incompatible": what it could map is kept, the rest is left
   * for the accountant, and Map Fields says so.
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
    const firstSheet = SAMPLE_SALES_FILE.sheets[0].name;
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
      selectedSheetName: firstSheet,
      headerRowIndex: 1,
      dateFormat: template?.configPayload.options?.dateFormat ?? "dd/MM/yyyy",
      discountType:
        template?.configPayload.options?.discountType ?? "percentage",
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
      { companyId, batch, mapping: null, draft: EMPTY_DRAFT, rows: [] },
      ...entries,
    ];
    emit();
    window.setTimeout(() => {
      const config = getFieldConfig(companyId);
      const e = find(id);
      if (!e) return;
      const fits =
        !!template &&
        templateFits(template, SAMPLE_SALES_FILE, tableOf(e.batch));
      const sheet =
        (fits && template?.configPayload.selection?.selectedSheetName) ||
        firstSheet;
      const read = {
        ...e.batch,
        selectedSheetName: sheet,
        headerRowIndex:
          (fits && template?.configPayload.selection?.headerRowIndex) || 1,
      };
      const table = tableOf(read);
      const mapping = mappingFor(read, config);
      const fitted = template && {
        fieldMappings: fitToColumns(
          template.configPayload.fieldMappings,
          table.header
        ) as FieldMappings,
        items: (template.configPayload.items ?? []).map((x) => ({
          id: crypto.randomUUID(),
          fields: fitToColumns(x.fields, table.header) as FieldMappings,
        })),
        ledgers: (template.configPayload.ledgers ?? []).map((x) => ({
          id: crypto.randomUUID(),
          fields: fitToColumns(x.fields, table.header) as FieldMappings,
        })),
      };
      const next = {
        ...read,
        // A template that fits keeps processing: its preview is being built.
        status: fits
          ? ARVoucherImportBatchStatus.PROCESSING
          : ARVoucherImportBatchStatus.PENDING_MAPPING,
        failureCode: template && !fits ? "template_incompatible" : null,
        totalRows: table.rows.length,
        pendingRows: table.rows.length,
      };
      patch(id, () => ({
        batch: next,
        mapping: { ...mapping, status: next.status },
        draft: draftFrom(next, fitted ?? mapping.mappingPayload, config),
      }));
      if (!fits) return;
      window.setTimeout(() => {
        patch(id, (entry) => {
          const rows = rebuildRows(entry);
          return {
            rows,
            batch: withRowCounts(
              {
                ...entry.batch,
                aiProcessedRowCount: rows.length,
                status: ARVoucherImportBatchStatus.NEEDS_REVIEW,
              },
              rows
            ),
          };
        });
      }, TEMPLATE_PREVIEW_MS);
    }, READ_MS);
    return id;
  },

  /** DEV: PATCH /api/accounts-receivable/v2/import-batches/:id/mapping */
  setDraft(id: string, draft: MappingConfigPayload) {
    patch(id, () => ({ draft }));
  },

  /**
   * Item Mode ⇄ Accounting Mode. The accountant's mapping stays; going to
   * Accounting Mode drops the sales ledger and the item fields from the
   * header mapping (the item entries are kept, as production keeps them).
   * The schema changes with the mode.
   *
   * DEV: PATCH .../import-batches/:id/mapping { importMode }
   */
  setImportMode(id: string, importMode: VoucherViewMode) {
    patch(id, (e) => {
      const batch = { ...e.batch, importMode };
      const toAccounting = importMode === VoucherViewMode.ACCOUNTING_MODE;
      return {
        batch,
        mapping: mappingFor(batch, getFieldConfig(e.companyId)),
        draft: {
          ...e.draft,
          importMode,
          fieldMappings: toAccounting
            ? withoutItemFields(e.draft.fieldMappings)
            : e.draft.fieldMappings,
        },
      };
    });
  },

  /**
   * A new sheet or header row: the file is read again from there, and the
   * mapping starts over from the backend's suggestion for those columns.
   * A new sheet is read from its first row.
   *
   * DEV: PATCH .../mapping { selectedSheetName, headerRowIndex,
   * fieldMappings: {} }, then POST .../mapping/reset.
   */
  setSheet(id: string, selectedSheetName: string, headerRowIndex: number) {
    patch(id, () => ({ applyingStructure: true }));
    window.setTimeout(() => {
      patch(id, (e) => {
        const batch = { ...e.batch, selectedSheetName, headerRowIndex };
        const config = getFieldConfig(e.companyId);
        const mapping = mappingFor(batch, config);
        const table = tableOf(batch);
        return {
          applyingStructure: false,
          batch: {
            ...batch,
            totalRows: table.rows.length,
            pendingRows: table.rows.length,
          },
          mapping,
          draft: draftFrom(
            batch,
            mapping.mappingPayload,
            config,
            e.draft.options
          ),
        };
      });
    }, STRUCTURE_MS);
  },

  /** DEV: POST /api/accounts-receivable/v2/import-batches/:id/mapping/reset */
  resetMapping(id: string) {
    patch(id, (e) => ({
      draft: e.mapping
        ? draftFrom(
            e.batch,
            e.mapping.mappingPayload,
            getFieldConfig(e.companyId),
            e.draft.options
          )
        : e.draft,
    }));
  },

  /**
   * PROTOTYPE: Field Configuration changed under an open mapping. Fields
   * switched off give their columns back; fields switched on take the
   * backend's suggestion where the column is still free.
   *
   * DEV: PATCH the company's field configuration, then re-GET .../mapping.
   */
  applyFieldConfig(id: string, config: FieldConfig) {
    patch(id, (e) => ({
      mapping: e.mapping && {
        ...e.mapping,
        mappingSchema: mappingSchemaFor(e.batch.importMode, config),
      },
      draft: {
        ...e.draft,
        fieldMappings: withSuggestions(
          pruneMappings(e.draft.fieldMappings, config),
          e.mapping?.mappingPayload.fieldMappings ?? {},
          config,
          columnsInDraft(e.draft)
        ),
      },
    }));
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
    const total = tableOf(entry.batch).rows.length;
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
      /* A row stays created only while it is still the same invoice — after
         a new sheet or header row, row 3 is another invoice altogether. */
      const created = new Map(
        e.rows
          .filter((r) => r.rowStatus === "created")
          .map((r) => [r.importRowUuid, r.referenceNumberKey])
      );
      const rows = rebuildRows(e).map((row) =>
        created.get(row.importRowUuid) === row.referenceNumberKey
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
          ? editPreviewRow(
              row,
              field,
              value,
              MOCK_SALES_CUSTOMERS,
              getFieldConfig(e.companyId)
            )
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
      toInvoices(
        eligible,
        entry.batch.originalFileName,
        entry.draft.fieldMappings,
        getFieldConfig(entry.companyId)
      )
    );
    patch(id, (e) => ({ rows, batch: withRowCounts(e.batch, rows) }));
    return {
      createdCount: eligible.length,
      remainingErrorCount: rows.filter((r) => r.rowStatus === "error").length,
    };
  },

  /**
   * Everything Map Fields holds — sheet, header row, date format, discount
   * type, the header mapping and every item and ledger — under a name. A
   * name already taken is refused, as the backend refuses it.
   *
   * DEV: POST /api/accounts-receivable/v2/import-templates
   */
  saveTemplate(name: string, draft: MappingConfigPayload) {
    if (
      templates.some(
        (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase()
      )
    )
      throw new Error("A template with this name already exists.");
    const now = new Date().toISOString();
    const template: ResponseARVoucherImportTemplate = {
      templateUuid: `tpl-${crypto.randomUUID()}`,
      name: name.trim(),
      importMode: draft.importMode,
      configPayload: structuredClone({
        selection: draft.selection,
        options: draft.options,
        fieldMappings: draft.fieldMappings,
        items: draft.items,
        ledgers: draft.ledgers,
      }),
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
  fileName: string,
  mappings: FieldMappings,
  config: FieldConfig
): ImportedInvoice[] => {
  /* The optional fields this upload mapped, keyed the way the sales invoice
     keys them. A list value goes in as the invoice's own id; one the list
     does not have stays out, as the preview warned it would. */
  const additional = Object.keys(mappings).filter(
    (key) => isAdditionalKey(key) && isLive(config, key)
  );
  const extraOf = (
    payload: ResponseARVoucherImportPreviewRow["finalPayload"]
  ) =>
    Object.fromEntries(
      additional.flatMap((key) => {
        const field = additionalField(key)!;
        const raw = String(payload[key] ?? "").trim();
        if (!raw) return [];
        const value = field.type === "choice" ? resolveChoice(field, raw) : raw;
        return value ? [[field.id, value]] : [];
      })
    );
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
      extra: extraOf(p),
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
