import React, { useState } from "react";
import {
  ArrowRight,
  Clock,
  Info,
  RotateCcw,
  Save,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  additionalField,
  type FieldConfig,
} from "@/config/pages/inbox/additional-fields";
import { IMPORT_MODE_LABELS } from "@/config/pages/inbox/sales-upload";
import {
  setFieldConfig,
  useFieldConfig,
} from "@/hooks/pages/inbox/use-field-config";
import {
  salesUpload,
  type SalesBatchEntry,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  VoucherViewMode,
  type MappingAmountType,
  type MappingConfigPayload,
  type MappingFieldSelector,
  type MappingOption,
} from "@/types/pages/inbox/sales-upload";
import {
  addMappingEntry,
  buildAmountTypeFieldDraft,
  buildColumnFieldSelections,
  buildFieldSelectionDraft,
  buildLinkedNumberFieldDraft,
  buildMappingFieldConfigMap,
  buildMappingTableRowStates,
  buildNegativeAdjustmentFieldDraft,
  buildSamplePreview,
  draftKey,
  getEstimatedMappingTime,
  getLinkedNumberFieldKey,
  getLinkedNumberFieldLabel,
  getMappingFieldKey,
  getMappingFields,
  getMissingMappingFields,
  getOwedConditionalFields,
  getSuggestedTemplateName,
  isAmountChoice,
  removeUnusedMapping,
} from "@/utils/pages/inbox/sales-upload-mapping";
import { Notice, PageDialog, T } from "../ui";
import { FlowHeader } from "./common";
import FieldPicker from "./field-picker";
import ProcessingModal from "./processing-modal";

/**
 * Map Fields — production's MappingPage (components/accounts-receivable/v2/
 * bulk-upload/mapping-page): each spreadsheet column on the left, the AIA
 * field it feeds in the middle, and the column's first values on the right.
 *
 * The rules are production's, from utils/pages/inbox/sales-upload-mapping:
 * one column per field unless the field sums; Item 1…10 and Ledger 1…10;
 * the reference and voucher number sharing a column; negative adjustments;
 * one date format and discount type for the file; a new sheet or header row
 * starting the mapping over; Preview going straight through when nothing
 * has changed since the preview was made.
 *
 * PROTOTYPE: the AI's own suggestions keep a sparkle, and the invoice's
 * optional groups are on offer — one switched off is switched on by
 * picking from it.
 */

type Props = {
  entry: SalesBatchEntry;
  onPreview: () => void;
  onExit: (tab?: "all" | "uploads") => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

const MODES = [VoucherViewMode.ITEM_MODE, VoucherViewMode.ACCOUNTING_MODE];

/** Production: AmountChoiceSegment — % or ₹, in a 76px two-way switch. */
const AmountChoiceSegment = ({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: MappingOption[];
  value: MappingAmountType;
  disabled?: boolean;
  onChange: (value: MappingAmountType) => void;
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className="flex h-8 w-[76px] flex-none overflow-hidden rounded-md border border-primary/40 bg-background"
  >
    {options
      .filter((o) => isAmountChoice(o.value))
      .map((option, index) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${label}: ${option.label}`}
            title={option.label}
            disabled={disabled}
            onClick={() => onChange(option.value as MappingAmountType)}
            className={cn(
              "flex-1 text-xs transition-colors hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed",
              index > 0 && "border-l border-primary/30",
              on
                ? "bg-primary/5 font-semibold text-primary"
                : "text-secondary-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
  </div>
);

/** Production: LinkedNumberCheckbox / NegativeAdjustmentCheckbox. */
const RowCheckbox = ({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex w-fit cursor-pointer items-center gap-1.5 text-xs leading-4 text-foreground">
    <Checkbox
      checked={checked}
      disabled={disabled}
      onCheckedChange={(next) => onChange(next === true)}
      className="size-3.5"
    />
    {label}
  </label>
);

const MappingPage = ({ entry, onPreview, onExit, notify }: Props) => {
  const { batch, mapping, draft } = entry;
  const id = batch.importBatchUuid;
  const [showMissing, setShowMissing] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(
    batch.status === ARVoucherImportBatchStatus.PROCESSING &&
      !!mapping &&
      !batch.selectedTemplateUuid
  );
  const [confirmEdit, setConfirmEdit] = useState(false);
  const fieldConfig = useFieldConfig(entry.companyId);
  // Production: the draft as this page first loaded it, to tell whether a
  // generated preview is still current.
  const [loadedKey] = useState(() => draftKey(draft));

  const reading = !mapping;
  // A template that fits is being applied and previewed: the page waits.
  const templatePreview =
    !!batch.selectedTemplateUuid &&
    batch.failureCode !== "template_incompatible" &&
    batch.status === ARVoucherImportBatchStatus.PROCESSING &&
    !predicting;
  const busy =
    reading || predicting || templatePreview || !!entry.applyingStructure;
  const schema = mapping?.mappingSchema ?? null;
  const fieldGroups = schema?.fieldGroups ?? [];
  const fieldConfigMap = buildMappingFieldConfigMap(schema);
  const sourceColumns = mapping?.detectedColumns ?? [];
  const selections = buildColumnFieldSelections(
    sourceColumns,
    draft.fieldMappings,
    draft.items,
    draft.ledgers
  );
  const missing = getMissingMappingFields(draft, schema);
  /* PROTOTYPE: the conditional fields among them, each line naming the
     field that made them mandatory; the rest read as production's list. */
  const owed = getOwedConditionalFields(draft, schema);
  const owedLabels = new Set(owed.flatMap((o) => o.fields));
  const plainMissing = missing.filter((label) => !owedLabels.has(label));
  const rows = buildMappingTableRowStates(
    sourceColumns,
    selections,
    draft,
    fieldConfigMap
  );

  /* The sparkle: this column still feeds what the AI suggested. Entries are
     compared by position — Item 2 is Item 2 whatever its id. */
  const suggestion = mapping?.mappingPayload;
  const suggested = suggestion
    ? buildColumnFieldSelections(
        sourceColumns,
        suggestion.fieldMappings,
        suggestion.items,
        suggestion.ledgers
      )
    : {};
  const fromAi = (column: string) => {
    const a = selections[column];
    const b = suggested[column];
    if (!a || !b) return false;
    if (typeof a === "string" || typeof b === "string") return a === b;
    const at = (list: { id: string }[] | undefined, entryId: string) =>
      list?.findIndex((e) => e.id === entryId) ?? -1;
    return (
      a.collection === b.collection &&
      a.field === b.field &&
      at(draft[a.collection], a.entryId) ===
        at(suggestion![b.collection], b.entryId)
    );
  };

  const update = (next: MappingConfigPayload) => {
    salesUpload.setDraft(id, next);
  };

  /*
    PROTOTYPE: picking a field the Field Configuration has off switches it
    on — it and its group, for every sales invoice, which is what the toast
    says; Undo puts the setting and this mapping back as they were.
    Switching on can let the AI's suggestions fill other columns in that
    group, the same as turning it on in Field Configuration would.
  */
  const pick = (column: string, selector: MappingFieldSelector | "") => {
    if (selections[column] === selector) return;
    const next = buildFieldSelectionDraft({
      currentDraft: draft,
      sourceColumn: column,
      fieldKey: selector,
      fieldConfigMap,
    });
    const key = selector ? getMappingFieldKey(selector) : undefined;
    const field = key ? additionalField(key) : undefined;
    const g = field?.group;
    const offNow =
      !!field &&
      (!fieldConfig[g!.id]?.on ||
        fieldConfig[g!.id].fields[field.id] === false);
    if (!offNow) return update(next);

    const before = { config: fieldConfig, draft };
    const config: FieldConfig = JSON.parse(JSON.stringify(fieldConfig));
    const wholeGroup = !config[g!.id].on;
    config[g!.id].on = true;
    config[g!.id].fields[field.id] = true;
    update(next);
    setFieldConfig(entry.companyId, config);
    salesUpload.applyFieldConfig(id, config);
    setShowMissing(false);
    toast.success(
      wholeGroup
        ? `${g!.label} turned on for sales invoices`
        : `${field.label} turned on for sales invoices`,
      {
        description: "Its fields now show on every invoice.",
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            setFieldConfig(entry.companyId, before.config);
            salesUpload.applyFieldConfig(id, before.config);
            salesUpload.setDraft(id, before.draft);
          },
        },
        classNames: { closeButton: "!opacity-100 !pointer-events-auto" },
      }
    );
  };

  const onClickPreview = () => {
    // Production: a preview made from this very mapping is still good.
    if (
      batch.status === ARVoucherImportBatchStatus.NEEDS_REVIEW &&
      draftKey(draft) === loadedKey
    )
      return onPreview();
    setShowMissing(true);
    if (missing.length) return;
    if (batch.status === ARVoucherImportBatchStatus.PENDING_MAPPING) {
      salesUpload.startPreview(id);
      setPredicting(true);
      return;
    }
    // Already previewed once: production asks before re-applying a mapping.
    setConfirmEdit(true);
  };

  const onSaveTemplate = () => {
    if (missing.length) {
      notify("Map mandatory fields before saving template.", "error");
      return;
    }
    const name = templateName.trim();
    try {
      salesUpload.saveTemplate(name, draft);
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Failed to save template.",
        "error"
      );
      return;
    }
    setSavedName(name);
    setSaveOpen(false);
    notify("Template saved.", "success");
  };

  const sheets = mapping?.sheets ?? [];
  const selectedSheet =
    sheets.find((s) => s.name === batch.selectedSheetName) ?? sheets[0];
  const headerRows = Array.from(
    { length: Math.min(selectedSheet?.rowCount ?? 0, 25) },
    (_, i) => String(i + 1)
  );
  const mismatch =
    !!batch.selectedTemplateUuid &&
    batch.failureCode === "template_incompatible";
  const tableLoading = reading || templatePreview || !!entry.applyingStructure;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <FlowHeader
        title="Map Fields"
        fileName={batch.originalFileName}
        onClose={() => onExit("uploads")}
      />
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex h-full min-h-0 w-full flex-col gap-5 px-6 py-6">
          <div className="flex flex-col gap-2">
            {/* One row: what the file is read as on the left, the time it
                will take and what to do next on the right. It holds at 1280px
                because, below 1600px, Reset Mapping drops its words for its
                icon (named on hover and to screen readers) and the estimate
                drops its label. Buttons keep their md size — Bloocks — so the
                words go, not the height. Field Configuration is not here: the
                field picker offers every group, and picking from one that is
                off switches it on. */}
            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap items-center gap-3">
                {/* Item Mode | Accounting Mode — production's two-segment toggle. */}
                <div
                  role="radiogroup"
                  aria-label="Import mode"
                  className="flex overflow-hidden rounded-md border border-input"
                >
                  {MODES.map((mode) => {
                    const on = batch.importMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={busy}
                        onClick={() => {
                          if (on) return;
                          salesUpload.setImportMode(id, mode);
                          setShowMissing(false);
                          notify(
                            mode === VoucherViewMode.ITEM_MODE
                              ? "Switched to Item Mode."
                              : "Switched to Accounting Mode."
                          );
                        }}
                        className={cn(
                          "h-9 px-3 text-sm transition-colors first:border-r first:border-input disabled:cursor-not-allowed disabled:opacity-60",
                          on
                            ? "bg-accent font-semibold text-primary"
                            : "bg-background font-medium text-secondary-foreground hover:text-foreground"
                        )}
                      >
                        {IMPORT_MODE_LABELS[mode]}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-1.5">
                  <span className={cn(T.cell, "text-secondary-foreground")}>
                    Sheet No.
                  </span>
                  {/* Production lists sheets by number; the name is on hover. */}
                  <Select
                    value={batch.selectedSheetName ?? ""}
                    disabled={busy}
                    onValueChange={(value) => {
                      salesUpload.setSheet(id, value, 1);
                      setShowMissing(false);
                      notify("Sheet settings updated. Mapping refreshed.");
                    }}
                  >
                    <SelectTrigger
                      aria-label="Sheet No."
                      title={batch.selectedSheetName ?? undefined}
                      className={cn("h-9 w-[64px]", T.cell)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sheets.map((x, i) => (
                        <SelectItem key={x.name} value={x.name} title={x.name}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="flex items-center gap-1.5">
                  <span className={cn(T.cell, "text-secondary-foreground")}>
                    Header Row
                  </span>
                  <Select
                    value={
                      batch.headerRowIndex ? String(batch.headerRowIndex) : ""
                    }
                    disabled={busy}
                    onValueChange={(value) => {
                      salesUpload.setSheet(
                        id,
                        batch.selectedSheetName ?? "",
                        Number(value)
                      );
                      setShowMissing(false);
                      notify("Sheet settings updated. Mapping refreshed.");
                    }}
                  >
                    <SelectTrigger
                      aria-label="Header Row"
                      className={cn("h-9 w-[64px]", T.cell)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {headerRows.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <span className="flex-1" />
                <div className="flex flex-none items-center gap-1">
                  <Clock
                    className="size-3 text-secondary-foreground"
                    aria-hidden
                  />
                  <HoverCard openDelay={100}>
                    <HoverCardTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          T.sub,
                          "underline decoration-dotted underline-offset-2"
                        )}
                      >
                        <span className="hidden min-[1600px]:inline">
                          Estimated Time:{" "}
                        </span>
                        {getEstimatedMappingTime(batch.totalRows)}
                      </button>
                    </HoverCardTrigger>
                    <HoverCardContent align="end" className="min-w-[336px] p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles
                          className="size-5 flex-none text-primary"
                          aria-hidden
                        />
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold leading-5 text-foreground">
                            We process your {batch.totalRows} rows in the
                            background.
                          </span>
                          <span className={T.sub}>
                            We match each entry to the right ledger, predict
                            voucher types and more.
                          </span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
                <span className="h-9 w-px bg-neutral-gray" aria-hidden />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      disabled={busy}
                      aria-label="Reset Mapping"
                      onClick={() => {
                        salesUpload.resetMapping(id);
                        setShowMissing(false);
                        notify(
                          "Mapping reset to backend suggestions.",
                          "success"
                        );
                      }}
                    >
                      <RotateCcw aria-hidden />
                      <span className="hidden min-[1600px]:inline">
                        Reset Mapping
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="min-[1600px]:hidden">
                    Reset Mapping
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setTemplateName(
                      getSuggestedTemplateName(
                        savedName ?? batch.selectedTemplateName
                      )
                    );
                    setSaveOpen(true);
                  }}
                >
                  <Save aria-hidden />
                  Save as Template
                </Button>
                <Button disabled={busy} onClick={onClickPreview}>
                  Preview
                  <ArrowRight aria-hidden />
                </Button>
              </div>
            </TooltipProvider>
          </div>

          {/* Production: MappingStatusBanner, the template-mismatch warning. */}
          {mismatch && (
            <div className="flex justify-center">
              <Notice
                tone="warning"
                role="status"
                className="flex max-w-full items-center gap-4 px-4"
              >
                <TriangleAlert className="size-4 flex-none" aria-hidden />
                <span className="font-medium text-foreground">
                  Template mismatch detected. Required fields need manual
                  mapping.
                </span>
              </Notice>
            </div>
          )}

          {showMissing && missing.length > 0 && (
            <Notice
              tone="danger"
              role="alert"
              className="flex flex-wrap items-start gap-x-2 gap-y-1 px-5"
            >
              <span className="flex items-start gap-1.5 font-medium text-foreground">
                <Info
                  className="mt-0.5 size-4 flex-none text-destructive-foreground"
                  aria-hidden
                />
                Please map all mandatory fields before previewing
              </span>
              {plainMissing.length > 0 && (
                <span>• {plainMissing.join(", ")}.</span>
              )}
              {owed.map((o) => (
                <span key={o.trigger}>
                  • {o.fields.join(", ")} — required once {o.trigger} is mapped.
                </span>
              ))}
            </Notice>
          )}

          <div className="min-h-0 flex-1 overflow-auto overscroll-none rounded-md border border-neutral-gray">
            <Table className="table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-neutral-gray [&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r [&_th]:border-b [&_th]:border-neutral-gray">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[40%]" />
                <col className="w-[32%]" />
              </colgroup>
              <TableHeader className="sticky top-0 z-10 bg-accent [&_tr]:shadow-none">
                <TableRow className="hover:bg-transparent">
                  {["Excel Header Fields", "AIA Fields", "Data Preview"].map(
                    (label) => (
                      <TableHead
                        key={label}
                        className={cn(
                          "h-10 whitespace-nowrap px-3 py-0 align-middle",
                          T.head
                        )}
                      >
                        {label}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableLoading
                  ? Array.from(
                      { length: Math.max(sourceColumns.length, 8) },
                      (_, i) => (
                        <TableRow key={i} className="hover:bg-transparent">
                          {[0, 1, 2].map((c) => (
                            <TableCell key={c} className="h-14 px-3">
                              <span className="block h-3 w-2/3 animate-pulse rounded bg-neutral-gray motion-reduce:animate-none" />
                            </TableCell>
                          ))}
                        </TableRow>
                      )
                    )
                  : rows.map((row) => {
                      const column = row.sourceColumn;
                      const selector = selections[column];
                      const fields = selector
                        ? getMappingFields(draft, selector)
                        : draft.fieldMappings;
                      const config = row.selectedFieldKey
                        ? fields[row.selectedFieldKey]
                        : undefined;
                      const linked = getLinkedNumberFieldKey(
                        row.selectedFieldKey
                      );
                      const sample = buildSamplePreview(
                        mapping!.sampleRowPayload,
                        column
                      );
                      return (
                        <TableRow key={column} className="hover:bg-transparent">
                          <TableCell
                            className={cn("h-14 px-3 align-middle", T.cell)}
                          >
                            <span className="block truncate" title={column}>
                              {column}
                            </span>
                          </TableCell>
                          <TableCell className="h-14 px-3 py-2.5 align-middle [&:has([role=checkbox])]:pr-3">
                            <div className="flex min-w-0 flex-col gap-1.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <FieldPicker
                                  sourceColumn={column}
                                  mappingDraft={draft}
                                  fieldGroups={fieldGroups}
                                  selectedField={selector}
                                  disabled={busy}
                                  onChange={(next) => pick(column, next)}
                                  onAddEntry={(collection) =>
                                    update(addMappingEntry(draft, collection))
                                  }
                                  onRemoveEntry={(collection, entryId) =>
                                    update({
                                      ...draft,
                                      [collection]: removeUnusedMapping(
                                        draft[collection] ?? [],
                                        entryId
                                      ),
                                    })
                                  }
                                />
                                {row.showDateFormat && (
                                  <Select
                                    value={draft.options.dateFormat}
                                    disabled={busy}
                                    onValueChange={(dateFormat) =>
                                      update({
                                        ...draft,
                                        options: {
                                          ...draft.options,
                                          dateFormat,
                                        },
                                      })
                                    }
                                  >
                                    <SelectTrigger
                                      aria-label="Date format"
                                      className="h-8 w-32 flex-none px-2 text-xs font-medium"
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(schema?.dateFormatOptions ?? []).map(
                                        (o) => (
                                          <SelectItem
                                            key={o.value}
                                            value={o.value}
                                          >
                                            {o.label}
                                          </SelectItem>
                                        )
                                      )}
                                    </SelectContent>
                                  </Select>
                                )}
                                {row.showDiscountType && (
                                  <AmountChoiceSegment
                                    label="Discount type"
                                    options={schema?.discountTypeOptions ?? []}
                                    value={
                                      config?.valueType ??
                                      draft.options.discountType
                                    }
                                    disabled={busy}
                                    onChange={(value) =>
                                      // An item's discount is its own; a
                                      // header discount sets the file's.
                                      selector && typeof selector !== "string"
                                        ? update(
                                            buildAmountTypeFieldDraft({
                                              currentDraft: draft,
                                              fieldKey: selector,
                                              valueType: value,
                                            })
                                          )
                                        : update({
                                            ...draft,
                                            options: {
                                              ...draft.options,
                                              discountType: value,
                                            },
                                          })
                                    }
                                  />
                                )}
                                {row.showAmountType && selector && (
                                  <AmountChoiceSegment
                                    label="Amount type"
                                    options={schema?.amountTypeOptions ?? []}
                                    value={config?.valueType ?? "amount"}
                                    disabled={busy}
                                    onChange={(value) =>
                                      update(
                                        buildAmountTypeFieldDraft({
                                          currentDraft: draft,
                                          fieldKey: selector,
                                          valueType: value,
                                        })
                                      )
                                    }
                                  />
                                )}
                                <span
                                  className="grid size-4 flex-none place-items-center"
                                  title={
                                    fromAi(column)
                                      ? "Suggested by AI"
                                      : undefined
                                  }
                                >
                                  {fromAi(column) && (
                                    <Sparkles
                                      className="size-3.5 text-primary"
                                      aria-label="Suggested by AI"
                                    />
                                  )}
                                </span>
                              </div>
                              {row.selectedFieldKey && linked && (
                                <RowCheckbox
                                  label={getLinkedNumberFieldLabel(
                                    row.selectedFieldKey
                                  )}
                                  checked={
                                    !!draft.fieldMappings[
                                      linked
                                    ]?.sourceColumns.includes(column)
                                  }
                                  disabled={busy}
                                  onChange={(checked) =>
                                    update(
                                      buildLinkedNumberFieldDraft({
                                        currentDraft: draft,
                                        sourceColumn: column,
                                        fieldKey: row.selectedFieldKey!,
                                        checked,
                                      })
                                    )
                                  }
                                />
                              )}
                              {row.showNegativeAdjustment && selector && (
                                <RowCheckbox
                                  label="Mark as Negative Adjustment"
                                  checked={
                                    !!config?.negativeAdjustmentColumns?.includes(
                                      column
                                    )
                                  }
                                  disabled={busy}
                                  onChange={(checked) =>
                                    update(
                                      buildNegativeAdjustmentFieldDraft({
                                        currentDraft: draft,
                                        sourceColumn: column,
                                        fieldKey: selector,
                                        checked,
                                      })
                                    )
                                  }
                                />
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "h-14 px-3 align-middle",
                              T.cell,
                              "text-secondary-foreground"
                            )}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span
                                className="block min-w-0 truncate"
                                title={sample}
                              >
                                {sample}
                              </span>
                              {row.showAggregation && (
                                <span className="flex-none rounded-full border border-input bg-accent px-2.5 py-0.5 text-xs font-medium text-primary">
                                  Sum
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <PageDialog
        title="Save Mapping Template"
        description="Save this configuration to prefill mapping for similar files."
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        className="max-w-[520px]"
      >
        <label className="mt-2 flex flex-col gap-1.5">
          <span className={T.label}>Template Name</span>
          <Input
            value={templateName}
            placeholder="New Template"
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && templateName.trim()) onSaveTemplate();
            }}
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setSaveOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!templateName.trim()} onClick={onSaveTemplate}>
            Save Template
          </Button>
        </div>
      </PageDialog>

      <PageDialog
        title="Edit Mapping?"
        open={confirmEdit}
        onClose={() => setConfirmEdit(false)}
        className="max-w-[480px]"
      >
        <p className={T.value}>
          You&apos;ve changed the column mapping. AI prediction will not run
          again. Previously AI-mapped values for newly or updated mapped fields
          will be removed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmEdit(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              salesUpload.applyMappingWithoutPrediction(id);
              setConfirmEdit(false);
              onPreview();
            }}
          >
            Go to Preview
          </Button>
        </div>
      </PageDialog>

      {predicting && (
        <ProcessingModal
          batch={batch}
          open
          onGoToUploads={() => onExit("uploads")}
          onComplete={() => {
            notify("Preview generated.", "success");
            onPreview();
          }}
        />
      )}
    </div>
  );
};

export default MappingPage;
