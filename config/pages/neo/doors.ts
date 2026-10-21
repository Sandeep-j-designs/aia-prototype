import { getState } from "@/components/inbox/v2/store";
import { agentByName } from "@/hooks/pages/neo/use-agents";
import type { NeoRef } from "@/types/pages/neo";
import { findName } from "@/utils/pages/neo";
import { closestExamples } from "./tasks";

/**
 * When Neo can't do what was asked, it still knows what the request was
 * about. A request about TDS gets the TDS agent and routine; one about 2B
 * gets GST Reconciliation; one naming a vendor gets what Neo can do for that
 * vendor. The person leaves with a door, never only "I can't".
 *
 * Matched on the nouns of the trade, not on the words of Neo's examples:
 * the old fallback ranked examples by shared words, so "reconcile TDS
 * payable" was offered a GSTIN chase.
 *
 * DEV: with a model, the model writes this answer; the topics below become
 * the tool descriptions it can point at.
 */

type Door = {
  id: string;
  test: RegExp;
  /** What Neo says, in one or two sentences. */
  say: (company: string) => string;
  links: NeoRef[];
  suggestions?: string[];
};

const AGENTS = "/inbox?module=NEO&page=skills";

const lastRun = (company: string, name: string) => {
  const agent = agentByName(company, name);
  return agent?.lastRunAt
    ? new Date(agent.lastRunAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : undefined;
};

const DOORS: Door[] = [
  {
    id: "tds",
    test: /\btds\b|\b194[a-z]?\b|\b2[46]q\b|\b26as\b|\bdeduct(ed|ion)?\b|\bwithholding\b/i,
    say: (c) => {
      const run = lastRun(c, "TDS deduction check");
      return `I don't reconcile TDS from the chat yet. **TDS deduction check** runs daily as a skill${run ? ` (last run ${run})` : ""} and flags contractor and professional bills where TDS wasn't deducted.`;
    },
    links: [
      { label: "Open Skills", href: AGENTS },
    ],
  },
  {
    id: "gst",
    test: /\bgstr|\b2b\b|\b2a\b|\bitc\b|\binput (tax )?credit\b|\breco\b|\breconcil|\brcm\b|\breverse charge\b|\bgst\b/i,
    say: () =>
      "GST reconciliation (2B against your purchase register) lives on its own screen. From here I can tell you what ITC is at risk and which bills are behind it.",
    links: [{ label: "Open GST Reconciliation", href: "/inbox?module=GST" }],
    suggestions: ["How much ITC is at risk in Q2?"],
  },
  {
    id: "bank",
    test: /\bbank\b|\bbrs\b|\bstatement\b|\bcheque\b|\bneft\b|\brtgs\b|\bupi\b/i,
    say: () =>
      "Bank matching and coding happen in Banking, where each line shows the invoices it could settle. I can't reconcile the bank from the chat yet.",
    links: [{ label: "Open Banking", href: "/inbox?module=BANK" }],
  },
  {
    id: "notes",
    test: /\bdebit note\b|\bcredit note\b|\bshort(fall)?\b|\brate difference\b/i,
    say: () =>
      "I can't raise a debit or credit note yet, but I can ask the vendor for a credit note against their bill.",
    links: [],
    suggestions: ["Ask the vendor for a credit note for the difference"],
  },
  {
    id: "journal",
    test: /\bsalar|\bpayroll\b|\bdepreciat|\bprovision|\baccru|\bprepaid\b/i,
    say: () =>
      "Month-end entries I can draft as journals: depreciation, rent, salary and insurance provisions.",
    links: [],
    suggestions: [
      "Book depreciation of ₹12,000 on office equipment",
      "Provide rent for September",
    ],
  },
];

export type Fallback = { text: string; links: NeoRef[]; suggestions: string[] };

/** What to say when no task answers the request. */
export const fallbackFor = (prompt: string, company: string): Fallback => {
  const s = getState();
  const items = s.items.filter((x) => x.company === company);
  const vendors = [
    ...new Set(items.filter((x) => x.route === "AP").map((x) => x.form.party)),
  ].filter(Boolean);
  const customers = [
    ...new Set(items.filter((x) => x.route === "AR").map((x) => x.form.party)),
  ].filter(Boolean);
  const vendor = findName(prompt, vendors);
  const customer = vendor ? undefined : findName(prompt, customers);

  const door = DOORS.find((d) => d.test.test(prompt));
  const forParty: string[] = vendor
    ? [
        `How much did we spend with ${vendor} this FY?`,
        `Ask ${vendor} for a clearer copy of the bill`,
      ]
    : customer
      ? ["Who owes us money?", "Draft collection reminders"]
      : [];
  const suggestions = [
    ...new Set([
      ...(door?.suggestions || []),
      ...forParty,
      ...(door || forParty.length ? [] : closestExamples(prompt)),
    ]),
  ].slice(0, 3);

  const text = door
    ? door.say(company)
    : vendor
      ? `I can't do that for ${vendor} yet. Here's what I can:`
      : customer
        ? `I can't do that for ${customer} yet. Here's what I can:`
        : "I can't do that yet. The nearest things I can do:";
  return { text, links: door?.links || [], suggestions };
};
