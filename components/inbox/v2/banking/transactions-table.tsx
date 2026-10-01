import React, { useEffect, useState } from "react";
import {
  Check,
  Cloud,
  CloudAlert,
  CloudUpload,
  Sparkles,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  CONTRA_GROUPS,
  gstRegistrationsOf,
  ledgerGroupsOf,
  VOUCHER_TYPE_LABEL,
} from "@/config/pages/inbox/mock-banking";
import type {
  BankTransaction,
  TallyVoucherPaymentType,
} from "@/types/pages/inbox/banking";
import EditableCell from "@/components/inbox/v2/editable-cell";
import {
  ACTIONS_WIDTH,
  SELECT_WIDTH,
} from "@/components/inbox/v2/table-sizing";
import { AmountText, T } from "@/components/inbox/v2/ui";
import { TRANSACTION_SIZES } from "./table-sizing";
import {
  CellBox,
  EmptyBlock,
  HEADER_CLASS,
  HeaderCell,
  TABLE_CLASS,
  day,
  type SortState,
} from "./table-parts";

/**
 * One account's transactions — the Tally columns of production's
 * components/transactions/common/table/columns/index.tsx, drawn in the
 * Purchases register's grid.
 *
 * Needs Review rows edit in place (voucher no., GST registration, type,
 * ledger); Accounting Ready rows are read-only until reverted.
 */

export type TxnColumn =
  | "date"
  | "sync"
  | "gst"
  | "voucherNo"
  | "description"
  | "type"
  | "ledger"
  | "amount";

const LABEL: Record<TxnColumn, string> = {
  date: "Date",
  sync: "",
  gst: "GST Registration",
  voucherNo: "Voucher No.",
  description: "Description",
  type: "Type",
  ledger: "Ledger",
  amount: "Amount",
};

export const TYPE_BY_LABEL: Record<string, TallyVoucherPaymentType> = {
  Payment: "payment",
  Receipt: "receipt",
  Contra: "contra",
};
/** Money out is a Payment, money in a Receipt; either can be a Contra. */
export const typeOptionsFor = (txn: Pick<BankTransaction, "crDr">) =>
  txn.crDr === "debit" ? ["Payment", "Contra"] : ["Receipt", "Contra"];

/**
 * A Contra moves money between bank and cash ledgers; nothing else. The
 * ledgers are the company's own.
 */
export const ledgerGroupsFor = (
  type: TallyVoucherPaymentType | null,
  ownLedger: string,
  company: string
) =>
  ledgerGroupsOf(company)
    .filter((g) => type !== "contra" || CONTRA_GROUPS.includes(g.heading))
    .map((g) => ({
      heading: g.heading,
      options: g.options.filter((o) => o !== ownLedger),
    }))
    .filter((g) => g.options.length);

/** production's getDisplayCrDr: the bank ledger's side in the books. */
export const displayCrDr = (txn: BankTransaction) =>
  txn.crDr === "debit" ? "Credit" : "Debit";

const locked = (txn: BankTransaction) =>
  txn.thirdPartySyncStatus === "synced" ||
  txn.thirdPartySyncStatus === "in_progress";

/** production's SyncStatus tooltip: the state, then when or why. */
const SyncIcon = ({ txn }: { txn: BankTransaction }) => {
  const status = txn.thirdPartySyncStatus;
  if (status === "not_synced") return null;
  const [Icon, ink, title, detail] =
    status === "synced"
      ? [
          Cloud,
          "text-primary",
          `Synced to ${txn.thirdPartyProduct || "Tally"}`,
          txn.thirdPartyPostingDate
            ? new Date(txn.thirdPartyPostingDate).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
              })
            : "",
        ]
      : status === "in_progress"
        ? [
            CloudUpload,
            "text-warning-foreground",
            `Syncing to ${(txn.thirdPartyProduct || "Tally").toLowerCase()}...`,
            "Updates will appear shortly",
          ]
        : [
            CloudAlert,
            "text-destructive-foreground",
            "Failed to Sync",
            txn.thirdPartySyncError ?? "",
          ];
  return (
    <Tooltip
      message={
        <span className="flex flex-col">
          <span className="font-medium">{title}</span>
          <span className="text-xs text-secondary-foreground">{detail}</span>
        </span>
      }
    >
      <Icon aria-label={title} className={cn("h-4 w-4", ink)} />
    </Tooltip>
  );
};

/** Production's inline voucher-number field: saves on blur or Enter. */
const VoucherInput = ({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== value) onSave(next);
  };
  return (
    <input
      value={draft}
      placeholder="Enter Voucher No."
      aria-label="Voucher No."
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
      className="h-8 w-full min-w-0 rounded-md bg-transparent px-1 text-xs text-foreground placeholder:text-secondary-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    />
  );
};

type Props = {
  rows: BankTransaction[];
  ready: boolean;
  selected: string[];
  onSelectedChange: React.Dispatch<React.SetStateAction<string[]>>;
  sort: SortState<TxnColumn>;
  onSort: (key: TxnColumn) => void;
  sortable: Set<TxnColumn>;
  filterFor: (key: TxnColumn) => React.ReactNode | undefined;
  filterActive: (key: TxnColumn) => boolean;
  onOpen: (txn: BankTransaction) => void;
  onUpdate: (
    txn: BankTransaction,
    change: Partial<BankTransaction>,
    message: string
  ) => void;
  onToggleReady: (txn: BankTransaction) => void;
  onUnbuilt: (what: string) => void;
  empty: { title: string; body?: string };
  /** The active company — its ledgers and GST registrations fill the pickers. */
  company: string;
};

const TransactionsTable = ({
  rows,
  ready,
  selected,
  onSelectedChange,
  sort,
  onSort,
  sortable,
  filterFor,
  filterActive,
  onOpen,
  onUpdate,
  onToggleReady,
  onUnbuilt,
  empty,
  company,
}: Props) => {
  const gstRegistrations = gstRegistrationsOf(company);
  const shown: TxnColumn[] = [
    "date",
    ...(ready ? (["sync"] as const) : []),
    "gst",
    "voucherNo",
    "description",
    "type",
    "ledger",
    "amount",
  ];
  const resize = useColumnResize({
    shown,
    sizes: TRANSACTION_SIZES,
    storageKey: `banking.transactions.${ready ? "ready" : "review"}.widths.v1`,
  });
  const [openCell, setOpenCell] = useState("");

  const allOnPage =
    !!rows.length && rows.every((x) => selected.includes(x.bankLineUuid));

  const cell = (key: TxnColumn, txn: BankTransaction) => {
    const editable = !ready && !locked(txn);
    const cellId = `${txn.bankLineUuid}:${key}`;
    const picker = {
      open: openCell === cellId,
      onOpenChange: (open: boolean) => setOpenCell(open ? cellId : ""),
    };
    switch (key) {
      case "date":
        return <span className="truncate">{day(txn.transactionDate)}</span>;
      case "sync":
        return <SyncIcon txn={txn} />;
      case "gst":
        return (
          <EditableCell
            label="GST Registration"
            value={txn.companyGstLabel}
            options={gstRegistrations.map((g) => g.label)}
            editable={editable}
            onChange={(label) => {
              const gst = gstRegistrations.find((g) => g.label === label);
              onUpdate(
                txn,
                {
                  companyGstLabel: label,
                  companyGstUuid: gst?.uuid ?? "",
                },
                "GST registration updated"
              );
              return true;
            }}
            {...picker}
          />
        );
      case "voucherNo":
        return editable ? (
          <VoucherInput
            value={txn.voucherNo ?? ""}
            onSave={(voucherNo) =>
              onUpdate(txn, { voucherNo }, "Voucher number updated")
            }
          />
        ) : (
          <span className="truncate">{txn.voucherNo || "—"}</span>
        );
      case "description":
        return (
          <Tooltip message={txn.description} side="bottom" align="start">
            <span className="block truncate">{txn.description}</span>
          </Tooltip>
        );
      case "type": {
        const ai = txn.categorisedBy === "ai" && !!txn.paymentType;
        return (
          <span className="flex min-w-0 items-center gap-1">
            <span className="inline-flex w-3.5 flex-none justify-center">
              {ai ? (
                <Tooltip message="Categorised by AIA">
                  <Sparkles
                    aria-label="Categorised by AIA"
                    className="h-3.5 w-3.5 text-primary"
                  />
                </Tooltip>
              ) : null}
            </span>
            <span className="min-w-0 flex-1">
              <EditableCell
                label="Transaction Type"
                value={
                  txn.paymentType ? VOUCHER_TYPE_LABEL[txn.paymentType] : ""
                }
                options={typeOptionsFor(txn)}
                editable={editable}
                onChange={(label) => {
                  const paymentType = TYPE_BY_LABEL[label];
                  const allowed = ledgerGroupsFor(
                    paymentType,
                    txn.bankAccountName,
                    company
                  ).flatMap((g) => g.options);
                  const keep = txn.ledgersNameList.filter((l) =>
                    allowed.includes(l)
                  );
                  onUpdate(
                    txn,
                    {
                      paymentType,
                      categorisedBy: "user",
                      ledgersNameList: keep,
                      ledgersUuidList: keep.map((l) => `led-${l}`),
                    },
                    "Transaction type updated"
                  );
                  return true;
                }}
                {...picker}
              />
            </span>
          </span>
        );
      }
      case "ledger":
        return (
          <EditableCell
            label="Ledger"
            value={txn.ledgersNameList[0] ?? ""}
            groups={ledgerGroupsFor(
              txn.paymentType,
              txn.bankAccountName,
              company
            )}
            options={ledgerGroupsFor(
              txn.paymentType,
              txn.bankAccountName,
              company
            ).flatMap((g) => g.options)}
            editable={editable}
            createNoun="ledger"
            onCreate={() => onUnbuilt("Creating a ledger")}
            onChange={(name) => {
              onUpdate(
                txn,
                {
                  ledgersNameList: [name],
                  ledgersUuidList: [`led-${name}`],
                  categorisedBy: "user",
                },
                "Ledger updated"
              );
              return true;
            }}
            {...picker}
          />
        );
      case "amount":
        return (
          <span className="flex flex-col items-end">
            <span className="truncate tabular-nums">
              <AmountText value={Number(txn.transactionAmountLc)} />
            </span>
            <span className="text-caption-1 text-secondary-foreground">
              {displayCrDr(txn)}
            </span>
          </span>
        );
    }
  };

  const reviewButton = (txn: BankTransaction) => {
    if (ready) {
      const can = !locked(txn);
      const button = (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Move Back to Needs Review"
          disabled={!can}
          className="text-secondary-foreground"
          onClick={() => onToggleReady(txn)}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      );
      return can ? (
        <Tooltip message="Move Back to Needs Review">{button}</Tooltip>
      ) : (
        button
      );
    }
    const can = txn.isReadyToSync && !locked(txn);
    return (
      <Tooltip
        message={
          can ? "Mark as Accounting Ready" : "Transaction is not ready to sync"
        }
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Mark as Accounting Ready"
          disabled={!can}
          className="text-secondary-foreground hover:text-primary"
          onClick={() => onToggleReady(txn)}
        >
          <Check className="h-4 w-4" />
        </Button>
      </Tooltip>
    );
  };

  return (
    <div ref={resize.gridRef} className="min-h-0 min-w-0 flex-1 overflow-auto">
      <Table style={{ width: resize.tableWidth }} className={TABLE_CLASS}>
        <TableHeader className={HEADER_CLASS}>
          <TableRow>
            <TableHead
              style={{ width: SELECT_WIDTH }}
              className="sticky left-0 z-10 h-10 bg-accent px-3 py-0 align-middle"
            >
              <Checkbox
                aria-label="Select every transaction on this page"
                checked={allOnPage}
                onCheckedChange={(checked) =>
                  onSelectedChange(
                    checked ? rows.map((x) => x.bankLineUuid) : []
                  )
                }
              />
            </TableHead>
            {shown.map((key) => (
              <HeaderCell
                key={key}
                columnKey={key}
                label={LABEL[key]}
                sizes={TRANSACTION_SIZES}
                resize={resize}
                align={key === "amount" ? "right" : "left"}
                sort={
                  sortable.has(key)
                    ? sort?.key === key
                      ? sort.dir
                      : "none"
                    : undefined
                }
                onSort={() => onSort(key)}
                filter={filterFor(key)}
                filterActive={filterActive(key)}
                resizable={key !== "sync"}
              />
            ))}
            <TableHead
              style={{ width: ACTIONS_WIDTH }}
              className="sticky right-0 z-10 h-10 border-l border-neutral-gray bg-accent px-3 py-0 align-middle"
            >
              <span
                className={cn(
                  T.head,
                  "flex h-4 items-center justify-center truncate"
                )}
              >
                {ready ? "Undo" : "Reviewed"}
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((txn) => {
            const ticked = selected.includes(txn.bankLineUuid);
            const ground = ticked ? "bg-accent" : "bg-background";
            return (
              <TableRow
                key={txn.bankLineUuid}
                aria-selected={ticked}
                onClick={() => onOpen(txn)}
                className={cn(
                  "cursor-pointer hover:bg-transparent",
                  ticked && "bg-accent hover:bg-accent"
                )}
              >
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "sticky left-0 z-[1] h-[45px] px-3 py-0 align-middle",
                    ground
                  )}
                >
                  <Checkbox
                    aria-label={`Select ${txn.description}`}
                    checked={ticked}
                    onCheckedChange={(checked) =>
                      onSelectedChange((current) =>
                        checked
                          ? [...current, txn.bankLineUuid]
                          : current.filter((id) => id !== txn.bankLineUuid)
                      )
                    }
                  />
                </TableCell>
                {shown.map((key) => (
                  <TableCell
                    key={key}
                    onClick={
                      // Editors swallow their own clicks; the rest open the
                      // details sheet.
                      ["gst", "type", "ledger", "voucherNo"].includes(key) &&
                      !ready
                        ? (e) => e.stopPropagation()
                        : undefined
                    }
                    className={cn(
                      "h-[45px] overflow-hidden px-3 py-0 align-middle",
                      T.cell,
                      key === "amount" && "text-right"
                    )}
                  >
                    <CellBox>{cell(key, txn)}</CellBox>
                  </TableCell>
                ))}
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "sticky right-0 z-[1] h-[45px] border-l border-neutral-gray px-3 py-0 text-center align-middle",
                    ground
                  )}
                >
                  <span className="inline-flex">{reviewButton(txn)}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {!rows.length && <EmptyBlock title={empty.title} body={empty.body} />}
    </div>
  );
};

export default TransactionsTable;
