import type { InboxItem } from "@/types/pages/inbox";

/**
 * Neo voucher entry, phase A: the ten September bills from the Harihar plant
 * that the accountant forwards with one line of instruction.
 *
 * They are ordinary extractions — what the Inbox reads off each document —
 * and scripts/source-docs/generate.cjs prints them to public/docs, so every
 * draft Neo makes opens beside its own paper. What the extraction cannot
 * know (the plant, the ledger the firm uses for freight, the TDS) comes from
 * the instruction, not from here.
 *
 * The set is chosen to exercise each check once:
 *  - Mahindra ×3: interstate (MH → KA, IGST); company deductee, 194C at 2%;
 *    the ₹25,000 one is below the single-bill limit but over the year's.
 *  - Blue Dart: courier, not freight — the freight rule must not apply;
 *    below both TDS limits.
 *  - Om Sai: a GTA bill under reverse charge, and a 194C(6) declaration.
 *  - Vardhman ×2: corrugated boxes (HSN 4819) — goods, not freight.
 *  - HRH-09: the same Mahindra bill again, as a WhatsApp photo.
 *  - VRL and KPR: vendors not in masters.
 *
 * DEV: production has no fixture — the batch is whatever was uploaded, read
 * by the extraction service. Delete with the prototype's sample batch.
 */

const RECEIVED = "2026-10-14T04:10:00.000Z";
const GST_REG = "Karnataka HQ · 29AAWCS8421F1ZR";

type Line = {
  desc: string;
  ledger: string;
  amount: number;
  hsn: string;
  qty?: number;
  unit?: string;
  rate?: number;
};

const bill = (
  id: string,
  file: string,
  vendor: string,
  no: string,
  date: string,
  due: string,
  voucherNo: string,
  items: Line[],
  taxes: { cgst?: number; sgst?: number; igst?: number },
  channel: "email" | "whatsapp" = "email"
): InboxItem => {
  const subTotal = items.reduce((s, l) => s + l.amount, 0);
  const tax = (taxes.cgst || 0) + (taxes.sgst || 0) + (taxes.igst || 0);
  return {
    id,
    file: {
      name: file,
      size: file.endsWith(".jpg") ? "1.8 MB" : "112 KB",
      ext: file.split(".").pop() || "pdf",
    },
    source: {
      channel,
      sender:
        channel === "whatsapp"
          ? "+91 98450 12342 (Priya Raghavan)"
          : "stores.harihar@shakunthalam.co.in",
      subject: "Harihar plant — September bills",
    },
    vendor,
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.94,
      rationale: "Your company is the buyer on this vendor invoice.",
    },
    amount: subTotal + tax,
    receivedAt: RECEIVED,
    status: "needs-review",
    bill: {
      voucherNo,
      supplierInvoiceNo: no,
      billDate: date,
      dueDate: due,
      gstReg: GST_REG,
      costCentre: null,
      flagged: [],
      items,
      taxes,
      subTotal,
      grandTotal: subTotal + tax,
    },
  };
};

const freight = (desc: string, amount: number): Line => ({
  desc,
  ledger: "Transportation",
  amount,
  hsn: "996511",
});

export const MOCK_BATCH_DOCUMENTS: InboxItem[] = [
  bill(
    "HRH-01",
    "MLL-FRT-2610-0412.pdf",
    "Mahindra Logistics Ltd",
    "MLL/FRT/2610/0412",
    "04 Sep 2026",
    "04 Oct 2026",
    "PUR/26-27/0601",
    [
      freight(
        "Freight — crude palm oil, JNPT to Harihar plant, 2 trips",
        35000
      ),
    ],
    { igst: 4200 }
  ),
  bill(
    "HRH-02",
    "MLL-FRT-2610-0418.pdf",
    "Mahindra Logistics Ltd",
    "MLL/FRT/2610/0418",
    "11 Sep 2026",
    "11 Oct 2026",
    "PUR/26-27/0602",
    [
      freight(
        "Freight — crude palm oil, JNPT to Harihar plant, 2 trips",
        35000
      ),
    ],
    { igst: 4200 }
  ),
  bill(
    "HRH-03",
    "MLL-FRT-2610-0431.pdf",
    "Mahindra Logistics Ltd",
    "MLL/FRT/2610/0431",
    "23 Sep 2026",
    "23 Oct 2026",
    "PUR/26-27/0603",
    [freight("Freight — refined oil tins, Harihar plant to Pune depot", 25000)],
    { igst: 3000 }
  ),
  bill(
    "HRH-04",
    "BD-KA-77812.pdf",
    "Blue Dart Express Ltd",
    "KA/77812",
    "09 Sep 2026",
    "24 Sep 2026",
    "PUR/26-27/0604",
    [
      {
        desc: "Courier — documents and oil samples, September (64 AWBs)",
        ledger: "Courier Charges",
        amount: 18500,
        hsn: "996812",
      },
    ],
    { cgst: 1665, sgst: 1665 }
  ),
  bill(
    "HRH-05",
    "OSL-0093.pdf",
    "Om Sai Logistics",
    "OSL/0093",
    "15 Sep 2026",
    "15 Oct 2026",
    "PUR/26-27/0605",
    [
      freight(
        "Lorry freight — crude oil drums, Mangaluru to Harihar plant",
        42000
      ),
    ],
    {}
  ),
  bill(
    "HRH-06",
    "VRL-HBL-55120.pdf",
    "VRL Logistics Ltd",
    "HBL/55120",
    "19 Sep 2026",
    "19 Oct 2026",
    "PUR/26-27/0606",
    [
      freight(
        "Parcel freight — filter press spares, Hubballi to Harihar",
        28600
      ),
    ],
    { cgst: 1716, sgst: 1716 }
  ),
  bill(
    "HRH-07",
    "VPPL-2627-311.pdf",
    "Vardhman Packaging Pvt Ltd",
    "VPPL/26-27/311",
    "12 Sep 2026",
    "12 Oct 2026",
    "PUR/26-27/0607",
    [
      {
        desc: "Corrugated box 5-ply, 600 × 400 × 400 mm",
        ledger: "Packing Materials",
        amount: 46000,
        hsn: "481910",
        qty: 2000,
        unit: "Nos",
        rate: 23,
      },
    ],
    { cgst: 4140, sgst: 4140 }
  ),
  bill(
    "HRH-08",
    "VPPL-2627-318.pdf",
    "Vardhman Packaging Pvt Ltd",
    "VPPL/26-27/318",
    "26 Sep 2026",
    "26 Oct 2026",
    "PUR/26-27/0608",
    [
      {
        desc: "Corrugated box 5-ply, 600 × 400 × 400 mm",
        ledger: "Packing Materials",
        amount: 12500,
        hsn: "481910",
        qty: 500,
        unit: "Nos",
        rate: 25,
      },
    ],
    { cgst: 1125, sgst: 1125 }
  ),
  bill(
    "HRH-09",
    "IMG_20260912_0418.jpg",
    "Mahindra Logistics Ltd",
    "MLL/FRT/2610/0418",
    "11 Sep 2026",
    "11 Oct 2026",
    "PUR/26-27/0609",
    [
      freight(
        "Freight — crude palm oil, JNPT to Harihar plant, 2 trips",
        35000
      ),
    ],
    { igst: 4200 },
    "whatsapp"
  ),
  bill(
    "HRH-10",
    "KPR-114.pdf",
    "KPR Cargo Movers",
    "KPR/114",
    "28 Sep 2026",
    "28 Oct 2026",
    "PUR/26-27/0610",
    [
      freight(
        "Local cartage — Harihar plant to Davanagere depot, 11 trips",
        22000
      ),
    ],
    { cgst: 1320, sgst: 1320 }
  ),
];

/**
 * What the vendor master holds that drives TDS — the deductee type comes
 * from the PAN's fourth letter; declarations and certificates are on file.
 *
 * DEV: GET /api/masters/vendors/:id → tds { section, deducteeType,
 * declaration194C6?, lowerDeductionCert? }.
 */
export const MOCK_VENDOR_TDS: Record<
  string,
  { declaration194C6?: string; priorFyTotal?: number }
> = {
  // Two August bills, approved: ₹21,000 each.
  "Mahindra Logistics Ltd": { priorFyTotal: 42000 },
  "Om Sai Logistics": { declaration194C6: "2026-04-02" },
  "Blue Dart Express Ltd": { priorFyTotal: 31200 },
};

/** The sample batch's instruction, as the accountant typed it. */
export const SAMPLE_BATCH_INSTRUCTION =
  "These are September bills for the Harihar plant. Freight goes to Freight Inward, Harihar cost centre. Deduct TDS on transporters. Date them as on the bill.";
