import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import type {
  NeoAgentProfile,
  NeoJob,
  NeoSkill,
  NeoSkillId,
} from "@/types/pages/neo/skills";

/**
 * Neo in phase one, aligned to the AiA 2.0 PRD (v0.1) on 21 Oct 2026: one
 * agent, five skills, four jobs, the PRD's eight-step journey. The
 * definitions are in types/pages/neo/skills.ts.
 *
 * One list of jobs feeds the Agents page and the prompt box's / menu, so a
 * slash on the page is the one that works in the chat.
 *
 * DEV: GET /api/neo/agent?company=… (job availability comes back per
 * company; skills and the journey are static per release).
 */

/**
 * The PRD's end-to-end journey (section 3), the order every reconciliation
 * conversation follows. Neo marks each step in the chat as it reaches it.
 */
export const RECON_JOURNEY: {
  n: number;
  title: string;
  /** What Neo is doing on this step, as the reasoning block's name. */
  doing: string;
  /** The same, once done: the step's line in a settled reasoning block. */
  done: string;
  detail: string;
  by: "model" | "rules" | "code" | "person";
}[] = [
  {
    n: 1,
    doing: "Choosing the template",
    done: "Chose the template",
    title: "Choose a template",
    detail: "Start with a guided reconciliation setup.",
    by: "person",
  },
  {
    n: 2,
    doing: "Setting the company and period",
    done: "Set the company and period",
    title: "Select company and period",
    detail: "Define the company, dates, timezone and currency.",
    by: "person",
  },
  {
    n: 3,
    doing: "Reading three sources",
    done: "Gathered the three sources",
    title: "Provide three sources",
    detail: "Upload supported CSV files or use validated existing connectors.",
    by: "model",
  },
  {
    n: 4,
    doing: "Validating the rows",
    done: "Validated the rows",
    title: "Validate inputs",
    detail:
      "Check missing fields, duplicates, invalid dates, currencies and rejected rows.",
    by: "code",
  },
  {
    n: 5,
    doing: "Matching across all three sources",
    done: "Matched across all three sources",
    title: "Run reconciliation",
    detail:
      "Apply matching rules and connect records across all three sources.",
    by: "code",
  },
  {
    n: 6,
    doing: "Inspecting matches and exceptions",
    done: "Inspected matches and exceptions",
    title: "Inspect matches and exceptions",
    detail:
      "Review matched records, discrepancies, ambiguous candidates and missing information.",
    by: "model",
  },
  {
    n: 7,
    doing: "Resolving and reviewing",
    done: "Resolved and reviewed",
    title: "Resolve and review",
    detail:
      "Answer questions, manually link records or defer unresolved items.",
    by: "person",
  },
  {
    n: 8,
    doing: "Exporting the result",
    done: "Exported the result",
    title: "Export and reuse",
    detail:
      "Download the Excel report and reuse the confirmed configuration for future periods.",
    by: "person",
  },
];

const SETTLEMENT_ONLY = (company: string) =>
  company === NANDHINI_ID
    ? undefined
    : "For clients with bank, settlement and books data: Nandhini Deluxe";

export const NEO_AGENT: NeoAgentProfile = {
  id: "three-way-recon",
  name: "Three Way Recon agent",
  role: "Three-way reconciliation agent, read-only",
  goal: "Reconciles your bank statement, settlement reports and Tally receipts for a company and period, and hands you a reviewed result to export.",
  starts: "When you ask, in the chat or with a / command",
  may: [
    "Read bank statements, settlement reports and the books' settlement receipts (CSV)",
    "Validate every row and name the ones it can't read",
    "Link rows that share a reference and agree to the paisa",
    "Ask a focused question attached to the exceptions it would settle",
    "Record your links, deferrals and review, and export the result",
  ],
  never: [
    {
      text: "Post, create or change an accounting entry",
      rule: "A2",
    },
    {
      text: "Turn a suggestion into a match without you",
      rule: "R7",
    },
    { text: "Invent an adjustment to make amounts agree", rule: "R6" },
    {
      text: "Reuse an answer in a later run unless someone saves it",
      rule: "US-05",
    },
  ],
  statuses: [
    {
      id: "matched",
      label: "Matched",
      meaning:
        "In a match group: automatically (shared reference, equal amounts) or resolved by a person, and always labelled which.",
    },
    {
      id: "exception",
      label: "Exception",
      meaning:
        "Couldn't be matched automatically: open, or deferred with a reason. Unresolved either way.",
    },
    {
      id: "unmatched",
      label: "Unmatched",
      meaning: "Accepted, but nothing in the other sources relates to it.",
    },
    {
      id: "rejected",
      label: "Rejected",
      meaning:
        "Couldn't be read, so it's excluded and counted apart. A run with rejected rows is Partial.",
    },
  ],
  pipeline: RECON_JOURNEY.map((j) => ({
    n: j.n,
    label: j.title,
    by: j.by,
    output: j.detail,
  })),
};

export const SKILLS: NeoSkill[] = [
  {
    id: "S1",
    name: "Identify source",
    does: "Says what each file is (bank, settlement or books), whose it is and what it covers, or why it was turned away.",
    mustNot: "Read a PDF or image, or count a duplicate file twice",
    rules: ["FR-02", "A4"],
    tools: ["doc.read", "doc.fingerprint"],
    steps: [3],
  },
  {
    id: "S2",
    name: "Validate and map",
    does: "Maps a CSV's columns to the source schema and lists every rejected row with its reason.",
    mustNot: "Infer a currency or guess an ambiguous date",
    rules: ["R2", "R3", "FR-03"],
    tools: ["schema.validate"],
    steps: [4],
  },
  {
    id: "S3",
    name: "Explain matches",
    does: "Reads the engine's match groups and exceptions and says why each linked or didn't, with the rule.",
    mustNot: "Make a match, decide between candidates or invent an adjustment",
    rules: ["R4", "R5", "R6", "R7", "R8"],
    tools: ["recon.match"],
    steps: [6],
  },
  {
    id: "S4",
    name: "Ask",
    does: "Writes one focused question, attached to the exceptions it would settle, with the affected records.",
    mustNot: "Apply an answer to a later run without a separate save",
    rules: ["FR-05"],
    tools: ["run.state"],
    steps: [7],
  },
  {
    id: "S5",
    name: "Guide next step",
    does: "Tells you the one next action: the missing source, the rows to acknowledge, the review.",
    mustNot: "Show a run as ready when a source is missing",
    rules: ["FR-02", "FR-12"],
    tools: ["run.state"],
    steps: [7, 8],
  },
];

export const JOBS: NeoJob[] = [
  {
    id: "setup",
    slash: "setup",
    name: "Set up reconciliation",
    does: "Confirms the template for this company: three sources, one currency, one timezone. Also saves a run's answer for later runs.",
    prompt: "Set up reconciliation",
    steps: "Steps 01–02",
    skills: ["S5"],
    onlyFor: SETTLEMENT_ONLY,
  },
  {
    id: "recon",
    slash: "recon",
    name: "Reconcile a period",
    does: "Takes in the three sources, validates them, matches them and asks what it needs.",
    prompt: "Reconcile September",
    steps: "Steps 01–07",
    skills: ["S1", "S2", "S3", "S4", "S5"],
    onlyFor: SETTLEMENT_ONLY,
  },
  {
    id: "review",
    slash: "review",
    name: "Review a period",
    does: "Submits the current version for review, then records Reviewed, Reviewed with exceptions or Changes requested.",
    prompt: "Submit September for review",
    steps: "Step 07",
    skills: ["S5"],
    onlyFor: SETTLEMENT_ONLY,
  },
  {
    id: "export",
    slash: "export",
    name: "Export a period",
    does: "Writes the version as an Excel report: summary, exceptions, match groups and every row, with its version and review status.",
    prompt: "Export September",
    steps: "Step 08",
    skills: [],
    onlyFor: SETTLEMENT_ONLY,
  },
];

export const skillById = (id: NeoSkillId) => SKILLS.find((s) => s.id === id)!;
