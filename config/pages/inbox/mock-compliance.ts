import type { ComplianceIssue } from "@/types/pages/inbox/ai-features";
export const MOCK_COMPLIANCE: ComplianceIssue[] = [
  {
    id: "cancelled",
    company: "shakun",
    documentId: "CHECK-CANCELLED",
    vendor: "Sri Balaji Packaging",
    check: "Vendor GSTIN cancelled",
    evidence:
      "Bill dated 20 Sep 2026; registration cancelled from 1 Aug 2026. Input credit requires review.",
    impact: 18000,
    fix: "Draft GST-to-expense journal",
    kind: "journal",
    debit: "Packing Materials",
    status: "open",
  },
  {
    id: "blocked",
    company: "shakun",
    documentId: "CHECK-CATERING",
    vendor: "Annapurna Caterers",
    check: "Blocked credit · section 17(5)",
    evidence:
      "Annual-day catering ₹50,000 + ₹9,000 GST. Staff dinner is not an eligible statutory exception in this demo.",
    impact: 9000,
    fix: "Add GST to Staff Welfare",
    kind: "journal",
    debit: "Staff Welfare",
    status: "open",
  },
  {
    id: "rate",
    company: "shakun",
    documentId: "CHECK-OIL",
    vendor: "Adani Wilmar Ltd",
    check: "HSN and rate mismatch",
    evidence:
      "Refined soybean oil, HSN 1507: charged 18%; expected 5%. Difference: ₹2,00,000 × 13% = ₹26,000.",
    impact: 26000,
    fix: "Draft corrected-invoice request",
    kind: "email",
    status: "open",
  },
  {
    id: "tds",
    company: "shakun",
    documentId: "CHECK-TDS",
    vendor: "Harihar Transport Co",
    check: "TDS threshold crossed",
    evidence:
      "FY payments ₹1,20,000 exceed ₹1,00,000. Demo vendor is a firm with PAN; no transporter exemption declaration. 194C at 2%: ₹2,400.",
    impact: 2400,
    fix: "Draft note to Priya",
    kind: "note",
    status: "open",
  },
];
