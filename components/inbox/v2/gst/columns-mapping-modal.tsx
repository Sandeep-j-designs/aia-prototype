import React, { useEffect, useMemo, useState } from "react";
import { Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ComboBox } from "@/components/common/combo-box";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import {
  COLUMN_MAPPING_CONFIG,
  COLUMN_MAPPING_KEYS,
  defaultColumnMapping,
  headerRowOptions,
  prDateFormatOptions,
  voucherTypeOptions,
} from "@/config/pages/inbox/gst";
import { MOCK_PR_COLUMN_MAPPING } from "@/config/pages/inbox/mock-gst";
import type { MappingConfig, Mappings } from "@/types/pages/inbox/gst";
import { PageDialog, Req, T } from "@/components/inbox/v2/ui";

/**
 * Map Your Columns — production's columns-mapping-modal: Header Row and
 * Voucher Type above, then each AIA field against the file's column that
 * feeds it. The backend's suggestion arrives pre-filled; a sparkle marks a
 * field still on its suggestion.
 */

type Props = {
  open: boolean;
  fileName: string;
  /** A mapping saved earlier for this file, if any. */
  initialMapping?: MappingConfig;
  onClose: () => void;
  onSave: (mapping: MappingConfig) => void;
  saving: boolean;
};

const normalize = (mapping?: MappingConfig): MappingConfig => ({
  ...defaultColumnMapping,
  ...mapping,
  mappings: { ...defaultColumnMapping.mappings, ...mapping?.mappings },
  columns: mapping?.columns ?? defaultColumnMapping.columns,
});

const isEmpty = (value: unknown) =>
  !value ||
  (Array.isArray(value)
    ? !value.some((v) => String(v).trim())
    : !String(value).trim());

const ColumnsMappingModal = ({
  open,
  fileName,
  initialMapping,
  onClose,
  onSave,
  saving,
}: Props) => {
  const [mapping, setMapping] = useState<MappingConfig>(() =>
    normalize(initialMapping)
  );
  const [loading, setLoading] = useState(!initialMapping);

  // DEV: POST /api/gst-reconciliation/column-mappings { fileUuid, companyId, headerOffset? }
  const load = (headerOffset = 0) => {
    setLoading(true);
    window.setTimeout(() => {
      setMapping(normalize({ ...MOCK_PR_COLUMN_MAPPING, headerOffset }));
      setLoading(false);
    }, 700);
  };

  useEffect(() => {
    if (!open) return;
    if (initialMapping) {
      setMapping(normalize(initialMapping));
      setLoading(false);
    } else load();
  }, [open]);

  const set = <K extends keyof Mappings>(key: K, value: Mappings[K]) =>
    setMapping((m) => ({ ...m, mappings: { ...m.mappings, [key]: value } }));

  const ready = useMemo(
    () =>
      !!mapping.mappings.documentType &&
      COLUMN_MAPPING_KEYS.every(
        (key) =>
          !COLUMN_MAPPING_CONFIG[key].isRequired ||
          !isEmpty(mapping.mappings[key as keyof Mappings])
      ),
    [mapping]
  );

  const options = mapping.columns.map((c) => ({ label: c, value: c }));
  const suggested = MOCK_PR_COLUMN_MAPPING.mappings;

  return (
    <PageDialog
      open={open}
      onClose={onClose}
      title="Map Your Columns"
      description={fileName}
      className="flex max-w-[1024px] flex-col p-0 [&>div:first-child]:border-b [&>div:first-child]:border-neutral-gray [&>div:first-child]:px-7 [&>div:first-child]:pb-4 [&>div:first-child]:pt-7"
    >
      <div className="flex flex-wrap items-end gap-4 px-7 pb-4 pt-1">
        <label className="flex flex-col gap-1.5">
          <span className={T.label}>Header Row</span>
          <Select
            value={String(mapping.headerOffset)}
            onValueChange={(value) => load(Number(value))}
            disabled={loading}
          >
            <SelectTrigger aria-label="Header Row" className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {headerRowOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={T.label}>
            Voucher Type <span className="text-destructive-foreground">*</span>
          </span>
          <Select
            value={mapping.mappings.documentType}
            onValueChange={(value) => set("documentType", value)}
            disabled={loading}
          >
            <SelectTrigger aria-label="Voucher Type" className="h-9 w-[160px]">
              <SelectValue placeholder="Select Voucher Type" />
            </SelectTrigger>
            <SelectContent>
              {voucherTypeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <div className="mx-7 max-h-[52vh] min-h-0 overflow-auto rounded-md border border-neutral-gray">
        <Table className="table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-neutral-gray [&_td:not(:last-child)]:border-r [&_th:not(:last-child)]:border-r [&_th]:border-b [&_th]:border-neutral-gray">
          <colgroup>
            <col className="w-[36%]" />
            <col className="w-[64%]" />
          </colgroup>
          <TableHeader className="sticky top-0 z-10 bg-accent [&_tr]:shadow-none">
            <TableRow className="hover:bg-transparent">
              {["Fields", "SOURCE COLUMN HEADER"].map((label) => (
                <TableHead
                  key={label}
                  className={cn(
                    "h-10 whitespace-nowrap px-3 py-0 align-middle",
                    T.head
                  )}
                >
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {COLUMN_MAPPING_KEYS.map((key) => {
              const field = COLUMN_MAPPING_CONFIG[key];
              const multi = field.type === "multi";
              const value = mapping.mappings[key as keyof Mappings];
              const missing = field.isRequired && isEmpty(value);
              const isDate = key === "invoiceDate" || key === "voucherDate";
              const formatKey =
                key === "invoiceDate"
                  ? "invoiceDateFormat"
                  : ("voucherDateFormat" as const);
              const fromAi =
                !loading &&
                !isEmpty(value) &&
                JSON.stringify(value) ===
                  JSON.stringify(suggested[key as keyof Mappings]);
              return (
                <TableRow key={key} className="hover:bg-transparent">
                  <TableCell className={cn("h-14 px-3 align-middle", T.cell)}>
                    <span className="flex items-center gap-1.5">
                      {field.isRequired ? <Req /> : null}
                      {field.label}
                      {key === "invoiceAmount" && (
                        <Tooltip
                          align="start"
                          message="add all TDS columns in invoice amount, if any"
                        >
                          <Info className="h-3 w-3 text-primary" />
                        </Tooltip>
                      )}
                    </span>
                  </TableCell>
                  <TableCell className="px-3 py-2 align-middle">
                    {loading ? (
                      <span className="block h-3 w-2/3 animate-pulse rounded bg-neutral-gray motion-reduce:animate-none" />
                    ) : (
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <ComboBox<string>
                            title="Select Column"
                            searchPlaceholder="Search columns"
                            options={options}
                            selectedValue={
                              (multi
                                ? (value as string[])
                                : (value as string)) ?? ""
                            }
                            isMultiSelect={multi}
                            hideClearButton={!multi}
                            showSelectedValuesInTrigger
                            modal={false}
                            size="sm"
                            invalid={missing}
                            onChange={(next) =>
                              set(
                                key as keyof Mappings,
                                (multi
                                  ? Array.isArray(next)
                                    ? next
                                    : [next]
                                  : Array.isArray(next)
                                    ? (next[0] ?? "")
                                    : next) as never
                              )
                            }
                            wrapperClassName="w-[--radix-popover-trigger-width]"
                            triggerClassName={cn("h-8 min-w-0 flex-1", T.cell)}
                          />
                          {isDate && (
                            <ComboBox<string>
                              title={
                                key === "invoiceDate"
                                  ? "Select Invoice Date Format"
                                  : "Select Voucher Date Format"
                              }
                              options={prDateFormatOptions}
                              selectedValue={mapping.mappings[formatKey] ?? ""}
                              isMultiSelect={false}
                              hasSearch={false}
                              hideClearButton
                              modal={false}
                              size="sm"
                              onChange={(next) =>
                                set(
                                  formatKey,
                                  Array.isArray(next) ? next[0] : next
                                )
                              }
                              wrapperClassName="w-[180px]"
                              triggerClassName={cn("h-8 w-[150px]", T.cell)}
                            />
                          )}
                          <span
                            className="grid size-4 flex-none place-items-center"
                            title={fromAi ? "Suggested by AI" : undefined}
                          >
                            {fromAi && (
                              <Sparkles
                                className="size-3.5 text-primary"
                                aria-label="Suggested by AI"
                              />
                            )}
                          </span>
                        </div>
                        {missing ? (
                          <span className="text-xs text-destructive-foreground">
                            Required
                          </span>
                        ) : null}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-7 py-5">
        <p className="text-sm text-foreground">
          <span className="font-semibold text-destructive-foreground">
            Disclaimer:
          </span>{" "}
          Rows/Invoices with 0 tax value are excluded from the reconciliation
          process
        </p>
        <Button
          disabled={!ready || loading || saving}
          loading={saving}
          onClick={() => onSave(mapping)}
        >
          Map &amp; Import
        </Button>
      </div>
    </PageDialog>
  );
};

export default ColumnsMappingModal;
