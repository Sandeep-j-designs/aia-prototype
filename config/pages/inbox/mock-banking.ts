import type {
  BankLedgerData,
  BankTransaction,
  LedgerOptionGroup,
  Statement,
  TallyVoucherPaymentType,
} from "@/types/pages/inbox/banking";

/**
 * Banking mock data, shaped as the API returns it (camelCase).
 *
 * DEV: GET /api/bank/account-setup → MOCK_BANK_LEDGERS
 * DEV: GET /api/statements?groupName=bank → MOCK_STATEMENTS
 * DEV: GET /api/transactions/bank?customerBank=<id> → MOCK_BANK_TRANSACTIONS
 * DEV: GET /api/accounts/grouped-tally-customer-account-list → LEDGER_GROUPS
 * DEV: GET /api/companies/bank-list → BANK_OPTIONS
 * DEV: GET /api/accounts/company-gstin-location-list → GST_REGISTRATIONS
 */

export const HDFC_ID = "b7c1e0a2-4f1d-4f7e-9d0a-hdfc50100123";
export const ICICI_ID = "c2d4a9f0-1b3e-47a8-8e21-icici000405";
export const AXIS_CC_ID = "e9a0b6c3-5d2f-4c19-a7b4-axiscc4512xx";
export const KOTAK_OD_ID = "f1e2d3c4-7a8b-4c9d-b0e1-kotakod0917";
export const CASH_ID = "a0b1c2d3-e4f5-4a6b-8c7d-cashinhand01";

export const MOCK_BANK_LEDGERS: BankLedgerData[] = [
  {
    id: HDFC_ID,
    ledgerName: "HDFC Bank - 50100123456",
    accountType: "bank",
    bankName: "HDFC Bank",
    unreconciledCount: 0,
    accountParent: "Bank Accounts",
    useInKorefi: true,
    bankId: 12,
    korefiBankName: "HDFC Bank",
    typeOfAccountFixed: "bank",
  },
  {
    id: ICICI_ID,
    ledgerName: "ICICI Current A/c",
    accountType: "bank",
    bankName: "ICICI Bank",
    unreconciledCount: 0,
    accountParent: "Bank Accounts",
    useInKorefi: true,
    bankId: 14,
    korefiBankName: "ICICI Bank",
    typeOfAccountFixed: "bank",
  },
  {
    id: AXIS_CC_ID,
    ledgerName: "Axis Credit Card",
    accountType: "credit_card",
    bankName: "Axis Bank",
    unreconciledCount: 0,
    accountParent: "Bank OD A/c",
    useInKorefi: true,
    bankId: 4,
    korefiBankName: "Axis Bank",
    typeOfAccountFixed: "credit_card",
  },
  {
    // Not mapped yet: the upload sheet asks for its type and bank.
    id: KOTAK_OD_ID,
    ledgerName: "Kotak Mahindra OD A/c",
    accountType: "",
    bankName: null,
    unreconciledCount: 0,
    accountParent: "Bank OD A/c",
    useInKorefi: true,
    bankId: null,
    korefiBankName: null,
    typeOfAccountFixed: "",
  },
  {
    id: CASH_ID,
    ledgerName: "Cash",
    accountType: "",
    bankName: null,
    unreconciledCount: 0,
    accountParent: "Cash-in-Hand",
    useInKorefi: true,
    bankId: null,
    korefiBankName: null,
    typeOfAccountFixed: "cash",
  },
];

export const BANK_OPTIONS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Canara Bank",
  "Union Bank of India",
  "IDFC FIRST Bank",
  "Federal Bank",
  "RBL Bank",
];

export const GST_REGISTRATIONS = [
  { uuid: "gst-ka-29", label: "Karnataka - 29AAWCS8421F1ZR" },
  { uuid: "gst-mh-27", label: "Maharashtra - 27AAWCS8421F1ZV" },
];
const KA = GST_REGISTRATIONS[0];

/** Tally ledgers under their groups, as the grouped list returns them. */
export const LEDGER_GROUPS: LedgerOptionGroup[] = [
  {
    heading: "Sundry Creditors",
    options: [
      "Sharma Steel Suppliers",
      "Vardhman Packaging Pvt Ltd",
      "Om Sai Logistics",
      "Bluedart Express Ltd",
      "Shree Ganesh Printers",
      "Zoho Corporation Pvt Ltd",
      "Amazon Web Services India Pvt Ltd",
      "Prestige Estates Projects Ltd",
    ],
  },
  {
    heading: "Sundry Debtors",
    options: [
      "Tata Projects Ltd",
      "Mehta Engineering Works",
      "Patel Agro Industries",
      "Reliance Retail Ltd",
      "Kumar Enterprises",
      "Infra Buildcon Pvt Ltd",
    ],
  },
  {
    heading: "Indirect Expenses",
    options: [
      "Bank Charges",
      "Rent",
      "Salary",
      "Electricity Charges",
      "Telephone & Internet",
      "Office Expenses",
      "Travelling Expenses",
      "Staff Welfare",
      "Software Subscriptions",
      "Professional Fees",
      "Courier Charges",
      "Insurance",
      "Interest on Credit Card",
      "Fuel Expenses",
    ],
  },
  {
    heading: "Duties & Taxes",
    options: ["GST Payable", "TDS Payable", "Input IGST", "Input CGST"],
  },
  {
    heading: "Indirect Incomes",
    options: ["Interest Received", "Discount Received"],
  },
  {
    heading: "Loans (Liability)",
    options: ["HDFC Term Loan"],
  },
  {
    heading: "Bank Accounts",
    options: ["HDFC Bank - 50100123456", "ICICI Current A/c"],
  },
  { heading: "Bank OD A/c", options: ["Axis Credit Card"] },
  { heading: "Cash-in-Hand", options: ["Cash"] },
];

/** The ledgers a Contra moves money between. */
export const CONTRA_GROUPS = ["Bank Accounts", "Bank OD A/c", "Cash-in-Hand"];

export const VOUCHER_TYPE_LABEL: Record<TallyVoucherPaymentType, string> = {
  payment: "Payment",
  receipt: "Receipt",
  contra: "Contra",
};

/*
  Transactions, compactly: [date, narration, amount, D|C, state, ledger?,
  voucherNo?, type?]. State: n = untouched, a = AI-categorised, u = type only,
  r = Accounting Ready, s = synced, p = sync in progress, f = sync failed.
  The type follows the side (Payment for money out, Receipt for money in)
  unless a Contra is named.
*/
type Row = [
  string,
  string,
  number,
  "D" | "C",
  "n" | "a" | "u" | "r" | "s" | "p" | "f",
  string?,
  string?,
  TallyVoucherPaymentType?,
];

const HDFC_ROWS: Row[] = [
  [
    "2026-08-01",
    "RENT AUG 2026 - PRESTIGE ESTATES - NEFT",
    165000,
    "D",
    "s",
    "Rent",
    "PMT/0981",
  ],
  [
    "2026-08-03",
    "NEFT CR-ICIC0000104-TATA PROJECTS LTD-INV 2026-098",
    236000,
    "C",
    "s",
    "Tata Projects Ltd",
    "RCT/0412",
  ],
  [
    "2026-08-05",
    "ACH D- HDFC TERM LOAN-EMI 0815",
    52340,
    "D",
    "s",
    "HDFC Term Loan",
    "PMT/0984",
  ],
  [
    "2026-08-07",
    "GST PMT - CPIN 26080700011873 - GSTN",
    98420,
    "D",
    "s",
    "GST Payable",
    "PMT/0986",
  ],
  [
    "2026-08-07",
    "TDS PMT - CHALLAN 281 - ITNS",
    36200,
    "D",
    "f",
    "TDS Payable",
    "PMT/0987",
  ],
  [
    "2026-08-11",
    "IMPS/P2A/622310982231/SHARMASTEEL/HDFC/Inv 4402",
    84960,
    "D",
    "s",
    "Sharma Steel Suppliers",
    "PMT/0990",
  ],
  [
    "2026-08-14",
    "TRF TO ICICI CURRENT A/C 000405012345",
    500000,
    "D",
    "s",
    "ICICI Current A/c",
    "CTR/0057",
    "contra",
  ],
  [
    "2026-08-18",
    "CHQ DEP - 000417 - MEHTA ENGINEERING WORKS - CLG",
    118000,
    "C",
    "p",
    "Mehta Engineering Works",
    "RCT/0415",
  ],
  [
    "2026-08-22",
    "BESCOM BILLDESK ELECTRICITY 9812345",
    18742,
    "D",
    "r",
    "Electricity Charges",
    "PMT/0995",
  ],
  [
    "2026-08-29",
    "SALARY AUG 2026 - BULK UPLOAD - 18 EMPLOYEES",
    642500,
    "D",
    "r",
    "Salary",
    "PMT/0997",
  ],
  [
    "2026-09-01",
    "RENT SEP 2026 - PRESTIGE ESTATES - NEFT",
    165000,
    "D",
    "r",
    "Rent",
    "PMT/1001",
  ],
  [
    "2026-09-02",
    "UPI/DR/624512378901/SWIGGY/YESB/swiggy.payu@yesbank",
    486,
    "D",
    "a",
    "Staff Welfare",
    "PMT/1002",
  ],
  [
    "2026-09-03",
    "NEFT CR-ICIC0000104-TATA PROJECTS LTD-INV 2026-117",
    236000,
    "C",
    "a",
    "Tata Projects Ltd",
    "RCT/0421",
  ],
  [
    "2026-09-04",
    "ACH D- HDFC TERM LOAN-EMI 0915",
    52340,
    "D",
    "a",
    "HDFC Term Loan",
  ],
  ["2026-09-05", "CHRG: IMPS CHARGES INCL GST", 17.7, "D", "a", "Bank Charges"],
  [
    "2026-09-06",
    "RTGS DR-SBIN0001234-VARDHMAN PACKAGING PVT LTD-HDFCR5202609",
    354000,
    "D",
    "a",
    "Vardhman Packaging Pvt Ltd",
  ],
  ["2026-09-08", "POS 4512XXXXXXXX1093 AMAZON PAY INDIA", 12499, "D", "n"],
  [
    "2026-09-09",
    "NEFT DR-UTIB0000056-OM SAI LOGISTICS-AUG FREIGHT",
    41300,
    "D",
    "a",
    "Om Sai Logistics",
  ],
  [
    "2026-09-10",
    "UPI/CR/624733001298/PATELAGRO/ICIC/Payment against INV 2026-121",
    59000,
    "C",
    "a",
    "Patel Agro Industries",
  ],
  ["2026-09-11", "GST PMT - CPIN 26091100012345 - GSTN", 112480, "D", "u"],
  [
    "2026-09-11",
    "TDS PMT - CHALLAN 281 - ITNS",
    38600,
    "D",
    "a",
    "TDS Payable",
  ],
  [
    "2026-09-12",
    "NEFT CR-KKBK0000958-KUMAR ENTERPRISES-ADV FOR PO 889",
    75000,
    "C",
    "n",
  ],
  [
    "2026-09-13",
    "CASH WDL - ATM HDFC KORAMANGALA",
    20000,
    "D",
    "a",
    "Cash",
    undefined,
    "contra",
  ],
  [
    "2026-09-15",
    "ACH D- AIRTEL BROADBAND-SEP",
    2359.82,
    "D",
    "a",
    "Telephone & Internet",
  ],
  [
    "2026-09-16",
    "UPI/DR/624812349011/ZOHO CORP/ICIC/Zoho One annual",
    47200,
    "D",
    "a",
    "Zoho Corporation Pvt Ltd",
  ],
  [
    "2026-09-17",
    "NEFT CR-HDFC0000060-RELIANCE RETAIL LTD-INV 2026-109",
    472000,
    "C",
    "n",
  ],
  ["2026-09-18", "CHQ PAID-000214-SHREE GANESH PRINTERS", 9440, "D", "n"],
  [
    "2026-09-19",
    "IMPS/P2A/624903215567/CA RAJESH IYER/Professional fees Q2",
    29500,
    "D",
    "u",
  ],
  [
    "2026-09-20",
    "UPI/DR/624911128742/MAKEMYTRIP/YESB/Flight BLR-BOM",
    14820,
    "D",
    "a",
    "Travelling Expenses",
  ],
  [
    "2026-09-22",
    "NEFT CR-YESB0000012-VARDHMAN PACKAGING-CREDIT NOTE CN-44",
    7080,
    "C",
    "n",
  ],
  ["2026-09-23", "UPI/DR/625002211903/BLINKIT/Office pantry", 3264, "D", "n"],
  [
    "2026-09-24",
    "NEFT DR-SBIN0004433-BLUEDART EXPRESS LTD-SEP",
    11682,
    "D",
    "a",
    "Bluedart Express Ltd",
  ],
  ["2026-09-25", "CHRG: NEFT CHARGES INCL GST", 5.9, "D", "a", "Bank Charges"],
  [
    "2026-09-26",
    "UPI/CR/625104455672/MEHTAENGG/HDFC/Balance INV 2026-112",
    103840,
    "C",
    "n",
  ],
  [
    "2026-09-28",
    "RTGS CR-SBIN0000300-TATA PROJECTS LTD-INV 2026-125",
    590000,
    "C",
    "a",
    "Tata Projects Ltd",
  ],
  [
    "2026-09-30",
    "INT.PD:50100123456:01-07-2026 TO 30-09-2026",
    2184,
    "C",
    "a",
    "Interest Received",
  ],
];

const ICICI_ROWS: Row[] = [
  [
    "2026-08-02",
    "NEFT-HDFCN52026080212345-INFRA BUILDCON PVT LTD-INV 0871",
    345000,
    "C",
    "s",
    "Infra Buildcon Pvt Ltd",
    "RCT/0410",
  ],
  [
    "2026-08-04",
    "INF/INFT/032145678/VARDHMAN PACKAGING PVT LTD",
    188800,
    "D",
    "s",
    "Vardhman Packaging Pvt Ltd",
    "PMT/0982",
  ],
  [
    "2026-08-06",
    "MMT/IMPS/622418765432/Om Sai Logistics/JUL freight",
    38940,
    "D",
    "s",
    "Om Sai Logistics",
    "PMT/0985",
  ],
  [
    "2026-08-09",
    "CLG/MEHTA ENGINEERING WORKS/000981/HDFC",
    92040,
    "C",
    "s",
    "Mehta Engineering Works",
    "RCT/0413",
  ],
  [
    "2026-08-14",
    "BY TRANSFER FROM HDFC BANK A/C 50100123456",
    500000,
    "C",
    "s",
    "HDFC Bank - 50100123456",
    "CTR/0058",
    "contra",
  ],
  [
    "2026-08-16",
    "NEFT-SBIN52026081698765-REL RETAIL-INV 2026-101",
    295000,
    "C",
    "r",
    "Reliance Retail Ltd",
    "RCT/0416",
  ],
  [
    "2026-08-20",
    "INF/NEFT/BLUEDART EXPRESS LTD/AUG",
    9874,
    "D",
    "r",
    "Bluedart Express Ltd",
    "PMT/0993",
  ],
  [
    "2026-08-25",
    "BIL/ONL/000412398/HDFC ERGO/Fire policy renewal",
    23600,
    "D",
    "p",
    "Insurance",
    "PMT/0996",
  ],
  [
    "2026-08-31",
    "CHARGES FOR CHQ BOOK ISSUE",
    118,
    "D",
    "r",
    "Bank Charges",
    "PMT/0999",
  ],
  [
    "2026-09-02",
    "NEFT-UTIBN52026090254321-KUMAR ENTERPRISES-INV 2026-114",
    148500,
    "C",
    "a",
    "Kumar Enterprises",
  ],
  [
    "2026-09-03",
    "INF/INFT/032198765/SHARMA STEEL SUPPLIERS",
    212400,
    "D",
    "a",
    "Sharma Steel Suppliers",
  ],
  [
    "2026-09-04",
    "MMT/IMPS/624701234567/AWS INDIA/Aug invoice",
    21486.44,
    "D",
    "a",
    "Amazon Web Services India Pvt Ltd",
  ],
  [
    "2026-09-05",
    "UPI/625101998877/Vendor advance/omsailogi@okicici",
    25000,
    "D",
    "n",
  ],
  [
    "2026-09-07",
    "NEFT-ICICN52026090711122-PATEL AGRO INDUSTRIES",
    87320,
    "C",
    "a",
    "Patel Agro Industries",
  ],
  ["2026-09-08", "CLG/INFRA BUILDCON PVT LTD/001204/SBI", 410000, "C", "n"],
  [
    "2026-09-10",
    "BIL/ONL/000418899/BSNL/Leased line",
    6844,
    "D",
    "a",
    "Telephone & Internet",
  ],
  ["2026-09-12", "INF/NEFT/PRESTIGE ESTATES/Maintenance Q2", 42480, "D", "u"],
  [
    "2026-09-14",
    "ATM/CASH WDL/ICICI ATM INDIRANAGAR",
    15000,
    "D",
    "a",
    "Cash",
    undefined,
    "contra",
  ],
  [
    "2026-09-15",
    "NEFT-HDFCN52026091555544-TATA PROJECTS LTD-RETENTION",
    118000,
    "C",
    "n",
  ],
  [
    "2026-09-17",
    "MMT/IMPS/624922233344/CA RAJESH IYER/ITR filing",
    17700,
    "D",
    "a",
    "Professional Fees",
  ],
  [
    "2026-09-18",
    "CHARGES FOR NEFT/RTGS INCL GST",
    41.3,
    "D",
    "a",
    "Bank Charges",
  ],
  ["2026-09-19", "UPI/625312345678/Pantry/zepto@ybl", 2140, "D", "n"],
  [
    "2026-09-21",
    "INF/INFT/032245566/SHREE GANESH PRINTERS",
    15340,
    "D",
    "a",
    "Shree Ganesh Printers",
  ],
  [
    "2026-09-23",
    "NEFT-KKBKN52026092377788-MEHTA ENGINEERING WORKS",
    64900,
    "C",
    "a",
    "Mehta Engineering Works",
  ],
  [
    "2026-09-24",
    "BIL/ONL/000421100/LIC OF INDIA/Group gratuity",
    48000,
    "D",
    "n",
  ],
  ["2026-09-26", "INT CREDIT ON SWEEP FD", 3412, "C", "a", "Interest Received"],
  [
    "2026-09-27",
    "MMT/IMPS/625011122233/Om Sai Logistics/SEP freight",
    44250,
    "D",
    "a",
    "Om Sai Logistics",
  ],
  [
    "2026-09-29",
    "TRF TO AXIS CARD 4512XXXXXXXX7781",
    86420,
    "D",
    "u",
    undefined,
    undefined,
    "contra",
  ],
  [
    "2026-09-30",
    "NEFT-SBIN52026093011223-RELIANCE RETAIL LTD-INV 2026-128",
    354000,
    "C",
    "n",
  ],
];

const AXIS_ROWS: Row[] = [
  [
    "2026-08-03",
    "GOOGLE*WORKSPACE MUMBAI IN",
    9204,
    "D",
    "s",
    "Software Subscriptions",
    "PMT/0983",
  ],
  [
    "2026-08-05",
    "AMAZON WEB SERVICES BANGALORE IN",
    19876.12,
    "D",
    "s",
    "Amazon Web Services India Pvt Ltd",
    "PMT/0988",
  ],
  [
    "2026-08-08",
    "INDIGO 6E BLR-DEL 6E2134 GURGAON IN",
    11420,
    "D",
    "s",
    "Travelling Expenses",
    "PMT/0989",
  ],
  [
    "2026-08-12",
    "PAYMENT RECEIVED - THANK YOU",
    64180,
    "C",
    "s",
    "ICICI Current A/c",
    "CTR/0059",
    "contra",
  ],
  [
    "2026-08-15",
    "HPCL KORAMANGALA BANGALORE IN",
    4200,
    "D",
    "r",
    "Fuel Expenses",
    "PMT/0991",
  ],
  [
    "2026-08-19",
    "MICROSOFT*365 BUSINESS SINGAPORE SG",
    12980,
    "D",
    "r",
    "Software Subscriptions",
    "PMT/0994",
  ],
  [
    "2026-08-24",
    "LINKEDIN*PREMIUM BANGALORE IN",
    2950,
    "D",
    "f",
    "Software Subscriptions",
    "PMT/0998",
  ],
  [
    "2026-09-01",
    "ADOBE *CREATIVE CLOUD MUMBAI IN",
    5664,
    "D",
    "a",
    "Software Subscriptions",
  ],
  ["2026-09-02", "SWIGGY BANGALORE IN", 1862, "D", "a", "Staff Welfare"],
  [
    "2026-09-03",
    "AMAZON WEB SERVICES BANGALORE IN",
    21486.44,
    "D",
    "a",
    "Amazon Web Services India Pvt Ltd",
  ],
  [
    "2026-09-04",
    "GOOGLE*WORKSPACE MUMBAI IN",
    9204,
    "D",
    "a",
    "Software Subscriptions",
  ],
  ["2026-09-06", "MAKEMYTRIP INDIA PVT LTD GURGAON IN", 18640, "D", "n"],
  ["2026-09-07", "TAJ MG ROAD BANGALORE IN", 7316, "D", "n"],
  [
    "2026-09-09",
    "UBER INDIA SYSTEMS BANGALORE IN",
    642,
    "D",
    "a",
    "Travelling Expenses",
  ],
  [
    "2026-09-10",
    "PAYMENT RECEIVED - THANK YOU",
    86420,
    "C",
    "u",
    undefined,
    undefined,
    "contra",
  ],
  ["2026-09-11", "AMAZON PAY INDIA PVT LTD BANGALORE IN", 8999, "D", "n"],
  [
    "2026-09-13",
    "HPCL INDIRANAGAR BANGALORE IN",
    3800,
    "D",
    "a",
    "Fuel Expenses",
  ],
  [
    "2026-09-14",
    "ZOHO CORPORATION CHENNAI IN",
    4720,
    "D",
    "a",
    "Zoho Corporation Pvt Ltd",
  ],
  ["2026-09-16", "CROMA ELECTRONICS BANGALORE IN", 26490, "D", "n"],
  ["2026-09-18", "BLINKIT BANGALORE IN", 1284, "D", "n"],
  [
    "2026-09-19",
    "FINANCE CHARGES",
    1186.5,
    "D",
    "a",
    "Interest on Credit Card",
  ],
  ["2026-09-19", "IGST ON FINANCE CHARGES", 213.57, "D", "a", "Input IGST"],
  [
    "2026-09-21",
    "INDIGO 6E BOM-BLR 6E5512 GURGAON IN",
    9870,
    "D",
    "a",
    "Travelling Expenses",
  ],
  ["2026-09-24", "BLUEDART EXPRESS LTD MUMBAI IN", 1458, "D", "n"],
  ["2026-09-26", "CASHBACK CREDIT", 412, "C", "n"],
  ["2026-09-28", "ANNUAL FEE", 2999, "D", "a", "Bank Charges"],
];

/* ------------------------------------------------- Sahyadri Precision Works, Pune */

export const ACME_SBI_ID = "acme-sbi-current-3987";
export const ACME_CASH_ID = "acme-cash-in-hand";

/** Sahyadri's two ledgers: one current account and petty cash. */
const ACME_BANK_LEDGERS: BankLedgerData[] = [
  {
    id: ACME_SBI_ID,
    ledgerName: "SBI Current A/c - 3987",
    accountType: "bank",
    bankName: "State Bank of India",
    unreconciledCount: 0,
    accountParent: "Bank Accounts",
    useInKorefi: true,
    bankId: 3,
    korefiBankName: "State Bank of India",
    typeOfAccountFixed: "bank",
  },
  {
    id: ACME_CASH_ID,
    ledgerName: "Cash",
    accountType: "",
    bankName: null,
    unreconciledCount: 0,
    accountParent: "Cash-in-Hand",
    useInKorefi: true,
    bankId: null,
    korefiBankName: null,
    typeOfAccountFixed: "cash",
  },
];

const ACME_GST_REGISTRATIONS = [
  { uuid: "gst-mh-27-acme", label: "Maharashtra - 27AABFS5582A1ZC" },
];

/** Sahyadri's Tally ledgers, spelled as its Chart of Accounts has them. */
const ACME_LEDGER_GROUPS: LedgerOptionGroup[] = [
  {
    heading: "Sundry Creditors",
    options: [
      "Tata Steel Ltd",
      "Bharat Forge Ltd",
      "SKF India Ltd",
      "Pune Precision Tools",
      "Chakan Heat Treaters",
      "Sai Logistics Pune",
    ],
  },
  {
    heading: "Sundry Debtors",
    options: [
      "Mahindra & Mahindra Ltd",
      "Thermax Ltd",
      "Kirloskar Brothers Ltd",
      "Cummins India Ltd",
    ],
  },
  {
    heading: "Direct Expenses",
    options: ["Job Work Charges", "Power & Fuel"],
  },
  {
    heading: "Indirect Expenses",
    options: ["Salary", "Rent", "Bank Charges", "Freight Outward"],
  },
  {
    heading: "Duties & Taxes",
    options: ["TDS Payable", "Input CGST", "Input SGST", "Input IGST"],
  },
  { heading: "Bank Accounts", options: ["SBI Current A/c - 3987"] },
  { heading: "Cash-in-Hand", options: ["Cash"] },
];

const LEDGER_OF: Record<string, BankLedgerData> = Object.fromEntries(
  [...MOCK_BANK_LEDGERS, ...ACME_BANK_LEDGERS].map((ledger) => [
    ledger.id,
    ledger,
  ])
);

let nextLine = 4100;

/** A transaction, as GET /api/transactions/bank returns one. */
export const buildTransaction = (
  ledgerId: string,
  [date, description, amount, side, state, ledger, voucherNo, type]: Row,
  gst: { uuid: string; label: string } = KA
): BankTransaction => {
  const account = LEDGER_OF[ledgerId];
  const crDr = side === "D" ? "debit" : "credit";
  const typed = state !== "n";
  const paymentType: TallyVoucherPaymentType | null = typed
    ? (type ?? (crDr === "debit" ? "payment" : "receipt"))
    : null;
  const ready = ["r", "s", "p", "f"].includes(state);
  const id = nextLine++;
  return {
    bankLineId: id,
    bankLineUuid: `bl-${id}`,
    bankAccountUuid: ledgerId,
    transactionDate: date,
    transactionAmountLc: amount.toFixed(2),
    crDr,
    bankName: account?.bankName ?? "",
    bankAccountName: account?.ledgerName ?? "",
    bankAccountType: account?.accountType ?? "",
    description,
    remarks: "",
    paymentType,
    voucherConfigLabel: paymentType ? VOUCHER_TYPE_LABEL[paymentType] : null,
    categorisedBy: state === "a" ? "ai" : typed ? "user" : "",
    ledgersNameList: ledger ? [ledger] : [],
    ledgersUuidList: ledger ? [`led-${ledger}`] : [],
    thirdPartySyncStatus:
      state === "s"
        ? "synced"
        : state === "p"
          ? "in_progress"
          : state === "f"
            ? "event_creations_failed"
            : "not_synced",
    thirdPartySyncError:
      state === "f"
        ? "Voucher number already exists in Tally for this voucher type."
        : null,
    thirdPartyPostingDate: state === "s" ? `${date}T18:42:10` : "",
    thirdPartyProduct: state === "s" || state === "p" ? "Tally" : "",
    accoutingReady: ready,
    isReadyToSync: !!paymentType && !!ledger,
    companyGstLabel: typed ? gst.label : "",
    companyGstUuid: typed ? gst.uuid : "",
    voucherNo: voucherNo ?? null,
  };
};

export const MOCK_BANK_TRANSACTIONS: BankTransaction[] = [
  ...HDFC_ROWS.map((row) => buildTransaction(HDFC_ID, row)),
  ...ICICI_ROWS.map((row) => buildTransaction(ICICI_ID, row)),
  ...AXIS_ROWS.map((row) => buildTransaction(AXIS_CC_ID, row)),
];

/**
 * What a freshly extracted statement adds, per account kind. The upload
 * simulation runs these through buildTransaction.
 */
export const EXTRACTED_ROWS: Record<"bank" | "credit_card", Row[]> = {
  bank: [
    [
      "2026-09-29",
      "NEFT CR-UTIB0000081-INFRA BUILDCON PVT LTD-INV 2026-131",
      212400,
      "C",
      "a",
      "Infra Buildcon Pvt Ltd",
    ],
    [
      "2026-09-29",
      "UPI/DR/625301122334/IRCTC/Train BLR-MAS",
      2315,
      "D",
      "a",
      "Travelling Expenses",
    ],
    [
      "2026-09-30",
      "IMPS/P2A/625312398765/SHARMASTEEL/Inv 4519",
      67850,
      "D",
      "n",
    ],
    [
      "2026-09-30",
      "CHRG: SMS ALERT CHARGES QTR",
      17.7,
      "D",
      "a",
      "Bank Charges",
    ],
    ["2026-09-30", "ACH D- TATA AIG-POLICY 8812", 8850, "D", "n"],
    [
      "2026-09-30",
      "UPI/CR/625314455667/KUMARENT/Part payment INV 2026-130",
      40000,
      "C",
      "n",
    ],
  ],
  credit_card: [
    [
      "2026-09-29",
      "GOOGLE*CLOUD MUMBAI IN",
      6380,
      "D",
      "a",
      "Software Subscriptions",
    ],
    [
      "2026-09-29",
      "SWIGGY INSTAMART BANGALORE IN",
      942,
      "D",
      "a",
      "Staff Welfare",
    ],
    ["2026-09-30", "AIR INDIA AI505 BLR-DEL", 12650, "D", "n"],
    ["2026-09-30", "NOTION LABS SAN FRANCISCO US", 1680, "D", "n"],
    [
      "2026-09-30",
      "HPCL HSR LAYOUT BANGALORE IN",
      3100,
      "D",
      "a",
      "Fuel Expenses",
    ],
    ["2026-09-30", "MARKUP FEE ON FOREX TXN", 58.8, "D", "n"],
  ],
};

const statement = (
  ledgerId: string,
  fileName: string,
  from: string,
  to: string,
  extra: Partial<Statement> = {}
): Statement => {
  const account = LEDGER_OF[ledgerId];
  const id = `${ledgerId.slice(-6)}-${from}`;
  return {
    statementStartDate: from,
    statementEndDate: to,
    fileName,
    bankName: account?.bankName ?? "",
    fileCategory:
      account?.accountType === "credit_card"
        ? "credit_card_statement"
        : "bank_statement",
    accountNumber: account?.ledgerName.match(/\d{4,}/)?.[0] ?? "",
    status: "file_hitl_success",
    statusMessage: null,
    fileUuid: `file-${id}`,
    bankStmtStatusUuid: `stmt-${id}`,
    bankAccountNumber: account?.ledgerName.match(/\d{4,}/)?.[0] ?? "",
    bankAccountName: account?.ledgerName ?? "",
    bankAccountType: account?.accountType ?? "",
    bankAccountUuid: ledgerId,
    fileMetadata: { noOfDuplicates: 0, noOfLinesExtracted: 18 },
    workflowStage: "extracted",
    enrichmentPercentage: 100,
    workflowError: null,
    ...extra,
  };
};

export const MOCK_STATEMENTS: Statement[] = [
  statement(
    HDFC_ID,
    "HDFC_50100123456_Sep2026.pdf",
    "2026-09-01",
    "2026-09-30",
    {
      workflowStage: "enriching",
      enrichmentPercentage: 64,
      status: "file_uploaded",
    }
  ),
  statement(
    HDFC_ID,
    "HDFC_50100123456_Aug2026.pdf",
    "2026-08-01",
    "2026-08-31",
    {
      fileMetadata: { noOfDuplicates: 2, noOfLinesExtracted: 12 },
    }
  ),
  statement(HDFC_ID, "HDFC_50100123456_Jul2026_scan.pdf", "", "", {
    status: "file_hitl_rejected",
    statusMessage:
      "This looks like a scanned copy. Download the statement from netbanking and upload it again.",
    // No workflow stage: the status message shows as the pill's tooltip.
    workflowStage: null,
  }),
  statement(
    ICICI_ID,
    "ICICI_CA_000405_Sep2026.pdf",
    "2026-09-01",
    "2026-09-30"
  ),
  statement(
    ICICI_ID,
    "ICICI_CA_000405_Aug2026.pdf",
    "2026-08-01",
    "2026-08-31",
    {
      workflowStage: "paused",
      status: "file_uploaded",
    }
  ),
  statement(AXIS_CC_ID, "Axis_CC_7781_Sep2026.pdf", "2026-08-20", "2026-09-19"),
  statement(AXIS_CC_ID, "Axis_CC_7781_Aug2026.pdf", "2026-07-20", "2026-08-19"),
];

/* ------------------------------------------------- Sahyadri's transactions */

const ACME_SBI_ROWS: Row[] = [
  [
    "2026-08-03",
    "NEFT-TATA STEEL LTD-INV TSL/MH/26-27/5131-EN8 ROUND BARS",
    412880,
    "D",
    "s",
    "Tata Steel Ltd",
    "PMT/0211",
  ],
  [
    "2026-08-07",
    "NEFT CR-MAHINDRA AND MAHINDRA LTD-PO 4500127781",
    684200,
    "C",
    "s",
    "Mahindra & Mahindra Ltd",
    "RCT/0118",
  ],
  [
    "2026-08-12",
    "RTGS-BHARAT FORGE LTD-FORGED FLANGE BLANKS",
    298450,
    "D",
    "s",
    "Bharat Forge Ltd",
    "PMT/0214",
  ],
  [
    "2026-08-18",
    "NEFT-CHAKAN HEAT TREATERS-JOB WORK AUG",
    41300,
    "D",
    "r",
    "Chakan Heat Treaters",
  ],
  [
    "2026-08-22",
    "MSEDCL ELECTRICITY BILL CHAKAN PLANT",
    86540,
    "D",
    "r",
    "Power & Fuel",
  ],
  [
    "2026-08-28",
    "NEFT CR-THERMAX LTD-INV ACM/26-27/0142",
    236000,
    "C",
    "a",
    "Thermax Ltd",
  ],
  [
    "2026-09-01",
    "RENT SEP 2026 - CHAKAN MIDC SHED B-14 - NEFT",
    95000,
    "D",
    "a",
    "Rent",
  ],
  [
    "2026-09-04",
    "IMPS-SKF INDIA LTD-BEARINGS 6205 2RS",
    58410,
    "D",
    "a",
    "SKF India Ltd",
  ],
  ["2026-09-08", "SALARY SEP 2026 - BULK NEFT 42 EMP", 412500, "D", "u"],
  [
    "2026-09-11",
    "NEFT CR-KIRLOSKAR BROTHERS LTD-PART PMT ACM/26-27/0151",
    150000,
    "C",
    "n",
  ],
  [
    "2026-09-15",
    "UPI/DR/625811204417/PUNEPRECISION/CNC inserts",
    18880,
    "D",
    "n",
  ],
  ["2026-09-18", "CHQ DEP-CUMMINS INDIA LTD-CHQ 004512", 327440, "C", "n"],
  [
    "2026-09-22",
    "NEFT-SAI LOGISTICS PUNE-LR 3324 PUNE-NASHIK",
    12600,
    "D",
    "a",
    "Freight Outward",
  ],
  ["2026-09-25", "CHRG: NEFT/RTGS CHARGES SEP", 354, "D", "a", "Bank Charges"],
  [
    "2026-09-29",
    "ATM WDL CHAKAN MIDC - PETTY CASH",
    25000,
    "D",
    "a",
    "Cash",
    undefined,
    "contra",
  ],
];

const ACME_TRANSACTIONS: BankTransaction[] = ACME_SBI_ROWS.map((row) =>
  buildTransaction(ACME_SBI_ID, row, ACME_GST_REGISTRATIONS[0])
);

const ACME_STATEMENTS: Statement[] = [
  statement(
    ACME_SBI_ID,
    "SBI_CA_3987_Sep2026.pdf",
    "2026-09-01",
    "2026-09-30",
    {
      fileMetadata: { noOfDuplicates: 0, noOfLinesExtracted: 7 },
    }
  ),
  statement(
    ACME_SBI_ID,
    "SBI_CA_3987_Aug2026.pdf",
    "2026-08-01",
    "2026-08-31",
    {
      fileMetadata: { noOfDuplicates: 1, noOfLinesExtracted: 6 },
    }
  ),
];

/* ------------------------------------------------------- per company */

/** One company's Banking, as its first loads return it. */
export type BankingSeed = {
  ledgers: BankLedgerData[];
  statements: Statement[];
  transactions: BankTransaction[];
};

/**
 * One company's bank and cash ledgers, statements and transactions, keyed
 * by the Inbox's company id. Shakunthalam's is the data above, unchanged;
 * Sahyadri has one SBI current account and petty cash; any other company — one
 * created in the prototype — has no ledgers synced from Tally yet.
 */
export const seedFor = (companyId: string): BankingSeed =>
  companyId === "shakun"
    ? {
        ledgers: MOCK_BANK_LEDGERS,
        statements: MOCK_STATEMENTS,
        transactions: MOCK_BANK_TRANSACTIONS,
      }
    : companyId === "acme"
      ? {
          ledgers: ACME_BANK_LEDGERS,
          statements: ACME_STATEMENTS,
          transactions: ACME_TRANSACTIONS,
        }
      : { ledgers: [], statements: [], transactions: [] };

/** DEV: GET /api/accounts/grouped-tally-customer-account-list, per company. */
export const ledgerGroupsOf = (companyId: string): LedgerOptionGroup[] =>
  companyId === "shakun"
    ? LEDGER_GROUPS
    : companyId === "acme"
      ? ACME_LEDGER_GROUPS
      : [];

/** DEV: GET /api/accounts/company-gstin-location-list, per company. */
export const gstRegistrationsOf = (companyId: string) =>
  companyId === "shakun"
    ? GST_REGISTRATIONS
    : companyId === "acme"
      ? ACME_GST_REGISTRATIONS
      : [];
