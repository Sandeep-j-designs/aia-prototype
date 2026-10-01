import React from "react";
import { CircleAlert } from "lucide-react";
import Typography from "@/components/common/typography";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditedMark } from "@/components/inbox/v2/ui";
import {
  companyOf,
  journalLineErrors,
  journalTotals,
  type Form,
  type Item,
} from "@/components/inbox/v2/store";
import VoucherDetails from "./voucher-details";
import LedgerLines from "./ledger-lines";
import VoucherTotalsPanel from "./voucher-totals";

/**
 * The journal voucher, as the Inbox's review surface for the JV route.
 *
 * A port of Prototypes/Journals (/journal-voucher) — same sections, same
 * table, same totals panel, same imbalance banner. What is dropped is the
 * page's own chrome: that screen owns its title and its Discard / Save Voucher
 * pair, and here the Inbox's header already holds Delete and Approve & Next,
 * which are the same two decisions under the names this queue gives them.
 *
 * Composition only. Every rule lives in the store, beside the rules for the
 * other two routes:
 *   - `journalTotals`     the two column totals and whether they agree
 *   - `journalLineErrors` the lines that cannot post, and why
 *   - `issue`             whether this voucher may be approved at all
 *
 * DEV: on transplant this directory moves as-is and the three imports above
 * resolve to the journal-voucher service. The form model is the Inbox's shared
 * `Form`, so the seam is the mapping in the store, not these components.
 */

type Props = {
  item: Item;
  /**
   * Whether the user has tried to approve. Errors stay hidden until then —
   * marking a row red the moment it is created would flag every blank line on
   * a voucher the AI has only half-filled.
   */
  attempted: boolean;
  readOnly?: boolean;
  onEdit: (patch: Partial<Form>) => void;
  /** Ledgers created this session, offered in every line's picker. */
  createdLedgers?: string[];
  /**
   * The picker's "+ Create ledger". The caller runs the create dialog and
   * calls `assign` with the new name, which sets it on the line it came from.
   */
  onCreateLedger?: (query: string, assign: (name: string) => void) => void;
};

const JournalVoucher = ({
  item,
  attempted,
  readOnly,
  onEdit,
  createdLedgers,
  onCreateLedger,
}: Props) => {
  const savedForm = readOnly ? item.snapshot || item.form : item.form;
  const form = readOnly
    ? savedForm
    : {
        ...savedForm,
        lines: [
          ...savedForm.lines,
          ...Array.from(
            { length: Math.max(0, 2 - savedForm.lines.length) },
            () => ({
              description: "",
              ledger: "",
              amount: 0,
              dr: 0,
              cr: 0,
              costCentre: "",
            })
          ),
        ],
      };
  const totals = journalTotals(form);
  const errors = attempted && !readOnly ? journalLineErrors(form) : [];
  const branches = companyOf(item.company)?.branches ?? [];

  /*
    The banner is a voucher-level error, and it only appears once an approval
    has been attempted on a voucher that actually carries figures — an empty
    form is not "unbalanced", it is empty.
  */
  const showImbalanceBanner =
    attempted &&
    !readOnly &&
    form.lines.some((line) => line.dr || line.cr) &&
    !totals.isBalanced;

  const setLine = (index: number, patch: Partial<Form["lines"][number]>) =>
    onEdit({
      lines: form.lines.map((line, i) =>
        i === index ? { ...line, ...patch } : line
      ),
    });

  /**
   * A line is one side of an entry. Entering a debit clears the credit and the
   * other way round — the two cells are a single choice presented as two
   * inputs, not two independent figures. Both stay visible and the unused one
   * reads 0.00, which is what the frames show.
   *
   * `amount` is kept in step because the list's Amount column and the store's
   * own recalculation both read it.
   */
  const setAmount = (index: number, side: "dr" | "cr", value: number) => {
    const amount = Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
    setLine(
      index,
      side === "dr"
        ? { dr: amount, cr: 0, amount }
        : { cr: amount, dr: 0, amount }
    );
  };

  const addLine = () =>
    onEdit({
      lines: [
        ...form.lines,
        {
          description: "",
          ledger: "",
          amount: 0,
          dr: 0,
          cr: 0,
          costCentre: "",
        },
      ],
    });

  /** Never drop below two lines — one side alone cannot be an entry. */
  const removeLine = (index: number) =>
    onEdit({
      lines:
        form.lines.length <= 2
          ? form.lines.map((line, i) =>
              i === index
                ? {
                    description: "",
                    ledger: "",
                    amount: 0,
                    dr: 0,
                    cr: 0,
                    costCentre: "",
                  }
                : line
            )
          : form.lines.filter((_, i) => i !== index),
    });

  return (
    <div className="journal-voucher flex min-w-0 flex-col gap-6 p-5">
      {showImbalanceBanner ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-lg bg-destructive px-4 py-3"
        >
          <CircleAlert className="h-4 w-4 shrink-0 text-destructive-foreground" />
          <Typography variant="p" weight="semibold">
            Entry not balanced - Fix before approving.
          </Typography>
          <Typography variant="p" className="text-destructive-foreground">
            Total Debits should be equal to Total Credits
          </Typography>
        </div>
      ) : null}

      <VoucherDetails
        form={form}
        attempted={attempted && !readOnly}
        branches={branches}
        edited={readOnly ? [] : item.edited}
        readOnly={readOnly}
        onChange={onEdit}
      />

      {attempted &&
      !readOnly &&
      !form.lines.some((line) => line.dr || line.cr) ? (
        <p role="alert" className="text-sm text-destructive-foreground">
          Add debit and credit amounts before approving this voucher.
        </p>
      ) : null}

      <LedgerLines
        lines={form.lines}
        errors={errors}
        costClass={form.costClass}
        readOnly={readOnly}
        onLineChange={setLine}
        onAmountChange={setAmount}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        createdLedgers={createdLedgers}
        onCreateLedger={
          onCreateLedger
            ? (query, index) =>
                onCreateLedger(query, (name) =>
                  setLine(index, { ledger: name })
                )
            : undefined
        }
      />

      {/* The note and the figures close the form together, as in the frame:
          narration is optional and the totals are read rather than filled, so
          neither earns a full-width band of its own.

          `xl` rather than `lg` for the split: this form sits beside a document
          pane, so its own column is roughly half what the standalone page has.
          Folding at the same breakpoint would put a six-row textarea and a
          three-row panel side by side in 400px.
      */}
      <div className="grid grid-cols-1 gap-6 pb-2 xl:grid-cols-2">
        <div>
          <Label htmlFor="jv-narration" className="mb-1.5 font-normal">
            Narration (Optional)
          </Label>
          <Textarea
            id="jv-narration"
            rows={6}
            placeholder="Enter narration"
            readOnly={readOnly}
            value={form.narration}
            onChange={(event) => onEdit({ narration: event.target.value })}
          />
          {!readOnly && item.edited.includes("narration") ? (
            <EditedMark />
          ) : null}
        </div>

        <VoucherTotalsPanel totals={totals} />
      </div>
    </div>
  );
};

export default JournalVoucher;
