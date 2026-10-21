import { getState, type Item } from "@/components/inbox/v2/store";
import type {
  NeoAction,
  NeoDecisionItem,
  NeoOption,
  NeoRef,
  NeoTaskApi,
} from "@/types/pages/neo";
import { findItemId, money } from "@/utils/pages/neo";
import { OTHER } from "@/utils/pages/neo/decisions";

/**
 * What the scripted tasks share: reading the store the way the screens do,
 * and naming documents the way an accountant would.
 *
 * DEV: these reads become the agent's read tools —
 *   GET /api/inbox/items?company=…   (listItems)
 *   GET /api/inbox/items/:id         (getItem)
 */

/** The current company's documents, the books excluded. */
export const companyItems = () => {
  const s = getState();
  return s.items.filter((x) => x.company === s.company && !x.priorVoucher);
};

export const getItem = (id?: string) =>
  id ? getState().items.find((x) => x.id === id) : undefined;

export const ROUTE_WORD = {
  AP: "purchase",
  AR: "sales invoice",
  JV: "journal",
};

/**
 * How a document is named to a person. Seeded documents have short ids
 * (INB-2041); a fresh upload's id is a UUID nobody should have to read, so it
 * goes by its invoice or voucher number instead.
 */
export const label = (x: Item) =>
  /^(DEMO|SPLIT|NEO)-/.test(x.id)
    ? x.form.voucherNo || x.form.invoiceNo || x.file.name
    : x.id;

/** "Dell India Pvt Ltd · INV-1182" — how a document reads in a sentence. */
export const describe = (x: Item) =>
  `${x.form.party || x.file.name}${x.form.invoiceNo && x.form.invoiceNo !== x.id ? ` · ${x.form.invoiceNo}` : ""}`;

export const refTo = (x: Item, target: NeoRef["target"] = "open"): NeoRef => ({
  label: label(x),
  itemId: x.id,
  target,
});

export const optionFor = (x: Item): NeoOption => ({
  id: x.id,
  label: describe(x),
  hint: `${label(x)} · ${money(x.amount)}`,
});

export const isOpen = (x: Item) =>
  ["Needs Review", "Duplicate"].includes(x.status);

/**
 * The document a prompt is about: an id typed into it, else the record on
 * screen, else the first ticked row — filtered to what the task can use.
 * Returns undefined when none of those fit, and the task asks.
 */
export const resolveItem = (api: NeoTaskApi, accept: (x: Item) => boolean) => {
  const items = companyItems();
  const typed = findItemId(
    api.prompt,
    items.map((x) => x.id)
  );
  const candidates = [
    typed,
    api.context.itemId,
    ...api.context.selectedIds,
  ].filter(Boolean) as string[];
  for (const id of candidates) {
    const x = items.find((i) => i.id === id);
    if (x && accept(x)) return x;
  }
  return undefined;
};

/** Ask the user to pick one document out of a few. */
export const pickItem = async (
  api: NeoTaskApi,
  question: string,
  pool: Item[]
) => {
  const id = await api.ask(question, pool.slice(0, 4).map(optionFor));
  return getItem(id);
};

/** The sum of a list of documents, for a group heading. */
export const total = (xs: Item[]) => xs.reduce((s, x) => s + x.amount, 0);

/**
 * Ask everything at once (20 Oct 2026): one decision sheet with Neo's picks
 * filled in and what the books settle folded away, confirmed by one button
 * that also carries the run's sign-off. Returns the button and the answers.
 *
 * `items` take `recommended` as their starting pick. A one-option question
 * is not a question: leave it out and say what Neo did instead.
 */
export const decide = async (
  api: NeoTaskApi,
  title: string,
  items: Omit<NeoDecisionItem, "pick">[],
  actions: NeoAction[]
) => {
  const card = {
    kind: "decisions" as const,
    title,
    // "Recommended" on the sheet says it; the hint keeps only the reason.
    items: items.map((i) => ({
      ...i,
      pick: i.recommended,
      options: i.options.map((o) => ({
        ...o,
        hint:
          o.hint
            ?.replace(/^Suggested(:\s*|\s*$)/i, "")
            .replace(/^./, (c) => c.toUpperCase()) || undefined,
      })),
    })),
  };
  const choice = await api.card(card, actions);
  // "Something else" hands the task its fallback pick and your words.
  const picks: Record<string, string> = {};
  const notes: Record<string, string> = {};
  for (const i of card.items) {
    if (i.pick === OTHER && i.other) {
      picks[i.id] = i.other.fallback;
      if (i.note?.trim()) notes[i.id] = i.note.trim();
    } else picks[i.id] = i.pick;
  }
  return { choice, picks, notes };
};
