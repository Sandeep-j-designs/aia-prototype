import React, { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { setPrecisionToTwoDecimals } from "@/hooks/pages/inbox/use-stock-item-form";
import type {
  AllocationLike,
  GodownAllocationDraftRow,
  Option,
} from "@/types/pages/inbox/inventory";
import { PageDialog, Pill, T } from "@/components/inbox/v2/ui";
import NumericInput from "./numeric-input";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The opening balance line being split. */
  quantity: number;
  rate: number;
  amount: number;
  allocations: AllocationLike[];
  godownOptions: Option[];
  /** Unit "Not Applicable": quantity and rate are 0, amounts are typed. */
  forceAmountEditableMode: boolean;
  onSave: (allocations: AllocationLike[]) => void;
};

const COLUMNS = [
  { key: "godown", label: "Godown/Location", className: "w-[44%]" },
  { key: "quantity", label: "Qty", className: "text-right" },
  { key: "rate", label: "Rate", className: "text-right" },
  { key: "amount", label: "Amount", className: "text-right" },
  { key: "actions", label: "", className: "w-12" },
];

let rowSeq = 0;
const newRowId = () => `draft-${Date.now().toString(36)}-${rowSeq++}`;

/**
 * production's AP godown-split-modal (accounts-payable/tally/create-voucher/
 * line-items-section/item-details-section/godown-split-modal*.tsx), as the
 * stock item's opening balance uses it. The Discount column is left out: an
 * opening balance has none.
 */
const GodownSplitModal = ({
  open,
  onOpenChange,
  quantity,
  rate,
  amount,
  allocations,
  godownOptions,
  forceAmountEditableMode,
  onSave,
}: Props) => {
  const isAmountEditableMode = forceAmountEditableMode;
  const isQuantityDrivenMode = !isAmountEditableMode && quantity !== 0;
  const parentLineQuantity = setPrecisionToTwoDecimals(quantity);
  const parentLineAmount = setPrecisionToTwoDecimals(amount);

  const [draftRows, setDraftRows] = useState<GodownAllocationDraftRow[]>(() =>
    allocations.length
      ? allocations.map((a) => ({
          id: a.id || newRowId(),
          godownUuid: a.godownUuid || "",
          quantity: a.quantity ?? 0,
          rate,
          amount: a.amount ?? 0,
        }))
      : [
          {
            id: newRowId(),
            godownUuid: "",
            quantity: parentLineQuantity,
            rate,
            amount: parentLineAmount,
          },
        ]
  );

  const totalQuantity = setPrecisionToTwoDecimals(
    draftRows.reduce((sum, row) => sum + (row.quantity ?? 0), 0)
  );

  // Quantity-driven rows price themselves; the last one takes the paise
  // the rounding leaves, as production's finalRows does.
  const finalRows = useMemo(() => {
    if (isAmountEditableMode) return draftRows;
    const rows = draftRows.map((row) => ({
      ...row,
      rate,
      amount: setPrecisionToTwoDecimals((row.quantity ?? 0) * rate),
    }));
    if (!rows.length || totalQuantity !== parentLineQuantity) return rows;
    const diff = setPrecisionToTwoDecimals(
      parentLineAmount - rows.reduce((sum, row) => sum + row.amount, 0)
    );
    if (diff !== 0) {
      const last = rows.length - 1;
      rows[last] = {
        ...rows[last],
        amount: setPrecisionToTwoDecimals(rows[last].amount + diff),
      };
    }
    return rows;
  }, [draftRows, isAmountEditableMode, rate, totalQuantity]);

  const totalAmount = setPrecisionToTwoDecimals(
    finalRows.reduce((sum, row) => sum + (row.amount ?? 0), 0)
  );

  const selectedGodowns = finalRows.map((r) => r.godownUuid).filter(Boolean);
  const hasDuplicateGodowns =
    new Set(selectedGodowns).size !== selectedGodowns.length;
  const hasIncompleteRows = finalRows.some(
    (row) =>
      !row.godownUuid ||
      (isQuantityDrivenMode ? row.quantity === 0 : row.amount === 0)
  );
  const shouldValidateQuantity =
    isQuantityDrivenMode || finalRows.some((r) => r.quantity !== 0);
  const quantityMatchesParent =
    !shouldValidateQuantity || totalQuantity === parentLineQuantity;
  const amountMatchesParent = totalAmount === parentLineAmount;
  const isSaveDisabled =
    hasIncompleteRows ||
    hasDuplicateGodowns ||
    !amountMatchesParent ||
    !quantityMatchesParent;

  const update = (id: string, patch: Partial<GodownAllocationDraftRow>) =>
    setDraftRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );

  const addRow = () => {
    const remaining = setPrecisionToTwoDecimals(
      parentLineQuantity - totalQuantity
    );
    const remainingAmount = setPrecisionToTwoDecimals(
      parentLineAmount - totalAmount
    );
    setDraftRows((rows) => [
      ...rows,
      {
        id: newRowId(),
        godownUuid: "",
        quantity: isAmountEditableMode ? 0 : remaining,
        rate,
        amount: isAmountEditableMode ? remainingAmount : 0,
      },
    ]);
  };

  const save = () => {
    if (isSaveDisabled) return;
    onSave(
      finalRows.map((row) => ({
        id: row.id,
        godownUuid: row.godownUuid,
        quantity: isAmountEditableMode ? 0 : row.quantity,
        rate: isAmountEditableMode ? 0 : row.rate,
        discount: 0,
        amount: row.amount,
      }))
    );
    onOpenChange(false);
  };

  const formattedAmount = parentLineAmount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <PageDialog
      open={open}
      title="Allocate Godown/Location"
      onClose={() => onOpenChange(false)}
      className="max-w-[860px]"
    >
      <div className="mb-4">
        <Pill tone="neutral" className="text-label-3">
          Total Quantity: {parentLineQuantity} | Amount: ₹{formattedAmount}
        </Pill>
      </div>

      <Table className="border-separate border-spacing-0">
        <TableHeader>
          <TableRow className="bg-section hover:bg-section">
            {COLUMNS.map((column) => (
              <TableHead
                key={column.key}
                className={cn("h-10 px-2", T.head, column.className)}
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {finalRows.map((row) => (
            <TableRow key={row.id} className="border-0 hover:bg-transparent">
              <TableCell className="px-2 align-top">
                <ComboBox
                  title="Select Godown/Location"
                  options={godownOptions}
                  selectedValue={row.godownUuid}
                  onChange={(value) =>
                    update(row.id, { godownUuid: String(value) })
                  }
                  isMultiSelect={false}
                  hasSearch={false}
                />
              </TableCell>
              <TableCell className="px-2 align-top">
                <NumericInput
                  aria-label="Quantity"
                  value={row.quantity}
                  onChange={(value) => update(row.id, { quantity: value ?? 0 })}
                  allowNegative
                  disabled={isAmountEditableMode}
                  className="text-right"
                />
              </TableCell>
              <TableCell className="px-2 align-top">
                <NumericInput
                  aria-label="Rate"
                  value={row.rate}
                  disabled
                  className="text-right"
                />
              </TableCell>
              <TableCell className="px-2 align-top">
                <NumericInput
                  aria-label="Amount"
                  value={row.amount}
                  onChange={(value) => update(row.id, { amount: value ?? 0 })}
                  allowNegative
                  disabled={!isAmountEditableMode}
                  className="text-right"
                />
              </TableCell>
              <TableCell className="px-2 align-top">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Remove row"
                  className="text-secondary-foreground hover:text-primary"
                  onClick={() =>
                    setDraftRows((rows) => rows.filter((r) => r.id !== row.id))
                  }
                  disabled={draftRows.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2 w-fit px-2"
        onClick={addRow}
      >
        <Plus className="h-4 w-4" />
        Add New Row
      </Button>

      <div className="mt-6 flex w-full items-center justify-between gap-4">
        <div className="flex flex-col gap-1 text-sm text-destructive-foreground">
          {hasDuplicateGodowns ? (
            <span>Duplicate godown selections are not allowed.</span>
          ) : null}
          {!amountMatchesParent ? (
            <span>Total allocation amount must match the line amount.</span>
          ) : null}
          {!quantityMatchesParent ? (
            <span>Total allocation quantity must match the line quantity.</span>
          ) : null}
        </div>
        <div className="flex flex-none items-center gap-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={isSaveDisabled}>
            Save
          </Button>
        </div>
      </div>
    </PageDialog>
  );
};

export default GodownSplitModal;
