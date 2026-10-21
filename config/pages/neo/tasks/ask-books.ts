import { getState, type Item } from "@/components/inbox/v2/store";
import type { NeoCard, NeoTask } from "@/types/pages/neo";
import { overdueInvoices } from "@/utils/pages/inbox/ai-calculations";
import { findName, has, money } from "@/utils/pages/neo";
import {
  inPeriod,
  isoDate,
  parsePeriod,
  periodPhrase,
  type Period,
} from "@/utils/pages/neo/period";
import { companyItems, refTo } from "./shared";

/**
 * Ask the books: the questions a dashboard didn't plan for, answered from
 * the records and never from memory. Every answer shows its arithmetic and
 * the vouchers it summed, so it can be checked rather than trusted.
 *
 * - "How much did we spend with Mahindra Logistics in September?"
 * - "What did we spend on Freight Inward?"
 * - "Who are my top vendors?"
 * - "Which vendors aren't in my masters?"  → offers to chase their GSTIN
 * - "Who owes us money?"                   → offers to draft reminders
 *
 * Read-only: nothing changes unless the person picks a follow-up.
 *
 * DEV: with a model behind POST /api/neo/runs these become one tool,
 * query_ledger(filters, group_by), and this file is deleted.
 */

/** Words for a kind of spend that runs across ledgers and descriptions. */
const TOPICS = [
  "freight",
  "courier",
  "packing",
  "rent",
  "electricity",
  "repairs",
];

/** Booked or waiting purchase bills — what "spend" means to an accountant. */
const purchases = () =>
  companyItems().filter(
    (x) =>
      x.route === "AP" &&
      ["Approved", "Needs Review", "Duplicate"].includes(x.status)
  );

const net = (x: Item) => x.form.lines.reduce((s, l) => s + l.amount, 0);

const MONTH_LABEL = (iso: string) =>
  iso
    ? new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      })
    : "Undated";

/**
 * The bills an answer summed, as the arithmetic: grouped by month, newest
 * first, each group with its count and subtotal.
 */
const sourceList = (
  title: string,
  rows: Item[],
  amountOf: (x: Item) => number = net
): Extract<NeoCard, { kind: "list" }> => {
  const byMonth = new Map<string, Item[]>();
  rows.forEach((x) => {
    const k = isoDate(x.form.date).slice(0, 7);
    byMonth.set(k, [...(byMonth.get(k) || []), x]);
  });
  return {
    kind: "list",
    title,
    groups: [...byMonth.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, xs]) => ({
        // The list card counts and totals each group itself.
        label: MONTH_LABEL(k),
        tone: "neutral" as const,
        rows: xs.map((x) => ({
          itemId: x.id,
          primary: x.form.party,
          secondary: `${x.form.date} · ${x.form.invoiceNo || x.id} · ${x.status}`,
          amount: amountOf(x),
        })),
      })),
  };
};

const askBooks: NeoTask = {
  id: "ask-books",
  title: "Answer from the books",
  match: (p) =>
    has(
      p,
      /how much|spend|spent|total|top vendors?|biggest vendors?|largest vendors?|(not|n['’]t) in (my )?masters|missing gstin|without (a )?gstin|who owes|overdue|outstanding|unpaid|receivable|kitna|kharch|baaki|bakaya|udhaar/i
    ) && !has(p, /\bwhy\b|went up|gone up|increase|jump/i)
      ? 9
      : 0,
  run: async (api) => {
    const p = api.prompt;

    // Who owes us
    if (
      has(
        p,
        /who owes|overdue|outstanding|unpaid|receivable|baaki|bakaya|udhaar/i
      )
    ) {
      const company = api.context.company || getState().company;
      const rows = overdueInvoices(getState().items, company).sort(
        (a, b) => b.outstanding - a.outstanding
      );
      if (!rows.length) {
        await api.say(
          "Nobody is overdue here. Every approved invoice is in date."
        );
        return "Nothing overdue";
      }
      const sum = rows.reduce((s, r) => s + r.outstanding, 0);
      api.remember({
        kind: "overdue",
        ids: rows.map((r) => r.item.id),
        label: `${rows.length} overdue invoice${rows.length === 1 ? "" : "s"}`,
      });
      await api.say(
        `${rows.length} invoice${rows.length === 1 ? " is" : "s are"} overdue, ${money(sum)} in all. The oldest is ${rows.reduce((a, b) => (b.days > a.days ? b : a)).item.form.party} at ${Math.max(...rows.map((r) => r.days))} days. Outstanding nets off part-payments matched in Banking.`
      );
      const next = await api.card(
        {
          kind: "list",
          title: "Overdue invoices",
          groups: [
            {
              label: "Oldest first by amount",
              tone: "notice",
              rows: rows.map((r) => ({
                itemId: r.item.id,
                primary: r.item.form.party,
                secondary: `${r.item.form.invoiceNo} · ${r.days} days overdue`,
                amount: r.outstanding,
              })),
            },
          ],
        },
        [
          { id: "remind", label: "Draft reminders", primary: true },
          { id: "done", label: "That's all" },
        ]
      );
      if (next === "remind")
        await api.chain(
          `Draft collection reminder for ${rows.map((r) => r.item.id).join(" ")}`
        );
      return `${rows.length} overdue · ${money(sum)}`;
    }

    // Vendors not in masters
    if (
      has(p, /(not|n['’]t) in (my )?masters|missing gstin|without (a )?gstin/i)
    ) {
      const rows = purchases().filter(
        (x) => x.status !== "Approved" && x.original.bill?.vendorMissing
      );
      if (!rows.length) {
        await api.say(
          "Every vendor on an open bill is in your masters, with a GSTIN on file."
        );
        return "All vendors known";
      }
      api.remember({
        kind: "masters",
        ids: rows.map((x) => x.id),
        label: "Vendors not in masters",
      });
      await api.say(
        `${rows.length} open bill${rows.length === 1 ? " is" : "s are"} from a vendor that isn't in your masters. Approving creates the vendor in Tally, and that needs their GSTIN first.`,
        rows.map((x) => refTo(x))
      );
      const next = await api.card(sourceList("Vendors not in masters", rows), [
        {
          id: "chase",
          label:
            rows.length === 1
              ? `Ask ${rows[0].form.party} for their GSTIN`
              : "Ask the first vendor for their GSTIN",
          primary: true,
        },
        { id: "done", label: "That's all" },
      ]);
      if (next === "chase")
        await api.chain(`ask ${rows[0].id} vendor for their GSTIN`);
      return `${rows.length} vendors not in masters`;
    }

    const when: Period | undefined = parsePeriod(p);
    const only = has(
      p,
      /waiting for review|\b(open|pending|unapproved|not approved)\b/i
    )
      ? "open"
      : has(
            p,
            /\b(approved|booked|posted) only\b|\bonly (approved|booked|posted)\b/i
          )
        ? "approved"
        : undefined;
    const bills = purchases().filter(
      (x) =>
        inPeriod(x.form.date, when) &&
        (only === "open"
          ? x.status !== "Approved"
          : only === "approved"
            ? x.status === "Approved"
            : true)
    );
    const period =
      periodPhrase(when) +
      (only === "open"
        ? ", waiting for review"
        : only === "approved"
          ? ", approved"
          : "");

    // Top vendors
    if (has(p, /top|biggest|largest/i)) {
      const byVendor = new Map<string, Item[]>();
      bills.forEach((x) =>
        byVendor.set(x.form.party, [...(byVendor.get(x.form.party) || []), x])
      );
      const top = [...byVendor.entries()]
        .map(([party, xs]) => ({
          party,
          xs,
          sum: xs.reduce((s, x) => s + net(x), 0),
        }))
        .sort((a, b) => b.sum - a.sum)
        .slice(0, 5);
      if (!top.length) {
        await api.say(`No purchase bills${period}.`);
        return "No bills";
      }
      api.remember({
        kind: "top",
        period: when && { phrase: when.phrase, label: when.label },
        status: only,
        label: `Top vendors${when ? ` · ${when.label}` : ""}`,
      });
      await api.say(
        `Top ${top.length} vendors by spend${period}, before tax: ${top.map((t) => `${t.party} ${money(t.sum)}`).join("; ")}.`
      );
      api.show({
        kind: "list",
        title: `Top vendors${period}`,
        groups: top.map((t) => ({
          label: `${t.party} · ${money(t.sum)}`,
          tone: "neutral" as const,
          rows: t.xs.slice(0, 3).map((x) => ({
            itemId: x.id,
            primary: x.form.invoiceNo || x.id,
            secondary: `${x.form.date} · ${x.status}`,
            amount: net(x),
          })),
        })),
      });
      return `Top vendors${period}`;
    }

    // Spend with a vendor, on a ledger, or on a kind of spend ("freight")
    // that runs across ledgers and line descriptions.
    const all = purchases();
    const vendor = findName(p, [...new Set(all.map((x) => x.form.party))]);
    const topic = vendor
      ? undefined
      : TOPICS.find((t) => new RegExp(`\\b${t}`, "i").test(p));
    const ledger =
      vendor || topic
        ? undefined
        : findName(p, [
            ...new Set(all.flatMap((x) => x.form.lines.map((l) => l.ledger))),
          ]);
    if (!vendor && !ledger && !topic) {
      await api.say(
        `I can total spend by vendor, by ledger or by kind${period}. Name one — “How much did we spend with Mahindra Logistics last month?” or “What did we spend on freight this quarter?”`
      );
      return "Needs a vendor or ledger";
    }
    const scan = await api.step(
      `Adding up ${vendor ? `${vendor}'s bills` : topic ? `${topic} lines, any ledger` : `lines on ${ledger}`}${period}`
    );
    await api.wait(450);
    type Line = Item["form"]["lines"][number];
    const lineHit = (l: Line) =>
      topic
        ? new RegExp(topic, "i").test(`${l.ledger} ${l.description || ""}`)
        : l.ledger === ledger;
    const rows = vendor
      ? bills.filter((x) => x.form.party === vendor)
      : bills.filter((x) => x.form.lines.some(lineHit));
    const amountOf = (x: Item) =>
      vendor
        ? net(x)
        : x.form.lines.filter(lineHit).reduce((s, l) => s + l.amount, 0);
    const sum = rows.reduce((s, x) => s + amountOf(x), 0);
    const waiting = rows.filter((x) => x.status !== "Approved");
    scan(`${rows.length} bill${rows.length === 1 ? "" : "s"} · ${money(sum)}`);
    const subject = vendor
      ? `with ${vendor}`
      : topic
        ? `on ${topic}`
        : `on ${ledger}`;
    const ledgers = topic
      ? [
          ...new Set(
            rows.flatMap((x) =>
              x.form.lines.filter(lineHit).map((l) => l.ledger)
            )
          ),
        ]
      : [];
    api.remember({
      kind: topic === "freight" ? "freight" : "spend",
      vendor,
      ledger,
      topic,
      period: when && { phrase: when.phrase, label: when.label },
      status: only,
      ids: rows.filter((x) => x.status !== "Approved").map((x) => x.id),
      label: [
        vendor || ledger || (topic && topic[0].toUpperCase() + topic.slice(1)),
        when?.label,
      ]
        .filter(Boolean)
        .join(" · "),
    });
    await api.say(
      `**${money(sum)}** ${subject}${period}, before tax, from ${rows.length} bill${rows.length === 1 ? "" : "s"}.${ledgers.length > 1 ? ` That covers ${ledgers.join(" and ")}, and any line that says ${topic}.` : ""}${waiting.length && only !== "open" ? `\n\n${waiting.length} of them ${waiting.length === 1 ? "is" : "are"} still waiting for review, so the booked figure is **${money(sum - waiting.reduce((s, x) => s + amountOf(x), 0))}**.` : ""}`
    );
    if (rows.length)
      api.show(
        sourceList(
          `${vendor || ledger || topic}${period}`,
          [...rows].sort((a, b) => amountOf(b) - amountOf(a)),
          amountOf
        )
      );
    if (topic === "freight") api.suggest(["Why is freight up in September?"]);
    return `${money(sum)}${period}`;
  },
};

export default askBooks;
