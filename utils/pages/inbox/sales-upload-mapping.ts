/**
 * The Map Fields rules — production's utils/pages/accounts-receivable/
 * bulk-upload-mapping.ts and bulk-upload-mapping-page.ts, function for
 * function, in the prototype's snake_case field keys. What a column can
 * feed, what a pick does to the rest of the mapping, summed columns, the
 * linked reference/voucher number, negative adjustments, item and ledger
 * entries, and what is still missing before Preview.
 *
 * PROTOTYPE additions are marked: the invoice's optional groups, and their
 * "required once its trigger is mapped" rule.
 */
import {
  AR_IMPORT_MAX_MAPPING_ENTRIES,
  AR_ITEM_LEDGER_MAPPING_FIELDS,
  AR_MAPPING_TIME_ESTIMATE,
} from "@/config/pages/inbox/sales-upload";
import {
  VoucherViewMode,
  type ARBulkUploadFieldKey,
  type FieldMappingConfig,
  type FieldMappingsPayload,
  type MappingAmountType,
  type MappingConfigPayload,
  type MappingEntry,
  type MappingEntryCollection,
  type MappingFieldGroupSchema,
  type MappingFieldSchema,
  type MappingFieldSelector,
  type MappingSchemaPayload,
  type SampleRowPayload,
} from "@/types/pages/inbox/sales-upload";

export type MappingFieldConfigMap = Map<
  ARBulkUploadFieldKey,
  MappingFieldSchema
>;

export type MappingTableRowState = {
  sourceColumn: string;
  selectedFieldKey?: ARBulkUploadFieldKey;
  showDateFormat: boolean;
  showDiscountType: boolean;
  showAmountType: boolean;
  showNegativeAdjustment: boolean;
  showAggregation: boolean;
};

export type MappingFieldOption = {
  value: string;
  label: string;
  selector: MappingFieldSelector;
  field: MappingFieldSchema;
  config?: FieldMappingConfig;
  requiredAlternative: boolean;
  disabled: boolean;
};

export type MappingFieldOptionGroup = {
  id: string;
  label: string;
  collection: MappingEntryCollection | null;
  /** PROTOTYPE: an optional invoice group switched off. */
  off?: boolean;
  /** PROTOTYPE: an optional invoice group — its fields open to the side. */
  additional?: boolean;
  options: MappingFieldOption[];
  onAdd?: () => void;
  entries?: {
    id: string;
    label: string;
    options: MappingFieldOption[];
    onDelete?: () => void;
  }[];
};

export type VisibleMappingFieldGroup = Omit<
  MappingFieldOptionGroup,
  "entries"
> & {
  entries?: (NonNullable<MappingFieldOptionGroup["entries"]>[number] & {
    visibleOptions: MappingFieldOption[];
  })[];
  isAtEntryLimit: boolean;
};

const isAmountType = (value?: string): value is MappingAmountType =>
  value === "percentage" || value === "amount";

export const newEntryId = () => crypto.randomUUID();

export const buildMappingFieldConfigMap = (
  mappingSchema?: MappingSchemaPayload | null
): MappingFieldConfigMap => {
  const fields: MappingFieldConfigMap = new Map();
  for (const group of mappingSchema?.fieldGroups ?? []) {
    for (const field of group.fields) fields.set(field.key, field);
  }
  return fields;
};

/** Header and flat fields are a key; item and ledger fields also name their entry. */
export const getMappingFieldKey = (selector: MappingFieldSelector) =>
  typeof selector === "string" ? selector : selector.field;

export const getMappingFields = (
  draft: MappingConfigPayload,
  selector: MappingFieldSelector
): FieldMappingsPayload =>
  typeof selector === "string"
    ? draft.fieldMappings
    : (draft[selector.collection]?.find(
        (entry) => entry.id === selector.entryId
      )?.fields ?? {});

/**
 * Column → what it feeds. A column in two fields (the linked reference and
 * voucher number) shows the first; header fields come before entries.
 */
export const buildColumnFieldSelections = (
  sourceColumns: string[],
  fieldMappings: FieldMappingsPayload,
  items: MappingEntry[] = [],
  ledgers: MappingEntry[] = []
) => {
  const selections: Partial<Record<string, MappingFieldSelector>> = {};
  sourceColumns.forEach((column) => {
    for (const [fieldKey, config] of Object.entries(fieldMappings)) {
      if (config?.sourceColumns?.includes(column)) {
        selections[column] = fieldKey as ARBulkUploadFieldKey;
        break;
      }
    }
  });
  for (const [collection, entries] of [
    ["items", items],
    ["ledgers", ledgers],
  ] as const) {
    for (const entry of entries) {
      for (const [field, config] of Object.entries(entry.fields)) {
        for (const column of config?.sourceColumns ?? []) {
          selections[column] ??= {
            collection,
            entryId: entry.id,
            field: field as ARBulkUploadFieldKey,
          };
        }
      }
    }
  }
  return selections;
};

export const buildMappingTableRowStates = (
  sourceColumns: string[],
  columnSelections: Partial<Record<string, MappingFieldSelector>>,
  draft: MappingConfigPayload,
  fieldConfigMap: MappingFieldConfigMap
): MappingTableRowState[] =>
  sourceColumns.map((sourceColumn) => {
    const selector = columnSelections[sourceColumn];
    const selectedFieldKey = selector
      ? getMappingFieldKey(selector)
      : undefined;
    const fieldMappings = selector
      ? getMappingFields(draft, selector)
      : draft.fieldMappings;
    const fieldConfig = selectedFieldKey
      ? fieldConfigMap.get(selectedFieldKey)
      : undefined;
    const mappingConfig = selectedFieldKey
      ? fieldMappings[selectedFieldKey]
      : undefined;
    return {
      sourceColumn,
      selectedFieldKey,
      showDateFormat: fieldConfig?.optionType === "date_format",
      showDiscountType: fieldConfig?.optionType === "discount_type",
      showAmountType: fieldConfig?.optionType === "amount_type",
      showNegativeAdjustment: Boolean(fieldConfig?.supportsNegativeAdjustment),
      showAggregation: Boolean(
        mappingConfig &&
        mappingConfig.transform === "sum" &&
        (mappingConfig.sourceColumns?.length ?? 0) > 1
      ),
    };
  });

/* ---------------------------------------------------------- linked numbers */

export const getLinkedNumberFieldKey = (
  fieldKey?: ARBulkUploadFieldKey | ""
) =>
  fieldKey === "reference_number"
    ? "voucher_number"
    : fieldKey === "voucher_number"
      ? "reference_number"
      : null;

export const getLinkedNumberFieldLabel = (
  fieldKey: ARBulkUploadFieldKey | ""
) =>
  fieldKey === "reference_number"
    ? "Mark as Voucher/Invoice Number"
    : "Mark as Reference Number";

/* --------------------------------------------------------------- selection */

const buildFieldMappingConfig = (
  fieldKey: ARBulkUploadFieldKey,
  sourceColumns: string[],
  fieldConfigMap: MappingFieldConfigMap,
  previousConfig?: FieldMappingConfig
): FieldMappingConfig => {
  const field = fieldConfigMap.get(fieldKey);
  const transform =
    sourceColumns.length > 1 ? field?.multiSelectTransform : undefined;
  const negativeAdjustmentColumns = field?.supportsNegativeAdjustment
    ? (previousConfig?.negativeAdjustmentColumns ?? []).filter((column) =>
        sourceColumns.includes(column)
      )
    : [];
  const valueType =
    field?.optionType === "amount_type"
      ? (previousConfig?.valueType ?? "amount")
      : field?.optionType === "discount_type"
        ? previousConfig?.valueType
        : undefined;
  return {
    sourceColumns,
    ...(negativeAdjustmentColumns.length ? { negativeAdjustmentColumns } : {}),
    ...(transform ? { transform } : {}),
    ...(valueType ? { valueType } : {}),
  };
};

const removeSourceColumn = (
  fieldMappings: FieldMappingsPayload,
  sourceColumn: string,
  fieldConfigMap: MappingFieldConfigMap
) => {
  const next: FieldMappingsPayload = {};
  for (const [key, config] of Object.entries(fieldMappings)) {
    const sourceColumns = (config?.sourceColumns ?? []).filter(
      (column) => column !== sourceColumn
    );
    if (sourceColumns.length) {
      const field = key as ARBulkUploadFieldKey;
      next[field] = buildFieldMappingConfig(
        field,
        sourceColumns,
        fieldConfigMap,
        config
      );
    }
  }
  return next;
};

const updateMappingField = (
  draft: MappingConfigPayload,
  selector: MappingFieldSelector,
  update: (
    config: FieldMappingConfig | undefined
  ) => FieldMappingConfig | undefined
): MappingConfigPayload => {
  const field = getMappingFieldKey(selector);
  let changed = false;
  const updateFields = (fields: FieldMappingsPayload) => {
    const config = update(fields[field]);
    if (config === fields[field]) return fields;
    changed = true;
    const next = { ...fields };
    if (config) next[field] = config;
    else delete next[field];
    return next;
  };
  if (typeof selector === "string") {
    const fieldMappings = updateFields(draft.fieldMappings);
    return changed ? { ...draft, fieldMappings } : draft;
  }
  const entries = draft[selector.collection]?.map((entry) => {
    if (entry.id !== selector.entryId) return entry;
    const fields = updateFields(entry.fields);
    return fields === entry.fields ? entry : { ...entry, fields };
  });
  return changed ? { ...draft, [selector.collection]: entries } : draft;
};

/**
 * A column pointed at a field (or at nothing). The column first leaves
 * wherever it was — header fields and every entry — then joins the field:
 * appended if the field sums, alone otherwise. An item's discount takes the
 * global discount type the first time it is mapped.
 */
export const buildFieldSelectionDraft = ({
  currentDraft,
  sourceColumn,
  fieldKey,
  fieldConfigMap,
}: {
  currentDraft: MappingConfigPayload;
  sourceColumn: string;
  fieldKey: MappingFieldSelector | "";
  fieldConfigMap: MappingFieldConfigMap;
}) => {
  const strip = (entries?: MappingEntry[]) =>
    entries?.map((entry) => ({
      ...entry,
      fields: removeSourceColumn(entry.fields, sourceColumn, fieldConfigMap),
    }));
  const draft: MappingConfigPayload = {
    ...currentDraft,
    fieldMappings: removeSourceColumn(
      currentDraft.fieldMappings,
      sourceColumn,
      fieldConfigMap
    ),
    ...(currentDraft.items ? { items: strip(currentDraft.items) } : {}),
    ...(currentDraft.ledgers ? { ledgers: strip(currentDraft.ledgers) } : {}),
  };
  if (!fieldKey) return draft;
  const field = getMappingFieldKey(fieldKey);
  return updateMappingField(draft, fieldKey, (config) =>
    buildFieldMappingConfig(
      field,
      fieldConfigMap.get(field)?.multiSelectTransform
        ? [...(config?.sourceColumns ?? []), sourceColumn]
        : [sourceColumn],
      fieldConfigMap,
      config ??
        (typeof fieldKey !== "string" && field === "discount"
          ? { sourceColumns: [], valueType: currentDraft.options.discountType }
          : undefined)
    )
  );
};

export const buildNegativeAdjustmentFieldDraft = ({
  currentDraft,
  sourceColumn,
  fieldKey,
  checked,
}: {
  currentDraft: MappingConfigPayload;
  sourceColumn: string;
  fieldKey: MappingFieldSelector;
  checked: boolean;
}): MappingConfigPayload =>
  updateMappingField(currentDraft, fieldKey, (config) => {
    if (!config?.sourceColumns.includes(sourceColumn)) return config;
    const columns = config.negativeAdjustmentColumns ?? [];
    const nextColumns = checked
      ? columns.includes(sourceColumn)
        ? columns
        : [...columns, sourceColumn]
      : columns.filter((column) => column !== sourceColumn);
    const next = { ...config };
    if (nextColumns.length) next.negativeAdjustmentColumns = nextColumns;
    else delete next.negativeAdjustmentColumns;
    return next;
  });

export const buildAmountTypeFieldDraft = ({
  currentDraft,
  fieldKey,
  valueType,
}: {
  currentDraft: MappingConfigPayload;
  fieldKey: MappingFieldSelector;
  valueType: MappingAmountType;
}): MappingConfigPayload =>
  updateMappingField(currentDraft, fieldKey, (config) =>
    config ? { ...config, valueType } : config
  );

/** The linked number takes this column alone, or gives it back. */
export const buildLinkedNumberFieldDraft = ({
  currentDraft,
  sourceColumn,
  fieldKey,
  checked,
}: {
  currentDraft: MappingConfigPayload;
  sourceColumn: string;
  fieldKey: ARBulkUploadFieldKey;
  checked: boolean;
}): MappingConfigPayload => {
  const linkedFieldKey = getLinkedNumberFieldKey(fieldKey);
  if (!linkedFieldKey) return currentDraft;
  const sourceColumns = checked
    ? [sourceColumn]
    : (currentDraft.fieldMappings[linkedFieldKey]?.sourceColumns ?? []).filter(
        (column) => column !== sourceColumn
      );
  const fieldMappings = { ...currentDraft.fieldMappings };
  if (sourceColumns.length) fieldMappings[linkedFieldKey] = { sourceColumns };
  else delete fieldMappings[linkedFieldKey];
  return { ...currentDraft, fieldMappings };
};

/** The column's first three values, "-" for an empty one. */
export const buildSamplePreview = (
  sampleRowPayload: SampleRowPayload,
  sourceColumn: string
) => {
  const rawValues = sampleRowPayload[sourceColumn];
  const values = Array.isArray(rawValues)
    ? rawValues
    : rawValues === undefined || rawValues === null
      ? []
      : [rawValues];
  const previewValues = values
    .slice(0, 3)
    .map((value) =>
      value === undefined || value === null || value === ""
        ? "-"
        : String(value)
    );
  return previewValues.length ? previewValues.join(", ") : "-";
};

/* ----------------------------------------------------------------- entries */

/** Only an added, unused entry goes; the rest renumber by position. */
export const removeUnusedMapping = (mappings: MappingEntry[], id: string) => {
  const index = mappings.findIndex((mapping) => mapping.id === id);
  if (
    index < 1 ||
    Object.values(mappings[index].fields).some(
      (field) => field?.sourceColumns.length
    )
  )
    throw new Error(
      "Only unused added item or ledger mappings can be deleted."
    );
  return mappings.filter((mapping) => mapping.id !== id);
};

export const addMappingEntry = (
  draft: MappingConfigPayload,
  collection: MappingEntryCollection
): MappingConfigPayload => {
  const entries = draft[collection];
  if (
    !entries ||
    entries.length >= AR_IMPORT_MAX_MAPPING_ENTRIES ||
    (collection === "items" && draft.importMode !== VoucherViewMode.ITEM_MODE)
  )
    return draft;
  return {
    ...draft,
    [collection]: [...entries, { id: newEntryId(), fields: {} }],
  };
};

/* ---------------------------------------------------------------- required */

const mapped = (fields: FieldMappingsPayload, key: ARBulkUploadFieldKey) =>
  !!fields[key]?.sourceColumns.length;

/**
 * PROTOTYPE: required outright, or because the field it hangs off is mapped
 * — the invoice form's rule ("Required once Order No(s) is filled"). Like
 * the form, a field Field Configuration has switched off owes nothing; once
 * it is picked the page switches it on, and then it does.
 */
export const isRequiredNow = (
  field: MappingFieldSchema,
  fieldMappings: FieldMappingsPayload
) =>
  !!field.required ||
  (!!field.requiredWhen &&
    !field.off &&
    mapped(fieldMappings, field.requiredWhen));

/** PROTOTYPE: the label of a field anywhere in the schema. */
export const schemaFieldLabel = (
  groups: MappingFieldGroupSchema[],
  key: ARBulkUploadFieldKey
) => groups.flatMap((g) => g.fields).find((f) => f.key === key)?.label ?? key;

/**
 * PROTOTYPE: the conditional fields still owed, grouped by the field that
 * makes them mandatory — "E-Way Bill Date, Mode… once E-Way Bill No is
 * mapped" reads as one rule, not seven unrelated gaps.
 */
export const getOwedConditionalFields = (
  draft: MappingConfigPayload,
  schema: MappingSchemaPayload | null
) => {
  const groups = schema?.fieldGroups ?? [];
  const owed = new Map<ARBulkUploadFieldKey, string[]>();
  for (const group of groups) {
    if (group.off) continue;
    for (const field of group.fields) {
      if (
        !field.requiredWhen ||
        !isRequiredNow(field, draft.fieldMappings) ||
        mapped(draft.fieldMappings, field.key)
      )
        continue;
      owed.set(field.requiredWhen, [
        ...(owed.get(field.requiredWhen) ?? []),
        field.label,
      ]);
    }
  }
  return [...owed].map(([trigger, fields]) => ({
    trigger: schemaFieldLabel(groups, trigger),
    fields,
  }));
};

/**
 * Production: getMissingMappingFields — every required header field, then
 * each item or ledger entry in use (and Item 1 in Item Mode, Ledger 1 in
 * Accounting Mode) needs one of its group's `requiredAnyOf`:
 * "Item 2: Item Name or Item Amount".
 */
export const getMissingMappingFields = (
  draft: MappingConfigPayload,
  schema: MappingSchemaPayload | null
) => {
  const groups = schema?.fieldGroups ?? [];
  const missing: string[] = [];
  for (const group of groups) {
    // PROTOTYPE: a group switched off asks for nothing.
    if (group.off) continue;
    for (const field of group.fields) {
      if (
        isRequiredNow(field, draft.fieldMappings) &&
        !mapped(draft.fieldMappings, field.key)
      )
        missing.push(field.label);
    }
  }
  const requiredGroup =
    draft.importMode === VoucherViewMode.ITEM_MODE ? "item" : "ledger";
  for (const group of groups) {
    const collection =
      group.id === "item" ? "items" : group.id === "ledger" ? "ledgers" : null;
    const entries = collection ? draft[collection] : undefined;
    const required = group.requiredAnyOf;
    if (!entries || !required?.length) continue;
    const requiredLabel = required
      .map(
        (key) => group.fields.find((field) => field.key === key)?.label ?? key
      )
      .join(" or ");
    entries.forEach((entry, index) => {
      const isRequired =
        (index === 0 && group.id === requiredGroup) ||
        Object.keys(entry.fields).length > 0;
      if (isRequired && !required.some((field) => mapped(entry.fields, field)))
        missing.push(`${group.label} ${index + 1}: ${requiredLabel}`);
    });
  }
  return missing;
};

/* ---------------------------------------------------------------- dropdown */

/**
 * Production: buildColumnMappingOptions — every field a column can take, as
 * the dropdown lists it. Header groups list their fields; item and ledger
 * groups list their entries ("Item 2"), each opening to its fields with the
 * group's name dropped ("Name", not "Item Name"). A field fed by another
 * column is disabled unless it sums.
 */
export const buildColumnMappingOptions = ({
  mappingDraft,
  fieldGroups,
  sourceColumn,
  selectedField,
  onAddEntry,
  onRemoveEntry,
  disabled,
}: {
  mappingDraft: MappingConfigPayload;
  fieldGroups: MappingFieldGroupSchema[];
  sourceColumn: string;
  selectedField?: MappingFieldSelector;
  onAddEntry: (collection: MappingEntryCollection) => void;
  onRemoveEntry: (collection: MappingEntryCollection, id: string) => void;
  disabled?: boolean;
}) => {
  const options: MappingFieldOption[] = [];
  const requiredGroup =
    mappingDraft.importMode === VoucherViewMode.ITEM_MODE ? "item" : "ledger";
  const buildOption = (
    field: MappingFieldSchema,
    selector: MappingFieldSelector,
    fieldMappings: FieldMappingsPayload,
    prefix = "",
    requiredAlternative = false
  ) => {
    const config = fieldMappings[field.key];
    const option: MappingFieldOption = {
      value: String(options.length),
      label: `${prefix}${field.label}`,
      selector,
      field,
      config,
      requiredAlternative,
      disabled:
        !field.multiSelectTransform &&
        Boolean(
          config?.sourceColumns.length &&
          !config.sourceColumns.includes(sourceColumn)
        ),
    };
    options.push(option);
    return option;
  };
  const groups: MappingFieldOptionGroup[] = fieldGroups.map((group) => {
    const collection: MappingEntryCollection | null =
      group.id === "item" ? "items" : group.id === "ledger" ? "ledgers" : null;
    const entries = collection ? mappingDraft[collection] : undefined;
    return {
      id: group.id,
      label: group.label,
      collection,
      off: group.off,
      additional: group.off !== undefined,
      options: entries
        ? []
        : group.fields.map((field) =>
            buildOption(field, field.key, mappingDraft.fieldMappings)
          ),
      onAdd: collection && entries ? () => onAddEntry(collection) : undefined,
      entries: collection
        ? entries?.map((entry, index) => {
            const label = `${group.label} ${index + 1}`;
            return {
              id: entry.id,
              label,
              onDelete:
                !disabled && index > 0 && !Object.keys(entry.fields).length
                  ? () => onRemoveEntry(collection, entry.id)
                  : undefined,
              options: group.fields.map((field) =>
                buildOption(
                  {
                    ...field,
                    label: field.label.startsWith(`${group.label} `)
                      ? field.label.slice(group.label.length + 1)
                      : field.label,
                  },
                  { collection, entryId: entry.id, field: field.key },
                  entry.fields,
                  `${label} — `,
                  index === 0 &&
                    group.id === requiredGroup &&
                    !!group.requiredAnyOf?.includes(field.key)
                )
              ),
            };
          })
        : undefined,
    };
  });
  const selectedValue =
    options.find((option) => {
      const target = option.selector;
      return typeof target === "string"
        ? target === selectedField
        : typeof selectedField === "object" &&
            target.field === selectedField.field &&
            target.collection === selectedField.collection &&
            target.entryId === selectedField.entryId;
    })?.value ?? "";
  return { options, groups, selectedValue };
};

/** Production: filterMappingFieldGroups — a group, entry or field name matches. */
export const filterMappingFieldGroups = (
  groups: MappingFieldOptionGroup[],
  search: string
): VisibleMappingFieldGroup[] => {
  const query = search.trim().toLowerCase();
  const visibleGroups: VisibleMappingFieldGroup[] = [];
  for (const group of groups) {
    const options = !query
      ? group.options
      : group.options.filter((option) =>
          `${group.label} ${option.field.label}`.toLowerCase().includes(query)
        );
    const entries = [];
    for (const entry of group.entries ?? []) {
      const matchesEntry = !query || entry.label.toLowerCase().includes(query);
      const visibleOptions = matchesEntry
        ? entry.options
        : entry.options.filter((option) =>
            `${entry.label} ${option.field.label}`.toLowerCase().includes(query)
          );
      if (matchesEntry || visibleOptions.length)
        entries.push({ ...entry, visibleOptions });
    }
    if (!query || options.length || entries.length)
      visibleGroups.push({
        ...group,
        options,
        entries: group.entries ? entries : undefined,
        isAtEntryLimit:
          (group.entries?.length ?? 0) >= AR_IMPORT_MAX_MAPPING_ENTRIES,
      });
  }
  return visibleGroups;
};

/* -------------------------------------------------------------- mode, misc */

/**
 * Production: buildPersistPayload on a switch to Accounting Mode — the sales
 * ledger and every item field leave the header mapping. The item entries
 * are kept, as production keeps them.
 */
export const withoutItemFields = (
  fieldMappings: FieldMappingsPayload
): FieldMappingsPayload => {
  const next = { ...fieldMappings };
  delete next.sales_ledger;
  for (const field of AR_ITEM_LEDGER_MAPPING_FIELDS.item) delete next[field];
  return next;
};

/** Production: getSuggestedTemplateName. */
export const getSuggestedTemplateName = (
  selectedTemplateName?: string | null
) => (selectedTemplateName ? `${selectedTemplateName} Copy` : "New Template");

/** Production: getEstimatedMappingTime. */
export const getEstimatedMappingTime = (
  totalRows?: number,
  completedRows = 0
): string => {
  if (totalRows === undefined) return "--";
  const remainingRows = Math.max(totalRows - completedRows, 0);
  if (remainingRows === 0) return "Less than 1 min";
  const { rowsPerPage, firstPageMinutes, additionalPageMinutes } =
    AR_MAPPING_TIME_ESTIMATE;
  const pages = Math.ceil(remainingRows / rowsPerPage);
  const additionalPages = completedRows > 0 ? pages : pages - 1;
  const minMinutes = Math.ceil(
    (completedRows > 0 ? 0 : firstPageMinutes.min) +
      additionalPages * additionalPageMinutes.min
  );
  const maxMinutes = Math.ceil(
    (completedRows > 0 ? 0 : firstPageMinutes.max) +
      additionalPages * additionalPageMinutes.max
  );
  return `~ ${minMinutes} - ${maxMinutes} mins`;
};

/**
 * What Preview compares against: production hashes the draft as it loaded
 * and goes straight to the preview when nothing has changed since — an edit
 * undone counts as no change.
 */
export const draftKey = (draft: MappingConfigPayload) =>
  JSON.stringify({
    importMode: draft.importMode,
    selection: draft.selection,
    options: draft.options,
    fieldMappings: sortKeys(draft.fieldMappings),
    items: draft.items?.map((e) => ({ id: e.id, fields: sortKeys(e.fields) })),
    ledgers: draft.ledgers?.map((e) => ({
      id: e.id,
      fields: sortKeys(e.fields),
    })),
  });

const sortKeys = (fields: FieldMappingsPayload) =>
  Object.fromEntries(
    Object.entries(fields).sort(([a], [b]) => a.localeCompare(b))
  );

export const isAmountChoice = isAmountType;
