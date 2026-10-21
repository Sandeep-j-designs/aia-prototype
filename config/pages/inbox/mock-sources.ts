import type {
  SourceCandidate,
  SourceProvider,
} from "@/types/pages/inbox/sources";

export const SOURCE_PROVIDERS: SourceProvider[] = [
  "Gmail",
  "Google Drive",
  "WhatsApp Business",
];
export const MOCK_SOURCE_CONTACT = "transport-supplier@example.test";
export const mockClearerSourceCopy = (
  candidate: SourceCandidate
): SourceCandidate => {
  const next = structuredClone(candidate);
  next.problem = undefined;
  next.hash += "-clearer-copy";
  next.document.amount = 24000;
  next.document.bill!.items[0].amount = 24000;
  next.document.bill!.items[0].rate = 24000;
  next.document.bill!.subTotal = 24000;
  next.document.bill!.grandTotal = 24000;
  next.document.bill!.flagged = [];
  next.location += " · clearer replacement received (simulated)";
  return next;
};
export const SOURCE_SCOPES: Record<SourceProvider, string[]> = {
  Forwarding: ["Everything forwarded from accounts@"],
  Gmail: ["AIA/Bills", "Accounts / Invoices", "Accounts / Freight"],
  "Google Drive": ["AI Accountant / Bills", "Finance / September invoices"],
  "WhatsApp Business": ["Vendors in your masters and staff"],
};

/**
 * Each company's forwarding address: works the minute setup starts, with no
 * mailbox permission. DEV: issued by POST /api/collection/forwarding-address.
 */
export const forwardingAddress = (slug: string) =>
  `${slug}@bills.aiaccountant.in`;

/** The code Gmail mails to a new forwarding address, caught for the user. */
export const MOCK_FORWARDING_CODE = "418 207";

/** The filter Neo suggests for a Gmail label, from vendors in the masters. */
export const MOCK_GMAIL_FILTER =
  "has:attachment from:(mahindralogistics.example OR bluedart.example OR harihartransport.example)";

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
/** "2026-09-25" → "25 Sep 2026", the way the seed's bills print dates. */
const printed = (iso: string) =>
  `${iso.slice(8)} ${MONTHS.at(Number(iso.slice(5, 7)) - 1)} ${iso.slice(0, 4)}`;

type Make = {
  problem?: SourceCandidate["problem"];
  received?: string;
  sender: string;
  known?: boolean;
  kind?: SourceCandidate["kind"];
};

export const mockSourceCandidates = (company: string): SourceCandidate[] => {
  const make = (
    key: string,
    provider: SourceProvider,
    vendor: string,
    net: number,
    {
      problem,
      received = "2026-09-25",
      sender,
      known = true,
      kind = "bill",
    }: Make
  ): SourceCandidate => ({
    key: `${provider}-${key}`,
    hash: `demo-content-${company}-${key}`,
    provider,
    location:
      provider === "Forwarding"
        ? `Forwarded mail · ${vendor} · ${key}.pdf`
        : provider === "Gmail"
          ? `AIA/Bills · ${vendor} · attachment ${key}.pdf`
          : provider === "Google Drive"
            ? `AI Accountant / Bills / ${key}.pdf`
            : `WhatsApp · ${sender} · ${key}.pdf`,
    received,
    problem,
    sender,
    knownSender: known,
    kind,
    document: {
      id: `COLLECT-${company}-${key}`,
      vendor,
      route: "AP",
      voucherType: "Purchase",
      file: { name: `${key}.pdf`, size: "96 KB", ext: "pdf" },
      source: {
        channel:
          provider === "Google Drive"
            ? "drive"
            : provider === "WhatsApp Business"
              ? "whatsapp"
              : "email",
        sender: `${vendor} (demo)`,
        subject: "September supplier invoice",
      },
      ai: {
        confidence: 1,
        rationale:
          "Supplier invoice in the delegated collection scope; prepare only, never approve.",
      },
      amount: net,
      receivedAt: `${received}T09:00:00Z`,
      status: "needs-review",
      bill: {
        voucherNo: `PUR/COLLECT/${key}`,
        supplierInvoiceNo: problem === "missing-reference" ? "" : key,
        billDate: printed(received),
        dueDate: "2026-10-25",
        gstReg: company === "shakun" ? "Karnataka HQ" : "Pune HQ",
        costCentre: null,
        flagged: problem
          ? [
              problem === "unreadable"
                ? "Source attachment cannot be read"
                : "Supplier invoice number is missing",
            ]
          : [],
        items: [
          {
            desc: "Inward freight — September",
            ledger: "Freight Inward",
            amount: net,
            hsn: "996511",
            qty: 1,
            unit: "Nos",
            rate: net,
          },
        ],
        taxes: {},
        subTotal: net,
        grandTotal: net,
      },
    },
  });
  const staff = `stores@${company}.example`;
  // The same bill reaching two channels shares its content hash, so the
  // second copy is linked, never drafted again.
  const bills = (provider: SourceProvider) => [
    make("ML-0925", provider, "Mahindra Logistics Ltd", 35000, {
      sender: "billing@mahindralogistics.example",
    }),
    make("BD-0926", provider, "Blue Dart Express Ltd", 12500, {
      sender: "invoices@bluedart.example",
      received: "2026-09-26",
    }),
    make("HT-0927", provider, "Harihar Transport Co", 18000, {
      problem: "missing-reference",
      sender: "accounts@harihartransport.example",
      received: "2026-09-10",
    }),
    make("SCAN-0928", provider, "Local transport supplier", 0, {
      problem: "unreadable",
      sender: staff,
      received: "2026-09-08",
    }),
  ];
  return [
    // Forwarding carries the whole accounts@ inbox, so it has the non-bills.
    ...bills("Forwarding"),
    make("BD-0828", "Forwarding", "Blue Dart Express Ltd", 9800, {
      sender: "invoices@bluedart.example",
      received: "2026-08-28",
    }),
    make("STMT-0930", "Forwarding", "HDFC Bank", 0, {
      sender: "alerts@hdfcbank.example",
      known: false,
      kind: "statement",
      received: "2026-09-30",
    }),
    make("ADV-0927", "Forwarding", "Reliance Retail Ltd", 0, {
      sender: "payables@relianceretail.example",
      known: false,
      kind: "advice",
      received: "2026-09-27",
    }),
    make("QT-0929", "Forwarding", "Kirloskar Brothers Ltd", 0, {
      sender: "sales@kirloskar.example",
      kind: "quote",
      received: "2026-09-29",
    }),
    make("NEWS-0915", "Forwarding", "Tally Solutions", 0, {
      sender: "news@tally.example",
      known: false,
      kind: "newsletter",
      received: "2026-09-15",
    }),
    ...bills("Gmail"),
    make("ML-0925", "Google Drive", "Mahindra Logistics Ltd", 35000, {
      sender: staff,
    }),
    make("DT-0929", "Google Drive", "Delhivery Ltd", 9400, {
      sender: staff,
      received: "2026-09-29",
    }),
    make("VR-0930", "WhatsApp Business", "VRL Logistics Ltd", 15600, {
      sender: "+91 80 2223 4455",
      received: "2026-09-30",
    }),
    make("GT-1002", "WhatsApp Business", "Ganesh Tempo Service", 6500, {
      sender: "+91 98450 22113",
      known: false,
      received: "2026-10-02",
    }),
  ];
};
