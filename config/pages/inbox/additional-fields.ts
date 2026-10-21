/**
 * The sales invoice's optional field groups — Consignee, Export, Dispatch,
 * Order, E-Way Bill and E-Invoice — as the React side of the prototype reads
 * them: the Map Fields dropdown, the Preview columns and the Approved record.
 *
 * A mirror, not the source. The AR sheet (public/ar/index.html, FIELD_GROUPS)
 * is still where these fields are entered, and its ids are kept here as `id`
 * so a value mapped from a spreadsheet lands in the sheet's own field. The
 * labels follow AP_AR_Additional_Fields.xlsx, "Field Reference (3)".
 *
 * DEV: production has none of these keys yet. The backend's mapping schema
 * (GET .../import-batches/:id/mapping → mappingSchema.fieldGroups) needs them
 * added, filtered by the company's field configuration, and the AR voucher
 * needs somewhere to store them. Change a label here and change it in the
 * sheet too.
 */

export type AdditionalFieldKey =
  | "consignee_name"
  | "consignee_address"
  | "consignee_state"
  | "consignee_country"
  | "consignee_pincode"
  | "consignee_gstin"
  | "place_of_receipt"
  | "vessel_flight_no"
  | "port_of_loading"
  | "port_of_discharge"
  | "country_to"
  | "shipping_bill_no"
  | "shipping_bill_date"
  | "port_code"
  | "dispatch_note_no"
  | "dispatch_note_date"
  | "dispatch_doc_no"
  | "dispatched_through"
  | "destination"
  | "carrier_name"
  | "bill_of_lading_no"
  | "bill_of_lading_date"
  | "order_no"
  | "order_date"
  | "payment_terms"
  | "other_references"
  | "delivery_terms"
  | "eway_bill_no"
  | "eway_bill_date"
  | "eway_document_type"
  | "eway_dispatch_from"
  | "eway_ship_to"
  | "eway_distance"
  | "transporter_name"
  | "transporter_id"
  | "transport_mode"
  | "transport_doc_no"
  | "transport_doc_date"
  | "vehicle_no"
  | "vehicle_type"
  | "einvoice_ack_no"
  | "einvoice_ack_date"
  | "einvoice_irn"
  | "bill_to_place"
  | "ship_to_place";

export type AdditionalGroupId =
  "consignee" | "import" | "receipt" | "order" | "eway" | "einvoice";

/** A fixed list the sheet offers as a picker. Values are the sheet's ids. */
export type ChoiceList = { id: string; name: string; aliases?: string[] }[];

export type AdditionalField = {
  key: AdditionalFieldKey;
  /** The AR sheet's field id — where the value lands on the invoice. */
  id: string;
  label: string;
  type: "text" | "date" | "choice";
  /** For "choice": the sheet's list, so a spreadsheet's words become its ids. */
  list?: ChoiceList;
  /** Mandatory only once this field holds a value. */
  req?: AdditionalFieldKey;
  /** A shape Tally or the portal would refuse otherwise. */
  fmt?: { test: (value: string) => boolean; message: string };
  /** Issued by the IRP — never typed, so never imported either. */
  systemOnly?: boolean;
  /** The sheet's own note on the field, shown in Field Configuration. */
  note?: string;
};

export type AdditionalGroup = {
  id: AdditionalGroupId;
  label: string;
  /** On for a company that has never configured it. */
  defaultOn: boolean;
  fields: AdditionalField[];
};

/* ------------------------------------------------------------------ lists */

// The sheet's STATES, name for name; the GST code is accepted too.
// prettier-ignore
const STATE_ROWS: [string, string, string][] = [
  ["AN", "Andaman & Nicobar", "35"], ["AP", "Andhra Pradesh", "37"], ["AR", "Arunachal Pradesh", "12"],
  ["AS", "Assam", "18"], ["BR", "Bihar", "10"], ["CH", "Chandigarh", "04"], ["CG", "Chhattisgarh", "22"],
  ["DL", "Delhi", "07"], ["GA", "Goa", "30"], ["GJ", "Gujarat", "24"], ["HR", "Haryana", "06"],
  ["HP", "Himachal Pradesh", "02"], ["JK", "Jammu & Kashmir", "01"], ["JH", "Jharkhand", "20"],
  ["KA", "Karnataka", "29"], ["KL", "Kerala", "32"], ["LA", "Ladakh", "38"], ["MP", "Madhya Pradesh", "23"],
  ["MH", "Maharashtra", "27"], ["MN", "Manipur", "14"], ["ML", "Meghalaya", "17"], ["MZ", "Mizoram", "15"],
  ["NL", "Nagaland", "13"], ["OD", "Odisha", "21"], ["PY", "Puducherry", "34"], ["PB", "Punjab", "03"],
  ["RJ", "Rajasthan", "08"], ["SK", "Sikkim", "11"], ["TN", "Tamil Nadu", "33"], ["TG", "Telangana", "36"],
  ["TR", "Tripura", "16"], ["UP", "Uttar Pradesh", "09"], ["UK", "Uttarakhand", "05"], ["WB", "West Bengal", "19"],
  ["OT", "Other Territory / Overseas", "97"],
];
const STATES: ChoiceList = STATE_ROWS.map(([id, name, gst]) => ({
  id,
  name,
  aliases: [id, gst],
}));

// prettier-ignore
const COUNTRIES: ChoiceList = [
  { id: "IN", name: "India" }, { id: "AE", name: "United Arab Emirates", aliases: ["UAE"] },
  { id: "AU", name: "Australia" }, { id: "CN", name: "China" }, { id: "DE", name: "Germany" },
  { id: "HK", name: "Hong Kong" }, { id: "JP", name: "Japan" }, { id: "KR", name: "South Korea" },
  { id: "MY", name: "Malaysia" }, { id: "NL", name: "Netherlands" }, { id: "SG", name: "Singapore" },
  { id: "GB", name: "United Kingdom", aliases: ["UK"] }, { id: "US", name: "United States", aliases: ["USA"] },
  { id: "VN", name: "Vietnam" },
];

// prettier-ignore
const PORTS: ChoiceList = [
  { id: "INNSA1", name: "INNSA1 — Nhava Sheva (Sea)" }, { id: "INMUN1", name: "INMUN1 — Mundra (Sea)" },
  { id: "INMAA1", name: "INMAA1 — Chennai (Sea)" }, { id: "INCOK1", name: "INCOK1 — Cochin (Sea)" },
  { id: "INBOM4", name: "INBOM4 — Mumbai (Air)" }, { id: "INDEL4", name: "INDEL4 — Delhi (Air)" },
  { id: "INMAA4", name: "INMAA4 — Chennai (Air)" }, { id: "INBLR4", name: "INBLR4 — Bengaluru (Air)" },
  { id: "INHYD4", name: "INHYD4 — Hyderabad (Air)" },
];

// prettier-ignore
const EWAY_DOC_TYPES: ChoiceList = [
  { id: "na", name: "Not Applicable" }, { id: "boe", name: "Bill of Entry" },
  { id: "bos", name: "Bill of Supply" }, { id: "dc", name: "Delivery Challan" },
  { id: "oth", name: "Others" }, { id: "inv", name: "Tax Invoice", aliases: ["Invoice"] },
];

// prettier-ignore
const TRANSPORT_MODES: ChoiceList = [
  { id: "na", name: "Not Applicable" }, { id: "1", name: "1 – Road", aliases: ["Road"] },
  { id: "2", name: "2 – Rail", aliases: ["Rail"] }, { id: "3", name: "3 – Air", aliases: ["Air"] },
  { id: "4", name: "4 – Ship", aliases: ["Ship"] },
];

// prettier-ignore
const VEHICLE_TYPES: ChoiceList = [
  { id: "na", name: "Not Applicable" },
  { id: "O", name: "O – Over Dimensional Cargo", aliases: ["Over Dimensional Cargo", "ODC"] },
  { id: "R", name: "R – Regular", aliases: ["Regular"] },
];

/* ---------------------------------------------------------------- formats */

const FMT = {
  pin: {
    test: (v: string) => /^[1-9][0-9]{5}$/.test(v),
    message: "Enter a 6-digit pincode.",
  },
  gstin: {
    test: (v: string) => /^[0-9A-Z]{15}$/i.test(v),
    message: "GSTIN/UIN is 15 letters and digits.",
  },
  ewb: {
    test: (v: string) => /^[0-9]{12}$/.test(v),
    message: "E-Way Bill No is 12 digits — no letters or symbols.",
  },
  km: {
    test: (v: string) => /^[0-9]{1,4}$/.test(v) && +v > 0 && +v <= 4000,
    message: "Enter a distance from 1 to 4,000 km.",
  },
  transporter: {
    test: (v: string) => /^[0-9]{2}[0-9A-Z]{13}$/i.test(v),
    message:
      "Transporter ID is 15 characters — 2 digits, then 13 letters or digits.",
  },
};

/* ----------------------------------------------------------------- groups */

const ewayReq = { req: "eway_bill_no" as const };

// One field per line reads as the spreadsheet does; prettier would fold each
// into five.
// prettier-ignore
export const AR_ADDITIONAL_GROUPS: AdditionalGroup[] = [
  {
    id: "consignee",
    label: "Consignee Details",
    defaultOn: true,
    fields: [
      // The sheet picks a customer here; a spreadsheet names one.
      { key: "consignee_name", id: "consigneeName", label: "Consignee (Ship To)", type: "text", note: "Defaults to the customer on this invoice. Any customer can be chosen instead." },
      { key: "consignee_address", id: "consigneeAddress", label: "Address (Consignee)", type: "text" },
      { key: "consignee_state", id: "consigneeState", label: "State (Consignee)", type: "choice", list: STATES },
      { key: "consignee_country", id: "consigneeCountry", label: "Country (Consignee)", type: "choice", list: COUNTRIES },
      { key: "consignee_pincode", id: "consigneePincode", label: "Pincode (Consignee)", type: "text", fmt: FMT.pin },
      { key: "consignee_gstin", id: "consigneeGstin", label: "Consignee (GSTIN/UIN)", type: "text", fmt: FMT.gstin },
    ],
  },
  {
    id: "import",
    label: "Export Details",
    defaultOn: false,
    fields: [
      { key: "place_of_receipt", id: "placeOfReceipt", label: "Place of Receipt by Shipper", type: "text" },
      { key: "vessel_flight_no", id: "vesselFlightNo", label: "Vessel/Flight/Motor-Vehicle No", type: "text" },
      { key: "port_of_loading", id: "portOfLoading", label: "Port of Loading", type: "text" },
      { key: "port_of_discharge", id: "portOfDischarge", label: "Port of Discharge", type: "text" },
      { key: "country_to", id: "countryTo", label: "Country To", type: "choice", list: COUNTRIES },
      { key: "shipping_bill_no", id: "boeNo", label: "Shipping Bill No", type: "text" },
      { key: "shipping_bill_date", id: "boeDate", label: "Shipping Bill Date", type: "date", req: "shipping_bill_no" },
      { key: "port_code", id: "portCode", label: "Port Code", type: "choice", list: PORTS, req: "shipping_bill_no", note: "Uses ICEGATE 6-character port codes." },
    ],
  },
  {
    id: "receipt",
    label: "Dispatch Details",
    defaultOn: false,
    fields: [
      { key: "dispatch_note_no", id: "receiptNoteNo", label: "Dispatch Note No(s)", type: "text" },
      { key: "dispatch_note_date", id: "receiptNoteDate", label: "Note Date", type: "date", req: "dispatch_note_no" },
      { key: "dispatch_doc_no", id: "grnNo", label: "Dispatch Doc No", type: "text" },
      { key: "dispatched_through", id: "dispatchedThrough", label: "Dispatched Through", type: "text" },
      { key: "destination", id: "dispatchDest", label: "Destination", type: "text" },
      { key: "carrier_name", id: "carrier", label: "Carrier Name/Agent", type: "text" },
      { key: "bill_of_lading_no", id: "ladingNo", label: "Bill of Lading / LR-RR No", type: "text" },
      { key: "bill_of_lading_date", id: "ladingDate", label: "Bill of Lading Date", type: "date", req: "bill_of_lading_no" },
    ],
  },
  {
    id: "order",
    label: "Order Details",
    defaultOn: false,
    fields: [
      { key: "order_no", id: "orderNo", label: "Order No(s)", type: "text" },
      { key: "order_date", id: "orderDate", label: "Order Date", type: "date", req: "order_no" },
      { key: "payment_terms", id: "paymentTerms", label: "Mode/Terms of Payment", type: "text" },
      { key: "other_references", id: "otherRefs", label: "Other References", type: "text" },
      { key: "delivery_terms", id: "deliveryTerms", label: "Terms of Delivery", type: "text" },
    ],
  },
  {
    id: "eway",
    label: "E-Way Bill Details",
    defaultOn: false,
    fields: [
      { key: "eway_bill_no", id: "ewayNo", label: "E-Way Bill No", type: "text", fmt: FMT.ewb },
      { key: "eway_bill_date", id: "ewayDate", label: "E-Way Bill Date", type: "date", ...ewayReq },
      { key: "eway_document_type", id: "ewayDocType", label: "Document Type", type: "choice", list: EWAY_DOC_TYPES, ...ewayReq },
      { key: "eway_dispatch_from", id: "ewayDispatchFrom", label: "Dispatch From", type: "text" },
      { key: "eway_ship_to", id: "ewayShipTo", label: "Ship To", type: "text" },
      { key: "eway_distance", id: "ewayDistance", label: "Pin to Pin Distance as per Portal", type: "text", fmt: FMT.km, ...ewayReq, note: "Up to 4,000 km." },
      { key: "transporter_name", id: "transporterName", label: "Transporter Name", type: "text" },
      { key: "transporter_id", id: "transporterId", label: "Transporter ID", type: "text", fmt: FMT.transporter, ...ewayReq },
      { key: "transport_mode", id: "transportMode", label: "Mode", type: "choice", list: TRANSPORT_MODES, ...ewayReq },
      { key: "transport_doc_no", id: "transportDocNo", label: "Doc/Lading/RR/Air Way No", type: "text" },
      { key: "transport_doc_date", id: "transportDocDate", label: "Doc/Lading/RR/Air Way Date", type: "date" },
      { key: "vehicle_no", id: "vehicleNo", label: "Vehicle Number", type: "text", ...ewayReq },
      { key: "vehicle_type", id: "vehicleType", label: "Vehicle Type", type: "choice", list: VEHICLE_TYPES, ...ewayReq },
    ],
  },
  {
    id: "einvoice",
    label: "E-Invoice Details",
    defaultOn: false,
    fields: [
      { key: "einvoice_ack_no", id: "ackNo", label: "Ack No", type: "text", systemOnly: true },
      { key: "einvoice_ack_date", id: "ackDate", label: "Ack Date", type: "date", systemOnly: true },
      { key: "einvoice_irn", id: "irn", label: "IRN", type: "text", systemOnly: true },
      { key: "bill_to_place", id: "billToPlace", label: "Bill to Place", type: "text" },
      { key: "ship_to_place", id: "shipToPlace", label: "Ship to Place", type: "text" },
    ],
  },
];

const ALL_FIELDS = AR_ADDITIONAL_GROUPS.flatMap((g) =>
  g.fields.map((f) => ({ ...f, group: g }))
);
export const additionalField = (key: string) =>
  ALL_FIELDS.find((f) => f.key === key);
export const additionalFieldById = (id: string) =>
  ALL_FIELDS.find((f) => f.id === id);
export const isAdditionalKey = (key: string): key is AdditionalFieldKey =>
  !!additionalField(key);
export const ADDITIONAL_LABELS = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, f.label])
) as Record<AdditionalFieldKey, string>;

/* ---------------------------------------------------------- configuration */

/**
 * The company's answer to Field Configuration, in the sheet's own shape —
 * group id → on, and field id → on — so the two can hand it back and forth
 * without translating.
 */
export type FieldConfig = Record<
  string,
  { on: boolean; fields: Record<string, boolean> }
>;

export const fieldConfigDefaults = (): FieldConfig =>
  Object.fromEntries(
    AR_ADDITIONAL_GROUPS.map((g) => [
      g.id,
      {
        on: g.defaultOn,
        fields: Object.fromEntries(g.fields.map((f) => [f.id, true])),
      },
    ])
  );

/** The groups, and the fields within them, the configuration has switched on. */
export const liveGroups = (config: FieldConfig) =>
  AR_ADDITIONAL_GROUPS.filter((g) => config[g.id]?.on)
    .map((g) => ({
      ...g,
      fields: g.fields.filter((f) => config[g.id]?.fields[f.id] !== false),
    }))
    .filter((g) => g.fields.length);

export const isLive = (config: FieldConfig, key: string) => {
  const f = additionalField(key);
  return (
    !!f && !!config[f.group.id]?.on && config[f.group.id].fields[f.id] !== false
  );
};

/* ------------------------------------------------------------------ values */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** A spreadsheet's word for a list entry, as the sheet's id — or null. */
export const resolveChoice = (field: AdditionalField, value: string) => {
  const v = norm(value);
  return (
    field.list?.find(
      (c) =>
        norm(c.name) === v ||
        norm(c.id) === v ||
        c.aliases?.some((a) => norm(a) === v)
    )?.id ?? null
  );
};

/** A stored value the way a person reads it: the list entry's name. */
export const displayValue = (field: AdditionalField, value: string) =>
  field.type === "choice"
    ? (field.list?.find((c) => c.id === value)?.name ?? value)
    : value;
