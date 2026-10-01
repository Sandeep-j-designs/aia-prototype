import { format } from "date-fns";
import {
  GSTR2B_MATCH_TYPE,
  Gstr2BStatusEnums,
  GSTR2B_PORTAL_ENTITY,
  GST_FILE_CATEGORIES,
  ITC_ACTION_VALUES,
  PrFileStatusEnums,
  REMARK_KEY_BY_COLUMN,
  type Gstr2bMatchTypeValueType,
  type ITC_ACTION_VALUES_VALUE_TYPE,
  type RemarkKey,
} from "@/config/pages/inbox/gst";
import type {
  GstReconGstin,
  gstr2BDataStatusType,
  InvoiceViewData,
  InvoiceViewRow,
  MappingConfig,
  PrFileStatus,
  SavedAuthDataResponse,
} from "@/types/pages/inbox/gst";

/**
 * GST reconciliation mocks, shaped as the API returns them (camelCase).
 *
 * One company — Shakunthalam Oil & Refineries, an edible-oil refiner in
 * Karnataka — and its suppliers. August 2026 is already reconciled: 2B
 * fetched from the portal, one Purchase Register extracted, 120 invoice pairs
 * across all six match types. September 2026 is empty, so the whole flow can
 * be walked: fetch 2B, upload and map a PR, run, read the results.
 *
 * Invoices are generated from a seeded random source, so a run produces the
 * same rows every time and a reload starts from the same August.
 */

/** Who a company is to the GST module — read per company, never global. */
export type GstCompanyProfile = {
  name: string;
  gstin: string;
  pan: string;
  /** The registration's state code. A supplier in another state bills IGST. */
  stateCode: string;
};

export const GST_COMPANY: GstCompanyProfile = {
  name: "Shakunthalam Oil & Refineries",
  gstin: "29AAWCS8421F1ZR",
  pan: "AAWCS8421F",
  /** Karnataka. */
  stateCode: "29",
};

// DEV: GET /api/gst-reconciliation/gstin?companyId=…
export const MOCK_GST_GSTINS: GstReconGstin[] = [
  {
    gstrGstDetailsUuid: "gstd-5c1e9a20",
    companyUuid: "cmp-shakunthalam",
    ucUuid: "uc-7a41",
    pan: GST_COMPANY.pan,
    gstin: GST_COMPANY.gstin,
    thirdPartyProduct: "gst_recon",
    source: "manual",
    isActive: true,
  },
];

// DEV: GET /api/gst-reconciliation/get-saved-auth-details?gstin=…&companyUuid=…&ucUuid=…
export const MOCK_SAVED_AUTH: SavedAuthDataResponse = {
  gstin: GST_COMPANY.gstin,
  username: "shakunthalam_gst",
  email: "accounts@shakunthalam.in",
  isSaved: true,
};

/* ------------------------------------------------------------- suppliers */

type Supplier = {
  name: string;
  /** How the purchase clerk keyed it into Tally, when that differs. */
  bookedAs?: string;
  gstin: string;
  /** GST rate, percent. */
  rate: number;
  /** Taxable value range for one invoice, rupees. */
  min: number;
  max: number;
  /** Builds an invoice number from a running serial. */
  invoiceNo: (serial: number) => string;
  /** A goods transport agency: tax is paid by the recipient under RCM. */
  gta?: boolean;
  /** Blocked credit — the accountant marks these Ineligible. */
  blocked?: boolean;
  /** Weight in the draw; the big oil suppliers bill most often. */
  weight: number;
};

const SUPPLIERS: Supplier[] = [
  {
    name: "Adani Wilmar Ltd",
    gstin: "24AAJCA5301F1Z7",
    rate: 5,
    min: 380000,
    max: 1850000,
    invoiceNo: (n) => `AWL/GJ/26-27/${4100 + n}`,
    weight: 4,
  },
  {
    name: "Ruchi Soya Industries Ltd",
    bookedAs: "Ruchi Soya Industries",
    gstin: "27AADCP3334E1ZP",
    rate: 5,
    min: 290000,
    max: 1420000,
    invoiceNo: (n) => `RSIL${String(70210 + n)}`,
    weight: 3,
  },
  {
    name: "Gujarat Ambuja Exports Ltd",
    gstin: "24AADCG9119G1ZP",
    rate: 5,
    min: 240000,
    max: 980000,
    invoiceNo: (n) => `GAEL/EO/${2260 + n}`,
    weight: 3,
  },
  {
    name: "Allana Edible Oils Pvt Ltd",
    gstin: "27AAWCA5411V1ZO",
    rate: 5,
    min: 160000,
    max: 640000,
    invoiceNo: (n) => `AEO-26-${880 + n}`,
    weight: 2,
  },
  {
    name: "Vardhman Packaging Pvt Ltd",
    bookedAs: "Vardhman Packaging",
    gstin: "29AACCV2705H1ZD",
    rate: 18,
    min: 42000,
    max: 260000,
    invoiceNo: (n) => `VPPL/26-27/${1180 + n}`,
    weight: 4,
  },
  {
    name: "Karnataka Tin Containers",
    gstin: "29AAQFK7141X1ZZ",
    rate: 18,
    min: 55000,
    max: 310000,
    invoiceNo: (n) => `KTC/${560 + n}/26-27`,
    weight: 3,
  },
  {
    name: "Mysore Bottling Solutions",
    gstin: "29AALCM6213K1Z3",
    rate: 18,
    min: 38000,
    max: 190000,
    invoiceNo: (n) => `MBS-${3300 + n}`,
    weight: 2,
  },
  {
    name: "Chennai Polymers & Caps",
    gstin: "33AARCC7837D1ZH",
    rate: 18,
    min: 24000,
    max: 120000,
    invoiceNo: (n) => `CPC/TN/${910 + n}`,
    weight: 2,
  },
  {
    name: "Sri Venkateswara Chemicals",
    gstin: "36AACFS9304F1ZA",
    rate: 18,
    min: 46000,
    max: 220000,
    invoiceNo: (n) => `SVC/${1450 + n}`,
    weight: 2,
  },
  {
    name: "Hyderabad Hexane Traders",
    gstin: "36AAVFH1486M1ZK",
    rate: 18,
    min: 68000,
    max: 340000,
    invoiceNo: (n) => `HHT-${620 + n}`,
    weight: 1,
  },
  {
    name: "Deccan Labels & Prints",
    gstin: "29AAMFD2300G1ZQ",
    rate: 18,
    min: 12000,
    max: 74000,
    invoiceNo: (n) => `DLP/${2040 + n}`,
    weight: 2,
  },
  {
    name: "Om Sai Logistics",
    gstin: "29AADFO2776E1Z4",
    rate: 5,
    min: 18000,
    max: 96000,
    invoiceNo: (n) => `OSL/LR/${7710 + n}`,
    gta: true,
    weight: 3,
  },
  {
    name: "VRL Logistics Ltd",
    gstin: "29AAQCV3702H1Z0",
    rate: 5,
    min: 22000,
    max: 118000,
    invoiceNo: (n) => `VRL${String(512300 + n)}`,
    gta: true,
    weight: 2,
  },
  {
    name: "BlueDart Express Ltd",
    gstin: "27AADCB8023E1ZZ",
    rate: 18,
    min: 3200,
    max: 18500,
    invoiceNo: (n) => `BDE/MH/${88010 + n}`,
    weight: 2,
  },
  {
    name: "Bengaluru Industrial Gases",
    gstin: "29AAGFB6515R1ZU",
    rate: 18,
    min: 16000,
    max: 64000,
    invoiceNo: (n) => `BIG-${430 + n}`,
    weight: 1,
  },
  {
    name: "Kaveri Hospitality Services",
    gstin: "29AAHFK5986A1Z2",
    rate: 18,
    min: 8000,
    max: 36000,
    invoiceNo: (n) => `KHS/${190 + n}`,
    blocked: true,
    weight: 1,
  },
];

/* ------------------------------------------------------- seeded random */

/** mulberry32: small, fast, and the same sequence for the same seed. */
const seeded = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ----------------------------------------------------------- generation */

export type MatchMix = Record<Gstr2bMatchTypeValueType, number>;

/** August: 120 pairs, as the plan sets out. */
export const AUG_2026_MIX: MatchMix = {
  [GSTR2B_MATCH_TYPE.FULLY_MATCHED]: 60,
  [GSTR2B_MATCH_TYPE.AI_MATCHED]: 18,
  [GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]: 10,
  [GSTR2B_MATCH_TYPE.MISSING_IN_2B]: 12,
  [GSTR2B_MATCH_TYPE.MISSING_IN_PR]: 14,
  [GSTR2B_MATCH_TYPE.MANUALLY_MATCHED]: 6,
};

/** Any month reconciled in the prototype: about 60 pairs, none linked yet. */
export const RUN_MIX: MatchMix = {
  [GSTR2B_MATCH_TYPE.FULLY_MATCHED]: 32,
  [GSTR2B_MATCH_TYPE.AI_MATCHED]: 10,
  [GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]: 6,
  [GSTR2B_MATCH_TYPE.MISSING_IN_2B]: 6,
  [GSTR2B_MATCH_TYPE.MISSING_IN_PR]: 6,
  [GSTR2B_MATCH_TYPE.MANUALLY_MATCHED]: 0,
};

const withTax = (
  base: Omit<
    InvoiceViewData,
    "cgst" | "sgst" | "igst" | "cess" | "totalGst" | "invoiceAmount"
  >,
  rate: number,
  interstate: boolean
): InvoiceViewData => {
  const tax = round2((base.taxableAmount * rate) / 100);
  const half = round2(tax / 2);
  const cgst = interstate ? 0 : half;
  const sgst = interstate ? 0 : round2(tax - half);
  const igst = interstate ? tax : 0;
  return {
    ...base,
    cgst,
    sgst,
    igst,
    cess: 0,
    totalGst: round2(cgst + sgst + igst),
    invoiceAmount: round2(base.taxableAmount + cgst + sgst + igst),
  };
};

/** The PR clerk's habit: slashes keyed as dashes. */
const reformat = (invoiceNo: string) =>
  invoiceNo.includes("/")
    ? invoiceNo.replace(/\//g, "-")
    : invoiceNo.replace(/^([A-Z]+)/, "$1/");

const shiftDate = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return format(d, "yyyy-MM-dd");
};

const ITC_FOR_MATCHED: (ITC_ACTION_VALUES_VALUE_TYPE | null)[] = [
  ITC_ACTION_VALUES.CLAIM,
  ITC_ACTION_VALUES.CLAIM,
  ITC_ACTION_VALUES.CLAIM,
  ITC_ACTION_VALUES.CLAIM,
  ITC_ACTION_VALUES.CLAIM,
  ITC_ACTION_VALUES.CLAIM,
  ITC_ACTION_VALUES.PENDING,
  null,
];

/**
 * Builds one month's reconciled invoice pairs.
 *
 * Each pair starts as one supplier invoice; the match type then decides what
 * the PR side looks like — identical, keyed slightly differently, keyed
 * wrongly, or not there at all.
 */
export const generateInvoicePairs = (
  year: number,
  month: number,
  mix: MatchMix,
  seed: number,
  suppliers: Supplier[] = SUPPLIERS,
  company: GstCompanyProfile = GST_COMPANY
): InvoiceViewRow[] => {
  const rnd = seeded(seed);
  const pick = <T>(list: T[]) => list[Math.floor(rnd() * list.length)];
  const between = (min: number, max: number) => min + rnd() * (max - min);
  const pool = suppliers.flatMap((s) => Array(s.weight).fill(s) as Supplier[]);
  const days = new Date(year, month + 1, 0).getDate();
  const key = `${year}${String(month + 1).padStart(2, "0")}`;
  const serials = new Map<string, number>();
  const rows: InvoiceViewRow[] = [];

  const types = (Object.keys(mix) as Gstr2bMatchTypeValueType[]).flatMap(
    (type) => Array(mix[type]).fill(type) as Gstr2bMatchTypeValueType[]
  );
  // Interleave the types, so the default order is not six solid blocks.
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  types.forEach((matchType, index) => {
    const supplier = pick(pool);
    const serial = (serials.get(supplier.gstin) ?? Math.floor(rnd() * 40)) + 1;
    serials.set(supplier.gstin, serial);
    const interstate = !supplier.gstin.startsWith(company.stateCode);
    const date = format(
      new Date(year, month, 1 + Math.floor(rnd() * days)),
      "yyyy-MM-dd"
    );
    // A few lines are credit notes, and a few 2B lines are amendments.
    const creditNote = !supplier.gta && rnd() < 0.06;
    const amended = !creditNote && rnd() < 0.04;
    const taxable = round2(between(supplier.min, supplier.max));
    const base = withTax(
      {
        documentType: creditNote ? "Credit Note" : "Regular",
        gstin: supplier.gstin,
        invoiceNo: supplier.invoiceNo(serial),
        vendorName: supplier.name,
        invoiceDate: date,
        taxableAmount: taxable,
        isReverseChargeApplied: !!supplier.gta,
        remarks: "",
      },
      supplier.rate,
      interstate
    );

    const gstr2b = {
      ...base,
      sheetType: creditNote ? "cdnr" : amended ? "b2ba" : "b2b",
      gstr2bLineUuid: `2b-${key}-${String(index + 1).padStart(3, "0")}`,
    };
    let pr = {
      ...base,
      vendorName:
        supplier.bookedAs && rnd() < 0.5 ? supplier.bookedAs : supplier.name,
      // The PR has no RCM flag of its own; production reads it off the 2B line.
      isReverseChargeApplied: false,
      prLineUuid: `pr-${key}-${String(index + 1).padStart(3, "0")}`,
    };
    let remarks: RemarkKey[] = [];

    const retax = (nextTaxable: number, igstInstead = interstate) => {
      const next = withTax(
        { ...pr, taxableAmount: round2(nextTaxable) },
        supplier.rate,
        igstInstead
      );
      pr = { ...pr, ...next };
    };

    switch (matchType) {
      case GSTR2B_MATCH_TYPE.AI_MATCHED: {
        const kind = Math.floor(rnd() * 3);
        if (kind === 0) {
          pr.invoiceNo = reformat(base.invoiceNo);
          remarks = [REMARK_KEY_BY_COLUMN.invoiceNo];
        } else if (kind === 1) {
          pr.invoiceDate = shiftDate(date, pick([-2, -1, 1, 2, 3]));
          remarks = [REMARK_KEY_BY_COLUMN.invoiceDate];
        } else {
          // Rounded off in Tally: rupees, not the tax.
          pr.taxableAmount = round2(taxable + pick([-1, 1, 2, -2, 5]));
          pr.invoiceAmount = round2(
            pr.taxableAmount + pr.cgst + pr.sgst + pr.igst
          );
          remarks = [
            REMARK_KEY_BY_COLUMN.taxableAmount,
            REMARK_KEY_BY_COLUMN.invoiceAmount,
          ];
        }
        break;
      }
      case GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH: {
        const kind = Math.floor(rnd() * 3);
        if (kind === 0) {
          retax(taxable + pick([-1, 1]) * Math.round(between(50, 500)));
          remarks = [
            REMARK_KEY_BY_COLUMN.taxableAmount,
            REMARK_KEY_BY_COLUMN.invoiceAmount,
            ...(interstate
              ? [REMARK_KEY_BY_COLUMN.igst]
              : [REMARK_KEY_BY_COLUMN.cgst, REMARK_KEY_BY_COLUMN.sgst]),
            REMARK_KEY_BY_COLUMN.totalGst,
          ];
        } else if (kind === 1) {
          // Booked with the wrong tax structure: IGST for an intra-state
          // supplier, or CGST + SGST for an inter-state one.
          retax(taxable, !interstate);
          remarks = [
            REMARK_KEY_BY_COLUMN.taxStructure,
            REMARK_KEY_BY_COLUMN.cgst,
            REMARK_KEY_BY_COLUMN.sgst,
            REMARK_KEY_BY_COLUMN.igst,
          ];
        } else {
          // The neighbouring invoice's number, keyed against this one.
          pr.invoiceNo = supplier.invoiceNo(serial + 1);
          pr.invoiceDate = shiftDate(date, pick([-6, -4, 5, 8]));
          remarks = [
            REMARK_KEY_BY_COLUMN.invoiceNo,
            REMARK_KEY_BY_COLUMN.invoiceDate,
          ];
        }
        break;
      }
      case GSTR2B_MATCH_TYPE.MANUALLY_MATCHED: {
        pr.invoiceNo = `${supplier.invoiceNo(serial).replace(/\D+/g, "")}`;
        retax(taxable - Math.round(between(10, 120)));
        remarks = [
          REMARK_KEY_BY_COLUMN.invoiceNo,
          REMARK_KEY_BY_COLUMN.taxableAmount,
          REMARK_KEY_BY_COLUMN.invoiceAmount,
          REMARK_KEY_BY_COLUMN.totalGst,
        ];
        break;
      }
      default:
        break;
    }

    const missing2b = matchType === GSTR2B_MATCH_TYPE.MISSING_IN_2B;
    const missingPr = matchType === GSTR2B_MATCH_TYPE.MISSING_IN_PR;
    const matched = !missing2b && !missingPr;
    const itcStatus: ITC_ACTION_VALUES_VALUE_TYPE | null = missing2b
      ? null
      : supplier.gta
        ? ITC_ACTION_VALUES.REVERSE
        : supplier.blocked
          ? ITC_ACTION_VALUES.INELIGIBLE
          : missingPr
            ? null
            : matchType === GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH
              ? pick([ITC_ACTION_VALUES.PENDING, null])
              : pick(ITC_FOR_MATCHED);

    rows.push({
      matchType,
      remarks,
      gstr2b: missing2b ? null : gstr2b,
      pr: missingPr ? null : pr,
      reconRunUuids: matched
        ? [`rr-${key}-${String(index + 1).padStart(3, "0")}`]
        : [],
      itcStatus,
    });
  });

  // The PR clerk's note on a handful of lines, so "View Remark" has something.
  rows
    .filter((r) => r.pr && r.remarks?.length)
    .slice(0, 3)
    .forEach((r, i) => {
      r.pr!.remarks = [
        "Rate difference confirmed with vendor; CN awaited.",
        "Invoice keyed from scanned copy.",
        "Vendor to amend in next GSTR-1.",
      ][i];
    });

  return rows;
};

/* --------------------------------------------------------------- months */

export const monthKey = (date: Date) => format(date, "yyyy-MM");

/** August 2026's seed — fixed, so the screenshots never shift. */
const AUG_SEED = 202608;
/** The seed for any other month the prototype reconciles. */
export const runSeedFor = (year: number, month: number) =>
  year * 100 + month + 1 + 7;

// DEV: GET /api/gst-reconciliation/gstr-2b-invoice-view?companyId=…&customerGstin=…&periodFrom=…&periodTo=…
export const MOCK_AUG_2026_INVOICES: InvoiceViewRow[] = generateInvoicePairs(
  2026,
  7,
  AUG_2026_MIX,
  AUG_SEED
);

// DEV: GET /api/gst-reconciliation/combined-file-status?customerGstin=…&periodFrom=…&periodTo=…
export const MOCK_AUG_2026_TWO_B: gstr2BDataStatusType[] = [
  {
    creationDate: "2026-09-12T10:42:00+05:30",
    requestUuid: "req-2b-202608",
    fileStatusUuid: "fs-2b-202608",
    periodFrom: "2026-08-01",
    periodTo: "2026-08-31",
    gstin: GST_COMPANY.gstin,
    entityType: GSTR2B_PORTAL_ENTITY,
    status: Gstr2BStatusEnums.EXTRACTION_SUCCESSFUL,
    errorMessage: null,
    lastUpdatedBy: "accounts@shakunthalam.in",
    lastUpdateDate: "2026-09-12T10:43:10+05:30",
    gstr2bLineCount: MOCK_AUG_2026_INVOICES.filter((r) => r.gstr2b).length,
  },
];

export const MOCK_AUG_2026_PR: PrFileStatus[] = [
  {
    fileStatusUuid: "fs-pr-202608",
    thirdPartyProduct: "gst_recon",
    periodFrom: "2026-08-01",
    periodTo: "2026-08-31",
    fileUuid: "file-pr-202608",
    fileCategory: GST_FILE_CATEGORIES.PR_FILE,
    fileName: "Purchase_Register_Aug2026.xlsx",
    gstin: GST_COMPANY.gstin,
    status: PrFileStatusEnums.EXTRACTION_SUCCESSFUL,
    companyUuid: "cmp-shakunthalam",
    isActive: true,
    creationDate: "2026-09-12T10:51:00+05:30",
    lastUpdateDate: "2026-09-12T10:53:40+05:30",
    errorPayload: null,
    lastUpdatedBy: "accounts@shakunthalam.in",
  },
];

/**
 * The columns the backend reads off an uploaded Purchase Register, with the
 * mapping it suggests — a Tally purchase-register export.
 */
// DEV: POST /api/gst-reconciliation/column-mappings { fileUuid, companyId, headerOffset? }
export const MOCK_PR_COLUMN_MAPPING: MappingConfig = {
  headerOffset: 0,
  sheetName: "Purchase Register",
  columns: [
    "Date",
    "Particulars",
    "Voucher Type",
    "Voucher No.",
    "Supplier Invoice No.",
    "Supplier Invoice Date",
    "GSTIN/UIN",
    "Place of Supply",
    "Rate",
    "Value",
    "Central Tax Amount",
    "State Tax Amount",
    "Integrated Tax Amount",
    "Cess Amount",
    "Gross Total",
    "Narration",
  ],
  mappings: {
    gstin: "GSTIN/UIN",
    vendorName: "Particulars",
    invoiceNo: "Supplier Invoice No.",
    invoiceDate: "Supplier Invoice Date",
    voucherDate: "Date",
    invoiceAmount: ["Gross Total"],
    documentType: "Regular",
    placeOfSupply: "Place of Supply",
    rate: ["Rate"],
    taxableAmount: ["Value"],
    cess: ["Cess Amount"],
    sgst: ["State Tax Amount"],
    cgst: ["Central Tax Amount"],
    igst: ["Integrated Tax Amount"],
    invoiceDateFormat: "%d/%m/%Y",
    voucherDateFormat: "%d/%m/%Y",
    remarks: ["Narration"],
  },
};

/* ------------------------------------------------- Sahyadri Precision Works, Pune */

/**
 * Sahyadri Precision Works — a partnership firm machining engineering components in Chakan, Pune — and
 * its suppliers: steel, forgings, bearings, tooling, mostly in Maharashtra,
 * so most of its credit is CGST + SGST.
 */
const ACME_COMPANY: GstCompanyProfile = {
  name: "Sahyadri Precision Works",
  gstin: "27AABFS5582A1ZC",
  pan: "AABFS5582A",
  /** Maharashtra. */
  stateCode: "27",
};

const ACME_SUPPLIERS: Supplier[] = [
  {
    name: "Tata Steel Ltd",
    gstin: "27AABCT6460U1ZH",
    rate: 18,
    min: 240000,
    max: 980000,
    invoiceNo: (n) => `TSL/MH/26-27/${5120 + n}`,
    weight: 4,
  },
  {
    name: "Bharat Forge Ltd",
    bookedAs: "Bharat Forge",
    gstin: "27AAYCB5110H1ZI",
    rate: 18,
    min: 180000,
    max: 760000,
    invoiceNo: (n) => `BFL${String(30410 + n)}`,
    weight: 3,
  },
  {
    name: "SKF India Ltd",
    gstin: "27AAPCS6744Y1ZT",
    rate: 18,
    min: 42000,
    max: 210000,
    invoiceNo: (n) => `SKF/PN/${7720 + n}`,
    weight: 3,
  },
  {
    name: "Pune Precision Tools",
    gstin: "27AAGFP7702R1ZL",
    rate: 18,
    min: 18000,
    max: 96000,
    invoiceNo: (n) => `PPT-${1180 + n}`,
    weight: 2,
  },
  {
    name: "Chakan Heat Treaters",
    gstin: "27AARFC6862D1Z5",
    rate: 18,
    min: 22000,
    max: 88000,
    invoiceNo: (n) => `CHT/${640 + n}/26-27`,
    weight: 2,
  },
  {
    name: "Bhosari Industrial Gases",
    gstin: "27AARFB6812E1ZE",
    rate: 18,
    min: 9000,
    max: 42000,
    invoiceNo: (n) => `BIG-${2210 + n}`,
    weight: 1,
  },
  {
    name: "Jindal Stainless Ltd",
    gstin: "06AADCJ7163M1Z7",
    rate: 18,
    min: 160000,
    max: 540000,
    invoiceNo: (n) => `JSL/HR/${88120 + n}`,
    weight: 1,
  },
  {
    name: "Sai Logistics Pune",
    gstin: "27AADFS8234K1ZU",
    rate: 5,
    min: 8000,
    max: 46000,
    invoiceNo: (n) => `SLP/LR/${3310 + n}`,
    gta: true,
    weight: 2,
  },
];

/** August: about 40 pairs, a smaller book than Shakunthalam's. */
const ACME_AUG_2026_MIX: MatchMix = {
  [GSTR2B_MATCH_TYPE.FULLY_MATCHED]: 20,
  [GSTR2B_MATCH_TYPE.AI_MATCHED]: 7,
  [GSTR2B_MATCH_TYPE.AI_PROBABLE_MATCH]: 4,
  [GSTR2B_MATCH_TYPE.MISSING_IN_2B]: 4,
  [GSTR2B_MATCH_TYPE.MISSING_IN_PR]: 4,
  [GSTR2B_MATCH_TYPE.MANUALLY_MATCHED]: 1,
};

/* ------------------------------------------------------- per company */

/** One company's GST module, as its first loads return it. */
export type GstSeed = {
  profile: GstCompanyProfile;
  gstins: GstReconGstin[];
  savedAuth: SavedAuthDataResponse;
  twoB: gstr2BDataStatusType[];
  pr: PrFileStatus[];
  /** Reconciled rows by month (yyyy-MM). */
  invoices: Record<string, InvoiceViewRow[]>;
};

const augustFor = (
  companyUuid: string,
  profile: GstCompanyProfile,
  email: string,
  invoices: InvoiceViewRow[]
) => ({
  twoB: [
    {
      ...MOCK_AUG_2026_TWO_B[0],
      requestUuid: `req-2b-202608-${companyUuid}`,
      fileStatusUuid: `fs-2b-202608-${companyUuid}`,
      gstin: profile.gstin,
      lastUpdatedBy: email,
      gstr2bLineCount: invoices.filter((r) => r.gstr2b).length,
    },
  ],
  pr: [
    {
      ...MOCK_AUG_2026_PR[0],
      fileStatusUuid: `fs-pr-202608-${companyUuid}`,
      fileUuid: `file-pr-202608-${companyUuid}`,
      gstin: profile.gstin,
      companyUuid,
      lastUpdatedBy: email,
    },
  ],
});

/**
 * One company's GST data, keyed by the Inbox's company id.
 *
 * Shakunthalam's is the data above, unchanged. Sahyadri has its own GSTIN,
 * suppliers and a reconciled August. Any other company — one created in the
 * prototype — has no GSTIN registered and nothing fetched or uploaded, so
 * every period opens on Start Reconciliation.
 *
 * DEV: GET /api/gst-reconciliation/gstin?companyId=… and friends, each
 * scoped by the session's company.
 */
export const seedFor = (companyId: string): GstSeed => {
  if (companyId === "shakun")
    return {
      profile: GST_COMPANY,
      gstins: MOCK_GST_GSTINS,
      savedAuth: MOCK_SAVED_AUTH,
      twoB: MOCK_AUG_2026_TWO_B,
      pr: MOCK_AUG_2026_PR,
      invoices: { "2026-08": MOCK_AUG_2026_INVOICES },
    };
  if (companyId === "acme") {
    const invoices = generateInvoicePairs(
      2026,
      7,
      ACME_AUG_2026_MIX,
      AUG_SEED + 27,
      ACME_SUPPLIERS,
      ACME_COMPANY
    );
    return {
      profile: ACME_COMPANY,
      gstins: [
        {
          gstrGstDetailsUuid: "gstd-acme-27a1",
          companyUuid: "cmp-acme-industries",
          ucUuid: "uc-acme",
          pan: ACME_COMPANY.pan,
          gstin: ACME_COMPANY.gstin,
          thirdPartyProduct: "gst_recon",
          source: "manual",
          isActive: true,
        },
      ],
      savedAuth: {
        gstin: ACME_COMPANY.gstin,
        username: "sahyadri_gst",
        email: "accounts@acmeindustries.in",
        isSaved: true,
      },
      ...augustFor(
        "cmp-acme-industries",
        ACME_COMPANY,
        "accounts@acmeindustries.in",
        invoices
      ),
      invoices: { "2026-08": invoices },
    };
  }
  return {
    profile: { name: "", gstin: "", pan: "", stateCode: "" },
    gstins: [],
    savedAuth: { gstin: "", username: "", email: "", isSaved: false },
    twoB: [],
    pr: [],
    invoices: {},
  };
};

/** The rows a run of one month produces for one company — the same each time. */
export const runPairsFor = (companyId: string, year: number, month: number) =>
  companyId === "acme"
    ? generateInvoicePairs(
        year,
        month,
        RUN_MIX,
        runSeedFor(year, month) + 27,
        ACME_SUPPLIERS,
        ACME_COMPANY
      )
    : generateInvoicePairs(year, month, RUN_MIX, runSeedFor(year, month));
