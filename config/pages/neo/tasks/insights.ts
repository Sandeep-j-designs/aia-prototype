import { getState } from "@/components/inbox/v2/store";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import {
  freightSummary,
  itcRisk,
  rupees,
} from "@/utils/pages/inbox/ai-calculations";
import type { NeoTask } from "@/types/pages/neo";
export const freightInsight: NeoTask = {
  id: "freight-insight",
  title: "Explain freight movement",
  // "Why is freight up?" — the movement and its cause. A question about how
  // much ("how much freight last month") is ask-books', which outscores this.
  match: (p) =>
    /freight/i.test(p) &&
    /why|went up|gone up|\bup\b|increase|jump|explain/i.test(p)
      ? 8
      : 0,
  run: async (api) => {
    const f = freightSummary(
      getState().items,
      api.context.company || getState().company
    );
    // The answer first; the twenty bills behind it are one tile away, by
    // month with subtotals, not twenty pills in the text.
    const lineSum = (x: (typeof f.records)[number]) =>
      x.form.lines.reduce((n, l) => n + l.amount, 0);
    const aug = f.records.filter((x) => !f.septemberRecords.includes(x));
    api.remember({
      kind: "freight",
      topic: "freight",
      period: { phrase: "September", label: "September 2026" },
      ids: f.septemberRecords
        .filter((x) => x.status !== "Approved")
        .map((x) => x.id),
      label: "Freight · September 2026",
    });
    // Each vendor's month against the last, biggest change first.
    const byVendor = (xs: typeof f.records) =>
      xs.reduce<Record<string, { n: number; sum: number }>>((m, x) => {
        const v = (m[x.form.party] ||= { n: 0, sum: 0 });
        v.n += 1;
        v.sum += lineSum(x);
        return m;
      }, {});
    const sep = byVendor(f.septemberRecords);
    const augV = byVendor(aug);
    const moves = [...new Set([...Object.keys(sep), ...Object.keys(augV)])]
      .map((v) => ({
        v,
        before: augV[v]?.sum || 0,
        after: sep[v]?.sum || 0,
        n: sep[v]?.n || 0,
      }))
      .sort(
        (a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before)
      )
      .map(
        (m) =>
          `- **${m.v}**: ${rupees(m.after)} from ${m.n} bill${m.n === 1 ? "" : "s"}, against ${rupees(m.before)} in August (${m.after >= m.before ? "+" : "−"}${rupees(Math.abs(m.after - m.before))})`
      );
    const route = f.septemberRecords.some((x) =>
      /additional plant route/i.test(x.form.lines[0]?.description || "")
    );
    await api.say(
      `**Freight is up ${rupees(f.september - f.august)}**: ${rupees(f.september)} in September against ${rupees(f.august)} in August, before tax.\n\n${moves.join("\n")}${route ? "\n\nThe September Mahindra bills describe the freight as “for additional plant route”; August's were regular inward freight." : ""}`
    );
    api.show({
      kind: "list",
      title: "Freight, August and September",
      groups: [
        {
          label: "September 2026",
          tone: "neutral",
          rows: f.septemberRecords.map((x) => ({
            itemId: x.id,
            primary: x.form.party,
            secondary: `${x.form.date} · ${x.form.invoiceNo}`,
            amount: lineSum(x),
          })),
        },
        {
          label: "August 2026",
          tone: "neutral",
          rows: aug.map((x) => ({
            itemId: x.id,
            primary: x.form.party,
            secondary: `${x.form.date} · ${x.form.invoiceNo}`,
            amount: lineSum(x),
          })),
        },
      ],
    });
    return "Freight movement computed";
  },
};
export const itcInsight: NeoTask = {
  id: "itc-risk",
  title: "Compute Q2 ITC at risk",
  match: (p) =>
    /\bitc\b|input.*credit|itc mismatch|2b (vs|against) (books|pr)/i.test(p)
      ? 9
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const rows = Object.entries(getGstState(company).invoices)
      .filter(([m]) => m >= "2026-07" && m <= "2026-09")
      .flatMap(([, r]) => r);
    const r = itcRisk(rows);
    await api.say(
      `Q2 (Jul–Sep 2026), available reconciled periods: Missing in 2B ${r.missingCount} invoices, ${rupees(r.missing)} + AI Probable ${r.probableCount}, ${rupees(r.probable)} = ${rupees(r.total)} at risk. Computed by summing purchase-register GST, without model arithmetic.`,
      [
        {
          label: "Open GST source records",
          href: "/inbox?module=GST&tab=invoices",
        },
      ]
    );
    return "ITC risk computed";
  },
};
