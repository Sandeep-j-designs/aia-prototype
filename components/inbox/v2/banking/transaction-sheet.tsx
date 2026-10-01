import React, { useState } from "react";
import { Check, Lock, Paperclip, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import {
  gstRegistrationsOf,
  VOUCHER_TYPE_LABEL,
} from "@/config/pages/inbox/mock-banking";
import type {
  BankTransaction,
  TallyVoucherPaymentType,
} from "@/types/pages/inbox/banking";
import {
  AmountText,
  Field,
  FieldCard,
  Notice,
  Pill,
  Req,
  T,
} from "@/components/inbox/v2/ui";
import { day } from "./table-parts";
import {
  TYPE_BY_LABEL,
  displayCrDr,
  ledgerGroupsFor,
  typeOptionsFor,
} from "./transactions-table";

/**
 * A transaction's details — production's transaction-details-sheet-revamp,
 * kept to its four sections and the fields this prototype models: the
 * voucher, the ledger it posts to, the bank line it came from, and notes.
 *
 * DEV: POST /api/transactions/v1/transaction-link/{payment|receipt|contra}
 * -voucher (Save), then PATCH /api/transactions/bank/toggle-accounting-ready
 * (Save & Mark as Accounting Ready / Revert to Needs Review).
 */

type Draft = {
  paymentType: TallyVoucherPaymentType | null;
  voucherNo: string;
  companyGstUuid: string;
  ledger: string;
  remarks: string;
};

const draftOf = (txn: BankTransaction): Draft => ({
  paymentType: txn.paymentType,
  voucherNo: txn.voucherNo ?? "",
  companyGstUuid: txn.companyGstUuid,
  ledger: txn.ledgersNameList[0] ?? "",
  remarks: txn.remarks,
});

const Info = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <span className={T.label}>{label}</span>
    <span className="truncate text-sm text-foreground">{children}</span>
  </div>
);

type Props = {
  txn: BankTransaction | null;
  onClose: () => void;
  /** Saves the draft; `markReady` also marks it Accounting Ready. */
  onSave: (
    txn: BankTransaction,
    change: Partial<BankTransaction>,
    markReady: boolean
  ) => void;
  onRevert: (txn: BankTransaction) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
  onUnbuilt: (what: string) => void;
  /** The active company — its ledgers and GST registrations fill the pickers. */
  company: string;
};

const SheetBody = ({
  txn,
  onClose,
  onSave,
  onRevert,
  notify,
  onUnbuilt,
  company,
}: Props & { txn: BankTransaction }) => {
  const gstRegistrations = gstRegistrationsOf(company);
  const [draft, setDraft] = useState<Draft>(() => draftOf(txn));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const isReady = txn.accoutingReady;
  const isSynced =
    txn.thirdPartySyncStatus === "synced" ||
    txn.thirdPartySyncStatus === "in_progress";
  const readOnly = isReady;
  const groups = ledgerGroupsFor(
    draft.paymentType,
    txn.bankAccountName,
    company
  );

  const change = (): Partial<BankTransaction> => {
    const gst = gstRegistrations.find((g) => g.uuid === draft.companyGstUuid);
    const ledgerChanged = draft.ledger !== (txn.ledgersNameList[0] ?? "");
    const typeChanged = draft.paymentType !== txn.paymentType;
    return {
      paymentType: draft.paymentType,
      voucherNo: draft.voucherNo || null,
      companyGstUuid: gst?.uuid ?? "",
      companyGstLabel: gst?.label ?? "",
      ledgersNameList: draft.ledger ? [draft.ledger] : [],
      ledgersUuidList: draft.ledger ? [`led-${draft.ledger}`] : [],
      remarks: draft.remarks,
      ...(ledgerChanged || typeChanged ? { categorisedBy: "user" } : {}),
    };
  };

  const save = (markReady: boolean) => {
    if (markReady && !draft.paymentType) {
      notify("Select a transaction type before saving.", "error");
      return;
    }
    if (markReady && !draft.ledger) {
      notify("Select a ledger before saving.", "error");
      return;
    }
    onSave(txn, change(), markReady);
  };

  return (
    <>
      <SheetHeader className="space-y-0 border-b border-neutral-gray px-6 py-4 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <SheetTitle className={T.title}>
              {draft.paymentType
                ? `${VOUCHER_TYPE_LABEL[draft.paymentType]} Voucher`
                : "Transaction"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Review and categorise this bank transaction.
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-5 w-5 text-secondary-foreground" />
            </Button>
          </SheetClose>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 sm:grid-cols-4">
          <div className="col-span-2 min-w-0">
            <Info label="Description">
              <span title={txn.description}>{txn.description}</span>
            </Info>
          </div>
          <Info label="Account">{txn.bankAccountName}</Info>
          <Info label="Transaction Date">{day(txn.transactionDate)}</Info>
        </div>
        <div className="flex items-center gap-2 pt-3">
          <span className={T.label}>Status</span>
          <Pill tone={isReady ? "ok" : "info"} size="sm">
            {isReady ? "Accounting Ready" : "Needs Review"}
          </Pill>
        </div>
      </SheetHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {isReady && !isSynced ? (
          <Notice tone="warning" className="flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 flex-none" />
            This transaction has been marked as Accounting Ready. To make
            changes, revert it back to Needs Review using the button below.
          </Notice>
        ) : null}

        <FieldCard title="Voucher Configuration">
          <Field
            label={
              <>
                <Req />
                Voucher Type
              </>
            }
          >
            <ComboBox
              title="Select Voucher Type"
              options={typeOptionsFor(txn).map((label) => ({
                label,
                value: label,
              }))}
              selectedValue={
                draft.paymentType ? VOUCHER_TYPE_LABEL[draft.paymentType] : ""
              }
              onChange={(value) => {
                const next = TYPE_BY_LABEL[String(value)] ?? null;
                set("paymentType", next);
                const allowed = ledgerGroupsFor(
                  next,
                  txn.bankAccountName,
                  company
                ).flatMap((g) => g.options);
                if (!allowed.includes(draft.ledger)) set("ledger", "");
              }}
              hasSearch={false}
              isMultiSelect={false}
              disabled={readOnly}
              hideClearButton
            />
          </Field>
          <Field label="Voucher No." htmlFor="txn-voucher-no">
            <Input
              id="txn-voucher-no"
              placeholder="Enter Voucher No."
              value={draft.voucherNo}
              disabled={readOnly}
              onChange={(e) => set("voucherNo", e.target.value)}
            />
          </Field>
          <Field label="GST Registration">
            <ComboBox
              title="Select Location"
              options={gstRegistrations.map((g) => ({
                label: g.label,
                value: g.uuid,
              }))}
              selectedValue={draft.companyGstUuid}
              onChange={(value) => set("companyGstUuid", String(value))}
              hasSearch={false}
              isMultiSelect={false}
              disabled={readOnly}
              hideClearButton
            />
          </Field>
          <Field label="Voucher Date">
            <Input value={day(txn.transactionDate)} disabled readOnly />
          </Field>
        </FieldCard>

        <FieldCard title="Ledger Allocation">
          <Field
            label={
              <>
                <Req />
                Ledger
              </>
            }
          >
            <ComboBox
              title="Select Ledger"
              options={groups.flatMap((g) =>
                g.options.map((o) => ({ label: o, value: o }))
              )}
              optionGroups={groups.map((g) => ({
                label: g.heading,
                options: g.options.map((o) => ({ label: o, value: o })),
              }))}
              selectedValue={draft.ledger}
              onChange={(value) => set("ledger", String(value))}
              isMultiSelect={false}
              disabled={readOnly}
              actionLabel={(query) =>
                query ? `Create ledger “${query}”` : "Create ledger"
              }
              onAction={() => onUnbuilt("Creating a ledger")}
              hideClearButton
            />
          </Field>
          <Field label="Amount">
            <div className="flex h-9 items-center justify-end rounded-md border border-input bg-section px-3 text-sm tabular-nums">
              <AmountText value={Number(txn.transactionAmountLc)} />
            </div>
          </Field>
        </FieldCard>

        <FieldCard title="Bank Details">
          <Info label="Bank Ledger">{txn.bankAccountName}</Info>
          <Info label="Bank Date">{day(txn.transactionDate)}</Info>
          <div className="min-w-0 sm:col-span-2">
            <span className={cn(T.label, "mb-1 block")}>Description</span>
            <p className="break-words text-sm text-foreground">
              {txn.description}
            </p>
          </div>
          <Info label="Amount">
            <span className="tabular-nums">
              <AmountText value={Number(txn.transactionAmountLc)} />
            </span>
          </Info>
          <Info label="Dr / Cr">{displayCrDr(txn)}</Info>
        </FieldCard>

        <FieldCard title="Notes & Attachments">
          <Field label="Notes" htmlFor="txn-notes" className="sm:col-span-2">
            <Textarea
              id="txn-notes"
              placeholder="Add a note for your team"
              value={draft.remarks}
              disabled={readOnly}
              onChange={(e) => set("remarks", e.target.value)}
              className="min-h-[72px]"
            />
          </Field>
          <div className="sm:col-span-2">
            <Button
              variant="secondary"
              disabled={readOnly}
              onClick={() => onUnbuilt("Attaching files to a transaction")}
            >
              <Paperclip className="h-4 w-4" />
              Attach File
            </Button>
          </div>
        </FieldCard>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-neutral-gray bg-background px-6 py-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {!isReady ? (
          <>
            <Button variant="secondary" onClick={() => save(false)}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button onClick={() => save(true)}>
              <Check className="h-4 w-4" />
              Save & Mark as Accounting Ready
            </Button>
          </>
        ) : null}
        {isReady && !isSynced ? (
          <Button onClick={() => onRevert(txn)}>
            <RotateCcw className="h-4 w-4" />
            Revert to Needs Review
          </Button>
        ) : null}
      </div>
    </>
  );
};

const TransactionSheet = (props: Props) => (
  <Sheet open={!!props.txn} onOpenChange={(open) => !open && props.onClose()}>
    <SheetContent
      side="right"
      className="flex w-full flex-col gap-0 border-neutral-gray p-0 sm:max-w-[800px]"
    >
      {props.txn ? (
        <SheetBody key={props.txn.bankLineUuid} {...props} txn={props.txn} />
      ) : null}
    </SheetContent>
  </Sheet>
);

export default TransactionSheet;
