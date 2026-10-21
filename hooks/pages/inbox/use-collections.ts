import { useSyncExternalStore } from "react";
import { openChaseOn, recordChase } from "@/hooks/pages/neo/use-chases";
import { actor, getState, useStore } from "@/components/inbox/v2/store";
import { useOpenDocuments } from "@/hooks/pages/inbox/use-bank-matches";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { overdueInvoices, rupees } from "@/utils/pages/inbox/ai-calculations";
type Reminder = {
  invoiceId: string;
  company: string;
  at: string;
  channel: "WhatsApp" | "Email";
  body: string;
};
let reminders: Reminder[] = [];
const listeners = new Set<() => void>();
export const reminderText = (id: string) => {
  const item = getState().items.find((x) => x.id === id);
  if (!item) return "";
  const overdue = overdueInvoices(getState().items, item.company).find(
    (x) => x.item.id === id
  );
  if (!overdue) return "";
  return `Dear ${item.form.party},\n\n${overdue.days > 60 ? "Payment remains outstanding despite the due date having passed. Please prioritise settlement and confirm a payment date." : "A gentle reminder that payment is now due."}\n\nInvoice: ${item.form.invoiceNo}\nOutstanding: ${rupees(overdue.outstanding)}\nDue date: ${item.form.due} (${overdue.days} days overdue)\n\nPlease share the remittance details if payment has already been made.\n\nRegards,\nAccounts team`;
};
export const sendReminder = (
  invoiceId: string,
  channel: "WhatsApp" | "Email",
  body: string
) => {
  // DEV: POST /api/receivables/:invoiceId/reminders sends the user-confirmed, verbatim message.
  const item = getState().items.find(
    (x) => x.id === invoiceId && x.company === getState().company
  );
  if (!item || !body.trim()) throw new Error("Invoice or message unavailable");
  reminders = [
    ...reminders,
    { invoiceId, company: item.company, at: "13 Oct", channel, body },
  ];
  listeners.forEach((f) => f());
  // A reminder is a chase: Neo watches for the customer's answer.
  if (!openChaseOn(invoiceId, "payment"))
    recordChase({
      company: item.company,
      ask: "payment",
      party: item.form.party,
      channel,
      to: item.form.party,
      body,
      itemId: invoiceId,
      docRef: item.form.invoiceNo,
    });
  logActivity({
    company: item.company,
    actor: { kind: "person", name: actor },
    kind: "override",
    module: "Sales",
    action: `Sent ${channel} reminder (simulated)`,
    subject: item.form.invoiceNo,
    ref: { kind: "document", id: invoiceId },
    reason: body,
  });
};
export const useCollections = (company: string) => {
  const s = useStore();
  useOpenDocuments(company);
  const messages = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => reminders,
    () => reminders
  );
  return overdueInvoices(s.items, company)
    .filter((x) => x.outstanding > 0)
    .map((x) => ({
      ...x,
      reminder: messages
        .filter((m) => m.invoiceId === x.item.id && m.company === company)
        .at(-1),
    }));
};
