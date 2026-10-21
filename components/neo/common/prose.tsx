import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "@/components/icons";
import { useStore } from "@/components/inbox/v2/store";
import type { NeoRef } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { SourcePill } from "./source-pill";

type Props = {
  text: string;
  onRef: (ref: NeoRef) => void;
  streaming?: boolean;
  className?: string;
};

const CITE = "#neo-ref=";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A cell that holds a figure: ₹, digits, separators, a sign or a %. */
const NUMERIC = /^[-−+]?\s*₹?\s*[\d,]+(\.\d+)?\s*%?$|^[-−]$|^—$/;

const textOf = (node: React.ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : React.isValidElement(node)
        ? textOf((node.props as { children?: React.ReactNode }).children)
        : "";

/**
 * A table in an answer, with a way out of the chat: Copy as CSV puts the
 * rows on the clipboard to paste into Excel or Tally's import.
 */
const Table = ({ children }: { children?: React.ReactNode }) => {
  const ref = useRef<HTMLTableElement>(null);
  const [copied, setCopied] = useState(false);
  // A column of figures aligns right, header and all.
  useLayoutEffect(() => {
    const t = ref.current;
    if (!t?.tHead || !t.tBodies[0]) return;
    const head = t.tHead.rows[0];
    Array.from(head?.cells || []).forEach((th, i) => {
      const cells = Array.from(t.tBodies[0].rows).map((r) => r.cells[i]);
      const num = cells.length > 0 && cells.every((c) => c?.dataset.num);
      if (num) th.dataset.num = "true";
    });
  });
  const copy = () => {
    const rows = Array.from(ref.current?.rows || []).map((r) =>
      Array.from(r.cells)
        .map((c) => {
          const v = c.innerText.trim();
          return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(",")
    );
    void navigator.clipboard?.writeText(rows.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <div className="neo-table not-prose group/table relative my-4 overflow-hidden rounded-lg border border-pi-line">
      <div className="overflow-x-auto">
        <table ref={ref}>{children}</table>
      </div>
      <button
        type="button"
        onClick={copy}
        className="absolute right-1.5 top-1.5 flex h-6 items-center gap-1 rounded-sm bg-background/90 px-1.5 font-sans text-[11px] font-medium text-pi-body opacity-0 shadow-contact transition-opacity hover:text-pi-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border group-hover/table:opacity-100"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy as CSV"}
      </button>
    </div>
  );
};

/**
 * Neo's words, read as prose (19 Oct 2026): Markdown with GitHub tables, set
 * in the reading face. Any record number that appears in the text — a bill,
 * an invoice, an Inbox id — becomes a citation pill that previews the record
 * on hover, so a figure always shows where it came from.
 *
 * Neo's tasks write plain sentences with blank lines between paragraphs; a
 * single line break is kept as a break rather than folded away.
 */
const Prose = ({ text, onRef, streaming, className }: Props) => {
  const state = useStore();

  // Every number a record goes by, longest first so "INB-20421" never
  // matches as "INB-2042".
  const ids = useMemo(() => {
    const map = new Map<string, string>();
    state.items
      .filter((x) => x.company === state.company)
      .forEach((x) => {
        [x.id, x.form.invoiceNo, x.form.voucherNo].forEach((k) => {
          if (k && k.length >= 5 && !map.has(k)) map.set(k, x.id);
        });
      });
    return map;
  }, [state.items, state.company]);

  const source = useMemo(() => {
    let out = text.replace(/([^\n])\n(?!\n|\s*([-*]|\d+\.)\s|\|)/g, "$1  \n");
    if (ids.size) {
      const keys = [...ids.keys()].sort((a, b) => b.length - a.length);
      const re = new RegExp(
        `(^|[\\s(,:;·])(${keys.map(escape).join("|")})(?=$|[\\s),.;:·])`,
        "g"
      );
      out = out.replace(
        re,
        (_, pre: string, k: string) =>
          `${pre}[${k}](${CITE}${encodeURIComponent(ids.get(k)!)})`
      );
    }
    return out;
  }, [text, ids]);

  const components: Components = useMemo(
    () => ({
      a: ({ href, children }) => {
        if (href?.startsWith(CITE)) {
          const itemId = decodeURIComponent(href.slice(CITE.length));
          return (
            <SourcePill
              source={{ label: textOf(children), itemId, target: "open" }}
              onRef={onRef}
            />
          );
        }
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
      table: ({ children }) => <Table>{children}</Table>,
      th: ({ children, style }) => (
        <th style={style} data-num={NUMERIC.test(textOf(children).trim()) || undefined}>
          {children}
        </th>
      ),
      td: ({ children, style }) => (
        <td style={style} data-num={NUMERIC.test(textOf(children).trim()) || undefined}>
          {children}
        </td>
      ),
    }),
    [onRef]
  );

  return (
    <div
      className={cn("neo-prose", streaming && "is-streaming", className)}
      aria-busy={streaming || undefined}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
};

export default Prose;
