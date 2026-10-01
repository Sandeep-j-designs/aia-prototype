import React, { useMemo, useState } from "react";
import { Eye, MoreHorizontal, Undo2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip } from "@/components/common/tooltip";
import { cn } from "@/lib/utils";
import { useColumnResize } from "@/hooks/pages/inbox/use-column-resize";
import { isCashLedger } from "@/hooks/pages/inbox/use-banking";
import type { BankLedgerData } from "@/types/pages/inbox/banking";
import { ColumnFilter, QuickFilter } from "@/components/inbox/v2/filter-panel";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
} from "@/components/inbox/v2/table-sizing";
import { T } from "@/components/inbox/v2/ui";
import { BANK_LIST_SIZES } from "./table-sizing";
import {
  CellBox,
  ColumnsButton,
  EmptyBlock,
  HEADER_CLASS,
  HeaderCell,
  Pager,
  SearchBox,
  TABLE_CLASS,
  nextSort,
  sortRows,
  type SortState,
} from "./table-parts";

/**
 * Banking's landing screen: every bank, card and cash ledger in Tally, and
 * how many of each one's transactions still need review.
 *
 * Production: components/bank/index.tsx and components/bank/table/*. The
 * Account Aggregator pieces (Connect Bank, fetch balance, data-fetch
 * activity) are left out of this prototype.
 */

type ColumnKey =
  "ledgerName" | "accountType" | "bankName" | "unreconciledCount";
const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: "ledgerName", label: "Bank Ledger" },
  { key: "accountType", label: "Account Type" },
  { key: "bankName", label: "Bank" },
  { key: "unreconciledCount", label: "Unreconciled" },
];
const SHOWN = ["srNo", ...COLUMNS.map((c) => c.key)];

const NOT_MAPPED = "Not mapped";
/** production's getAccountTypeDisplay */
const TYPE_LABEL: Record<string, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
};
const typeOf = (ledger: BankLedgerData) =>
  TYPE_LABEL[ledger.accountType] ?? NOT_MAPPED;
const bankOf = (ledger: BankLedgerData) => ledger.bankName || NOT_MAPPED;

const SORT_VALUE: Partial<
  Record<ColumnKey, (ledger: BankLedgerData) => string | number>
> = {
  ledgerName: (l) => l.ledgerName,
  accountType: (l) => (isCashLedger(l) ? "" : typeOf(l)),
  bankName: (l) => (isCashLedger(l) ? "" : bankOf(l)),
  unreconciledCount: (l) => l.unreconciledCount,
};

type Props = {
  ledgers: BankLedgerData[];
  onOpen: (ledger: BankLedgerData) => void;
  onUpload: (ledger?: BankLedgerData) => void;
  onLogs: (ledger?: BankLedgerData) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
  onUnbuilt: (what: string) => void;
};

const BankList = ({
  ledgers,
  onOpen,
  onUpload,
  onLogs,
  notify,
  onUnbuilt,
}: Props) => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<SortState<ColumnKey>>(null);
  const [names, setNames] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);

  const options = (values: string[]) =>
    [...new Set(values)].sort().map((value) => ({ value, label: value }));
  const nameOptions = useMemo(
    () => options(ledgers.map((l) => l.ledgerName)),
    [ledgers]
  );
  const typeOptions = useMemo(
    () => options(ledgers.filter((l) => !isCashLedger(l)).map(typeOf)),
    [ledgers]
  );
  const bankOptions = useMemo(
    () => options(ledgers.filter((l) => !isCashLedger(l)).map(bankOf)),
    [ledgers]
  );

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = ledgers.filter(
      (l) =>
        (!term || l.ledgerName.toLowerCase().includes(term)) &&
        (!names.length || names.includes(l.ledgerName)) &&
        (!types.length || (!isCashLedger(l) && types.includes(typeOf(l)))) &&
        (!banks.length || (!isCashLedger(l) && banks.includes(bankOf(l))))
    );
    return sortRows(filtered, sort, SORT_VALUE);
  }, [ledgers, search, names, types, banks, sort]);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  const resize = useColumnResize({
    shown: SHOWN,
    sizes: BANK_LIST_SIZES,
    storageKey: "banking.list.widths.v1",
  });

  const anyFilter = !!(search || names.length || types.length || banks.length);
  const reset = () => {
    setSearch("");
    setNames([]);
    setTypes([]);
    setBanks([]);
    setPage(0);
  };
  const filterFor = (key: ColumnKey) => {
    const set = (fn: (next: string[]) => void) => (next: string[]) => {
      fn(next);
      setPage(0);
    };
    if (key === "ledgerName")
      return (
        <ColumnFilter
          label="Bank Ledger"
          options={nameOptions}
          selected={names}
          onChange={set(setNames)}
        />
      );
    if (key === "accountType")
      return (
        <ColumnFilter
          label="Account Type"
          options={typeOptions}
          selected={types}
          onChange={set(setTypes)}
        />
      );
    if (key === "bankName")
      return (
        <ColumnFilter
          label="Bank"
          options={bankOptions}
          selected={banks}
          onChange={set(setBanks)}
        />
      );
    return undefined;
  };
  const activeFor = (key: ColumnKey) =>
    key === "ledgerName"
      ? !!names.length
      : key === "accountType"
        ? !!types.length
        : key === "bankName"
          ? !!banks.length
          : false;

  const cell = (key: ColumnKey, ledger: BankLedgerData) => {
    const cash = isCashLedger(ledger);
    const dash = <span className="text-secondary-foreground">-</span>;
    switch (key) {
      case "ledgerName":
        return (
          <>
            <span className="truncate" title={ledger.ledgerName}>
              {ledger.ledgerName}
            </span>
            {ledger.accountParent ? (
              <span
                className="truncate text-caption-1 text-secondary-foreground"
                title={ledger.accountParent}
              >
                {ledger.accountParent}
              </span>
            ) : null}
          </>
        );
      case "accountType":
        if (cash) return dash;
        return (
          <span
            className={cn(
              "truncate",
              !ledger.accountType && "text-destructive-foreground"
            )}
          >
            {typeOf(ledger)}
          </span>
        );
      case "bankName":
        if (cash) return dash;
        return (
          <span
            className={cn(
              "truncate",
              !ledger.bankName && "text-destructive-foreground"
            )}
            title={ledger.bankName ?? undefined}
          >
            {bankOf(ledger)}
          </span>
        );
      case "unreconciledCount": {
        const count = ledger.unreconciledCount;
        return count > 0 ? (
          <span className="truncate text-destructive-foreground">
            {count} {count === 1 ? "Transaction" : "Transactions"}
          </span>
        ) : (
          dash
        );
      }
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 px-6 pb-3 pt-5">
        <h1 className={cn(T.title, "mr-auto text-2xl")}>Banking</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onLogs()}>
              <Eye className="mr-2 h-4 w-4" />
              Statement Logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={() => onUpload()}>
          <Upload className="h-4 w-4" />
          Upload Statement
        </Button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-3">
        <SearchBox
          label="Search ledgers"
          placeholder="Search ledgers..."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(0);
          }}
        />
        <span className="h-6 w-px flex-none bg-neutral-gray" />
        <QuickFilter
          label="Account Type"
          options={typeOptions}
          selected={types}
          onChange={(next) => {
            setTypes(next);
            setPage(0);
          }}
        />
        <QuickFilter
          label="Bank"
          options={bankOptions}
          selected={banks}
          onChange={(next) => {
            setBanks(next);
            setPage(0);
          }}
        />
        <span className="flex-1" />
        {anyFilter && (
          <Button variant="ghost" onClick={reset}>
            <Undo2 className="h-3 w-3" />
            Reset Filters
          </Button>
        )}
        <ColumnsButton onClick={() => onUnbuilt("Choosing columns")} />
      </div>

      <div
        ref={resize.gridRef}
        className="min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <Table style={{ width: resize.tableWidth }} className={TABLE_CLASS}>
          <TableHeader className={HEADER_CLASS}>
            <TableRow>
              <HeaderCell
                columnKey="srNo"
                label="Sr No"
                sizes={BANK_LIST_SIZES}
                resize={resize}
                extraWidth={SELECT_WIDTH}
                resizable={false}
              />
              {COLUMNS.map(({ key, label }) => (
                <HeaderCell
                  key={key}
                  columnKey={key}
                  label={label}
                  sizes={BANK_LIST_SIZES}
                  resize={resize}
                  sort={sort?.key === key ? sort.dir : "none"}
                  onSort={() => {
                    setSort((current) => nextSort(current, key));
                    setPage(0);
                  }}
                  filter={filterFor(key)}
                  filterActive={activeFor(key)}
                />
              ))}
              <TableHead
                style={{ width: ACTIONS_WIDTH }}
                className="sticky right-0 z-10 h-10 border-l border-neutral-gray bg-accent px-3 py-0 align-middle"
              >
                <span className={cn(T.head, "flex h-4 items-center truncate")}>
                  Action
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((ledger, index) => {
              const cash = isCashLedger(ledger);
              return (
                <TableRow
                  key={ledger.id}
                  onClick={() => !cash && onOpen(ledger)}
                  className={cn(
                    "hover:bg-transparent",
                    cash ? "cursor-default" : "cursor-pointer"
                  )}
                >
                  <TableCell
                    className={cn(
                      "h-[45px] px-3 py-0 align-middle tabular-nums",
                      T.cell,
                      "text-secondary-foreground"
                    )}
                  >
                    {page * pageSize + index + 1}
                  </TableCell>
                  {COLUMNS.map(({ key }) => (
                    <TableCell
                      key={key}
                      className={cn(
                        "h-[45px] overflow-hidden px-3 py-0 align-middle",
                        T.cell
                      )}
                    >
                      <CellBox>{cell(key, ledger)}</CellBox>
                    </TableCell>
                  ))}
                  <TableCell
                    onClick={(e) => e.stopPropagation()}
                    className="sticky right-0 z-[1] h-[45px] border-l border-neutral-gray bg-background px-2 py-0 align-middle"
                  >
                    <div className="flex items-center gap-1">
                      <Tooltip message="Upload Statement">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Upload statement for ${ledger.ledgerName}`}
                          className={cn(
                            "w-7",
                            cash && "text-secondary-foreground"
                          )}
                          onClick={() =>
                            cash
                              ? notify(
                                  "Statement upload works only for bank ledgers. Cash ledgers do not have statements.",
                                  "info"
                                )
                              : onUpload(ledger)
                          }
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`More actions for ${ledger.ledgerName}`}
                            className="w-7 text-secondary-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuItem onSelect={() => onLogs(ledger)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Logs
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!pageRows.length && (
          <EmptyBlock
            title={
              anyFilter
                ? "No ledgers match your filters."
                : "No bank or cash ledgers found."
            }
          />
        )}
      </div>

      <Pager
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default BankList;
