import type { NeoFrame } from "@/types/pages/neo";
import { findName } from "@/utils/pages/neo";
import { parsePeriod } from "@/utils/pages/neo/period";

/**
 * Follow-ups, read against what the conversation is about (the frame).
 *
 * "and August?", "same for Blue Dart", "only the open ones" rebuild the last
 * question with the new piece; "move them to Freight Inward" and "chase
 * them" act on the records the last answer was about. Whatever Neo takes a
 * follow-up to mean is said back to the person as a step, so a wrong reading
 * is visible at once.
 *
 * DEV: the model resolves references from history; this file goes.
 */

/** Words that only make sense as a continuation. */
const CONTINUES =
  /^(and|also|what about|how about|same for|same|now|then|ok(ay)?|only|just|but)\b|\b(them|those|these|the same)\b/i;

const PRONOUN = /\b(them|those|these|those bills|these bills|it)\b/i;

type Names = { vendors: string[]; ledgers: string[] };

export type Resolved = {
  prompt: string;
  /** Records the follow-up acts on, as if ticked. */
  selectedIds?: string[];
  /** Said back as a step: "Taken as …". */
  note: string;
};

const statusOf = (t: string): NeoFrame["status"] | undefined =>
  /\b(open|waiting|pending|unapproved|not approved|in review)\b/i.test(t)
    ? "open"
    : /\b(approved|booked|posted)\b/i.test(t)
      ? "approved"
      : undefined;

/**
 * The full request a follow-up stands for, or undefined when the message
 * stands on its own (or there is nothing to follow on from).
 */
export const resolveFollowUp = (
  text: string,
  frame: NeoFrame | null,
  names: Names
): Resolved | undefined => {
  if (!frame) return undefined;
  const t = text.trim();
  const words = t.split(/\s+/).length;
  const period = parsePeriod(t);
  const vendor = findName(t, names.vendors);
  const ledger = vendor ? undefined : findName(t, names.ledgers);
  const status = statusOf(t);
  const continues =
    CONTINUES.test(t) ||
    // "August?", "in Q2", "Blue Dart?" — a fragment that only changes a part.
    (words <= 4 && !!(period || vendor || ledger || status));
  if (!continues) return undefined;

  // Acting on the records the last answer was about.
  if (frame.ids?.length && PRONOUN.test(t)) {
    if (/\b(move|change|set|switch|re-?ledger|recode|reclass|tag)\b/i.test(t)) {
      const prompt = t
        .replace(/^(and|also|now|then|ok(ay)?)\s+/i, "")
        .replace(PRONOUN, "the selected bills");
      return {
        prompt: prompt.charAt(0).toUpperCase() + prompt.slice(1),
        selectedIds: frame.ids,
        note: `${prompt.charAt(0).toUpperCase() + prompt.slice(1)}: the ${frame.label}`,
      };
    }
    if (
      frame.kind === "overdue" &&
      /\b(remind|chase|follow up|message|whatsapp|email|nudge)\b/i.test(t)
    )
      return {
        prompt: `Draft collection reminder for ${frame.ids.join(" ")}`,
        note: `Reminders for the ${frame.ids.length} overdue invoice${frame.ids.length === 1 ? "" : "s"}`,
      };
    if (
      frame.kind === "masters" &&
      /\b(ask|chase|message|email|whatsapp|gstin)\b/i.test(t)
    )
      return {
        prompt: `ask ${frame.ids[0]} vendor for their GSTIN`,
        note: `The first vendor in ${frame.label}`,
      };
  }

  // Rebuilding a question about money with the new piece.
  if (["spend", "freight", "top"].includes(frame.kind)) {
    // A month is said back by name ("August 2026"), not as typed.
    const said = (p?: { phrase: string; label: string }) =>
      p && (/^[A-Z][a-z]+ \d{4}$/.test(p.label) ? p.label : p.phrase);
    const when = said(period) || said(frame.period);
    const only = status || frame.status;
    const tail = `${when ? ` in ${when}` : ""}${only === "open" ? ", waiting for review only" : only === "approved" ? ", approved only" : ""}`;
    if (frame.kind === "top" && !vendor && !ledger)
      return {
        prompt: `Who are my top vendors${tail}`,
        note: "top vendors",
      };
    const subject = vendor
      ? `with ${vendor}`
      : ledger
        ? `on ${ledger}`
        : frame.vendor
          ? `with ${frame.vendor}`
          : frame.ledger
            ? `on ${frame.ledger}`
            : frame.topic
              ? `on ${frame.topic}`
              : "";
    if (!subject) return undefined;
    const prompt = `How much did we spend ${subject}${tail}`;
    return { prompt, note: prompt };
  }
  return undefined;
};
