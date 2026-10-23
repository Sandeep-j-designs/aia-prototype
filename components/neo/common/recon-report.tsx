import React, { useEffect, useMemo, useState } from "react";
import type { Cell as XCell, Workbook, Worksheet } from "exceljs";
import { Download, Loader2 } from "@/components/icons";
import type { NeoCard } from "@/types/pages/neo";
import {
  currentVersion,
  exportRecorded,
  inr,
  useRecon,
} from "@/hooks/pages/neo/use-recon";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { keepFile } from "@/utils/pages/neo/attachment-files";
import {
  APPLY_FROM_VIEWER,
  FILL_HEAD,
  FILL_INPUT,
  FILL_LOCKED,
  INK_MUTED,
  INR,
  reportName,
  reportWorkbook,
  saveFile,
  workbookFile,
} from "@/utils/pages/neo/recon-workbook";
import { track } from "@/utils/pages/neo/recon-events";
import { cn } from "@/lib/utils";

type Props = {
  card: Extract<NeoCard, { kind: "recon-report" }>;
};

/*
 * The reconciliation report, viewed inside Neo (21 Oct 2026). It draws the
 * workbook itself — the object the .xlsx is written from — so what is read
 * here is what downloads: the same sheets, cells, formats and yellow input
 * cells. The yellow cells can be edited here as in Excel; Apply sends them
 * through the same checks as an uploaded file, and the reconciliation runs
 * again as a new version. An older version opens read-only.
 */

const LETTERS = (n: number) => {
  let s = "";
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26))
    s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

/** The value a cell shows, formatted the way Excel would show it. */
const shown = (c: XCell) => {
  const raw = c.value as unknown;
  // A formula shows its result; exceljs drops a result of 0.
  const v =
    raw && typeof raw === "object" && "formula" in (raw as object)
      ? ((raw as { result?: unknown }).result ?? 0)
      : raw;
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return c.numFmt === INR ? inr(v) : String(v);
  return String(v);
};

const fillOf = (c: XCell) => {
  const f = c.fill as { fgColor?: { argb?: string } } | undefined;
  switch (f?.fgColor?.argb) {
    case FILL_INPUT:
      return "bg-pi-warning-bg";
    case FILL_HEAD:
      return "bg-pi-fill";
    case FILL_LOCKED:
      return "bg-pi-head-bg";
    default:
      return "";
  }
};

/** Single-row merges ("A1:H1"): where each starts, and what it covers. */
const mergesOf = (ws: Worksheet) => {
  const spans = new Map<string, number>();
  const covered = new Set<string>();
  const col = (s: string) =>
    s.split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
  ((ws.model as { merges?: string[] }).merges || []).forEach((m) => {
    const x = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!x) return;
    const r = Number(x[2]);
    const [a, b] = [col(x[1]), col(x[3])];
    spans.set(`${r}:${a}`, b - a + 1);
    for (let c = a + 1; c <= b; c++) covered.add(`${r}:${c}`);
  });
  return { spans, covered };
};

/** The list an Action or Answer cell offers, from its data validation. */
const listOf = (c: XCell) => {
  const dv = c.dataValidation as { type?: string; formulae?: string[] };
  if (dv?.type !== "list" || !dv.formulae?.[0]) return null;
  return dv.formulae[0].replace(/^"|"$/g, "").split(",");
};

type Edits = Record<string, string>;
const key = (sheet: string, r: number, c: number) => `${sheet}!${r}:${c}`;

/** A sheet's header row, and its Action, Reason and Answer columns. */
const headOf = (w: Worksheet) => {
  for (let r = 1; r <= 8; r++) {
    const at: Record<string, number> = {};
    w.getRow(r).eachCell((c, n) => (at[String(c.value)] = n));
    if (at.Action || at.Answer) return { row: r, at };
  }
  return undefined;
};

const ReconReport = ({ card }: Props) => {
  const { runs } = useRecon();
  const neo = useNeo();
  const run = runs.find((r) => r.id === card.runId);
  const v = run?.versions.find((x) => x.n === card.version);
  const latest = run && currentVersion(run);
  const superseded = !!latest && !!v && latest.n > v.n;
  const editable = !!run && !!v && !superseded && run.execution === "completed";

  const [wb, setWb] = useState<Workbook | null>(null);
  const [sheet, setSheet] = useState("Summary");
  const [edits, setEdits] = useState<Edits>({});
  const [busy, setBusy] = useState<"download" | "apply" | null>(null);

  // The workbook for this version, built once per version.
  useEffect(() => {
    if (!run || !v) return;
    let live = true;
    setWb(null);
    setEdits({});
    reportWorkbook(run, v).then((w) => live && setWb(w));
    return () => {
      live = false;
    };
  }, [run?.id, v?.n]);

  const sheets = useMemo(
    () => (wb ? wb.worksheets.filter((w) => w.state === "visible") : []),
    [wb]
  );
  const ws = sheets.find((w) => w.name === sheet) || sheets[0];
  const valueAt = (w: Worksheet, r: number, c: number) =>
    edits[key(w.name, r, c)] ?? shown(w.getCell(r, c));

  /** Rows with an action and no reason: Apply waits for those (US-06). */
  const missing = useMemo(() => {
    const out: { sheet: string; row: number; col: number; code: string }[] = [];
    sheets.forEach((w) => {
      const h = headOf(w);
      if (!h?.at.Action || !h.at.Reason) return;
      for (let r = h.row + 1; r <= w.rowCount; r++) {
        const a = valueAt(w, r, h.at.Action);
        if (a && a !== "Reopen" && !valueAt(w, r, h.at.Reason).trim())
          out.push({
            sheet: w.name,
            row: r,
            col: h.at.Reason,
            code: shown(w.getCell(r, 1)),
          });
      }
    });
    return out;
  }, [sheets, edits]);

  const changed = Object.entries(edits).filter(([k, val]) => {
    const [name, rc] = k.split("!");
    const [r, c] = rc.split(":").map(Number);
    const w = sheets.find((x) => x.name === name);
    return w && val !== shown(w.getCell(r, c));
  });
  const changedRows = new Set(changed.map(([k]) => k.split(":")[0])).size;

  if (!run || !v) return null;

  const download = async () => {
    if (!wb) return;
    setBusy("download");
    try {
      saveFile(await workbookFile(wb, reportName(run, v)));
      track("report_downloaded", { version: v.n, from: "viewer" });
      exportRecorded(run.id, `Excel report, version ${v.n}`);
    } finally {
      setBusy(null);
    }
  };

  // The edits go into the workbook and back through the file's own path.
  const apply = async () => {
    if (!wb || !changed.length || missing.length) return;
    setBusy("apply");
    try {
      // A fresh copy: this version's own workbook stays as it was.
      const copy = await reportWorkbook(run, v);
      changed.forEach(([k, val]) => {
        const [name, rc] = k.split("!");
        const [r, c] = rc.split(":").map(Number);
        copy.getWorksheet(name)!.getCell(r, c).value = val || null;
      });
      const file = await workbookFile(copy, reportName(run, v, "-edited"));
      keepFile(file);
      setEdits({});
      void neo.startRun(APPLY_FROM_VIEWER, [{ name: file.name }]);
    } finally {
      setBusy(null);
    }
  };

  const bad = new Set(missing.map((m) => key(m.sheet, m.row, m.col)));

  return (
    <div
      className="flex h-full min-h-[480px] flex-col bg-background"
      data-guide-id="recon-report"
    >
      <div className="flex flex-none items-center gap-3 border-b border-pi-line px-4 py-2">
        <p className="min-w-0 flex-1 truncate text-body-4 text-pi-body">
          {superseded
            ? `Version ${v.n} is kept as it was. Version ${latest!.n} is current; make changes there.`
            : editable
              ? "Change the yellow cells here or in Excel. Everything else is locked."
              : "Read-only until the run is complete."}
        </p>
        <button
          type="button"
          onClick={download}
          disabled={!wb || !!busy}
          className="flex h-8 flex-none items-center gap-1.5 rounded-sm border border-pi-line-2 bg-background px-3 text-[12.5px] font-semibold text-pi-ink shadow-contact transition-colors hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-60"
        >
          {busy === "download" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download .xlsx
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        {!ws ? (
          <div className="grid h-40 place-items-center text-pi-body">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <Grid
            ws={ws}
            editable={editable}
            value={(r, c) => valueAt(ws, r, c)}
            onEdit={(r, c, val) =>
              setEdits((e) => ({ ...e, [key(ws.name, r, c)]: val }))
            }
            bad={bad}
          />
        )}
      </div>

      {(changed.length > 0 || missing.length > 0) && (
        <div className="flex flex-none items-center gap-3 border-t border-pi-line bg-background px-4 py-2.5">
          <p className="min-w-0 flex-1 text-[13px] leading-5">
            <span className="font-semibold text-pi-ink">
              {changedRows} row{changedRows === 1 ? "" : "s"} changed
            </span>
            {missing.length > 0 ? (
              <span className="text-pi-danger">
                {" "}
                · {missing.map((m) => m.code).join(", ")}{" "}
                {missing.length === 1 ? "needs" : "need"} a reason
              </span>
            ) : (
              <span className="text-pi-body">
                {" "}
                · makes version {v.n + 1}; version {v.n} is kept
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={() => setEdits({})}
            className="h-8 rounded-sm border border-pi-line-2 bg-background px-3 text-[13px] font-medium text-pi-ink shadow-contact hover:bg-pi-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!!missing.length || !!busy || !!neo.busy}
            className="flex h-8 items-center gap-1.5 rounded-sm border border-pi-btn-primary-edge bg-pi-btn-fill px-3 text-[13px] font-semibold text-primary-foreground hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            {busy === "apply" && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Apply and run again
          </button>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Sheets"
        className="flex flex-none gap-0.5 overflow-x-auto border-t border-pi-line bg-pi-head-bg px-2"
      >
        {sheets.map((w) => {
          const on = w.name === ws?.name;
          const n = changed.filter(([k]) => k.startsWith(`${w.name}!`)).length;
          return (
            <button
              key={w.name}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSheet(w.name)}
              className={cn(
                "-mt-px flex h-9 flex-none items-center gap-1.5 border-t-2 px-3 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                on
                  ? "border-pi-brand bg-background text-pi-ink"
                  : "border-transparent text-pi-body hover:text-pi-ink"
              )}
            >
              {w.name}
              {n > 0 && (
                <span className="rounded-full bg-pi-warning-bg px-1.5 text-[11px] text-pi-warning">
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

type GridProps = {
  ws: Worksheet;
  editable: boolean;
  value: (r: number, c: number) => string;
  onEdit: (r: number, c: number, value: string) => void;
  bad: Set<string>;
};

/** One sheet as a grid: column letters, row numbers, the frozen header. */
const Grid = ({ ws, editable, value, onEdit, bad }: GridProps) => {
  const cols = useMemo(() => {
    const out: { n: number; width: number }[] = [];
    // The widest row decides, not the declared columns.
    let count = ws.columnCount;
    ws.eachRow((row) => (count = Math.max(count, row.cellCount)));
    for (let n = 1; n <= count; n++) {
      const col = ws.getColumn(n);
      if (!col.hidden)
        out.push({ n, width: Math.round((col.width || 10) * 7 + 10) });
    }
    return out;
  }, [ws]);
  const { spans, covered } = useMemo(() => mergesOf(ws), [ws]);
  const frozen =
    (ws.views?.[0] as { ySplit?: number } | undefined)?.ySplit || 0;
  const rows = Array.from({ length: ws.rowCount }, (_, i) => i + 1);

  return (
    <table
      style={{ width: 40 + cols.reduce((n, c) => n + c.width, 0) }}
      className="table-fixed border-separate border-spacing-0 text-[12.5px] leading-[18px] text-pi-ink"
    >
      <colgroup>
        <col style={{ width: 40 }} />
        {cols.map((c) => (
          <col key={c.n} style={{ width: c.width }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="sticky left-0 top-0 z-30 h-6 border-b border-r border-pi-line bg-pi-head-bg" />
          {cols.map((c) => (
            <th
              key={c.n}
              className="sticky top-0 z-20 h-6 border-b border-r border-pi-line bg-pi-head-bg text-[11px] font-medium text-pi-body"
            >
              {LETTERS(c.n)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const head = r === frozen;
          return (
            <tr key={r}>
              <th
                className={cn(
                  "sticky left-0 z-10 border-b border-r border-pi-line bg-pi-head-bg px-1 text-right text-[11px] font-medium tabular-nums text-pi-body",
                  head && "top-6 z-[25]"
                )}
              >
                {r}
              </th>
              {cols.map((col) => {
                const k = `${r}:${col.n}`;
                if (covered.has(k)) return null;
                const span = spans.get(k);
                const wide = span
                  ? cols.filter((x) => x.n >= col.n && x.n < col.n + span)
                      .length
                  : 1;
                const c = ws.getCell(r, col.n);
                const font = c.font || {};
                const input =
                  editable &&
                  (c.protection as { locked?: boolean } | undefined)?.locked ===
                    false;
                const list = input ? listOf(c) : null;
                const val = value(r, col.n);
                const num =
                  typeof c.value === "number" ||
                  c.numFmt === INR ||
                  !!(
                    c.value &&
                    typeof c.value === "object" &&
                    "formula" in c.value
                  );
                const wrap = !!c.alignment?.wrapText;
                const id = `${ws.name}!${r}:${col.n}`;
                // As in Excel, text runs on into empty cells to its right.
                const after = cols.find((x) => x.n >= col.n + (span || 1));
                const spill = !wrap && !num && (!after || !value(r, after.n));
                return (
                  <td
                    key={col.n}
                    colSpan={wide > 1 ? wide : undefined}
                    className={cn(
                      "border-b border-r border-pi-line px-2 py-1 align-top",
                      fillOf(c),
                      font.bold && "font-semibold",
                      (font.size || 10) >= 14 && "text-[15px]",
                      font.color?.argb === INK_MUTED && "text-pi-body",
                      num && "text-right tabular-nums",
                      wrap ? "whitespace-pre-wrap" : "whitespace-nowrap",
                      head && "sticky top-6 z-[15]",
                      input && "p-0",
                      bad.has(id) &&
                        "outline outline-1 -outline-offset-1 outline-pi-danger"
                    )}
                  >
                    {input ? (
                      list ? (
                        <select
                          value={val}
                          onChange={(e) => onEdit(r, col.n, e.target.value)}
                          aria-label={`Row ${r}, column ${LETTERS(col.n)}`}
                          className="h-full min-h-[26px] w-full cursor-pointer bg-transparent px-1.5 text-[12.5px] text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pi-brand"
                        >
                          <option value="">—</option>
                          {list.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={val}
                          onChange={(e) => onEdit(r, col.n, e.target.value)}
                          aria-label={`Row ${r}, column ${LETTERS(col.n)}`}
                          placeholder={
                            bad.has(id) ? "A reason is required" : ""
                          }
                          className="h-full min-h-[26px] w-full bg-transparent px-2 text-[12.5px] text-pi-ink placeholder:text-pi-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pi-brand"
                        />
                      )
                    ) : (
                      <span
                        className={cn(
                          "block",
                          !wrap && !spill && "truncate",
                          spill && "relative z-[1] overflow-visible"
                        )}
                      >
                        {val}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ReconReport;
