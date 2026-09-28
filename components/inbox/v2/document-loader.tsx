import { useEffect, useState } from "react";
import { Check, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  finishRouteSwitch,
  ROUTE_LABELS,
  ROUTE_SWITCH_MS,
  type Item,
  type Route,
} from "./store";
import { T } from "./ui";
import s from "./route-switch-loader.module.css";

/**
 * What a Post as change looks like while the backend re-reads the document
 * into the new voucher type — 20 seconds or more.
 *
 * Drawn in the welcome card's "How it works" language: the source document on
 * the left being scanned, the sparkle tile carrying it across, and the new
 * voucher on the right filling its rows in as each step lands. The rows use
 * the document's own values, so the wait previews the result instead of
 * decorating it.
 *
 * CSS and Lucide only. Motion is not in the production app, and this has to
 * transplant.
 */
const STEPS: Record<Route, string[]> = {
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
const STEP_LABELS = ["Re-read", "Map ledgers", "Check"];
const SOURCE_LABEL: Record<Route, string> = {
  AP: "Purchase bill",
  AR: "Sales invoice",
  JV: "Journal",
};

const money = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n
  );

/** The new voucher's rows, from the form `setRoute` already built. */
const targetRows = (item: Item, to: Route): [string, string][] => {
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

const RouteSwitchLoader = ({ item }: { item: Item }) => {
  const { from, to, startedAt, until } = item.routeSwitch!;
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 500);
    // The store's own timer is lost on reload; this one finishes the switch
    // for a page that came back mid-wait.
    const done = setTimeout(
      () => finishRouteSwitch(item.id),
      Math.max(0, until - Date.now())
    );
    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [item.id, until]);

  const elapsed = Math.max(0, now - startedAt);
  const progress = Math.min(1, elapsed / ROUTE_SWITCH_MS);
  const steps = STEPS[to];
  const step = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  const rows = targetRows(item, to);

  return (
    <div
      role="status"
      aria-live="polite"
      className={s.root}
      style={
        {
          "--elapsed": `-${elapsed}ms`,
          "--duration": `${ROUTE_SWITCH_MS}ms`,
        } as React.CSSProperties
      }
    >
      <div className={s.scene} aria-hidden>
        <div className={s.orbit} />

        <div className={cn(s.card, s.source)}>
          <span className={s.cardLabel}>
            <FileText size={12} /> {SOURCE_LABEL[from]}
          </span>
          <div className={s.party}>{item.form.party || item.file.name}</div>
          <i />
          <i />
          <i />
          <div className={s.total}>{money(item.amount)}</div>
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
            <FileText size={12} /> {ROUTE_LABELS[to]}
          </span>
          {rows.map(([label, value], index) => (
            <div
              key={label}
              className={s.row}
              data-filled={progress >= (index + 1) / (rows.length + 1)}
            >
              <span className={s.rowLabel}>{label}</span>
              <span className={s.rowValue}>{value}</span>
              <span className={s.rowSkeleton} />
            </div>
          ))}
          <div className={s.targetTotal} data-filled={progress >= 0.9}>
            <span>{money(item.amount)}</span>
            <Check size={13} />
          </div>
        </div>
      </div>

      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold text-foreground">
          Preparing this as a {ROUTE_LABELS[to]}
        </h2>
        <p className={T.value}>{steps[step]}…</p>
      </div>

      <ol className={s.stepper}>
        {STEP_LABELS.map((label, index) => (
          <li
            key={label}
            data-state={
              index < step ? "done" : index === step ? "active" : "todo"
            }
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

      <p className={cn(T.sub, "max-w-sm text-center")}>
        This takes about 20 seconds. You can open other documents in the
        meantime.
      </p>
    </div>
  );
};

export default RouteSwitchLoader;
