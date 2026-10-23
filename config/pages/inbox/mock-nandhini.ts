import type { InboxItem } from "@/types/pages/inbox";

/** Fictional restaurant demo records. No live invoices or connections. */
export const NANDHINI_PURCHASES = [
  {
    vendor: "Hopcoms (creditor)",
    description: "Fresh vegetables — JP Nagar kitchen",
    ledger: "Purchase – Ingredients",
    net: 18400,
    rate: 0,
  },
  {
    vendor: "Akshayakalpa Dairy (creditor)",
    description: "Milk and curd — weekly kitchen supply",
    ledger: "Purchase – Ingredients",
    net: 12600,
    rate: 0,
  },
  {
    vendor: "Nandhini Foods LLP (creditor)",
    description: "Rice, pulses and spice mixes",
    ledger: "Purchase – Ingredients",
    net: 42600,
    rate: 5,
  },
  {
    vendor: "Bharat Gas Commercial",
    description: "Commercial LPG cylinder refill",
    ledger: "Gas & Fuel",
    net: 16000,
    rate: 18,
  },
  {
    vendor: "BESCOM",
    description: "September electricity — JP Nagar",
    ledger: "Electricity",
    net: 28450,
    rate: 0,
  },
  {
    vendor: "EcoPack Bengaluru",
    description: "Takeaway containers and paper bags",
    ledger: "Packing Materials",
    net: 8400,
    rate: 18,
  },
  {
    vendor: "KitchenCare Services",
    description: "Exhaust hood and refrigerator servicing",
    ledger: "Repairs & Maintenance",
    net: 6500,
    rate: 18,
  },
  {
    vendor: "Bharti Airtel Ltd",
    description: "Outlet broadband — Koramangala",
    ledger: "Internet Charges",
    net: 2000,
    rate: 18,
  },
] as const;

const base = (id: string, description: string, n: number): InboxItem => ({
  id,
  file: { name: `${id}.pdf`, size: "96 KB", ext: "pdf" },
  source: {
    channel: n % 2 ? "email" : "whatsapp",
    sender:
      n % 2
        ? "accounts@nandhini.example.test"
        : "+91 98450 XXX42 (Outlet manager)",
    subject: description,
  },
  voucherType: "Purchase",
  route: "AP",
  ai: { confidence: 0.98, rationale: description },
  amount: 0,
  receivedAt: `2026-10-21T06:${String(30 + n).padStart(2, "0")}:00Z`,
  status: "needs-review",
});

export const NANDHINI_DOCUMENTS: { item: InboxItem; approved: boolean }[] = [
  ...NANDHINI_PURCHASES.map((p, n) => {
    const id = `ND-PUR-${101 + n}`;
    const total = Math.round(p.net * (1 + p.rate / 100) * 100) / 100;
    return {
      approved: n >= 4,
      item: {
        ...base(id, p.description, n),
        vendor: p.vendor,
        amount: total,
        bill: {
          voucherNo: `ND/PUR/26-27/${101 + n}`,
          supplierInvoiceNo: id,
          billDate: "18 Oct 2026",
          dueDate: "02 Nov 2026",
          gstReg: "JP Nagar",
          costCentre: n % 2 ? "Koramangala" : "JP Nagar",
          flagged: [],
          items: [{ desc: p.description, ledger: p.ledger, amount: p.net }],
          taxes: { cgst: (p.net * p.rate) / 200, sgst: (p.net * p.rate) / 200 },
          subTotal: p.net,
          grandTotal: total,
        },
      },
    };
  }),
  ...[
    "Walk-in Customers",
    "Orion Tech Park",
    "Zomato Receivable",
    "Swiggy Receivable",
    "Ownly Receivable",
    "Bengaluru Events Co",
  ].map((customer, n) => {
    const id = `ND-SAL-${201 + n}`;
    const net = [48500, 32000, 24600, 18700, 9600, 45000][n];
    const desc =
      n === 1 || n === 5
        ? "Corporate lunch order"
        : "Restaurant meals — daily sales";
    return {
      approved: n % 2 === 0,
      item: {
        ...base(id, desc, n),
        route: "AR" as const,
        voucherType: "Sales",
        customer,
        amount: net * 1.05,
        invoice: {
          voucherNo: `ND/SAL/26-27/${201 + n}`,
          invoiceNo: id,
          invoiceDate: "20 Oct 2026",
          dueDate: "04 Nov 2026",
          gstReg: "JP Nagar",
          costCentre: n % 2 ? "Koramangala" : "JP Nagar",
          customer,
          flagged: [],
          items: [
            { desc, ledger: "Restaurant Sales", amount: net, hsn: "996331" },
          ],
          taxes: { cgst: net * 0.025, sgst: net * 0.025 },
          subTotal: net,
          grandTotal: net * 1.05,
        },
      },
    };
  }),
  ...[
    {
      description: "October kitchen payroll accrual",
      debit: "Salaries",
      credit: "Salaries Payable",
      amount: 185000,
    },
    {
      description: "October outlet rent accrual",
      debit: "Rent",
      credit: "Rent Payable",
      amount: 95000,
    },
    {
      description: "Kitchen equipment depreciation",
      debit: "Depreciation",
      credit: "Accumulated Depreciation",
      amount: 12500,
    },
    {
      description: "Zomato settlement commission",
      debit: "Zomato Commission",
      credit: "Zomato Receivable",
      amount: 4200,
    },
  ].map((j, n) => ({
    approved: n >= 2,
    item: {
      ...base(`ND-JV-${301 + n}`, j.description, n),
      vendor: j.credit,
      route: "JV" as const,
      voucherType: "Journal",
      amount: j.amount,
      jv: {
        narration: j.description,
        lines: [
          { ledger: j.debit, dr: j.amount, cr: 0 },
          { ledger: j.credit, dr: 0, cr: j.amount },
        ],
      },
    },
  })),
];
