import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "@/components/icons";
import { companyOf, useStore } from "@/components/inbox/v2/store";
import {
  batchDrafts,
  reconcile,
  setBatchSetting,
  toggleRow,
  useBatches,
} from "@/hooks/pages/neo/use-batches";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import type {
  Batch,
  BatchRow,
  BatchSettingKey,
  BatchSettings,
} from "@/types/pages/neo/batch";
import { basePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";
import SourceTag from "./source-tag";

type Props = {
  card: Extract<NeoCard, { kind: "batch" }>;
  /** Open for edits: this is the card the run is waiting on. */
  editable: boolean;
  onRef: (ref: NeoRef) => void;
};

const inr = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* -------------------------------------------------------------- settings */

const LABEL: Record<BatchSettingKey, string> = {
  period: "Period",
  dateRule: "Voucher date",
  gstReg: "GST registration",
  freightLedger: "Freight lines go to",
  costCentre: "Cost centre",
  tds: "TDS",
  narration: "Narration",
};

const shown = (key: BatchSettingKey, s: BatchSettings) =>
  key === "dateRule"
    ? s.dateRule === "bill"
      ? "Bill date"
      : "Date of entry"
    : key === "tds"
      ? s.tds === "194C"
        ? "194C on transporters"
        : "None"
      : s[key] || "—";

const Settings = ({ batch, editable }: { batch: Batch; editable: boolean }) => {
  const [editing, setEditing] = useState<BatchSettingKey | null>(null);
  const branches = companyOf(batch.company)?.branches || [];
  const control = (key: BatchSettingKey) => {
    const done = () => setEditing(null);
    const value = String(batch.settings[key]);
    const options: { v: string; l: string }[] | null =
      key === "dateRule"
        ? [
            { v: "bill", l: "Bill date" },
            { v: "entry", l: "Date of entry" },
          ]
        : key === "tds"
          ? [
              { v: "194C", l: "194C on transporters" },
              { v: "none", l: "None" },
            ]
          : key === "gstReg"
            ? branches.map((b) => ({ v: b, l: b }))
            : key === "period"
              ? ["Jul", "Aug", "Sep", "Oct"].map((m) => ({
                  v: `${m} 2026`,
                  l: `${m} 2026`,
                }))
              : null;
    const cls =
      "h-7 w-full rounded-sm border border-pi-brand-border bg-background px-2 text-[13px] text-pi-ink focus-visible:outline-none";
    return options ? (
      <select
        id={`neo-batch-${key}`}
        autoFocus
        value={value}
        onChange={(e) => {
          setBatchSetting(
            batch.id,
            key,
            e.target.value as BatchSettings[typeof key]
          );
          done();
        }}
        onBlur={done}
        className={cls}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    ) : (
      <input
        id={`neo-batch-${key}`}
        autoFocus
        defaultValue={value}
        onBlur={(e) => {
          setBatchSetting(batch.id, key, e.target.value.trim());
          done();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") done();
          e.stopPropagation();
        }}
        className={cls}
      />
    );
  };
  return (
    <dl className="divide-y divide-panel-border">
      {(Object.keys(LABEL) as BatchSettingKey[]).map((key) => (
        <div
          key={key}
          className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-center gap-2 px-3 py-1.5"
        >
          <dt className="text-body-4 text-muted-foreground">{LABEL[key]}</dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            {editing === key ? (
              control(key)
            ) : (
              <>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => setEditing(key)}
                  title={editable ? "Change" : undefined}
                  className={cn(
                    "min-w-0 truncate rounded-sm text-left text-[13px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                    editable &&
                      "underline decoration-border decoration-dotted underline-offset-4 hover:decoration-foreground"
                  )}
                >
                  {shown(key, batch.settings)}
                </button>
                <SourceTag
                  short
                  source={batch.settingSources[key]}
                  reason={
                    key === "gstReg"
                      ? "The plant is in Karnataka, so the Karnataka registration"
                      : "Not in your instruction; my default"
                  }
                />
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/* -------------------------------------------------------------- register */

const DOT: Record<BatchRow["status"], string> = {
  ready: "bg-pi-success-dot",
  check: "bg-pi-warning-dot",
  "new-vendor": "bg-pi-warning-dot",
  "left-out": "bg-pi-danger-dot",
};
const STATUS: Record<BatchRow["status"], string> = {
  ready: "Ready",
  check: "Check",
  "new-vendor": "New vendor",
  "left-out": "Left out",
};

const Register = ({ batch, editable }: { batch: Batch; editable: boolean }) => {
  const [open, setOpen] = useState<string | null>(null);
  const picked = batch.rows.filter((r) => r.checked && r.status !== "left-out");
  const sum = (f: (r: BatchRow) => number) =>
    picked.reduce((s, r) => s + f(r), 0);
  const rec = reconcile(batch);
  return (
    <>
      <ul className="max-h-[26rem] overflow-y-auto">
        {batch.rows.map((r) => {
          const out = r.status === "left-out";
          const expanded = open === r.docId;
          return (
            <li
              key={r.docId}
              className={cn(
                "border-t border-panel-border first:border-t-0",
                out && "text-muted-foreground"
              )}
            >
              <div className="flex items-start gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  id={`neo-batch-row-${r.docId}`}
                  aria-label={`Include ${r.billNo}`}
                  checked={r.checked && !out}
                  disabled={out || !editable}
                  onChange={() => toggleRow(batch.id, r.docId)}
                  className="mt-0.5 h-4 w-4 flex-none accent-primary"
                />
                <div
                  className={cn(
                    "min-w-0 flex-1",
                    !out && !r.checked && "opacity-60"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-label-3 font-semibold">
                      {r.vendor}
                    </span>
                    <span className="flex-none text-label-3 tabular-nums">
                      {out ? "—" : inr(r.total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : r.docId)}
                    className="mt-0.5 flex w-full items-center gap-1 rounded-sm text-left text-body-4 text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  >
                    {expanded ? (
                      <ChevronDown className="h-3 w-3 flex-none" />
                    ) : (
                      <ChevronRight className="h-3 w-3 flex-none" />
                    )}
                    <span
                      className={cn("code truncate", out && "line-through")}
                    >
                      {r.billNo}
                    </span>
                    <span className="truncate">· {r.billDate}</span>
                  </button>
                  {out ? (
                    <p className="mt-0.5 text-body-4">{r.note}</p>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-4">
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <span className="truncate text-foreground">
                          {r.ledger}
                        </span>
                        <SourceTag
                          short
                          source={r.ledgerSource}
                          reason={r.note}
                        />
                      </span>
                      {r.rcm > 0 && (
                        <span className="text-muted-foreground">
                          RCM {inr(r.rcm)}
                        </span>
                      )}
                      <span className="text-muted-foreground" title={r.tdsNote}>
                        TDS {r.tds ? inr(r.tds) : "nil"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <span
                          aria-hidden
                          className={cn("size-1.5 rounded-full", DOT[r.status])}
                        />
                        {STATUS[r.status]}
                      </span>
                    </div>
                  )}
                  {expanded && (
                    <div className="mt-2 rounded-md bg-accent px-2.5 py-2">
                      {!out && (
                        <table className="w-full border-collapse text-body-4">
                          <tbody>
                            {r.lines.map((l, i) => (
                              <tr key={i} className="align-top">
                                <td className="w-6 py-0.5 text-muted-foreground">
                                  {l.side}
                                </td>
                                <td className="py-0.5 pr-2 text-foreground">
                                  {l.ledger}
                                  {l.note && (
                                    <span className="block text-muted-foreground">
                                      {l.note}
                                    </span>
                                  )}
                                </td>
                                <td className="py-0.5 text-right tabular-nums text-foreground">
                                  {inr(l.amount)}
                                </td>
                              </tr>
                            ))}
                            <tr className="border-t border-panel-border font-semibold text-foreground">
                              <td />
                              <td className="pt-1">Dr = Cr</td>
                              <td className="pt-1 text-right tabular-nums">
                                {inr(
                                  r.lines
                                    .filter((l) => l.side === "Dr")
                                    .reduce((s, l) => s + l.amount, 0)
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                      <p className="mt-1.5 text-body-4 text-muted-foreground">
                        {r.tdsNote && !out && <>TDS: {r.tdsNote}. </>}
                        {r.note && !out && <>{r.note}. </>}
                        <a
                          href={`${basePath}/docs/${r.docId}.pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          {r.file}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="border-t border-panel-border bg-accent px-3 py-2 text-body-4">
        <div className="flex justify-between gap-2 font-semibold text-foreground">
          <span>
            {picked.length} voucher{picked.length === 1 ? "" : "s"}
          </span>
          <span className="tabular-nums">{inr(sum((r) => r.total))}</span>
        </div>
        <p className="mt-0.5 text-muted-foreground">
          Taxable {inr(sum((r) => r.taxable))} · GST {inr(sum((r) => r.gst))}
          {sum((r) => r.rcm) ? ` · RCM ${inr(sum((r) => r.rcm))}` : ""} · TDS{" "}
          {inr(sum((r) => r.tds))}
        </p>
        <p className="mt-0.5 text-muted-foreground">
          Reconciles to the documents · difference {inr(rec.difference)}
        </p>
      </div>
      {batch.unreadable.length > 0 && (
        <p className="border-t border-panel-border px-3 py-2 text-body-4 text-muted-foreground">
          Not read: {batch.unreadable.join(", ")}. This prototype reads its
          sample bills only.
        </p>
      )}
    </>
  );
};

/* ---------------------------------------------------------------- drafts */

const Drafts = ({
  batch,
  onRef,
}: {
  batch: Batch;
  onRef: (ref: NeoRef) => void;
}) => {
  useStore();
  const drafts = batchDrafts(batch);
  return (
    <ul className="max-h-72 overflow-y-auto">
      {drafts.map((x) => (
        <li
          key={x.id}
          className="border-t border-panel-border first:border-t-0"
        >
          <button
            type="button"
            onClick={() =>
              onRef({ label: x.form.invoiceNo, itemId: x.id, target: "open" })
            }
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
          >
            <span className="min-w-0">
              <span className="block truncate text-label-3 font-semibold text-foreground">
                {x.form.party}
              </span>
              <span className="code block truncate text-body-4 text-muted-foreground">
                {x.form.voucherNo} · {x.form.invoiceNo}
              </span>
            </span>
            <span className="flex-none text-right text-body-4">
              <span className="block tabular-nums text-foreground">
                {inr(x.amount)}
              </span>
              <span
                className={cn(
                  x.status === "Approved"
                    ? "text-pi-success"
                    : "text-muted-foreground"
                )}
              >
                {x.status}
              </span>
            </span>
          </button>
        </li>
      ))}
      {!drafts.length && (
        <li className="px-3 py-3 text-body-4 text-muted-foreground">
          The drafts were removed.
        </li>
      )}
    </ul>
  );
};

/* ------------------------------------------------------------------ card */

/**
 * A Neo batch, drawn as paper in the chat: the settings Neo read from the
 * instruction, the voucher register to sign off, or the drafts it made. It
 * reads the batch from its store, so the card always shows the batch as it
 * stands — ticks and edits happen here while the run is waiting on it.
 */
const BatchCard = ({ card, editable, onRef }: Props) => {
  const { batches } = useBatches();
  const state = useStore();
  const batch = batches.find((b) => b.id === card.batchId);
  if (!batch) return null;
  const drafts = state.items.filter((x) => x.batch?.id === batch.id);
  const title =
    card.view === "settings"
      ? "Batch settings"
      : card.view === "register"
        ? `Purchase register · ${batch.settings.period}`
        : `Batch ${batch.id} · ${drafts.length} drafts`;
  const sub =
    card.view === "settings"
      ? `${batch.docIds.length} bills`
      : card.view === "register"
        ? `Batch ${batch.id}`
        : `${drafts.filter((x) => x.status === "Approved").length} approved · ${drafts.filter((x) => x.status !== "Approved").length} in review`;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background text-foreground">
      <div className="flex items-baseline justify-between gap-2 border-b border-panel-border px-3 py-2">
        <p className="truncate text-label-3 font-semibold">{title}</p>
        <span className="flex-none text-body-4 text-muted-foreground">
          {sub}
        </span>
      </div>
      {card.view === "settings" && (
        <Settings batch={batch} editable={editable} />
      )}
      {card.view === "register" && (
        <Register batch={batch} editable={editable} />
      )}
      {card.view === "drafts" && <Drafts batch={batch} onRef={onRef} />}
    </div>
  );
};

export default BatchCard;
