import React from "react";
import { Button } from "@/components/ui/button";
import FeaturePage from "@/components/inbox/v2/automation/common/feature-page";
import { actor } from "@/components/inbox/v2/store";
import {
  upcomingReturns,
  useCompanyBrief,
} from "@/hooks/pages/neo/use-firm-brief";
import { BRIEF_DEADLINE } from "@/config/pages/neo/mock-firm";
import { DEMO_TODAY } from "@/utils/pages/inbox/ai-calculations";
import type { BriefTone } from "@/types/pages/neo/brief";
import { cn } from "@/lib/utils";
import ChaseList from "@/components/neo/common/chase-list";

type Props = {
  /** Open the screen where the work is, in this company. */
  onOpen: (company: string, href: string) => void;
};

const DOT: Record<BriefTone, string> = {
  negative: "bg-pi-danger-dot",
  notice: "bg-pi-warning-dot",
  neutral: "bg-pi-line-strong",
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/**
 * Neo › Needs attention: what this company needs from a person before the
 * return is due, and its chases. Neo is one company's (20 Oct 2026), so the
 * brief is the company in the top bar; another client is another Neo. It
 * only reads: each line opens the screen where the work is done.
 */
const Brief = ({ onOpen }: Props) => {
  const { client: c, overnight } = useCompanyBrief();
  const first = actor.split(" ")[0];
  const due = new Date(
    `${BRIEF_DEADLINE.due}T00:00:00+05:30`
  ).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const needs = c ? c.signals.filter((s) => s.tone !== "neutral") : [];
  const later = c ? c.signals.filter((s) => s.tone === "neutral") : [];

  return (
    <FeaturePage title="Needs attention">
      <section className="max-w-[72ch]">
        <p className="text-body-4 text-pi-faint">
          {DEMO_TODAY.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h2 className="mt-1 text-[22px] font-semibold leading-7 tracking-tight text-pi-ink [text-wrap:balance]">
          {greeting()}, {first}.{" "}
          {needs.length
            ? `${c!.name} needs you on ${needs.length} thing${needs.length === 1 ? "" : "s"} before ${due}.`
            : `Nothing at ${c?.name || "this company"} needs you before ${due}.`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-pi-body">
          {[c?.deadline, overnight].filter(Boolean).join(" · ")}.
        </p>
      </section>

      <section aria-labelledby="brief-due">
        <h3 id="brief-due" className="mb-3 text-sm font-semibold text-pi-ink">
          Due next
        </h3>
        <ol className="grid grid-cols-2 overflow-hidden rounded-lg border border-pi-line bg-background shadow-contact md:grid-cols-4">
          {upcomingReturns().map((r, i) => (
            <li
              key={r.id}
              className={cn(
                "flex flex-col gap-0.5 border-pi-line px-4 py-3",
                i % 2 === 1 && "border-l",
                i >= 2 && "border-t md:border-t-0",
                i >= 1 && "md:border-l"
              )}
            >
              <span className="text-[13px] font-semibold text-pi-ink">
                {r.label}
              </span>
              <span className="text-body-4 text-pi-body">
                {r.period} · {r.on}
              </span>
              <span
                className={cn(
                  "text-body-4 tabular-nums",
                  r.days <= 7 ? "font-semibold text-pi-ink" : "text-pi-faint"
                )}
              >
                {r.days === 0
                  ? "Today"
                  : `${r.days} day${r.days === 1 ? "" : "s"}`}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {c && (needs.length > 0 || later.length > 0) && (
        <section aria-labelledby="brief-needs">
          <h3
            id="brief-needs"
            className="mb-3 text-sm font-semibold text-pi-ink"
          >
            What needs you
          </h3>
          <ul className="overflow-hidden rounded-lg border border-pi-line bg-background shadow-contact">
            {[...needs, ...later].map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-4 border-b border-pi-line px-5 py-3 last:border-b-0"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-[7px] flex-none rounded-full",
                    DOT[s.tone]
                  )}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1 text-[13px]",
                    s.tone === "negative"
                      ? "font-medium text-pi-ink"
                      : "text-pi-body"
                  )}
                >
                  {s.text}
                  {s.due && (
                    <span className="ml-2 text-body-4 font-normal text-pi-faint">
                      {s.due}
                    </span>
                  )}
                </span>
                <Button
                  size="sm"
                  variant={s === needs[0] ? "default" : "outline"}
                  onClick={() => onOpen(c.company, s.href)}
                >
                  Open
                </Button>
              </li>
            ))}
          </ul>
          {c.parts.length > 1 && (
            <p className="mt-2 text-body-4 text-pi-faint">
              {c.parts.map((p) => p.label).join(" · ")}. ITC at risk, bills
              waiting and money overdue are shown apart, never added.
            </p>
          )}
        </section>
      )}

      <section aria-labelledby="brief-chases">
        <h3
          id="brief-chases"
          className="mb-3 text-sm font-semibold text-pi-ink"
        >
          Chases
        </h3>
        <ChaseList onOpen={onOpen} />
      </section>
    </FeaturePage>
  );
};

export default Brief;
