import type { NeoRef } from "@/types/pages/neo";
import { closestExamples } from "./tasks";
import { unavailableFor } from "./suggestions";

/**
 * When Neo can't do what was asked (21 Oct 2026, phase one: three-way
 * reconciliation only), it still knows what the request was about and
 * points to the screen that does it. The person leaves with a door, never
 * only "I can't", and with the reconciliation jobs it can run here.
 *
 * Matched on the nouns of the trade, not on the words of Neo's examples.
 *
 * DEV: with a model, the model writes this answer; the topics below become
 * the tool descriptions it can point at.
 */

type Door = {
  id: string;
  test: RegExp;
  /** Where that work lives, in one sentence. */
  say: string;
  links: NeoRef[];
};

const SCOPE =
  "In this phase I do three-way reconciliation only: POS sales, settlements and the bank.";

const DOORS: Door[] = [
  {
    id: "gst",
    test: /\bgstr|\b2b\b|\b2a\b|\bitc\b|\binput (tax )?credit\b|\brcm\b|\breverse charge\b/i,
    say: "GST reconciliation (2B against your purchase register) is on its own screen.",
    links: [{ label: "Open GST Reconciliation", href: "/inbox?module=GST" }],
  },
  {
    id: "bills",
    test: /\bbills?\b|\bvendors?\b|\bpurchases?\b|\bpayables?\b|\bmasters?\b/i,
    say: "Purchase bills are read, reviewed and approved in the Inbox.",
    links: [{ label: "Open Inbox", href: "/inbox" }],
  },
  {
    id: "sales",
    test: /\binvoices?\b|\bcustomers?\b|\bowes?\b|\boverdue\b|\breceivables?\b|\bremind/i,
    say: "Sales invoices and what customers owe are in Sales.",
    links: [{ label: "Open Sales", href: "/inbox?module=AR" }],
  },
  {
    id: "journal",
    test: /\bjournals?\b|\bsalar|\bpayroll\b|\bdepreciat|\bprovision|\baccru|\bprepaid\b/i,
    say: "Journals stay manual in this phase; reconciliation flags the ones it needs (ENT-01).",
    links: [],
  },
];

export type Fallback = { text: string; links: NeoRef[]; suggestions: string[] };

/** What to say when no job answers the request. */
export const fallbackFor = (prompt: string, company: string): Fallback => {
  const door = DOORS.find((d) => d.test.test(prompt));
  const elsewhere = unavailableFor(company);
  return {
    text: [SCOPE, door?.say, elsewhere && `${elsewhere}.`]
      .filter(Boolean)
      .join(" "),
    links: door?.links || [],
    suggestions: elsewhere ? [] : closestExamples(prompt),
  };
};
