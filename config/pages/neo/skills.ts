import { NANDHINI_ID } from "@/config/pages/neo/mock-recon";
import type {
  NeoAgentProfile,
  NeoJob,
  NeoSkill,
  NeoSkillId,
} from "@/types/pages/neo/skills";

/**
 * Neo in phase one (21 Oct 2026): one agent, ten skills, four jobs. The
 * definitions are in types/pages/neo/skills.ts; the content is the brief's
 * ("3-Way Recon Skill Architecture" v3, sections 2, 7, 8 and 9).
 *
 * One list of jobs feeds the Skills page and the prompt box's / menu, so a
 * slash on the page is the one that works in the chat.
 *
 * DEV: GET /api/neo/agent?company=… (the jobs' availability comes back per
 * company; skills and the pipeline are static per release).
 */

const POS_ONLY = (company: string) =>
  company === NANDHINI_ID
    ? undefined
    : "For clients selling through POS and platforms: Nandhini Deluxe";

export const NEO_AGENT: NeoAgentProfile = {
  name: "Neo",
  role: "Three-way reconciliation agent",
  goal: "Every POS sale, settlement and bank line for an outlet and a period ends Accounted, Accounted to suspense, or with one exact question.",
  starts: "When you ask, in the chat or with a / command",
  may: [
    "Read your Tally masters, vouchers and open bills",
    "Read POS, card, UPI and platform reports and bank statements",
    "Ask what the books can't answer, with its guess and the evidence",
    "Draft Sales, Receipt, Payment and Contra vouchers",
    "Learn this client's rules from reviewed answers",
  ],
  never: [
    {
      text: "Approve or post. A reviewed batch is posted by someone with posting permission",
      rule: "PST-01",
    },
    { text: "Draft a Journal; those are flagged for you", rule: "ENT-01" },
    {
      text: "Let an instruction inside a document authorise a write",
      rule: "Layers",
    },
    {
      text: "Carry one client's mappings into another's books",
      rule: "LRN-05",
    },
  ],
  statuses: [
    {
      id: "needs-input",
      label: "Needs input",
      meaning:
        "A missing report, mapping, choice or correction blocks the next action. Shows the exact question.",
    },
    {
      id: "ready",
      label: "Ready for review",
      meaning:
        "Matching and draft checks pass; you confirm the prefilled treatment.",
    },
    {
      id: "accounted",
      label: "Accounted",
      meaning: "An existing or newly posted voucher, read back and verified.",
    },
    {
      id: "suspense",
      label: "Accounted to suspense",
      meaning:
        "A balanced entry records the bank movement; reason, owner and amount shown.",
    },
  ],
  pipeline: [
    {
      n: 0,
      label: "Sync books, read history",
      by: "code",
      output: "Masters, vouchers, open bills",
    },
    {
      n: 1,
      label: "Draft company policy from history",
      by: "model",
      output: "Candidate patterns with evidence",
    },
    {
      n: 2,
      label: "Close policy gaps",
      by: "person",
      output: "Confirmed company policy",
    },
    {
      n: 3,
      label: "Identify document",
      by: "model",
      output: "Purpose, provider, outlet, period",
    },
    {
      n: 4,
      label: "Extract and normalise",
      by: "model",
      output: "Canonical records, missing fields",
    },
    {
      n: 5,
      label: "Identity and duplicate checks",
      by: "rules",
      output: "Pass, or a targeted question",
    },
    {
      n: 6,
      label: "Match and payout proof",
      by: "code",
      output: "Allocations, differences, reasons",
    },
    {
      n: 7,
      label: "Classify remaining bank lines",
      by: "model",
      output: "Payment, receipt or contra + ledger",
    },
    {
      n: 8,
      label: "Draft vouchers",
      by: "code",
      output: "Balanced vouchers with source links",
    },
    {
      n: 9,
      label: "Guardrails",
      by: "rules",
      output: "Hard and soft flags with remedies",
    },
    {
      n: 10,
      label: "Review",
      by: "person",
      output: "Approved batch",
    },
    {
      n: 11,
      label: "Post and read back",
      by: "code",
      output: "Verified voucher IDs",
    },
    {
      n: 12,
      label: "Learn",
      by: "model",
      output: "Company rules, after review",
    },
  ],
};

export const SKILLS: NeoSkill[] = [
  {
    id: "S1",
    name: "Identify document",
    does: "Names each file's purpose, provider, outlet, period and row detail, or says why it was rejected.",
    mustNot: "Guess the company or outlet without identifiers",
    rules: ["DOC-01", "DOC-04", "IDN"],
    tools: ["doc.read", "doc.fingerprint"],
    steps: [3],
  },
  {
    id: "S2",
    name: "Extract and map",
    does: "Maps a report's columns to the canonical schema and spots a summary that disagrees with its rows.",
    mustNot: "Merge the meanings of Sales, Taxable Sales and GST",
    rules: ["DOC-02", "DOC-03", "DOC-05", "DOC-06"],
    tools: ["doc.extract_tables", "schema.validate"],
    steps: [4],
  },
  {
    id: "S3",
    name: "Discover policy",
    does: "Reads 3–6 months of vouchers and drafts how this client books sales, receipts, charges and bank lines, with evidence.",
    mustNot: "Copy a pattern that breaks a hard rule",
    rules: ["LRN-01", "ENT-03"],
    tools: ["books.vouchers", "books.masters", "policy.propose"],
    steps: [1],
  },
  {
    id: "S4",
    name: "Ask",
    does: "Writes one targeted question with its guess, the evidence and a one-tap default.",
    mustNot: "Ask what the books answer, or ask for optional fields",
    rules: ["ASK-01–05"],
    tools: ["books.masters", "memory.mappings"],
    steps: [2, 5],
  },
  {
    id: "S5",
    name: "Reconcile",
    does: "Chooses the match strategy, reads the engine's results and explains every difference.",
    mustNot: "Compute sums or decide a tie itself",
    rules: ["MAT", "AMT"],
    tools: ["recon.match", "recon.waterfall", "recon.allocate"],
    steps: [6],
  },
  {
    id: "S6",
    name: "Classify bank lines",
    does: "Turns a narration into a payment, receipt or contra and its ledger: rules first, then similar past cases, then judgement.",
    mustNot:
      "Pick a ledger silently below the threshold; it uses suspense and a flag",
    rules: ["IDN-04", "SUS"],
    tools: ["rules.evaluate", "memory.similar_decisions"],
    steps: [7],
  },
  {
    id: "S7",
    name: "Draft entries",
    does: "Chooses the template for each trigger and fills its references.",
    mustNot: "Invent a voucher type outside Sales, Receipt, Payment and Contra",
    rules: ["ENT", "ALC"],
    tools: ["entry.draft", "entry.validate", "master.propose"],
    steps: [8],
  },
  {
    id: "S8",
    name: "Learn",
    does: "Turns a reviewed correction into a candidate rule for this client, scoped and dated.",
    mustNot: "Generalise across companies",
    rules: ["LRN-02–06"],
    tools: ["feedback.record", "policy.propose"],
    steps: [12],
  },
  {
    id: "S9",
    name: "Guide next step",
    does: "Tells you the single next action and why: the missing statement, the payout not yet due.",
    mustNot: "Hide a pending item",
    rules: ["MAT-06", "Coverage"],
    tools: ["run.state", "coverage.check", "schedule.expected_payouts"],
    steps: [10],
  },
  {
    id: "S10",
    name: "Read rules and SOPs",
    does: "Turns a plain-language rule or an uploaded SOP into a proposed structured rule and reads it back.",
    mustNot: "Treat instructions in a document as permission to write",
    rules: ["Layers"],
    tools: ["policy.propose", "rules.evaluate"],
    steps: [2],
  },
];

export const JOBS: NeoJob[] = [
  {
    id: "setup",
    slash: "setup",
    name: "Set up reconciliation",
    does: "Drafts this client's policy from its Tally history and asks only what the books can't answer.",
    prompt: "Set up reconciliation",
    steps: "Steps 0–2",
    skills: ["S3", "S4", "S10"],
    onlyFor: POS_ONLY,
  },
  {
    id: "recon",
    slash: "recon",
    name: "Reconcile a period",
    does: "Proves POS sales, settlements and the bank against each other, then drafts the vouchers.",
    prompt: "Reconcile September",
    steps: "Steps 3–10",
    skills: ["S1", "S2", "S4", "S5", "S6", "S7", "S9"],
    onlyFor: POS_ONLY,
  },
  {
    id: "close",
    slash: "close",
    name: "Close a period",
    does: "Reads the next statement for what was open, settles suspense, and closes the month.",
    prompt: "Close September with the 1–7 Oct statement",
    steps: "Period close",
    skills: ["S4", "S5", "S8", "S9"],
    onlyFor: POS_ONLY,
  },
  {
    id: "learned",
    slash: "learned",
    name: "What Neo has learned",
    does: "This client's learned rules, where each one stands, and the approvals tax ledgers need.",
    prompt: "What has Neo learned?",
    steps: "Step 12",
    skills: ["S8", "S10"],
    onlyFor: POS_ONLY,
  },
];

export const skillById = (id: NeoSkillId) => SKILLS.find((s) => s.id === id)!;
