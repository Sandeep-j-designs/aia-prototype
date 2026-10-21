import type { NeoCard, NeoDecisionItem } from "@/types/pages/neo";

type Sheet = Extract<NeoCard, { kind: "decisions" }>;

/** The pick for "Something else": the words are in the item's `note`. */
export const OTHER = "__other";

/** An item with a `when` shows only while the item it hangs on allows it. */
export const applies = (card: Sheet, item: NeoDecisionItem) =>
  !item.when ||
  item.when.in.includes(
    card.items.find((i) => i.id === item.when!.id)?.pick || ""
  );

/** Picked, and with words if the pick is "Something else". */
export const answered = (item: NeoDecisionItem) =>
  !!item.pick && (item.pick !== OTHER || !!item.note?.trim());

/**
 * Questions still without an answer. Neo leaves a question unpicked when it
 * has nothing to go on (`recommended: ""`): a guess dressed as a
 * recommendation is worse than one honest click. Submit waits for them.
 */
export const unanswered = (card?: NeoCard) =>
  card?.kind === "decisions"
    ? card.items.filter((i) => applies(card, i) && !answered(i)).length
    : 0;
