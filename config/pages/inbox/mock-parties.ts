/**
 * Who the inbox's documents are from and to — as the documents print them.
 *
 * Keyed by the name the inbox carries on the item (`vendor` on a bill,
 * `customer` on a sales invoice), so the facsimile and the AP sheet can print a
 * party's own GSTIN, PAN and address instead of one shared placeholder.
 *
 * Real company names; the identifiers are not theirs. Every GSTIN is
 * well-formed and passes the GSTN check digit, carries the state code of the
 * address beside it, and embeds a PAN whose fourth letter is the entity type
 * (C company, F firm, G government) and whose fifth is the name's initial — but
 * none belongs to the business named. CINs follow the MCA format the same way.
 *
 * DEV: the supplier block comes from extraction (GSTIN, address) and the
 * vendor master; the company block from GET /api/organisations/current.
 */

export type PrintedParty = {
  /** As registered, when it differs from the name the inbox uses. */
  legalName?: string;
  gstin: string;
  address: string;
  cin?: string;
};

export const MOCK_PARTIES: Record<string, PrintedParty> = {
  "Dell India Pvt Ltd": {
    gstin: "29AAZCD6511X1Z7",
    address: "Divyashree Greens, Koramangala Inner Ring Road, Bengaluru 560071",
    cin: "U72900KA2000PTC929742",
  },
  "Ashapura Perfoclay Ltd": {
    gstin: "24AAGCA6469H1ZJ",
    address: "Survey No. 201, Village Lakhpar, Mundra, Kutch, Gujarat 370405",
    cin: "U14100GJ1996PLC486753",
  },
  "Bangalore Electricity Supply Company Ltd": {
    gstin: "29AATGB3268E1Z2",
    address: "K.R. Circle, Bengaluru 560001",
    cin: "U40109KA2002SGC538438",
  },
  "Sri Basaveshwara Engineering Works": {
    gstin: "29AAZFS4268Y1ZA",
    address: "Shed 14, KIADB Industrial Area, Harihar 577601",
  },
  "Bharti Airtel Ltd": {
    gstin: "29AAJCB1145Q1Z7",
    address: "Divyashree Towers, Bannerghatta Road, Bengaluru 560029",
    cin: "L64202KA1995PLC615382",
  },
  "Vardhman Packaging Pvt Ltd": {
    gstin: "29AACCV2705H1ZD",
    address:
      "Plot 41, KIADB Industrial Area, Phase 2, Harihar Road, Davanagere 577005",
    cin: "U22203KA2009PTC377191",
  },
  "Zoho Corporation Pvt Ltd": {
    gstin: "33AAZCZ4115G1ZZ",
    address: "Estancia IT Park, Vallancherry, Chengalpattu, Tamil Nadu 603202",
    cin: "U72200TN2010PTC431618",
  },
  "Tally Solutions Pvt Ltd": {
    gstin: "29AARCT4812L1ZN",
    address: "AMR Tech Park II, Hosur Main Road, Bengaluru 560068",
    cin: "U72200KA1991PTC447993",
  },
  "Blue Dart Express Ltd": {
    gstin: "29AADCB8023E1ZV",
    address: "Blue Dart Centre, Airport Road, Bengaluru 560017",
    cin: "L64120KA1991PLC673651",
  },
  "Entertainment Network (India) Ltd": {
    gstin: "29AARCE5665H1ZY",
    address: "Prestige Obelisk, Kasturba Road, Bengaluru 560001",
    cin: "L92140KA1999PLC923219",
  },
  "BVG India Ltd": {
    gstin: "29AADCB4835R1Z0",
    address: "No. 18, 2nd Floor, Lalbagh Road, Bengaluru 560027",
    cin: "U74140KA2002PLC904147",
  },
  "Sri Durga Filling Station": {
    gstin: "29AATFS4860U1ZQ",
    address: "NH-48, Harihar Bypass, Harihar 577601",
  },
  "Bengaluru Industrial Gases": {
    gstin: "29AAGFB6515R1ZU",
    address: "No. 63, 3rd Phase, Peenya Industrial Area, Bengaluru 560058",
  },
  "Om Sai Logistics": {
    gstin: "29AADFO2776E1Z4",
    address: "No. 8, Transport Nagar, NH-48, Davanagere 577003",
  },
  "Metro Cash & Carry India Pvt Ltd": {
    gstin: "29AAJCM3476H1Z1",
    address: "No. 26/3, Industrial Suburb, Yeshwanthpur, Bengaluru 560022",
    cin: "U51909KA2003PTC872076",
  },
  "Adani Wilmar Ltd": {
    gstin: "24AAJCA5301F1Z7",
    address: "Fortune House, Navrangpura, Ahmedabad, Gujarat 380009",
    cin: "L15146GJ1999PLC196295",
  },
  "Blue Star Ltd": {
    gstin: "29AAGCB6522N1Z9",
    address: "Kasturi Buildings, Mohan T. Advani Chowk, Bengaluru 560001",
    cin: "L28920KA1949PLC914055",
  },
  "Hyderabad Hexane Traders": {
    gstin: "36AAVFH1486M1ZK",
    address: "Plot 9, IDA Jeedimetla Phase II, Hyderabad, Telangana 500055",
  },
  "Sri Manjunatha Hardware & Tools": {
    gstin: "29AAFFS1923J1Z0",
    address: "Gandhi Circle, P.B. Road, Harihar 577601",
  },
  "Krishna Computers & Peripherals": {
    gstin: "29AAJFK2056E1ZD",
    address: "No. 412, Chamarajpet, P.J. Extension, Davanagere 577002",
  },
  "Annapurna Caterers": {
    gstin: "29AAWFA1813A1ZN",
    address: "Ward 11, Kumarapatnam Road, Harihar 577601",
  },
  "Tata Steel Ltd": {
    gstin: "27AABCT6460U1ZH",
    address: "Tata Steel Service Centre, MIDC Bhosari, Pune 411026",
  },
  // customers
  "Hotel Mayura Group": {
    legalName: "Hotel Mayura Hospitality Pvt Ltd",
    gstin: "29AAZCH6289B1ZT",
    address: "Opp. Bus Stand, Hadadi Road, Davanagere 577002",
    cin: "U55101KA2011PTC267458",
  },
  "Vasudev Adigas Fast Food Pvt Ltd": {
    gstin: "29AAFCV8267R1Z4",
    address: "No. 1, 4th Block, Jayanagar, Bengaluru 560011",
    cin: "U55204KA2004PTC583440",
  },
  "Reliance Retail Ltd": {
    gstin: "27AATCR8983C1ZM",
    address:
      "Plot No. C-1, TTC Industrial Area, Navi Mumbai, Maharashtra 400701",
    cin: "U52190MH1999PLC241964",
  },
  "Annapoorna Wholesale": {
    legalName: "Annapoorna Wholesale Distributors",
    gstin: "29AAFFA8764Y1Z3",
    address: "Plot 22, Yeshwanthpur Industrial Suburb, Bengaluru 560022",
  },
  "Sri Lakshmi Traders": {
    gstin: "29AAYFS1040D1Z2",
    address: "14, APMC Yard, Hadadi Road, Davanagere 577006",
  },
};

export const partyNamed = (name?: string | null): PrintedParty | undefined =>
  name ? MOCK_PARTIES[name] : undefined;

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * State code + PAN → a full GSTIN with the GSTN check digit, for a party the
 * directory does not hold. Entity number 1, the usual for a first registration.
 */
export const gstinFor = (stateCode: string, pan: string) => {
  const body = `${stateCode}${pan}1Z`;
  const sum = [...body].reduce((total, char, index) => {
    const value = GSTIN_CHARS.indexOf(char) * (index % 2 ? 2 : 1);
    return total + Math.floor(value / 36) + (value % 36);
  }, 0);
  return body + GSTIN_CHARS[(36 - (sum % 36)) % 36];
};

/** The tenant's own registration, keyed by the prototype's company id. */
export const MOCK_OWN_REGISTRATION: Record<
  string,
  { legalName: string; gstin: string; state: string; address: string }
> = {
  shakun: {
    legalName: "Shakunthalam Oil and Refineries Pvt Ltd",
    gstin: "29AAWCS8421F1ZR",
    state: "Karnataka",
    address: "Plot 27-A, KIADB Industrial Area, Davanagere 577005",
  },
  acme: {
    legalName: "Sahyadri Precision Works",
    gstin: "27AABFS5582A1ZC",
    state: "Maharashtra",
    address: "Gat No. 312, Chakan MIDC Phase II, Khed, Pune 410501",
  },
};
