import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  AlertTriangle,
  Ban,
  Check,
  ChevronRight,
  FileStack,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Scissors,
  X,
} from "lucide-react";
import type {
  SplitPacket,
  SplitPage,
  SplitPlan,
} from "@/types/pages/inbox/bill-splitter";
import {
  BILL_PAGE_LIMIT,
  applyEdit,
  billNames,
  billsOf,
  groupsOf,
  manualStarts,
  partsOf,
  rangeLabel,
  renameBill,
  type SplitEdit,
  type SplitGroup,
} from "@/utils/pages/inbox/bill-splitter";
import { splitPackets } from "@/hooks/pages/inbox/use-split-packets";
import { PdfGlyph } from "./glyphs";
import s from "./split-dialogs.module.css";

/**
 * Review split — Bill Upload's dialog, carried over as it looks and works
 * there (~/AI Accountant/Prototypes/Bill Upload, `paintSplit`).
 *
 * Left, the document: Read shows every page at reading size with the
 * boundary between each pair stated on the boundary; Overview groups the
 * pages by the bill they belong to. Right, the rail: the bills this will
 * create, by file name, with anything waiting on a decision pinned on top.
 * There is one place to change a boundary — the document — and the rail is
 * where the result is checked and named.
 */

const PdfDocument = dynamic(
  () => import("./pdf-pages").then((m) => m.PdfDocument),
  { ssr: false }
);
const PdfPage = dynamic(() => import("./pdf-pages").then((m) => m.PdfPage), {
  ssr: false,
});

/** Zoom steps, as percentages of a 620px page; Fit is a mode, not a step. */
const ZOOMS = [50, 75, 100, 125, 150, 200, 250];
const PAGE_BASE = 620;
const OVERVIEW_TILE = 164;

type Props = {
  packet: SplitPacket | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (packet: SplitPacket, plan: SplitPlan) => void;
};

const cx = (...names: (string | false | null | undefined)[]) =>
  names
    .filter(Boolean)
    .map((name) => s[name as string])
    .join(" ");

/** The start page a page's bill begins on. */
const startOf = (plan: SplitPlan, n: number) =>
  [...plan.starts]
    .sort((a, b) => a - b)
    .reduce((found, start) => (start <= n ? start : found), plan.starts[0]);

/** The only question this screen can ask: where one bill ends. */
const askOf = (plan: SplitPlan, group: SplitGroup) =>
  plan.uncertain.some((n) => group.pages.includes(n))
    ? "Could go either way"
    : null;

/** Drawn stationery, for a packet the prototype holds no bytes for. */
const Proxy = ({ page }: { page: SplitPage }) => {
  const line = (width: number) => (
    <span className={cx("pg__ln")} style={{ width: `${width}%` }} />
  );
  if (page.kind === "blank") return <div className={cx("vpage__proxy")} />;
  return page.kind === "start" ? (
    <div className={cx("vpage__proxy")}>
      <span className={cx("pg__hd")} />
      <span className={cx("pg__sub")} />
      <div className={cx("pg__rule")} />
      {line(88)}
      <div className={cx("pg__tbl")} />
      {line(70)}
    </div>
  ) : (
    <div className={cx("vpage__proxy")}>
      {line(46)}
      <div className={cx("pg__rule")} />
      <div className={cx("pg__tbl")} />
      {line(78)}
      {line(64)}
      <span className={cx("pg__tot")} />
    </div>
  );
};

const SplitReviewDialog = ({ packet, onOpenChange, onCreate }: Props) => {
  const [plan, setPlan] = useState<SplitPlan | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [view, setView] = useState<"read" | "over">("read");
  const [zoom, setZoom] = useState<"fit" | number>("fit");
  const [sel, setSel] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [paneWidth, setPaneWidth] = useState(900);
  const observer = useRef<ResizeObserver | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  const railList = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPlan(packet?.plan ? structuredClone(packet.plan) : null);
    setFile(null);
    setView("read");
    setZoom("fit");
    setSel(null);
    setEditing(null);
    if (packet && !packet.sample)
      void splitPackets.file(packet.id).then(setFile);
  }, [packet?.id]);

  // The page width is a property of the pane, so it is measured, not assumed.
  const scrollRef = useCallback((el: HTMLDivElement | null) => {
    observer.current?.disconnect();
    scroller.current = el;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setPaneWidth(el.clientWidth));
    ro.observe(el);
    observer.current = ro;
    setPaneWidth(el.clientWidth);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  // Read and Overview are different documents; each opens at its top.
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [view]);

  if (!packet || !plan) return null;

  const fitPx = Math.max(360, Math.min(1000, paneWidth - 48));
  const effPct = zoom === "fit" ? Math.round((fitPx / PAGE_BASE) * 100) : zoom;
  const pageWidth =
    zoom === "fit" ? fitPx : Math.round((PAGE_BASE * zoom) / 100);

  const groups = groupsOf(plan);
  const bills = billsOf(plan);
  const nPages = plan.pages.length;
  const nOut = plan.excluded.length;
  const index = new Map(
    bills.map((g, i) => [g.start, String(i + 1).padStart(2, "0")])
  );
  const names = billNames(plan);
  const mine = manualStarts(plan);
  const mineCount = bills.filter((g) => mine.includes(g.start)).length;
  const asks = bills.filter((g) => askOf(plan, g));
  const ready = bills.filter((g) => !askOf(plan, g));
  const blocked = asks.length > 0 || bills.length === 0;

  const commit = (next: SplitPlan) => {
    setPlan(next);
    splitPackets.savePlan(packet.id, next);
  };
  const edit = (change: SplitEdit) => commit(applyEdit(plan, change));

  const scrollToPage = (n: number) => {
    const el = document.getElementById(`split-page-${n}`);
    const sc = scroller.current;
    if (el && sc) sc.scrollTop = el.offsetTop - sc.offsetTop - 8;
  };
  const scrollToBand = (start: number) => {
    const el = document.getElementById(`split-band-${start}`);
    const sc = scroller.current;
    if (el && sc) sc.scrollTop = Math.max(0, el.offsetTop - sc.offsetTop - 8);
  };
  /** Selecting a bill moves the document to it. */
  const open = (start: number) => {
    setSel(start);
    setEditing(null);
    if (view === "read") scrollToPage(start);
    else scrollToBand(start);
  };
  const focusPage = (n: number) => {
    setSel(startOf(plan, n));
    setView("read");
    // After the view switch has reset the scroll, not before it.
    window.setTimeout(() => scrollToPage(n), 60);
  };
  const nextAsk = () => {
    if (!asks.length) return;
    const current = asks.findIndex((g) => g.start === sel);
    const next = asks[(current + 1) % asks.length];
    setSel(next.start);
    scrollToBand(next.start);
  };
  const mergeInto = (start: number) => {
    const prev = [...plan.starts]
      .filter((x) => x < start)
      .sort((a, b) => b - a)[0];
    return prev == null ? null : (index.get(prev) ?? null);
  };

  /* ------------------------------------------------------------ reader */

  const viewPage = (page: SplitPage) => {
    const n = page.n;
    const excluded = plan.excluded.includes(n);
    const auto = plan.autoExcluded.includes(n);
    const unsure = plan.uncertain.includes(n);
    const start = plan.starts.includes(n);
    const selected = sel != null && sel === startOf(plan, n);
    return (
      <div
        key={`p${n}`}
        id={`split-page-${n}`}
        className={cx(
          "vpage",
          unsure && "is-maybe",
          excluded && "is-excluded",
          selected && "is-sel"
        )}
      >
        <div className={cx("vpage__head")}>
          {!excluded && start && index.get(n) && (
            <span
              className={cx("vpage__i", "num")}
              role="img"
              title={`Bill ${index.get(n)} starts on this page`}
              aria-label={`Bill ${index.get(n)} starts on this page`}
            >
              {index.get(n)}
            </span>
          )}
          <span className={cx("vpage__no")}>Page {n}</span>
          {unsure && (
            <span className={cx("vpage__flag")}>Start of a new bill?</span>
          )}
          {excluded && (
            <span className={cx("vpage__flag", "is-out")}>
              {auto ? "Blank, left out for you" : "Left out"}
            </span>
          )}
          <button
            type="button"
            className={cx("vpage__b")}
            aria-label={excluded ? `Put page ${n} back` : `Leave page ${n} out`}
            onClick={() =>
              edit({ type: excluded ? "restore" : "exclude", page: n })
            }
          >
            {excluded ? (
              <RefreshCw className="h-[13px] w-[13px]" />
            ) : (
              <Ban className="h-[13px] w-[13px]" />
            )}
            {excluded ? "Put back" : "Leave out"}
          </button>
        </div>
        <div className={cx("vpage__paper")}>
          {file ? (
            <PdfPage page={n} width={pageWidth} />
          ) : (
            <Proxy page={page} />
          )}
        </div>
      </div>
    );
  };

  /** The boundary between two pages, stated on the boundary. */
  const splitBar = (n: number) => {
    const on = plan.starts.includes(n);
    const ai = plan.suggestedStarts.includes(n);
    const note = on ? (ai ? "AI suggested" : "you added this") : "";
    const into = on ? mergeInto(n) : null;
    const act = into ? `Merge into bill ${into}` : "Merge into the bill above";
    return (
      <div key={`b${n}`} className={cx("sbar", on && "is-on")}>
        <span className={cx("sbar__ln")} />
        <button
          type="button"
          className={cx("sbar__b")}
          aria-pressed={on}
          title={
            on
              ? `${into ? `Merge these pages into bill ${into}` : "Merge these pages into the bill above"}. The two become one bill.`
              : `Start a new bill at page ${n}`
          }
          aria-label={
            on
              ? `${act}. A new bill starts at page ${n}.`
              : `Start a new bill at page ${n}`
          }
          onClick={() => edit({ type: on ? "merge" : "split", page: n })}
        >
          <span className={cx("sbar__s")}>
            {on ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <b>{on ? "New bill starts here" : "Split here"}</b>
            {note && <span className={cx("sbar__n")}>· {note}</span>}
          </span>
          {on && (
            <span className={cx("sbar__a")} aria-hidden>
              <Minus className="h-3.5 w-3.5" />
              <b>{act}</b>
            </span>
          )}
        </button>
        <span className={cx("sbar__ln")} />
      </div>
    );
  };

  const readPane = (
    <>
      {!plan.excluded.includes(1) && (
        <div className={cx("sbar")}>
          <span className={cx("sbar__ln")} />
          <span className={cx("sbar__f")}>Page 1 always starts a bill</span>
          <span className={cx("sbar__ln")} />
        </div>
      )}
      {plan.pages.flatMap((page, i) =>
        i < plan.pages.length - 1
          ? [viewPage(page), splitBar(page.n + 1)]
          : [viewPage(page)]
      )}
    </>
  );

  /* ---------------------------------------------------------- overview */

  const ovTile = (group: SplitGroup | null, n: number) => {
    const excluded = plan.excluded.includes(n);
    const auto = plan.autoExcluded.includes(n);
    const isStart = group && n === group.start;
    const into = isStart ? mergeInto(n) : null;
    const boundary =
      n === 1 ? (
        <span className={cx("ovp__rule")} title="Page 1 always starts a bill">
          Starts a bill
        </span>
      ) : isStart ? (
        <button
          type="button"
          className={cx("ovp__act", into && "ovp__act--merge")}
          aria-label={
            into
              ? `Merge into bill ${into}`
              : `Merge page ${n} into the bill above`
          }
          onClick={() => edit({ type: "merge", page: n })}
        >
          {into ? `Merge into ${into}` : "Merge up"}
        </button>
      ) : (
        <button
          type="button"
          className={cx("ovp__act")}
          title="Start a new bill at this page"
          aria-label={`Start a new bill at page ${n}`}
          onClick={() => edit({ type: "split", page: n })}
        >
          Split here
        </button>
      );
    return (
      <div key={n} className={cx("ovp", excluded && "is-excluded")}>
        <button
          type="button"
          className={cx("ovp__see")}
          title={`Open page ${n} in the reader`}
          aria-label={`Open page ${n} in the reader`}
          onClick={() => focusPage(n)}
        >
          <span className={cx("ovp__crop")}>
            {file ? (
              <PdfPage page={n} width={OVERVIEW_TILE} />
            ) : (
              <span className={cx("ovp__blank")}>no preview</span>
            )}
          </span>
          <span className={cx("ovp__n", "num")}>{n}</span>
          {excluded && (
            <span className={cx("ovp__out")}>
              {auto ? "Blank" : "Left out"}
            </span>
          )}
        </button>
        <div className={cx("ovp__bar")}>
          {excluded ? (
            <button
              type="button"
              className={cx("ovp__act", "ovp__act--back")}
              aria-label={`Put page ${n} back`}
              onClick={() => edit({ type: "restore", page: n })}
            >
              <RefreshCw className="h-3 w-3" />
              Put back
            </button>
          ) : (
            <>
              {boundary}
              <button
                type="button"
                className={cx("ovp__act", "ovp__act--out")}
                title={`Leave page ${n} out of every bill`}
                aria-label={`Leave page ${n} out of every bill`}
                onClick={() => edit({ type: "exclude", page: n })}
              >
                <Ban className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const orphans = plan.pages
    .map((p) => p.n)
    .filter((n) => !bills.some((g) => g.pages.includes(n)));

  const overviewPane = !bills.length ? (
    <div className={cx("spstate")}>
      <span className={cx("spstate__ico")} aria-hidden>
        <FileStack className="h-5 w-5" />
      </span>
      <p className={cx("spstate__h")}>Every page is left out</p>
      <p className={cx("spstate__p")}>
        Nothing will be created from this file. Put a page back to start a bill
        again.
      </p>
      <div className={cx("spstate__acts")}>
        <button
          type="button"
          className={cx("btn", "btn--outline", "btn--xs")}
          onClick={() => setView("read")}
        >
          Back to the pages
        </button>
      </div>
    </div>
  ) : (
    <div className={cx("ov")}>
      {bills.map((g) => {
        const page = plan.pages[g.start - 1];
        const ask = askOf(plan, g);
        return (
          <section
            key={g.start}
            id={`split-band-${g.start}`}
            className={cx("ovg", ask && "is-ask", sel === g.start && "is-sel")}
            aria-label={`Bill ${index.get(g.start)}, ${page?.vendor ?? "vendor not read"}, ${rangeLabel(g.kept)}`}
          >
            <header className={cx("ovg__h")}>
              <span className={cx("ovg__id")}>
                <span className={cx("ovg__i", "num")}>
                  {index.get(g.start)}
                </span>
                <span className={cx("ovg__r", "num")}>
                  {page?.invoiceNo ?? "—"}
                </span>
              </span>
              <span className={cx("ovg__v")}>{page?.vendor ?? "—"}</span>
            </header>
            <div className={cx("ovg__pages")}>
              {g.pages.map((n) => ovTile(g, n))}
            </div>
            {ask && (
              <button
                type="button"
                className={cx("ovg__a")}
                title="Settle this in the list"
                onClick={() => open(g.start)}
              >
                {ask}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </section>
        );
      })}
      {!!orphans.length && (
        <section
          className={cx("ovg", "ovg--out")}
          aria-label="Pages not in any bill"
        >
          <header className={cx("ovg__h")}>
            <span className={cx("ovg__k")}>Not in any bill</span>
          </header>
          <div className={cx("ovg__pages")}>
            {orphans.map((n) => ovTile(null, n))}
          </div>
        </section>
      )}
    </div>
  );

  /* -------------------------------------------------------------- rail */

  const line = (g: SplitGroup) => {
    const page = plan.pages[g.start - 1];
    const ask = askOf(plan, g);
    const parts = partsOf(g.kept);
    const unsure = plan.uncertain.filter((n) => g.pages.includes(n));
    const isEditing = editing === g.start;
    const fname = names.get(g.start) || "bill";

    const meta = (
      <span className={cx("irow__meta")}>
        <span
          className={cx("irow__v", !page?.vendor && "is-none")}
          title={page?.vendor}
        >
          {page?.vendor ?? "Vendor not read"}
        </span>
        {ask && (
          <>
            <span className={cx("irow__dot")} aria-hidden>
              ·
            </span>
            <span className={cx("irow__a")}>{ask}</span>
          </>
        )}
        {mine.includes(g.start) && (
          <>
            <span className={cx("irow__dot")} aria-hidden>
              ·
            </span>
            <span className={cx("irow__m")}>Split by you</span>
          </>
        )}
        <span className={cx("irow__dot")} aria-hidden>
          ·
        </span>
        <span className={cx("irow__p")}>{rangeLabel(g.kept)}</span>
      </span>
    );

    return (
      <div
        key={g.start}
        className={cx(
          "irow",
          ask && "is-ask",
          isEditing && "is-open",
          sel === g.start && "is-sel"
        )}
      >
        {isEditing ? (
          <>
            <div className={cx("irow__hit", "is-edit")}>
              <span className={cx("irow__i", "num")}>{index.get(g.start)}</span>
              <span className={cx("irow__body")}>
                <span className={cx("iname")}>
                  <input
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    className={cx("iname__i")}
                    defaultValue={fname}
                    placeholder="Name this bill"
                    autoComplete="off"
                    aria-label="Bill name"
                    onChange={(e) =>
                      commit(renameBill(plan, g.start, e.target.value))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditing(null);
                    }}
                  />
                  <span className={cx("iname__fix")}>.pdf</span>
                </span>
                {meta}
              </span>
            </div>
            <button
              type="button"
              className={cx("irow__ren", "is-done")}
              onClick={() => setEditing(null)}
            >
              Done
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={cx("irow__hit")}
              onClick={() => open(g.start)}
            >
              <span className={cx("irow__i", "num")}>{index.get(g.start)}</span>
              <span className={cx("irow__body")}>
                <span className={cx("irow__f")}>{fname}.pdf</span>
                {meta}
              </span>
            </button>
            <button
              type="button"
              className={cx("irow__ren")}
              aria-label={`Rename ${fname}.pdf`}
              onClick={() => {
                setEditing(g.start);
                setSel(g.start);
                if (view === "read") scrollToPage(g.start);
              }}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
        {(unsure.length > 0 || parts.length > 1) && (
          <div className={cx("irow__more")}>
            {unsure.map((n) => (
              <div key={n} className={cx("iask")}>
                <p className={cx("iask__q")}>
                  <strong>Page {n}</strong> could belong to this bill, or start
                  the next one. The document does not say.
                </p>
                <div className={cx("iask__acts")}>
                  <button
                    type="button"
                    className={cx("btn", "btn--solid", "btn--xs")}
                    onClick={() =>
                      edit({ type: "answer", page: n, startsNewBill: true })
                    }
                  >
                    <Scissors className="h-3 w-3" />
                    It starts a new bill
                  </button>
                  <button
                    type="button"
                    className={cx("btn", "btn--outline", "btn--xs")}
                    onClick={() =>
                      edit({ type: "answer", page: n, startsNewBill: false })
                    }
                  >
                    It belongs here
                  </button>
                </div>
              </div>
            ))}
            {parts.length > 1 && (
              <p className={cx("iedit__note")}>
                {g.kept.length} pages is over the {BILL_PAGE_LIMIT}-page limit,
                so this is created as {parts.length} ordered parts of the same
                bill.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  const document_ = (
    <div className={cx("spv__doc")}>
      <div className={cx("spv__bar")}>
        <span className={cx("filechip")} aria-hidden>
          <PdfGlyph />
        </span>
        <div className="min-w-0">
          <p className={cx("spv__name")}>{packet.fileName}</p>
          <p className={cx("spv__sub")}>
            {nPages} {nPages === 1 ? "page" : "pages"}
            {nOut ? ` · ${nOut} left out` : ""}
          </p>
        </div>
        {view === "over" && asks.length > 0 && (
          <button
            type="button"
            className={cx("ovjump")}
            title="Go to the next bill that is waiting on you"
            aria-label={`Go to the next of ${asks.length} bills waiting on you`}
            onClick={nextAsk}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {asks.length} waiting on you
            <ChevronRight className="h-3 w-3" />
          </button>
        )}
        <div className={cx("seg")} role="group" aria-label="View">
          <button
            type="button"
            className={cx("seg__b", view === "read" && "is-on")}
            aria-pressed={view === "read"}
            onClick={() => setView("read")}
          >
            Read
          </button>
          <button
            type="button"
            className={cx("seg__b", view === "over" && "is-on")}
            aria-pressed={view === "over"}
            onClick={() => setView("over")}
          >
            Overview
          </button>
        </div>
        {view === "read" && (
          <div className={cx("zoom")}>
            <button
              type="button"
              className={cx("zoom__b")}
              aria-label="Zoom out"
              disabled={effPct <= ZOOMS[0]}
              onClick={() => {
                const next = [...ZOOMS].reverse().find((z) => z < effPct - 1);
                if (next !== undefined) setZoom(next);
              }}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className={cx("zoom__n", "num", zoom === "fit" && "is-on")}
              title="Fit the page to the pane"
              aria-pressed={zoom === "fit"}
              onClick={() => setZoom("fit")}
            >
              {zoom === "fit" ? "Fit" : `${zoom}%`}
            </button>
            <button
              type="button"
              className={cx("zoom__b")}
              aria-label="Zoom in"
              disabled={effPct >= ZOOMS[ZOOMS.length - 1]}
              onClick={() => {
                const next = ZOOMS.find((z) => z > effPct + 1);
                if (next !== undefined) setZoom(next);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
      <div
        ref={scrollRef}
        className={cx("spv__scroll")}
        style={{ ["--pw" as string]: `${pageWidth}px` }}
      >
        {view === "read" ? readPane : overviewPane}
      </div>
    </div>
  );

  const rail = (
    <aside className={cx("rail2")}>
      <div className={cx("rail2__top")}>
        <div className={cx("rail2__h")}>
          <span className={cx("rail2__k")}>Current split</span>
          <span className={cx("rail2__pill")}>
            AI proposed{mineCount ? ` · ${mineCount} by you` : ""}
          </span>
        </div>
        <p className={cx("rail2__t")}>
          {bills.length} {bills.length === 1 ? "bill" : "bills"} from {nPages}{" "}
          pages
        </p>
      </div>
      <div ref={railList} className={cx("rail2__list")}>
        {bills.length ? (
          <>
            {asks.length > 0 && (
              <p className={cx("grp")}>
                Waiting on you
                <span className={cx("grp__n", "num")}>{asks.length}</span>
              </p>
            )}
            {asks.map(line)}
            {ready.map(line)}
          </>
        ) : (
          <p className={cx("split-empty")}>
            Every page is left out. Put one back to create a bill.
          </p>
        )}
      </div>
    </aside>
  );

  return (
    <DialogPrimitive.Root open onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={cx("scope", "scrim")}>
          <DialogPrimitive.Content
            className={cx("modal", "modal--wide")}
            aria-describedby={undefined}
            // Focus lands on the dialog, not its first control: a ringed ×
            // on open reads as a selection nobody made.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
            }}
          >
            <div className={cx("modal__head")}>
              <DialogPrimitive.Title className={cx("modal__title")}>
                Review split — {packet.fileName}
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className={cx("modal__x")}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
            <div className={cx("split-body")}>
              {file ? (
                <PdfDocument
                  file={file}
                  fallback={
                    <div className={cx("spstate")}>
                      <p className={cx("spstate__h")}>
                        The pages couldn’t be drawn
                      </p>
                      <p className={cx("spstate__p")}>
                        The split still works from the list on the right.
                      </p>
                    </div>
                  }
                >
                  {document_}
                </PdfDocument>
              ) : (
                document_
              )}
              {rail}
            </div>
            <div className={cx("modal__foot")}>
              <p className={cx("modal__note")}>
                {asks.length > 0 ? (
                  <>
                    <strong style={{ color: "var(--warning)" }}>
                      {asks.length}{" "}
                      {asks.length === 1 ? "bill is" : "bills are"} waiting on
                      you.
                    </strong>{" "}
                    Settle {asks.length === 1 ? "it" : "them"} at the top of the
                    list.
                  </>
                ) : bills.length === 0 ? (
                  <>
                    <strong style={{ color: "var(--danger)" }}>
                      No pages left in a bill.
                    </strong>{" "}
                    Put a page back to continue.
                  </>
                ) : null}
              </p>
              <span className={cx("sp")} />
              <button
                type="button"
                className={cx("btn", "btn--solid")}
                disabled={blocked}
                onClick={() => onCreate(packet, plan)}
              >
                {bills.length
                  ? `Create ${bills.length} ${bills.length === 1 ? "bill" : "bills"}`
                  : "Create bills"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Overlay>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default SplitReviewDialog;
