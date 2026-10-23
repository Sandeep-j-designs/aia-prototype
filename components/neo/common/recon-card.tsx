import React, { useEffect, useState } from "react";
import { ChevronRight } from "@/components/icons";
import { dayLabel } from "@/config/pages/neo/mock-recon";
import {
  EXECUTION_LABEL,
  KINDS,
  KIND_LABEL,
  REVIEW_LABEL,
  configOf,
  currentVersion,
  deferException,
  inr,
  linkException,
  liveSources,
  readiness,
  rowOf,
  totals,
  useRecon,
} from "@/hooks/pages/neo/use-recon";
import type { NeoCard, NeoRef } from "@/types/pages/neo";
import type {
  MatchGroup,
  ReconException,
  ReconRun,
  ReviewState,
  RowRef,
  RunVersion,
} from "@/types/pages/neo/recon";
import { cn } from "@/lib/utils";
import useGuide from "@/hooks/pages/guide/use-guide";
import {
  markHinted,
  useReconOnboarding,
} from "@/hooks/pages/neo/use-recon-onboarding";
import {
  DocBar,
  DocFootnotes,
  DocLede,
  DocPage,
  DocSection,
  Mark,
  NUM,
  ROW,
  TD,
  TH,
  type Tone,
} from "./doc";

type Props = {
  card: Extract<NeoCard, { kind: "recon" }>;
  onRef: (ref: NeoRef) => void;
};

/*
 * Three-way reconciliation as documents, to the AiA 2.0 PRD (aligned 21 Oct
 * 2026): the configuration (US-01), the sources and their validation
 * (US-02/03), the result with its match groups, exceptions and unmatched
 * rows (US-04–06), and the review record with every version (US-07). All
 * read live from the recon store. Rule IDs are shown, not hidden: FR-04
 * asks for them on every match group.
 */

const rupees = (n: number) => `₹${inr(n)}`;
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const BTN =
  "inline-flex h-7 items-center rounded-sm border border-pi-line bg-background px-2.5 text-[12px] font-medium text-pi-ink transition-colors hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50";
const PRIMARY =
  "inline-flex h-7 items-center rounded-sm bg-primary px-2.5 text-[12px] font-medium text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50";

const Rules = ({ ids }: { ids: string[] }) => (
  <span className="inline-flex flex-wrap gap-1">
    {[...new Set(ids)].map((r) => (
      <code
        key={r}
        className="rounded-xs bg-pi-fill px-1 text-[11px] leading-4 text-pi-body"
      >
        {r}
      </code>
    ))}
  </span>
);

const REVIEW_TONE: Record<ReviewState, Tone> = {
  "not-submitted": "wait",
  "pending-review": "warn",
  reviewed: "ok",
  "reviewed-with-exceptions": "warn",
  "changes-requested": "bad",
};

/** FR-12: three tracks, side by side, never merged into one word. */
const States = ({ run, v }: { run: ReconRun; v?: RunVersion }) => (
  <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
    <span>
      Run:{" "}
      <strong className="font-medium text-pi-ink">
        {EXECUTION_LABEL[run.execution]}
      </strong>
    </span>
    {v && (
      <>
        <span>
          Completeness:{" "}
          <strong className="font-medium text-pi-ink">
            {v.completeness === "full" ? "Full" : "Partial"}
          </strong>
        </span>
        <span>
          Review:{" "}
          <strong className="font-medium text-pi-ink">
            {REVIEW_LABEL[v.review]}
          </strong>
        </span>
      </>
    )}
  </span>
);

/** A row that opens to show its working underneath. */
const Expander = ({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-expanded={open}
    onClick={onToggle}
    className="-ml-5 flex items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
  >
    <ChevronRight
      className={cn(
        "mt-0.5 h-4 w-4 flex-none text-pi-faint transition-transform",
        open && "rotate-90"
      )}
    />
    {children}
  </button>
);

const Working = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-3 rounded-md bg-pi-fill px-4 py-3 text-body-4 leading-5 text-pi-body">
    {children}
  </div>
);

/* ======================================================== configuration */

const ConfigView = ({ company }: { company: string }) => {
  const cfg = configOf(company);
  if (!cfg) return null;
  return (
    <DocPage>
      <DocLede
        context={`Confirmed by ${cfg.confirmedBy}, ${when(cfg.confirmedAt)} · reused by every later run until changed`}
      >
        <strong>Configuration v{cfg.version}</strong> for Nandhini Deluxe:{" "}
        {cfg.template}, reconciled in {cfg.currency} on {cfg.timezone} time.
      </DocLede>
      <DocSection
        title="Required sources"
        aside={plural(cfg.sources.length, "source")}
      >
        <table className="w-full">
          <tbody>
            {cfg.sources.map((s) => (
              <tr key={s.kind} className={ROW}>
                <td className={cn(TD, "w-44 font-medium")}>{s.label}</td>
                <td className={cn(TD, "text-pi-body")}>{s.hint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>
      <DocSection
        title="Saved answers"
        aside={plural(cfg.mappings.length, "mapping")}
      >
        {cfg.mappings.length ? (
          <ul>
            {cfg.mappings.map((m) => (
              <li
                key={m.id}
                className={cn(ROW, "py-2.5 text-[13px] leading-5")}
              >
                {m.text}
                <span className="block text-body-4 text-pi-body">
                  Saved by {m.confirmedBy}, {when(m.confirmedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-[13px] text-pi-body">
            None. An answer applies only to the run it was given in until
            someone saves it here.
          </p>
        )}
      </DocSection>
      <DocFootnotes
        title="What the configuration decides"
        items={[
          {
            rule: "R1",
            severity: "default",
            text: "Each run fixes its company, currency, period, source versions and rule version. Period boundaries use this timezone.",
          },
          {
            rule: "A3",
            severity: "default",
            text: "One currency per run. A row in another currency stops the run until it's corrected.",
          },
          {
            rule: "A4",
            severity: "default",
            text: "Sources are CSV in the agreed schema. PDFs and images aren't read in this release.",
          },
          {
            rule: "US-05",
            severity: "default",
            text: "Reusing a run's answer takes a separate, authorised save.",
          },
        ]}
      />
    </DocPage>
  );
};

/* =============================================================== sources */

const SourcesView = ({ run }: { run: ReconRun }) => {
  const live = liveSources(run);
  const r = readiness(run);
  const accepted = live.reduce((n, s) => n + s.accepted.length, 0);
  const rejectedRows = live.flatMap((s) =>
    s.rejected.map((x) => ({ ...x, file: s.file }))
  );
  return (
    <DocPage>
      <DocLede
        context={
          <>
            {run.period.label} · {run.timezone} · {run.currency} ·{" "}
            <States run={run} />
          </>
        }
      >
        <strong>{plural(live.length, "source")}</strong> taken in:{" "}
        {plural(accepted, "row")} accepted, {plural(r.rejected, "row")} rejected
        {run.files.length
          ? `, ${plural(run.files.length, "file")} turned away`
          : ""}
        .
        {r.missing.length
          ? ` Not ready: no ${r.missing.map((k) => KIND_LABEL[k].toLowerCase()).join(" or ")} source.`
          : ""}
        {run.partialAck
          ? ` ${run.partialAck.actor} chose to run without ${plural(run.partialAck.excluded, "row")}; the result is Partial.`
          : ""}
      </DocLede>

      <DocSection
        title="Readiness"
        aside={
          r.missing.length || r.blockers.length
            ? "Not ready"
            : "All three sources"
        }
        tone={r.missing.length || r.blockers.length ? "bad" : "ok"}
      >
        <table className="w-full">
          <tbody>
            {KINDS.map((k) => {
              const has = live.filter((s) => s.kind === k);
              return (
                <tr key={k} className={ROW}>
                  <td className={cn(TD, "w-36 font-medium")}>
                    {KIND_LABEL[k]}
                  </td>
                  <td className={TD}>
                    {has.length ? (
                      <Mark tone="ok">{plural(has.length, "file")}</Mark>
                    ) : (
                      <Mark tone="bad">Missing: attach it as CSV</Mark>
                    )}
                  </td>
                </tr>
              );
            })}
            {r.blockers.map((b, i) => (
              <tr key={i} className={ROW}>
                <td className={cn(TD, "font-medium")}>Blocked</td>
                <td className={TD}>
                  <Mark tone="bad">{b.text}</Mark> <Rules ids={[b.rule]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>

      <DocSection title="Source versions" aside={`${accepted} rows accepted`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className={ROW}>
                <th className={TH}>File</th>
                <th className={TH}>Version</th>
                <th className={TH}>From</th>
                <th className={TH}>Coverage</th>
                <th className={cn(TH, NUM)}>Accepted</th>
                <th className={cn(TH, NUM)}>Rejected</th>
              </tr>
            </thead>
            <tbody>
              {run.sources.map((s) => {
                const replaced = !live.includes(s);
                return (
                  <tr
                    key={s.id}
                    className={cn(ROW, replaced && "text-pi-faint")}
                  >
                    <td className={TD}>
                      <span
                        className={cn(
                          "block break-all",
                          replaced && "line-through"
                        )}
                      >
                        {s.file}
                      </span>
                      <span className="block text-body-4 text-pi-body">
                        {KIND_LABEL[s.kind]} · {s.provider}
                      </span>
                    </td>
                    <td className={TD}>
                      v{s.version}
                      {replaced && (
                        <span className="block text-body-4">Replaced</span>
                      )}
                    </td>
                    <td className={cn(TD, "text-body-4 text-pi-body")}>
                      {s.uploadedBy}
                      <span className="block">{when(s.retrievedAt)}</span>
                    </td>
                    <td className={cn(TD, "whitespace-nowrap")}>
                      {s.coverage.from
                        ? `${dayLabel(s.coverage.from)}–${dayLabel(s.coverage.to)}`
                        : "—"}
                    </td>
                    <td className={cn(TD, NUM)}>{s.accepted.length}</td>
                    <td
                      className={cn(
                        TD,
                        NUM,
                        s.rejected.length &&
                          !replaced &&
                          "font-semibold text-pi-danger"
                      )}
                    >
                      {s.rejected.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DocSection>

      {rejectedRows.length > 0 && (
        <DocSection
          title="Rejected rows"
          aside={plural(rejectedRows.length, "row")}
          tone="bad"
        >
          <table className="w-full">
            <tbody>
              {rejectedRows.map((x) => (
                <tr key={`${x.file}-${x.line}`} className={ROW}>
                  <td className={cn(TD, "w-40 text-body-4 text-pi-body")}>
                    {x.file.split("-sep26")[0]}
                    <span className="block">Line {x.line}</span>
                  </td>
                  <td className={TD}>
                    {x.reason} <Rules ids={[x.rule]} />
                    <span className="block break-all text-body-4 text-pi-faint">
                      {Object.values(x.raw)
                        .filter(Boolean)
                        .slice(0, 5)
                        .join(" · ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocSection>
      )}

      {run.files.length > 0 && (
        <DocSection
          title="Files turned away"
          aside={plural(run.files.length, "file")}
        >
          <table className="w-full">
            <tbody>
              {run.files.map((f) => (
                <tr key={f.file} className={ROW}>
                  <td className={cn(TD, "w-56 break-all")}>{f.file}</td>
                  <td className={TD}>
                    <Mark tone={f.outcome === "duplicate" ? "muted" : "bad"}>
                      {f.outcome === "duplicate"
                        ? "Duplicate"
                        : "Not supported"}
                    </Mark>
                    <span className="block text-body-4 text-pi-body">
                      {f.reason} <Rules ids={[f.rule]} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocSection>
      )}
      <DocFootnotes
        items={[
          {
            rule: "R2",
            severity: "default",
            text: "Bank rows need an ID, date, amount and currency; settlements need an ID, gross, explicit adjustments and net; books need an entry ID, date, amount and the settlement reference.",
          },
          {
            rule: "R3",
            severity: "default",
            text: "Raw values are kept beside parsed ones. Dates must be in the declared format; an ambiguous date is rejected, never guessed.",
          },
          {
            rule: "FR-02",
            severity: "default",
            text: "A file with the same content as one already attached is named and its rows aren't counted twice.",
          },
        ]}
      />
    </DocPage>
  );
};

/* =============================================================== results */

const ReviewView = ({ run }: { run: ReconRun }) => {
  const v = currentVersion(run);
  if (!v) return null;
  return (
    <DocPage>
      <DocLede context={<States run={run} v={v} />}>
        Version {v.n} of {run.period.label} is{" "}
        <strong>{REVIEW_LABEL[v.review].toLowerCase()}</strong>
        {v.reviewedBy ? ` by ${v.reviewedBy}, ${when(v.reviewedAt!)}` : ""}.
        {v.reviewNote ? ` “${v.reviewNote}”` : ""} A review records what was
        seen; it doesn&apos;t post anything.
      </DocLede>
      <DocSection title="What the reviewer sees">
        <table className="w-full">
          <tbody>
            {[
              [
                "Totals",
                `${v.groups.length} match groups · ${v.exceptions.length} exceptions · ${v.unmatched.length} unmatched rows`,
              ],
              [
                "Excluded rows",
                v.completeness === "partial"
                  ? `${KINDS.reduce((n, k) => n + v.counts[k].rejected, 0)} rejected rows left out (Partial)`
                  : "None",
              ],
              [
                "Unresolved",
                v.exceptions.length
                  ? v.exceptions
                      .map(
                        (e) => `${e.label}${e.deferred ? " (deferred)" : ""}`
                      )
                      .join("; ")
                  : "None",
              ],
              ["Sources", v.sourceVersions.join("; ")],
              ["Rules", `${v.ruleVersion} · configuration v${v.configVersion}`],
            ].map(([k, val]) => (
              <tr key={k} className={ROW}>
                <td className={cn(TD, "w-32 font-medium")}>{k}</td>
                <td className={cn(TD, "text-pi-body")}>{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>
      <DocSection title="Versions" aside="Each one kept as it was">
        <table className="w-full">
          <tbody>
            {[...run.versions].reverse().map((x) => (
              <tr key={x.n} className={ROW}>
                <td className={cn(TD, "w-12 font-medium")}>v{x.n}</td>
                <td className={TD}>
                  {x.reason}
                  <span className="block text-body-4 text-pi-body">
                    {when(x.createdAt)} · {x.groups.length} groups ·{" "}
                    {x.exceptions.length} exceptions
                  </span>
                </td>
                <td className={cn(TD, "text-right")}>
                  <Mark tone={REVIEW_TONE[x.review]}>
                    {REVIEW_LABEL[x.review]}
                  </Mark>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </DocSection>
      <DocSection
        title="History"
        aside={plural(run.history.length, "entry", "entries")}
        defaultOpen={false}
      >
        <ul>
          {run.history.map((h, i) => (
            <li key={i} className={cn(ROW, "py-2 text-[13px] leading-5")}>
              {h.action}
              <span className="block break-words text-body-4 text-pi-body">
                {h.actor}, {when(h.at)}
                {h.detail ? ` · ${h.detail}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </DocSection>
      <DocFootnotes
        items={[
          {
            rule: "FR-07",
            severity: "default",
            text: "Review is separate from execution. Confirming with unresolved items requires acknowledging them and keeps the “reviewed with exceptions” label.",
          },
          {
            rule: "FR-12",
            severity: "default",
            text: "A completed version never changes. A new answer, link or deferral makes the next version, which needs its own review.",
          },
          {
            rule: "NFR-04",
            severity: "default",
            text: "Every change is recorded with who and when; the record can't be edited.",
          },
        ]}
      />
    </DocPage>
  );
};

/* ----------------------------------------------------------------- card */

const ReconCard = ({ card }: Props) => {
  const { runs } = useRecon();
  if (card.view === "config") return <ConfigView company={card.company} />;
  const run = runs.find((r) => r.id === card.runId);
  if (!run) return null;
  switch (card.view) {
    case "sources":
      return <SourcesView run={run} />;
    case "review":
      return <ReviewView run={run} />;
    default:
      return null;
  }
};

export default ReconCard;
