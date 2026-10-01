import {
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfMonth,
} from "date-fns";
import {
  GSTR2B_MATCH_TYPE,
  GSTR2B_MATCH_TYPE_LABELS,
  GSTR2B_MATCH_TYPE_ORDER,
  ITC_ACTION_VALUES,
  MATCHED_TYPES,
  MISSING_TYPES,
  REMARK_KEY_BY_COLUMN,
  type Gstr2bMatchTypeValueType,
  type RemarkKey,
} from "@/config/pages/inbox/gst";
import type {
  GstPeriod,
  Gstr2bMonthViewTableData,
  Gstr2bSummaryViewTableData,
  Gstr2bVendorViewTableData,
  InvoiceTableFilterState,
  InvoiceViewData,
  InvoiceViewRow,
  InvoiceViewSummary,
} from "@/types/pages/inbox/gst";

/**
 * GST reconciliation's pure helpers: periods, the three aggregate views, the
 * invoice table's filters, and the CSV export.
 *
 * DEV: the aggregations and filters are the backend's work in production —
 * gstr-2b-summary-view, -month-view, -vendor-view and -invoice-view each
 * return their rows already computed, filtered, sorted and paged. They live
 * here only because the prototype has no backend; delete them with the mocks.
 */

/* ----------------------------------------------------------------- periods */

/** yyyy-MM-dd, as production's formatDate sends a period to the API. */
export const isoDay = (date: Date) => format(date, "yyyy-MM-dd");

/** "Aug 2026", or "Jul 2026 - Sep 2026" — production's formatPeriodLabel. */
export const formatPeriodLabel = (period?: Partial<GstPeriod>) => {
  if (!period?.from || !period?.to) return "Select Period";
  const from = format(period.from, "MMM yyyy");
  const to = format(period.to, "MMM yyyy");
  return from === to ? from : `${from} - ${to}`;
};

/** The months a period covers, first to last, as yyyy-MM keys. */
export const monthsIn = (period: GstPeriod) => {
  const keys: string[] = [];
  for (
    let m = startOfMonth(period.from);
    !isAfter(m, period.to);
    m = addMonths(m, 1)
  )
    keys.push(format(m, "yyyy-MM"));
  return keys;
};

export const monthStart = (key: string) => new Date(`${key}-01T00:00:00`);
export const monthEnd = (key: string) => endOfMonth(monthStart(key));

/** True when [from, to] (yyyy-MM-dd strings) touches the period. */
export const overlaps = (
  from: string | null,
  to: string | null,
  period: GstPeriod
) => {
  if (!from) return false;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to ?? from}T00:00:00`);
  return (
    !isAfter(start, period.to) && !isBefore(end, startOfMonth(period.from))
  );
};

/** A date the way the GST tables print one: 05 Aug 2026. */
export const gstDate = (iso?: string) =>
  iso ? format(new Date(`${iso}T00:00:00`), "dd MMM yyyy") : "-";

/* ------------------------------------------------------------- rows */

/** A row's stable id: its 2B line, else its PR line. */
export const rowId = (row: InvoiceViewRow) =>
  row.gstr2b?.gstr2bLineUuid ?? row.pr?.prLineUuid ?? "";

export const hasRemark = (row: InvoiceViewRow, key: RemarkKey) =>
  !!row.remarks?.includes(key);

const sum = (
  rows: (InvoiceViewData | null)[],
  pick: (d: InvoiceViewData) => number
) => rows.reduce((total, d) => total + (d ? pick(d) : 0), 0);

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a 2B and a PR line disagree on, as remarks[] keys. */
export const diffRemarks = (
  a: InvoiceViewData,
  b: InvoiceViewData
): RemarkKey[] => {
  const keys: RemarkKey[] = [];
  const near = (x: number, y: number) => Math.abs(x - y) < 0.01;
  if (a.gstin !== b.gstin) keys.push(REMARK_KEY_BY_COLUMN.gstin);
  if (a.invoiceNo !== b.invoiceNo) keys.push(REMARK_KEY_BY_COLUMN.invoiceNo);
  if (a.invoiceDate !== b.invoiceDate)
    keys.push(REMARK_KEY_BY_COLUMN.invoiceDate);
  if (!near(a.taxableAmount, b.taxableAmount))
    keys.push(REMARK_KEY_BY_COLUMN.taxableAmount);
  if (!near(a.invoiceAmount, b.invoiceAmount))
    keys.push(REMARK_KEY_BY_COLUMN.invoiceAmount);
  if (!!a.igst !== !!b.igst) keys.push(REMARK_KEY_BY_COLUMN.taxStructure);
  if (!near(a.cgst, b.cgst)) keys.push(REMARK_KEY_BY_COLUMN.cgst);
  if (!near(a.sgst, b.sgst)) keys.push(REMARK_KEY_BY_COLUMN.sgst);
  if (!near(a.igst, b.igst)) keys.push(REMARK_KEY_BY_COLUMN.igst);
  if (!near(a.totalGst, b.totalGst)) keys.push(REMARK_KEY_BY_COLUMN.totalGst);
  return keys;
};

/* ------------------------------------------------------- aggregate views */

type Totals = {
  gstr2bCount: number;
  gstr2bTaxableValue: number;
  gstr2bTaxValue: number;
  prCount: number;
  prTaxableValue: number;
  prTaxValue: number;
};

const totalsOf = (rows: InvoiceViewRow[]): Totals => {
  const twoB = rows.map((r) => r.gstr2b);
  const pr = rows.map((r) => r.pr);
  return {
    gstr2bCount: twoB.filter(Boolean).length,
    gstr2bTaxableValue: round2(sum(twoB, (d) => d.taxableAmount)),
    gstr2bTaxValue: round2(sum(twoB, (d) => d.totalGst)),
    prCount: pr.filter(Boolean).length,
    prTaxableValue: round2(sum(pr, (d) => d.taxableAmount)),
    prTaxValue: round2(sum(pr, (d) => d.totalGst)),
  };
};

const breakdown = (rows: InvoiceViewRow[]) => ({
  matchStatusMatched: rows.filter((r) => MATCHED_TYPES.includes(r.matchType))
    .length,
  matchStatusAiProbableMatch: rows.filter(
    (r) => r.matchType === GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH
  ).length,
  matchStatusMissing: rows.filter((r) => MISSING_TYPES.includes(r.matchType))
    .length,
});

const withDiff = (t: Totals) => ({
  ...t,
  diffCount: t.gstr2bCount - t.prCount,
  diffTaxableValue: round2(t.gstr2bTaxableValue - t.prTaxableValue),
  diffTaxValue: round2(t.gstr2bTaxValue - t.prTaxValue),
});

// DEV: GET /api/gst-reconciliation/gstr-2b-summary-view?companyId=…&customerGstin=…&periodFrom=…&periodTo=…&<key>Order=…
export const buildSummaryView = (
  rows: InvoiceViewRow[]
): Gstr2bSummaryViewTableData[] => {
  const line = (matchStatus: string, subset: InvoiceViewRow[]) => {
    const t = withDiff(totalsOf(subset));
    return {
      matchStatus,
      gstr2bCount: t.gstr2bCount,
      gstr2bTaxableValue: t.gstr2bTaxableValue,
      gstr2bTaxValue: t.gstr2bTaxValue,
      prCount: t.prCount,
      prTaxableValue: t.prTaxableValue,
      prTaxValue: t.prTaxValue,
      differenceCount: t.diffCount,
      differenceTaxableValue: t.diffTaxableValue,
      differenceTaxValue: t.diffTaxValue,
    };
  };
  return [
    ...GSTR2B_MATCH_TYPE_ORDER.map((type) =>
      line(
        type,
        rows.filter((r) => r.matchType === type)
      )
    ),
    line("total", rows),
  ];
};

/** The month a row belongs to: its 2B line's, else its PR line's. */
const monthOf = (row: InvoiceViewRow) =>
  (row.gstr2b?.invoiceDate ?? row.pr?.invoiceDate ?? "").slice(0, 7);

// DEV: GET /api/gst-reconciliation/gstr-2b-month-view?companyId=…&customerGstin=…&periodFrom=…&periodTo=…&<key>Order=…
export const buildMonthView = (
  rows: InvoiceViewRow[],
  months: string[]
): Gstr2bMonthViewTableData[] => {
  const line = (month: string, subset: InvoiceViewRow[]) => ({
    ...withDiff(totalsOf(subset)),
    ...breakdown(subset),
    month,
  });
  return [
    ...months
      .map((key) => ({ key, subset: rows.filter((r) => monthOf(r) === key) }))
      .filter(({ subset }) => subset.length)
      .map(({ key, subset }) =>
        line(format(monthStart(key), "MMM yyyy"), subset)
      ),
    line("total", rows),
  ];
};

// DEV: GET /api/gst-reconciliation/gstr-2b-vendor-view?companyId=…&customerGstin=…&periodFrom=…&periodTo=…&page=…&pageSize=…&<key>Order=…
export const buildVendorView = (
  rows: InvoiceViewRow[]
): Gstr2bVendorViewTableData[] => {
  const groups = new Map<string, InvoiceViewRow[]>();
  rows.forEach((r) => {
    const gstin = r.gstr2b?.gstin ?? r.pr?.gstin ?? "";
    groups.set(gstin, [...(groups.get(gstin) ?? []), r]);
  });
  return [...groups.entries()]
    .map(([gstin, subset]) => ({
      ...withDiff(totalsOf(subset)),
      ...breakdown(subset),
      gstin,
      // The 2B's legal name wins over however the PR spelt it.
      vendorName:
        subset.find((r) => r.gstr2b)?.gstr2b?.vendorName ??
        subset[0].pr?.vendorName ??
        "",
    }))
    .sort((a, b) => b.gstr2bTaxableValue - a.gstr2bTaxableValue);
};

// DEV: part of GET /api/gst-reconciliation/gstr-2b-invoice-view (results.gstr2b, .pr, .itcDetails)
export const buildInvoiceSummary = (
  rows: InvoiceViewRow[]
): InvoiceViewSummary => {
  const t = totalsOf(rows);
  const taxOf = (status: string) =>
    round2(
      rows
        .filter((r) => r.itcStatus === status)
        .reduce((total, r) => total + (r.gstr2b?.totalGst ?? 0), 0)
    );
  return {
    invoices: rows,
    gstr2b: {
      gstr2bCount: t.gstr2bCount,
      gstr2bTaxableAmount: t.gstr2bTaxableValue,
      gstr2bTaxAmount: t.gstr2bTaxValue,
    },
    pr: {
      prCount: t.prCount,
      prTaxableAmount: t.prTaxableValue,
      prTaxAmount: t.prTaxValue,
    },
    itcDetails: {
      itcClaim: taxOf(ITC_ACTION_VALUES.CLAIM),
      itcIneligible: taxOf(ITC_ACTION_VALUES.INELIGIBLE),
      itcReverseCharge: taxOf(ITC_ACTION_VALUES.REVERSE),
      // A row with a 2B line and nothing chosen for it yet.
      noAction: rows.filter((r) => r.gstr2b && !r.itcStatus).length,
    },
  };
};

/* --------------------------------------------------- invoice table filters */

const inRange = (value: number | undefined, from?: string, to?: string) => {
  if (value === undefined) return !from && !to;
  return (!from || value >= Number(from)) && (!to || value <= Number(to));
};

/** Either side satisfies the predicate — a filter on a pair matches the pair. */
const either = (row: InvoiceViewRow, test: (d: InvoiceViewData) => boolean) =>
  (row.gstr2b ? test(row.gstr2b) : false) || (row.pr ? test(row.pr) : false);

/** Invoice Type as the table prints it, amendment marker aside. */
export const invoiceTypeOf = (row: InvoiceViewRow) =>
  row.gstr2b?.documentType ?? row.pr?.documentType ?? "";

// DEV: production sends these as query params to gstr-2b-invoice-view.
export const filterInvoiceRows = (
  rows: InvoiceViewRow[],
  f: InvoiceTableFilterState,
  search: string
) => {
  const term = search.trim().toLowerCase();
  const amount =
    (
      key: "invoiceAmount" | "taxableAmount" | "cgst" | "sgst" | "igst" | "cess"
    ) =>
    (row: InvoiceViewRow) => {
      const from = f[`${key}From`];
      const to = f[`${key}To`];
      if (!from && !to) return true;
      return either(row, (d) => inRange(d[key], from, to));
    };
  return rows.filter(
    (row) =>
      (!term ||
        either(row, (d) =>
          [d.vendorName, d.gstin, d.invoiceNo].some((v) =>
            v.toLowerCase().includes(term)
          )
        )) &&
      (!f.matchType?.length || f.matchType.includes(row.matchType)) &&
      (!f.itcStatus?.length || f.itcStatus.includes(row.itcStatus ?? "")) &&
      (!f.documentType?.length ||
        f.documentType.includes(invoiceTypeOf(row))) &&
      (!f.gstin?.length || either(row, (d) => f.gstin!.includes(d.gstin))) &&
      (!f.vendorName?.length ||
        either(row, (d) => f.vendorName!.includes(d.vendorName))) &&
      (!f.invoiceNo?.length ||
        either(row, (d) => f.invoiceNo!.includes(d.invoiceNo))) &&
      (!f.invoiceDateFrom ||
        either(row, (d) => d.invoiceDate >= f.invoiceDateFrom!)) &&
      (!f.invoiceDateTo ||
        either(row, (d) => d.invoiceDate <= f.invoiceDateTo!)) &&
      amount("invoiceAmount")(row) &&
      amount("taxableAmount")(row) &&
      amount("cgst")(row) &&
      amount("sgst")(row) &&
      amount("igst")(row) &&
      amount("cess")(row)
  );
};

/** Distinct values of a field across both sides, for a column filter. */
export const distinctValues = (
  rows: InvoiceViewRow[],
  pick: (d: InvoiceViewData) => string
) =>
  [
    ...new Set(
      rows.flatMap((r) => [r.gstr2b, r.pr].filter(Boolean).map((d) => pick(d!)))
    ),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en-IN", { numeric: true }))
    .map((value) => ({ value, label: value }));

/* ------------------------------------------------------------------ files */

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const toCsv = (rows: (string | number)[][]) =>
  rows.map((r) => r.map(csvCell).join(",")).join("\n");

/** Saves a string as a file — the prototype's stand-in for a server download. */
export const downloadText = (
  fileName: string,
  text: string,
  type = "text/csv;charset=utf-8"
) => {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * The export's rows: one line per side of every pair, as the invoice view
 * draws them.
 *
 * DEV: production's POST /api/gst-reconciliation/export-results returns an
 * .xlsx built by the backend; this CSV only stands in for it.
 */
export const buildExportCsv = (rows: InvoiceViewRow[]) => {
  const head = [
    "Reco Status",
    "Source",
    "Invoice Type",
    "GSTIN",
    "Vendor Name",
    "Invoice Date",
    "Invoice No",
    "Invoice Amount",
    "Taxable Amount",
    "SGST",
    "CGST",
    "IGST",
    "CESS",
    "RCM",
    "ITC",
    "Mismatched Fields",
  ];
  const lines = rows.flatMap((row) =>
    (
      [
        ["2B", row.gstr2b],
        ["PR", row.pr],
      ] as const
    ).map(([source, d]) => [
      GSTR2B_MATCH_TYPE_LABELS[row.matchType as Gstr2bMatchTypeValueType],
      source,
      d?.documentType ?? "",
      d?.gstin ?? "",
      d?.vendorName ?? "",
      d?.invoiceDate ?? "",
      d?.invoiceNo ?? "",
      d?.invoiceAmount ?? "",
      d?.taxableAmount ?? "",
      d?.sgst ?? "",
      d?.cgst ?? "",
      d?.igst ?? "",
      d?.cess ?? "",
      source === "2B" && d ? (d.isReverseChargeApplied ? "Yes" : "No") : "",
      row.itcStatus ?? "",
      (row.remarks ?? []).join(" "),
    ])
  );
  return toCsv([head, ...lines]);
};
