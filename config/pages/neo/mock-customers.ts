/**
 * The customer master Neo reads when it raises a sales invoice: who they are,
 * where they are registered, and so which GST heads apply.
 *
 * Names match `CUSTOMERS` in config/pages/inbox/ar-masters, which is what the
 * sales invoice sheet offers — Neo must never name a customer the sheet
 * cannot resolve.
 *
 * DEV: GET /api/customers?include=gstin,state,contact
 */
export type NeoCustomer = {
  name: string;
  gstin: string;
  state: string;
  /** The first two digits of the GSTIN. */
  stateCode: string;
  whatsapp?: string;
  email?: string;
};

export const MOCK_NEO_CUSTOMERS: NeoCustomer[] = [
  {
    name: "Theta Hotels Pvt Ltd",
    gstin: "29AAECT4410K1Z3",
    state: "Karnataka",
    stateCode: "29",
    whatsapp: "+91 98450 22110",
  },
  {
    name: "Anne Corp",
    gstin: "27AAHCA7781M1Z9",
    state: "Maharashtra",
    stateCode: "27",
    email: "accounts@annecorp.in",
  },
  {
    name: "Beta Retail Co",
    gstin: "29AAFFB2256Q1ZK",
    state: "Karnataka",
    stateCode: "29",
    whatsapp: "+91 99005 41276",
  },
  {
    name: "Gamma Trading LLP",
    gstin: "33AAKFG9934R1Z1",
    state: "Tamil Nadu",
    stateCode: "33",
    email: "finance@gammatrading.in",
  },
  {
    name: "Sigma Ltd",
    gstin: "29AADCS5512P1Z6",
    state: "Karnataka",
    stateCode: "29",
    email: "ap@sigmaltd.in",
  },
  {
    name: "Tau Foods",
    gstin: "27AABCT8820L1Z4",
    state: "Maharashtra",
    stateCode: "27",
    whatsapp: "+91 98201 77340",
  },
  {
    name: "Phi Logistics",
    gstin: "36AAGCP3310N1Z2",
    state: "Telangana",
    stateCode: "36",
    email: "billing@philogistics.in",
  },
];

/**
 * Where each of the company's GST registrations is, keyed by the branch name
 * the Inbox's `form.gst` holds.
 *
 * DEV: GET /api/organisations/current/gst-registrations
 */
export const MOCK_NEO_REGISTRATIONS: Record<
  string,
  { state: string; stateCode: string }
> = {
  "Karnataka HQ": { state: "Karnataka", stateCode: "29" },
  "Pune HQ": { state: "Maharashtra", stateCode: "27" },
  "Maharashtra Branch": { state: "Maharashtra", stateCode: "27" },
};
