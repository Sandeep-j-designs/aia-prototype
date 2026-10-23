/**
 * Cost centres, as Tally keeps them — the one set every screen offers.
 *
 * Three masters, synced from the books:
 *
 * - **Cost category.** Flat; no sub-categories. Each one allocates a line's
 *   *whole* amount on its own, so a line can be Engineering 100% by Department
 *   and Project Atlas 100% by Project at the same time.
 * - **Cost centre.** Belongs to exactly one category, and sits Under another
 *   centre or at the top (`parentId`). A parent can be allocated to as well as
 *   its children; the AR bulk upload accepts leaf centres only, as production's
 *   does.
 * - **Cost centre class.** A saved allocation — per category, the centres and
 *   the share each takes. Picked once in a voucher's header, it allocates every
 *   applicable line and the lines stop asking.
 *
 * The AP and AR sheets (public/{ap,ar}/index.html) carry a hand copy of this
 * list with the same ids and names, because a vanilla-JS engine cannot import
 * TypeScript. Change one, change the other.
 *
 * Like the rest of the Inbox's `Form`, stored values are display NAMES — the
 * helpers below resolve them back to masters.
 *
 * DEV: in production these are three master endpoints —
 *   GET /api/companies/cost-centre/categories
 *   GET /api/companies/cost-centre/classes
 *   GET /api/companies/cost-centre/grouped-list  (lazy tree by parentPath)
 */

export type CostCategory = { id: string; name: string };
export type CostCentre = {
  id: string;
  name: string;
  /** The category's name. */
  category: string;
  /** The centre this one sits Under, or null at the top of its category. */
  parentId: string | null;
};

/**
 * How one line's amount is divided. One entry per category, each totalling
 * 100% of the line on its own. Centre and category are names.
 */
export type CostAllocation = {
  category: string;
  rows: { centre: string; pct: number }[];
}[];

export type CostCentreClass = {
  id: string;
  name: string;
  allocation: CostAllocation;
};

export const COST_CATEGORIES: CostCategory[] = [
  { id: "cat-department", name: "Department" },
  { id: "cat-project", name: "Project" },
  { id: "cat-region", name: "Region" },
  { id: "cat-channel", name: "Sales Channel" },
];

export const COST_CENTRES: CostCentre[] = [
  {
    id: "nd-cc-jp-nagar",
    name: "JP Nagar",
    category: "Region",
    parentId: null,
  },
  {
    id: "nd-cc-koramangala",
    name: "Koramangala",
    category: "Region",
    parentId: null,
  },
  {
    id: "cc-admin",
    name: "Administration",
    category: "Department",
    parentId: null,
  },
  {
    id: "cc-fin",
    name: "Finance & Accounts",
    category: "Department",
    parentId: "cc-admin",
  },
  {
    id: "cc-hr",
    name: "Human Resources",
    category: "Department",
    parentId: "cc-admin",
  },
  {
    id: "cc-legal",
    name: "Legal & Compliance",
    category: "Department",
    parentId: "cc-admin",
  },
  { id: "cc-tech", name: "Technology", category: "Department", parentId: null },
  {
    id: "cc-eng",
    name: "Engineering",
    category: "Department",
    parentId: "cc-tech",
  },
  {
    id: "cc-design",
    name: "Product & Design",
    category: "Department",
    parentId: "cc-tech",
  },
  {
    id: "cc-it",
    name: "IT & Infrastructure",
    category: "Department",
    parentId: "cc-tech",
  },
  {
    id: "cc-commercial",
    name: "Commercial",
    category: "Department",
    parentId: null,
  },
  {
    id: "cc-sales",
    name: "Sales & Marketing",
    category: "Department",
    parentId: "cc-commercial",
  },
  {
    id: "cc-cs",
    name: "Customer Success",
    category: "Department",
    parentId: "cc-commercial",
  },
  { id: "cc-ops", name: "Operations", category: "Department", parentId: null },
  {
    id: "cc-atlas",
    name: "Project Atlas",
    category: "Project",
    parentId: null,
  },
  {
    id: "cc-north",
    name: "Project Northstar",
    category: "Project",
    parentId: null,
  },
  {
    id: "cc-solvent",
    name: "Solvent Plant Expansion",
    category: "Project",
    parentId: null,
  },
  { id: "cc-south", name: "South Zone", category: "Region", parentId: null },
  { id: "cc-west", name: "West Zone", category: "Region", parentId: null },
  {
    id: "cc-northzone",
    name: "North Zone",
    category: "Region",
    parentId: null,
  },
  {
    id: "cc-retail",
    name: "Retail",
    category: "Sales Channel",
    parentId: null,
  },
  {
    id: "cc-wholesale",
    name: "Wholesale",
    category: "Sales Channel",
    parentId: null,
  },
  {
    id: "cc-mt",
    name: "Modern Trade",
    category: "Sales Channel",
    parentId: null,
  },
  {
    id: "cc-horeca",
    name: "HoReCa",
    category: "Sales Channel",
    parentId: null,
  },
];

export const COST_CENTRE_CLASSES: CostCentreClass[] = [
  {
    id: "ccc-dept",
    name: "Shared overheads",
    allocation: [
      {
        category: "Department",
        rows: [
          { centre: "Administration", pct: 40 },
          { centre: "Engineering", pct: 35 },
          { centre: "Sales & Marketing", pct: 25 },
        ],
      },
    ],
  },
  {
    id: "ccc-eng",
    name: "Engineering",
    allocation: [
      { category: "Department", rows: [{ centre: "Engineering", pct: 100 }] },
    ],
  },
  {
    id: "ccc-ops",
    name: "Operations",
    allocation: [
      { category: "Department", rows: [{ centre: "Operations", pct: 100 }] },
    ],
  },
  {
    id: "ccc-rev",
    name: "Revenue share",
    allocation: [
      {
        category: "Department",
        rows: [
          { centre: "Sales & Marketing", pct: 60 },
          { centre: "Customer Success", pct: 40 },
        ],
      },
    ],
  },
  {
    id: "ccc-atlas",
    name: "Project Atlas build",
    allocation: [
      { category: "Department", rows: [{ centre: "Engineering", pct: 100 }] },
      { category: "Project", rows: [{ centre: "Project Atlas", pct: 100 }] },
    ],
  },
];

export const costCentreByName = (name: string) =>
  COST_CENTRES.find((centre) => centre.name === name);
export const costCentreClassByName = (name: string) =>
  COST_CENTRE_CLASSES.find((klass) => klass.name === name);

/** A centre nothing else sits Under — what the AR bulk upload accepts. */
export const isLeafCostCentre = (centre: CostCentre) =>
  !COST_CENTRES.some((c) => c.parentId === centre.id);

/** Centres in tree order — each parent followed by its children — with depth. */
export function costCentreTree(
  list: CostCentre[] = COST_CENTRES
): { centre: CostCentre; depth: number }[] {
  const out: { centre: CostCentre; depth: number }[] = [];
  const ids = new Set(list.map((c) => c.id));
  const walk = (parentId: string, depth: number) =>
    list
      .filter((c) => c.parentId === parentId)
      .forEach((c) => {
        out.push({ centre: c, depth });
        walk(c.id, depth + 1);
      });
  list
    .filter((c) => !c.parentId || !ids.has(c.parentId))
    .forEach((c) => {
      out.push({ centre: c, depth: 0 });
      walk(c.id, 1);
    });
  return out;
}

export const centresInCategory = (category: string) =>
  COST_CENTRES.filter((c) => c.category === category);

export const allocationCategoryTotal = (cat: CostAllocation[number]) =>
  Math.round(cat.rows.reduce((s, r) => s + (Number(r.pct) || 0), 0) * 100) /
  100;

/** Every category reaches exactly 100% and every row names a centre. */
export const allocationComplete = (allocation: CostAllocation) =>
  allocation.length > 0 &&
  allocation.every(
    (cat) =>
      Math.abs(allocationCategoryTotal(cat) - 100) < 0.005 &&
      cat.rows.every((r) => r.centre)
  );

/**
 * "Split · 3 centres" — what a narrow table cell shows. The full wording and
 * breakdown go on hover (`allocationLabel`, `allocationDetail`).
 */
export const allocationShortLabel = (allocation: CostAllocation) => {
  const n = new Set(
    allocation.flatMap((cat) => cat.rows.map((r) => r.centre).filter(Boolean))
  ).size;
  return `Split · ${n} centre${n === 1 ? "" : "s"}`;
};

/** "2 Departments · 1 Project", as production words a split. */
export const allocationLabel = (allocation: CostAllocation) =>
  allocation
    .map((cat) => {
      const n = cat.rows.filter((r) => r.centre).length;
      return `${n} ${cat.category}${n === 1 ? "" : "s"}`;
    })
    .join(" · ");

/** "Department: Engineering 50%, Sales & Marketing 50% · Project: Atlas 100%". */
export const allocationDetail = (allocation: CostAllocation) =>
  allocation
    .map(
      (cat) =>
        `${cat.category}: ${
          cat.rows
            .filter((r) => r.centre)
            .map((r) => `${r.centre} ${r.pct}%`)
            .join(", ") || "—"
        }`
    )
    .join(" · ");

/**
 * What a voucher header's cost centre answer locks its lines to: the class or
 * the one centre, whichever the header's switch points at and resolves. Null
 * when the header holds nothing, and the lines answer for themselves.
 */
export function headerCostLock(header: {
  costMode: "class" | "centre";
  costClass: string;
  costCentre: string;
}): { label: string; detail: string } | null {
  if (header.costMode === "class") {
    const klass = costCentreClassByName(header.costClass);
    return klass
      ? {
          label: klass.name,
          detail: `Set by the class — ${allocationDetail(klass.allocation)}`,
        }
      : null;
  }
  const centre = costCentreByName(header.costCentre);
  return centre
    ? { label: centre.name, detail: "Set by the voucher's cost centre" }
    : null;
}
