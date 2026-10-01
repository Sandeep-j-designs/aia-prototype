import type {
  AccountingMastersCounts,
  CoaSyncStatus,
  LedgerDetailResponse,
  LedgerGroupListItem,
} from "@/types/pages/inbox/chart-of-accounts";

/**
 * Shakunthalam Oil & Refineries Pvt Ltd — an edible-oil refiner in
 * Davanagere, Karnataka — as its Tally chart of accounts.
 *
 * Groups are Tally's 28 predefined groups with their real natures and
 * nesting. Ledger names that the rest of the prototype already posts to
 * (Banking, Purchases, Sales, Journals) are spelled the same here, so a ledger
 * seen on a bill is the ledger found in the tree.
 *
 * Opening balances follow Tally's sign: a debit balance is negative.
 */

/* --------------------------------------------------------------- groups */
type Nature = "Assets" | "Liabilities" | "Income" | "Expenses";

const group = (
  ledgerGroupUuid: string,
  groupName: string,
  parentPath: string[],
  nature: Nature
): LedgerGroupListItem => ({
  ledgerGroupUuid,
  groupName,
  groupPath: [...parentPath, groupName],
  reserveName: groupName,
  nature,
});

const CA = ["Current Assets"];
const CL = ["Current Liabilities"];
const LL = ["Loans (Liability)"];
const CAP = ["Capital Account"];

/** DEV: GET /api/accounting-masters/ledger-groups?companyUuid=… */
export const MOCK_LEDGER_GROUPS: LedgerGroupListItem[] = [
  group("grp-branch-divisions", "Branch / Divisions", [], "Liabilities"),
  group("grp-capital-account", "Capital Account", [], "Liabilities"),
  group("grp-reserves-surplus", "Reserves & Surplus", CAP, "Liabilities"),
  group("grp-current-assets", "Current Assets", [], "Assets"),
  group("grp-bank-accounts", "Bank Accounts", CA, "Assets"),
  group("grp-cash-in-hand", "Cash-in-Hand", CA, "Assets"),
  group("grp-deposits-asset", "Deposits (Asset)", CA, "Assets"),
  group("grp-loans-advances", "Loans & Advances (Asset)", CA, "Assets"),
  group("grp-stock-in-hand", "Stock-in-Hand", CA, "Assets"),
  group("grp-sundry-debtors", "Sundry Debtors", CA, "Assets"),
  group("grp-current-liabilities", "Current Liabilities", [], "Liabilities"),
  group("grp-duties-taxes", "Duties & Taxes", CL, "Liabilities"),
  group("grp-provisions", "Provisions", CL, "Liabilities"),
  group("grp-sundry-creditors", "Sundry Creditors", CL, "Liabilities"),
  group("grp-direct-expenses", "Direct Expenses", [], "Expenses"),
  group("grp-direct-incomes", "Direct Incomes", [], "Income"),
  group("grp-fixed-assets", "Fixed Assets", [], "Assets"),
  group("grp-indirect-expenses", "Indirect Expenses", [], "Expenses"),
  group("grp-indirect-incomes", "Indirect Incomes", [], "Income"),
  group("grp-investments", "Investments", [], "Assets"),
  group("grp-loans-liability", "Loans (Liability)", [], "Liabilities"),
  group("grp-bank-od", "Bank OD A/c", LL, "Liabilities"),
  group("grp-secured-loans", "Secured Loans", LL, "Liabilities"),
  group("grp-unsecured-loans", "Unsecured Loans", LL, "Liabilities"),
  group("grp-misc-expenses", "Misc. Expenses (ASSET)", [], "Assets"),
  group("grp-purchase-accounts", "Purchase Accounts", [], "Expenses"),
  group("grp-sales-accounts", "Sales Accounts", [], "Income"),
  group("grp-suspense", "Suspense A/c", [], "Liabilities"),
];

const GROUP_BY_ID = new Map(
  MOCK_LEDGER_GROUPS.map((g) => [g.ledgerGroupUuid, g])
);

/* -------------------------------------------------------------- ledgers */
type Extra = Partial<LedgerDetailResponse> & {
  sync?: CoaSyncStatus;
  txns?: number;
};

const ledger = (
  accountUuid: string,
  accountName: string,
  ledgerGroupUuid: string,
  { sync = "synced", txns = 12, ...extra }: Extra = {}
): LedgerDetailResponse => {
  const parent = GROUP_BY_ID.get(ledgerGroupUuid)!;
  return {
    accountUuid,
    accountName,
    ledgerGroupUuid,
    groupPath: parent.groupPath,
    groupReserveName: parent.reserveName,
    nature: parent.nature ?? "",
    currency: "INR",
    isCostCentreOn: false,
    isBillWiseOn: false,
    isInventoryAffected: false,
    isDutyAndTaxes: false,
    openingBalance: "0",
    address: null,
    taxRegistrationDetails: null,
    bankDetails: [],
    thirdPartyProduct: "Tally",
    thirdPartySyncStatus: sync,
    thirdPartySyncMessage: null,
    transactionCount: txns,
    gstApplicability: "Not Applicable",
    ...extra,
  };
};

const ka = (
  address: string,
  pincode: string,
  phoneNo = "",
  email = ""
): LedgerDetailResponse["address"] => ({
  address,
  pincode,
  state: "Karnataka",
  country: "India",
  phoneNo,
  email,
});

/** A party (form-8) with one GSTIN, one billing address and a contact. */
const party = (
  gstin: string,
  {
    legalName,
    line1,
    line2 = "",
    city,
    state = "Karnataka",
    pincode,
    phone = "",
    email = "",
    contact,
    bank,
    creditPeriod = "",
    treatment = "gstt-regular",
  }: {
    legalName: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    pincode: string;
    phone?: string;
    email?: string;
    contact?: [string, string];
    bank?: { bankName: string; accountNumber: string; ifscCode: string };
    creditPeriod?: string;
    treatment?: string;
  }
): Partial<LedgerDetailResponse> => ({
  legalName,
  isBillWiseOn: !!creditPeriod,
  creditPeriod,
  gstTreatmentUuid: treatment,
  address: {
    address: line1,
    pincode,
    state,
    country: "India",
    phoneNo: phone,
    email,
  },
  taxRegistrationDetails: {
    gstin,
    pan: gstin ? gstin.slice(2, 12) : null,
    registrationType: treatment === "gstt-regular" ? "Regular" : null,
  },
  gstDetails: [
    {
      gstin,
      panNo: gstin ? gstin.slice(2, 12) : "",
      placeOfSupply: state,
    },
  ],
  customerMerchantAddresses: {
    billing: [
      {
        addrLine_1: line1,
        addrLine_2: line2,
        addrLine_3: "",
        city,
        state,
        pincode,
        country: "India",
      },
    ],
    shipping: [],
  },
  bankDetails: bank
    ? [{ ...bank, accountName: legalName, upiId: "", isPrimary: true }]
    : [],
  contactInformations: contact
    ? [
        {
          firstName: contact[0],
          lastName: contact[1],
          email,
          phoneNo: phone,
        },
      ]
    : [],
});

/** A GST duty ledger under Duties & Taxes (form-6). */
const gstDuty = (
  taxType: "IGST" | "CGST" | "SGST",
  rate: string
): Partial<LedgerDetailResponse> => ({
  isDutyAndTaxes: true,
  typeOfDutyTax: "GST",
  taxabilityType: "Taxable",
  taxType,
  ...(taxType === "IGST"
    ? { igstRate: rate }
    : taxType === "CGST"
      ? { cgstRate: rate }
      : { sgstUgstRate: rate }),
  applicationDate: "2017-07-01",
});

/** A sales or purchase ledger with its GST rate set (form-5). */
const gstRated = (
  rate: string,
  hsnSac: string,
  typeOfSupply = "Goods"
): Partial<LedgerDetailResponse> => ({
  gstApplicability: "Applicable",
  isHsnSacDetailsSpecified: true,
  hsnSac,
  isGstRateDetailsSpecified: true,
  taxabilityType: "Taxable",
  igstRate: rate,
  typeOfSupply,
});

/** DEV: GET /api/accounting-masters/customer-accounts-v2/{ledgerUuid}, per ledger. */
export const MOCK_LEDGERS: LedgerDetailResponse[] = [
  // Bank Accounts — the same ids Banking uses, so the two stay one ledger.
  ledger(
    "b7c1e0a2-4f1d-4f7e-9d0a-hdfc50100123",
    "HDFC Bank - 50100123456",
    "grp-bank-accounts",
    {
      txns: 214,
      openingBalance: "-1842650.40",
      address: ka("Davanagere Main Branch, PB Road", "577002", "8192256600"),
      bankDetails: [
        {
          accountName: "Shakunthalam Oil and Refineries Pvt Ltd",
          bankName: "HDFC Bank",
          accountNumber: "50100123456",
          ifscCode: "HDFC0000412",
          branch: "Davanagere PB Road",
          bsrCode: "0510308",
          swiftCode: "HDFCINBB",
        },
      ],
      taxRegistrationDetails: {
        gstin: "29AAWCS8421F1ZR",
        pan: null,
        registrationType: null,
      },
    }
  ),
  ledger(
    "c2d4a9f0-1b3e-47a8-8e21-icici000405",
    "ICICI Current A/c",
    "grp-bank-accounts",
    {
      txns: 96,
      openingBalance: "-425300.00",
      bankDetails: [
        {
          accountName: "Shakunthalam Oil and Refineries Pvt Ltd",
          bankName: "ICICI Bank",
          accountNumber: "000405012345",
          ifscCode: "ICIC0000004",
          branch: "Davanagere",
        },
      ],
    }
  ),
  ledger(
    "led-sbi-collection",
    "SBI Collection A/c - 3889",
    "grp-bank-accounts",
    {
      sync: "not_synced",
      txns: 0,
      bankDetails: [
        {
          accountName: "Shakunthalam Oil and Refineries Pvt Ltd",
          bankName: "State Bank of India",
          accountNumber: "38890211547",
          ifscCode: "SBIN0040213",
          branch: "Harihar",
        },
      ],
    }
  ),
  // Bank OD A/c
  ledger(
    "e9a0b6c3-5d2f-4c19-a7b4-axiscc4512xx",
    "Axis Credit Card",
    "grp-bank-od",
    {
      txns: 41,
      openingBalance: "86420.00",
      bankDetails: [
        {
          accountName: "Shakunthalam Oil and Refineries Pvt Ltd",
          bankName: "Axis Bank",
          accountNumber: "",
          ifscCode: "",
        },
      ],
    }
  ),
  ledger(
    "f1e2d3c4-7a8b-4c9d-b0e1-kotakod0917",
    "Kotak Mahindra OD A/c",
    "grp-bank-od",
    {
      txns: 18,
      openingBalance: "2500000.00",
      bankDetails: [
        {
          accountName: "Shakunthalam Oil and Refineries Pvt Ltd",
          bankName: "Kotak Mahindra Bank",
          accountNumber: "0917345120",
          ifscCode: "KKBK0008121",
          branch: "Davanagere",
        },
      ],
    }
  ),
  // Cash-in-Hand
  ledger("a0b1c2d3-e4f5-4a6b-8c7d-cashinhand01", "Cash", "grp-cash-in-hand", {
    txns: 133,
    openingBalance: "-48210.00",
    address: ka("Registered Office, KIADB Industrial Area", "577005"),
  }),
  ledger(
    "led-petty-cash-plant",
    "Petty Cash - Harihar Plant",
    "grp-cash-in-hand",
    {
      sync: "not_synced",
      txns: 0,
    }
  ),
  // Sundry Debtors
  ledger("led-sri-lakshmi", "Sri Lakshmi Traders", "grp-sundry-debtors", {
    txns: 58,
    openingBalance: "-312400.00",
    ...party("29AAYFS1040D1Z2", {
      legalName: "Sri Lakshmi Traders",
      line1: "14, APMC Yard, Hadadi Road",
      city: "Davanagere",
      pincode: "577006",
      phone: "9845012233",
      email: "accounts@srilakshmitraders.in",
      contact: ["Venkatesh", "Rao"],
      creditPeriod: "30",
    }),
  }),
  ledger("led-annapoorna", "Annapoorna Wholesale", "grp-sundry-debtors", {
    txns: 44,
    openingBalance: "-198750.00",
    ...party("29AAFFA8764Y1Z3", {
      legalName: "Annapoorna Wholesale Distributors",
      line1: "Plot 22, Yeshwanthpur Industrial Suburb",
      city: "Bengaluru",
      pincode: "560022",
      phone: "9880544120",
      email: "purchase@annapoorna.co.in",
      contact: ["Shobha", "Hegde"],
      creditPeriod: "45",
    }),
  }),
  ledger("led-reliance-retail", "Reliance Retail Ltd", "grp-sundry-debtors", {
    txns: 37,
    openingBalance: "-1240000.00",
    ...party("29AATCR8983C1ZI", {
      legalName: "Reliance Retail Limited",
      line1: "Embassy Tech Square, Outer Ring Road",
      city: "Bengaluru",
      pincode: "560103",
      email: "vendorpayments@ril.com",
      creditPeriod: "60",
    }),
  }),
  ledger("led-hotel-mayura", "Hotel Mayura Group", "grp-sundry-debtors", {
    sync: "in_progress",
    txns: 9,
    ...party("29AAZCH6289B1ZT", {
      legalName: "Hotel Mayura Hospitality Pvt Ltd",
      line1: "Opp. Bus Stand, Hadadi Road",
      city: "Davanagere",
      pincode: "577002",
      phone: "9448123456",
      contact: ["Prakash", "Shetty"],
      creditPeriod: "15",
    }),
  }),
  ledger("led-spar", "Spar Hypermarket", "grp-sundry-debtors", {
    sync: "not_synced",
    txns: 0,
    ...party("29AAKCM9936L1ZI", {
      legalName: "Max Hypermarket India Pvt Ltd",
      line1: "Spar Hypermarket, Mantri Square Mall, Malleshwaram",
      city: "Bengaluru",
      pincode: "560003",
      email: "ap.blr@sparindia.com",
    }),
  }),
  ledger("led-tata-projects", "Tata Projects Ltd", "grp-sundry-debtors", {
    txns: 6,
    ...party("36AAECT1275S1ZO", {
      legalName: "Tata Projects Limited",
      line1: "Mithona Towers-1, 1-7-80 to 87, Prenderghast Road",
      city: "Secunderabad",
      state: "Telangana",
      pincode: "500003",
      creditPeriod: "90",
    }),
  }),
  ledger("led-mehta-eng", "Mehta Engineering Works", "grp-sundry-debtors", {
    txns: 11,
    ...party("27AAMFM2914E1ZD", {
      legalName: "Mehta Engineering Works",
      line1: "Gala 7, MIDC Bhosari",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411026",
    }),
  }),
  // Sundry Creditors
  ledger("led-vardhman", "Vardhman Packaging Pvt Ltd", "grp-sundry-creditors", {
    txns: 72,
    openingBalance: "418900.00",
    ...party("29AACCV2705H1ZD", {
      legalName: "Vardhman Packaging Private Limited",
      line1: "Plot 41, KIADB Industrial Area, Phase 2",
      line2: "Harihar Road",
      city: "Davanagere",
      pincode: "577005",
      phone: "9900213344",
      email: "billing@vardhmanpack.in",
      contact: ["Suresh", "Jain"],
      bank: {
        bankName: "Canara Bank",
        accountNumber: "0412201004531",
        ifscCode: "CNRB0000412",
      },
      creditPeriod: "30",
    }),
  }),
  ledger("led-om-sai", "Om Sai Logistics", "grp-sundry-creditors", {
    txns: 64,
    openingBalance: "96450.00",
    ...party("29AADFO2776E1Z4", {
      legalName: "Om Sai Logistics",
      line1: "No. 8, Transport Nagar, NH-48",
      city: "Davanagere",
      pincode: "577003",
      phone: "9741100221",
      contact: ["Mahesh", "Gowda"],
      bank: {
        bankName: "Karnataka Bank",
        accountNumber: "1452000100087201",
        ifscCode: "KARB0000145",
      },
      creditPeriod: "15",
    }),
  }),
  ledger("led-adani-wilmar", "Adani Wilmar Ltd", "grp-sundry-creditors", {
    txns: 29,
    openingBalance: "2864000.00",
    ...party("24AAJCA5301F1Z7", {
      legalName: "Adani Wilmar Limited",
      line1: "Fortune House, Navrangpura",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380009",
      email: "receivables@adaniwilmar.in",
      creditPeriod: "21",
    }),
  }),
  ledger("led-sharma-steel", "Sharma Steel Suppliers", "grp-sundry-creditors", {
    txns: 8,
    ...party("29AAWFS5706H1ZJ", {
      legalName: "Sharma Steel Suppliers",
      line1: "Old Tharagupet, Avenue Road",
      city: "Bengaluru",
      pincode: "560002",
    }),
  }),
  ledger("led-bluedart", "Bluedart Express Ltd", "grp-sundry-creditors", {
    txns: 23,
    ...party("29AADCB8023E1ZV", {
      legalName: "Blue Dart Express Limited",
      line1: "Blue Dart Centre, Airport Road",
      city: "Bengaluru",
      pincode: "560017",
    }),
  }),
  ledger("led-zoho", "Zoho Corporation Pvt Ltd", "grp-sundry-creditors", {
    txns: 12,
    ...party("33AAZCZ4115G1ZZ", {
      legalName: "Zoho Corporation Private Limited",
      line1: "Estancia IT Park, Vallancherry",
      city: "Chengalpattu",
      state: "Tamil Nadu",
      pincode: "603202",
    }),
  }),
  ledger("led-gokul-agro", "Gokul Agro Resources Ltd", "grp-sundry-creditors", {
    sync: "event_processing_failed",
    thirdPartySyncMessage:
      "Ledger 'Gokul Agro Resources Ltd' already exists in Tally under Sundry Debtors.",
    txns: 0,
    ...party("24AAXCG5299G1ZW", {
      legalName: "Gokul Agro Resources Limited",
      line1: "Gokul House, 43 Shreemali Society",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380009",
    }),
  }),
  // Duties & Taxes
  ledger("led-input-cgst", "Input CGST", "grp-duties-taxes", {
    txns: 188,
    ...gstDuty("CGST", "9"),
  }),
  ledger("led-input-sgst", "Input SGST", "grp-duties-taxes", {
    txns: 188,
    ...gstDuty("SGST", "9"),
  }),
  ledger("led-input-igst", "Input IGST", "grp-duties-taxes", {
    txns: 61,
    ...gstDuty("IGST", "18"),
  }),
  ledger("led-output-cgst", "Output CGST", "grp-duties-taxes", {
    txns: 240,
    ...gstDuty("CGST", "2.5"),
  }),
  ledger("led-output-sgst", "Output SGST", "grp-duties-taxes", {
    txns: 240,
    ...gstDuty("SGST", "2.5"),
  }),
  ledger("led-output-igst", "Output IGST", "grp-duties-taxes", {
    txns: 52,
    ...gstDuty("IGST", "5"),
  }),
  ledger("led-tds-payable", "TDS Payable", "grp-duties-taxes", {
    txns: 47,
    isDutyAndTaxes: true,
    typeOfDutyTax: "TDS",
    tdsNatureOfPayments: "194C - Payment to Contractors",
  }),
  ledger("led-tcs-payable", "TCS Payable", "grp-duties-taxes", {
    sync: "not_synced",
    txns: 0,
    isDutyAndTaxes: true,
    typeOfDutyTax: "TCS",
    tcsNatureOfGoods: "206C(1H) - Sale of Goods",
  }),
  // Provisions and Current Liabilities
  ledger("led-prov-audit", "Provision for Audit Fees", "grp-provisions", {
    txns: 2,
    openingBalance: "150000.00",
  }),
  ledger("led-prov-bonus", "Provision for Bonus", "grp-provisions", {
    txns: 1,
    openingBalance: "380000.00",
  }),
  ledger("led-salary-payable", "Salary Payable", "grp-current-liabilities", {
    txns: 12,
    isBillWiseOn: false,
  }),
  // Loans
  ledger("led-hdfc-term-loan", "HDFC Term Loan", "grp-secured-loans", {
    txns: 14,
    openingBalance: "9600000.00",
    taxRegistrationDetails: {
      gstin: null,
      pan: "AATCH4223B",
      registrationType: null,
    },
  }),
  ledger(
    "led-loan-director",
    "Loan from Director - R. Shankar",
    "grp-unsecured-loans",
    {
      sync: "not_synced",
      txns: 0,
      openingBalance: "1500000.00",
    }
  ),
  // Capital
  ledger("led-share-capital", "Share Capital", "grp-capital-account", {
    txns: 1,
    openingBalance: "5000000.00",
  }),
  ledger("led-general-reserve", "General Reserve", "grp-reserves-surplus", {
    txns: 1,
    openingBalance: "2240000.00",
  }),
  // Fixed Assets
  ledger(
    "led-plant-machinery",
    "Plant & Machinery - Refinery",
    "grp-fixed-assets",
    {
      txns: 6,
      openingBalance: "-18450000.00",
    }
  ),
  ledger("led-land-building", "Land & Building - Harihar", "grp-fixed-assets", {
    txns: 2,
    openingBalance: "-12600000.00",
  }),
  ledger("led-vehicles", "Vehicles", "grp-fixed-assets", {
    txns: 4,
    openingBalance: "-2850000.00",
  }),
  ledger("led-computers", "Computers & Peripherals", "grp-fixed-assets", {
    txns: 3,
    openingBalance: "-412000.00",
  }),
  // Investments, deposits, advances
  ledger("led-fd-sbi", "Fixed Deposit - SBI", "grp-investments", {
    txns: 2,
    openingBalance: "-2000000.00",
  }),
  ledger(
    "led-bescom-deposit",
    "Electricity Deposit - BESCOM",
    "grp-deposits-asset",
    {
      txns: 1,
      openingBalance: "-325000.00",
    }
  ),
  ledger("led-godown-deposit", "Rent Deposit - Godown", "grp-deposits-asset", {
    sync: "not_synced",
    txns: 0,
  }),
  ledger("led-staff-advance", "Advance to Staff", "grp-loans-advances", {
    txns: 9,
  }),
  ledger(
    "led-prepaid-insurance",
    "Prepaid Insurance A/c",
    "grp-loans-advances",
    {
      txns: 2,
    }
  ),
  // Stock-in-Hand
  ledger("led-stock-crude", "Stock of Crude Oil", "grp-stock-in-hand", {
    txns: 0,
    openingBalance: "-6420000.00",
  }),
  ledger(
    "led-stock-packing",
    "Stock of Packing Material",
    "grp-stock-in-hand",
    {
      txns: 0,
      openingBalance: "-845000.00",
    }
  ),
  // Purchase Accounts
  ledger(
    "led-purchase-crude",
    "Purchase - Crude Oil",
    "grp-purchase-accounts",
    {
      txns: 86,
      isInventoryAffected: true,
      ...gstRated("5", "1512"),
    }
  ),
  ledger(
    "led-purchase-crude-palm",
    "Purchase - Crude Palm Oil IGST",
    "grp-purchase-accounts",
    {
      txns: 22,
      isInventoryAffected: true,
      ...gstRated("5", "1511"),
    }
  ),
  ledger(
    "led-purchase-packing",
    "Purchase - Packing Material 18%",
    "grp-purchase-accounts",
    {
      txns: 54,
      isInventoryAffected: true,
      ...gstRated("18", "3923"),
    }
  ),
  // Sales Accounts
  ledger("led-sales-oil-5", "Sales - Edible Oil 5%", "grp-sales-accounts", {
    txns: 312,
    isInventoryAffected: true,
    ...gstRated("5", "1512"),
  }),
  ledger(
    "led-sales-oil-igst",
    "Sales - Edible Oil IGST 5%",
    "grp-sales-accounts",
    {
      txns: 74,
      isInventoryAffected: true,
      ...gstRated("5", "1512"),
    }
  ),
  ledger("led-sales-doc", "Sales - De-oiled Cake", "grp-sales-accounts", {
    txns: 38,
    isInventoryAffected: true,
    ...gstRated("5", "2306"),
  }),
  ledger("led-sales-acid-oil", "Sales - Acid Oil", "grp-sales-accounts", {
    sync: "not_synced",
    txns: 0,
    isInventoryAffected: true,
    ...gstRated("18", "1522"),
  }),
  // Direct Expenses / Incomes
  ledger("led-freight-inward", "Freight Inward", "grp-direct-expenses", {
    txns: 49,
    ...gstRated("5", "9965", "Services"),
  }),
  ledger("led-power-fuel", "Power & Fuel - Refinery", "grp-direct-expenses", {
    txns: 12,
  }),
  ledger("led-factory-wages", "Factory Wages", "grp-direct-expenses", {
    txns: 12,
  }),
  ledger(
    "led-bleaching-earth",
    "Bleaching Earth & Chemicals",
    "grp-direct-expenses",
    {
      txns: 17,
      ...gstRated("18", "2508"),
    }
  ),
  ledger("led-job-work", "Job Work Income", "grp-direct-incomes", {
    txns: 5,
    ...gstRated("5", "9988", "Services"),
  }),
  // Indirect Expenses
  ledger("led-bank-charges", "Bank Charges", "grp-indirect-expenses", {
    txns: 66,
  }),
  ledger("led-staff-welfare", "Staff Welfare", "grp-indirect-expenses", {
    txns: 31,
  }),
  ledger("led-telephone", "Telephone & Internet", "grp-indirect-expenses", {
    txns: 24,
    ...gstRated("18", "9984", "Services"),
  }),
  ledger("led-rent", "Rent", "grp-indirect-expenses", {
    txns: 12,
    ...gstRated("18", "9972", "Services"),
  }),
  ledger("led-salary", "Salary", "grp-indirect-expenses", { txns: 12 }),
  ledger("led-electricity", "Electricity Charges", "grp-indirect-expenses", {
    txns: 12,
  }),
  ledger("led-professional", "Professional Fees", "grp-indirect-expenses", {
    txns: 8,
    ...gstRated("18", "9982", "Services"),
  }),
  ledger("led-insurance", "Insurance", "grp-indirect-expenses", { txns: 4 }),
  ledger("led-round-off", "Round Off", "grp-indirect-expenses", {
    txns: 140,
  }),
  // Indirect Incomes
  ledger("led-interest-received", "Interest Received", "grp-indirect-incomes", {
    txns: 4,
  }),
  ledger("led-discount-received", "Discount Received", "grp-indirect-incomes", {
    txns: 7,
  }),
  // Misc. Expenses (ASSET) and Suspense
  ledger("led-preliminary", "Preliminary Expenses", "grp-misc-expenses", {
    txns: 1,
    openingBalance: "-60000.00",
  }),
  ledger("led-suspense", "Suspense A/c", "grp-suspense", { txns: 3 }),
];

/** DEV: GET /api/companies/masters-count?companyUuid=… */
export const MOCK_MASTERS_COUNTS: AccountingMastersCounts = {
  totalGroupCount: MOCK_LEDGER_GROUPS.length,
  totalLedgerCount: MOCK_LEDGERS.length,
};

/* ------------------------------------------------- Sahyadri Precision Works, Pune */

/** A party in Maharashtra — every Sahyadri party but one is local. */
const mhParty = (
  gstin: string,
  details: Omit<Parameters<typeof party>[1], "state"> & { state?: string }
) => party(gstin, { state: "Maharashtra", ...details });

const acmeBank = {
  accountName: "Sahyadri Precision Works",
  bankName: "State Bank of India",
  accountNumber: "39871204561",
  ifscCode: "SBIN0011987",
  branch: "Chakan MIDC",
};

/**
 * Sahyadri Precision Works — a partnership firm machining engineering components in Chakan, Pune —
 * as its Tally chart of accounts. Same 28 groups; a smaller book. Bank and
 * cash ledgers carry the ids Banking uses, and party names match the GST
 * reconciliation's suppliers.
 */
const ACME_LEDGERS: LedgerDetailResponse[] = [
  // Bank and cash
  ledger(
    "acme-sbi-current-3987",
    "SBI Current A/c - 3987",
    "grp-bank-accounts",
    {
      txns: 86,
      openingBalance: "-1264300.00",
      bankDetails: [acmeBank],
    }
  ),
  ledger("acme-cash-in-hand", "Cash", "grp-cash-in-hand", {
    txns: 22,
    openingBalance: "-18400.00",
  }),
  // Sundry Creditors
  ledger("acme-led-tata-steel", "Tata Steel Ltd", "grp-sundry-creditors", {
    txns: 18,
    openingBalance: "642000.00",
    ...mhParty("27AABCT6460U1ZH", {
      legalName: "Tata Steel Limited",
      line1: "Tata Steel Service Centre, MIDC Bhosari",
      city: "Pune",
      pincode: "411026",
      creditPeriod: "45",
    }),
  }),
  ledger("acme-led-bharat-forge", "Bharat Forge Ltd", "grp-sundry-creditors", {
    txns: 14,
    openingBalance: "298450.00",
    ...mhParty("27AAYCB5110H1ZI", {
      legalName: "Bharat Forge Limited",
      line1: "Mundhwa, Pune Cantonment",
      city: "Pune",
      pincode: "411036",
      email: "vendor.ap@bharatforge.com",
      creditPeriod: "30",
    }),
  }),
  ledger("acme-led-skf", "SKF India Ltd", "grp-sundry-creditors", {
    txns: 11,
    ...mhParty("27AAPCS6744Y1ZT", {
      legalName: "SKF India Limited",
      line1: "Chinchwad, Pune",
      city: "Pune",
      pincode: "411033",
      creditPeriod: "30",
    }),
  }),
  ledger(
    "acme-led-pune-precision",
    "Pune Precision Tools",
    "grp-sundry-creditors",
    {
      txns: 9,
      ...mhParty("27AAGFP7702R1ZL", {
        legalName: "Pune Precision Tools",
        line1: "Shed 41, Sector 10, PCNTDA Bhosari",
        city: "Pune",
        pincode: "411026",
        phone: "9822041177",
        contact: ["Rahul", "Kulkarni"],
      }),
    }
  ),
  ledger(
    "acme-led-chakan-heat",
    "Chakan Heat Treaters",
    "grp-sundry-creditors",
    {
      txns: 7,
      ...mhParty("27AARFC6862D1Z5", {
        legalName: "Chakan Heat Treaters",
        line1: "Gat 112, Mahalunge, Chakan",
        city: "Pune",
        pincode: "410501",
        creditPeriod: "15",
      }),
    }
  ),
  ledger(
    "acme-led-sai-logistics",
    "Sai Logistics Pune",
    "grp-sundry-creditors",
    {
      sync: "not_synced",
      txns: 0,
      ...mhParty("27AADFS8234K1ZU", {
        legalName: "Sai Logistics",
        line1: "Talawade Transport Nagar",
        city: "Pune",
        pincode: "411062",
      }),
    }
  ),
  // Sundry Debtors
  ledger("acme-led-mahindra", "Mahindra & Mahindra Ltd", "grp-sundry-debtors", {
    txns: 24,
    openingBalance: "-984200.00",
    ...mhParty("27AAECM8509W1ZF", {
      legalName: "Mahindra & Mahindra Limited",
      line1: "Plot A-1, MIDC Chakan Phase II",
      city: "Pune",
      pincode: "410501",
      email: "supplier.payments@mahindra.com",
      creditPeriod: "60",
    }),
  }),
  ledger("acme-led-thermax", "Thermax Ltd", "grp-sundry-debtors", {
    txns: 12,
    openingBalance: "-236000.00",
    ...mhParty("27AAZCT5950Z1ZI", {
      legalName: "Thermax Limited",
      line1: "D-13, MIDC Industrial Area, Chinchwad",
      city: "Pune",
      pincode: "411019",
      creditPeriod: "45",
    }),
  }),
  ledger("acme-led-kirloskar", "Kirloskar Brothers Ltd", "grp-sundry-debtors", {
    txns: 9,
    openingBalance: "-310000.00",
    ...mhParty("27AAYCK1155M1ZT", {
      legalName: "Kirloskar Brothers Limited",
      line1: "Udyog Bhavan, Tilak Road",
      city: "Pune",
      pincode: "411002",
      creditPeriod: "45",
    }),
  }),
  ledger("acme-led-cummins", "Cummins India Ltd", "grp-sundry-debtors", {
    sync: "in_progress",
    txns: 6,
    ...mhParty("27AAVCC7067D1Z8", {
      legalName: "Cummins India Limited",
      line1: "Tower A, Balewadi",
      city: "Pune",
      pincode: "411045",
      creditPeriod: "30",
    }),
  }),
  // Duties & Taxes
  ledger("acme-led-input-cgst", "Input CGST", "grp-duties-taxes", {
    txns: 64,
    ...gstDuty("CGST", "9"),
  }),
  ledger("acme-led-input-sgst", "Input SGST", "grp-duties-taxes", {
    txns: 64,
    ...gstDuty("SGST", "9"),
  }),
  ledger("acme-led-input-igst", "Input IGST", "grp-duties-taxes", {
    txns: 6,
    ...gstDuty("IGST", "18"),
  }),
  ledger("acme-led-output-cgst", "Output CGST", "grp-duties-taxes", {
    txns: 41,
    ...gstDuty("CGST", "9"),
  }),
  ledger("acme-led-output-sgst", "Output SGST", "grp-duties-taxes", {
    txns: 41,
    ...gstDuty("SGST", "9"),
  }),
  ledger("acme-led-tds-payable", "TDS Payable", "grp-duties-taxes", {
    txns: 12,
  }),
  // Purchase and Sales
  ledger(
    "acme-led-purchase-steel",
    "Purchase - Raw Material (Steel)",
    "grp-purchase-accounts",
    { txns: 38, ...gstRated("18", "7214") }
  ),
  ledger(
    "acme-led-sales-components",
    "Sales - Machined Components",
    "grp-sales-accounts",
    { txns: 46, ...gstRated("18", "8483") }
  ),
  // Direct and indirect expenses
  ledger("acme-led-job-work", "Job Work Charges", "grp-direct-expenses", {
    txns: 15,
    ...gstRated("12", "9988", "Services"),
  }),
  ledger("acme-led-power", "Power & Fuel", "grp-direct-expenses", {
    txns: 12,
  }),
  ledger("acme-led-salary", "Salary", "grp-indirect-expenses", { txns: 12 }),
  ledger("acme-led-rent", "Rent", "grp-indirect-expenses", {
    txns: 12,
    ...gstRated("18", "9972", "Services"),
  }),
  ledger("acme-led-bank-charges", "Bank Charges", "grp-indirect-expenses", {
    txns: 18,
  }),
  ledger("acme-led-freight", "Freight Outward", "grp-indirect-expenses", {
    txns: 9,
  }),
  // Capital and fixed assets
  ledger("acme-led-capital", "Partners' Capital A/c", "grp-capital-account", {
    txns: 2,
    openingBalance: "4500000.00",
  }),
  ledger("acme-led-cnc", "CNC Machines", "grp-fixed-assets", {
    txns: 3,
    openingBalance: "-3820000.00",
  }),
];

/* ------------------------------------------------------- per company */

/**
 * One company's chart of accounts, keyed by the Inbox's company id.
 *
 * Every company has Tally's 28 predefined groups — Tally creates them with
 * the company. Shakunthalam's ledgers are the ones above, unchanged; Sahyadri
 * has its own; a company created in the prototype has groups and no
 * ledgers yet.
 *
 * DEV: GET /api/accounting-masters/ledger-groups and
 * GET /api/accounts/coa-list-v2, scoped to the session's company.
 */
export const seedFor = (
  companyId: string
): { groups: LedgerGroupListItem[]; ledgers: LedgerDetailResponse[] } => ({
  groups: MOCK_LEDGER_GROUPS,
  ledgers:
    companyId === "shakun"
      ? MOCK_LEDGERS
      : companyId === "acme"
        ? ACME_LEDGERS
        : [],
});
