import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  FileSpreadsheet,
  ListFilter,
  Pencil,
  Slash,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import BulkActionBar from "@/components/common/bulk-action-bar";
import {
  DEFAULT_PREVIEW_ROW_STATUS_FILTER,
  FIXED_PREVIEW_COLUMN_KEY_SET,
  PREVIEW_AMOUNT_COLUMNS,
  PREVIEW_COLUMNS,
  PREVIEW_DATE_COLUMNS,
  PREVIEW_LOCKED_FIELDS,
  PREVIEW_NUMBER_COLUMNS,
  PREVIEW_ROW_STATUS_OPTIONS,
} from "@/config/pages/inbox/sales-upload";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import {
  salesUpload,
  type SalesBatchEntry,
} from "@/hooks/pages/inbox/use-sales-upload";
import { cn } from "@/lib/utils";
import {
  ARVoucherImportBatchStatus,
  type PreviewColumnKey,
  type ResponseARVoucherImportPreviewRow,
} from "@/types/pages/inbox/sales-upload";
import { ColumnFilter, type FilterOption } from "../filter-panel";
import { ACTIONS_WIDTH, SELECT_WIDTH } from "../table-sizing";
import { AmountText, PageButton, PageDialog, T } from "../ui";
import { FlowHeader, IssueCardContent, RowStatusPill } from "./common";
import { PREVIEW_COLUMN_SIZES } from "./table-sizing";

/**
 * Preview — production's PreviewPage: every row the AI read, editable in
 * place, with what is wrong with each one, ahead of Create Invoices.
 *
 * The grid is the Purchases register's: the same header (sort, filter,
 * resize handle), sticky checkbox and right-hand bookends, pager and empty
 * block. Production pins Invoice Date, Reference No. and Customer Name left
 * and Status right; so does this.
 */

type Props = {
  entry: SalesBatchEntry;
  onEditMapping: () => void;
  onExit: (tab?: "all" | "uploads") => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
};

type SortDir = "asc" | "desc";
const PAGE_SIZES = [25, 50, 100];
const SORTABLE = new Set<PreviewColumnKey>([
  "invoice_date",
  "reference_number",
  "customer_name",
  "item_amount",
  "tax_amount",
  "total_amount",
]);
const FILTERABLE = new Set<PreviewColumnKey>(["customer_name", "row_status"]);
const LEFT_PINNED = PREVIEW_COLUMNS.filter((c) => c.pinned === "left").map(
  (c) => c.key
);
const LABEL = Object.fromEntries(
  PREVIEW_COLUMNS.map((c) => [c.key, c.label])
) as Record<PreviewColumnKey, string>;
const STATUS_OPTIONS: FilterOption[] = PREVIEW_ROW_STATUS_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}));

const blank = (value: unknown) =>
  value === undefined || value === null || String(value).trim() === "";

/** Production: formatPreviewDate — dd/mm/yyyy. */
const formatDate = (value: unknown) => {
  if (blank(value)) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
};

const PreviewPage = ({ entry, onEditMapping, onExit, notify }: Props) => {
  const { batch, rows } = entry;
  const id = batch.importBatchUuid;
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>(
    DEFAULT_PREVIEW_ROW_STATUS_FILTER
  );
  const [customers, setCustomers] = useState<string[]>([]);
  const [visible, setVisible] = useState<PreviewColumnKey[]>(
    PREVIEW_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)
  );
  const [sort, setSort] = useState<{
    key: PreviewColumnKey;
    dir: SortDir;
  } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<{
    row: string;
    key: PreviewColumnKey;
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);

  const complete = batch.status === ARVoucherImportBatchStatus.COMPLETE;
  const shown = PREVIEW_COLUMNS.map((c) => c.key).filter((key) =>
    visible.includes(key)
  );

  const customerOptions: FilterOption[] = useMemo(
    () =>
      [...new Set(rows.map((r) => String(r.finalPayload.customer_name ?? "")))]
        .filter(Boolean)
        .sort()
        .map((name) => ({ value: name, label: name })),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const out = rows.filter(
      (row) =>
        statuses.includes(row.rowStatus) &&
        (!customers.length ||
          customers.includes(String(row.finalPayload.customer_name ?? ""))) &&
        (!term ||
          Object.values(row.finalPayload).some((v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(term)
          ))
    );
    if (!sort) return out;
    const sign = sort.dir === "asc" ? 1 : -1;
    return out.slice().sort((a, b) => {
      const x = a.finalPayload[sort.key];
      const y = b.finalPayload[sort.key];
      return (
        sign *
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""), "en-IN", {
              numeric: true,
            }))
      );
    });
  }, [rows, search, statuses, customers, sort]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(filtered.length / pageSize) - 1);
  useEffect(() => {
    if (page > lastPage) setPage(lastPage);
  }, [lastPage]);

  /** Production's summary: the whole batch, not the filtered view. */
  const summary = {
    totalRecords: rows.length,
    issueRows: rows.filter(
      (r) => r.rowStatus === "error" || r.rowStatus === "warning"
    ).length,
    validRows: rows.filter((r) => r.rowStatus === "ready").length,
  };

  const resize = useColumnResize({
    shown,
    sizes: PREVIEW_COLUMN_SIZES,
    storageKey: "sales-upload-preview.widths.v1",
  });
  const leftOffset = (key: PreviewColumnKey) => {
    let left = SELECT_WIDTH;
    for (const k of LEFT_PINNED) {
      if (k === key) return left;
      if (shown.includes(k)) left += resize.colWidth(k);
    }
    return left;
  };
  const toggleSort = (key: PreviewColumnKey) => {
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "desc" }
        : current.dir === "desc"
          ? { key, dir: "asc" }
          : null
    );
    setPage(0);
  };

  /* --------------------------------------------------------------- create */
  const createScope = selected.length
    ? rows.filter((r) => selected.includes(r.importRowUuid))
    : rows.filter((r) => r.rowStatus !== "created");
  const eligibleRows = createScope.filter(
    (r) => r.rowStatus === "ready" || r.rowStatus === "warning"
  ).length;
  const errorRows = createScope.filter((r) => r.rowStatus === "error").length;
  const selectedMode = selected.length > 0;
  const createLabel = selectedMode
    ? "Create Selected Invoices"
    : "Create Invoices";

  const openCreate = () => {
    if (!eligibleRows) {
      notify(
        selectedMode
          ? "No eligible selected rows are available to create invoices."
          : "No eligible rows are available to create invoices.",
        "error"
      );
      return;
    }
    setCreateOpen(true);
  };

  // Ctrl/Cmd+Enter, as production binds it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      if (createOpen || deleteIds || complete) return;
      e.preventDefault();
      openCreate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const confirmCreate = async () => {
    setCreating(true);
    const result = await salesUpload.createInvoices(
      id,
      selectedMode ? selected : undefined
    );
    setCreating(false);
    setCreateOpen(false);
    setSelected([]);
    // Production says "rows(s)" here; the typo is fixed, the words are kept.
    notify(
      !result.createdCount
        ? "No new invoices were created."
        : `Created ${result.createdCount} row(s).${
            result.remainingErrorCount
              ? ` ${result.remainingErrorCount} row(s) still need review.`
              : ""
          }`,
      result.createdCount ? "success" : "info"
    );
  };

  /* --------------------------------------------------------------- delete */
  const confirmDelete = () => {
    if (!deleteIds) return;
    const count = salesUpload.deleteRows(id, deleteIds);
    setSelected((current) => current.filter((x) => !deleteIds.includes(x)));
    setDeleteIds(null);
    notify(`Deleted ${count} preview row${count === 1 ? "" : "s"}.`);
  };

  /* ---------------------------------------------------------------- cells */
  const commit = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey,
    raw: string
  ) => {
    setEditing(null);
    const value = PREVIEW_NUMBER_COLUMNS.has(key)
      ? raw.trim() === ""
        ? ""
        : Number(raw)
      : raw.trim();
    if (String(row.finalPayload[key] ?? "") === String(value)) return;
    salesUpload.updateRow(id, row.importRowUuid, key, value);
  };

  const display = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey
  ) => {
    const value = row.finalPayload[key];
    if (blank(value))
      return <span className="text-secondary-foreground">-</span>;
    if (PREVIEW_DATE_COLUMNS.has(key)) return formatDate(value);
    if (PREVIEW_AMOUNT_COLUMNS.has(key))
      return <AmountText value={Number(value)} />;
    return String(value);
  };

  const editable = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey
  ) =>
    row.rowStatus !== "created" &&
    key !== "row_status" &&
    !PREVIEW_LOCKED_FIELDS.has(key);

  const selectable = pageRows.filter((r) => r.rowStatus !== "created");
  const allOnPage =
    !!selectable.length &&
    selectable.every((r) => selected.includes(r.importRowUuid));

  const headCell = (key: PreviewColumnKey) => {
    const label = LABEL[key];
    const width = resize.colWidth(key);
    const size = PREVIEW_COLUMN_SIZES[key];
    const pinnedLeft = LEFT_PINNED.includes(key);
    const pinnedRight = key === "row_status";
    const filterActive =
      key === "customer_name"
        ? !!customers.length
        : key === "row_status"
          ? statuses.join() !== DEFAULT_PREVIEW_ROW_STATUS_FILTER.join()
          : false;
    return (
      <TableHead
        key={key}
        style={{
          width,
          left: pinnedLeft ? leftOffset(key) : undefined,
          right: pinnedRight ? ACTIONS_WIDTH : undefined,
        }}
        aria-sort={
          !SORTABLE.has(key)
            ? undefined
            : sort?.key !== key
              ? "none"
              : sort.dir === "asc"
                ? "ascending"
                : "descending"
        }
        className={cn(
          "relative h-10 whitespace-nowrap bg-accent px-3 py-0 align-middle",
          T.head,
          (pinnedLeft || pinnedRight) && "sticky z-20",
          pinnedRight && "border-l border-neutral-gray"
        )}
      >
        <div
          className={cn(
            "flex h-4 min-w-0 items-center gap-1",
            PREVIEW_AMOUNT_COLUMNS.has(key) && "justify-end"
          )}
        >
          <span className="truncate" title={label}>
            {label}
          </span>
          {SORTABLE.has(key) && (
            <button
              type="button"
              onClick={() => toggleSort(key)}
              aria-label={`Sort by ${label}`}
              className="grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted"
            >
              {sort?.key === key ? (
                sort.dir === "asc" ? (
                  <ArrowUp className="h-3 w-3 text-primary" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-primary" />
                )
              ) : (
                <ArrowUpDown className="h-3 w-3 text-secondary-foreground" />
              )}
            </button>
          )}
          {FILTERABLE.has(key) && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`Filter ${label}`}
                  className={cn(
                    "grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted",
                    filterActive ? "text-primary" : "text-secondary-foreground"
                  )}
                >
                  <ListFilter className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align={pinnedRight ? "end" : "start"}
                className="w-auto overflow-hidden p-0"
              >
                {key === "row_status" ? (
                  <ColumnFilter
                    label="Status"
                    options={STATUS_OPTIONS}
                    selected={statuses}
                    onChange={(next) => {
                      setStatuses(next);
                      setPage(0);
                    }}
                  />
                ) : (
                  <ColumnFilter
                    label="Customer Name"
                    options={customerOptions}
                    selected={customers}
                    onChange={(next) => {
                      setCustomers(next);
                      setPage(0);
                    }}
                  />
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${label}`}
          tabIndex={0}
          aria-valuemin={size.min}
          aria-valuemax={size.max}
          aria-valuenow={width}
          title={`${width} px · Drag or use arrow keys to resize. Double-click or Enter to reset.`}
          onPointerDown={(e) => resize.startResize(key, e)}
          onDoubleClick={() => {
            if (resize.isManual) resize.resizeColumn(key, size.preferred);
          }}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 40 : 10;
            const next =
              e.key === "ArrowRight"
                ? width + step
                : e.key === "ArrowLeft"
                  ? width - step
                  : e.key === "Home"
                    ? size.min
                    : e.key === "End"
                      ? size.max
                      : e.key === "Enter"
                        ? size.preferred
                        : null;
            if (next !== null) {
              e.preventDefault();
              resize.resizeColumn(key, next);
            }
          }}
          className="group absolute -right-[5px] top-0 z-20 flex h-full w-[10px] cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none"
        >
          <span
            className={cn(
              "w-[2px] transition-colors group-hover:bg-primary group-focus-visible:bg-primary",
              resize.resizing === key ? "bg-primary" : "bg-transparent"
            )}
          />
        </span>
      </TableHead>
    );
  };

  const bodyCell = (
    row: ResponseARVoucherImportPreviewRow,
    key: PreviewColumnKey,
    ground: string
  ) => {
    const pinnedLeft = LEFT_PINNED.includes(key);
    const pinnedRight = key === "row_status";
    const issues = row.issuePayload.filter((issue) => issue.field === key);
    const error = issues.some((issue) => issue.severity === "error");
    const isEditing = editing?.row === row.importRowUuid && editing.key === key;
    const canEdit = editable(row, key);
    return (
      <TableCell
        key={key}
        style={{
          left: pinnedLeft ? leftOffset(key) : undefined,
          right: pinnedRight ? ACTIONS_WIDTH : undefined,
        }}
        onClick={() =>
          canEdit && !isEditing && setEditing({ row: row.importRowUuid, key })
        }
        className={cn(
          "h-[45px] overflow-hidden px-3 py-0 align-middle",
          T.cell,
          (pinnedLeft || pinnedRight) && "sticky z-[1]",
          pinnedRight && "border-l border-neutral-gray",
          issues.length
            ? error
              ? "bg-destructive"
              : "bg-warning"
            : pinnedLeft || pinnedRight
              ? ground
              : undefined,
          canEdit && !isEditing && "cursor-text",
          isEditing && "p-0"
        )}
      >
        {key === "row_status" ? (
          <RowStatusPill row={row} />
        ) : isEditing ? (
          <Input
            autoFocus
            aria-label={LABEL[key]}
            type={
              PREVIEW_DATE_COLUMNS.has(key)
                ? "date"
                : PREVIEW_NUMBER_COLUMNS.has(key)
                  ? "number"
                  : "text"
            }
            defaultValue={String(row.finalPayload[key] ?? "")}
            onBlur={(e) => commit(row, key, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(null);
            }}
            className={cn(
              "h-[44px] rounded-none border-0 px-3 shadow-none ring-2 ring-inset ring-primary focus-visible:ring-2 focus-visible:ring-primary",
              T.cell,
              PREVIEW_AMOUNT_COLUMNS.has(key) && "text-right"
            )}
          />
        ) : (
          <span
            className={cn(
              "flex min-w-0 items-center gap-1.5",
              PREVIEW_AMOUNT_COLUMNS.has(key) && "justify-end"
            )}
          >
            <span
              className={cn(
                "truncate",
                PREVIEW_AMOUNT_COLUMNS.has(key) && "tabular-nums"
              )}
              title={
                blank(row.finalPayload[key])
                  ? undefined
                  : String(row.finalPayload[key])
              }
            >
              {display(row, key)}
            </span>
            {issues.length > 0 && (
              <HoverCard openDelay={100} closeDelay={0}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={issues.map((i) => i.message).join(" ")}
                    className={cn(
                      "ml-auto grid size-4 flex-none place-items-center rounded-sm",
                      error
                        ? "text-destructive-foreground"
                        : "text-warning-foreground"
                    )}
                  >
                    <AlertCircle className="size-3.5" />
                  </button>
                </HoverCardTrigger>
                <IssueCardContent issues={issues} />
              </HoverCard>
            )}
          </span>
        )}
      </TableCell>
    );
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <FlowHeader
        title="Preview"
        fileName={batch.originalFileName}
        onClose={() => onExit("uploads")}
      />

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 pb-3 pt-4">
        <div className="relative w-full sm:w-[222px]">
          <Input
            aria-label="Search preview rows"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className={cn("h-9 pr-9", T.cell, "text-foreground")}
          />
          {!search && (
            <span
              aria-hidden
              className="pointer-events-none absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md bg-section"
            >
              <Slash className="h-3 w-3 text-secondary-foreground" />
            </span>
          )}
        </div>
        <span className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9">
              <Columns3 aria-hidden />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="max-h-[360px] w-56 overflow-y-auto"
          >
            <DropdownMenuLabel className={T.label}>
              Show columns
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {PREVIEW_COLUMNS.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key}
                checked={visible.includes(column.key)}
                disabled={FIXED_PREVIEW_COLUMN_KEY_SET.has(column.key)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) =>
                  setVisible((current) =>
                    checked
                      ? [...current, column.key]
                      : current.filter((k) => k !== column.key)
                  )
                }
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="secondary" disabled={complete} onClick={onEditMapping}>
          <Pencil aria-hidden />
          Edit Mapping
        </Button>
        <Button disabled={complete} onClick={openCreate} title="Ctrl/Cmd+Enter">
          {createLabel}
        </Button>
      </div>

      <div className="mx-6 mb-3 flex h-10 shrink-0 items-center justify-between gap-4 rounded-md border border-neutral-gray bg-section px-5 text-sm">
        <span className="flex items-center gap-2 text-foreground">
          <FileSpreadsheet className="size-3.5" aria-hidden />
          Total Records:
          <span className="font-semibold tabular-nums">
            {summary.totalRecords}
          </span>
        </span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-destructive-foreground">
            <TriangleAlert className="size-3.5" aria-hidden />
            Issues Found:
            <span className="font-semibold tabular-nums">
              {summary.issueRows}
            </span>
          </span>
          <span className="flex items-center gap-2 text-primary">
            <CheckCheck className="size-3.5" aria-hidden />
            Valid Rows:
            <span className="font-semibold tabular-nums">
              {summary.validRows}
            </span>
          </span>
        </span>
      </div>

      {/* The positioning context the selection bar hangs off. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={resize.gridRef}
          role="region"
          aria-label="Preview rows"
          className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-neutral-gray"
        >
          <Table
            style={{ width: resize.tableWidth }}
            className="table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-neutral-gray [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-neutral-gray [&_th:last-child]:border-r-0"
          >
            <TableHeader className="sticky top-0 z-10 bg-accent [&_tr]:shadow-none [&_th]:border-b [&_th]:border-neutral-gray">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  style={{ width: SELECT_WIDTH }}
                  className="sticky left-0 z-20 h-10 bg-accent px-3 py-0 align-middle"
                >
                  <Checkbox
                    aria-label="Select every row on this page"
                    checked={allOnPage}
                    disabled={!selectable.length}
                    onCheckedChange={(checked) =>
                      setSelected(
                        checked
                          ? [
                              ...new Set([
                                ...selected,
                                ...selectable.map((r) => r.importRowUuid),
                              ]),
                            ]
                          : selected.filter(
                              (x) =>
                                !selectable.some((r) => r.importRowUuid === x)
                            )
                      )
                    }
                  />
                </TableHead>
                {shown.map(headCell)}
                <TableHead
                  style={{ width: ACTIONS_WIDTH }}
                  className="sticky right-0 z-20 h-10 border-l border-neutral-gray bg-accent px-3 py-0 align-middle"
                >
                  <span className={cn(T.head, "flex h-4 items-center")}>
                    Actions
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const ticked = selected.includes(row.importRowUuid);
                const ground = ticked ? "bg-accent" : "bg-background";
                const created = row.rowStatus === "created";
                const name = String(
                  row.finalPayload.reference_number || row.sourceRowNumber
                );
                return (
                  <TableRow
                    key={row.importRowUuid}
                    aria-selected={ticked}
                    className={cn(
                      "hover:bg-transparent",
                      ticked && "bg-accent hover:bg-accent"
                    )}
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 z-[1] h-[45px] px-3 py-0 align-middle",
                        ground
                      )}
                    >
                      <Checkbox
                        aria-label={`Select row ${name}`}
                        checked={ticked}
                        disabled={created}
                        onCheckedChange={(checked) =>
                          setSelected(
                            checked
                              ? [...selected, row.importRowUuid]
                              : selected.filter((x) => x !== row.importRowUuid)
                          )
                        }
                      />
                    </TableCell>
                    {shown.map((key) => bodyCell(row, key, ground))}
                    <TableCell
                      className={cn(
                        "sticky right-0 z-[1] h-[45px] border-l border-neutral-gray px-3 py-0 align-middle",
                        ground
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        // Grey until hovered: a column of red bins down every
                        // row shouts louder than the data it sits beside.
                        className="text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground"
                        disabled={created}
                        aria-label={`Delete row ${name}`}
                        title="Delete row"
                        onClick={() => setDeleteIds([row.importRowUuid])}
                      >
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!pageRows.length && (
            <div className="sticky left-0 px-6 py-16 text-center">
              {rows.length && rows.every((r) => r.rowStatus === "created") ? (
                <>
                  <h2 className="text-lg font-semibold">
                    Every row in this upload has been created
                  </h2>
                  <p className={cn(T.value, "mt-2")}>
                    The invoices are in All Invoices. Show Created rows with the
                    Status filter to look back at them here.
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => onExit("all")}
                  >
                    Go to All Invoices
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">
                    No rows match these filters
                  </h2>
                  <p className={cn(T.value, "mt-2")}>
                    Clear the search or widen the Status filter to see more.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {selected.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-4">
            <BulkActionBar
              className="pointer-events-auto"
              selectedCount={selected.length}
              onDelete={() => setDeleteIds(selected)}
              deleteLabel="Delete selected rows"
              onClearSelection={() => setSelected([])}
            />
          </div>
        )}

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-gray bg-background px-6 py-1.5">
          <div className="flex items-center gap-2">
            <span className={cn(T.cell, "text-foreground")}>
              Rows per page:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(0);
              }}
            >
              <SelectTrigger
                aria-label="Rows per page"
                className={cn(
                  "h-auto w-[72px] rounded-md border-border px-2 py-1",
                  T.cell,
                  "text-foreground"
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-0 sm:gap-1">
            <PageButton
              label="First page"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              <ChevronsLeft />
            </PageButton>
            <PageButton
              label="Previous page"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </PageButton>
            <span className={cn(T.cell, "px-2 tabular-nums text-foreground")}>
              {filtered.length
                ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, filtered.length)} of ${filtered.length}`
                : "0 of 0"}
            </span>
            <PageButton
              label="Next page"
              disabled={page >= lastPage}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </PageButton>
            <PageButton
              label="Last page"
              disabled={page >= lastPage}
              onClick={() => setPage(lastPage)}
            >
              <ChevronsRight />
            </PageButton>
          </div>
        </div>
      </div>

      <PageDialog
        title={selectedMode ? "Create selected invoices" : "Create invoices"}
        open={createOpen}
        onClose={creating ? undefined : () => setCreateOpen(false)}
        className="max-w-[480px]"
      >
        <p className={T.value}>
          {selectedMode
            ? `${eligibleRows} of ${selected.length} selected row${selected.length === 1 ? "" : "s"} will be created.`
            : `${eligibleRows} row${eligibleRows === 1 ? "" : "s"} will be created.`}
          {errorRows
            ? ` ${errorRows} row${errorRows === 1 ? "" : "s"} with errors will stay in preview.`
            : ""}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            disabled={creating}
            onClick={() => setCreateOpen(false)}
          >
            Cancel
          </Button>
          <Button
            loading={creating}
            disabled={!eligibleRows}
            onClick={() => void confirmCreate()}
          >
            {selectedMode ? "Create Selected Invoices" : "Create Invoices"}
          </Button>
        </div>
      </PageDialog>

      <PageDialog
        title="Delete preview rows"
        open={!!deleteIds}
        onClose={() => setDeleteIds(null)}
        className="max-w-[480px]"
      >
        <p className={T.value}>
          This will remove {deleteIds?.length ?? 0} selected preview row
          {deleteIds?.length === 1 ? "" : "s"} from this upload batch.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteIds(null)}>
            Cancel
          </Button>
          <Button isDestructive onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </PageDialog>
    </div>
  );
};

export default PreviewPage;
