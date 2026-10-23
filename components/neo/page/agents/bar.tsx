import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NeoMenuButton } from "@/components/neo/page";
import { MOCK_AGENTS } from "@/config/pages/neo/mock-agents";

type Props = {
  /** The agent open, if any: the bar then leads back to the directory. */
  agent?: string;
};

export const AGENTS_HREF = "/inbox?module=NEO&page=agents";
/** An agent's details, in the panel beside the directory. */
export const agentHref = (id: string) => `${AGENTS_HREF}&agent=${id}`;
/** The live agent's full page: how it works, step by step. */
export const agentPageHref = (id: string) => `${agentHref(id)}&view=page`;

/** The Agents bar: the count on the directory, a way back on an agent. */
const AgentsBar = ({ agent }: Props) => (
  <header className="flex h-12 flex-none items-center gap-2 border-b border-pi-line px-4">
    <NeoMenuButton className="-ml-2" />
    {agent ? (
      <>
        <Link
          href={AGENTS_HREF}
          className="-ml-1 flex h-8 items-center gap-1 rounded-md px-1.5 text-[14px] font-medium text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
        >
          <ChevronLeft className="h-4 w-4" />
          Agents
        </Link>
        <span aria-hidden className="text-pi-faint">
          /
        </span>
        <h1 className="truncate text-[14px] font-semibold text-pi-ink">
          {agent}
        </h1>
      </>
    ) : (
      <>
        <h1 className="text-[14px] font-semibold text-pi-ink">Agents</h1>
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-pi-fill px-1.5 text-[11.5px] font-semibold tabular-nums text-pi-body">
          {MOCK_AGENTS.length}
        </span>
      </>
    )}
  </header>
);

export default AgentsBar;
