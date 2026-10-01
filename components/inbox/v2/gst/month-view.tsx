import React from "react";
import type { Gstr2bMonthViewTableData } from "@/types/pages/inbox/gst";
import { EmptyBlock } from "@/components/inbox/v2/banking/table-parts";
import BreakdownTable, { type BreakdownGroup } from "./breakdown-table";

/**
 * Month View — production's month-view: each GSTR-2B month with its invoice
 * count, taxable and tax value on both sides and the difference, then the
 * Status Breakdown, and a Total row.
 */

const GROUPS: BreakdownGroup<Gstr2bMonthViewTableData>[] = [
  {
    label: "Invoice Count",
    cols: [
      { field: "gstr2bCount", label: "2B", kind: "count" },
      { field: "prCount", label: "PR", kind: "count" },
      { field: "diffCount", label: "Diff", kind: "count" },
    ],
  },
  {
    label: "Taxable Value (₹)",
    cols: [
      { field: "gstr2bTaxableValue", label: "2B", kind: "money" },
      { field: "prTaxableValue", label: "PR", kind: "money" },
      { field: "diffTaxableValue", label: "Diff", kind: "money" },
    ],
  },
  {
    label: "Tax Value (₹)",
    cols: [
      { field: "gstr2bTaxValue", label: "2B", kind: "money" },
      { field: "prTaxValue", label: "PR", kind: "money" },
      { field: "diffTaxValue", label: "Diff", kind: "money" },
    ],
  },
  {
    label: "Status Breakdown",
    cols: [
      { field: "matchStatusMatched", label: "Matched", kind: "count" },
      {
        field: "matchStatusAiProbableMatch",
        label: "AI Probable Match",
        kind: "count",
      },
      { field: "matchStatusMissing", label: "Missing", kind: "count" },
    ],
  },
];

type Props = {
  rows: Gstr2bMonthViewTableData[];
};

const MonthView = ({ rows }: Props) => {
  const months = rows.filter((r) => r.month !== "total");
  const total = rows.find((r) => r.month === "total");
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto">
      <BreakdownTable
        lead={{ group: "GSTR-2B", label: "Month", width: 130 }}
        groups={GROUPS}
        rows={months}
        rowKey={(r) => r.month}
        renderLead={(r) => <span className="font-medium">{r.month}</span>}
        total={total}
        minWidth={1100}
      />
      {!months.length && <EmptyBlock title="No months in this period" />}
    </div>
  );
};

export default MonthView;
