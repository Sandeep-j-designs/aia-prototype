import React from "react";
import { Check, Copy, Eye, FileText, Lock, Split } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  AR_ADDITIONAL_GROUPS,
  displayValue,
} from "@/config/pages/inbox/additional-fields";
import { cn } from "@/lib/utils";
import type { BillLedgerPosting, CostAllocation } from "@/types/pages/inbox";
import { Item } from "./store";
import { PageDialog } from "./ui";
import Preview from "./preview";
import s from "./record-details.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value
  );
const date = (value: string) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : value || "—";
/** Money with a typographic minus, so every negative reads the same way. */
const signed = (value: number) =>
  value < 0 ? `− ${money(Math.abs(value))}` : money(value);
const quantity = (qty: number, unit?: string) =>
  `${qty.toLocaleString("en-IN")}${unit ? ` ${unit}` : ""}`;
const sum = (rows: { amount: number }[]) =>
  rows.reduce((s, r) => s + r.amount, 0);

export function RecordBanner({
  tone,
  title,
  children,
  action,
  label,
  icon,
}: {
  tone: "success" | "warning";
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  label: string;
  /** Overrides the tone's icon (Neo's chase banner draws a message). */
  icon?: React.ElementType;
}) {
  const success = tone === "success";
  const Icon = icon || (success ? Check : Copy);
  return (
    <section
      aria-label={title}
      /*
        The banner is the first thing under the header bar, and the bar has a
        border of its own — without the top margin the card's own border landed
        on it and the two read as one collided edge.
      */
      className="mx-5 my-3 flex shrink-0 flex-wrap items-center gap-4 rounded-xl border border-neutral-gray bg-background px-5 py-4 shadow-sm"
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          success
            ? "bg-success-green text-success-green-foreground"
            : "bg-warning text-warning-foreground"
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 basis-80">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <Badge
            color={success ? "positive" : "notice"}
            size="md"
            icon={<Lock className="size-3" aria-hidden />}
          >
            {label}
          </Badge>
        </div>
        <div className="mt-1 text-xs leading-5 text-secondary-foreground">
          {children}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

/* ----------------------------------------------------------------- pieces */

/* The approved record reads top down: what it is, its facts in a two-column
   grid, then its lines, its summary and its document, each under a plain
   label. Tabular figures keep money aligned. */

/** One fact: a quiet label above its value. */
const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className={s.field}>
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

/** A block under its own label — a table, the document, the narration. */
const Block = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <section aria-label={label} className={s.block}>
    <h2 className={s.blockLabel}>{label}</h2>
    {children}
  </section>
);

/* Matching cell insets keep headings and values clear of the table edges. */
const th = "px-4 py-2.5 text-sm font-normal text-secondary-foreground";
const td = "px-4 py-2.5 align-top text-sm leading-5 text-foreground";
const num = "whitespace-nowrap text-right tabular-nums";

/**
 * One line of the voucher. Item lines (a stock movement) and ledger lines (a
 * charge posted straight to an account) are two things in Tally, so they get
 * two tables: the item table carries the stock columns, the ledger table only
 * what a charge has. Both end on the same Amount edge.
 */
type Line = {
  key: string;
  description?: string;
  /** The stock item on an item line; the ledger on a ledger line. */
  name?: string;
  hsn?: string;
  godown?: string;
  qty?: number;
  unit?: string;
  rate?: number;
  discount?: number;
  costCentre?: string;
  allocations?: CostAllocation[];
  amount: number;
};

const dash = <span className={s.muted}>—</span>;

/**
 * A line's cost centre. Only shown when the voucher has no header cost centre
 * or class — a header one applies to every line, so the tables drop the
 * column. One centre reads as its name. A split reads the way the bills
 * screen shows it — a chip naming how many cost categories it spans — and
 * hovering or focusing it opens the allocation: each category, then each
 * centre's share and amount.
 */
const CostCell = ({ line }: { line: Line }) => {
  const shares = line.allocations || [];
  if (!shares.length) return line.costCentre ? <>{line.costCentre}</> : dash;
  const categories = Array.from(new Set(shares.map((a) => a.category)));
  const label =
    categories.length === 1
      ? `1 ${categories[0]}`
      : `${categories.length} cost categories`;
  return (
    <HoverCard openDelay={100} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={s.splitChip}
          aria-label={`Split allocation: ${label}`}
        >
          <Split size={12} aria-hidden />
          <span>{label}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className={s.splitCard}>
        <p className={s.label}>Split allocation</p>
        {categories.map((category) => (
          <div key={category} className={s.splitGroup}>
            <p className={s.splitCategory}>{category}</p>
            {shares
              .filter((a) => a.category === category)
              .map((a) => (
                <div key={a.centre} className={s.splitRow}>
                  <span>{a.centre}</span>
                  <span className={num}>{a.percent}%</span>
                  <span className={num}>{money(a.amount)}</span>
                </div>
              ))}
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
};

const TableShell = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div
    className={s.tableScroll}
    tabIndex={0}
    role="region"
    aria-label={`${label}, scroll horizontally for all columns`}
  >
    <table className="w-full text-left">{children}</table>
  </div>
);

type TableProps = {
  lines: Line[];
  /** False when a header cost centre or class covers every line. */
  perLineCost: boolean;
};

const ItemsTable = ({ lines, perLineCost }: TableProps) => (
  <TableShell label="Item lines">
    <thead>
      <tr>
        <th className={th}>Item description</th>
        <th className={th}>Item</th>
        <th className={th}>HSN / SAC</th>
        <th className={th}>Godown / Location</th>
        <th className={cn(th, "text-right")}>Quantity</th>
        <th className={cn(th, "text-right")}>Unit rate</th>
        <th className={cn(th, "text-right")}>Discount</th>
        {perLineCost && <th className={th}>Cost centre</th>}
        <th className={cn(th, "text-right")}>Amount</th>
      </tr>
    </thead>
    <tbody>
      {lines.map((line) => (
        <tr key={line.key}>
          <td className={td}>{line.description || dash}</td>
          <td className={td}>{line.name || dash}</td>
          <td className={td}>{line.hsn || dash}</td>
          <td className={td}>{line.godown || dash}</td>
          <td className={cn(td, num)}>
            {line.qty != null ? quantity(line.qty, line.unit) : dash}
          </td>
          <td className={cn(td, num)}>
            {line.rate != null ? money(line.rate) : dash}
          </td>
          <td className={cn(td, num)}>
            {line.discount != null ? `${line.discount}%` : dash}
          </td>
          {perLineCost && (
            <td className={td}>
              <CostCell line={line} />
            </td>
          )}
          <td className={cn(td, num)}>{signed(line.amount)}</td>
        </tr>
      ))}
    </tbody>
  </TableShell>
);

const LedgersTable = ({ lines, perLineCost }: TableProps) => (
  <TableShell label="Ledger lines">
    <thead>
      <tr>
        <th className={cn(th, "w-[36%]")}>Description</th>
        <th className={cn(th, "w-[22%]")}>Ledger</th>
        <th className={th}>HSN / SAC</th>
        {perLineCost && <th className={th}>Cost centre</th>}
        <th className={cn(th, "text-right")}>Amount</th>
      </tr>
    </thead>
    <tbody>
      {lines.map((line) => (
        <tr key={line.key}>
          <td className={cn(td, "min-w-[200px]")}>
            {line.description || dash}
          </td>
          <td className={cn(td, "min-w-[140px]")}>{line.name || dash}</td>
          <td className={td}>{line.hsn || dash}</td>
          {perLineCost && (
            <td className={td}>
              <CostCell line={line} />
            </td>
          )}
          <td className={cn(td, num)}>{signed(line.amount)}</td>
        </tr>
      ))}
    </tbody>
  </TableShell>
);

/**
 * A head of the summary — GST, TDS, Adjustments. Its name sits above its
 * ledgers so a "TDS Current assets" adjustment can never pass for a TDS
 * deduction. The head carries its own sum only when it has two or more
 * ledgers; with one, the sum would just repeat the row under it.
 */
const SummaryGroup = ({
  label,
  rows,
  minus,
}: {
  label: string;
  rows: BillLedgerPosting[];
  /** Deductions (TDS) read as subtractions, not as more to pay. */
  minus?: boolean;
}) => {
  if (!rows.length) return null;
  const show = (value: number) => signed(minus ? -value : value);
  return (
    <>
      <tr className={s.groupHead}>
        <th scope="row" className={td}>
          {label}
        </th>
        <td className={cn(td, num)}>
          {rows.length > 1 ? show(sum(rows)) : ""}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.ledger} className={s.groupRow}>
          <th scope="row" className={td}>
            {row.ledger}
          </th>
          <td className={cn(td, num)}>{show(row.amount)}</td>
        </tr>
      ))}
    </>
  );
};

/* ------------------------------------------------------------------- view */

export function ApprovedDetails({
  item,
  company,
}: {
  item: Item;
  company: string;
}) {
  const [documentOpen, setDocumentOpen] = React.useState(false);
  const f = item.snapshot || item.form;
  const journal = item.route === "JV";
  const receivable = item.route === "AR";
  const bill = item.original?.bill;
  const ar = receivable ? item.arSnapshot || item.arSheet : undefined;
  // The purchase sheet retains both selections when its toggle changes.
  // Its active mode decides which header allocation belongs on the record.
  const costMode = item.route === "AP" ? item.sheet?.ccMode : undefined;
  const usesCostClass =
    costMode === "class" || costMode === "centre"
      ? costMode === "class"
      : f.costClassEnabled || !!f.costClass;

  /*
    The registration shows as the branch and its GSTIN, the way the bills
    screen states it. The mock writes them as one string joined by " · ";
    the form keeps only the branch name.
  */
  const [branch, gstin] = (bill?.gstReg || f.gst || "").split(" · ");

  /*
    A bill's lines come out of extraction flat; the ones booked against a
    stock item are the item rows, and the rest are ledger rows. The posted
    amounts and ledgers are the form's (they may have been edited on review);
    what the document printed — quantity, rate, godown, split — is the
    extraction's, matched by position.
  */
  const items: Line[] = [];
  const ledgers: Line[] = [];
  if (ar) {
    ar.items
      .filter((row) => row.amount || row.description || row.item)
      .forEach((row) =>
        items.push({
          key: row.id,
          description: row.description,
          name: row.item,
          godown: row.godown,
          qty: row.quantity,
          rate: row.unitRate,
          discount: row.discount,
          costCentre: row.costCentre,
          amount: row.amount,
        })
      );
    ar.ledgers
      .filter((row) => row.amount || row.ledger)
      .forEach((row) =>
        ledgers.push({
          key: row.id,
          description: row.description,
          name: row.ledger,
          costCentre: row.costCentre,
          amount: row.amount,
        })
      );
  } else {
    const printed = bill?.items.length === f.lines.length ? bill.items : [];
    f.lines.forEach((line, index) => {
      const p = printed[index];
      const row: Line = {
        key: String(index),
        description: line.description,
        name: p?.item || line.ledger,
        hsn: p?.hsn,
        godown: p?.godown,
        qty: p?.qty,
        unit: p?.unit,
        rate: p?.rate,
        discount: p?.discount,
        costCentre: line.costCentre || p?.costCentre || undefined,
        allocations: line.costCentre ? undefined : p?.allocations,
        amount: line.amount,
      };
      (p?.item ? items : ledgers).push(row);
    });
  }
  const subTotal = sum(items) + sum(ledgers);

  /*
    The tax block as it came off the document. Both sides of the invoice carry
    one — a bill's GST is input, a sales invoice's is output — and neither is
    recomputed here. A bill at more than one rate states its GST by ledger.
  */
  const taxSide = receivable ? "Output" : "Input";
  const gst: BillLedgerPosting[] = ar
    ? ar.taxes
        .filter((row) => row.amount || row.ledger)
        .map((row) => ({ ledger: row.ledger || "Tax", amount: row.amount }))
    : bill?.taxLedgers ||
      (
        [
          ["CGST", bill?.taxes.cgst],
          ["SGST", bill?.taxes.sgst],
          ["IGST", bill?.taxes.igst],
        ] as const
      )
        .filter(([, amount]) => !!amount)
        .map(([head, amount]) => ({
          ledger: `${taxSide} ${head}`,
          amount: amount || 0,
        }));
  const tds = bill?.tds || [];
  const adjustments = bill?.adjustments || [];
  const rcm = bill?.rcm;
  const grandTotal = item.amount;
  /*
    Whatever the figures above do not explain. Zero on every bill this
    prototype carries; it exists so an edited voucher whose lines no longer
    add up to its total does not quietly hide the gap.
  */
  const unexplained =
    Math.round(
      (grandTotal - (subTotal + sum(gst) - sum(tds) + sum(adjustments))) * 100
    ) / 100;

  const postingLedger = ar ? ar.salesLedger : bill?.purchaseLedger;
  const partyName = f.party || f.voucherType;
  /*
    A cost centre or class set at the header applies to the whole voucher —
    the sheet locks every line to it — so whatever a line still holds
    underneath is not what was booked. Only with the header blank does each
    line carry its own.
  */
  const headerCostCentre = usesCostClass ? f.costClass : f.costCentre;
  const perLineCost = !headerCostCentre;
  const narration = f.narration && f.narration !== "—" ? f.narration : "";
  /*
    A sales invoice's optional groups — whatever it was given, from the sheet
    or a spreadsheet upload — group by group in the invoice's order. Only
    what is filled: an empty group on a record is a question nobody asked.
  */
  const extra = receivable ? f.extra || {} : {};
  const extraGroups = AR_ADDITIONAL_GROUPS.map((g) => ({
    ...g,
    fields: g.fields.filter((field) => String(extra[field.id] ?? "").trim()),
  })).filter((g) => g.fields.length);
  const or = (value?: string) => value || dash;

  /*
    Mercury's record: the voucher number as the title with its status beside
    it, then every fact once in a two-column grid. The lines follow in
    bordered tables, the summary closes on the total, and the document and
    narration come last. No approver: without an audit trail behind it, the
    name would be a claim the record cannot back.
  */
  return (
    <article aria-label="Approved voucher details" className={s.record}>
      <header className={s.head}>
        <h1 className={s.title}>{f.voucherNo || partyName}</h1>
      </header>

      <dl className={s.fields} aria-label="Voucher information">
        <Field label={journal ? "Party" : receivable ? "Customer" : "Vendor"}>
          {or(partyName)}
        </Field>
        <Field label="Amount">
          <span className="tabular-nums">{money(grandTotal)}</span>
        </Field>
        <Field
          label={
            journal ? "Voucher date" : receivable ? "Invoice date" : "Bill date"
          }
        >
          {date(f.date)}
        </Field>
        <Field label={journal ? "Reference date" : "Due date"}>
          {date(f.due)}
        </Field>
        <Field
          label={
            journal
              ? "Reference no."
              : receivable
                ? "Invoice no."
                : "Supplier invoice no."
          }
        >
          {or(f.invoiceNo)}
        </Field>
        <Field label="Voucher type">{or(f.voucherType)}</Field>
        <Field label={receivable ? "Sales ledger" : "Purchase ledger"}>
          {or(postingLedger)}
        </Field>
        <Field label="GST registration">
          {branch || dash}
          {gstin && <span className={s.muted}> · {gstin}</span>}
        </Field>
        <Field label={usesCostClass ? "Cost centre class" : "Cost centre"}>
          {headerCostCentre || <span className={s.muted}>Set per line</span>}
        </Field>
      </dl>

      {items.length > 0 && (
        <Block label="Items">
          <ItemsTable lines={items} perLineCost={perLineCost} />
        </Block>
      )}

      {ledgers.length > 0 && (
        <Block label="Ledgers">
          <LedgersTable lines={ledgers} perLineCost={perLineCost} />
        </Block>
      )}

      {/*
        Read top down: what the lines add to, the tax that goes on, the TDS
        that comes off, and any adjustments. A head appears only when the
        voucher carries it — a bill with no TDS needs no zero row.
      */}
      <Block label="Summary">
        <TableShell label="Summary">
          <tbody>
            <tr>
              <th scope="row" className={td}>
                Sub total
              </th>
              <td className={cn(td, num)}>{money(subTotal)}</td>
            </tr>
            <SummaryGroup label="GST" rows={gst} />
            <SummaryGroup label="TDS" rows={tds} minus />
            <SummaryGroup
              label="Adjustments"
              rows={
                unexplained !== 0
                  ? [
                      ...adjustments,
                      { ledger: "Taxes & adjustments", amount: unexplained },
                    ]
                  : adjustments
              }
            />
            <tr className={s.totalRow}>
              <th scope="row" className={td}>
                {journal ? "Total debit" : "Total"}
              </th>
              <td className={cn(td, num)}>{money(grandTotal)}</td>
            </tr>
            {rcm && (
              <tr className={s.memoRow}>
                <th scope="row" className={td}>
                  GST under RCM · {rcm.ledger}
                </th>
                <td className={cn(td, num)}>{money(rcm.amount)}</td>
              </tr>
            )}
          </tbody>
        </TableShell>
      </Block>

      {extraGroups.length > 0 && (
        <Block label="Additional Details">
          {extraGroups.map((g) => (
            <div key={g.id} className={s.extraGroup}>
              <h3 className={s.groupLabel}>{g.label}</h3>
              <dl className={s.extraFields}>
                {g.fields.map((field) => (
                  <Field key={field.key} label={field.label}>
                    {field.type === "date"
                      ? date(extra[field.id])
                      : displayValue(field, extra[field.id])}
                  </Field>
                ))}
              </dl>
            </div>
          ))}
        </Block>
      )}

      <Block label="Attachment">
        {item.file.name ? (
          <button
            type="button"
            className={s.file}
            onClick={() => setDocumentOpen(true)}
          >
            <FileText size={16} aria-hidden />
            <span className={s.fileName}>{item.file.name}</span>
            <span className={s.fileAction}>
              <Eye size={16} aria-hidden />
              <span className="sr-only">Preview</span>
            </span>
          </button>
        ) : (
          <p className={s.muted}>No document attached</p>
        )}
      </Block>

      {narration && (
        <Block label="Narration">
          <p className={s.text}>{narration}</p>
        </Block>
      )}

      <PageDialog
        title={receivable ? "Invoice document" : "Bill document"}
        description={item.file.name}
        open={documentOpen}
        onClose={() => setDocumentOpen(false)}
        className="w-[calc(100%-32px)] max-w-[900px]"
      >
        <div className="h-[65vh] min-h-0">
          <Preview item={item} />
        </div>
      </PageDialog>
    </article>
  );
}
