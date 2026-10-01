import React, { useEffect, useState } from "react";
import type { Gstr2bVendorViewTableData } from "@/types/pages/inbox/gst";
import { EmptyBlock, Pager } from "@/components/inbox/v2/banking/table-parts";
import { T } from "@/components/inbox/v2/ui";
import BreakdownTable, { type BreakdownGroup } from "./breakdown-table";

/**
 * Vendor View — production's vendor-view: one row per supplier GSTIN with
 * both sides' counts and values and the Status Breakdown, paged.
 *
 * PROTOTYPE: a vendor row opens Invoice View filtered to that GSTIN.
 */

const GROUPS: BreakdownGroup<Gstr2bVendorViewTableData>[] = [
  {
    label: "Invoice Count",
    cols: [
      { field: "gstr2bCount", label: "2B", kind: "count" },
      { field: "prCount", label: "PR", kind: "count" },
    ],
  },
  {
    label: "Taxable Value (₹)",
    cols: [
      { field: "gstr2bTaxableValue", label: "2B", kind: "money" },
      { field: "prTaxableValue", label: "PR", kind: "money" },
    ],
  },
  {
    label: "Tax Value (₹)",
    cols: [
      { field: "gstr2bTaxValue", label: "2B", kind: "money" },
      { field: "prTaxValue", label: "PR", kind: "money" },
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
  rows: Gstr2bVendorViewTableData[];
  searching: boolean;
  onOpenVendor: (gstin: string) => void;
};

const VendorView = ({ rows, searching, onOpenVendor }: Props) => {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => setPage(0), [rows.length]);
  const pageRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <BreakdownTable
          lead={{ group: "Vendor Name/GSTIN", width: 280 }}
          groups={GROUPS}
          rows={pageRows}
          rowKey={(r) => r.gstin}
          tall
          renderLead={(r) => (
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold" title={r.vendorName}>
                {r.vendorName}
              </span>
              <span className={T.sub}>{r.gstin}</span>
            </span>
          )}
          onRowClick={(r) => onOpenVendor(r.gstin)}
          rowTitle="Open this vendor's invoices"
          minWidth={1100}
        />
        {!rows.length && (
          <EmptyBlock
            title={searching ? "No vendors match your search" : "No vendors"}
            body={searching ? "Try a vendor name or GSTIN." : undefined}
          />
        )}
      </div>
      <Pager
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </>
  );
};

export default VendorView;
