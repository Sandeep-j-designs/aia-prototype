/**
 * Neo › Agents: standing jobs Neo runs on a trigger, set up in a
 * conversation and reviewed before anything runs. An agent flags or
 * prepares drafts; approval stays with a person, as everywhere in Neo.
 *
 * DEV: GET /api/neo/agents · POST /api/neo/agents · PATCH /api/neo/agents/:id
 */

export type NeoAgentStatus = "draft" | "scheduled" | "on" | "paused";

export type NeoAgentTrigger = "bill-uploaded" | "daily" | "weekly" | "monthly";

export type NeoAgent = {
  id: string;
  company: string;
  name: string;
  description: string;
  status: NeoAgentStatus;
  trigger: NeoAgentTrigger;
  /** "flag" only raises findings; "draft" may also prepare drafts. */
  permission: "flag" | "draft";
  /** The recipe it was made from, if any. */
  recipeId?: string;
  checks: string[];
  lastRunAt?: string;
  /** Findings from the last run still waiting on a person. */
  toReview?: number;
  /** Opens a screen of its own instead of the set-up chat. */
  href?: string;
};

/** A recommended agent: an idea Neo sets up with you. */
export type NeoAgentRecipe = {
  id: string;
  name: string;
  /** The name the saved agent gets. */
  agentName: string;
  description: string;
  icon: "bill-check" | "duplicate" | "bank" | "receivables" | "gst";
  trigger: NeoAgentTrigger;
  permission: "flag" | "draft";
  checks: string[];
};

/** A built-in assistant: no set-up, it starts a chat. */
export type NeoReadyAgent = {
  id: string;
  name: string;
  description: string;
  /** What the chat is started with. */
  prompt: string;
};
