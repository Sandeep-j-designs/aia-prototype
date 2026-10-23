/**
 * What Neo is, in phase one (aligned to the AiA 2.0 PRD on 21 Oct 2026).
 * Five words, one meaning each:
 *
 * - Agent — Neo. One agent with one job: three-way reconciliation, read
 *   only. It takes a run from setup to an exportable, reviewed result,
 *   picks the next skill or tool, and stops to ask. It never posts.
 * - Skill — model work (S1–S5): a prompt, the tools it may call and an
 *   output schema, with evidence. A skill never matches, computes or
 *   decides a tie; the engine does. The agent chooses skills; a person
 *   never invokes one.
 * - Tool — engineered code: reads, validation, the matching engine,
 *   export. Deterministic.
 * - Rule — the PRD's matching contract (R1–R8) and requirements (FR-xx),
 *   with the company's confirmed configuration on top.
 * - Job — what a person hands the agent: set up, reconcile a period,
 *   review it, export it. The prompt box's / commands.
 *
 * DEV: GET /api/neo/agent returns the profile; skills and jobs are static
 * per release.
 */

export type NeoSkillId = "S1" | "S2" | "S3" | "S4" | "S5";

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
  /** The journey steps it works in (PRD section 3). */
  steps: number[];
};

/** A step of the PRD's journey, and who does the work in it. */
export type NeoPipelineStep = {
  n: number;
  label: string;
  /** "model" when a skill does the work; otherwise code, rules or a person. */
  by: "model" | "rules" | "code" | "person";
  output: string;
};

/** Where every source row ends (R8). */
export type NeoRowStatus = {
  id: "matched" | "exception" | "unmatched" | "rejected";
  label: string;
  meaning: string;
};

/** The agent: one goal, what it may do, what it never does. */
export type NeoAgentProfile = {
  id: string;
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
  id: "setup" | "recon" | "review" | "export";
  slash: string;
  name: string;
  does: string;
  /** The request that runs it. */
  prompt: string;
  /** The user stories it covers. */
  steps: string;
  skills: NeoSkillId[];
  /** Only some clients can use it: the reason, when this one can't. */
  onlyFor?: (company: string) => string | undefined;
};

/** Who did a step of a run: the skill, the tool, or both. */
export type NeoStepBy = { skills?: NeoSkillId[]; tools?: string[] };
