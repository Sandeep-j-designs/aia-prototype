import type {
  InventoryOptions,
  StockItemDetail,
  ThirdPartySyncStatus,
} from "@/types/pages/inbox/inventory";

/**
 * Inventory mock data for Shakunthalam Oil & Refineries, an edible-oil
 * refiner in Karnataka. Shaped as the API returns it (camelCase).
 *
 * DEV: GET /api/inventory-masters/items?companyId=… → MOCK_STOCK_ITEMS (list)
 * DEV: GET /api/inventory-masters/items/:itemUuid → one MOCK_STOCK_ITEMS entry
 * DEV: GET /api/inventory-masters/items/options?companyId=… → MOCK_INVENTORY_OPTIONS
 * DEV: GET /api/accounting-masters/hsn-sac?cursor=…&search=… → MOCK_INVENTORY_OPTIONS.hsnSac
 */

export const GODOWN = {
  main: "gdn-0001-main-location",
  factory: "gdn-0002-factory-tumakuru",
  peenya: "gdn-0003-warehouse-peenya",
  mysuru: "gdn-0004-depot-mysuru",
} as const;

const GROUP = {
  primary: "primary",
  finished: "grp-0001-finished-goods",
  raw: "grp-0002-raw-material",
  packing: "grp-0003-packing-material",
  byProducts: "grp-0004-by-products",
  stores: "grp-0005-stores-spares",
} as const;

const CATEGORY = {
  na: "not_applicable",
  edible: "cat-0001-edible-oils",
  crude: "cat-0002-crude-oils",
  packing: "cat-0003-packing",
  byProducts: "cat-0004-by-products",
  consumables: "cat-0005-consumables",
} as const;

const UNIT = {
  na: "not_applicable",
  nos: "uom-0001-nos",
  tin: "uom-0002-tin",
  ltr: "uom-0003-ltr",
  kgs: "uom-0004-kgs",
  mt: "uom-0005-mt",
  pcs: "uom-0006-pcs",
  box: "uom-0007-box",
} as const;

export const MOCK_INVENTORY_OPTIONS: InventoryOptions = {
  groups: [
    { label: "Primary", value: GROUP.primary },
    { label: "Finished Goods", value: GROUP.finished },
    { label: "Raw Material", value: GROUP.raw },
    { label: "Packing Material", value: GROUP.packing },
    { label: "By-Products", value: GROUP.byProducts },
    { label: "Stores & Spares", value: GROUP.stores },
  ],
  categories: [
    { label: "Not Applicable", value: CATEGORY.na },
    { label: "Edible Oils", value: CATEGORY.edible },
    { label: "Crude Oils", value: CATEGORY.crude },
    { label: "Packing", value: CATEGORY.packing },
    { label: "By-Products", value: CATEGORY.byProducts },
    { label: "Consumables", value: CATEGORY.consumables },
  ],
  units: [
    { label: "Not Applicable", value: UNIT.na },
    { label: "Nos", value: UNIT.nos },
    { label: "Tin", value: UNIT.tin },
    { label: "Ltr", value: UNIT.ltr },
    { label: "Kgs", value: UNIT.kgs },
    { label: "MT", value: UNIT.mt },
    { label: "Pcs", value: UNIT.pcs },
    { label: "Box", value: UNIT.box },
  ],
  hsnSac: [
    {
      value: "1508",
      label: "1508 - Groundnut oil and its fractions",
    },
    {
      value: "150810",
      label: "150810 - Crude groundnut oil",
    },
    {
      value: "150890",
      label: "150890 - Groundnut oil, other than crude (refined)",
    },
    {
      value: "1511",
      label: "1511 - Palm oil and its fractions",
    },
    {
      value: "151110",
      label: "151110 - Crude palm oil",
    },
    {
      value: "151190",
      label: "151190 - Palm oil and palmolein, other than crude (refined)",
    },
    {
      value: "1512",
      label:
        "1512 - Sunflower-seed, safflower or cotton-seed oil and their fractions",
    },
    {
      value: "151211",
      label: "151211 - Crude sunflower-seed or safflower oil",
    },
    {
      value: "151219",
      label:
        "151219 - Sunflower-seed or safflower oil, other than crude (refined)",
    },
    {
      value: "1515",
      label:
        "1515 - Other fixed vegetable fats and oils (including rice bran oil)",
    },
    {
      value: "151590",
      label: "151590 - Other fixed vegetable fats and oils: rice bran oil",
    },
    {
      value: "2306",
      label:
        "2306 - Oil-cake and other solid residues from vegetable fats and oils",
    },
    {
      value: "230630",
      label: "230630 - Oil-cake and residues of sunflower seeds",
    },
    {
      value: "230690",
      label: "230690 - Oil-cake and residues, other (rice bran extraction)",
    },
    {
      value: "290110",
      label: "290110 - Saturated acyclic hydrocarbons (hexane)",
    },
    {
      value: "380290",
      label: "380290 - Activated natural mineral products (bleaching earth)",
    },
    {
      value: "3823",
      label: "3823 - Industrial fatty acids; acid oils from refining",
    },
    {
      value: "382319",
      label: "382319 - Other industrial fatty acids; acid oils from refining",
    },
    {
      value: "3923",
      label: "3923 - Articles for the conveyance or packing of goods, plastics",
    },
    {
      value: "392010",
      label: "392010 - Film and sheets of polymers of ethylene",
    },
    {
      value: "392330",
      label: "392330 - Carboys, bottles, flasks and jars of plastics",
    },
    {
      value: "4819",
      label: "4819 - Cartons, boxes and cases of paper or paperboard",
    },
    {
      value: "481910",
      label: "481910 - Cartons and boxes of corrugated paper or paperboard",
    },
    {
      value: "591140",
      label: "591140 - Straining cloth used in oil presses",
    },
    {
      value: "7310",
      label: "7310 - Tanks, casks, drums, cans and boxes of iron or steel",
    },
    {
      value: "731021",
      label: "731021 - Cans closed by soldering or crimping, under 50 litres",
    },
    {
      value: "830990",
      label: "830990 - Stoppers, caps and lids of base metal",
    },
  ],
  godowns: [
    { label: "Main Location", value: GODOWN.main },
    { label: "Factory - Harihar", value: GODOWN.factory },
    { label: "Warehouse - Peenya", value: GODOWN.peenya },
    { label: "Depot - Mysuru", value: GODOWN.mysuru },
  ],
};

type Seed = {
  id: string;
  name: string;
  under: string;
  category: string;
  unit: string;
  /** Unit items: quantity and rate. Not Applicable: `value` only. */
  qty?: number;
  rate?: number;
  value?: number;
  /** [godown, quantity] — or [godown, amount] for a Not Applicable unit. */
  godowns?: [string, number][];
  hsn?: string;
  /** Total GST %, split half and half into CGST and SGST. null inherits. */
  gst?: number | null;
  gstApplicable?: boolean;
  sync: ThirdPartySyncStatus;
  postedAt?: string;
  error?: string;
  usedInVoucher?: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const build = (seed: Seed): StockItemDetail => {
  const unitless = seed.unit === UNIT.na;
  const qty = unitless ? 0 : (seed.qty ?? 0);
  const rate = unitless ? 0 : (seed.rate ?? 0);
  const value = unitless ? (seed.value ?? 0) : round2(qty * rate);
  const split =
    seed.godowns ?? (value ? [[GODOWN.main, unitless ? value : qty]] : []);
  const gstApplicable = seed.gstApplicable ?? true;
  const custom = gstApplicable && seed.gst != null;
  const half = custom ? String((seed.gst as number) / 2) : "";
  return {
    itemUuid: seed.id,
    name: seed.name,
    underUuid: seed.under,
    categoryUuid: seed.category,
    unitUuid: seed.unit,
    gstApplicability: gstApplicable ? "applicable" : "not_applicable",
    setAlterGst: custom,
    setAlterHsnSac: !!seed.hsn,
    gstDetailSource: custom ? "custom" : "company_or_stock_group",
    taxabilityType: "taxable",
    taxType: custom ? "cgst_sgst_utgst" : "",
    igstRate: "",
    cgstRate: half,
    sgstUgstRate: half,
    cessValuationType: "not_applicable",
    cessRatePercent: "",
    cessRatePerUnit: "",
    applicableDate: custom ? "2025-09-22" : null,
    applicableForReverseCharge: false,
    eligibleForInputTaxCredit: true,
    typeOfSupply: "goods",
    hsnSac: seed.hsn ?? "",
    quantity: unitless || !qty ? "" : String(qty),
    rate: unitless || !rate ? "" : String(rate),
    openingBalanceValue: value ? String(value) : "",
    godownAllocations: split.map(([godownUuid, n], index) => ({
      id: `${seed.id}-alloc-${index}`,
      godownUuid,
      quantity: unitless ? 0 : n,
      rate: unitless ? 0 : rate,
      discount: 0,
      amount: unitless ? n : round2(n * rate),
    })),
    isUomEditable: !seed.usedInVoucher,
    thirdPartySyncStatus: seed.sync,
    thirdPartyPostingDate: seed.postedAt,
    thirdPartyProduct: "Tally",
    thirdPartySyncError: seed.error,
  };
};

const SEEDS: Seed[] = [
  // Finished goods
  {
    id: "itm-0001-rso-15l-tin",
    name: "Refined Sunflower Oil 15L Tin",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.tin,
    qty: 420,
    rate: 2140,
    godowns: [
      [GODOWN.factory, 300],
      [GODOWN.peenya, 120],
    ],
    hsn: "151219",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-12T10:42:18+05:30",
    usedInVoucher: true,
  },
  {
    id: "itm-0002-rso-1l-pouch",
    name: "Refined Sunflower Oil 1L Pouch",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.pcs,
    qty: 6000,
    rate: 142,
    godowns: [
      [GODOWN.peenya, 4000],
      [GODOWN.mysuru, 2000],
    ],
    hsn: "151219",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-12T10:42:31+05:30",
  },
  {
    id: "itm-0003-rso-5l-jar",
    name: "Refined Sunflower Oil 5L Jar",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.nos,
    qty: 900,
    rate: 695,
    godowns: [[GODOWN.peenya, 900]],
    hsn: "151219",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-12T10:43:02+05:30",
  },
  {
    id: "itm-0004-rso-1l-box",
    name: "Refined Sunflower Oil 1L Pouch Box (12 x 1L)",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.box,
    qty: 250,
    rate: 1690,
    godowns: [[GODOWN.peenya, 250]],
    hsn: "151219",
    gst: null,
    sync: "not_synced",
  },
  {
    id: "itm-0005-rgo-15l-tin",
    name: "Refined Groundnut Oil 15L Tin",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.tin,
    qty: 260,
    rate: 2950,
    godowns: [[GODOWN.factory, 260]],
    hsn: "150890",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-14T16:05:47+05:30",
  },
  {
    id: "itm-0006-rgo-1l-pouch",
    name: "Refined Groundnut Oil 1L Pouch",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.pcs,
    qty: 3500,
    rate: 192,
    godowns: [[GODOWN.peenya, 3500]],
    hsn: "150890",
    gst: 5,
    sync: "not_synced",
  },
  {
    id: "itm-0007-rgo-5l-jar",
    name: "Refined Groundnut Oil 5L Jar",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.nos,
    qty: 400,
    rate: 945,
    godowns: [[GODOWN.mysuru, 400]],
    hsn: "150890",
    gst: 5,
    sync: "in_progress",
  },
  {
    id: "itm-0008-rbo-15l-tin",
    name: "Rice Bran Oil 15L Tin",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.tin,
    qty: 180,
    rate: 2030,
    godowns: [[GODOWN.factory, 180]],
    hsn: "151590",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-14T16:06:12+05:30",
  },
  {
    id: "itm-0009-rbo-1l-pouch",
    name: "Rice Bran Oil 1L Pouch",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.pcs,
    qty: 2400,
    rate: 138,
    godowns: [[GODOWN.peenya, 2400]],
    hsn: "151590",
    gst: 5,
    sync: "event_processing_failed",
    error: "Unit 'Pcs' is not defined in Tally for this company.",
  },
  {
    id: "itm-0010-palmolein-15l-tin",
    name: "Palmolein Oil 15L Tin",
    under: GROUP.finished,
    category: CATEGORY.edible,
    unit: UNIT.tin,
    qty: 350,
    rate: 1640,
    godowns: [
      [GODOWN.factory, 200],
      [GODOWN.peenya, 150],
    ],
    hsn: "151190",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-15T11:20:05+05:30",
  },
  // Raw material
  {
    id: "itm-0011-crude-sunflower",
    name: "Crude Sunflower Oil",
    under: GROUP.raw,
    category: CATEGORY.crude,
    unit: UNIT.mt,
    qty: 85,
    rate: 98500,
    godowns: [[GODOWN.factory, 85]],
    hsn: "151211",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-10T09:15:40+05:30",
  },
  {
    id: "itm-0012-crude-rice-bran",
    name: "Crude Rice Bran Oil",
    under: GROUP.raw,
    category: CATEGORY.crude,
    unit: UNIT.kgs,
    qty: 24000,
    rate: 86,
    godowns: [[GODOWN.factory, 24000]],
    hsn: "151590",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-10T09:16:02+05:30",
  },
  {
    id: "itm-0013-crude-palm",
    name: "Crude Palm Oil",
    under: GROUP.raw,
    category: CATEGORY.crude,
    unit: UNIT.mt,
    qty: 40,
    rate: 92000,
    godowns: [[GODOWN.factory, 40]],
    hsn: "151110",
    gst: 5,
    sync: "in_progress",
  },
  {
    id: "itm-0014-crude-groundnut",
    name: "Crude Groundnut Oil",
    under: GROUP.raw,
    category: CATEGORY.crude,
    unit: UNIT.kgs,
    qty: 12000,
    rate: 168,
    godowns: [[GODOWN.factory, 12000]],
    hsn: "150810",
    gst: 5,
    sync: "not_synced",
  },
  // Packing material
  {
    id: "itm-0015-tin-empty",
    name: "15L Tin Empty",
    under: GROUP.packing,
    category: CATEGORY.packing,
    unit: UNIT.nos,
    qty: 5000,
    rate: 96,
    godowns: [[GODOWN.factory, 5000]],
    hsn: "731021",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-11T14:30:22+05:30",
  },
  {
    id: "itm-0016-pouch-film",
    name: "1L Pouch Film Roll",
    under: GROUP.packing,
    category: CATEGORY.packing,
    unit: UNIT.kgs,
    qty: 1800,
    rate: 214,
    godowns: [[GODOWN.factory, 1800]],
    hsn: "392010",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-11T14:30:51+05:30",
  },
  {
    id: "itm-0017-jar-empty",
    name: "5L Jar Empty",
    under: GROUP.packing,
    category: CATEGORY.packing,
    unit: UNIT.nos,
    qty: 2000,
    rate: 38,
    godowns: [[GODOWN.factory, 2000]],
    hsn: "392330",
    gst: 18,
    sync: "not_synced",
  },
  {
    id: "itm-0018-carton-box",
    name: "Carton Box (12 x 1L)",
    under: GROUP.packing,
    category: CATEGORY.packing,
    unit: UNIT.pcs,
    qty: 8000,
    rate: 27.5,
    godowns: [
      [GODOWN.factory, 5000],
      [GODOWN.peenya, 3000],
    ],
    hsn: "481910",
    gst: 12,
    sync: "synced",
    postedAt: "2026-09-11T14:31:15+05:30",
  },
  {
    id: "itm-0019-tin-cap",
    name: "Tin Cap with Seal",
    under: GROUP.packing,
    category: CATEGORY.packing,
    unit: UNIT.nos,
    qty: 10000,
    rate: 3.2,
    godowns: [[GODOWN.factory, 10000]],
    hsn: "830990",
    gst: 18,
    sync: "event_creations_failed",
    error: "Stock group 'Packing Material' does not exist in Tally.",
  },
  // By-products
  {
    id: "itm-0020-deoiled-cake",
    name: "De-oiled Cake (Sunflower)",
    under: GROUP.byProducts,
    category: CATEGORY.byProducts,
    unit: UNIT.mt,
    qty: 120,
    rate: 21500,
    godowns: [[GODOWN.factory, 120]],
    hsn: "230630",
    gst: 5,
    sync: "synced",
    postedAt: "2026-09-16T12:02:44+05:30",
  },
  {
    id: "itm-0021-fatty-acid",
    name: "Fatty Acid",
    under: GROUP.byProducts,
    category: CATEGORY.byProducts,
    unit: UNIT.kgs,
    qty: 9500,
    rate: 72,
    godowns: [[GODOWN.factory, 9500]],
    hsn: "382319",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-16T12:03:10+05:30",
  },
  {
    id: "itm-0022-acid-oil",
    name: "Acid Oil",
    under: GROUP.byProducts,
    category: CATEGORY.byProducts,
    unit: UNIT.kgs,
    qty: 4200,
    rate: 64,
    godowns: [[GODOWN.factory, 4200]],
    hsn: "382319",
    gst: 18,
    sync: "not_synced",
  },
  // Stores & spares
  {
    id: "itm-0023-bleaching-earth",
    name: "Bleaching Earth",
    under: GROUP.stores,
    category: CATEGORY.consumables,
    unit: UNIT.kgs,
    qty: 6000,
    rate: 34,
    godowns: [[GODOWN.factory, 6000]],
    hsn: "380290",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-18T15:48:09+05:30",
  },
  {
    id: "itm-0024-hexane",
    name: "Hexane (Solvent Grade)",
    under: GROUP.stores,
    category: CATEGORY.consumables,
    unit: UNIT.ltr,
    qty: 3000,
    rate: 118,
    godowns: [[GODOWN.factory, 3000]],
    hsn: "290110",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-18T15:48:30+05:30",
  },
  {
    id: "itm-0025-filter-cloth",
    name: "Filter Press Cloth",
    under: GROUP.stores,
    category: CATEGORY.consumables,
    unit: UNIT.pcs,
    qty: 150,
    rate: 640,
    godowns: [[GODOWN.factory, 150]],
    hsn: "591140",
    gst: 12,
    sync: "not_synced",
  },
  {
    id: "itm-0026-expeller-spares",
    name: "Expeller Spares",
    under: GROUP.stores,
    category: CATEGORY.na,
    unit: UNIT.na,
    value: 185000,
    godowns: [[GODOWN.factory, 185000]],
    gstApplicable: false,
    sync: "not_synced",
  },
  {
    id: "itm-0027-boiler-fuel",
    name: "Boiler Fuel (Briquettes)",
    under: GROUP.primary,
    category: CATEGORY.na,
    unit: UNIT.na,
    gst: null,
    sync: "synced",
    postedAt: "2026-09-20T10:05:00+05:30",
  },
];

export const MOCK_STOCK_ITEMS: StockItemDetail[] = SEEDS.map(build);

/** The item a voucher already uses: its unit is locked on Edit. */
export const LOCKED_UNIT_ITEM_ID = "itm-0001-rso-15l-tin";

/* ------------------------------------------------- Sahyadri Precision Works, Pune */

const ACME_GODOWN = {
  main: "gdn-acme-main-location",
  chakan: "gdn-acme-chakan-stores",
} as const;

const ACME_GROUP = {
  primary: "primary",
  finished: "grp-acme-finished-goods",
  raw: "grp-acme-raw-material",
  boughtOut: "grp-acme-bought-out",
  stores: "grp-acme-stores-spares",
} as const;

const ACME_CATEGORY = {
  na: "not_applicable",
  machined: "cat-acme-machined",
  steel: "cat-acme-raw-steel",
  bearings: "cat-acme-bearings",
  consumables: "cat-acme-consumables",
} as const;

const ACME_UNIT = {
  na: UNIT.na,
  nos: "uom-acme-nos",
  kgs: "uom-acme-kgs",
  pcs: "uom-acme-pcs",
} as const;

const ACME_INVENTORY_OPTIONS: InventoryOptions = {
  groups: [
    { label: "Primary", value: ACME_GROUP.primary },
    { label: "Finished Goods", value: ACME_GROUP.finished },
    { label: "Raw Material", value: ACME_GROUP.raw },
    { label: "Bought-out Parts", value: ACME_GROUP.boughtOut },
    { label: "Stores & Spares", value: ACME_GROUP.stores },
  ],
  categories: [
    { label: "Not Applicable", value: ACME_CATEGORY.na },
    { label: "Machined Components", value: ACME_CATEGORY.machined },
    { label: "Raw Steel", value: ACME_CATEGORY.steel },
    { label: "Bearings", value: ACME_CATEGORY.bearings },
    { label: "Consumables", value: ACME_CATEGORY.consumables },
  ],
  units: [
    { label: "Not Applicable", value: ACME_UNIT.na },
    { label: "Nos", value: ACME_UNIT.nos },
    { label: "Kgs", value: ACME_UNIT.kgs },
    { label: "Pcs", value: ACME_UNIT.pcs },
  ],
  hsnSac: [
    { value: "7208", label: "7208 - Flat-rolled products of iron, hot-rolled" },
    { value: "7214", label: "7214 - Bars and rods of iron or non-alloy steel" },
    { value: "7222", label: "7222 - Bars and rods of stainless steel" },
    { value: "730791", label: "730791 - Flanges of iron or steel" },
    { value: "820780", label: "820780 - Tools for turning (inserts)" },
    { value: "848210", label: "848210 - Ball bearings" },
    { value: "848310", label: "848310 - Transmission shafts" },
    {
      value: "848330",
      label: "848330 - Bearing housings, plain shaft bearings",
    },
    {
      value: "340319",
      label: "340319 - Lubricating and cutting-oil preparations",
    },
  ],
  godowns: [
    { label: "Main Location", value: ACME_GODOWN.main },
    { label: "Chakan Plant Stores", value: ACME_GODOWN.chakan },
  ],
};

const acmeStock = (seed: Seed): Seed => ({
  ...seed,
  godowns: seed.godowns ?? [
    [
      ACME_GODOWN.chakan,
      seed.unit === ACME_UNIT.na ? (seed.value ?? 0) : (seed.qty ?? 0),
    ],
  ],
});

const ACME_SEEDS: Seed[] = [
  {
    id: "acme-itm-01-ms-flange-4",
    name: 'MS Flange 4" Class 150',
    under: ACME_GROUP.finished,
    category: ACME_CATEGORY.machined,
    unit: ACME_UNIT.nos,
    qty: 320,
    rate: 1450,
    hsn: "730791",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-10T11:20:04+05:30",
    usedInVoucher: true,
  },
  {
    id: "acme-itm-02-ss-wn-flange-2",
    name: 'SS304 Weld Neck Flange 2"',
    under: ACME_GROUP.finished,
    category: ACME_CATEGORY.machined,
    unit: ACME_UNIT.nos,
    qty: 140,
    rate: 2280,
    hsn: "730791",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-10T11:20:16+05:30",
  },
  {
    id: "acme-itm-03-cnc-shaft-en8",
    name: "CNC Turned Shaft EN8 Ø40 x 600",
    under: ACME_GROUP.finished,
    category: ACME_CATEGORY.machined,
    unit: ACME_UNIT.nos,
    qty: 85,
    rate: 3650,
    hsn: "848310",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-10T11:20:29+05:30",
  },
  {
    id: "acme-itm-04-bearing-housing",
    name: "Pillow Block Bearing Housing UCP208",
    under: ACME_GROUP.finished,
    category: ACME_CATEGORY.machined,
    unit: ACME_UNIT.nos,
    qty: 60,
    rate: 1890,
    hsn: "848330",
    gst: 18,
    sync: "not_synced",
  },
  {
    id: "acme-itm-05-en8-bar-50",
    name: "EN8 Round Bar Ø50",
    under: ACME_GROUP.raw,
    category: ACME_CATEGORY.steel,
    unit: ACME_UNIT.kgs,
    qty: 4200,
    rate: 68.5,
    godowns: [
      [ACME_GODOWN.main, 2700],
      [ACME_GODOWN.chakan, 1500],
    ],
    hsn: "7214",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-08T16:02:51+05:30",
    usedInVoucher: true,
  },
  {
    id: "acme-itm-06-ms-plate-12",
    name: "MS Plate 12mm IS2062",
    under: ACME_GROUP.raw,
    category: ACME_CATEGORY.steel,
    unit: ACME_UNIT.kgs,
    qty: 2800,
    rate: 62,
    hsn: "7208",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-08T16:03:07+05:30",
  },
  {
    id: "acme-itm-07-ss304-bar-25",
    name: "SS304 Round Bar Ø25",
    under: ACME_GROUP.raw,
    category: ACME_CATEGORY.steel,
    unit: ACME_UNIT.kgs,
    qty: 650,
    rate: 245,
    hsn: "7222",
    gst: 18,
    sync: "event_creations_failed",
    error: "Unit 'Kgs' is not defined in Tally for this company.",
  },
  {
    id: "acme-itm-08-bearing-6205",
    name: "SKF Deep Groove Ball Bearing 6205-2RS",
    under: ACME_GROUP.boughtOut,
    category: ACME_CATEGORY.bearings,
    unit: ACME_UNIT.pcs,
    qty: 500,
    rate: 116,
    hsn: "848210",
    gst: 18,
    sync: "synced",
    postedAt: "2026-09-12T09:41:33+05:30",
  },
  {
    id: "acme-itm-09-insert-cnmg",
    name: "Carbide Turning Insert CNMG 120408",
    under: ACME_GROUP.stores,
    category: ACME_CATEGORY.consumables,
    unit: ACME_UNIT.pcs,
    qty: 240,
    rate: 385,
    hsn: "820780",
    gst: 18,
    sync: "in_progress",
  },
  {
    id: "acme-itm-10-cutting-coolant",
    name: "Cutting Coolant - Servocut S",
    under: ACME_GROUP.stores,
    category: ACME_CATEGORY.consumables,
    unit: ACME_UNIT.na,
    value: 18600,
    hsn: "340319",
    gst: 18,
    sync: "not_synced",
  },
];

/* ------------------------------------------------------- per company */

/** One company's stock items and the option lists its form picks from. */
export type InventorySeed = {
  items: StockItemDetail[];
  options: InventoryOptions;
};

/** A company with no masters yet: Tally's defaults and nothing else. */
const EMPTY_OPTIONS: InventoryOptions = {
  groups: [{ label: "Primary", value: GROUP.primary }],
  categories: [{ label: "Not Applicable", value: CATEGORY.na }],
  units: [{ label: "Not Applicable", value: UNIT.na }],
  hsnSac: [],
  godowns: [{ label: "Main Location", value: GODOWN.main }],
};

/**
 * One company's inventory, keyed by the Inbox's company id. Shakunthalam's
 * is the data above, unchanged; Sahyadri has its own ten items; a company
 * created in the prototype has none.
 *
 * DEV: GET /api/inventory-masters/items?companyId=… and
 * GET /api/inventory-masters/items/options?companyId=….
 */
export const seedFor = (companyId: string): InventorySeed =>
  companyId === "shakun"
    ? { items: MOCK_STOCK_ITEMS, options: MOCK_INVENTORY_OPTIONS }
    : companyId === "acme"
      ? {
          items: ACME_SEEDS.map(acmeStock).map(build),
          options: ACME_INVENTORY_OPTIONS,
        }
      : { items: [], options: EMPTY_OPTIONS };
