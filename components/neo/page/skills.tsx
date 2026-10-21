import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import { ArrowUpRight, Search, X } from "@/components/icons";
import { useStore } from "@/components/inbox/v2/store";
import { useStartChat } from "@/hooks/pages/neo/use-start-chat";
import { useAgents } from "@/hooks/pages/neo/use-agents";
import { useCollectionAgent } from "@/hooks/pages/agents/use-collection-agent";
import { rulesOf, useRecon } from "@/hooks/pages/neo/use-recon";
import { TRIGGER_LABEL } from "@/config/pages/neo/mock-agents";
import { SKILL_GROUPS, SKILLS, type NeoSkill } from "@/config/pages/neo/skills";
import { agentFindings } from "@/utils/pages/neo/agent-findings";
import { money } from "@/utils/pages/neo";
import type { NeoAgent } from "@/types/pages/neo/agents";
import { cn } from "@/lib/utils";

type Props = { company: string };

const day = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : undefined;

const BTN =
  "inline-flex h-8 flex-none items-center gap-1.5 whitespace-nowrap rounded-sm px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-50";

/**
 * Neo › Skills (20 Oct 2026): what Neo can do for this client, grouped by
 * the work it belongs to. Neo has no agents; a check that runs on its own
 * is a skill with "Runs automatically" on, and its findings open under it.
 *
 * Each row is a skill: its name and slash (the same / works in the prompt
 * box), what it does, what it works from, what it has learned here, and
 * Use. Built for a 1366px laptop first: one column of rows, no card grid.
 */
const NeoSkills = ({ company }: Props) => {
  const router = useRouter();
  useStore();
  useRecon();
  const agents = useAgents(company);
  const collection = useCollectionAgent(company);
  const chat = useStartChat();
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<string | null>(null);

  const agentOf = (k: NeoSkill): NeoAgent | undefined =>
    k.auto?.recipe
      ? agents.find((a) => a.recipeId === k.auto!.recipe)
      : k.auto?.agentSuffix
        ? agents.find((a) => a.id.endsWith(k.auto!.agentSuffix!))
        : undefined;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILLS.filter(
      (k) =>
        !q ||
        [k.name, k.slash, k.does, k.group].some((x) =>
          x.toLowerCase().includes(q)
        )
    );
  }, [query]);

  /** The automatic part of a skill: on, a draft, or not set. */
  const autoOf = (k: NeoSkill) => {
    if (k.auto?.collection) {
      const on = collection.agent.configured;
      const draft = !on && !!collection.agent.setup;
      return {
        on,
        label: on
          ? `Runs automatically · ${collection.connected.length} channel${collection.connected.length === 1 ? "" : "s"}`
          : draft
            ? "Saved as a draft, not running"
            : undefined,
        findings: [],
        open: () =>
          on
            ? void router.push("/inbox?module=AGENTS&page=document-collection")
            : void chat(draft ? "Edit agent Document collection" : k.prompt),
      };
    }
    const a = agentOf(k);
    if (!a) return undefined;
    const on = a.status === "scheduled" || a.status === "on";
    return {
      on,
      label: on
        ? [
            `Runs automatically · ${TRIGGER_LABEL[a.trigger].toLowerCase()}`,
            a.lastRunAt && `last run ${day(a.lastRunAt)}`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Saved as a draft, not running",
      findings: agentFindings(a),
      open: () => void chat(`Edit agent ${a.name}`),
    };
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex h-12 flex-none items-center gap-3 border-b border-pi-line px-4">
        {/* The trail names the page; this row is for finding a skill. */}
        <h1 className="sr-only">Skills</h1>
        <p className="text-[13px] text-pi-body">
          <span className="font-medium tabular-nums text-pi-ink">
            {SKILLS.length}
          </span>{" "}
          skills · type{" "}
          <kbd className="rounded-xs bg-pi-fill px-1 font-sans text-[12px] font-medium text-pi-ink">
            /
          </kbd>{" "}
          in the chat for any of them
        </p>
        <label className="ml-auto flex h-8 w-56 items-center gap-2 rounded-md border border-pi-line bg-background px-2.5 text-pi-body focus-within:border-primary max-sm:w-40">
          <Search className="h-3.5 w-3.5 flex-none" />
          <span className="sr-only">Search skills</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search skills"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-pi-ink placeholder:text-pi-faint focus-visible:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="grid h-4 w-4 place-items-center rounded-sm hover:text-pi-ink"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </label>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[880px] px-4 pb-12 pt-4">
          {SKILL_GROUPS.map((g) => {
            const rows = list.filter((k) => k.group === g);
            if (!rows.length) return null;
            return (
              <section
                key={g}
                aria-labelledby={`skills-${g}`}
                className="mt-5 first:mt-0"
              >
                <h2
                  id={`skills-${g}`}
                  className="mb-1.5 text-[13px] font-semibold text-pi-ink-2"
                >
                  {g}
                </h2>
                <ul className="overflow-hidden rounded-lg border border-pi-line bg-background">
                  {rows.map((k) => {
                    const off = k.onlyFor?.(company);
                    const auto = autoOf(k);
                    const learned =
                      k.id === "recon" ? rulesOf(company).length : 0;
                    const open = shown === k.id && !!auto?.findings.length;
                    return (
                      <li
                        key={k.id}
                        className="border-t border-pi-line first:border-t-0"
                      >
                        <div className="flex items-start gap-4 px-4 py-3 max-sm:flex-col max-sm:gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-x-2">
                              <span
                                className={cn(
                                  "text-[14px] font-semibold leading-5",
                                  off ? "text-pi-body" : "text-pi-ink"
                                )}
                              >
                                {k.name}
                              </span>
                              <code className="rounded-xs bg-pi-fill px-1 text-[11.5px] leading-4 text-pi-body">
                                /{k.slash}
                              </code>
                            </p>
                            <p className="mt-0.5 text-[13px] leading-5 text-pi-body">
                              {k.does}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-body-4 text-pi-faint">
                              {off ? (
                                <span>{off}</span>
                              ) : (
                                <span>Works from: {k.needs}</span>
                              )}
                              {learned > 0 && (
                                <span className="text-pi-body">
                                  {learned} rules learned here
                                </span>
                              )}
                              {auto?.label && (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5",
                                    auto.on ? "text-pi-ink-2" : "text-pi-body"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      auto.on
                                        ? "bg-pi-success-dot"
                                        : "bg-pi-line-strong"
                                    )}
                                  />
                                  {auto.label}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-none items-center gap-1.5">
                            {!!auto?.findings.length && (
                              <button
                                type="button"
                                aria-expanded={open}
                                onClick={() =>
                                  setShown((x) => (x === k.id ? null : k.id))
                                }
                                className={cn(
                                  BTN,
                                  "border border-pi-warning-line bg-pi-warning-bg text-pi-warning hover:brightness-95"
                                )}
                              >
                                {auto.findings.length} to review
                              </button>
                            )}
                            {k.auto && (
                              <button
                                type="button"
                                disabled={!!off}
                                onClick={() =>
                                  auto ? auto.open() : void chat(k.prompt)
                                }
                                className={cn(
                                  BTN,
                                  "text-pi-body hover:bg-pi-fill hover:text-pi-ink"
                                )}
                              >
                                {auto?.on
                                  ? "Settings"
                                  : auto?.label
                                    ? "Finish set-up"
                                    : "Run automatically"}
                              </button>
                            )}
                            {!k.auto?.recipe && !k.auto?.agentSuffix && (
                              <button
                                type="button"
                                disabled={!!off}
                                title={off}
                                onClick={() =>
                                  void chat(k.prompt, { prefill: k.prefill })
                                }
                                className={cn(
                                  BTN,
                                  "border border-pi-line-2 bg-background text-pi-ink shadow-contact hover:bg-pi-fill"
                                )}
                              >
                                Use
                              </button>
                            )}
                          </div>
                        </div>
                        {open && auto && (
                          <Findings
                            findings={auto.findings}
                            onOpen={(id) =>
                              void router.push(
                                `/inbox?id=${encodeURIComponent(id)}`
                              )
                            }
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          {!list.length && (
            <p className="mt-8 text-center text-[13px] text-pi-body">
              No skill matches “{query}”.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/** What an automatic run left for a person: each bill and the check it failed. */
const Findings = ({
  findings,
  onOpen,
}: {
  findings: ReturnType<typeof agentFindings>;
  onOpen: (itemId: string) => void;
}) => (
  <ul className="border-t border-pi-line bg-pi-head-bg duration-150 animate-in fade-in-0">
    {findings.map((f) => (
      <li key={f.itemId} className="border-t border-pi-line first:border-t-0">
        <button
          type="button"
          onClick={() => onOpen(f.itemId)}
          className="group grid w-full grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-x-4 px-4 py-2.5 text-left hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none max-sm:grid-cols-[minmax(0,1fr)_auto]"
        >
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-pi-ink">
              {f.party}
            </span>
            <span className="block truncate text-body-4 text-pi-body">
              {f.ref}
            </span>
          </span>
          <span className="text-[13px] text-pi-body max-sm:col-span-2 max-sm:row-start-2">
            {f.check}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] tabular-nums text-pi-ink">
            {money(f.amount)}
            <ArrowUpRight className="h-3.5 w-3.5 text-pi-faint group-hover:text-pi-ink" />
          </span>
        </button>
      </li>
    ))}
  </ul>
);

export default NeoSkills;
