import React from "react";
import { AlertTriangle, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConvertButton from "@/components/inbox/common/convert-button";
import NativeShell, {
  NativePanel,
} from "@/components/inbox/common/native-shell";
import ReviewField, { FieldGrid } from "@/components/inbox/common/review-field";
import { cn } from "@/lib/utils";
import type { InboxItem } from "@/types/pages/inbox";
import type { ConversionTarget } from "@/types/pages/inbox/conversion";

/**
 * Journal Voucher form. Ported from NativeJV in js/native-jv.jsx.
 *
 * The balance check is the gate here: a journal that does not balance cannot be
 * posted, so Dr and Cr totals are shown side by side with the variance stated
 * in rupees rather than as a generic "invalid" message.
 */

type Props = {
  item: InboxItem;
  onApprove: () => void;
  onConvert: (target: ConversionTarget) => void;
  onDelete: () => void;
  onSaveDraft: () => void;
};

const NativeJV = ({
  item,
  onApprove,
  onConvert,
  onDelete,
  onSaveDraft,
}: Props) => {
  const lines = item.jv?.lines ?? [];

  const drTotal = lines.reduce((sum, line) => sum + (line.dr ?? 0), 0);
  const crTotal = lines.reduce((sum, line) => sum + (line.cr ?? 0), 0);
  const variance = Math.abs(drTotal - crTotal);
  const isBalanced = variance < 0.01;

  const amount = (value: number | null) =>
    value ? value.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "—";

  return (
    <NativeShell
      title="Journal Voucher"
      subtitle="JV/26-27/0018 · 31 Aug 2026"
      footer={
        <>
          <ConvertButton source="jv" size="sm" onPick={onConvert} />
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onSaveDraft}>
            Save draft
          </Button>
          <Button disabled={!isBalanced} onClick={onApprove}>
            <Check className="h-3.5 w-3.5" />
            Post Journal Voucher
          </Button>
        </>
      }
    >
      <NativePanel>
        <FieldGrid>
          <ReviewField label="Voucher Type" value="Journal" required />
          <ReviewField label="Voucher No" value="JV/26-27/0018" required />
          <ReviewField label="Voucher Date" value="31 Mar 2026" required />
          <ReviewField label="Cost Centre" value="—" />
        </FieldGrid>
      </NativePanel>

      <NativePanel>
        <div className="mb-2.5 flex items-center gap-2.5">
          <strong className="text-sm">Debit / Credit</strong>
          <div className="flex-1" />
          <button
            type="button"
            className="text-sm text-primary hover:underline"
          >
            + Add line
          </button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Ledger</TableHead>
              <TableHead className="text-right text-xs">Debit (₹)</TableHead>
              <TableHead className="text-right text-xs">Credit (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.ledger}>
                <TableCell className="text-sm">{line.ledger}</TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {amount(line.dr)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {amount(line.cr)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-section hover:bg-section">
              <TableCell className="text-sm font-bold">Total</TableCell>
              <TableCell className="text-right text-sm font-bold tabular-nums">
                {drTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </TableCell>
              <TableCell className="text-right text-sm font-bold tabular-nums">
                {crTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md px-2.5 py-2.5 text-sm font-semibold",
            isBalanced
              ? "bg-success-green text-success-green-foreground"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {isBalanced ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {isBalanced
            ? "Balanced — Dr = Cr"
            : `Variance ₹ ${variance.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}`}
        </div>
      </NativePanel>

      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-secondary-foreground">Narration</Label>
        <Textarea rows={3} defaultValue={item.jv?.narration} />
      </div>
    </NativeShell>
  );
};

export default NativeJV;
