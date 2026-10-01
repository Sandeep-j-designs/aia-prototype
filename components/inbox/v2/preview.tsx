import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printedSupplier } from "@/config/pages/inbox/ap-document";
import {
  MOCK_OWN_REGISTRATION,
  partyNamed,
} from "@/config/pages/inbox/mock-parties";
import type { PrintedLine } from "@/types/pages/inbox";
import { cn } from "@/lib/utils";
import { T } from "./ui";
import { companyOf, fileUrl, Item } from "./store";
import s from "./preview.module.css";

/**
 * The source document viewer for Sales and Journal vouchers.
 *
 * It is the AP sheet's viewer (public/ap — `.preview`, `facsimile()`), rebuilt
 * here because the AP sheet draws its own pane and these two routes do not
 * embed it. The two sat side by side in the same inbox looking like different
 * products: a flat "Sample document" card here, a printed tax invoice on a mat
 * there. So this copies that one — the file name, then zoom out, the level
 * (which is also the menu of fits), zoom in and full screen; and the document
 * drawn as paper on the sheet's tinted mat.
 *
 * Zoom is the CSS `zoom` property, as in the AP sheet, so the page's own
 * layout grows and the scroll container sees a genuinely wider box.
 */
const PAGE_W = 640;
const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const ZOOM_MENU = [0.5, 0.75, 1, 1.25, 1.5, 2];
type Mode = "fit-width" | "fit-page" | "level";

export default function Preview({ item }: { item: Item }) {
  const [url, setUrl] = useState(""),
    [mode, setMode] = useState<Mode>("fit-width"),
    [level, setLevel] = useState(1),
    [fit, setFit] = useState({ width: 1, page: 1 }),
    [full, setFull] = useState(false);
  const card = useRef<HTMLDivElement>(null),
    body = useRef<HTMLDivElement>(null),
    page = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true,
      current = "";
    if (item.file.blobId)
      fileUrl(item.file.blobId).then((u) => {
        current = u;
        if (active) setUrl(u);
      });
    return () => {
      active = false;
      if (current) URL.revokeObjectURL(current);
    };
  }, [item.file.blobId]);

  // A fit is a question about the box, so it is re-asked whenever the box
  // changes: the splitter, the window, full screen.
  const measure = useCallback(() => {
    const b = body.current,
      p = page.current;
    if (!b || !p) return;
    const width = (b.clientWidth - 40) / PAGE_W;
    const scale = Number(getComputedStyle(p).zoom) || 1;
    const natural = p.offsetHeight / scale || PAGE_W * 1.414;
    const height = (b.clientHeight - 40) / natural;
    setFit({
      width: Math.max(0.1, width),
      page: Math.max(0.1, Math.min(width, height)),
    });
  }, []);
  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (body.current) ro.observe(body.current);
    return () => ro.disconnect();
  }, [measure, url]);

  useEffect(() => {
    const onChange = () => {
      const on = document.fullscreenElement === card.current;
      setFull(on);
      // Full screen is a different box: a fit there becomes fit-page, as in
      // the AP sheet, so the reader sees the whole page and not one column.
      if (on) setMode((m) => (m === "level" ? m : "fit-page"));
      else setMode((m) => (m === "level" ? m : "fit-width"));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const scale =
    mode === "level" ? level : mode === "fit-width" ? fit.width : fit.page;
  const setZoom = (z: number) => {
    setMode("level");
    setLevel(Math.min(4, Math.max(0.25, z)));
  };
  const step = (dir: 1 | -1) => {
    const next =
      dir > 0
        ? ZOOM_STEPS.find((z) => z > scale + 1e-4)
        : [...ZOOM_STEPS].reverse().find((z) => z < scale - 1e-4);
    if (next != null) setZoom(next);
  };

  return (
    <div
      data-guide-id="inbox-preview"
      className="flex h-full min-h-0 flex-col p-4"
    >
      <div
        ref={card}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-neutral-gray bg-background"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-neutral-gray px-4 py-3">
          <h2
            className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-[22px] tracking-[-0.18px] text-foreground"
            title={item.file.name}
          >
            {item.file.name}
          </h2>
          <div className="flex shrink-0 items-center gap-0.5">
            <ViewerAction
              label="Zoom out"
              disabled={scale <= ZOOM_STEPS[0] + 1e-4}
              onClick={() => step(-1)}
            >
              <ZoomOut />
            </ViewerAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Zoom level"
                  className="h-[30px] min-w-[70px] justify-between gap-1 px-1.5 pl-2.5 text-sm font-semibold tabular-nums text-foreground hover:bg-accent data-[state=open]:bg-accent"
                >
                  {Math.round(scale * 100)}%
                  <ChevronDown className="h-[13px] w-[13px] text-secondary-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[150px]">
                {(
                  [
                    ["fit-width", "Fit width"],
                    ["fit-page", "Fit page"],
                  ] as const
                ).map(([m, label]) => (
                  <ZoomOption
                    key={m}
                    checked={mode === m}
                    onSelect={() => setMode(m)}
                  >
                    {label}
                  </ZoomOption>
                ))}
                <DropdownMenuSeparator />
                {ZOOM_MENU.map((z) => (
                  <ZoomOption
                    key={z}
                    checked={mode === "level" && level === z}
                    onSelect={() => setZoom(z)}
                  >
                    {Math.round(z * 100)}%
                  </ZoomOption>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ViewerAction
              label="Zoom in"
              disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1] - 1e-4}
              onClick={() => step(1)}
            >
              <ZoomIn />
            </ViewerAction>
            <span className="mx-1 h-[18px] w-px shrink-0 bg-neutral-gray" />
            <ViewerAction
              label={full ? "Exit full screen" : "Full screen"}
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void card.current?.requestFullscreen();
              }}
            >
              {full ? <Minimize /> : <Maximize />}
            </ViewerAction>
          </div>
        </header>
        <div ref={body} className={s.body}>
          <div
            ref={page}
            className={s.page}
            style={{ zoom: scale } as React.CSSProperties}
          >
            {url ? (
              item.file.ext === "pdf" ? (
                <iframe
                  title="Original source file"
                  src={`${url}#toolbar=0&view=FitH`}
                  className={cn(s.paper, s.pdf)}
                />
              ) : /png|jpe?g/i.test(item.file.ext) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={item.file.name} src={url} className={s.paper} />
              ) : (
                <div className={cn(s.paper, "space-y-3 p-7")}>
                  <h3 className={T.section}>{item.file.name}</h3>
                  <p className={T.value}>Spreadsheet original preserved.</p>
                  <Button asChild variant="outline">
                    <a href={url} download={item.file.name}>
                      Download original
                    </a>
                  </Button>
                </div>
              )
            ) : (
              <Facsimile item={item} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- facsimile */

/**
 * The tenant as printed on its documents. A company created in the prototype
 * has no letterhead yet, so it prints what it was set up with.
 */
const ourRegistration = (companyId: string) => {
  const company = companyOf(companyId);
  return (
    MOCK_OWN_REGISTRATION[companyId] || {
      legalName: company?.name || "Our company",
      gstin: company?.gstin || "",
      state: company?.state || "",
      address: "",
    }
  );
};

/** GSTIN state codes the bundled documents use → the state they stand for. */
const STATE_BY_CODE: Record<string, string> = {
  "06": "Haryana",
  "24": "Gujarat",
  "27": "Maharashtra",
  "29": "Karnataka",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "36": "Telangana",
};

/**
 * Always two decimals. A printed tax invoice never renders ₹5,817.6.
 */
const inr = (n: number) =>
  n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** A printed quantity: whole numbers bare, anything else to two places. */
const qtyText = (n: number) =>
  n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** "2026-09-10" → "10 Sep 2026"; a date already printed that way is left be. */
const printedDate = (value: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!m) return value;
  const month = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ")[
    +m[2] - 1
  ];
  return `${+m[3]} ${month} ${m[1]}`;
};

/**
 * The document, printed from the document's own data, as the AP sheet's
 * `facsimile()` prints a bill. A purchase bill — which is also what most
 * journals in the inbox started life as — is the vendor's invoice to us. A
 * sales invoice is ours to the customer, so the two parties swap places.
 */
const Facsimile = ({ item }: { item: Item }) => {
  const company = companyOf(item.company)?.name || "Our company";
  const own = ourRegistration(item.company);
  const us = { name: own.legalName, gstin: own.gstin, address: own.address };
  const bill = item.original.bill;
  const invoice = item.original.invoice;
  const sale = !bill && !!invoice;
  if (!bill && !invoice && item.original.jv)
    return <JournalNote item={item} company={own.legalName} />;

  const supplier = printedSupplier(item.original);
  const seller = sale
    ? {
        name: own.legalName,
        address: own.address,
        gstin: own.gstin,
        pan: own.gstin.slice(2, 12),
      }
    : {
        name:
          (item.original.vendor !== "—" && item.original.vendor) ||
          item.form.party ||
          supplier.name,
        address: supplier.address,
        gstin: supplier.gstin,
        pan: supplier.pan,
      };
  const customer =
    item.original.customer || invoice?.customer || item.form.party;
  const known = partyNamed(customer);
  const buyer = sale
    ? {
        name: known?.legalName || customer,
        gstin: known?.gstin || "",
        address: known?.address || "",
      }
    : us;

  const doc = bill || invoice;
  const lines: (PrintedLine & { desc: string; amount: number })[] =
    doc?.items ||
    item.form.lines
      .filter((l) => (item.route === "JV" ? l.dr > 0 : true))
      .map((l) => ({
        desc: l.description,
        amount: item.route === "JV" ? l.dr : l.amount,
      }));
  const subTotal = doc?.subTotal ?? lines.reduce((sum, l) => sum + l.amount, 0);
  const taxes = doc?.taxes || {};
  const taxRows = (
    [
      ["CGST", taxes.cgst],
      ["SGST", taxes.sgst],
      ["IGST", taxes.igst],
    ] as const
  ).filter(([, v]) => v != null && v > 0) as [string, number][];
  const rate = subTotal
    ? Math.round((taxRows.reduce((sum, [, v]) => sum + v, 0) / subTotal) * 100)
    : 0;
  const grand =
    doc?.grandTotal ?? subTotal + taxRows.reduce((sum, [, v]) => sum + v, 0);
  const number =
    bill?.supplierInvoiceNo || invoice?.invoiceNo || item.form.invoiceNo;
  const date = bill?.billDate || invoice?.invoiceDate || item.form.date;
  // Where the goods or services were received — the buyer's state.
  const place = STATE_BY_CODE[buyer.gstin.slice(0, 2)] || own.state || "—";

  return (
    <article className={cn(s.paper, s.inv)}>
      <div className={s.head}>
        <div>
          <h3>{seller.name}</h3>
          <div>{seller.address}</div>
          <div>
            GSTIN: {seller.gstin} · PAN: {seller.pan}
          </div>
        </div>
        <div className={s.title}>
          TAX
          <br />
          INVOICE
        </div>
      </div>
      <div className={s.parties}>
        <div>
          <div className={s.k}>Billed to</div>
          <strong>{buyer.name}</strong>
          {buyer.address && <div>{buyer.address}</div>}
          {buyer.gstin && <div>GSTIN: {buyer.gstin}</div>}
        </div>
        <div>
          <div className={s.k}>Invoice no.</div>
          <strong>{number || "—"}</strong>
          <div className={s.k} style={{ marginTop: 6 }}>
            Invoice date
          </div>
          <strong>{printedDate(date) || "—"}</strong>
          <div className={s.k} style={{ marginTop: 6 }}>
            Place of supply
          </div>
          <strong>{place}</strong>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>HSN/SAC</th>
            <th className={s.num}>Qty</th>
            <th className={s.num}>Rate</th>
            <th className={s.num}>Disc.</th>
            <th className={s.num}>Taxable</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>{l.desc}</td>
              <td>{l.hsn || "—"}</td>
              <td className={s.num}>
                {l.qty != null
                  ? `${qtyText(l.qty)} ${l.unit ?? ""}`.trim()
                  : "—"}
              </td>
              <td className={s.num}>{l.rate != null ? inr(l.rate) : "—"}</td>
              <td className={s.num}>—</td>
              <td className={s.num}>{inr(l.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className={s.totals}>
        <tbody>
          <tr>
            <td>Taxable value</td>
            <td className={s.num}>{inr(subTotal)}</td>
          </tr>
          {taxRows.map(([name, v]) => (
            <tr key={name}>
              <td>
                {name} {rate && taxRows.length === 2 ? rate / 2 : rate}%
              </td>
              <td className={s.num}>{inr(v)}</td>
            </tr>
          ))}
          <tr className={s.grand}>
            <td>Invoice total</td>
            <td className={s.num}>₹ {inr(grand)}</td>
          </tr>
        </tbody>
      </table>
      <div className={s.foot}>
        Payment due within 30 days · E. &amp; O.E.
        <br />
        {!sale && (
          <>
            No tax is deducted at source by us. TDS, where applicable under
            Chapter XVII-B, is to be deducted by the buyer and the balance
            remitted.
            <br />
          </>
        )}
        Demo facsimile generated from the bundled sample data — no document was
        sent anywhere.
      </div>
    </article>
  );
};

/**
 * A journal's source is usually an internal note — a depreciation run, an
 * accrual, a reclassification — and not anybody's tax invoice. It is printed
 * as that: our own letterhead, the entries as the note states them, and the
 * narration. Printing it as a TAX INVOICE from "General counterparty" put a
 * vendor and a GSTIN on a document that never had either.
 */
const JournalNote = ({ item, company }: { item: Item; company: string }) => {
  const own = ourRegistration(item.company);
  const jv = item.original.jv!;
  const debit = jv.lines.reduce((sum, l) => sum + (l.dr ?? 0), 0);
  const credit = jv.lines.reduce((sum, l) => sum + (l.cr ?? 0), 0);
  return (
    <article className={cn(s.paper, s.inv)}>
      <div className={s.head}>
        <div>
          <h3>{company}</h3>
          <div>{own.address}</div>
          <div>GSTIN: {own.gstin}</div>
        </div>
        <div className={s.title}>
          JOURNAL
          <br />
          NOTE
        </div>
      </div>
      <div className={s.parties}>
        <div>
          <div className={s.k}>Prepared by</div>
          <strong>{item.original.source.sender || "—"}</strong>
        </div>
        <div>
          <div className={s.k}>Reference</div>
          <strong>{item.form.invoiceNo || item.original.id}</strong>
          <div className={s.k} style={{ marginTop: 6 }}>
            Date
          </div>
          <strong>{printedDate(item.form.date) || "—"}</strong>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Ledger</th>
            <th className={s.num}>Debit</th>
            <th className={s.num}>Credit</th>
          </tr>
        </thead>
        <tbody>
          {jv.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.ledger}</td>
              <td className={s.num}>{l.dr ? inr(l.dr) : "—"}</td>
              <td className={s.num}>{l.cr ? inr(l.cr) : "—"}</td>
            </tr>
          ))}
          <tr className={s.grand}>
            <td>Total</td>
            <td className={s.num}>₹ {inr(debit)}</td>
            <td className={s.num}>₹ {inr(credit)}</td>
          </tr>
        </tbody>
      </table>
      {jv.narration && (
        <div className={s.parties} style={{ borderBottom: "none" }}>
          <div>
            <div className={s.k}>Narration</div>
            <div>{jv.narration}</div>
          </div>
        </div>
      )}
      <div className={s.foot}>
        Internal document — not a tax invoice.
        <br />
        Demo facsimile generated from the bundled sample data — no document was
        sent anywhere.
      </div>
    </article>
  );
};

/* ------------------------------------------------------------ controls */

/** A header control: icon only, no chrome until you reach for it. */
const ViewerAction = ({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    variant="ghost"
    size="icon-sm"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="h-[30px] w-[30px] shrink-0 text-secondary-foreground hover:bg-accent hover:text-foreground disabled:opacity-35 [&_svg]:size-[18px]"
  >
    {children}
  </Button>
);

const ZoomOption = ({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) => (
  <DropdownMenuItem
    role="menuitemradio"
    aria-checked={checked}
    onSelect={onSelect}
    className={cn("gap-2", checked && "font-semibold")}
  >
    <Check
      className={cn("h-3 w-3 shrink-0 text-primary", !checked && "invisible")}
    />
    {children}
  </DropdownMenuItem>
);
