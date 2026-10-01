import React, { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FolderSync, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { DEFAULT_PERIOD, GST_RECON_TABS } from "@/config/pages/inbox/gst";
import {
  hasDataFor,
  invoicesFor,
  useGstState,
} from "@/hooks/pages/inbox/use-gst";
import type {
  GstinOption,
  GstPeriod,
  InvoiceTableFilterState,
} from "@/types/pages/inbox/gst";
import {
  buildExportCsv,
  buildMonthView,
  buildSummaryView,
  buildVendorView,
  downloadText,
  filterInvoiceRows,
  isoDay,
  monthsIn,
} from "@/utils/pages/inbox/gst";
import { SearchBox } from "@/components/inbox/v2/banking/table-parts";
import { T } from "@/components/inbox/v2/ui";
import InvoiceView from "./invoice-view";
import MonthView from "./month-view";
import PeriodPicker from "./period-picker";
import ReconciliationSheet from "./reconciliation-sheet";
import SummaryView from "./summary-view";
import { ResultTabs } from "./table-parts";
import VendorView from "./vendor-view";

export type GstTab = "summary" | "month" | "vendor" | "invoice";

export type GstView = {
  /** The results tab. Absent: Summary View. */
  tab?: GstTab;
};

type Props = {
  view: GstView;
  company: string;
  /** The active organisation's name — renames flow through. */
  companyName: string;
  /** Move between tabs. Every tab is a URL, so Back works. */
  onNavigate: (view: GstView) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  /** Real in the app, not built here. */
  onUnbuilt: (what: string) => void;
};

/**
 * GST reconciliation: GSTR-2B against the Purchase Register.
 *
 * Production: components/gst-reconciliation/gstr2b-reconciliations-gate/
 * gstr2b-reconciliations (the page, the sheet and the four result tabs). The
 * product-enrolment landing in front of it and the GSTIN add / edit / delete
 * modals are not built here.
 *
 * Mocks and timers stand in for the API — see hooks/pages/inbox/use-gst.ts,
 * where every seam names its endpoint.
 */
const GstReconciliation = ({
  view,
  company,
  companyName,
  onNavigate,
  notify,
  onUnbuilt,
}: Props) => {
  const state = useGstState(company);
  // DEV: GET /api/gst-reconciliation/gstin?companyId=…
  const gstinOptions: GstinOption[] = useMemo(
    () =>
      state.gstins.map((g) => ({
        label: g.gstin,
        value: g.gstin,
        gstrGstDetailsUuid: g.gstrGstDetailsUuid,
      })),
    [state.gstins]
  );
  const [gstin, setGstin] = useState(gstinOptions[0]?.value ?? "");
  const [period, setPeriod] = useState<GstPeriod>(DEFAULT_PERIOD);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<InvoiceTableFilterState>({});
  const tab: GstTab = view.tab ?? "summary";

  useEffect(() => setFilters({}), [period.from.getTime(), period.to.getTime()]);

  const hasData = hasDataFor(state, period);
  const rows = useMemo(() => invoicesFor(state, period), [state, period]);
  const summaryRows = useMemo(() => buildSummaryView(rows), [rows]);
  const monthRows = useMemo(
    () => buildMonthView(rows, monthsIn(period)),
    [rows, period]
  );
  const term = search.trim().toLowerCase();
  const vendorRows = useMemo(
    () =>
      buildVendorView(rows).filter(
        (v) =>
          !term ||
          v.vendorName.toLowerCase().includes(term) ||
          v.gstin.toLowerCase().includes(term)
      ),
    [rows, term]
  );
  const invoiceCount = useMemo(
    () => filterInvoiceRows(rows, filters, search).length,
    [rows, filters, search]
  );

  const drill = (next: InvoiceTableFilterState) => {
    setFilters(next);
    setSearch("");
    onNavigate({ tab: "invoice" });
  };

  const exportResults = () => {
    // DEV: POST /api/gst-reconciliation/export-results { companyId, customerGstin, dateFrom, dateTo, companyName } → .xlsx
    const fileName = `gst-reconciliation-export-${isoDay(period.from)}-${isoDay(period.to)}.csv`;
    downloadText(fileName, buildExportCsv(rows));
    notify("File downloaded successfully", "success");
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-3 border-b border-neutral-gray px-6 py-4">
        <h1 className={cn(T.title, "text-2xl")}>GSTR-2B</h1>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2">
            <span className="text-sm font-semibold text-secondary-foreground">
              GSTIN
            </span>
            <span className="w-[200px]">
              <ComboBox<string>
                title="Select GSTIN"
                options={gstinOptions}
                selectedValue={gstin}
                onChange={(value) =>
                  setGstin(Array.isArray(value) ? value[0] : value)
                }
                isMultiSelect={false}
                hideClearButton
                actionLabel="Add New GSTIN"
                actionIcon={Plus}
                onAction={() => onUnbuilt("Adding a GSTIN")}
                wrapperClassName="w-[--radix-popover-trigger-width] p-1"
              />
            </span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-secondary-foreground">
              GSTR Period
            </span>
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
        </div>
        <span className="flex-1" />
        {hasData && (
          <Button onClick={() => setSheetOpen(true)}>
            <FolderSync className="h-3.5 w-3.5" aria-hidden />
            New Reconciliation
          </Button>
        )}
      </div>

      {!hasData ? (
        <div className="flex min-h-0 flex-1 flex-col p-6">
          <div className="flex min-h-[400px] flex-col items-center justify-center gap-8 rounded-lg border border-neutral-gray px-6 py-10">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent">
              <FileSpreadsheet className="h-8 w-8 text-primary" aria-hidden />
            </span>
            <p className="max-w-[400px] text-center text-sm leading-6 text-secondary-foreground">
              Click on &quot;Start Reconciliation&quot; to upload your purchase
              register and fetch GSTR-2B data to get AI-powered matches
            </p>
            <Button
              variant="outline"
              className="text-primary"
              onClick={() => setSheetOpen(true)}
            >
              Start Reconciliation
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="pt-2">
            <ResultTabs
              value={tab}
              onChange={(next) => onNavigate({ tab: next as GstTab })}
              tabs={GST_RECON_TABS.map((t) => ({
                id: t.value,
                label: t.label,
                count:
                  t.value === "month"
                    ? monthRows.length - 1
                    : t.value === "vendor"
                      ? vendorRows.length
                      : t.value === "invoice"
                        ? invoiceCount
                        : undefined,
              }))}
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 px-6 py-3">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search..."
              label="Search vendor name, GSTIN or invoice no"
            />
            <span className="flex-1" />
            <Button variant="outline" onClick={exportResults}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Export Results
            </Button>
          </div>

          {tab === "summary" && (
            <SummaryView
              rows={summaryRows}
              onOpenStatus={(matchStatus) =>
                drill({ matchType: [matchStatus] })
              }
            />
          )}
          {tab === "month" && <MonthView rows={monthRows} />}
          {tab === "vendor" && (
            <VendorView
              rows={vendorRows}
              searching={!!term}
              onOpenVendor={(g) => drill({ gstin: [g] })}
            />
          )}
          {tab === "invoice" && (
            <InvoiceView
              company={company}
              rows={rows}
              search={search}
              filters={filters}
              onFiltersChange={setFilters}
              notify={notify}
            />
          )}
        </>
      )}

      {sheetOpen && (
        <ReconciliationSheet
          open
          company={company}
          companyName={companyName}
          gstinOptions={gstinOptions}
          gstin={gstin}
          period={period}
          notify={notify}
          onUnbuilt={onUnbuilt}
          onClose={(nextGstin, nextPeriod) => {
            setGstin(nextGstin);
            setPeriod(nextPeriod);
            setSheetOpen(false);
          }}
          onReconciled={(nextGstin, nextPeriod) => {
            setGstin(nextGstin);
            setPeriod(nextPeriod);
            setSheetOpen(false);
            onNavigate({ tab: "summary" });
          }}
        />
      )}
    </div>
  );
};

export default GstReconciliation;
