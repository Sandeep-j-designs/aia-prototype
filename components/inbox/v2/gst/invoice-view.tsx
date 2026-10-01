import React, { useEffect, useMemo, useState } from "react";
import { Ellipsis, Link, MessageSquareText, Undo2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FilterChip from "@/components/common/filter-chip";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import {
  AMENDED_SHEET_TYPES,
  AMENDED_TOOLTIP,
  GSTR2B_MATCH_TYPE_LABELS,
  GSTR2B_MATCH_TYPE_ORDER,
  INVOICE_FILTER_COPY,
  ITC_ACTION_OPTIONS,
  ITC_TABLE_CONFIG,
  REMARK_KEY_BY_COLUMN,
  TAX_DIFF_TABLE_COLUMNS,
  type Gstr2bMatchTypeValueType,
  type ITC_ACTION_VALUES_VALUE_TYPE,
  type RemarkKey,
} from "@/config/pages/inbox/gst";
import {
  EmptyBlock,
  HEADER_CLASS,
  Pager,
  TABLE_CLASS,
  nextSort,
  sortRows,
  type SortState,
} from "@/components/inbox/v2/banking/table-parts";
import { gst } from "@/hooks/pages/inbox/use-gst";
import type {
  InvoiceTableFilterState,
  InvoiceViewData,
  InvoiceViewPrData,
  InvoiceViewRow,
} from "@/types/pages/inbox/gst";
import {
  buildInvoiceSummary,
  distinctValues,
  filterInvoiceRows,
  gstDate,
  hasRemark,
  invoiceTypeOf,
  rowId,
} from "@/utils/pages/inbox/gst";
import { AmountText, T } from "@/components/inbox/v2/ui";
import LinkModal from "./link-modal";
import RemarkModal from "./remark-modal";
import {
  AmountRangeFilter,
  DateRangeFilter,
  HeadCell,
  MatchStatusPill,
  MultiSelectFilter,
  TwoLine,
} from "./table-parts";

/**
 * Invoice View — production's invoice-view: the tax difference and ITC
 * strips, then every pair as two lines, the GSTR-2B line over the Purchase
 * Register line. A field the two disagree on (the row's remarks[]) is red
 * on both lines. ITC and the actions are pinned right.
 */

type ColumnKey =
  | "srNo"
  | "matchType"
  | "source"
  | "invoiceType"
  | "gstin"
  | "vendorName"
  | "invoiceDate"
  | "invoiceNo"
  | "invoiceAmount"
  | "taxableAmount"
  | "sgst"
  | "cgst"
  | "igst"
  | "cess"
  | "rcm";

type AmountKey =
  "invoiceAmount" | "taxableAmount" | "sgst" | "cgst" | "igst" | "cess";

const COLUMNS: { key: ColumnKey; label: string; width: number }[] = [
  { key: "srNo", label: "Sr.No", width: 64 },
  { key: "matchType", label: "Reco Status", width: 156 },
  { key: "source", label: "Source", width: 72 },
  { key: "invoiceType", label: "Invoice Type", width: 136 },
  { key: "gstin", label: "GSTIN", width: 170 },
  { key: "vendorName", label: "Vendor Name", width: 210 },
  { key: "invoiceDate", label: "Invoice Date", width: 136 },
  { key: "invoiceNo", label: "Invoice No", width: 176 },
  { key: "invoiceAmount", label: "Invoice Amount", width: 150 },
  { key: "taxableAmount", label: "Taxable Amount", width: 156 },
  { key: "sgst", label: "SGST", width: 120 },
  { key: "cgst", label: "CGST", width: 120 },
  { key: "igst", label: "IGST", width: 120 },
  { key: "cess", label: "CESS", width: 96 },
  { key: "rcm", label: "RCM", width: 72 },
];
const ITC_WIDTH = 140;
const ACTIONS_WIDTH = 52;
const TABLE_WIDTH =
  COLUMNS.reduce((n, c) => n + c.width, 0) + ITC_WIDTH + ACTIONS_WIDTH;

const AMOUNT_KEYS: AmountKey[] = [
  "invoiceAmount",
  "taxableAmount",
  "sgst",
  "cgst",
  "igst",
  "cess",
];

/** The remarks[] key that turns each column red. */
const REMARK_OF: Partial<Record<ColumnKey, RemarkKey[]>> = {
  invoiceType: [REMARK_KEY_BY_COLUMN.documentType],
  gstin: [REMARK_KEY_BY_COLUMN.gstin],
  invoiceDate: [REMARK_KEY_BY_COLUMN.invoiceDate],
  invoiceNo: [REMARK_KEY_BY_COLUMN.invoiceNo],
  invoiceAmount: [REMARK_KEY_BY_COLUMN.invoiceAmount],
  taxableAmount: [REMARK_KEY_BY_COLUMN.taxableAmount],
  sgst: [REMARK_KEY_BY_COLUMN.sgst],
  cgst: [REMARK_KEY_BY_COLUMN.cgst],
  igst: [REMARK_KEY_BY_COLUMN.igst],
  cess: [REMARK_KEY_BY_COLUMN.cess],
};

/** Either side, the 2B first — what a sort on a pair compares. */
const side = (row: InvoiceViewRow) => (row.gstr2b ?? row.pr) as InvoiceViewData;

const SORT_VALUE: Partial<
  Record<ColumnKey, (row: InvoiceViewRow) => string | number>
> = {
  matchType: (r) => GSTR2B_MATCH_TYPE_ORDER.indexOf(r.matchType),
  invoiceType: invoiceTypeOf,
  gstin: (r) => side(r).gstin,
  vendorName: (r) => side(r).vendorName,
  invoiceDate: (r) => side(r).invoiceDate,
  invoiceNo: (r) => side(r).invoiceNo,
  invoiceAmount: (r) => side(r).invoiceAmount,
  taxableAmount: (r) => side(r).taxableAmount,
  sgst: (r) => side(r).sgst,
  cgst: (r) => side(r).cgst,
  igst: (r) => side(r).igst,
  cess: (r) => side(r).cess,
};

const MATCH_OPTIONS = GSTR2B_MATCH_TYPE_ORDER.map((value) => ({
  value,
  label: GSTR2B_MATCH_TYPE_LABELS[value],
}));

type Props = {
  company: string;
  rows: InvoiceViewRow[];
  search: string;
  filters: InvoiceTableFilterState;
  onFiltersChange: (next: InvoiceTableFilterState) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
};

const InvoiceView = ({
  company,
  rows,
  search,
  filters,
  onFiltersChange,
  notify,
}: Props) => {
  const [sort, setSort] = useState<SortState<ColumnKey>>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [linking, setLinking] = useState<InvoiceViewRow | null>(null);
  const [remarking, setRemarking] = useState<InvoiceViewPrData | null>(null);

  const filtered = useMemo(
    () => filterInvoiceRows(rows, filters, search),
    [rows, filters, search]
  );
  const sorted = useMemo(
    () => sortRows(filtered, sort, SORT_VALUE),
    [filtered, sort]
  );
  useEffect(() => setPage(0), [filters, search, sort]);
  const lastPage = Math.max(0, Math.ceil(sorted.length / pageSize) - 1);
  const shownPage = Math.min(page, lastPage);
  const pageRows = sorted.slice(
    shownPage * pageSize,
    (shownPage + 1) * pageSize
  );
  // The strips describe what the filters leave, as production's API does.
  const summary = useMemo(() => buildInvoiceSummary(filtered), [filtered]);

  const apply = (patch: InvoiceTableFilterState) =>
    onFiltersChange({ ...filters, ...patch });

  const options = useMemo(
    () => ({
      documentType: [...new Set(rows.map(invoiceTypeOf))]
        .filter(Boolean)
        .map((v) => ({ value: v, label: v })),
      gstin: distinctValues(rows, (d) => d.gstin),
      vendorName: distinctValues(rows, (d) => d.vendorName),
      invoiceNo: distinctValues(rows, (d) => d.invoiceNo),
    }),
    [rows]
  );

  const multi = (
    key: "matchType" | "documentType" | "gstin" | "vendorName" | "invoiceNo",
    list: { value: string; label: string }[]
  ) => {
    const copy = INVOICE_FILTER_COPY[key];
    return (close: () => void) => (
      <MultiSelectFilter
        title={copy.title}
        subtitle={copy.subtitle}
        searchPlaceholder={copy.searchPlaceholder}
        options={list}
        value={filters[key] ?? []}
        onApply={(next) => apply({ [key]: next })}
        close={close}
      />
    );
  };

  const amount = (key: AmountKey) => {
    const copy = INVOICE_FILTER_COPY[key];
    return (close: () => void) => (
      <AmountRangeFilter
        title={copy.title}
        subtitle={copy.subtitle}
        from={filters[`${key}From`]}
        to={filters[`${key}To`]}
        onApply={(from, to) =>
          apply({ [`${key}From`]: from, [`${key}To`]: to })
        }
        close={close}
      />
    );
  };

  const filterFor = (key: ColumnKey) => {
    switch (key) {
      case "matchType":
        return multi("matchType", MATCH_OPTIONS);
      case "invoiceType":
        return multi("documentType", options.documentType);
      case "gstin":
        return multi("gstin", options.gstin);
      case "vendorName":
        return multi("vendorName", options.vendorName);
      case "invoiceNo":
        return multi("invoiceNo", options.invoiceNo);
      case "invoiceDate":
        return (close: () => void) => (
          <DateRangeFilter
            from={filters.invoiceDateFrom}
            to={filters.invoiceDateTo}
            onApply={(from, to) =>
              apply({ invoiceDateFrom: from, invoiceDateTo: to })
            }
            close={close}
          />
        );
      default:
        return AMOUNT_KEYS.includes(key as AmountKey)
          ? amount(key as AmountKey)
          : undefined;
    }
  };

  const filterActive = (key: ColumnKey) => {
    const listKey =
      key === "invoiceType"
        ? "documentType"
        : (key as keyof InvoiceTableFilterState);
    if (key === "invoiceDate")
      return !!filters.invoiceDateFrom || !!filters.invoiceDateTo;
    if (AMOUNT_KEYS.includes(key as AmountKey))
      return (
        !!filters[`${key as AmountKey}From`] ||
        !!filters[`${key as AmountKey}To`]
      );
    const v = filters[listKey];
    return Array.isArray(v) && v.length > 0;
  };

  /* -------------------------------------------------------- active chips */
  const chips: {
    id: string;
    label: string;
    value: string[];
    clear: () => void;
  }[] = [];
  if (filters.matchType?.length)
    chips.push({
      id: "matchType",
      label: "Reco Status",
      value: filters.matchType.map(
        (v) => GSTR2B_MATCH_TYPE_LABELS[v as Gstr2bMatchTypeValueType]
      ),
      clear: () => apply({ matchType: [] }),
    });
  (
    [
      ["documentType", "Invoice Type"],
      ["gstin", "GSTIN"],
      ["vendorName", "Vendor Name"],
      ["invoiceNo", "Invoice No"],
      ["itcStatus", "ITC"],
    ] as const
  ).forEach(([key, label]) => {
    if (filters[key]?.length)
      chips.push({
        id: key,
        label,
        value: filters[key]!,
        clear: () => apply({ [key]: [] }),
      });
  });
  if (filters.invoiceDateFrom || filters.invoiceDateTo)
    chips.push({
      id: "invoiceDate",
      label: "Invoice Date",
      value: [
        `${gstDate(filters.invoiceDateFrom)} – ${gstDate(filters.invoiceDateTo)}`,
      ],
      clear: () =>
        apply({ invoiceDateFrom: undefined, invoiceDateTo: undefined }),
    });
  AMOUNT_KEYS.forEach((key) => {
    const from = filters[`${key}From`];
    const to = filters[`${key}To`];
    if (from || to)
      chips.push({
        id: key,
        label: INVOICE_FILTER_COPY[key].title,
        value: [`${from ?? "0"} – ${to ?? "any"}`],
        clear: () =>
          apply({ [`${key}From`]: undefined, [`${key}To`]: undefined }),
      });
  });

  /* ---------------------------------------------------------------- cells */
  const red = (row: InvoiceViewRow, key: ColumnKey) =>
    (REMARK_OF[key] ?? []).some((k) => hasRemark(row, k)) &&
    "text-destructive-foreground";

  const linkButton = (row: InvoiceViewRow) => (
    <Button
      variant="link"
      className="h-auto gap-1.5 p-0 text-label-3 font-semibold no-underline hover:no-underline"
      onClick={() => setLinking(row)}
    >
      <Link className="h-3.5 w-3.5" aria-hidden />
      Link Invoice
    </Button>
  );

  const text = (value?: string) =>
    value ? (
      <span className="truncate" title={value}>
        {value}
      </span>
    ) : (
      "-"
    );
  const money = (value?: number) =>
    value ? (
      <span className="truncate tabular-nums">
        <AmountText value={value} />
      </span>
    ) : (
      "-"
    );

  const invoiceType = (d: InvoiceViewData | null, amendable: boolean) => {
    if (!d) return "-";
    if (!amendable || !d.sheetType || !AMENDED_SHEET_TYPES.has(d.sheetType))
      return text(d.documentType);
    return (
      <span className="inline-flex items-center gap-1">
        {d.documentType}
        <Tooltip message={AMENDED_TOOLTIP}>
          <span className="cursor-default font-semibold">(A)</span>
        </Tooltip>
      </span>
    );
  };

  const cell = (key: ColumnKey, row: InvoiceViewRow, index: number) => {
    const { gstr2b, pr } = row;
    const ink = red(row, key);
    switch (key) {
      case "srNo":
        return (
          <span className="block text-center tabular-nums">
            {shownPage * pageSize + index + 1}
          </span>
        );
      case "matchType":
        return <MatchStatusPill matchType={row.matchType} />;
      case "source":
        return (
          <TwoLine
            align="center"
            className="font-medium"
            top="2B"
            bottom="PR"
          />
        );
      case "invoiceType":
        return (
          <TwoLine
            className={cn(ink)}
            top={invoiceType(gstr2b, true)}
            bottom={invoiceType(pr, false)}
          />
        );
      case "gstin":
        return (
          <TwoLine
            className={cn(ink)}
            top={text(gstr2b?.gstin)}
            bottom={text(pr?.gstin)}
          />
        );
      case "vendorName":
        return (
          <TwoLine
            top={text(gstr2b?.vendorName)}
            bottom={text(pr?.vendorName)}
          />
        );
      case "invoiceDate":
        return (
          <TwoLine
            className={cn("tabular-nums", ink)}
            top={gstr2b ? gstDate(gstr2b.invoiceDate) : "-"}
            bottom={pr ? gstDate(pr.invoiceDate) : "-"}
          />
        );
      case "invoiceNo":
        return (
          <TwoLine
            className={cn(ink)}
            top={gstr2b ? text(gstr2b.invoiceNo) : pr ? linkButton(row) : "-"}
            bottom={pr ? text(pr.invoiceNo) : gstr2b ? linkButton(row) : "-"}
          />
        );
      case "rcm":
        return (
          <TwoLine
            align="center"
            top={
              gstr2b ? (
                <Switch
                  aria-label={`Reverse charge for ${gstr2b.invoiceNo}`}
                  checked={gstr2b.isReverseChargeApplied}
                  onCheckedChange={(checked) => {
                    gst.setRcm(company, gstr2b.gstr2bLineUuid, checked);
                    notify(
                      checked
                        ? "Reverse charge enabled successfully"
                        : "Reverse charge disabled successfully",
                      "success"
                    );
                  }}
                />
              ) : (
                "-"
              )
            }
            bottom=""
          />
        );
      default:
        return (
          <TwoLine
            align="right"
            className={cn(ink)}
            top={money(gstr2b?.[key as AmountKey])}
            bottom={money(pr?.[key as AmountKey])}
          />
        );
    }
  };

  const SINGLE = new Set<ColumnKey>(["srNo", "matchType"]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {/* Tax difference and ITC strips. */}
      <div className="flex shrink-0 flex-wrap gap-4 px-6 pb-3">
        <div className="min-w-[520px] flex-[3] overflow-hidden rounded-md border border-neutral-gray">
          <Table className="border-separate border-spacing-0 [&_td:not(:last-child)]:border-r [&_td]:border-neutral-gray [&_th:not(:last-child)]:border-r [&_th]:border-b [&_th]:border-neutral-gray">
            <TableHeader className="bg-accent [&_tr]:shadow-none">
              <TableRow className="hover:bg-transparent">
                {TAX_DIFF_TABLE_COLUMNS.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(
                      "h-9 px-3 py-0 text-center align-middle",
                      T.head
                    )}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className={cn("p-0", T.cell)}>
                  <TwoLine
                    align="center"
                    className="font-semibold"
                    top="2B"
                    bottom="PR"
                  />
                </TableCell>
                <TableCell className={cn("p-0", T.cell)}>
                  <TwoLine
                    align="center"
                    className="tabular-nums"
                    top={summary.gstr2b.gstr2bCount}
                    bottom={summary.pr.prCount}
                  />
                </TableCell>
                <TableCell className={cn("p-0", T.cell)}>
                  <TwoLine
                    align="center"
                    className="tabular-nums"
                    top={
                      <AmountText value={summary.gstr2b.gstr2bTaxableAmount} />
                    }
                    bottom={<AmountText value={summary.pr.prTaxableAmount} />}
                  />
                </TableCell>
                <TableCell className={cn("p-0", T.cell)}>
                  <TwoLine
                    align="center"
                    className="tabular-nums"
                    top={<AmountText value={summary.gstr2b.gstr2bTaxAmount} />}
                    bottom={<AmountText value={summary.pr.prTaxAmount} />}
                  />
                </TableCell>
                {(() => {
                  const diff =
                    summary.gstr2b.gstr2bTaxAmount - summary.pr.prTaxAmount;
                  return (
                    <TableCell
                      className={cn(
                        "bg-section px-3 py-0 text-center align-middle font-semibold tabular-nums",
                        T.cell,
                        Math.abs(diff) >= 0.01 && "text-destructive-foreground"
                      )}
                    >
                      <AmountText value={diff} />
                    </TableCell>
                  );
                })()}
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="min-w-[380px] flex-[2] overflow-hidden rounded-md border border-neutral-gray">
          <Table className="h-full border-separate border-spacing-0 [&_td:not(:last-child)]:border-r [&_td]:border-neutral-gray [&_th:not(:last-child)]:border-r [&_th]:border-b [&_th]:border-neutral-gray">
            <TableHeader className="bg-accent [&_tr]:shadow-none">
              <TableRow className="hover:bg-transparent">
                {ITC_TABLE_CONFIG.map((c) => (
                  <TableHead
                    key={c.key}
                    className={cn(
                      "h-9 whitespace-nowrap px-3 py-0 text-center align-middle",
                      T.head
                    )}
                  >
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                {ITC_TABLE_CONFIG.map((c) => (
                  <TableCell
                    key={c.key}
                    className={cn(
                      "h-[57px] px-3 py-0 text-center align-middle font-semibold tabular-nums",
                      T.cell
                    )}
                  >
                    {c.type === "amount" ? (
                      <AmountText value={summary.itcDetails[c.key]} />
                    ) : (
                      summary.itcDetails[c.key]
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 pb-3">
          {chips.map((chip) => (
            <FilterChip
              key={chip.id}
              label={chip.label}
              value={chip.value}
              selectionType="multiple"
              onClearButtonClick={chip.clear}
            />
          ))}
          <Button
            variant="ghost"
            className="h-7"
            onClick={() => onFiltersChange({})}
          >
            <Undo2 className="h-3 w-3" />
            Reset Filters
          </Button>
        </div>
      )}

      <div className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-neutral-gray">
        <Table
          className={TABLE_CLASS}
          style={{ width: TABLE_WIDTH, minWidth: "100%" }}
          aria-label="Invoice pairs, GSTR-2B over Purchase Register"
        >
          <colgroup>
            {COLUMNS.map((c) => (
              <col key={c.key} style={{ width: c.width }} />
            ))}
            <col style={{ width: ITC_WIDTH }} />
            <col style={{ width: ACTIONS_WIDTH }} />
          </colgroup>
          <TableHeader className={cn(HEADER_CLASS, "z-20 [&_th]:border-t-0")}>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((c) => {
                const sortable = !!SORT_VALUE[c.key];
                return (
                  <HeadCell
                    key={c.key}
                    label={c.label}
                    align={
                      AMOUNT_KEYS.includes(c.key as AmountKey)
                        ? "right"
                        : c.key === "srNo" ||
                            c.key === "source" ||
                            c.key === "rcm"
                          ? "center"
                          : "left"
                    }
                    sort={
                      sortable
                        ? sort?.key === c.key
                          ? sort.dir
                          : "none"
                        : undefined
                    }
                    onSort={() => setSort((s) => nextSort(s, c.key))}
                    filter={filterFor(c.key)}
                    filterActive={filterActive(c.key)}
                  />
                );
              })}
              <HeadCell
                label="ITC"
                style={{ right: ACTIONS_WIDTH }}
                className="sticky z-10 border-l bg-accent"
                filter={(close) => (
                  <MultiSelectFilter
                    title={INVOICE_FILTER_COPY.itcStatus.title}
                    subtitle={INVOICE_FILTER_COPY.itcStatus.subtitle}
                    searchPlaceholder={
                      INVOICE_FILTER_COPY.itcStatus.searchPlaceholder
                    }
                    options={ITC_ACTION_OPTIONS}
                    value={filters.itcStatus ?? []}
                    onApply={(next) => apply({ itcStatus: next })}
                    close={close}
                  />
                )}
                filterActive={!!filters.itcStatus?.length}
              />
              <TableHead
                aria-label="Actions"
                style={{ right: 0 }}
                className="sticky right-0 z-10 h-10 bg-accent px-3 py-0"
              />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row, index) => {
              const matched = !!row.gstr2b && !!row.pr;
              return (
                <TableRow
                  key={rowId(row)}
                  className="group hover:bg-transparent"
                >
                  {COLUMNS.map((c) => (
                    <TableCell
                      key={c.key}
                      className={cn(
                        T.cell,
                        "group-hover:bg-section",
                        SINGLE.has(c.key)
                          ? "px-3 py-0 align-middle"
                          : "p-0 align-top"
                      )}
                    >
                      {cell(c.key, row, index)}
                    </TableCell>
                  ))}
                  <TableCell
                    style={{ right: ACTIONS_WIDTH }}
                    className="sticky z-[1] border-l border-neutral-gray bg-background px-2 py-0 align-middle group-hover:bg-section"
                  >
                    <Select
                      value={row.itcStatus ?? ""}
                      disabled={!row.gstr2b}
                      onValueChange={(value) => {
                        if (!row.gstr2b) return;
                        gst.setItc(
                          company,
                          row.gstr2b.gstr2bLineUuid,
                          value as ITC_ACTION_VALUES_VALUE_TYPE
                        );
                        notify("ITC action applied successfully", "success");
                      }}
                    >
                      <SelectTrigger
                        aria-label={`ITC for ${side(row).invoiceNo}`}
                        className={cn("h-8 bg-background", T.cell)}
                      >
                        <SelectValue placeholder="No Action" />
                      </SelectTrigger>
                      <SelectContent>
                        {ITC_ACTION_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="sticky right-0 z-[1] bg-background px-1 py-0 text-center align-middle group-hover:bg-section">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${side(row).invoiceNo}`}
                        >
                          <Ellipsis className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {row.pr && (
                          <DropdownMenuItem
                            onSelect={() => setRemarking(row.pr)}
                          >
                            <MessageSquareText className="mr-2 h-4 w-4" />
                            {row.pr.remarks ? "View Remark" : "Add Remark"}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          disabled={!matched || !row.reconRunUuids.length}
                          onSelect={() => {
                            gst.delink(company, row);
                            notify("Invoice delinked successfully", "success");
                          }}
                        >
                          <Unlink className="mr-2 h-4 w-4" />
                          Delink Invoice
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!pageRows.length && (
          <EmptyBlock
            title="No invoices match"
            body="Clear a filter or the search to see more."
          />
        )}
      </div>

      <Pager
        page={shownPage}
        pageSize={pageSize}
        total={sorted.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <LinkModal
        base={linking}
        rows={rows}
        onClose={() => setLinking(null)}
        onLink={(base, picked) => {
          gst.link(company, base, picked);
          setLinking(null);
          notify("Bill linked successfully", "success");
        }}
      />
      <RemarkModal
        pr={remarking}
        onClose={() => setRemarking(null)}
        onSave={(prLineUuid, remarks) => {
          gst.saveRemark(company, prLineUuid, remarks);
          setRemarking(null);
          notify("Remark saved successfully", "success");
        }}
      />
    </div>
  );
};

export default InvoiceView;
