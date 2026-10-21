import { issue, type Item } from "@/components/inbox/v2/store";
import {
  patternFor,
  settingsFor,
  trustStatus,
  evidenceFor,
} from "@/hooks/pages/inbox/use-auto-approve";
export const billEvidence = (
  item: Item
): { ready: boolean; reason: string } => {
  const blocked = issue(item);
  if (blocked) return { ready: false, reason: blocked };
  const flagged =
    item.original.bill?.flagged || item.original.invoice?.flagged || [];
  if (flagged.length)
    return { ready: false, reason: `Verify ${flagged.join(", ")}` };
  const ledgers = [
    ...new Set(item.form.lines.map((l) => l.ledger).filter(Boolean)),
  ];
  const pattern =
    ledgers.length === 1
      ? patternFor(item.company, item.form.party, ledgers[0])
      : undefined;
  if (!pattern)
    return {
      ready: false,
      reason:
        "No established history for this vendor and ledger; review the accounting values",
    };
  const settings = settingsFor(item.company);
  if (trustStatus(pattern, settings) !== "trusted")
    return {
      ready: false,
      reason: `${pattern.streak} consecutive approvals; ${settings.minApprovals} required, with no edits`,
    };
  const ratio = item.amount / pattern.usualAmount;
  if (ratio > settings.amountBand || ratio < 1 / settings.amountBand)
    return {
      ready: false,
      reason: "Amount falls outside the vendor’s usual range",
    };
  return { ready: true, reason: evidenceFor(pattern) };
};
