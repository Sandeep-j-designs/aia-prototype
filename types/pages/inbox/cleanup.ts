/**
 * Contracts for the AI cleanup of an uploaded spreadsheet: what the AI did
 * to the file before mapping, step by step. camelCase, as the API returns it.
 */

/**
 * - applied: done to the file already (formatting the AI could fix on its own).
 * - needs-you: the AI has a fix ready; one click applies it.
 * - fixed: a needs-you step after the click.
 * - held: nothing the AI can safely do; the rows stay flagged for a person.
 */
export type CleanupStepState = "applied" | "needs-you" | "fixed" | "held";

/** One before → after example from the file. */
export type CleanupSample = {
  /** The row in the file as uploaded, 1-based, when the sample is one row. */
  row?: number;
  before: string;
  after: string;
};

export type CleanupStep = {
  id: string;
  /** What the AI did or found, past tense, accountant's voice. */
  title: string;
  /** How much of the file it touched: "27 rows", "3 customers". */
  scope?: string;
  state: CleanupStepState;
  /**
   * The AI made a judgement here (which row is the header, how a date
   * reads), so the step carries the AI mark. Mechanical fixes (stripping
   * "Cr") do not.
   */
  decided?: boolean;
  /** One line on why, shown when the step is opened. */
  detail?: string;
  samples?: CleanupSample[];
  /** The one-click fix for a needs-you step. */
  fix?: { label: string; doneLabel: string };
};
