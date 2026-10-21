import type { NeoAttachment, NeoContext, NeoTask } from "@/types/pages/neo";
import reconSetup from "./recon-setup";
import reconRun from "./recon-run";
import reconClose from "./recon-close";
import reconRules from "./recon-rules";

/**
 * Everything Neo can do in phase one (21 Oct 2026): three-way
 * reconciliation and nothing else. Each task is one job a person hands the
 * recon agent (config/pages/neo/skills.ts): set up, reconcile a period,
 * close it, review what it learned. Order breaks a tie.
 *
 * DEV: this registry is the scripted stand-in for the model's planner. With a
 * model behind `POST /api/neo/runs`, the prompt goes to it with the jobs as
 * entry points and the skills (S1–S10) as its tools, and this file is
 * deleted.
 */
export const NEO_TASKS: NeoTask[] = [
  reconSetup,
  reconClose,
  reconRules,
  reconRun,
];

/**
 * What Neo can do, as example requests. When a request matches nothing, the
 * closest three are offered as one-tap chips instead of a list of features.
 */
export const NEO_EXAMPLES = [
  "Set up reconciliation",
  "Reconcile September",
  "Close September with the 1–7 Oct statement",
  "What has Neo learned?",
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
