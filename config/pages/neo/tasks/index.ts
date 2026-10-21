import type { NeoAttachment, NeoContext, NeoTask } from "@/types/pages/neo";
import inboxCollection from "@/config/pages/neo/tasks/inbox-collection";
import sourceRequest from "@/config/pages/neo/tasks/source-request";
import askBooks from "./ask-books";
import batchEntry from "./batch-entry";
import batchActions from "./batch-actions";
import changeByRule from "./change-by-rule";
import createAgent from "./create-agent";
import collectionSetup from "./collection-setup";
import chase from "./chase";
import journal from "./journal";
import liveRun from "./live-run";
import salesFromPurchase from "./sales-from-purchase";
import triage from "./triage";
import reconSetup from "./recon-setup";
import reconRun from "./recon-run";
import reconClose from "./recon-close";
import reconRules from "./recon-rules";
import collections from "@/config/pages/neo/tasks/collections";
import { freightInsight, itcInsight } from "@/config/pages/neo/tasks/insights";

/**
 * Everything Neo can do in this prototype, in the order a tie is broken.
 *
 * Neo does the work no single screen can (Neo proposition, 14 Oct 2026):
 * ask the books, change by rule, chase and draft, and the day across
 * clients. Tasks that only pressed a button the screen already has —
 * approve a batch, sync, find duplicates, open the PO draft, explain a flag,
 * March provisions — were taken out; those live on their screens.
 *
 * DEV: this registry is the scripted stand-in for the model's planner. With a
 * model behind `POST /api/neo/runs`, the prompt goes to it with these as tool
 * definitions and this file is deleted.
 */
export const NEO_TASKS: NeoTask[] = [
  reconSetup,
  reconClose,
  reconRules,
  reconRun,
  collectionSetup,
  createAgent,
  batchActions,
  batchEntry,
  inboxCollection,
  sourceRequest,
  collections,
  freightInsight,
  itcInsight,
  liveRun,
  salesFromPurchase,
  journal,
  changeByRule,
  chase,
  askBooks,
  triage,
];

/**
 * What Neo can do, as example requests. When a request matches nothing, the
 * closest three are offered as one-tap chips instead of a list of features.
 */
export const NEO_EXAMPLES = [
  "Enter a batch of bills with an instruction",
  "How much did we spend with Mahindra Logistics in September?",
  "Why is freight up in September?",
  "Who owes us money?",
  "Which vendors aren't in my masters?",
  "Move all Mahindra Logistics bills from Transportation to Freight Inward",
  "Ask the vendor for their GSTIN",
  "Draft collection reminders",
  "Book depreciation of ₹12,000 on office equipment",
  "Create a sales invoice from a purchase",
  "What needs me today?",
  "Set up the Bill validator to run automatically",
  "Set up document collection",
  "Reconcile September",
];

const words = (s: string) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9₹ ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

/** The examples that share the most words with what was typed. */
export const closestExamples = (prompt: string, n = 3) => {
  const typed = words(prompt);
  return NEO_EXAMPLES.map((e) => ({
    e,
    score: [...words(e)].filter((w) => typed.has(w)).length,
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.e);
};

export const pickTask = (
  prompt: string,
  context: NeoContext,
  attachments: NeoAttachment[] = []
) => {
  const scored = NEO_TASKS.map((task) => ({
    task,
    score: task.match(prompt, context, attachments),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.task;
};
