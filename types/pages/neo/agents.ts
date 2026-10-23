/**
 * The agents a workspace has (21 Oct 2026). Phase one ships one, the Three
 * Way Recon agent; the rest are planned and shown so the directory reads
 * as what it will become. Each card draws its sources meeting in one
 * point, the same "seam" the recon agent's icon and onboarding use.
 *
 * DEV: GET /api/neo/agents?company=… returns this list; availability and
 * the last run come back per company.
 */
export type AgentStatus = "live" | "beta" | "coming-soon";
export type AgentCategory = "Reconciliation" | "Bookkeeping" | "Receivables";

export type AgentSource = {
  label: string;
  /** Where it comes from: "CSV", "Tally", "GST portal". */
  from: string;
};

export type AgentProfile = {
  id: string;
  name: string;
  category: AgentCategory;
  status: AgentStatus;
  /** One sentence: what it hands you. */
  goal: string;
  /** What the sources become where they meet: "Match groups". */
  output: string;
  sources: AgentSource[];
  /** What it may do to the books, in two or three words. */
  access: string;
  skills: number;
  /** What it does, three lines at most. */
  does: string[];
  never: string[];
  /** For a planned agent: when it is expected, as product says it. */
  eta?: string;
};
