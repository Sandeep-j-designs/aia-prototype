import { getState, type Item } from "@/components/inbox/v2/store";
import type { NeoAgent } from "@/types/pages/neo/agents";

/**
 * What an agent found on its last run: the records waiting on a person,
 * each with the check it failed. Worked out from the books as they stand,
 * with the agent's own checks, so "5 to review" is a list that opens.
 *
 * DEV: GET /api/neo/agents/:id/findings — the agent's run log, open items.
 */
export type AgentFinding = {
  itemId: string;
  party: string;
  ref: string;
  amount: number;
  /** The check it failed, in the agent's words. */
  check: string;
};

const open = (x: Item) =>
  ["Needs Review", "Duplicate", "Failed"].includes(x.status) && !x.priorVoucher;

/** The first check a bill fails, for a bill validator. */
const billCheck = (x: Item) =>
  x.status === "Duplicate"
    ? "Same vendor and invoice number as another bill"
    : x.status === "Failed"
      ? "Attachment couldn't be read"
      : x.original.bill?.vendorMissing
        ? "Vendor not in masters, so no GSTIN to check"
        : !x.form.invoiceNo
          ? "No supplier invoice number"
          : !x.form.date
            ? "No bill date"
            : undefined;

/** Contract-type work over the 194C single-bill limit, with no TDS line. */
const tdsCheck = (x: Item) => {
  const contract = x.form.lines.some((l) =>
    /freight|transport|cartage|contract|labour|repair|maintenance|professional|consult/i.test(
      `${l.ledger} ${l.description || ""}`
    )
  );
  const deducted = x.form.lines.some((l) => /tds/i.test(l.ledger || ""));
  if (!contract || deducted || x.amount <= 30000) return undefined;
  return /professional|consult/i.test(x.form.lines[0]?.ledger || "")
    ? "194J: professional fees with no TDS line"
    : "194C: over ₹30,000 in one bill with no TDS line";
};

export const agentFindings = (agent: NeoAgent): AgentFinding[] => {
  const items = getState().items.filter(
    (x) =>
      x.company === agent.company && x.route === "AP" && x.status !== "Deleted"
  );
  const rule: ((x: Item) => string | undefined) | undefined =
    agent.recipeId === "validate-bills"
      ? (x) => (open(x) ? billCheck(x) : undefined)
      : agent.recipeId === "find-duplicates"
        ? (x) =>
            x.status === "Duplicate"
              ? "Same vendor and invoice number as another bill"
              : undefined
        : agent.recipeId === "gst-on-bills"
          ? (x) =>
              open(x) && x.original.bill?.vendorMissing
                ? "GSTIN not on file to verify"
                : undefined
          : /tds/i.test(agent.name)
            ? (x) => (x.status !== "Failed" ? tdsCheck(x) : undefined)
            : undefined;
  if (!rule) return [];
  return items
    .map((x) => ({ x, check: rule(x) }))
    .filter((f): f is { x: Item; check: string } => !!f.check)
    .map(({ x, check }) => ({
      itemId: x.id,
      party: x.form.party || x.file.name,
      ref: x.form.invoiceNo || x.id,
      amount: x.amount,
      check,
    }));
};
