import React from "react";
import { ArrowRight } from "@/components/icons";
import { useRecon, policyOf, rulesOf } from "@/hooks/pages/neo/use-recon";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { JOBS, NEO_AGENT, SKILLS } from "@/config/pages/neo/skills";
import type {
  NeoJob,
  NeoPipelineStep,
  NeoSkillId,
} from "@/types/pages/neo/skills";
import { cn } from "@/lib/utils";
import { NeoMenuButton } from "./index";

type Props = { company: string };

const BTN =
  "inline-flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-sm border border-pi-line bg-background px-3 text-[13px] font-medium text-pi-ink transition-colors hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50";

const LIST = "overflow-hidden rounded-lg border border-pi-line bg-background";
const ROW = "border-t border-pi-line first:border-t-0";

const BY: Record<NeoPipelineStep["by"], string> = {
  model: "Skill",
  rules: "Rules",
  code: "Tool",
  person: "You",
};

/** The jobs that use a skill, by name. */
const jobsUsing = (id: NeoSkillId) =>
  JOBS.filter((j) => j.skills.includes(id)).map((j) => j.name);

const Section = ({
  id,
  title,
  lede,
  children,
}: {
  id: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) => (
  <section aria-labelledby={id} className="mt-8 first:mt-0">
    <h2 id={id} className="text-[15px] font-semibold leading-6 text-pi-ink">
      {title}
    </h2>
    <p className="mb-2.5 text-[13px] leading-5 text-pi-body">{lede}</p>
    {children}
  </section>
);

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded-xs bg-pi-fill px-1 text-[11.5px] leading-4 text-pi-body">
    {children}
  </code>
);

/**
 * Neo › Skills (21 Oct 2026, phase one: three-way reconciliation). The page
 * that answers "is that a skill or an agent?" in the brief's terms, top to
 * bottom: Neo is the one agent (its goal, what it may and never does, the
 * four statuses a row ends in); jobs are what you ask it to do and run from
 * here; skills are the model work it chooses for itself; the pipeline shows
 * where skills sit beside rules, tools and you.
 *
 * Built for a 1366px laptop first: one column of rows, no card grid.
 */
const NeoSkills = ({ company }: Props) => {
  useRecon();
  const chat = useStartChat();
  const policy = policyOf(company);
  const rules = rulesOf(company);
  const waiting = rules.filter((r) => r.state === "proposed").length;

  /** Where this job stands at this client, when there's something to say. */
  const stateOf = (j: NeoJob) => {
    if (j.id === "setup" && policy?.status === "approved")
      return `Policy v${policy.version} approved`;
    if (j.id === "learned" && rules.length)
      return `${rules.length} rule${rules.length === 1 ? "" : "s"} here${waiting ? `, ${waiting} waiting for approval` : ""}`;
    return undefined;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 flex-none items-center gap-3 border-b border-pi-line px-4">
        <NeoMenuButton className="-ml-2" />
        {/* The trail names the page; this row says what's on it. */}
        <h1 className="sr-only">Skills</h1>
        <p className="text-[13px] text-pi-body">
          One agent ·{" "}
          <span className="font-medium tabular-nums text-pi-ink">
            {JOBS.length}
          </span>{" "}
          jobs ·{" "}
          <span className="font-medium tabular-nums text-pi-ink">
            {SKILLS.length}
          </span>{" "}
          skills · type{" "}
          <kbd className="rounded-xs bg-pi-fill px-1 font-sans text-[12px] font-medium text-pi-ink">
            /
          </kbd>{" "}
          in the chat for a job
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[880px] px-4 pb-12 pt-5">
          <Section
            id="neo-agent"
            title="Neo is the agent"
            lede={`${NEO_AGENT.role}. It owns the outcome, runs the steps below, and stops to ask when the books can't answer.`}
          >
            <div className={LIST}>
              <p className="px-4 py-3 text-[14px] font-medium leading-5 text-pi-ink">
                {NEO_AGENT.goal}
              </p>
              <div className="grid border-t border-pi-line sm:grid-cols-2">
                <div className="px-4 py-3">
                  <h3 className="mb-1 text-body-4 font-semibold text-pi-faint">
                    Neo may
                  </h3>
                  <ul className="flex flex-col gap-1 text-[13px] leading-5 text-pi-ink-2">
                    {NEO_AGENT.may.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-pi-line px-4 py-3 max-sm:border-t sm:border-l">
                  <h3 className="mb-1 text-body-4 font-semibold text-pi-faint">
                    Neo never
                  </h3>
                  <ul className="flex flex-col gap-1 text-[13px] leading-5 text-pi-ink-2">
                    {NEO_AGENT.never.map((x) => (
                      <li key={x.text}>
                        {x.text}
                        {x.rule && (
                          <>
                            {" "}
                            <Code>{x.rule}</Code>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="border-t border-pi-line px-4 py-3">
                <h3 className="mb-1 text-body-4 font-semibold text-pi-faint">
                  Every row ends in one of four statuses
                </h3>
                <dl className="grid gap-x-4 gap-y-1.5 text-[13px] leading-5 sm:grid-cols-[11rem_1fr]">
                  {NEO_AGENT.statuses.map((s) => (
                    <React.Fragment key={s.id}>
                      <dt className="font-medium text-pi-ink">{s.label}</dt>
                      <dd className="text-pi-body max-sm:mb-1">{s.meaning}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
              <p className="border-t border-pi-line px-4 py-2.5 text-body-4 text-pi-body">
                Starts: {NEO_AGENT.starts.toLowerCase()}. It doesn&apos;t run on
                its own in this phase.
              </p>
            </div>
          </Section>

          <Section
            id="neo-jobs"
            title="Jobs: what you ask Neo to do"
            lede="Each job is a request to the agent, not a skill. Neo picks the skills a job needs."
          >
            <ul className={LIST}>
              {JOBS.map((j) => {
                const off = j.onlyFor?.(company);
                const now = stateOf(j);
                return (
                  <li key={j.id} className={ROW}>
                    <div className="flex items-start gap-4 px-4 py-3 max-sm:flex-col max-sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            className={cn(
                              "text-[14px] font-semibold leading-5",
                              off ? "text-pi-body" : "text-pi-ink"
                            )}
                          >
                            {j.name}
                          </span>
                          <Code>/{j.slash}</Code>
                        </p>
                        <p className="mt-0.5 text-[13px] leading-5 text-pi-body">
                          {j.does}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-4 text-pi-faint">
                          <span>{j.steps}</span>
                          <span>Skills {j.skills.join(" · ")}</span>
                          {off ? (
                            <span>{off}</span>
                          ) : (
                            now && <span className="text-pi-body">{now}</span>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!!off}
                        onClick={() => void chat(j.prompt)}
                        className={BTN}
                      >
                        Ask Neo
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            id="neo-skills"
            title="Skills: the model work Neo chooses"
            lede="A skill reads, interprets or writes, and shows its evidence. It never does the arithmetic and never posts: tools compute, rules decide what's allowed."
          >
            <ul className={LIST}>
              {SKILLS.map((k) => (
                <li key={k.id} className={ROW}>
                  <div className="flex gap-3 px-4 py-3">
                    <span className="code w-8 flex-none pt-px text-[12px] font-medium text-pi-faint">
                      {k.id}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold leading-5 text-pi-ink">
                        {k.name}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-5 text-pi-body">
                        {k.does}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-pi-ink-2">
                        <span className="font-medium">Never:</span>{" "}
                        {k.mustNot.charAt(0).toLowerCase() + k.mustNot.slice(1)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-4 text-pi-faint">
                        <span className="flex flex-wrap items-center gap-1">
                          Rules
                          {k.rules.map((r) => (
                            <Code key={r}>{r}</Code>
                          ))}
                        </span>
                        <span className="flex flex-wrap items-center gap-1">
                          Tools
                          {k.tools.map((t) => (
                            <Code key={t}>{t}</Code>
                          ))}
                        </span>
                        <span>Used in {jobsUsing(k.id).join(", ")}</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="neo-pipeline"
            title="The pipeline: who does each step"
            lede="One run, thirteen steps. A skill leads five of them; rules, tools and you lead the rest."
          >
            <ol className={LIST}>
              {NEO_AGENT.pipeline.map((s) => {
                const by = SKILLS.filter((k) => k.steps.includes(s.n));
                return (
                  <li
                    key={s.n}
                    className={cn(
                      ROW,
                      "grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-baseline gap-x-3 px-4 py-2 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,14rem)_4.5rem]"
                    )}
                  >
                    <span className="code text-[12px] tabular-nums text-pi-faint">
                      {s.n}
                    </span>
                    <span className="min-w-0 text-[13px] leading-5">
                      <span className="text-pi-ink">{s.label}</span>
                      {by.length > 0 && (
                        <span className="text-pi-faint">
                          {" "}
                          · {by.map((k) => k.id).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 truncate text-body-4 text-pi-body max-sm:hidden">
                      {s.output}
                    </span>
                    <span
                      className={cn(
                        "text-right text-body-4",
                        s.by === "model"
                          ? "font-medium text-pi-ink"
                          : "text-pi-body"
                      )}
                    >
                      {BY[s.by]}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default NeoSkills;
