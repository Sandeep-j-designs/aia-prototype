import type { PolicyRule } from "@/types/pages/inbox/ai-features";
export const FIRM_POLICY: Omit<PolicyRule, "company">[] = [
  {
    id: "equipment",
    text: "Equipment purchases over ₹10,000 go to Plant & Machinery, not expense.",
    condition: { description: "equipment|pump|machinery", minimum: 10000 },
    action: { ledger: "Plant & Machinery" },
    active: true,
  },
  {
    id: "lab",
    text: "Lab testing charges go to Quality Control Expenses, not Professional Fees.",
    condition: { description: "lab|testing" },
    action: { ledger: "Quality Control Expenses" },
    active: true,
  },
  {
    id: "diesel",
    text: "Generator diesel goes to Power & Fuel.",
    condition: { description: "generator.*diesel|diesel.*generator" },
    action: { ledger: "Power & Fuel" },
    active: true,
  },
];
export const MOCK_CLIENT_POLICY: PolicyRule[] = [
  ...FIRM_POLICY.map((x) => ({
    ...x,
    id: `shakun-${x.id}`,
    company: "shakun",
  })),
  {
    id: "nd-ingredients",
    company: "nandhini",
    text: "Rice, pulses, vegetables and dairy supplies go to Purchase – Ingredients.",
    condition: { description: "rice|pulses|vegetables|milk|curd" },
    action: { ledger: "Purchase – Ingredients" },
    active: true,
  },
  {
    id: "nd-gas",
    company: "nandhini",
    text: "Commercial LPG refills go to Gas & Fuel.",
    condition: { description: "LPG|cylinder" },
    action: { ledger: "Gas & Fuel" },
    active: true,
  },
];
