import type { InboxItem } from "@/types/pages/inbox";
export type AiDocumentSeed = {
  company: string;
  item: InboxItem;
  approved?: boolean;
};
const purchase = (
  id: string,
  vendor: string,
  desc: string,
  ledger: string,
  net: number,
  rate = 18,
  hsn = "998599"
): InboxItem => ({
  id,
  vendor,
  route: "AP",
  voucherType: "Purchase",
  file: { name: `${id}.pdf`, size: "96 KB", ext: "pdf" },
  source: { channel: "email", sender: "accounts@example.test", subject: desc },
  ai: { confidence: 1, rationale: desc },
  amount: net * (1 + rate / 100),
  receivedAt: "2026-10-13T03:30:00Z",
  status: "needs-review",
  bill: {
    voucherNo: `PUR/26-27/${id}`,
    supplierInvoiceNo: id,
    billDate: "20 Sep 2026",
    dueDate: "20 Oct 2026",
    gstReg: "Karnataka HQ",
    costCentre: null,
    flagged: [],
    items: [{ desc, ledger, amount: net, hsn, qty: 1, unit: "Nos", rate: net }],
    taxes: { cgst: (net * rate) / 200, sgst: (net * rate) / 200 },
    subTotal: net,
    grandTotal: net * (1 + rate / 100),
  },
});
export const AI_DOCUMENTS: AiDocumentSeed[] = [
  {
    company: "shakun",
    item: purchase(
      "CHECK-CANCELLED",
      "Sri Balaji Packaging",
      "Packaging materials",
      "Packing Materials",
      100000
    ),
  },
  {
    company: "shakun",
    item: purchase(
      "CHECK-CATERING",
      "Annapurna Caterers",
      "Staff annual-day dinner",
      "Staff Welfare",
      50000
    ),
  },
  {
    company: "shakun",
    item: purchase(
      "CHECK-OIL",
      "Adani Wilmar Ltd",
      "Refined soybean oil — rate requires correction",
      "Purchase - Edible Oil",
      200000,
      18,
      "1507"
    ),
  },
  {
    company: "shakun",
    item: purchase(
      "CHECK-TDS",
      "Harihar Transport Co",
      "Freight service; FY aggregate ₹1,20,000",
      "Freight Inward",
      20000,
      0,
      "996511"
    ),
  },
  {
    company: "shakun",
    item: purchase(
      "POLICY-PUMP",
      "Kirloskar Brothers Ltd",
      "Centrifugal process pump",
      "Plant & Machinery",
      42000,
      18,
      "841370"
    ),
  },
  ...["shakun", "acme"].flatMap((company) =>
    [8, 9].flatMap((month) =>
      Array.from({ length: 10 }, (_, n) => {
        const net = month === 8 ? 21000 : n < 9 ? 35000 : 25000;
        const item = purchase(
          `FREIGHT-${company}-${month}-${n + 1}`,
          n < 9 ? "Mahindra Logistics Ltd" : "Blue Dart Express Ltd",
          month === 9 && n < 9
            ? "Freight for additional plant route"
            : "Regular inward freight",
          month === 9 && n < 3 ? "Transportation" : "Freight Inward",
          net,
          0,
          "996511"
        );
        item.bill!.billDate = `${String(n + 10).padStart(2, "0")} ${month === 8 ? "Aug" : "Sep"} 2026`;
        /*
          One posted bill for each way a cost centre is set: through a class
          at the header, one centre at the header, and line by line. A header
          value covers every line; only with none do the lines carry their own.
        */
        if (month === 8 && n === 0) item.bill!.costCentreClass = "Operations";
        if (month === 8 && n === 1) item.bill!.costCentre = "Operations";
        if (month === 8 && n === 2)
          item.bill!.items[0].costCentre = "Solvent Plant Expansion";
        return { company, item, approved: month === 8 || n >= 3 };
      })
    )
  ),
  ...[
    {
      party: "Bharat Forge Ltd",
      amount: 410000,
      due: "31 Jul 2026",
      no: "091",
    },
    { party: "Tata Motors Ltd", amount: 210000, due: "07 Aug 2026", no: "092" },
    {
      party: "Kirloskar Oil Engines Ltd",
      amount: 120000,
      due: "10 Aug 2026",
      no: "093",
    },
  ].map(({ party, amount, due, no }): AiDocumentSeed => {
    const net = Math.round((amount / 1.18) * 100) / 100,
      tax = Math.round((amount - net) * 100) / 100;
    return {
      company: "acme",
      approved: true,
      item: {
        id: `AR-SPW-${no}`,
        vendor: party,
        route: "AR",
        voucherType: "Sales",
        file: { name: `SPW-26-27-${no}.pdf`, size: "72 KB", ext: "pdf" },
        source: {
          channel: "upload",
          sender: "Priya Raghavan",
          subject: "Engineering components",
        },
        ai: { confidence: 1, rationale: "Sales invoice issued to customer" },
        amount,
        receivedAt: "2026-07-01T04:30:00Z",
        status: "done",
        invoice: {
          voucherNo: `SAL/26-27/${no}`,
          invoiceNo: `SPW/26-27/${no}`,
          invoiceDate: "01 Jul 2026",
          dueDate: due,
          gstReg: "Pune HQ",
          costCentre: null,
          customer: party,
          flagged: [],
          items: [
            {
              desc: "Precision machined components",
              ledger: "Sales Accounts",
              amount: net,
              hsn: "8483",
            },
          ],
          taxes: {
            cgst: Math.round((tax / 2) * 100) / 100,
            sgst: tax - Math.round((tax / 2) * 100) / 100,
          },
          subTotal: net,
          grandTotal: amount,
        },
      },
    };
  }),
];
