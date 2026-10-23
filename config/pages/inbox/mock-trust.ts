import type { InboxItem } from "@/types/pages/inbox";
import type {
  AutoApproveSettings,
  TrustPattern,
} from "@/types/pages/inbox/automation";

/**
 * Auto-approve: each organisation's switch, and the vendor + ledger patterns
 * the AI has watched being approved.
 *
 * Built by functions rather than constants so the dates are relative to the
 * moment the demo loads ("last approved 3 days ago") on the client, where the
 * store seeds them.
 *
 * Every figure reconciles: Airtel's broadband is ₹4,000 + CGST ₹360 + SGST
 * ₹360 = ₹4,720 (Karnataka supplier, 18%); Zoho bills from Tamil Nadu, so its
 * ₹12,000 subscription carries IGST ₹2,160.
 *
 * DEV: GET /api/automation/trust?companyUuid=… returns TrustPattern[], and
 *      GET /api/automation/auto-approve?companyUuid=… the settings.
 */
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString();

export const mockAutoApproveSettings = (): AutoApproveSettings[] => [
  // Inbox-first agents prepare; approval remains a separate human action.
  { company: "shakun", enabled: false, minApprovals: 5, amountBand: 2 },
  { company: "acme", enabled: false, minApprovals: 5, amountBand: 2 },
  { company: "nandhini", enabled: false, minApprovals: 5, amountBand: 2 },
];

export const mockTrustPatterns = (): TrustPattern[] => [
  ...[
    {
      vendor: "Akshayakalpa Dairy (creditor)",
      ledger: "Purchase – Ingredients",
      usualAmount: 12600,
    },
    { vendor: "BESCOM", ledger: "Electricity", usualAmount: 28450 },
    {
      vendor: "Bharti Airtel Ltd",
      ledger: "Internet Charges",
      usualAmount: 2360,
    },
  ].map((p, n) => ({
    ...p,
    id: `nd-trust-${n}`,
    company: "nandhini",
    approvals: 6 + n,
    edits: 0,
    streak: 6 + n,
    lastSeenAt: daysAgo(n + 1),
  })),
  {
    id: "trust-airtel-bb",
    company: "shakun",
    vendor: "Bharti Airtel Ltd",
    ledger: "Internet Charges",
    approvals: 6,
    edits: 0,
    streak: 6,
    usualAmount: 4720,
    lastSeenAt: daysAgo(31),
  },
  {
    id: "trust-airtel-post",
    company: "shakun",
    vendor: "Bharti Airtel Ltd",
    ledger: "Telephone Charges",
    approvals: 8,
    edits: 0,
    streak: 8,
    usualAmount: 2360,
    lastSeenAt: daysAgo(30),
  },
  {
    id: "trust-zoho",
    company: "shakun",
    vendor: "Zoho Corporation Pvt Ltd",
    ledger: "Software Subscription",
    approvals: 5,
    edits: 0,
    streak: 5,
    usualAmount: 14160,
    lastSeenAt: daysAgo(30),
  },
  {
    id: "trust-bescom",
    company: "shakun",
    vendor: "Bangalore Electricity Supply Company Ltd",
    ledger: "Power & Fuel",
    approvals: 9,
    edits: 0,
    streak: 9,
    usualAmount: 412380,
    lastSeenAt: daysAgo(33),
  },
  {
    id: "trust-bluedart",
    company: "shakun",
    vendor: "Blue Dart Express Ltd",
    ledger: "Freight Outward",
    approvals: 7,
    edits: 1,
    streak: 0,
    lastEditAt: daysAgo(0.05),
    lastEditNote: "Cost centre changed from Plant to Head Office",
    usualAmount: 52100,
    lastSeenAt: daysAgo(0.05),
  },
  {
    id: "trust-tally",
    company: "shakun",
    vendor: "Tally Solutions Pvt Ltd",
    ledger: "Software Subscription",
    approvals: 3,
    edits: 0,
    streak: 3,
    usualAmount: 14337,
    lastSeenAt: daysAgo(64),
  },
  {
    id: "trust-durga",
    company: "shakun",
    vendor: "Sri Durga Filling Station",
    ledger: "Vehicle Running & Maintenance",
    approvals: 11,
    edits: 2,
    streak: 2,
    lastEditAt: daysAgo(19),
    lastEditNote:
      "Ledger changed from Power & Fuel to Vehicle Running & Maintenance",
    usualAmount: 18900,
    lastSeenAt: daysAgo(6),
  },
  {
    id: "trust-bvg",
    company: "shakun",
    vendor: "BVG India Ltd",
    ledger: "Housekeeping Charges",
    approvals: 4,
    edits: 0,
    streak: 4,
    usualAmount: 54752,
    lastSeenAt: daysAgo(40),
  },
  {
    id: "trust-mahindra",
    company: "acme",
    vendor: "Mahindra Logistics Ltd",
    ledger: "Freight Inward",
    approvals: 40,
    edits: 2,
    streak: 11,
    lastEditAt: daysAgo(52),
    lastEditNote: "Ledger changed from Transportation to Freight Inward",
    usualAmount: 38940,
    lastSeenAt: daysAgo(0.2),
  },
  {
    id: "trust-msedcl",
    company: "acme",
    vendor: "Maharashtra State Electricity Distribution Co Ltd",
    ledger: "Power & Fuel",
    approvals: 6,
    edits: 0,
    streak: 6,
    usualAmount: 186420,
    lastSeenAt: daysAgo(28),
  },
];

const GST_REG = "Karnataka HQ · 29AAWCS8421F1ZR";

/**
 * The bills that came in overnight for Shakunthalam and met a trusted
 * pattern (`autoApproved`), and the one that came from a trusted vendor but
 * did not (`held`). Read the same way as every other mock bill.
 *
 * DEV: these are ordinary GET /api/inbox items; the server sets
 *      `autoApproved` / `autoHold` on them.
 */
export const mockAutoApprovalBills = (): {
  bill: InboxItem;
  pattern: string;
  outcome: "approved" | "held";
  minutesAgo: number;
}[] => [
  {
    pattern: "trust-airtel-bb",
    outcome: "approved",
    minutesAgo: 205,
    bill: {
      id: "AUTO-3101",
      file: {
        name: "Airtel_Broadband_1-2B4XK9Q_Oct2026.pdf",
        size: "88 KB",
        ext: "pdf",
      },
      source: {
        channel: "email",
        sender: "ebill@airtel.com",
        subject: "Your Airtel Business broadband bill for October 2026",
      },
      vendor: "Bharti Airtel Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: {
        confidence: 0.97,
        rationale: "Monthly broadband bill — Internet Charges, as every month.",
      },
      amount: 4720,
      receivedAt: new Date(Date.now() - 215 * 60_000).toISOString(),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/26-27/0402",
        supplierInvoiceNo: "BLR/2610/44871",
        billDate: "1 Oct 2026",
        dueDate: "21 Oct 2026",
        gstReg: GST_REG,
        costCentre: null,
        flagged: [],
        items: [
          {
            desc: "Airtel Business Broadband 200 Mbps — Oct 2026",
            ledger: "Internet Charges",
            amount: 4000,
            hsn: "998422",
          },
        ],
        taxes: { cgst: 360, sgst: 360 },
        subTotal: 4000,
        grandTotal: 4720,
      },
    },
  },
  {
    pattern: "trust-airtel-post",
    outcome: "approved",
    minutesAgo: 204,
    bill: {
      id: "AUTO-3102",
      file: {
        name: "Airtel_Postpaid_9845012342_Oct2026.pdf",
        size: "72 KB",
        ext: "pdf",
      },
      source: {
        channel: "email",
        sender: "ebill@airtel.com",
        subject: "Your Airtel postpaid bill for October 2026",
      },
      vendor: "Bharti Airtel Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: {
        confidence: 0.96,
        rationale: "Monthly postpaid bill — Telephone Charges, as every month.",
      },
      amount: 2360,
      receivedAt: new Date(Date.now() - 214 * 60_000).toISOString(),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/26-27/0403",
        supplierInvoiceNo: "KA/MOB/2610/118203",
        billDate: "1 Oct 2026",
        dueDate: "21 Oct 2026",
        gstReg: GST_REG,
        costCentre: null,
        flagged: [],
        items: [
          {
            desc: "Postpaid plan — 5 connections, Oct 2026",
            ledger: "Telephone Charges",
            amount: 2000,
            hsn: "998413",
          },
        ],
        taxes: { cgst: 180, sgst: 180 },
        subTotal: 2000,
        grandTotal: 2360,
      },
    },
  },
  {
    pattern: "trust-zoho",
    outcome: "approved",
    minutesAgo: 96,
    bill: {
      id: "AUTO-3103",
      file: {
        name: "Zoho_Invoice_INV-2627-4512077.pdf",
        size: "64 KB",
        ext: "pdf",
      },
      source: {
        channel: "email",
        sender: "billing@zohocorp.com",
        subject: "Zoho One — invoice for October 2026",
      },
      vendor: "Zoho Corporation Pvt Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: {
        confidence: 0.96,
        rationale: "Monthly Zoho One subscription — Software Subscription.",
      },
      amount: 14160,
      receivedAt: new Date(Date.now() - 104 * 60_000).toISOString(),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/26-27/0404",
        supplierInvoiceNo: "INV-2627-4512077",
        billDate: "2 Oct 2026",
        dueDate: "2 Oct 2026",
        gstReg: GST_REG,
        costCentre: null,
        flagged: [],
        items: [
          {
            desc: "Zoho One — 10 users, Oct 2026",
            ledger: "Software Subscription",
            amount: 12000,
            hsn: "997331",
          },
        ],
        taxes: { igst: 2160 },
        subTotal: 12000,
        grandTotal: 14160,
      },
    },
  },
  {
    pattern: "trust-airtel-bb",
    outcome: "held",
    minutesAgo: 40,
    bill: {
      id: "AUTO-3104",
      file: {
        name: "Airtel_Business_Router_INV-BLR-2610-45120.pdf",
        size: "96 KB",
        ext: "pdf",
      },
      source: {
        channel: "email",
        sender: "ebill@airtel.com",
        subject: "Airtel Business — one-time equipment charge",
      },
      vendor: "Bharti Airtel Ltd",
      voucherType: "Purchase",
      route: "AP",
      ai: {
        confidence: 0.82,
        rationale: "Airtel bill, but a one-time equipment charge.",
      },
      amount: 47200,
      receivedAt: new Date(Date.now() - 44 * 60_000).toISOString(),
      status: "needs-review",
      bill: {
        voucherNo: "PUR/26-27/0405",
        supplierInvoiceNo: "BLR/2610/45120",
        billDate: "12 Oct 2026",
        dueDate: "1 Nov 2026",
        gstReg: GST_REG,
        costCentre: null,
        flagged: [],
        items: [
          {
            desc: "Enterprise router (Cisco ISR 1100) — one-time charge",
            ledger: "Internet Charges",
            amount: 40000,
            hsn: "851762",
          },
        ],
        taxes: { cgst: 3600, sgst: 3600 },
        subTotal: 40000,
        grandTotal: 47200,
      },
    },
  },
];
