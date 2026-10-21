import type { Item } from "@/components/inbox/v2/store";
import { getOpenDocuments } from "@/hooks/pages/inbox/use-bank-matches";
import type { InvoiceViewRow } from "@/types/pages/inbox/gst";
export const DEMO_TODAY = new Date("2026-10-13T00:00:00+05:30");
export const rupees = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const overdueInvoices = (items: Item[], company: string) =>
  items
    .filter(
      (x) =>
        x.company === company &&
        x.route === "AR" &&
        x.status === "Approved" &&
        x.original.paymentStatus !== "paid"
    )
    .map((item) => ({
      item,
      days: Math.max(
        0,
        Math.round((+DEMO_TODAY - +new Date(item.form.due)) / 86400000)
      ),
      outstanding:
        getOpenDocuments(company).find(
          (d) => d.id === item.id || d.number === item.form.invoiceNo
        )?.outstanding ?? item.amount,
    }))
    .filter((x) => x.days > 0 && x.outstanding > 0);
export const itcRisk = (rows: InvoiceViewRow[]) => {
  const missing = rows.filter((r) => r.matchType === "missing_in_2b");
  const probable = rows.filter((r) => r.matchType === "ai_probable_match");
  const sum = (rs: InvoiceViewRow[]) =>
    Math.round(rs.reduce((n, r) => n + (r.pr?.totalGst || 0), 0) * 100) / 100;
  return {
    missing: sum(missing),
    probable: sum(probable),
    total: sum([...missing, ...probable]),
    missingCount: missing.length,
    probableCount: probable.length,
    rows: [...missing, ...probable],
  };
};
export const freightSummary = (items: Item[], company: string) => {
  const records = items.filter(
    (x) =>
      x.company === company &&
      x.id.startsWith("FREIGHT-") &&
      x.status !== "Deleted"
  );
  const month = (name: string) =>
    records.filter(
      (x) =>
        x.form.date.includes(name) ||
        x.form.date.startsWith(name === "Sep" ? "2026-09" : "2026-08")
    );
  const sum = (rs: Item[]) =>
    rs.reduce((n, x) => n + x.form.lines.reduce((s, l) => s + l.amount, 0), 0);
  return {
    august: sum(month("Aug")),
    september: sum(month("Sep")),
    records,
    septemberRecords: month("Sep"),
  };
};
