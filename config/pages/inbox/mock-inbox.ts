import type { InboxItem } from "@/types/pages/inbox";

/**
 * Unified Inbox — mock data.
 *
 * Ported from the prototype's js/data.js (window.SEED). Shaped exactly as the
 * API is expected to return it, camelCase throughout.
 *
 * DEV: replaced by GET /api/inbox → InboxItem[].
 *      Server-side filtering by status/tab is expected; the prototype filters
 *      client-side because it holds the whole set in memory.
 *
 * Timestamps are fixed ISO strings anchored to 2026-09-10T05:30:00Z rather than
 * `Date.now()` offsets. Module-scope `Date.now()` differs between the server and
 * client render and would produce a hydration mismatch — and an API returns an
 * absolute timestamp anyway.
 *
 * The documents are Shakunthalam Oil & Refineries' — an edible-oil refiner
 * with its plant at Harihar, Davanagere (GSTIN 29, Karnataka) — as they arrive
 * in the first ten days of September 2026, FY 2026-27. Parties, GSTINs and
 * addresses live in mock-parties.ts. Every figure reconciles: lines sum to the
 * sub-total, tax is the slab's exact share of it, and a supplier in Karnataka
 * charges CGST + SGST while one outside it charges IGST.
 */

const GST_REG = "Karnataka HQ · 29AAWCS8421F1ZR";
const BATCH_SENDER = "Sandeep B. · batch upload (10 files)";

export const MOCK_INBOX_ITEMS: InboxItem[] = [
  // 1. Standard AP — high confidence, ready to confirm
  {
    id: "INB-2041",
    file: {
      name: "Dell_Tax_Invoice_DIPL-KA-26-27-18842.pdf",
      size: "412 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "ap.invoices@dell.com",
      subject: "Tax Invoice DIPL/KA/26-27/18842 — Order 4012876631",
    },
    vendor: "Dell India Pvt Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.94,
      rationale:
        "Looks like a vendor invoice — supplier GSTIN + 'Tax Invoice' header detected.",
    },
    amount: 168386.0,
    receivedAt: "2026-09-10T03:30:00.000Z",
    status: "needs-review",
    bill: {
      voucherNo: "PUR/26-27/0312",
      supplierInvoiceNo: "DIPL/KA/26-27/18842",
      billDate: "04 Sep 2026",
      dueDate: "04 Oct 2026",
      gstReg: GST_REG,
      costCentre: "Finance",
      flagged: [],
      items: [
        {
          desc: "Dell OptiPlex 7020 Tower — i7-14700, 16 GB, 512 GB SSD",
          ledger: "Computers & Peripherals",
          amount: 124800,
          hsn: "847150",
          qty: 2,
          unit: "Nos",
          rate: 62400,
        },
        {
          desc: "ProSupport Plus — 3 years onsite, next business day",
          ledger: "Repairs & Maintenance",
          amount: 17900,
          hsn: "998713",
          qty: 2,
          unit: "Nos",
          rate: 8950,
        },
      ],
      taxes: { cgst: 12843, sgst: 12843 },
      subTotal: 142700,
      grandTotal: 168386,
    },
  },

  // 2. AP — low confidence + flagged fields + vendor not in masters
  {
    id: "INB-2042",
    file: {
      name: "APL-INV-2627-01957.pdf",
      size: "1.2 MB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "dispatch@ashapura.com",
      subject: "Invoice & LR copy — Activated bleaching earth, 20 MT",
    },
    vendor: "Ashapura Perfoclay Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.62,
      rationale:
        "Supplier GSTIN starts 24 (Gujarat) and isn't in your vendor masters; the invoice number is partly under a stamp.",
    },
    amount: 599440.0,
    receivedAt: "2026-09-10T00:30:00.000Z",
    status: "needs-review",
    bill: {
      voucherNo: "PUR/26-27/0313",
      supplierInvoiceNo: "APL/INV/2627/01957",
      billDate: "02 Sep 2026",
      dueDate: "02 Oct 2026",
      gstReg: GST_REG,
      costCentre: null,
      vendorMissing: true,
      flagged: ["supplierInvoiceNo", "costCentre", "vendor"],
      items: [
        {
          desc: "Activated bleaching earth — Fulmont Premium, 25 kg HDPE bags",
          ledger: "Purchase - Refining Chemicals",
          amount: 490000,
          hsn: "380290",
          qty: 20,
          unit: "MT",
          rate: 24500,
        },
        {
          desc: "Freight — FOR Harihar (LR 7781204)",
          ledger: "Freight Inward",
          amount: 18000,
          hsn: "380290",
        },
      ],
      taxes: { igst: 91440 },
      subTotal: 508000,
      grandTotal: 599440,
    },
  },

  // 3. Banking — long-running statement, low confidence
  {
    id: "INB-2043",
    file: { name: "HDFC-50100123456-Aug2026.pdf", size: "624 KB", ext: "pdf" },
    source: { channel: "upload", sender: "Sandeep B.", subject: "—" },
    vendor: "—",
    voucherType: "Receipt / Payment",
    route: "Banking",
    ai: {
      confidence: 0.71,
      rationale:
        "PDF matches HDFC statement layout (acct ending 3456). Date range 1 Aug – 31 Aug.",
    },
    amount: 0,
    receivedAt: "2026-09-09T21:30:00.000Z",
    status: "needs-review",
    banking: {
      txnCount: 47,
      dateRange: "01 Aug 2026 – 31 Aug 2026",
      opening: 1842650.4,
      closing: 1563218.4,
      sample: [
        {
          date: "01-Aug-26",
          narration: "NEFT CR-SBIN0040213-SRI LAKSHMI TRADERS-SOR/26-27/0376",
          dr: null,
          cr: 125000.0,
        },
        {
          date: "04-Aug-26",
          narration: "ACH D- ICICI LOMBARD GIC-4001/339127/00/000",
          dr: 18640.0,
          cr: null,
        },
        {
          date: "07-Aug-26",
          narration: "UPI/DR/621903417722/IOCL HARIHAR/Fuel for DG set",
          dr: 4280.0,
          cr: null,
        },
        {
          date: "10-Aug-26",
          narration: "IMPS CR-ANNAPOORNA WHOLESALE-SOR/26-27/0381",
          dr: null,
          cr: 54000.0,
        },
        {
          date: "31-Aug-26",
          narration: "NEFT DR-BULK SALARY AUG-26-38 TXNS",
          dr: 412000.0,
          cr: null,
        },
      ],
    },
  },

  // 4. AR — a sales invoice we issued, vendor field empty because there isn't one
  {
    id: "INB-2044",
    file: {
      name: "HRC-26-27-0118 Hotel Mayura.pdf",
      size: "112 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "sales@shakunthalam.co.in",
      subject: "Invoice HRC/26-27/0118 — Hotel Mayura Group",
    },
    vendor: "—",
    customer: "Hotel Mayura Group",
    voucherType: "Sales",
    route: "AR",
    ai: {
      confidence: 0.94,
      rationale:
        "Shakunthalam is named as the supplier and Hotel Mayura Group as the recipient.",
    },
    amount: 379260.0,
    receivedAt: "2026-09-09T18:30:00.000Z",
    status: "needs-review",
    invoice: {
      voucherNo: "HRC/26-27/0118",
      invoiceNo: "HRC/26-27/0118",
      invoiceDate: "04 Sep 2026",
      dueDate: "19 Sep 2026",
      gstReg: "Karnataka HQ",
      costCentre: null,
      customer: "Hotel Mayura Group",
      flagged: [],
      items: [
        {
          desc: "Refined Sunflower Oil — 15 L Tin",
          ledger: "Sales - Edible Oil 5%",
          amount: 258000.0,
          hsn: "151219",
          qty: 120,
          unit: "Tin",
          rate: 2150,
        },
        {
          desc: "Refined Palmolein — 15 kg Tin",
          ledger: "Sales - Edible Oil 5%",
          amount: 103200.0,
          hsn: "151190",
          qty: 60,
          unit: "Tin",
          rate: 1720,
        },
      ],
      taxes: { cgst: 9030.0, sgst: 9030.0 },
      subTotal: 361200.0,
      grandTotal: 379260.0,
    },
  },

  // 5. AR — customer not yet in masters, so approving proposes creating it
  {
    id: "INB-2045",
    file: {
      name: "HRC-26-27-0119 Vasudev Adigas.pdf",
      size: "96 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "sales@shakunthalam.co.in",
      subject: "Invoice HRC/26-27/0119 — Vasudev Adigas",
    },
    vendor: "—",
    customer: "Vasudev Adigas Fast Food Pvt Ltd",
    voucherType: "Sales",
    route: "AR",
    ai: {
      confidence: 0.88,
      rationale:
        "Shakunthalam is the supplier on this invoice; the recipient is not in your customer masters.",
    },
    amount: 147840.0,
    receivedAt: "2026-09-09T15:30:00.000Z",
    status: "needs-review",
    invoice: {
      voucherNo: "HRC/26-27/0119",
      invoiceNo: "HRC/26-27/0119",
      invoiceDate: "05 Sep 2026",
      dueDate: "20 Sep 2026",
      gstReg: "Karnataka HQ",
      costCentre: null,
      customer: "Vasudev Adigas Fast Food Pvt Ltd",
      flagged: ["customer"],
      items: [
        {
          desc: "Refined Groundnut Oil — 15 L Tin",
          ledger: "Sales - Edible Oil 5%",
          amount: 106000.0,
          hsn: "150890",
          qty: 40,
          unit: "Tin",
          rate: 2650,
        },
        {
          desc: "Rice Bran Oil — 1 L Pouch",
          ledger: "Sales - Edible Oil 5%",
          amount: 34800.0,
          hsn: "151590",
          qty: 240,
          unit: "Pouch",
          rate: 145,
        },
      ],
      taxes: { cgst: 3520.0, sgst: 3520.0 },
      subTotal: 140800.0,
      grandTotal: 147840.0,
      customerMissing: true,
    },
  },

  // 6. JV — internal adjustment
  {
    id: "INB-2046",
    file: {
      name: "Depreciation-H1-FY2026-27.pdf",
      size: "98 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: "Sandeep B.", subject: "—" },
    vendor: "—",
    voucherType: "Journal",
    route: "JV",
    ai: {
      confidence: 0.88,
      rationale: "Internal adjustment note — debit/credit entries, no vendor.",
    },
    amount: 444000.0,
    receivedAt: "2026-09-09T10:30:00.000Z",
    status: "needs-review",
    jv: {
      narration:
        "Provisional depreciation, H1 FY 2026-27 (Apr–Sep 2026) — WDV at Companies Act rates, per fixed asset register",
      lines: [
        { ledger: "Depreciation A/c", dr: 444000, cr: null },
        {
          ledger: "Accumulated Depreciation - Plant & Machinery",
          dr: null,
          cr: 384000,
        },
        {
          ledger: "Accumulated Depreciation - Vehicles",
          dr: null,
          cr: 38400,
        },
        {
          ledger: "Accumulated Depreciation - Computers",
          dr: null,
          cr: 21600,
        },
      ],
    },
  },

  // 7. Ambiguous — no route pre-selected, the disambiguation fork
  {
    id: "INB-2047",
    file: { name: "Petty-cash-Harihar-Aug.pdf", size: "210 KB", ext: "pdf" },
    source: {
      channel: "whatsapp",
      sender: "+91 98450 XXX42 (Priya R.)",
      subject: "—",
    },
    vendor: "Multiple",
    voucherType: "—",
    route: null,
    ai: {
      confidence: 0.41,
      rationale:
        "Mixed document — partly looks like vendor receipts, partly like an internal reconciliation.",
    },
    amount: 18420.0,
    receivedAt: "2026-09-09T06:30:00.000Z",
    status: "needs-review",
    ambiguous: true,
    candidates: [
      {
        route: "AP",
        evidence:
          "Page 1 has 4 small receipts — diesel for the DG set, DTDC courier, stationery, tea and snacks.",
      },
      {
        route: "JV",
        evidence:
          "Page 2 is a typed table topping the Harihar plant's petty-cash float back up to ₹25,000.",
      },
    ],
  },

  // 8. Extracting — in flight
  {
    id: "INB-2048",
    file: {
      name: "BESCOM_HT_Bill_DVGHT-112_Sep2026.pdf",
      size: "388 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "ebill@bescom.co.in",
      subject: "HT bill for RR No. DVGHT-112 — September 2026",
    },
    vendor: "Bangalore Electricity Supply Company Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:28:00.000Z",
    status: "extracting",
    bill: {
      voucherNo: "PUR/26-27/0323",
      supplierInvoiceNo: "HT/DVGHT-112/0926",
      billDate: "01 Sep 2026",
      dueDate: "15 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "Energy charges — 48,620 kWh (HT-2a, Aug 2026)",
          ledger: "Power & Fuel - Refinery",
          amount: 371943,
          hsn: "271600",
          qty: 48620,
          unit: "kWh",
          rate: 7.65,
        },
        {
          desc: "Demand charges — 350 kVA",
          ledger: "Power & Fuel - Refinery",
          amount: 126000,
          qty: 350,
          unit: "kVA",
          rate: 360,
        },
        {
          desc: "Tax on electricity @ 9% of energy charges",
          ledger: "Power & Fuel - Refinery",
          amount: 33474.87,
        },
      ],
      taxes: {},
      subTotal: 531417.87,
      grandTotal: 531417.87,
    },
  },

  // 9. Failed — OCR could not read the scan
  {
    id: "INB-2049",
    file: { name: "IMG-20260909-WA0014.pdf", size: "2.8 MB", ext: "pdf" },
    source: {
      channel: "email",
      sender: "basaveshwaraengg@gmail.com",
      subject: "Quotation for expeller shaft repair — pls process",
    },
    vendor: "Sri Basaveshwara Engineering Works",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T02:30:00.000Z",
    status: "failed",
    failure: {
      type: "scanned-pdf",
      title: "Scanned PDF — text not extractable",
      body: "This appears to be a phone-camera scan. Our OCR could read partial text but couldn't reliably identify line items, GST or amount.",
    },
  },

  // 10. Failed — password protected
  {
    id: "INB-2050",
    file: {
      name: "Airtel_Bill_1-2B4XK9Q_Aug2026.pdf",
      size: "94 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "ebill@airtel.com",
      subject: "Your Airtel Business bill for August 2026",
    },
    vendor: "Bharti Airtel Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-09T23:30:00.000Z",
    status: "failed",
    failure: {
      type: "password-protected",
      title: "Password-protected PDF",
      body: "We couldn't open this file. Ask the vendor to share an unlocked copy, or paste the password and we'll retry.",
    },
  },

  // 11. Duplicate hard-block — same vendor + invoice no already exists
  {
    id: "INB-2051",
    file: {
      name: "Dell_Tax_Invoice_DIPL-KA-26-27-18842 (1).pdf",
      size: "412 KB",
      ext: "pdf",
    },
    source: {
      channel: "drive",
      sender: "Shared drive · auto-import",
      subject: "—",
    },
    vendor: "Dell India Pvt Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.94,
      rationale:
        "Same as INB-2041 — vendor + invoice no match an existing bill.",
    },
    amount: 168386.0,
    receivedAt: "2026-09-10T04:30:00.000Z",
    status: "duplicate-hard",
    duplicateOf: "INB-2041",
    bill: {
      voucherNo: "PUR/26-27/0312",
      supplierInvoiceNo: "DIPL/KA/26-27/18842",
      billDate: "04 Sep 2026",
      dueDate: "04 Oct 2026",
      gstReg: GST_REG,
      costCentre: "Finance",
      flagged: [],
      items: [
        {
          desc: "Dell OptiPlex 7020 Tower — i7-14700, 16 GB, 512 GB SSD",
          ledger: "Computers & Peripherals",
          amount: 124800,
          hsn: "847150",
          qty: 2,
          unit: "Nos",
          rate: 62400,
        },
        {
          desc: "ProSupport Plus — 3 years onsite, next business day",
          ledger: "Repairs & Maintenance",
          amount: 17900,
          hsn: "998713",
          qty: 2,
          unit: "Nos",
          rate: 8950,
        },
      ],
      taxes: { cgst: 12843, sgst: 12843 },
      subTotal: 142700,
      grandTotal: 168386,
    },
  },

  // 12. Aged + soft duplicate warning
  {
    id: "INB-2052",
    file: { name: "VPPL-INV-2627-0688.pdf", size: "320 KB", ext: "pdf" },
    source: {
      channel: "email",
      sender: "accounts@vardhmanpackaging.in",
      subject: "Invoice VPPL/26-27/0688 — pouch laminate & tape",
    },
    vendor: "Vardhman Packaging Pvt Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.84,
      rationale:
        "Vendor bill, identical amount as another bill 6 weeks ago — possible duplicate, soft warning.",
    },
    amount: 40922.4,
    receivedAt: "2026-09-01T05:30:00.000Z",
    status: "duplicate-soft",
    aged: true,
    bill: {
      voucherNo: "PUR/26-27/0287",
      supplierInvoiceNo: "VPPL/26-27/0688",
      billDate: "18 Aug 2026",
      dueDate: "17 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: ["dueDate"],
      items: [
        {
          desc: "Printed pouch laminate — 1 L Sunflower, 12 µ PET / 75 µ PE",
          ledger: "Packing Material",
          amount: 28200,
          hsn: "392020",
          qty: 120,
          unit: "Kg",
          rate: 235,
        },
        {
          desc: "BOPP tape 72 mm × 65 m — brown",
          ledger: "Packing Material",
          amount: 6480,
          hsn: "391910",
          qty: 120,
          unit: "Roll",
          rate: 54,
        },
      ],
      taxes: { cgst: 3121.2, sgst: 3121.2 },
      subTotal: 34680,
      grandTotal: 40922.4,
    },
  },

  // 13. Retrying
  {
    id: "INB-2053",
    file: {
      name: "Zoho_Invoice_INV-2627-4471903.pdf",
      size: "228 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "billing@zohocorp.com",
      subject: "Zoho Books — invoice for September 2026",
    },
    vendor: "Zoho Corporation Pvt Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:22:00.000Z",
    status: "retrying",
    retryAttempt: 2,
    retryMax: 3,
    bill: {
      voucherNo: "PUR/26-27/0324",
      supplierInvoiceNo: "INV-2627-4471903",
      billDate: "01 Sep 2026",
      dueDate: "01 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Finance",
      flagged: [],
      items: [
        {
          desc: "Zoho One — all-employee plan, 12 users, Sep 2026",
          ledger: "Software Subscriptions",
          amount: 15120,
          hsn: "997331",
          qty: 12,
          unit: "User",
          rate: 1260,
        },
      ],
      taxes: { igst: 2721.6 },
      subTotal: 15120,
      grandTotal: 17841.6,
    },
  },

  /* ---------------- Bulk batch — 10 files uploaded together ---------------- */

  {
    id: "BULK-001",
    file: {
      name: "Tally_TSS_Renewal_TSPL-2627-88104.pdf",
      size: "388 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Tally Solutions Pvt Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: 0.91, rationale: "—" },
    amount: 14337.0,
    receivedAt: "2026-09-10T05:26:00.000Z",
    status: "needs-review",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0314",
      supplierInvoiceNo: "TSPL/2627/88104",
      billDate: "01 Sep 2026",
      dueDate: "01 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Finance",
      flagged: [],
      items: [
        {
          desc: "TallyPrime Gold — TSS renewal, 12 months (serial 7342 1180)",
          ledger: "Software Subscriptions",
          amount: 12150,
          hsn: "997331",
          qty: 1,
          unit: "Nos",
          rate: 12150,
        },
      ],
      taxes: { cgst: 1093.5, sgst: 1093.5 },
      subTotal: 12150,
      grandTotal: 14337,
    },
  },
  {
    id: "BULK-002",
    file: {
      name: "BlueDart_Bill_BLR-2627-0091187.pdf",
      size: "412 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Blue Dart Express Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.74,
      rationale: "Courier bill — vendor matched in masters.",
    },
    amount: 54870.0,
    receivedAt: "2026-09-10T05:26:00.000Z",
    status: "needs-review",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0315",
      supplierInvoiceNo: "BLR/2627/0091187",
      billDate: "31 Aug 2026",
      dueDate: "15 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Sales",
      flagged: ["dueDate"],
      items: [
        {
          desc: "Dart Surfaceline — Harihar → Bengaluru, 186 shipments",
          ledger: "Freight Outward",
          amount: 31000,
          hsn: "996812",
        },
        {
          desc: "Dart Surfaceline — Harihar → Chennai, 112 shipments",
          ledger: "Freight Outward",
          amount: 15500,
          hsn: "996812",
        },
      ],
      taxes: { cgst: 4185, sgst: 4185 },
      subTotal: 46500,
      grandTotal: 54870,
    },
  },
  {
    id: "BULK-003",
    file: {
      name: "ENIL_RO-BLR-26-0918_Mirchi.pdf",
      size: "276 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Entertainment Network (India) Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: 0.86, rationale: "—" },
    amount: 127440.0,
    receivedAt: "2026-09-10T05:26:00.000Z",
    status: "needs-review",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0316",
      supplierInvoiceNo: "ENIL/KA/2627/03318",
      billDate: "31 Aug 2026",
      dueDate: "30 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Sales",
      flagged: [],
      items: [
        {
          desc: "Radio Mirchi 98.3 Bengaluru — 30-sec spots, Aug 2026 (RO BLR/26/0918)",
          ledger: "Advertisement & Publicity",
          amount: 108000,
          hsn: "998366",
          qty: 120,
          unit: "Spot",
          rate: 900,
        },
      ],
      taxes: { cgst: 9720, sgst: 9720 },
      subTotal: 108000,
      grandTotal: 127440,
    },
  },
  {
    id: "BULK-004",
    file: { name: "HHT-INV-2627-0631.pdf", size: "344 KB", ext: "pdf" },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Hyderabad Hexane Traders",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "extracting",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0325",
      supplierInvoiceNo: "HHT/2627/0631",
      billDate: "29 Aug 2026",
      dueDate: "28 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "Food-grade n-hexane — tanker, 8 KL",
          ledger: "Purchase - Refining Chemicals",
          amount: 752000,
          hsn: "290110",
          qty: 8000,
          unit: "L",
          rate: 94,
        },
      ],
      taxes: { igst: 135360 },
      subTotal: 752000,
      grandTotal: 887360,
    },
  },
  {
    id: "BULK-005",
    file: {
      name: "Sri_Manjunatha_Hardware_INV-2284.pdf",
      size: "510 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Sri Manjunatha Hardware & Tools",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "extracting",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0326",
      supplierInvoiceNo: "SMH/2284",
      billDate: "30 Aug 2026",
      dueDate: "29 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "SS 304 ball valve 25 mm — screwed end",
          ledger: "Stores & Spares",
          amount: 22200,
          hsn: "848180",
          qty: 12,
          unit: "Nos",
          rate: 1850,
        },
        {
          desc: "Spiral-wound gasket 50 mm — SS 316 / graphite",
          ledger: "Stores & Spares",
          amount: 8700,
          hsn: "848410",
          qty: 6,
          unit: "Nos",
          rate: 1450,
        },
      ],
      taxes: { cgst: 2781, sgst: 2781 },
      subTotal: 30900,
      grandTotal: 36462,
    },
  },
  {
    id: "BULK-006",
    file: {
      name: "Krishna_Computers_INV-0918.pdf",
      size: "180 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Krishna Computers & Peripherals",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "extracting",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0327",
      supplierInvoiceNo: "KCP/26-27/0918",
      billDate: "28 Aug 2026",
      dueDate: "27 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Finance",
      flagged: [],
      items: [
        {
          desc: "HP 88A toner cartridge — original",
          ledger: "Printing & Stationery",
          amount: 17700,
          hsn: "844399",
          qty: 6,
          unit: "Nos",
          rate: 2950,
        },
      ],
      taxes: { cgst: 1593, sgst: 1593 },
      subTotal: 17700,
      grandTotal: 20886,
    },
  },
  {
    id: "BULK-007",
    file: {
      name: "Annapurna_Caterers_Canteen_Aug.pdf",
      size: "92 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Annapurna Caterers",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "extracting",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0328",
      supplierInvoiceNo: "AC/26-27/041",
      billDate: "31 Aug 2026",
      dueDate: "10 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "Factory canteen — Aug 2026, 2,480 meals",
          ledger: "Staff Welfare",
          amount: 161200,
          hsn: "996337",
          qty: 2480,
          unit: "Meal",
          rate: 65,
        },
      ],
      taxes: { cgst: 4030, sgst: 4030 },
      subTotal: 161200,
      grandTotal: 169260,
    },
  },
  {
    id: "BULK-008",
    file: {
      name: "BlueStar_AMC_Quote_ColdRoom_scan.pdf",
      size: "3.2 MB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Blue Star Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: null, rationale: null },
    amount: null,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "failed",
    batchTag: "BATCH-Sep26",
    failure: {
      type: "scanned-pdf",
      title: "Scanned PDF — text not extractable",
      body: "Phone-camera scan — couldn't reliably read line items or totals.",
    },
  },
  {
    id: "BULK-009",
    file: {
      name: "BVG_India_INV-KA-2627-11420.pdf",
      size: "118 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "BVG India Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: 0.92, rationale: "—" },
    amount: 54752.0,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "needs-review",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0317",
      supplierInvoiceNo: "BVG/KA/2627/11420",
      billDate: "01 Sep 2026",
      dueDate: "01 Oct 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "Housekeeping — Harihar plant & office, Aug 2026 (8 staff)",
          ledger: "Housekeeping Charges",
          amount: 46400,
          hsn: "998533",
        },
      ],
      taxes: { cgst: 4176, sgst: 4176 },
      subTotal: 46400,
      grandTotal: 54752,
    },
  },
  {
    id: "BULK-010",
    file: {
      name: "Sri_Durga_Filling_Stn_Aug-HSD.pdf",
      size: "224 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: BATCH_SENDER, subject: "—" },
    vendor: "Sri Durga Filling Station",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.77,
      rationale:
        "Fuel bill — diesel is outside GST, so no tax lines are expected.",
    },
    amount: 73078.4,
    receivedAt: "2026-09-10T05:27:00.000Z",
    status: "needs-review",
    batchTag: "BATCH-Sep26",
    bill: {
      voucherNo: "PUR/26-27/0318",
      supplierInvoiceNo: "SDFS/0826/0412",
      billDate: "31 Aug 2026",
      dueDate: "15 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "High-speed diesel — tanker & DG set, Aug 2026 (credit a/c 118)",
          ledger: "Vehicle Running Expenses",
          amount: 73078.4,
          hsn: "271019",
          qty: 820,
          unit: "L",
          rate: 89.12,
        },
      ],
      taxes: {},
      subTotal: 73078.4,
      grandTotal: 73078.4,
    },
  },

  /* --------------------------------- Done --------------------------------- */

  {
    id: "INB-2030",
    file: { name: "BIG-INV-2627-0733.pdf", size: "172 KB", ext: "pdf" },
    source: {
      channel: "email",
      sender: "billing@bengalurugases.in",
      subject: "—",
    },
    vendor: "Bengaluru Industrial Gases",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: 0.91, rationale: "—" },
    amount: 12744.0,
    receivedAt: "2026-09-08T05:30:00.000Z",
    status: "done",
    doneBy: "Sandeep Balaji",
    doneAt: "2026-09-08T05:30:00.000Z",
    destination: "PUR/26-27/0298",
  },
  {
    id: "INB-2031",
    file: {
      name: "MT-26-27-0061 Reliance Retail.pdf",
      size: "108 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "sales@shakunthalam.co.in",
      subject: "—",
    },
    vendor: "—",
    customer: "Reliance Retail Ltd",
    voucherType: "Sales",
    route: "AR",
    ai: { confidence: 0.96, rationale: "—" },
    amount: 330750.0,
    receivedAt: "2026-09-06T05:30:00.000Z",
    status: "done",
    doneBy: "Sandeep Balaji",
    doneAt: "2026-09-06T05:30:00.000Z",
    destination: "MT/26-27/0061",
    invoice: {
      voucherNo: "MT/26-27/0061",
      invoiceNo: "MT/26-27/0061",
      invoiceDate: "27 August 2026",
      dueDate: "26 September 2026",
      gstReg: "Karnataka HQ",
      costCentre: null,
      customer: "Reliance Retail Ltd",
      flagged: [],
      items: [
        {
          desc: "Refined Sunflower Oil — 15 L Tin (PO 4100388127)",
          ledger: "Sales - Edible Oil 5%",
          amount: 315000.0,
          hsn: "151219",
          qty: 150,
          unit: "Tin",
          rate: 2100,
        },
      ],
      taxes: { igst: 15750.0 },
      subTotal: 315000.0,
      grandTotal: 330750.0,
    },
  },

  /* ------------------------------- Deleted -------------------------------- */

  {
    id: "INB-2020",
    file: { name: "DC-VPPL-2627-0412.pdf", size: "44 KB", ext: "pdf" },
    source: {
      channel: "email",
      sender: "dispatch@vardhmanpackaging.in",
      subject: "Re: PO/26-27/0118 — delivery challan",
    },
    vendor: "—",
    voucherType: "—",
    route: "AP",
    ai: {
      confidence: 0.22,
      rationale: "Couldn't classify — looks like a delivery note, not a bill.",
    },
    amount: null,
    receivedAt: "2026-09-07T05:30:00.000Z",
    status: "deleted",
    deletedBy: "Sandeep Balaji",
    deletedAt: "2026-09-07T05:30:00.000Z",
  },

  /* ------------------------- Conversion-system seeds ----------------------- */

  // CONV-001 — Bill ready for Bill→Invoice; vendor is not in the Customer master
  {
    id: "CONV-001",
    file: {
      name: "OSL-WH-2627-0219.pdf",
      size: "320 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "accounts@omsailogistics.in",
      subject: "Warehousing invoice — Transport Nagar godown, August",
    },
    vendor: "Om Sai Logistics",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: 0.92, rationale: "Vendor invoice." },
    amount: 88500.0,
    receivedAt: "2026-09-10T02:30:00.000Z",
    status: "needs-review",
    bill: {
      voucherNo: "PUR/26-27/0319",
      supplierInvoiceNo: "OSL/WH/2627/0219",
      billDate: "31 Aug 2026",
      dueDate: "30 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "Warehousing & handling — Transport Nagar godown, 410 pallet-weeks, Aug 2026",
          ledger: "Warehousing Charges",
          amount: 75000,
          hsn: "996729",
        },
      ],
      taxes: { cgst: 6750, sgst: 6750 },
      subTotal: 75000,
      grandTotal: 88500,
    },
    convertHint: "bill-to-invoice",
  },

  // CONV-002 — JV whose narration names a candidate party, ready for JV→Invoice
  {
    id: "CONV-002",
    file: {
      name: "Rebill-Peenya-godown-rent-Aug.pdf",
      size: "164 KB",
      ext: "pdf",
    },
    source: { channel: "upload", sender: "Sandeep B.", subject: "—" },
    vendor: "—",
    voucherType: "Journal",
    route: "JV",
    ai: { confidence: 0.95, rationale: "Internal adjustment note." },
    amount: 42000.0,
    receivedAt: "2026-09-09T23:30:00.000Z",
    status: "needs-review",
    jv: {
      narration:
        "Re-bill: Peenya godown rent (bay 3) for Aug 2026 paid on behalf of Annapoorna Wholesale — should be raised as a sales invoice on Annapoorna.",
      lines: [
        { ledger: "Annapoorna Wholesale (Receivable)", dr: 42000, cr: null },
        { ledger: "Godown Rent — Pass-through", dr: null, cr: 42000 },
      ],
    },
    convertHint: "jv-to-invoice",
  },

  // CONV-003 — content hash matches a posted JV, not a bill
  {
    id: "CONV-003",
    file: {
      name: "Annapoorna-rent-debit-note-Aug.pdf",
      size: "188 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "accounts@annapoornawholesale.in",
      subject: "—",
    },
    vendor: "Internal — Adjustment",
    voucherType: "Purchase",
    route: "AP",
    ai: {
      confidence: 0.84,
      rationale: "Looks like a bill but content hashes match a posted JV.",
    },
    amount: 42000.0,
    receivedAt: "2026-09-10T01:30:00.000Z",
    status: "duplicate-cross-type",
    crossDupOf: {
      id: "JV/26-27/0074",
      type: "Journal Voucher",
      postedBy: "Sandeep B.",
      postedOn: "02 Sep 2026",
      amount: 42000,
    },
  },

  // CONV-004 — AR re-upload of an invoice already posted, so it lands as a
  // hard-block duplicate: same customer, same invoice number as INB-2031.
  {
    id: "CONV-004",
    file: {
      name: "MT-26-27-0061 Reliance Retail (re-send).pdf",
      size: "108 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "sales@shakunthalam.co.in",
      subject: "Invoice MT/26-27/0061 — please re-process",
    },
    vendor: "—",
    customer: "Reliance Retail Ltd",
    voucherType: "Sales",
    route: "AR",
    ai: {
      confidence: 0.97,
      rationale: "Shakunthalam is the supplier; recipient is Reliance Retail.",
    },
    amount: 330750.0,
    receivedAt: "2026-09-10T03:30:00.000Z",
    status: "needs-review",
    isReupload: true,
    invoice: {
      voucherNo: "MT/26-27/0061",
      invoiceNo: "MT/26-27/0061",
      invoiceDate: "27 August 2026",
      dueDate: "26 September 2026",
      gstReg: "Karnataka HQ",
      costCentre: null,
      customer: "Reliance Retail Ltd",
      flagged: [],
      items: [
        {
          desc: "Refined Sunflower Oil — 15 L Tin (PO 4100388127)",
          ledger: "Sales - Edible Oil 5%",
          amount: 315000.0,
          hsn: "151219",
          qty: 150,
          unit: "Tin",
          rate: 2100,
        },
      ],
      taxes: { igst: 15750.0 },
      subTotal: 315000.0,
      grandTotal: 330750.0,
    },
  },

  // CONV-005 — multi-user edit conflict demo
  {
    id: "CONV-005",
    file: {
      name: "Metro_Tax_Invoice_29-118-0904417.pdf",
      size: "224 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "einvoice@metro.co.in",
      subject: "—",
    },
    vendor: "Metro Cash & Carry India Pvt Ltd",
    voucherType: "Purchase",
    route: "AP",
    ai: { confidence: 0.89, rationale: "—" },
    amount: 33394.0,
    receivedAt: "2026-09-10T04:30:00.000Z",
    status: "needs-review",
    conflictSim: true,
    bill: {
      voucherNo: "PUR/26-27/0320",
      supplierInvoiceNo: "29/118/0904417",
      billDate: "06 Sep 2026",
      dueDate: "06 Sep 2026",
      gstReg: GST_REG,
      costCentre: "Operations",
      flagged: [],
      items: [
        {
          desc: "Pantry & housekeeping consumables — as per annexure (41 lines)",
          ledger: "Staff Welfare",
          amount: 28300,
        },
      ],
      taxes: { cgst: 2547, sgst: 2547 },
      subTotal: 28300,
      grandTotal: 33394,
    },
  },

  // DONE-001 — already converted Bill→JV, drives the reversal/lineage view
  {
    id: "DONE-001",
    file: {
      name: "AWL-CN-2627-00914.pdf",
      size: "142 KB",
      ext: "pdf",
    },
    source: {
      channel: "email",
      sender: "creditnotes@adaniwilmar.in",
      subject: "Credit note — rate difference, crude sunflower oil",
    },
    vendor: "Adani Wilmar Ltd",
    voucherType: "Purchase",
    route: "JV",
    ai: { confidence: 0.91, rationale: "—" },
    amount: 18900.0,
    receivedAt: "2026-09-09T05:30:00.000Z",
    status: "done",
    doneBy: "Sandeep Balaji",
    doneAt: "2026-09-09T05:30:00.000Z",
    lineage: {
      sourceType: "Bill",
      sourceId: "PUR/26-27/0247",
      sourcePostedOn: "21 Aug 2026",
      convertedTo: {
        type: "Journal Voucher",
        id: "JV/26-27/0088",
        postedOn: "21 Aug 2026",
        actor: "Sandeep B.",
      },
    },
  },
];

/**
 * Sahyadri Precision Works' first document — a Chakan machine shop buying
 * round bars from a Maharashtra supplier, so CGST + SGST. The store files it
 * under the second company; it is not part of Shakunthalam's queue.
 */
export const SAHYADRI_FIRST_BILL: InboxItem = {
  id: "ACME-1001",
  file: { name: "TSL-MH-2627-6488.pdf", size: "286 KB", ext: "pdf" },
  source: {
    channel: "email",
    sender: "einvoice.pune@tatasteel.com",
    subject: "Tax Invoice TSL/MH/26-27/6488 — EN8 round bars",
  },
  vendor: "Tata Steel Ltd",
  voucherType: "Purchase",
  route: "AP",
  ai: {
    confidence: 0.93,
    rationale:
      "Looks like a vendor invoice — supplier GSTIN + 'Tax Invoice' header detected.",
  },
  amount: 484980,
  receivedAt: "2026-09-10T03:10:00.000Z",
  status: "needs-review",
  bill: {
    voucherNo: "PUR/26-27/0141",
    supplierInvoiceNo: "TSL/MH/26-27/6488",
    billDate: "03 Sep 2026",
    dueDate: "03 Oct 2026",
    gstReg: "Pune HQ · 27AABFS5582A1ZC",
    costCentre: null,
    flagged: [],
    items: [
      {
        desc: "EN8 round bar, 40 mm dia — hot rolled",
        ledger: "Purchase - Raw Material",
        amount: 411000,
        hsn: "721420",
        qty: 6,
        unit: "MT",
        rate: 68500,
      },
    ],
    taxes: { cgst: 36990, sgst: 36990 },
    subTotal: 411000,
    grandTotal: 484980,
  },
};
