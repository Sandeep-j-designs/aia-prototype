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
import { T } from "@/components/inbox/v2/ui";
import {
  Count,
  GROUPED_HEADER_CLASS,
  GroupHead,
  HeadCell,
  Money,
} from "./table-parts";

/**
 * The shape Month View and Vendor View share: a leading column, then
 * groups of numeric sub-columns under a label (Invoice Count, Taxable Value,
 * Tax Value, Status Breakdown), every sub-column sortable.
 */

export type BreakdownColumn<R> = {
  field: keyof R & string;
  label: string;
  kind: "count" | "money";
};

export type BreakdownGroup<R> = {
  label: string;
  cols: BreakdownColumn<R>[];
};

type Props<R> = {
  /** The leading column: its label over the group row, and its sub-label. */
  lead: { group: string; label?: string; width: number };
  groups: BreakdownGroup<R>[];
  rows: R[];
  rowKey: (row: R) => string;
  renderLead: (row: R) => React.ReactNode;
  total?: R;
  onRowClick?: (row: R) => void;
  rowTitle?: string;
  /** Row height: the vendor rows carry a GSTIN subline. */
  tall?: boolean;
  minWidth: number;
};

const BreakdownTable = <R,>({
  lead,
  groups,
  rows,
  rowKey,
  renderLead,
  total,
  onRowClick,
  rowTitle,
  tall,
  minWidth,
}: Props<R>) => {
  const cols = groups.flatMap((g) => g.cols);
  type Field = (typeof cols)[number]["field"];
  const [sort, setSort] = useState<SortState<Field>>(null);

  const sorted = useMemo(
    () =>
      sortRows(
        rows,
        sort,
        Object.fromEntries(
          cols.map((c) => [c.field, (r: R) => Number(r[c.field as keyof R])])
        ) as Record<Field, (r: R) => number>
      ),
    [rows, sort]
  );

  const height = tall ? "h-[52px]" : "h-[45px]";
  const numbers = (row: R, bold = false) =>
    cols.map((c) => {
      const value = Number(row[c.field as keyof R]);
      return (
        <TableCell
          key={c.field}
          className={cn(height, "px-3 py-0 align-middle", T.cell)}
        >
          {c.kind === "count" ? (
            <Count value={value} className={cn(bold && "font-semibold")} />
          ) : (
            <Money value={value} className={cn(bold && "font-semibold")} />
          )}
        </TableCell>
      );
    });

  return (
    <Table
      className={cn(TABLE_CLASS, "table-auto")}
      style={{ minWidth, width: "100%" }}
    >
      <colgroup>
        <col style={{ width: lead.width }} />
        {cols.map((c) => (
          <col key={c.field} />
        ))}
      </colgroup>
      <TableHeader className={GROUPED_HEADER_CLASS}>
        <TableRow className="hover:bg-transparent">
          <GroupHead
            label={lead.group}
            rowSpan={lead.label ? undefined : 2}
            align="left"
          />
          {groups.map((g) => (
            <GroupHead key={g.label} label={g.label} colSpan={g.cols.length} />
          ))}
        </TableRow>
        <TableRow className="hover:bg-transparent">
          {lead.label ? <HeadCell label={lead.label} /> : null}
          {cols.map((c) => (
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
        {sorted.map((row) => (
          <TableRow
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            title={rowTitle}
            className={cn(
              "hover:bg-transparent",
              onRowClick && "cursor-pointer hover:bg-section"
            )}
          >
            <TableCell className={cn(height, "px-3 py-0 align-middle", T.cell)}>
              {renderLead(row)}
            </TableCell>
            {numbers(row)}
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
            {numbers(total, true)}
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

export default BreakdownTable;
