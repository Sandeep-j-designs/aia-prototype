import { useSyncExternalStore } from "react";
import { format } from "date-fns";
import {
  GSTR2B_MATCH_TYPE,
  Gstr2BStatusEnums,
  GSTR2B_PORTAL_ENTITY,
  GST_FILE_CATEGORIES,
  GST_TIMINGS,
  PrFileStatusEnums,
  type ITC_ACTION_VALUES_VALUE_TYPE,
} from "@/config/pages/inbox/gst";
import {
  runPairsFor,
  seedFor,
  type GstCompanyProfile,
} from "@/config/pages/inbox/mock-gst";
import type {
  GstPeriod,
  GstReconGstin,
  gstr2BDataStatusType,
  InvoiceViewPrData,
  InvoiceViewRow,
  MappingConfig,
  PrFileStatus,
  SavedAuthDataResponse,
} from "@/types/pages/inbox/gst";
import {
  diffRemarks,
  isoDay,
  monthEnd,
  monthStart,
  monthsIn,
  overlaps,
  rowId,
} from "@/utils/pages/inbox/gst";

/**
 * GST reconciliation state for one company.
 *
 * Module-level, so the reconciliation sheet, the results tabs and a timer
 * finishing an extraction all read and write the same thing, and closing the
 * sheet mid-fetch does not lose the fetch. In memory only: a reload starts
 * from the mocks again.
 *
 * Every write names the production endpoint it stands in for. The timers
 * stand in for production's 5-second poll of combined-file-status.
 */

type GstState = {
  /** The company's own identity — its name, GSTIN and state. */
  profile: GstCompanyProfile;
  gstins: GstReconGstin[];
  savedAuth: SavedAuthDataResponse;
  /** The portal session: set once an OTP is verified, as the backend keeps it. */
  portalAuthenticated: boolean;
  twoB: gstr2BDataStatusType[];
  pr: PrFileStatus[];
  /** Saved column mappings, by file. */
  mappings: Record<string, MappingConfig>;
  /** Reconciled rows, by month (yyyy-MM). A month absent here has no run. */
  invoices: Record<string, InvoiceViewRow[]>;
};

const stores = new Map<string, GstState>();
const listeners = new Set<() => void>();

const seed = (company: string): GstState => {
  // DEV: GET /api/gst-reconciliation/gstin?companyId=…,
  // GET …/get-saved-auth-details, GET …/combined-file-status and
  // GET …/gstr-2b-invoice-view — all scoped to the session's company.
  const data = structuredClone(seedFor(company));
  return {
    profile: data.profile,
    gstins: data.gstins,
    savedAuth: data.savedAuth,
    portalAuthenticated: false,
    twoB: data.twoB,
    pr: data.pr,
    mappings: {},
    invoices: data.invoices,
  };
};

const read = (company: string) => {
  let state = stores.get(company);
  if (!state) {
    state = seed(company);
    stores.set(company, state);
  }
  return state;
};

const write = (company: string, next: Partial<GstState>) => {
  stores.set(company, { ...read(company), ...next });
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useGstState = (company: string) =>
  useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  );

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const now = () => new Date().toISOString();
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** The rows a run of this month will produce — the same ones every time. */
const pairsFor = (company: string, key: string) => {
  const start = monthStart(key);
  return runPairsFor(company, start.getFullYear(), start.getMonth());
};

const twoBLineCount = (company: string, key: string) =>
  pairsFor(company, key).filter((row) => row.gstr2b).length;

/* ---------------------------------------------------------------- selectors */

export const statusFor = (state: GstState, period: GstPeriod) => ({
  twoB: state.twoB.filter((s) => overlaps(s.periodFrom, s.periodTo, period)),
  pr: state.pr.filter((s) => overlaps(s.periodFrom, s.periodTo, period)),
});

/** Every reconciled row in the period, month by month. */
export const invoicesFor = (state: GstState, period: GstPeriod) =>
  monthsIn(period).flatMap((key) => state.invoices[key] ?? []);

/**
 * Whether the period has results to show.
 *
 * DEV: production asks GET /api/gst-reconciliation/data-availability once per
 * GSTIN, not per period, and shows the start card only for a GSTIN with no
 * data at all. The prototype asks per period, so an unreconciled month shows
 * the card instead of six empty tables.
 */
export const hasDataFor = (state: GstState, period: GstPeriod) =>
  monthsIn(period).some((key) => !!state.invoices[key]);

/** Every row in every month, with the month it lives in. */
const locate = (state: GstState, id: string) => {
  for (const [key, rows] of Object.entries(state.invoices)) {
    const index = rows.findIndex((row) => rowId(row) === id);
    if (index >= 0) return { key, index, row: rows[index] };
  }
  return null;
};

const replaceRows = (
  state: GstState,
  key: string,
  update: (rows: InvoiceViewRow[]) => InvoiceViewRow[]
) => ({ ...state.invoices, [key]: update(state.invoices[key] ?? []) });

/* ------------------------------------------------------------------ actions */

export const gst = {
  /**
   * Fetch GSTR-2B from the portal. Without a portal session the backend
   * answers 401, which is what opens Portal Authentication.
   */
  async fetch2b(company: string, gstin: string, period: GstPeriod) {
    // DEV: GET /api/gst-reconciliation/get-gstr-2b-data?gstin=…&companyUuid=…&ucUuid=…&startPeriod=MMYYYY&endPeriod=MMYYYY
    await wait(500);
    if (!read(company).portalAuthenticated) return "auth_required" as const;
    const months = monthsIn(period);
    const items: gstr2BDataStatusType[] = months.map((key) => ({
      creationDate: now(),
      requestUuid: uid("req"),
      fileStatusUuid: uid("fs-2b"),
      periodFrom: isoDay(monthStart(key)),
      periodTo: isoDay(monthEnd(key)),
      gstin,
      entityType: GSTR2B_PORTAL_ENTITY,
      status: Gstr2BStatusEnums.IN_PROGRESS,
      errorMessage: null,
      lastUpdatedBy: read(company).profile.name,
      lastUpdateDate: now(),
      gstr2bLineCount: 0,
    }));
    // DEV: POST /api/gst-reconciliation/gstr-2b-data-status { companyId, requestUuids: [{ requestUuid, periodFrom, periodTo, gstin, status: "in_progress", entityType: "2b_data" }] }
    write(company, { twoB: [...read(company).twoB, ...items] });
    window.setTimeout(() => {
      const state = read(company);
      write(company, {
        twoB: state.twoB.map((s) => {
          const item = items.find((i) => i.requestUuid === s.requestUuid);
          return item
            ? {
                ...s,
                status: Gstr2BStatusEnums.EXTRACTION_SUCCESSFUL,
                gstr2bLineCount: twoBLineCount(
                  company,
                  (s.periodFrom ?? "").slice(0, 7)
                ),
                lastUpdateDate: now(),
              }
            : s;
        }),
      });
    }, GST_TIMINGS.fetch2b);
    return "ok" as const;
  },

  /** Request an OTP. A username of "noapi" stands in for API access off. */
  async requestOtp(company: string, username: string, saveDetails: boolean) {
    // DEV: POST /api/gst-reconciliation/gst-portal-auth/send-otp { gstin, username, companyUuid, ucUuid, isSaved }
    await wait(GST_TIMINGS.otp);
    if (username.trim().toLowerCase() === "noapi") return false;
    if (saveDetails)
      write(company, {
        savedAuth: { ...read(company).savedAuth, username, isSaved: true },
      });
    return true;
  },

  /** Verify the OTP. Any six digits pass here. */
  async verifyOtp(company: string, otp: string) {
    // DEV: POST /api/gst-reconciliation/gst-portal-auth/verify-otp { gstin, otp, companyUuid, ucUuid }
    await wait(GST_TIMINGS.otp);
    if (!/^\d{6}$/.test(otp)) return false;
    write(company, { portalAuthenticated: true });
    return true;
  },

  /** Upload a 2B file. A name with "fail" in it fails extraction. */
  upload2b(company: string, gstin: string, period: GstPeriod, file: File) {
    // DEV: presigned upload (getPresignedUrl → uploadFileToStorage), then
    // DEV: POST /api/gst-reconciliation/pr-file-status { fileCategory: "two_b_file", status: "in_progress", … }
    const item: gstr2BDataStatusType = {
      creationDate: now(),
      fileName: file.name,
      fileStatusUuid: uid("fs-2b"),
      fileUuid: uid("file"),
      periodFrom: isoDay(period.from),
      periodTo: isoDay(period.to),
      gstin,
      entityType: GST_FILE_CATEGORIES.GSTR2B,
      status: Gstr2BStatusEnums.IN_PROGRESS,
      errorMessage: null,
      lastUpdatedBy: read(company).profile.name,
      lastUpdateDate: now(),
      gstr2bLineCount: 0,
    };
    write(company, { twoB: [...read(company).twoB, item] });
    window.setTimeout(() => {
      const failed = /fail/i.test(file.name);
      const lines = monthsIn(period).reduce(
        (total, key) => total + twoBLineCount(company, key),
        0
      );
      write(company, {
        twoB: read(company).twoB.map((s) =>
          s.fileStatusUuid === item.fileStatusUuid
            ? {
                ...s,
                status: failed
                  ? Gstr2BStatusEnums.EXTRACTION_FAILED
                  : Gstr2BStatusEnums.EXTRACTION_SUCCESSFUL,
                errorMessage: failed
                  ? "Could not read the file. Upload the JSON from the GST portal."
                  : null,
                gstr2bLineCount: failed ? 0 : lines,
                lastUpdateDate: now(),
              }
            : s
        ),
      });
    }, GST_TIMINGS.upload2b);
  },

  delete2b(company: string, item: gstr2BDataStatusType) {
    // DEV: DELETE /api/gst-reconciliation/gstr-2b-data-status { companyId, requestUuid } (portal fetch)
    // DEV: DELETE /api/gst-reconciliation/pr-file-status { companyId, fileStatusUuid } (uploaded file)
    write(company, {
      twoB: read(company).twoB.filter(
        (s) => s.fileStatusUuid !== item.fileStatusUuid
      ),
    });
  },

  /** Upload a Purchase Register. It waits on its column mapping. */
  uploadPr(company: string, gstin: string, period: GstPeriod, file: File) {
    // DEV: presigned upload, then POST /api/gst-reconciliation/pr-file-status { fileCategory: "pr_file", status: "mapping_required", … }
    const item: PrFileStatus = {
      fileStatusUuid: uid("fs-pr"),
      thirdPartyProduct: "gst_recon",
      periodFrom: isoDay(period.from),
      periodTo: isoDay(period.to),
      fileUuid: uid("file"),
      fileCategory: GST_FILE_CATEGORIES.PR_FILE,
      fileName: file.name,
      gstin,
      status: PrFileStatusEnums.MAPPING_REQUIRED,
      companyUuid: company,
      isActive: true,
      creationDate: now(),
      lastUpdateDate: now(),
      errorPayload: null,
      lastUpdatedBy: null,
    };
    write(company, { pr: [...read(company).pr, item] });
    return item;
  },

  setPrStatus(
    company: string,
    fileStatusUuid: string,
    status: PrFileStatus["status"],
    error?: string
  ) {
    // DEV: PATCH /api/gst-reconciliation/pr-file-status { companyId, fileStatusUuid, status }
    write(company, {
      pr: read(company).pr.map((s) =>
        s.fileStatusUuid === fileStatusUuid
          ? {
              ...s,
              status,
              errorPayload: error ? { error } : null,
              lastUpdateDate: now(),
            }
          : s
      ),
    });
  },

  /**
   * Map & Import: save the mapping, mark the file In Progress, and let the
   * backend extract it. A file with "fail" in its name fails, so Retry has
   * something to do.
   */
  mapAndImport(company: string, file: PrFileStatus, mapping: MappingConfig) {
    write(company, {
      mappings: { ...read(company).mappings, [file.fileUuid]: mapping },
    });
    gst.setPrStatus(
      company,
      file.fileStatusUuid,
      PrFileStatusEnums.IN_PROGRESS
    );
    // DEV: then updateUploadStatus(fileUuid, session, true, { customerGstin, periodFrom, periodTo, mappings, sheetName, headerOffset })
    window.setTimeout(() => {
      const failed = /fail/i.test(file.fileName);
      gst.setPrStatus(
        company,
        file.fileStatusUuid,
        failed
          ? PrFileStatusEnums.EXTRACTION_FAILED
          : PrFileStatusEnums.EXTRACTION_SUCCESSFUL,
        failed ? "Invoice Date could not be read in 214 rows." : undefined
      );
    }, GST_TIMINGS.prIngest);
  },

  retryPr(company: string, file: PrFileStatus) {
    // DEV: production re-reads the file and calls updateUploadStatus again.
    gst.setPrStatus(
      company,
      file.fileStatusUuid,
      PrFileStatusEnums.IN_PROGRESS
    );
    window.setTimeout(
      () =>
        gst.setPrStatus(
          company,
          file.fileStatusUuid,
          PrFileStatusEnums.EXTRACTION_SUCCESSFUL
        ),
      GST_TIMINGS.prIngest
    );
  },

  deletePr(company: string, file: PrFileStatus) {
    // DEV: DELETE /api/gst-reconciliation/pr-file-status { companyId, fileStatusUuid }
    const { [file.fileUuid]: _dropped, ...mappings } = read(company).mappings;
    write(company, {
      pr: read(company).pr.filter(
        (s) => s.fileStatusUuid !== file.fileStatusUuid
      ),
      mappings,
    });
  },

  /**
   * Run Reconciliation. Every month in the period without results gets its
   * set; a month already reconciled keeps its rows, and the edits on them.
   */
  async runReconcile(company: string, period: GstPeriod) {
    // DEV: POST /api/gst-reconciliation/run-reconcile { companyId, customerGstin, reconPeriodFrom, reconPeriodTo }
    await wait(GST_TIMINGS.reconcile);
    const state = read(company);
    const invoices = { ...state.invoices };
    monthsIn(period).forEach((key) => {
      if (!invoices[key]) invoices[key] = pairsFor(company, key);
    });
    write(company, { invoices });
  },

  setRcm(company: string, gstr2bLineUuid: string, value: boolean) {
    // DEV: POST /api/gst-reconciliation/actions/rcm { companyId, gstr2bLineUuid: [uuid], isReverseChargeApplied }
    const hit = locate(read(company), gstr2bLineUuid);
    if (!hit?.row.gstr2b) return;
    write(company, {
      invoices: replaceRows(read(company), hit.key, (rows) =>
        rows.map((row, i) =>
          i === hit.index && row.gstr2b
            ? {
                ...row,
                gstr2b: { ...row.gstr2b, isReverseChargeApplied: value },
              }
            : row
        )
      ),
    });
  },

  setItc(
    company: string,
    gstr2bLineUuid: string,
    value: ITC_ACTION_VALUES_VALUE_TYPE
  ) {
    // DEV: POST /api/gst-reconciliation/actions/itc { companyId, gstr2bLineUuid: [uuid], itcAction, customerGstin }
    const hit = locate(read(company), gstr2bLineUuid);
    if (!hit) return;
    write(company, {
      invoices: replaceRows(read(company), hit.key, (rows) =>
        rows.map((row, i) =>
          i === hit.index ? { ...row, itcStatus: value } : row
        )
      ),
    });
  },

  /** Delink: the pair splits into a Missing in PR and a Missing in 2B row. */
  delink(company: string, row: InvoiceViewRow) {
    // DEV: DELETE /api/gst-reconciliation/actions/delink { companyId, reconRunUuid: row.reconRunUuids }
    const hit = locate(read(company), rowId(row));
    if (!hit || !row.gstr2b || !row.pr) return;
    const split: InvoiceViewRow[] = [
      {
        matchType: GSTR2B_MATCH_TYPE.MISSING_IN_PR,
        remarks: [],
        gstr2b: row.gstr2b,
        pr: null,
        reconRunUuids: [],
        itcStatus: row.itcStatus,
      },
      {
        matchType: GSTR2B_MATCH_TYPE.MISSING_IN_2B,
        remarks: [],
        gstr2b: null,
        pr: row.pr,
        reconRunUuids: [],
        itcStatus: null,
      },
    ];
    write(company, {
      invoices: replaceRows(read(company), hit.key, (rows) => [
        ...rows.slice(0, hit.index),
        ...split,
        ...rows.slice(hit.index + 1),
      ]),
    });
  },

  /**
   * Link: an unmatched line takes one or more lines from the other side and
   * the pair becomes Manually Matched. Several PR lines against one 2B
   * invoice are summed into one PR side, invoice numbers joined.
   */
  link(company: string, base: InvoiceViewRow, picked: string[]) {
    // DEV: POST /api/gst-reconciliation/actions/link-gstr2b { companyId, gstr2bLineUuid, prLineUuid: [...] } (base is a 2B line)
    // DEV: POST /api/gst-reconciliation/actions/link-pr { companyId, prLineUuid, gstr2bLineUuid: [...] } (base is a PR line)
    let state = read(company);
    const hit = locate(state, rowId(base));
    if (!hit) return;
    const others = picked
      .map((id) => locate(state, id)?.row)
      .filter((row): row is InvoiceViewRow => !!row);
    if (!others.length) return;

    const sides = others.map((r) => (base.gstr2b ? r.pr : r.gstr2b)!);
    const merged = sides.slice(1).reduce(
      (acc, d) => ({
        ...acc,
        invoiceNo: `${acc.invoiceNo}, ${d.invoiceNo}`,
        invoiceAmount: acc.invoiceAmount + d.invoiceAmount,
        taxableAmount: acc.taxableAmount + d.taxableAmount,
        cgst: acc.cgst + d.cgst,
        sgst: acc.sgst + d.sgst,
        igst: acc.igst + d.igst,
        cess: acc.cess + d.cess,
        totalGst: acc.totalGst + d.totalGst,
      }),
      { ...sides[0] }
    );
    const gstr2b = base.gstr2b ?? (merged as InvoiceViewRow["gstr2b"]);
    const pr = base.pr ?? (merged as InvoiceViewPrData);
    const linked: InvoiceViewRow = {
      matchType: GSTR2B_MATCH_TYPE.MANUALLY_MATCHED,
      remarks: diffRemarks(gstr2b!, pr!),
      gstr2b,
      pr,
      reconRunUuids: [uid("rr")],
      itcStatus: base.gstr2b ? base.itcStatus : (others[0].itcStatus ?? null),
    };

    // Take the picked lines out of whichever month holds them…
    const pickedIds = new Set(picked);
    const invoices = Object.fromEntries(
      Object.entries(state.invoices).map(([key, rows]) => [
        key,
        rows.filter((row) => !pickedIds.has(rowId(row))),
      ])
    );
    state = { ...state, invoices };
    // …and put the pair where the base line was.
    const at = locate(state, rowId(base));
    if (!at) return;
    write(company, {
      invoices: replaceRows(state, at.key, (rows) =>
        rows.map((row, i) => (i === at.index ? linked : row))
      ),
    });
  },

  saveRemark(company: string, prLineUuid: string, remarks: string) {
    // DEV: PATCH /api/gst-reconciliation/actions/remarks { companyId, prLineUuid, remarks }
    const normalized = remarks
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .join(", ");
    const state = read(company);
    // A paired row is keyed by its 2B line, so look on the PR side.
    for (const [key, rows] of Object.entries(state.invoices)) {
      const index = rows.findIndex((r) => r.pr?.prLineUuid === prLineUuid);
      if (index < 0) continue;
      write(company, {
        invoices: replaceRows(state, key, (list) =>
          list.map((r, i) =>
            i === index && r.pr
              ? { ...r, pr: { ...r.pr, remarks: normalized } }
              : r
          )
        ),
      });
      return;
    }
  },
};

/** "Sep 2026", for a 2B status item's title. */
export const monthTitle = (iso: string | null) =>
  iso ? format(new Date(`${iso}T00:00:00`), "MMM yyyy") : "";
