import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  TABLE_CLASS,
  nextSort,
  sortRows,
  type SortState,
} from "@/components/inbox/v2/banking/table-parts";
import type {
  Gstr2bSummaryViewTableData,
  SummaryViewTableSortKey,
} from "@/types/pages/inbox/gst";
import { T } from "@/components/inbox/v2/ui";
import {
  Count,
  GROUPED_HEADER_CLASS,
  GroupHead,
  HeadCell,
  MatchStatusPill,
  Money,
} from "./table-parts";

/**
 * Summary View — production's summary-view: one row per match type, then the
 * Total, with GSTR-2B, Purchase Register and their Difference side by side.
 *
 * PROTOTYPE: a status row opens Invoice View filtered to that status.
 * Production's rows are not clickable.
 */

type Field = keyof Omit<Gstr2bSummaryViewTableData, "matchStatus">;

const GROUPS: {
  label: string;
  cols: { field: Field; label: string; sortKey: SummaryViewTableSortKey }[];
}[] = [
  {
    label: "GSTR-2B Data",
    cols: [
      { field: "gstr2bCount", label: "Count", sortKey: "gstr2bCountOrder" },
      {
        field: "gstr2bTaxableValue",
        label: "Taxable Value (₹)",
        sortKey: "gstr2bTaxableValueOrder",
      },
      {
        field: "gstr2bTaxValue",
        label: "Tax Value (₹)",
        sortKey: "gstr2bTaxValueOrder",
      },
    ],
  },
  {
    label: "Purchase Register Data",
    cols: [
      { field: "prCount", label: "Count", sortKey: "prCountOrder" },
      {
        field: "prTaxableValue",
        label: "Taxable Value (₹)",
        sortKey: "prTaxableValueOrder",
      },
      {
        field: "prTaxValue",
        label: "Tax Value (₹)",
        sortKey: "prTaxValueOrder",
      },
    ],
  },
  {
    label: "Difference",
    cols: [
      {
        field: "differenceCount",
        label: "Count",
        sortKey: "differenceCountOrder",
      },
      {
        field: "differenceTaxableValue",
        label: "Taxable Value (₹)",
        sortKey: "differenceTaxableValueOrder",
      },
      {
        field: "differenceTaxValue",
        label: "Tax Value (₹)",
        sortKey: "differenceTaxValueOrder",
      },
    ],
  },
];

const COLS = GROUPS.flatMap((g) => g.cols);
const DIFF = new Set<Field>([
  "differenceCount",
  "differenceTaxableValue",
  "differenceTaxValue",
]);

type Props = {
  rows: Gstr2bSummaryViewTableData[];
  onOpenStatus: (matchStatus: string) => void;
};

const SummaryView = ({ rows, onOpenStatus }: Props) => {
  const [sort, setSort] = useState<SortState<Field>>(null);
  const total = rows.find((r) => r.matchStatus === "total");
  const statuses = useMemo(
    () =>
      sortRows(
        rows.filter((r) => r.matchStatus !== "total"),
        sort,
        Object.fromEntries(
          COLS.map((c) => [
            c.field,
            (r: Gstr2bSummaryViewTableData) => r[c.field],
          ])
        ) as Record<Field, (r: Gstr2bSummaryViewTableData) => number>
      ),
    [rows, sort]
  );

  const cells = (row: Gstr2bSummaryViewTableData, bold = false) =>
    COLS.map(({ field }) => {
      const value = row[field];
      const red = DIFF.has(field) && value !== 0;
      const ink = cn(
        red && "text-destructive-foreground",
        bold && "font-semibold"
      );
      return (
        <TableCell
          key={field}
          className={cn("h-[45px] px-3 py-0 align-middle", T.cell)}
        >
          {field.endsWith("Count") ? (
            <Count value={value} className={ink} />
          ) : (
            <Money value={value} className={ink} />
          )}
        </TableCell>
      );
    });

  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-auto">
      <Table className={cn(TABLE_CLASS, "w-full table-auto")}>
        <colgroup>
          <col style={{ width: 200 }} />
          {COLS.map((c) => (
            <col key={c.field} />
          ))}
        </colgroup>
        <TableHeader className={GROUPED_HEADER_CLASS}>
          <TableRow className="hover:bg-transparent">
            <GroupHead label="Match Status" rowSpan={2} align="left" />
            {GROUPS.map((g) => (
              <GroupHead
                key={g.label}
                label={g.label}
                colSpan={g.cols.length}
              />
            ))}
          </TableRow>
          <TableRow className="hover:bg-transparent">
            {COLS.map((c) => (
              <HeadCell
                key={c.field}
                label={c.label}
                align="right"
                sort={sort?.key === c.field ? sort.dir : "none"}
                onSort={() => setSort((s) => nextSort(s, c.field))}
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {statuses.map((row) => (
            <TableRow
              key={row.matchStatus}
              onClick={() => onOpenStatus(row.matchStatus)}
              title="Open these invoices"
              className="cursor-pointer hover:bg-section"
            >
              <TableCell className="h-[45px] px-3 py-0 align-middle">
                <MatchStatusPill matchType={row.matchStatus} />
              </TableCell>
              {cells(row)}
            </TableRow>
          ))}
          {total && (
            <TableRow className="bg-section hover:bg-section">
              <TableCell
                className={cn(
                  "h-[45px] px-3 py-0 align-middle",
                  T.cell,
                  "font-semibold text-primary"
                )}
              >
                Total
              </TableCell>
              {cells(total, true)}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default SummaryView;
