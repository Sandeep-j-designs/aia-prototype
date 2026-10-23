import React from "react";
import {
  ArrowRight,
  Ban,
  Cog,
  Download,
  FileSpreadsheet,
  Lock,
  Play,
  User,
} from "lucide-react";
import { downloadReport, reportName } from "@/utils/pages/neo/recon-workbook";
import { NeoAgents as SeamIcon, NeoStar } from "@/components/icons";
import {
  REVIEW_LABEL,
  TEMPLATE,
  configOf,
  currentVersion,
  latestRun,
  useRecon,
} from "@/hooks/pages/neo/use-recon";
import { openReconWelcome } from "@/hooks/pages/neo/use-recon-onboarding";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import {
  NEO_AGENT,
  RECON_JOURNEY,
  SKILLS,
  JOBS,
} from "@/config/pages/neo/skills";
import { cn } from "@/lib/utils";
import AgentsBar from "./bar";

type Props = { company: string };

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-xs border border-pi-line bg-pi-head-bg px-1.5 text-[11.5px] leading-[18px] text-pi-body">
    {children}
  </code>
);

/** Who does a journey step: you, one of the agent's skills, or the engine. */
const workerOf = (step: (typeof RECON_JOURNEY)[number]) => {
  const skills = SKILLS.filter((k) => k.steps.includes(step.n));
  if (skills.length) return { kind: "skill" as const, skills };
  return step.by === "person"
    ? { kind: "you" as const, skills }
    : { kind: "code" as const, skills };
};

const WORKER = {
  you: { label: "You", icon: User, tone: "text-pi-ink-2" },
  skill: { label: "Neo", icon: NeoStar, tone: "text-pi-brand" },
  code: { label: "Engine", icon: Cog, tone: "text-pi-body" },
};

/**
 * Neo › Agents (21 Oct 2026, main column and side rail). The main column
 * reads down: who the agent is; how a run works, as the PRD's eight steps
 * on one spine with who does each — you, a skill or the engine — and each
 * skill's work and its "never" at its step; then what holds at every step.
 * The rail keeps what you act on and check: Reconcile, the facts that decide
 * whether to trust a run, the latest report, and what it reads. A roster
 * appears only when the workspace has more than one agent.
 *
 * Built for a 1366px laptop first; below 1024px the rail drops under.
 */
const ReconAgent = ({ company }: Props) => {
  useRecon();
  const chat = useStartChat();
  const agent = NEO_AGENT;
  const cfg = configOf(company);
  const run = latestRun(company, "sep");
  const v = run && currentVersion(run);
  const unavailable = JOBS[0].onlyFor?.(company);
  const status = unavailable
    ? "Not available for this client"
    : cfg
      ? "Ready"
      : "Not set up";
  const ready = status === "Ready";

  const facts: { label: string; value: React.ReactNode; note: string }[] = [
    {
      label: "Access",
      value: (
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-4 w-4 text-pi-brand" />
          Read-only
        </span>
      ),
      note: "Never posts to Tally or changes an entry",
    },
    {
      label: "Last run",
      value:
        run && v ? (
          <span className="tabular-nums">
            {v.groups.length}
            <span className="text-pi-faint"> / </span>
            <span
              className={v.exceptions.length ? "text-pi-warning" : undefined}
            >
              {v.exceptions.length}
            </span>
          </span>
        ) : (
          "None yet"
        ),
      note:
        run && v
          ? `${run.period.label} v${v.n} · matched / exceptions · ${REVIEW_LABEL[v.review]}`
          : "Reconcile a period to see its figures",
    },
    {
      label: "Configuration",
      value: cfg ? `v${cfg.version}` : "Not set",
      note: cfg
        ? `${cfg.timezone} · ${cfg.currency} · by ${cfg.confirmedBy}`
        : unavailable || "Confirmed on the first run",
    },
    {
      label: "Starts",
      value: <span className="code">/recon</span>,
      note: "Or ask in the chat, in your own words",
    },
  ];

  const download = async () => {
    if (!run || !v) return;
    await downloadReport(run, v);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AgentsBar agent={agent.name} />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-[1120px] items-start gap-x-10 gap-y-8 px-4 pb-14 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article aria-labelledby="agent-name" className="min-w-0">
            {/* Who it is. */}
            <div className="flex items-start gap-4">
              <span
                aria-hidden
                className="grid h-14 w-14 flex-none place-items-center rounded-[18px] border border-pi-brand-border bg-pi-brand-tint text-pi-brand"
              >
                <SeamIcon className="h-7 w-7" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2
                    id="agent-name"
                    className="neo-reading text-[30px] font-semibold leading-9 tracking-[-0.015em] text-pi-ink"
                  >
                    {agent.name}
                  </h2>
                  <span
                    className={cn(
                      "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-semibold",
                      ready
                        ? "border-pi-success-line bg-pi-success-bg text-pi-success"
                        : "border-pi-line bg-pi-fill text-pi-body"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        ready ? "bg-pi-success-dot" : "bg-pi-line-strong"
                      )}
                    />
                    {status}
                  </span>
                </div>
                <p className="mt-1.5 max-w-[600px] text-[14.5px] leading-[23px] text-pi-body">
                  {agent.goal}
                </p>
              </div>
            </div>

            {/* How a run works: the eight steps, who does each. */}
            <section aria-labelledby="agent-how" className="mt-10">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                <h3
                  id="agent-how"
                  className="text-[16px] font-semibold text-pi-ink"
                >
                  How it works
                </h3>
                <p className="flex items-center gap-3 text-body-4 text-pi-body">
                  {(["you", "skill", "code"] as const).map((k) => {
                    const W = WORKER[k];
                    return (
                      <span key={k} className="inline-flex items-center gap-1">
                        <W.icon className={cn("h-3.5 w-3.5", W.tone)} />
                        {k === "skill" ? "Neo's skill" : W.label}
                      </span>
                    );
                  })}
                </p>
              </div>
              <ol className="relative">
                {RECON_JOURNEY.map((j, i) => {
                  const w = workerOf(j);
                  const W = WORKER[w.kind];
                  const last = i === RECON_JOURNEY.length - 1;
                  return (
                    <li key={j.n} className="relative flex gap-4 pb-6">
                      {/* The spine between steps. */}
                      {!last && (
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-[15px] top-[34px] w-px bg-pi-line"
                        />
                      )}
                      <span
                        className={cn(
                          "relative grid h-[31px] w-[31px] flex-none place-items-center rounded-full border text-[12px] font-semibold tabular-nums",
                          w.kind === "skill"
                            ? "border-pi-brand-border bg-pi-brand-tint text-pi-brand"
                            : "border-pi-line-2 bg-background text-pi-body"
                        )}
                      >
                        {String(j.n).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1 pt-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <p className="text-[14.5px] font-semibold leading-5 text-pi-ink">
                            {j.title}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[12px] font-medium",
                              W.tone
                            )}
                          >
                            <W.icon className="h-3.5 w-3.5" />
                            {w.kind === "skill"
                              ? w.skills.map((k) => k.id).join(" · ")
                              : W.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[13px] leading-5 text-pi-body">
                          {j.detail}
                        </p>
                        {w.skills.map((k) =>
                          // A skill reads in full at its first step only.
                          k.steps[0] !== j.n ? (
                            <p
                              key={k.id}
                              className="mt-2 text-[13px] leading-5 text-pi-body"
                            >
                              <span className="code text-[12px] font-semibold text-pi-brand">
                                {k.id}
                              </span>{" "}
                              {k.name}, as in step{" "}
                              {String(k.steps[0]).padStart(2, "0")}.
                            </p>
                          ) : (
                            <div
                              key={k.id}
                              className="mt-3 rounded-xl border border-pi-line bg-background px-4 py-3"
                            >
                              <p className="flex items-baseline gap-2 text-[13.5px] font-semibold leading-5 text-pi-ink">
                                <span className="code text-[12px] text-pi-brand">
                                  {k.id}
                                </span>
                                {k.name}
                              </p>
                              <p className="mt-1 text-[13px] leading-5 text-pi-body">
                                {k.does}
                              </p>
                              <p className="mt-2 flex items-start gap-2 text-[13px] leading-5 text-pi-ink-2">
                                <Ban className="mt-[3px] h-3.5 w-3.5 flex-none text-pi-danger" />
                                <span>
                                  <span className="font-semibold text-pi-ink">
                                    Never
                                  </span>{" "}
                                  {k.mustNot.charAt(0).toLowerCase() +
                                    k.mustNot.slice(1)}
                                </span>
                              </p>
                              <p className="mt-2 flex flex-wrap gap-1">
                                {[...k.rules, ...k.tools].map((r) => (
                                  <Code key={r}>{r}</Code>
                                ))}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* What holds for the whole agent, whatever the step. */}
            <section aria-labelledby="agent-never" className="mt-4">
              <h3
                id="agent-never"
                className="mb-3 text-[16px] font-semibold text-pi-ink"
              >
                Never, at any step
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {agent.never.map((n) => (
                  <li
                    key={n.text}
                    className="flex items-start gap-2.5 rounded-xl border border-pi-line bg-background px-3.5 py-2.5"
                  >
                    <Ban className="mt-[3px] h-3.5 w-3.5 flex-none text-pi-danger" />
                    <span className="min-w-0 flex-1 text-[13.5px] leading-5 text-pi-ink">
                      {n.text}
                    </span>
                    {n.rule && <Code>{n.rule}</Code>}
                  </li>
                ))}
              </ul>
            </section>
          </article>

          {/* The rail: start it, and what decides whether to trust a run. */}
          <aside
            aria-label="Agent summary"
            className="order-first flex flex-col gap-4 lg:sticky lg:top-6 lg:order-last"
          >
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={!!unavailable}
                title={unavailable}
                onClick={() => void chat("Reconcile September")}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50"
              >
                Reconcile September
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={openReconWelcome}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-pi-line-2 bg-background px-3 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <Play className="h-3.5 w-3.5" />
                How it works
              </button>
            </div>

            <dl className="overflow-hidden rounded-xl border border-pi-line bg-background">
              {facts.map((f) => (
                <div
                  key={f.label}
                  className="border-t border-pi-line px-4 py-3 first:border-t-0"
                >
                  <dt className="text-body-4 font-medium text-pi-faint">
                    {f.label}
                  </dt>
                  <dd className="mt-0.5 text-[15px] font-semibold leading-6 text-pi-ink">
                    {f.value}
                  </dd>
                  <dd className="text-body-4 leading-[18px] text-pi-body">
                    {f.note}
                  </dd>
                </div>
              ))}
              {run && v && (
                <div className="border-t border-pi-line bg-pi-head-bg px-3 py-2.5">
                  <button
                    type="button"
                    onClick={download}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-pi-line bg-background p-2 text-left shadow-contact transition-colors hover:border-pi-line-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
                  >
                    <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-pi-fill text-pi-body">
                      <FileSpreadsheet className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold leading-4 text-pi-ink">
                        {reportName(run, v)}
                      </span>
                      <span className="block text-[11.5px] leading-4 text-pi-body">
                        Latest report · version {v.n}
                      </span>
                    </span>
                    <Download className="h-4 w-4 flex-none text-pi-body" />
                  </button>
                </div>
              )}
            </dl>

            <section
              aria-labelledby="agent-sources"
              className="overflow-hidden rounded-xl border border-pi-line bg-background"
            >
              <h3
                id="agent-sources"
                className="border-b border-pi-line px-4 py-2.5 text-body-4 font-semibold text-pi-faint"
              >
                What it reads
              </h3>
              <ul>
                {TEMPLATE.sources.map((src) => (
                  <li
                    key={src.kind}
                    className="border-t border-pi-line px-4 py-2.5 first:border-t-0"
                  >
                    <p className="flex items-center justify-between gap-3 text-[13px] font-semibold leading-5 text-pi-ink">
                      {src.label}
                      <span className="text-body-4 font-medium text-pi-faint">
                        {src.kind === "books" ? "Tally" : "CSV"}
                      </span>
                    </p>
                    <p className="text-body-4 leading-[18px] text-pi-body">
                      {src.hint}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-2 border-t border-pi-line bg-pi-head-bg px-4 py-2 text-body-4 text-pi-body">
                <SeamIcon className="h-4 w-4 text-pi-brand" />
                {TEMPLATE.name}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ReconAgent;
