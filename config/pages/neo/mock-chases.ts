import type { Chase } from "@/types/pages/neo/chases";

/**
 * Chases already out when the session opens: Sahyadri's collection follow-ups
 * from last week. Every one points at an approved invoice in the seed
 * (config/pages/inbox/mock-ai-documents.ts), so opening it lands on a record.
 * Shakunthalam starts with none — its chases are made live in the demo.
 *
 * DEV: GET /api/neo/chases?company=…
 */
export const MOCK_CHASES: Chase[] = [
  {
    id: "chase-seed-091",
    company: "acme",
    ask: "payment",
    party: "Bharat Forge Ltd",
    channel: "Email",
    to: "payables@bharatforge.example.test",
    body: "Hello Bharat Forge team,\n\nInvoice SPW/26-27/091 for ₹4,10,000 was due on 31 Jul 2026. Could you confirm when it will be paid?\n\nThanks,\nAccounts, Sahyadri Precision Works",
    itemId: "AR-SPW-091",
    docRef: "SPW/26-27/091",
    status: "received",
    sentAt: "2026-10-09T10:20:00+05:30",
    sentBy: "Sandeep Balaji",
    reply: {
      at: "2026-10-13T21:42:00+05:30",
      text: "The payment of ₹4,10,000 is scheduled for release on 20 Oct 2026.",
      value: "20 Oct 2026",
    },
  },
  {
    id: "chase-seed-092",
    company: "acme",
    ask: "payment",
    party: "Tata Motors Ltd",
    channel: "Email",
    to: "vendorpayments@tatamotors.example.test",
    body: "Hello Tata Motors team,\n\nInvoice SPW/26-27/092 for ₹2,10,000 was due on 7 Aug 2026. Could you confirm when it will be paid?\n\nThanks,\nAccounts, Sahyadri Precision Works",
    itemId: "AR-SPW-092",
    docRef: "SPW/26-27/092",
    status: "waiting",
    sentAt: "2026-10-09T10:24:00+05:30",
    sentBy: "Sandeep Balaji",
  },
];
