import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Columns3,
  Plus,
  Keyboard,
  ListFilter,
  MoreVertical,
  Paperclip,
  Pencil,
  Scissors,
  Slash,
  Undo2,
  Upload,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DateFilter, { FY_PRESETS } from "@/components/common/date-filter";
import DateRangePanel from "@/components/common/date-filter/panel";
import { cn } from "@/lib/utils";
import {
  gridCellId,
  useGridKeyboard,
} from "@/hooks/pages/inbox/use-grid-keyboard";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import type { InboxPaymentStatus } from "@/types/pages/inbox";
import {
  ColumnFilter,
  FilterPanel,
  QuickFilter,
  type FilterOption,
} from "./filter-panel";
import { ACTIONS_WIDTH, BILL_COLUMN_SIZES, SELECT_WIDTH } from "./table-sizing";
import { AmountText, CountPill, PageButton, T } from "./ui";
import { tabRows, type RegisterFilters } from "./register";
import { actor, createSplitBills, type Item } from "./store";
import {
  splitPackets,
  useSplitPackets,
} from "@/hooks/pages/inbox/use-split-packets";
import { billsOf, outputFiles } from "@/utils/pages/inbox/bill-splitter";
import type { SplitPacket, SplitPlan } from "@/types/pages/inbox/bill-splitter";
import BillUploadsTable from "./bill-splitter/bill-uploads-table";
import SplitUploadDialog from "./bill-splitter/split-upload-dialog";
import SplitReviewDialog from "./bill-splitter/split-review-dialog";

/**
 * The Purchases register — posted bills.
 *
 * Columns and header actions from Figma 24239:28355. The grid itself is the
 * Inbox's, on purpose: the same header (sort, filter, resize handle), the same
 * sticky checkbox and Actions bookends, the same keyboard cursor, the same
 * multi-select filters and the same pager, so moving between the Inbox and
 * Purchases does not mean learning a second table.
 *
 * Sales and Journal Vouchers are still ./register, on their older frames.
 */

type DateRange = { from?: Date; to?: Date };

const PAYMENT: Record<
  InboxPaymentStatus,
  { label: string; color: "negative" | "notice" | "positive" }
> = {
  unpaid: { label: "Unpaid", color: "negative" },
  partiallyPaid: { label: "Partially Paid", color: "notice" },
  paid: { label: "Paid", color: "positive" },
};
const PAYMENT_OPTIONS: FilterOption[] = (
  Object.keys(PAYMENT) as InboxPaymentStatus[]
).map((value) => ({ value, label: PAYMENT[value].label }));

const paymentOf = (item: Item): InboxPaymentStatus =>
  item.original.paymentStatus ?? "unpaid";
const attachmentsOf = (item: Item) => item.original.attachmentCount ?? 1;

const day = (value?: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const iso = (date?: Date) => (date ? format(date, "yyyy-MM-dd") : "");
const inRange = (value: string, range: DateRange) =>
  (!range.from || value >= iso(range.from)) &&
  (!range.to || value <= iso(range.to));

const TABS = [
  { id: "all", label: "All Bills" },
  { id: "review", label: "Needs Review" },
  { id: "uploads", label: "Bill Uploads" },
];

type ColumnKey =
  | "voucherNo"
  | "invoiceNo"
  | "party"
  | "date"
  | "due"
  | "amount"
  | "payment"
  | "attachments";

const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "voucherNo", label: "Voucher No." },
  { key: "invoiceNo", label: "Supplier Inv No." },
  { key: "party", label: "Vendor" },
  { key: "date", label: "Bill Date" },
  { key: "due", label: "Due Date" },
  { key: "amount", label: "Total Amount" },
  { key: "payment", label: "Payment Status" },
  { key: "attachments", label: "Attachments" },
];
const SHOWN = COLUMNS.map((c) => c.key);

const SORT_VALUE: Partial<Record<ColumnKey, (item: Item) => string | number>> =
  {
    voucherNo: (item) => item.form.voucherNo,
    invoiceNo: (item) => item.form.invoiceNo,
    date: (item) => item.form.date,
    due: (item) => item.form.due,
    amount: (item) => item.amount,
    attachments: attachmentsOf,
  };
const FILTERABLE = new Set<ColumnKey>([
  "party",
  "date",
  "due",
  "amount",
  "payment",
]);

type SortDir = "asc" | "desc";

/** A value with the affordance the frame draws at the cell's right edge. */
const Trailing = ({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <span className="flex min-w-0 items-center justify-between gap-2">
    <span className="truncate">{children}</span>
    <Icon
      className="h-3.5 w-3.5 flex-none text-secondary-foreground"
      aria-hidden
    />
  </span>
);

const AmountFields = ({
  min,
  max,
  onChange,
}: {
  min: string;
  max: string;
  onChange: (key: "min" | "max", value: string) => void;
}) => (
  <div className="flex flex-col gap-4">
    {(
      [
        ["min", "Minimum amount", min],
        ["max", "Maximum amount", max],
      ] as const
    ).map(([key, label, value]) => (
      <label key={key} className="block">
        <span className={cn(T.label, "mb-1 block")}>{label}</span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(key, e.target.value)}
        />
      </label>
    ))}
  </div>
);

type Props = {
  /** Every item for the company, already scoped to Purchases. */
  items: Item[];
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  onOpen: (item: Item) => void;
  onDelete: (item: Item) => void;
  /** Says a thing is real in the app but not here. */
  onUnbuilt: (what: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /**
   * Bill date and amount ride on the workspace's filter state, as they do for
   * the other registers. Vendor, due date and payment are this table's own:
   * vendor is multi-select here, as every Inbox list filter is, and the other
   * two exist on no other screen.
   */
  filters: RegisterFilters;
  onFilterChange: (key: keyof RegisterFilters, value: string) => void;
  /** Clears the workspace-held filters; this table clears its own. */
  onResetFilters: () => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  pageSizes: number[];
  onUpload: () => void;
  /** Create Bill: a blank Purchase voucher, entered by hand. */
  onCreate: () => void;
  onOpenShortcuts: () => void;
  /** The workspace's search ref, so its "/" shortcut lands here. */
  searchRef: React.Ref<HTMLInputElement>;
  /** Scopes the split packets, as every upload is scoped. */
  company: string;
};

const BillRegister = ({
  items,
  selected,
  onSelectedChange,
  onOpen,
  onDelete,
  onUnbuilt,
  search,
  onSearchChange,
  filters,
  onFilterChange,
  onResetFilters,
  pageSize,
  onPageSizeChange,
  pageSizes,
  onUpload,
  onCreate,
  onOpenShortcuts,
  searchRef,
  company,
}: Props) => {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: ColumnKey; dir: SortDir } | null>(
    null
  );
  const [vendors, setVendors] = useState<string[]>([]);
  const [payments, setPayments] = useState<string[]>([]);
  const [due, setDue] = useState<DateRange>({});
  const [splitUploadOpen, setSplitUploadOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const packets = useSplitPackets(company);
  const uploadsTab = tab === "uploads";
  /** Opening the review clears the toasts — one sits over its footer. */
  const openReview = (id: string) => {
    toast.dismiss();
    setReviewId(id);
  };
  const reviewPacket =
    packets.find((p) => p.id === reviewId && p.status === "splitReady") ?? null;

  /*
    Split ready is worth saying wherever you are on the screen: detection
    takes long enough that you will have looked away. Once per packet.
  */
  const announced = useRef(new Set<string>());
  useEffect(() => {
    packets.forEach((packet) => {
      if (packet.status !== "splitReady" || !packet.plan) return;
      if (announced.current.has(packet.id)) return;
      announced.current.add(packet.id);
      const count = billsOf(packet.plan).length;
      toast.success(`${packet.fileName} is ready to review`, {
        description: `${count} bills found across ${packet.pageCount} pages.`,
        action: {
          label: "Review split",
          onClick: () => openReview(packet.id),
        },
      });
    });
    // Anything already past this point when the screen opened is not news.
  }, [packets]);
  useEffect(() => {
    packets
      .filter((p) => p.status !== "inProgress")
      .forEach((p) => announced.current.add(p.id));
  }, []);

  /** Create N bills: one upload per bill, or per part of a long bill. */
  const createBills = (packet: SplitPacket, plan: SplitPlan) => {
    const groups = billsOf(plan);
    // Bill Upload's names — vendor code and invoice number, or the name the
    // accountant typed — with "(part 1 of 2)" on a bill over the page limit.
    const files = outputFiles(plan);
    createSplitBills(company, files);
    splitPackets.complete(packet.id, groups.length);
    setReviewId(null);
    const bills = `${groups.length} ${groups.length === 1 ? "bill" : "bills"}`;
    toast.success(
      files.length > groups.length
        ? `${bills} created from ${packet.fileName}, in ${files.length} files`
        : `${bills} created from ${packet.fileName}`,
      {
        description: "Each one is being read and will appear in Needs Review.",
      }
    );
  };

  const term = search.trim().toLowerCase();
  const shownPackets = packets.filter(
    (p) => !term || p.fileName.toLowerCase().includes(term)
  );
  const shownUploads = tabRows("uploads", items).filter(
    (x) => !term || x.file.name.toLowerCase().includes(term)
  );

  const billDate: DateRange = {
    from: filters.from ? parseISO(filters.from) : undefined,
    to: filters.to ? parseISO(filters.to) : undefined,
  };

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tabRows(tab, items).filter(
      (x) =>
        (!term ||
          [x.form.voucherNo, x.form.party, x.form.invoiceNo, x.file.name].some(
            (value) => (value || "").toLowerCase().includes(term)
          )) &&
        (!vendors.length || vendors.includes(x.form.party)) &&
        (!payments.length || payments.includes(paymentOf(x))) &&
        (!filters.from || x.form.date >= filters.from) &&
        (!filters.to || x.form.date <= filters.to) &&
        inRange(x.form.due, due) &&
        (!filters.min || x.amount >= Number(filters.min)) &&
        (!filters.max || x.amount <= Number(filters.max))
    );
    const value = sort && SORT_VALUE[sort.key];
    if (!sort || !value) return filtered;
    const sign = sort.dir === "asc" ? 1 : -1;
    return filtered.slice().sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (
        sign *
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "en-IN", { numeric: true }))
      );
    });
  }, [items, search, tab, vendors, payments, due, filters, sort]);

  const vendorOptions: FilterOption[] = useMemo(
    () =>
      [...new Set(items.map((x) => x.form.party).filter(Boolean))]
        .sort()
        .map((name) => ({ value: name, label: name })),
    [items]
  );

  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);

  const resize = useColumnResize({
    shown: SHOWN,
    sizes: BILL_COLUMN_SIZES,
    storageKey: "purchases.widths.v1",
  });

  const toggleSort = (key: ColumnKey) => {
    if (!SORT_VALUE[key]) return;
    // Descending first, as the Inbox does: the newest or largest bill is the
    // one a clerk is usually after.
    setSort((current) =>
      current?.key !== key
        ? { key, dir: "desc" }
        : current.dir === "desc"
          ? { key, dir: "asc" }
          : null
    );
    setPage(0);
  };

  const grid = useGridKeyboard({
    gridRef: resize.gridElement as React.RefObject<HTMLElement>,
    rowCount: pageRows.length,
    colCount: SHOWN.length,
    // The workspace's own instance of this hook already answers "/" and "?"
    // on every screen, this one included — answering them twice would toggle
    // the shortcuts drawer open and shut again.
    onOpenShortcuts: () => {},
    onFocusSearch: () => {},
    onActivateRow: (row) => {
      const item = pageRows[row];
      if (item) onOpen(item);
    },
    onSortColumn: (col) => toggleSort(SHOWN[col]),
    onFilterColumn: (col) =>
      document
        .getElementById(gridCellId(-1, col))
        ?.querySelector<HTMLElement>("[data-filter-trigger]")
        ?.click(),
  });

  const changePage = (next: number) => {
    setPage(next);
    onSelectedChange([]);
  };

  const anyFilter =
    !!vendors.length ||
    !!payments.length ||
    !!due.from ||
    !!due.to ||
    !!filters.from ||
    !!filters.to ||
    !!filters.min ||
    !!filters.max;
  const panelCount =
    vendors.length +
    payments.length +
    (filters.min ? 1 : 0) +
    (filters.max ? 1 : 0);

  const setAmount = (key: "min" | "max", value: string) => {
    onFilterChange(key, value);
    setPage(0);
  };
  const setBillDate = ({ from, to }: DateRange) => {
    onFilterChange("from", iso(from));
    onFilterChange("to", iso(to));
    setPage(0);
  };

  /** What a column's header funnel opens. */
  const columnFilter = (key: ColumnKey) => {
    switch (key) {
      case "party":
        return (
          <ColumnFilter
            label="Vendor"
            options={vendorOptions}
            selected={vendors}
            onChange={(next) => {
              setVendors(next);
              setPage(0);
            }}
          />
        );
      case "payment":
        return (
          <ColumnFilter
            label="Payment Status"
            options={PAYMENT_OPTIONS}
            selected={payments}
            onChange={(next) => {
              setPayments(next);
              setPage(0);
            }}
          />
        );
      case "date":
      case "due":
        return (
          <DateRangePanel
            value={key === "date" ? billDate : due}
            onApply={(next) => {
              if (key === "date") setBillDate(next);
              else {
                setDue(next);
                setPage(0);
              }
            }}
            presets={FY_PRESETS}
            presetsLabel="Date range"
            today={new Date()}
          />
        );
      case "amount":
        return (
          <div className="w-64 p-3">
            <AmountFields
              min={filters.min}
              max={filters.max}
              onChange={setAmount}
            />
          </div>
        );
      default:
        return null;
    }
  };
  const filterActive = (key: ColumnKey) =>
    key === "party"
      ? !!vendors.length
      : key === "payment"
        ? !!payments.length
        : key === "date"
          ? !!filters.from || !!filters.to
          : key === "due"
            ? !!due.from || !!due.to
            : key === "amount"
              ? !!filters.min || !!filters.max
              : false;

  const cell = (key: ColumnKey, item: Item) => {
    switch (key) {
      case "voucherNo":
        return <Trailing icon={Pencil}>{item.form.voucherNo || "—"}</Trailing>;
      case "invoiceNo":
        return <Trailing icon={Pencil}>{item.form.invoiceNo || "—"}</Trailing>;
      case "party":
        return <Trailing icon={ChevronDown}>{item.form.party || "—"}</Trailing>;
      case "date":
        return <Trailing icon={CalendarDays}>{day(item.form.date)}</Trailing>;
      case "due":
        return <Trailing icon={CalendarDays}>{day(item.form.due)}</Trailing>;
      case "amount":
        return (
          <span className="block truncate text-right tabular-nums">
            <AmountText value={item.amount} />
          </span>
        );
      case "payment": {
        const state = PAYMENT[paymentOf(item)];
        return <Badge color={state.color}>{state.label}</Badge>;
      }
      case "attachments":
        return (
          <span className="inline-flex items-center gap-1 text-secondary-foreground">
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            <span className="tabular-nums">{attachmentsOf(item)}</span>
          </span>
        );
    }
  };

  const allOnPage =
    !!pageRows.length && pageRows.every((x) => selected.includes(x.id));

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        <h1 className={cn(T.title, "mr-auto text-2xl")}>Purchases</h1>
        {/* Entering a bill by hand, beside the upload rather than behind it —
            the same pairing the Sales and Journal registers use. */}
        <Button variant="secondary" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Create Purchase Voucher
        </Button>
        {/*
          A split button: the everyday upload on the face, the multi-bill
          splitter behind the chevron. A 1px gap stands in for the divider
          the frame draws between the halves.
        */}
        <div className="flex gap-px">
          <Button className="rounded-r-none" onClick={onUpload}>
            <Upload className="h-4 w-4" />
            Upload Purchases
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                className="rounded-l-none"
                aria-label="More ways to add purchases"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* The multi-bill path's only entry (PRD). The main button
                  stays the single-bill upload and never enters the
                  splitter. */}
              <DropdownMenuItem
                onSelect={() => setSplitUploadOpen(true)}
                className="items-start gap-2"
              >
                <Scissors className="mt-0.5 h-4 w-4 flex-none" />
                <span className="flex flex-col">
                  Split Purchases
                  <span className={T.sub}>
                    One PDF with several purchases — we’ll split it for you
                    to check.
                  </span>
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(next) => {
          setTab(next);
          setPage(0);
          onSelectedChange([]);
        }}
        className="mx-6 shrink-0 overflow-x-auto border-b border-neutral-gray"
      >
        <TabsList className="h-auto gap-2 rounded-none bg-transparent p-0">
          {TABS.map((entry) => (
            <TabsTrigger
              key={entry.id}
              value={entry.id}
              className="gap-2 rounded-none border-b-2 border-transparent px-2.5 py-3 text-sm text-secondary-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {entry.label}
              <CountPill>
                {tabRows(entry.id, items).length +
                  (entry.id === "uploads" ? packets.length : 0)}
              </CountPill>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-3">
        <div className="relative w-full sm:w-[198px]">
          <Input
            ref={searchRef}
            aria-label="Search purchases"
            placeholder="Search..."
            value={search}
            onChange={(e) => {
              onSearchChange(e.target.value);
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
        {/* Uploads are files, not bills: the bill filters have nothing
            to act on there. Search still finds a file by name. */}
        {!uploadsTab && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={
                    panelCount ? `Filters, ${panelCount} applied` : "Filters"
                  }
                  title="Filters"
                  className="relative shrink-0"
                >
                  <ListFilter className="h-4 w-4" />
                  {panelCount ? (
                    <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-caption-1 font-semibold tabular-nums text-primary-foreground">
                      {panelCount}
                    </span>
                  ) : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto overflow-hidden p-0"
              >
                <FilterPanel
                  categories={[
                    {
                      id: "Vendor",
                      label: "Vendor",
                      options: vendorOptions,
                      selected: vendors,
                      onChange: (next) => {
                        setVendors(next);
                        setPage(0);
                      },
                      activeCount: vendors.length,
                    },
                    {
                      id: "Payment Status",
                      label: "Payment Status",
                      options: PAYMENT_OPTIONS,
                      selected: payments,
                      onChange: (next) => {
                        setPayments(next);
                        setPage(0);
                      },
                      activeCount: payments.length,
                    },
                    {
                      id: "Total Amount",
                      label: "Total Amount",
                      activeCount:
                        (filters.min ? 1 : 0) + (filters.max ? 1 : 0),
                      custom: (
                        <AmountFields
                          min={filters.min}
                          max={filters.max}
                          onChange={setAmount}
                        />
                      ),
                    },
                  ]}
                />
              </PopoverContent>
            </Popover>
            <span className="h-6 w-px flex-none bg-neutral-gray" />
            <QuickFilter
              label="Payment Status"
              options={PAYMENT_OPTIONS}
              selected={payments}
              onChange={(next) => {
                setPayments(next);
                setPage(0);
              }}
            />
            <DateFilter
              label="Bill Date"
              value={billDate}
              onChange={setBillDate}
            />
            <DateFilter
              label="Due Date"
              value={due}
              onChange={(next) => {
                setDue(next);
                setPage(0);
              }}
            />
          </>
        )}
        <span className="flex-1" />
        {/* Reset, Columns and the shortcuts chip end the bar, as in the
            Inbox; Reset only once there is something to undo. */}
        {(anyFilter || search) && (
          <Button
            variant="ghost"
            onClick={() => {
              onResetFilters();
              onSearchChange("");
              setVendors([]);
              setPayments([]);
              setDue({});
              changePage(0);
            }}
          >
            <Undo2 className="h-3 w-3" />
            Reset Filters
          </Button>
        )}
        {!uploadsTab && (
          <button
            type="button"
            aria-label="Customize columns"
            onClick={() => onUnbuilt("Choosing columns")}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1 text-label-3 font-medium text-foreground transition-[border-color,background-color] duration-150 ease-in-out hover:border-[hsl(var(--palette-neutral-300-hsl))] hover:bg-neutral-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Columns3 className="size-3.5" aria-hidden />
            Columns
          </button>
        )}
        <button
          type="button"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts"
          onClick={onOpenShortcuts}
          className="inline-flex size-[26px] items-center justify-center rounded-lg border border-border bg-background text-foreground transition-[border-color,background-color] duration-150 ease-in-out hover:border-[hsl(var(--palette-neutral-300-hsl))] hover:bg-neutral-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Keyboard className="size-3.5" aria-hidden />
        </button>
      </div>

      {uploadsTab ? (
        <BillUploadsTable
          packets={shownPackets}
          uploads={shownUploads}
          onOpenUpload={onOpen}
          onRemoveUpload={onDelete}
          onReview={(packet) => openReview(packet.id)}
          onRetry={(packet) => splitPackets.retry(packet.id)}
          onRemove={(packet) => splitPackets.remove(packet.id)}
        />
      ) : (
        <>
          {/*
        The Inbox's grid: one tab stop, a cursor moved by the arrow keys,
        table-fixed so a dragged width holds, sticky header and bookends.
      */}
          <div
            ref={resize.gridRef}
            role="grid"
            aria-label="Purchase bills"
            aria-rowcount={pageRows.length + 1}
            aria-colcount={SHOWN.length}
            tabIndex={0}
            aria-activedescendant={grid.activeDescendant}
            onKeyDown={grid.onGridKeyDown}
            className="min-h-0 min-w-0 flex-1 overflow-auto focus-visible:outline-none"
          >
            <Table
              role="none"
              style={{ width: resize.tableWidth }}
              className="table-fixed border-separate border-spacing-0 [&_td]:border-b [&_td]:border-r [&_td]:border-neutral-gray [&_td:last-child]:border-r-0 [&_th]:border-r [&_th]:border-neutral-gray [&_th:last-child]:border-r-0"
            >
              <TableHeader
                role="rowgroup"
                className="sticky top-0 z-10 bg-accent [&_tr]:shadow-none [&_th]:border-b [&_th]:border-t [&_th]:border-neutral-gray"
              >
                <TableRow role="row" aria-rowindex={1}>
                  <TableHead
                    role="columnheader"
                    style={{ width: SELECT_WIDTH }}
                    className="sticky left-0 z-10 h-10 bg-accent px-3 py-0 align-middle"
                  >
                    <Checkbox
                      aria-label="Select every bill on this page"
                      checked={allOnPage}
                      onCheckedChange={(checked) =>
                        onSelectedChange(
                          checked ? pageRows.map((x) => x.id) : []
                        )
                      }
                    />
                  </TableHead>
                  {COLUMNS.map(({ key, label }, col) => {
                    const sortable = !!SORT_VALUE[key];
                    const width = resize.colWidth(key);
                    const size = BILL_COLUMN_SIZES[key];
                    return (
                      <TableHead
                        key={key}
                        role="columnheader"
                        id={gridCellId(-1, col)}
                        aria-colindex={col + 1}
                        aria-sort={
                          !sortable
                            ? undefined
                            : sort?.key !== key
                              ? "none"
                              : sort.dir === "asc"
                                ? "ascending"
                                : "descending"
                        }
                        style={{ width }}
                        data-grid-row={-1}
                        data-grid-col={col}
                        className={cn(
                          "relative h-10 whitespace-nowrap px-3 py-0 align-middle",
                          T.head,
                          grid.isCursor(-1, col) &&
                            "ring-2 ring-inset ring-primary"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-4 min-w-0 items-center gap-1",
                            key === "amount" && "justify-end"
                          )}
                        >
                          <span className="truncate" title={label}>
                            {label}
                          </span>
                          {sortable && (
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
                                  data-filter-trigger={key}
                                  aria-label={`Filter ${label}`}
                                  className={cn(
                                    "grid h-5 w-5 flex-none place-items-center rounded-md hover:bg-muted",
                                    filterActive(key)
                                      ? "text-primary"
                                      : "text-secondary-foreground"
                                  )}
                                >
                                  <ListFilter className="h-3 w-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                align="start"
                                className="w-auto overflow-hidden p-0"
                              >
                                {columnFilter(key)}
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        {/* Over the cell's right border. Double-click or Enter puts
                        the column back to its default width. */}
                        <span
                          role="separator"
                          aria-orientation="vertical"
                          aria-label={`Resize ${label}`}
                          tabIndex={0}
                          aria-valuemin={size.min}
                          aria-valuemax={size.max}
                          aria-valuenow={width}
                          aria-valuetext={`${width} pixels`}
                          title={`${width} px · Drag or use arrow keys to resize. Double-click or Enter to reset.`}
                          onPointerDown={(e) => resize.startResize(key, e)}
                          onDoubleClick={() => {
                            if (resize.isManual)
                              resize.resizeColumn(key, size.preferred);
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
                              // The grid would read these as cursor moves.
                              e.stopPropagation();
                              resize.resizeColumn(key, next);
                            }
                          }}
                          className="group absolute -right-[5px] top-0 z-20 flex h-full w-[10px] cursor-col-resize touch-none items-stretch justify-center focus-visible:outline-none"
                        >
                          <span
                            className={cn(
                              "w-[2px] transition-colors group-hover:bg-primary group-focus-visible:bg-primary",
                              resize.resizing === key
                                ? "bg-primary"
                                : "bg-transparent"
                            )}
                          />
                        </span>
                      </TableHead>
                    );
                  })}
                  {/* Pinned right, so the kebab never scrolls out of reach. */}
                  <TableHead
                    role="columnheader"
                    style={{ width: ACTIONS_WIDTH }}
                    className="sticky right-0 z-10 h-10 border-l border-neutral-gray bg-accent px-3 py-0 align-middle"
                  >
                    <span
                      className={cn(T.head, "flex h-4 items-center truncate")}
                    >
                      Actions
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody role="rowgroup">
                {pageRows.map((item, row) => {
                  const ticked = selected.includes(item.id);
                  // Sticky cells paint their own ground, or the columns
                  // scrolling under them show through.
                  const ground = ticked ? "bg-accent" : "bg-background";
                  return (
                    <TableRow
                      key={item.id}
                      role="row"
                      aria-rowindex={row + 2}
                      aria-selected={ticked}
                      onClick={() => onOpen(item)}
                      className={cn(
                        "cursor-pointer hover:bg-transparent",
                        ticked && "bg-accent hover:bg-accent"
                      )}
                    >
                      <TableCell
                        role="gridcell"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "sticky left-0 z-[1] h-[45px] px-3 py-0 align-middle",
                          ground
                        )}
                      >
                        <Checkbox
                          aria-label={`Select ${item.form.voucherNo || item.file.name}`}
                          checked={ticked}
                          onCheckedChange={(checked) =>
                            onSelectedChange(
                              checked
                                ? [...selected, item.id]
                                : selected.filter((id) => id !== item.id)
                            )
                          }
                        />
                      </TableCell>
                      {SHOWN.map((key, col) => (
                        <TableCell
                          key={key}
                          role="gridcell"
                          id={gridCellId(row, col)}
                          aria-colindex={col + 1}
                          aria-selected={grid.isSelected(row, col)}
                          data-grid-row={row}
                          data-grid-col={col}
                          className={cn(
                            "h-[45px] overflow-hidden px-3 py-0 align-middle",
                            T.cell,
                            grid.isSelected(row, col) && "bg-accent",
                            grid.isCursor(row, col) &&
                              "ring-2 ring-inset ring-primary"
                          )}
                        >
                          <div className="flex h-[44px] min-w-0 flex-col justify-center overflow-hidden [&>.inline-flex]:self-start">
                            {cell(key, item)}
                          </div>
                        </TableCell>
                      ))}
                      <TableCell
                        role="gridcell"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "sticky right-0 z-[1] h-[45px] border-l border-neutral-gray px-3 py-0 align-middle",
                          ground
                        )}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${item.form.voucherNo || item.file.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onOpen(item)}>
                              {item.status === "Approved"
                                ? "View voucher"
                                : "Open in Inbox"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => onDelete(item)}>
                              Delete
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
              <div className="sticky left-0 px-6 py-16 text-center">
                <h2 className="text-lg font-semibold">
                  {tab === "all"
                    ? "Nothing posted here yet"
                    : tab === "review"
                      ? "Nothing waiting for review"
                      : "Nothing uploaded yet"}
                </h2>
                <p className={cn(T.value, "mt-2")}>
                  {tab === "all"
                    ? "Approve a bill in the Inbox and the voucher it creates is listed here."
                    : "Documents arrive here as they are received."}
                </p>
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-neutral-gray bg-background px-6 py-1.5">
            <div className="flex items-center gap-2">
              <span className={cn(T.cell, "text-foreground")}>
                Rows per page:
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value));
                  changePage(0);
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
                  {pageSizes.map((n) => (
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
                onClick={() => changePage(0)}
              >
                <ChevronsLeft />
              </PageButton>
              <PageButton
                label="Previous page"
                disabled={page === 0}
                onClick={() => changePage(page - 1)}
              >
                <ChevronLeft />
              </PageButton>
              <span className={cn(T.cell, "px-2 tabular-nums text-foreground")}>
                {rows.length
                  ? `${page * pageSize + 1} - ${Math.min((page + 1) * pageSize, rows.length)} of ${rows.length}`
                  : "0 of 0"}
              </span>
              <PageButton
                label="Next page"
                disabled={page >= lastPage}
                onClick={() => changePage(page + 1)}
              >
                <ChevronRight />
              </PageButton>
              <PageButton
                label="Last page"
                disabled={page >= lastPage}
                onClick={() => changePage(lastPage)}
              >
                <ChevronsRight />
              </PageButton>
            </div>
          </div>
        </>
      )}

      <SplitUploadDialog
        open={splitUploadOpen}
        onOpenChange={setSplitUploadOpen}
        onUploaded={(files) => {
          files.forEach(
            (file) => void splitPackets.addFile(company, actor, file)
          );
          // Packets are read in Bill Uploads, so that is where the dialog
          // hands off to — as Bill Upload's does.
          setTab("uploads");
          setPage(0);
        }}
      />
      <SplitReviewDialog
        packet={reviewPacket}
        onOpenChange={(open) => !open && setReviewId(null)}
        onCreate={createBills}
      />
    </div>
  );
};

export default BillRegister;
