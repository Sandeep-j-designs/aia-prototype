import type { FirmRest } from "@/types/pages/neo/brief";

/**
 * The firm beyond the two companies this prototype has books for. The brief
 * shows them as one line, because the point it makes — most clients need
 * nothing today — is the point of ranking the rest. Nothing here is drawn as
 * if it were a live client: no names, no amounts, no row that opens.
 *
 * DEV: GET /api/neo/brief returns every client the user can see; this file
 * and the line it feeds are deleted.
 */
export const MOCK_FIRM_REST: FirmRest = {
  clients: 29,
  note: "Queues clear or within auto-approve trust",
};

/**
 * The return the brief counts down to. GSTR-3B for September is due on
 * 20 October for monthly filers.
 */
export const BRIEF_DEADLINE = {
  label: "GSTR-3B",
  period: "September",
  due: "2026-10-20",
};

/**
 * The returns an accountant's month runs on, from DEMO_TODAY (13 Oct 2026)
 * onwards, for monthly GST filers deducting TDS. The brief shows the next
 * few and tags each signal with the return it threatens.
 *
 * DEV: GET /api/compliance/calendar?company=… — per client, as filing
 * frequency (QRMP, quarterly TDS) differs.
 */
export const COMPLIANCE_CALENDAR = [
  { id: "gstr3b", label: "GSTR-3B", period: "September", due: "2026-10-20" },
  { id: "tds26q", label: "TDS return 26Q", period: "Q2", due: "2026-10-31" },
  { id: "tds", label: "TDS deposit", period: "October", due: "2026-11-07" },
  { id: "gstr1", label: "GSTR-1", period: "October", due: "2026-11-11" },
  {
    id: "advance",
    label: "Advance tax",
    period: "3rd instalment",
    due: "2026-12-15",
  },
];
