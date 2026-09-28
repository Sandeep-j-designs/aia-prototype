import { useEffect, useState } from "react";
import { Check, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  extractionTiming,
  finishRouteSwitch,
  ROUTE_LABELS,
  ROUTE_SWITCH_MS,
  type Item,
  type Route,
} from "./store";
import { T } from "./ui";
import s from "./document-loader.module.css";

/**
 * The wait while AI Accountant reads a document — the first extraction, and
 * the re-read a Post as change asks for.
 *
 * Drawn in the welcome card's "How it works" language: the source on the left
 * being scanned, the sparkle tile carrying it across, and the voucher on the
 * right filling its rows in as each step lands. Both waits share this one
 * component so they cannot drift into looking like different products.
 *
 * CSS and Lucide only. Motion is not in the production app, and this has to
 * transplant.
 */
type Row = { label: string; value?: string; filled: boolean };
type LoaderProps = {
  source: { label: string; title: string; meta?: string[]; total?: string };
  target: { label: string; rows: Row[]; total?: { text: string; filled: boolean } };
  heading: string;
  stepLabels: string[];
  steps: string[];
  step: number;
  /** For the bar: how far in, and how long the whole wait is expected to be. */
  elapsed: number;
  duration: number;
  note: string;
};

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n
  );

/** Re-renders on an interval, for anything stepped by elapsed time. */
const useNow = (ms = 500) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(tick);
  }, [ms]);
  return now;
};

const DocumentLoader = ({
  source,
  target,
  heading,
  stepLabels,
  steps,
  step,
  elapsed,
  duration,
  note,
}: LoaderProps) => (
  <div
    role="status"
    aria-live="polite"
    className={s.root}
    style={
      {
        "--elapsed": `-${Math.max(0, elapsed)}ms`,
        "--duration": `${duration}ms`,
      } as React.CSSProperties
    }
  >
    <div className={s.scene} aria-hidden>
      <div className={s.orbit} />

      <div className={cn(s.card, s.source)}>
        <span className={s.cardLabel}>
          <FileText size={12} /> {source.label}
        </span>
        <div className={s.party}>{source.title}</div>
        {source.meta?.map((line) => (
          <div key={line} className={s.meta}>
            {line}
          </div>
        ))}
        <i />
        <i />
        <i />
        {source.total && <div className={s.total}>{source.total}</div>}
        <span className={s.scan} />
      </div>

      <div className={s.flow}>
        <span />
        <span />
        <span />
      </div>
      <div className={s.sparkle}>
        <Sparkles size={20} strokeWidth={1.6} />
      </div>

      <div className={cn(s.card, s.target)}>
        <span className={cn(s.cardLabel, s.targetLabel)}>
          <FileText size={12} /> {target.label}
        </span>
        {target.rows.map((row) => (
          <div key={row.label} className={s.row} data-filled={row.filled}>
            <span className={s.rowLabel}>{row.label}</span>
            <span className={s.rowValue}>{row.value}</span>
            <span className={s.rowSkeleton} />
          </div>
        ))}
        {target.total && (
          <div className={s.targetTotal} data-filled={target.total.filled}>
            <span>{target.total.text}</span>
            <Check size={13} />
          </div>
        )}
      </div>
    </div>

    <div className="space-y-1 text-center">
      <h2 className="text-base font-semibold text-foreground">{heading}</h2>
      <p className={T.value}>{steps[step]}…</p>
    </div>

    <ol className={s.stepper}>
      {stepLabels.map((label, index) => (
        <li
          key={label}
          data-state={index < step ? "done" : index === step ? "active" : "todo"}
        >
          <span className={s.marker}>
            {index < step ? <Check size={11} /> : index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>

    <div className={s.bar}>
      <span />
    </div>

    <p className={cn(T.sub, "max-w-sm text-center")}>{note}</p>
  </div>
);

/* ------------------------------------------------------------ type switch */

const SWITCH_STEPS: Record<Route, string[]> = {
  AP: [
    "Reading the document again",
    "Matching the vendor and expense ledgers",
    "Checking GST and totals",
  ],
  AR: [
    "Reading the document again",
    "Matching the customer and income ledgers",
    "Checking GST and totals",
  ],
  JV: [
    "Reading the document again",
    "Setting up the debit and credit lines",
    "Checking the journal balances",
  ],
};
const SOURCE_LABEL: Record<Route, string> = {
  AP: "Purchase bill",
  AR: "Sales invoice",
  JV: "Journal",
};

/** The new voucher's rows, from the form `setRoute` already built. */
const switchRows = (item: Item, to: Route): [string, string][] => {
  const f = item.form;
  const pending = "For your review";
  if (to === "JV") {
    const dr = f.lines.find((l) => l.dr > 0);
    const cr = f.lines.find((l) => l.cr > 0);
    return [
      ["Dr", dr?.ledger || pending],
      ["Cr", cr?.ledger || pending],
      ["Difference", money(0)],
    ];
  }
  return [
    [to === "AR" ? "Customer" : "Vendor", f.party || pending],
    [to === "AR" ? "Income" : "Expense", f.lines[0]?.ledger || pending],
    ["GST", f.gst || pending],
  ];
};

export const RouteSwitchLoader = ({ item }: { item: Item }) => {
  const { from, to, startedAt, until } = item.routeSwitch!;
  const now = useNow();
  useEffect(() => {
    // Belt and braces beside the store's own timer.
    const done = setTimeout(
      () => finishRouteSwitch(item.id),
      Math.max(0, until - Date.now())
    );
    return () => clearTimeout(done);
  }, [item.id, until]);

  const elapsed = Math.max(0, now - startedAt);
  const progress = Math.min(1, elapsed / ROUTE_SWITCH_MS);
  const steps = SWITCH_STEPS[to];
  const rows = switchRows(item, to);
  return (
    <DocumentLoader
      source={{
        label: SOURCE_LABEL[from],
        title: item.form.party || item.file.name,
        total: money(item.amount),
      }}
      target={{
        label: ROUTE_LABELS[to],
        rows: rows.map(([label, value], index) => ({
          label,
          value,
          filled: progress >= (index + 1) / (rows.length + 1),
        })),
        total: { text: money(item.amount), filled: progress >= 0.9 },
      }}
      heading={`Preparing this as a ${ROUTE_LABELS[to]}`}
      stepLabels={["Re-read", "Map ledgers", "Check"]}
      steps={steps}
      step={Math.min(steps.length - 1, Math.floor(progress * steps.length))}
      elapsed={elapsed}
      duration={ROUTE_SWITCH_MS}
      note="This takes about 20 seconds. You can open other documents in the meantime."
    />
  );
};

/* ------------------------------------------------------------- extraction */

const EXTRACT_STEPS = [
  "Reading the document",
  "Pulling out the party, dates and amounts",
  "Suggesting the voucher type and ledgers",
];
const CHANNEL: Record<Item["source"], string> = {
  email: "via Email",
  whatsapp: "via WhatsApp",
  upload: "Uploaded",
};

/**
 * The first read of a document. Nothing is known about it yet, so the voucher
 * on the right keeps its placeholders — filling them with guesses would claim
 * a reading that hasn't happened.
 */
export const ExtractionLoader = ({ item }: { item: Item }) => {
  const now = useNow();
  const queued = item.status === "Received";
  const timing = extractionTiming(item.id);
  const elapsed = timing ? now - timing.startedAt : 0;
  const duration = timing?.duration ?? 3000;
  const progress = Math.min(1, elapsed / duration);
  const step = queued
    ? 0
    : Math.min(EXTRACT_STEPS.length - 1, Math.floor(progress * EXTRACT_STEPS.length));
  return (
    <DocumentLoader
      source={{
        label: item.file.ext.toUpperCase() || "File",
        title: item.file.name,
        meta: [item.file.size, CHANNEL[item.source]].filter(Boolean) as string[],
      }}
      target={{
        label: "Preparing voucher",
        rows: ["Party", "Voucher type", "Amount"].map((label) => ({
          label,
          filled: false,
        })),
      }}
      heading={`Reading ${item.file.name}`}
      stepLabels={["Read", "Extract", "Suggest voucher"]}
      steps={
        queued
          ? ["Queued, starting shortly", ...EXTRACT_STEPS.slice(1)]
          : EXTRACT_STEPS
      }
      step={step}
      elapsed={elapsed}
      duration={duration}
      note="The review form opens here as soon as it’s ready. You can open other documents in the meantime."
    />
  );
};
