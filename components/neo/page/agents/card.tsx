import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  FileCheck2,
  Files,
  Handshake,
  Landmark,
  Lock,
  PenLine,
  Play,
  ReceiptText,
} from "lucide-react";
import type { AgentProfile } from "@/types/pages/neo/agents";
import { RECON_AGENT_ID } from "@/config/pages/neo/mock-agents";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { cn } from "@/lib/utils";
import { agentHref } from "./bar";

// Short directory names and summaries; scope and permissions stay in the panel.
const COPY: Record<
  string,
  { title: string; description: string; icon: typeof Files }
> = {
  [RECON_AGENT_ID]: {
    title: "Three-way reconciliation",
    description:
      "Compare bank statements, payout reports and accounting records. See what matches and what needs review.",
    icon: Files,
  },
  "gstr-2b-itc": {
    title: "GSTR-2B matching",
    description:
      "Compare your purchase register with GSTR-2B. Review invoice differences and ITC details.",
    icon: FileCheck2,
  },
  "bank-book": {
    title: "Bank reconciliation",
    description:
      "Match your bank statement with your books and find the differences.",
    icon: Landmark,
  },
  "vendor-statement": {
    title: "Vendor statements",
    description:
      "Compare a supplier’s statement with your ledger and check the balance.",
    icon: Handshake,
  },
  "tds-26as": {
    title: "TDS reconciliation",
    description:
      "Check Form 26AS and AIS against the TDS recorded in your books.",
    icon: BookOpen,
  },
  "bill-processing": {
    title: "Bill processing",
    description:
      "Turn supplier bills into draft entries for you to review and approve.",
    icon: ReceiptText,
  },
};

const copyOf = (a: AgentProfile) =>
  COPY[a.id] ?? { title: a.name, description: a.goal, icon: Files };

export type LastRun = {
  period: string;
  version: number;
  exceptions: number;
  review: string;
};

/**
 * What an agent works from and what it hands back, drawn as the sources
 * meeting in one point — the reconciliation itself. Each source is a chip
 * with where it comes from; the lines converge on the output.
 */
const Flow = ({ agent }: { agent: AgentProfile }) => {
  const ROW = 44;
  const GAP = 10;
  const n = agent.sources.length;
  const h = n * ROW + (n - 1) * GAP;
  const mid = h / 2;
  return (
    <div
      className="flex items-center"
      aria-label={`${agent.sources.map((s) => s.label).join(", ")} into ${agent.output}`}
    >
      <ul className="flex flex-col" style={{ gap: GAP }}>
        {agent.sources.map((s, i) => (
          <li
            key={s.label}
            style={{ height: ROW, animationDelay: `${i * 60}ms` }}
            className="neo-agent-rise flex min-w-[148px] flex-col justify-center rounded-lg border border-pi-line-2 bg-background px-3 shadow-pi-1"
          >
            <span className="text-[13px] font-medium leading-4 text-pi-ink">
              {s.label}
            </span>
            <span className="text-[11px] leading-4 text-pi-faint">
              {s.from}
            </span>
          </li>
        ))}
      </ul>
      <svg
        aria-hidden
        width="72"
        height={h}
        viewBox={`0 0 72 ${h}`}
        fill="none"
        className="neo-agent-flow flex-none"
      >
        {agent.sources.map((s, i) => {
          const y = ROW / 2 + i * (ROW + GAP);
          return (
            <path
              key={s.label}
              pathLength={1}
              d={`M0 ${y} C 36 ${y}, 36 ${mid}, 72 ${mid}`}
            />
          );
        })}
      </svg>
      <span className="neo-agent-rise flex h-11 flex-none items-center gap-2 rounded-full bg-pi-brand px-4 text-[13px] font-semibold text-white shadow-pi-1 [animation-delay:240ms]">
        {agent.output}
      </span>
    </div>
  );
};

/**
 * The live agent, featured (22 Oct 2026): what it does, its sources
 * flowing into what it hands back, where the last run stands, and the two
 * ways in — run it now, or read how it works.
 */
export const FeaturedAgent = ({
  agent,
  lastRun,
  unavailable,
  selected,
}: {
  agent: AgentProfile;
  lastRun?: LastRun;
  /** Why it can't run for this client, when it can't. */
  unavailable?: string;
  selected?: boolean;
}) => {
  const chat = useStartChat();
  const copy = copyOf(agent);
  const Icon = copy.icon;
  const Access = agent.access === "Read-only" ? Lock : PenLine;
  return (
    <article
      className={cn(
        "neo-agent-featured relative overflow-hidden rounded-2xl border bg-background transition-[border-color,box-shadow]",
        selected ? "border-pi-brand ring-2 ring-pi-brand-tint" : "border-pi-line-2"
      )}
    >
      <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span
              aria-hidden
              className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-pi-brand text-white shadow-pi-1"
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pi-success-bg px-2.5 py-1 text-[11.5px] font-medium text-pi-success">
              <span className="h-1.5 w-1.5 rounded-full bg-pi-success-dot" />
              Available
            </span>
          </div>
          <h3 className="mt-5 text-[24px] font-semibold leading-8 tracking-[-0.02em] text-pi-ink">
            {copy.title}
          </h3>
          <p className="mt-2 max-w-[520px] text-[14px] leading-[22px] text-pi-body">
            {copy.description}
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-pi-body">
            <span className="inline-flex items-center gap-1.5">
              <Access className="h-3.5 w-3.5 text-pi-faint" />
              {agent.access}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="font-medium tabular-nums text-pi-ink-2">
                {agent.skills}
              </span>
              skills
            </span>
          </p>

          {lastRun && (
            <div className="mt-5 flex max-w-[520px] flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-pi-line-2 bg-pi-page px-4 py-3 text-[13px]">
              <span className="text-[12px] text-pi-faint">Last run</span>
              <span className="font-medium text-pi-ink">
                {lastRun.period}{" "}
                <span className="text-pi-faint">v{lastRun.version}</span>
              </span>
              <span className="h-3.5 w-px bg-pi-line-strong" aria-hidden />
              <span
                className={cn(
                  "tabular-nums",
                  lastRun.exceptions ? "text-pi-warning" : "text-pi-success"
                )}
              >
                {lastRun.exceptions} exceptions
              </span>
              <span className="h-3.5 w-px bg-pi-line-strong" aria-hidden />
              <span className="text-pi-body">{lastRun.review}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!!unavailable}
              title={unavailable}
              onClick={() => void chat("Reconcile September")}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground shadow-pi-1 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pi-brand focus-visible:ring-offset-2 disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Run reconciliation
            </button>
            <Link
              href={agentHref(agent.id)}
              scroll={false}
              aria-current={selected ? "true" : undefined}
              className="group inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-medium text-pi-ink-2 transition-colors hover:bg-pi-row-hover hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
            >
              How it works
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none" />
            </Link>
          </div>
        </div>

        <div className="neo-agent-stage -m-2 rounded-xl p-6 max-xl:overflow-x-auto">
          <Flow agent={agent} />
        </div>
      </div>
    </article>
  );
};

/**
 * One agent on the roadmap: what it is, what it works from and hands back,
 * and when — beta now, or the month product has given. Opens its plans in
 * the panel.
 */
export const AgentRow = ({
  agent,
  selected,
  index = 0,
}: {
  agent: AgentProfile;
  selected?: boolean;
  index?: number;
}) => {
  const copy = copyOf(agent);
  const Icon = copy.icon;
  const beta = agent.status === "beta";
  const when = agent.eta?.replace(/^Planned for\s+/i, "") || "Coming soon";
  return (
    <Link
      href={agentHref(agent.id)}
      scroll={false}
      aria-current={selected ? "true" : undefined}
      style={{ animationDelay: `${120 + index * 40}ms` }}
      className={cn(
        "neo-agent-rise group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pi-brand sm:px-5 lg:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_120px_auto]",
        selected ? "bg-pi-brand-tint" : "hover:bg-pi-row-hover"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg",
          beta ? "bg-pi-brand-tint text-pi-brand" : "bg-pi-fill text-pi-body"
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold leading-5 text-pi-ink">
          {copy.title}
        </span>
        <span className="block truncate text-[12.5px] leading-[18px] text-pi-body">
          {copy.description}
        </span>
      </span>
      <span className="hidden min-w-0 items-center gap-1.5 text-[12.5px] text-pi-body lg:flex">
        <span className="truncate">
          {agent.sources.map((s) => s.label).join(" + ")}
        </span>
        <ArrowRight className="h-3 w-3 flex-none text-pi-faint" />
        <span className="flex-none font-medium text-pi-ink-2">
          {agent.output}
        </span>
      </span>
      <span className="hidden lg:block">
        {beta ? (
          <span className="inline-flex items-center rounded-full bg-pi-brand-tint px-2.5 py-1 text-[11.5px] font-medium text-pi-brand">
            Limited beta
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-pi-faint">
            <Clock3 className="h-3.5 w-3.5" />
            {when}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 text-pi-faint transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-pi-body motion-reduce:transform-none" />
    </Link>
  );
};
