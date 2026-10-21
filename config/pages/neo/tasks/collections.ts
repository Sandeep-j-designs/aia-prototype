import type { NeoTask, NeoCard } from "@/types/pages/neo";
import { getState } from "@/components/inbox/v2/store";
import {
  reminderText,
  sendReminder,
} from "@/hooks/pages/inbox/use-collections";
import { overdueInvoices } from "@/utils/pages/inbox/ai-calculations";
const collections: NeoTask = {
  id: "collections",
  title: "Draft collection reminders",
  match: (p) => (/remind|collection/i.test(p) ? 12 : 0),
  run: async (api) => {
    const rows = overdueInvoices(
      getState().items,
      api.context.company || getState().company
    );
    const explicit = rows.filter((x) => api.prompt.includes(x.item.id));
    const selected = explicit.length
      ? explicit
      : rows.filter((x) => api.context.selectedIds.includes(x.item.id));
    const targets = selected.length ? selected : rows;
    if (!targets.length) {
      await api.say("No overdue invoices in this organisation.");
      return;
    }
    const channel = await api.ask("Where should these reminders go?", [
      { id: "WhatsApp", label: "WhatsApp" },
      { id: "Email", label: "Email" },
    ]);
    let sent = 0;
    for (const { item } of targets) {
      const card: Extract<NeoCard, { kind: "message" }> = {
        kind: "message",
        channel: channel as "WhatsApp" | "Email",
        to: item.form.party,
        body: reminderText(item.id),
      };
      const choice = await api.card(card, [
        {
          id: "send",
          label: "Send (simulated)",
          risk: "external",
          primary: true,
        },
        { id: "skip", label: "Skip invoice" },
      ]);
      if (choice === "send") {
        sendReminder(item.id, card.channel, card.body);
        sent++;
      }
    }
    await api.say(
      `${sent} reminders sent by you (simulated). The invoices now show the reminder date.`
    );
    return `${sent} reminders sent`;
  },
};
export default collections;
