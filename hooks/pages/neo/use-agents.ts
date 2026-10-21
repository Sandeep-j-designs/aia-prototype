import { useSyncExternalStore } from "react";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { MOCK_NEO_AGENTS } from "@/config/pages/neo/mock-agents";
import type { NeoAgent } from "@/types/pages/neo/agents";

/**
 * Neo's agents, module-level like the other Neo stores, so an agent saved in
 * the chat shows on the Agents page at once. In memory, reseeded on load.
 *
 * DEV: GET /api/neo/agents?company=…; POST /api/neo/agents on save.
 */

type State = { agents: NeoAgent[] };

let state: State = { agents: [] };
let seeded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

const ensureSeeded = () => {
  if (seeded || typeof window === "undefined") return;
  seeded = true;
  // DEV: replace with GET /api/neo/agents
  state = { agents: structuredClone(MOCK_NEO_AGENTS) };
};

const subscribe = (listener: () => void) => {
  ensureSeeded();
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const snapshot = () => {
  ensureSeeded();
  return state;
};

const EMPTY: State = { agents: [] };

export const useAgents = (company: string) =>
  useSyncExternalStore(subscribe, snapshot, () => EMPTY).agents.filter(
    (a) => a.company === company
  );

export const agentById = (id: string) =>
  snapshot().agents.find((a) => a.id === id);

export const agentByName = (company: string, name: string) =>
  snapshot().agents.find(
    (a) => a.company === company && a.name.toLowerCase() === name.toLowerCase()
  );

export const agentByRecipe = (company: string, recipeId: string) =>
  snapshot().agents.find(
    (a) => a.company === company && a.recipeId === recipeId
  );

/** Save an agent Neo set up with the person; replaces one with the same id. */
export const saveAgent = (agent: NeoAgent) => {
  ensureSeeded();
  const exists = state.agents.some((a) => a.id === agent.id);
  state = {
    agents: exists
      ? state.agents.map((a) => (a.id === agent.id ? agent : a))
      : [agent, ...state.agents],
  };
  emit();
  logActivity({
    company: agent.company,
    actor: { kind: "ai", name: "Neo" },
    kind: "predicted",
    module: "Automation",
    action: exists ? "Updated agent" : "Set up agent",
    subject: agent.name,
    reason:
      agent.status === "draft"
        ? "Saved as a draft; it does not run until you turn it on"
        : "Turned on by you; it flags and drafts, never approves",
  });
};
