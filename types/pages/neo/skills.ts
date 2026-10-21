/**
 * What Neo is, in phase one (21 Oct 2026, from "3-Way Recon Skill
 * Architecture" v3). Five words, one meaning each:
 *
 * - Agent — Neo. One agent with one goal: three-way reconciliation. It runs
 *   the pipeline, keeps the run's state, picks the next skill or tool, stops
 *   to ask, and drafts; it never posts.
 * - Skill — model work (S1–S10): a prompt, the tools it may call and an
 *   output schema. Every output carries evidence and confidence. A skill
 *   never does arithmetic and never posts. The agent chooses them; a person
 *   never invokes one directly.
 * - Tool — engineered code (books.*, recon.*, entry.*, post.*): computes,
 *   matches, drafts, posts and verifies. Deterministic.
 * - Rule — PM-owned and versioned (DOC-01, MAT-02…), with the client's
 *   approved policy and learned rules as an overlay on top.
 * - Job — what a person hands the agent: set up, reconcile a period, close
 *   it, review what it learned. The prompt box's / commands.
 *
 * DEV: GET /api/neo/agent returns the profile; skills and jobs are static
 * per release. The model's runtime registers each skill as a tool with the
 * same id.
 */

export type NeoSkillId =
  "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9" | "S10";

/** One unit of model work. */
export type NeoSkill = {
  id: NeoSkillId;
  name: string;
  /** What the model does, outcome first. */
  does: string;
  /** What it is never allowed to do. */
  mustNot: string;
  /** The PM rules that govern its output, by ID or family. */
  rules: string[];
  /** The engineered tools it may call. */
  tools: string[];
  /** The pipeline steps it works in (section 2 of the brief). */
  steps: number[];
};

/** A step of the agent's pipeline, and who does the work in it. */
export type NeoPipelineStep = {
  n: number;
  label: string;
  /** "model" when a skill does the work; otherwise code, rules or a person. */
  by: "model" | "rules" | "code" | "person";
  output: string;
};

/** The four statuses every source row ends in (section 9). */
export type NeoRowStatus = {
  id: "needs-input" | "ready" | "accounted" | "suspense";
  label: string;
  meaning: string;
};

/** The agent: one goal, what it may do, what it never does. */
export type NeoAgentProfile = {
  name: string;
  /** What kind of agent, in a few words. */
  role: string;
  goal: string;
  /** How a run starts. */
  starts: string;
  may: string[];
  never: { text: string; rule?: string }[];
  statuses: NeoRowStatus[];
  pipeline: NeoPipelineStep[];
};

/** A job a person hands the agent, typed after / in the prompt box. */
export type NeoJob = {
  id: "setup" | "recon" | "close" | "learned";
  slash: string;
  name: string;
  does: string;
  /** The request that runs it. */
  prompt: string;
  /** The pipeline steps it covers, as the brief numbers them. */
  steps: string;
  skills: NeoSkillId[];
  /** Only some clients can use it: the reason, when this one can't. */
  onlyFor?: (company: string) => string | undefined;
};

/** Who did a step of a run: the skill, the tool, or both. */
export type NeoStepBy = { skills?: NeoSkillId[]; tools?: string[] };
