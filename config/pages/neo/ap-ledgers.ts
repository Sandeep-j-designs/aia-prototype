/**
 * The AP book's expense ledgers, as the bill form (public/ap/index.html,
 * MASTERS.expenseLedgers) holds them — so a ledger Neo puts on a batch draft
 * is one the form recognises, by the same id and name.
 *
 * Hand copy: change both together. DEV: GET /api/masters/ledgers?type=expense
 * serves both; delete this file.
 */
export const AP_EXPENSE_LEDGERS: { id: string; name: string; sac: string }[] = [
  { id: "led-install", name: "Installation & Commissioning", sac: "998739" },
  { id: "led-freight", name: "Freight & Cartage Inward", sac: "996511" },
  { id: "led-courier", name: "Courier & Postage", sac: "996812" },
  { id: "led-housekeep", name: "Housekeeping & Facility", sac: "" },
  { id: "led-security", name: "Security Services", sac: "998525" },
  { id: "led-advert", name: "Advertising & Promotion", sac: "998361" },
  { id: "led-amc", name: "Annual Maintenance Contract", sac: "998713" },
  { id: "led-software", name: "Software Subscription", sac: "998434" },
  { id: "led-prof", name: "Professional / Consultancy Fees", sac: "998311" },
  { id: "led-legal", name: "Legal & Compliance Fees", sac: "998213" },
  { id: "led-audit", name: "Audit Fees", sac: "998221" },
  { id: "led-training", name: "Training & Development", sac: "999293" },
  { id: "led-rent", name: "Rent — Plant & Machinery", sac: "997314" },
  { id: "led-rentbld", name: "Rent — Office Premises", sac: "997212" },
  { id: "led-commission", name: "Commission / Brokerage", sac: "998599" },
  { id: "led-packing", name: "Packing & Forwarding", sac: "998540" },
  { id: "led-travel", name: "Travel & Conveyance", sac: "996411" },
  { id: "led-insurance", name: "Insurance Premium", sac: "997134" },
  { id: "led-printing", name: "Printing Charges", sac: "998912" },
  { id: "led-logistics", name: "Logistics Expense", sac: "996511" },
];
