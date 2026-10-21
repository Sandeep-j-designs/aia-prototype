import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Maximize2,
  Minimize2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import JournalVoucher from "@/components/inbox/journal";
import { Item, getState, updatePosted } from "./store";
import { ApprovedDetails } from "./record-details";
import Sheet from "./sheet";
import InvoiceSheet from "./invoice-sheet";
import SyncCloud from "./sync/sync-cloud";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Preview from "./preview";
import { DocumentSplitHandle } from "./ui";
import s from "./record-panel.module.css";

type Props = {
  item: Item;
  company: string;
  /** The approved rows of the table it was opened from, in that order. */
  items: Item[];
  /** Where Tally stands on this voucher, for the marker in the toolbar. */
  syncState: React.ComponentProps<typeof SyncCloud>["state"];
  canEdit: boolean;
  onOpen: (id: string) => void;
  /** The full-page editor — still how a non-AP record is edited. */
  onEdit: () => void;
  /** An in-panel edit was kept; the workspace brings Tally level. */
  onEdited: (id: string) => void;
  onDelete: () => void;
  /** Back to the table at full width. */
  onClose: () => void;
};

/** Matches the exit transition in record-panel.module.css. */
const EXIT_MS = 160;

/** One round icon control in the panel's toolbar. */
const ToolButton = ({
  label,
  disabled,
  danger,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className={cn(s.tool, danger && s.danger)}
  >
    {children}
  </button>
);

/**
 * The record's source file, named beside the voucher it was read from so it
 * is always plain that there is one. It is also the switch for the document
 * pane: docked, it opens the record at full width with the document beside
 * it; expanded, it shows or hides the document. A voucher raised by hand
 * says it has none.
 */
const SourceButton = ({
  file,
  open,
  onClick,
}: {
  file?: Item["file"];
  open: boolean;
  onClick: () => void;
}) =>
  file ? (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-pressed={open}
            aria-label={`Source document: ${file.name}`}
            onClick={onClick}
            className={s.source}
          >
            <FileText size={15} aria-hidden />
            <span className={s.sourceName}>{file.name}</span>
          </button>
        </TooltipTrigger>
        {/* The pill gives up its name as the header narrows; the whole of
            it is always one hover away. */}
        <TooltipContent side="bottom" align="start" className="max-w-[360px]">
          <p className="break-words font-semibold">{file.name}</p>
          <p className="text-secondary-foreground">
            {[file.ext?.toUpperCase(), file.size].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1">
            {open ? "Hide the document" : "View it beside the record"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <span className={s.noSource}>No source document</span>
  );

/**
 * An approved record, docked beside the table it was opened from — the table
 * stays where it was, narrowed, with this row lit. The toolbar sits on the
 * panel's grey ground and the voucher on a sheet above it, so the controls
 * never compete with the record.
 *
 * Up and Down move through the approved rows of that table (the keys do the
 * same while focus is in the panel); expand gives the record the full width.
 */
const RecordPanel = ({
  item,
  company,
  items,
  syncState,
  canEdit,
  onOpen,
  onEdit,
  onEdited,
  onDelete,
  onClose,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /*
    A bill reads through its own form: the AP sheet runs in the panel with its
    controls flattened to text, so Edit only gives the controls back — every
    value is already where its field is. The sheet writes as it is edited, so
    the record as it stood is kept to put back on Cancel.
  */
  const inPanel = ["AP", "AR", "JV"].includes(item.route);
  const journal = item.route === "JV";
  const [before, setBefore] = useState<Pick<
    Item,
    "form" | "sheet" | "amount"
  > | null>(null);
  const editing = !!before;
  // A voucher raised by hand has nothing behind it to show.
  const hasDocument = !!item.file.name && !item.created;
  /*
    Seeing the source is not editing it: reading, the document is its own
    switch, held as the user steps from voucher to voucher. Editing at full
    width it is always there to check against, unless put away for that
    edit; afterwards the reading choice comes back. Docked, there is no room
    for paper and form side by side.
  */
  const [sourceOpen, setSourceOpen] = useState(false);
  const [hiddenInEdit, setHiddenInEdit] = useState(false);
  const showDocument =
    expanded && hasDocument && (editing ? !hiddenInEdit : sourceOpen);
  const toggleSource = () => {
    if (!expanded) {
      setExpanded(true);
      setSourceOpen(true);
    } else setSourceOpen((on) => !on);
  };
  const hideSource = () =>
    editing ? setHiddenInEdit(true) : setSourceOpen(false);
  const endEdit = () => setBefore(null);
  /*
    The sheet engine keeps its own copy of the bill. Edit marks it, and Cancel
    asks for it back in place — not a remount, which would blank the sheet
    while it boots and turn the way back into a flash instead of the same
    fade the way in had.
  */
  const tellSheet = (type: "checkpoint" | "restore") =>
    // A journal is React state, put back by the store alone.
    !journal &&
    window.postMessage(
      {
        // Each engine answers its own name; see invoice-sheet.tsx.
        source: item.route === "AR" ? "aia-inbox-ar-v2" : "aia-inbox-v2",
        type,
      },
      location.origin
    );
  useEffect(() => setBefore(null), [item.id]);
  const startEdit = () => {
    if (!inPanel) return onEdit();
    tellSheet("checkpoint");
    setHiddenInEdit(false);
    setBefore(
      structuredClone({
        form: item.form,
        sheet: item.sheet,
        amount: item.amount,
      })
    );
  };
  const cancelEdit = () => {
    if (!before) return;
    updatePosted(item.id, before, "Approved Voucher Edit Cancelled");
    tellSheet("restore");
    endEdit();
  };
  const saveEdit = () => {
    if (!before) return;
    const now = getState().items.find((x) => x.id === item.id);
    const changed =
      !!now &&
      (JSON.stringify(now.form) !== JSON.stringify(before.form) ||
        now.amount !== before.amount);
    endEdit();
    if (changed) onEdited(item.id);
  };
  const at = items.findIndex((x) => x.id === item.id);
  const step = (by: number) => {
    if (editing) return;
    const next = items[at + by];
    if (next) onOpen(next.id);
  };
  // The panel slides out before the table takes its width back.
  const close = () => {
    if (leaving) return;
    setLeaving(true);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.setTimeout(onClose, reduced ? 0 : EXIT_MS);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // An open dialog (the document preview, a delete confirmation) takes
      // Escape for itself.
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        document.querySelector(
          "[role=dialog], [role=alertdialog], dialog[open]"
        )
      )
        return;
      // Escape leaves the edit first, the panel second.
      if (editing) cancelEdit();
      else close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const source = (
    <SourceButton
      file={hasDocument ? item.file : undefined}
      open={showDocument}
      onClick={toggleSource}
    />
  );

  const formContent = journal ? (
    /*
      The journal reads through its edit form too. `readOnly` would swap in
      different markup (no blank lines, plain allocation text), so the form
      always renders editable and the read skin does the rest; edits only
      land while Edit is open.
    */
    <div
      className={cn(
        s.form,
        s.journalForm,
        editing ? s.editingForm : s.reading
      )}
    >
      <header className={s.journalHead}>
        <h1 className={s.recordTitle}>{item.form.voucherNo || "Journal"}</h1>
        {source}
        <span className={s.recordAmount}>
          <span className={s.recordAmountLabel}>Grand total</span>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(item.amount)}
        </span>
      </header>
      <JournalVoucher
        item={item}
        attempted={false}
        readOnly={false}
        onEdit={(patch) => {
          if (!editing) return;
          updatePosted(item.id, {
            form: { ...item.form, ...patch },
          });
        }}
      />
    </div>
  ) : inPanel ? (
    <div className={cn(s.form, editing ? s.editingForm : s.reading)}>
      {/* The record's name, where the form keeps its mode tabs. */}
      <header className={s.recordHead} aria-hidden={editing}>
        <h1 className={s.recordTitle}>
          {item.form.voucherNo || item.form.party}
        </h1>
        {source}
        <span className={s.recordAmount}>
          <span className={s.recordAmountLabel}>Grand total</span>
          {new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
          }).format(item.amount)}
        </span>
      </header>
      {item.route === "AR" ? (
        <InvoiceSheet
          item={item}
          allowEdits={editing}
          onApproved={() => {}}
          onReady={() => {}}
        />
      ) : (
        <Sheet
          item={item}
          noDocument
          allowEdits={editing}
          onApproved={() => {}}
          onReady={() => {}}
        />
      )}
    </div>
  ) : (
    <ApprovedDetails item={item} company={company} />
  );

  return (
    <aside
      aria-label="Approved voucher"
      className={cn(s.panel, expanded && s.expanded, leaving && s.leaving)}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("input, textarea, select, [role=menu]")) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          step(event.key === "ArrowDown" ? 1 : -1);
        }
      }}
    >
      {editing ? (
        <div className={s.toolbar}>
          <h2 className={s.editTitle}>
            {item.route === "AR"
              ? "Edit invoice"
              : journal
                ? "Edit journal"
                : "Edit bill"}
          </h2>
          <div className={s.group}>
            <ToolButton
              label={expanded ? "Show the table" : "Expand to full width"}
              onClick={() => setExpanded((on) => !on)}
            >
              {expanded ? (
                <Minimize2 size={15} aria-hidden />
              ) : (
                <Maximize2 size={15} aria-hidden />
              )}
            </ToolButton>
            <Button variant="outline" className="h-8" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button variant="primary" className="h-8" onClick={saveEdit}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className={s.toolbar}>
          <div className={s.group}>
            <ToolButton
              label="Previous voucher"
              disabled={at <= 0}
              onClick={() => step(-1)}
            >
              <ChevronUp size={16} aria-hidden />
            </ToolButton>
            <ToolButton
              label="Next voucher"
              disabled={at < 0 || at >= items.length - 1}
              onClick={() => step(1)}
            >
              <ChevronDown size={16} aria-hidden />
            </ToolButton>
            <span className={s.divider} aria-hidden />
            <ToolButton
              label="Edit entry"
              disabled={!canEdit}
              onClick={startEdit}
            >
              <Pencil size={15} aria-hidden />
            </ToolButton>
            <ToolButton label="Delete voucher" danger onClick={onDelete}>
              <Trash2 size={15} aria-hidden />
            </ToolButton>
            <span className={s.sync}>
              <SyncCloud className="h-4 w-4" side="bottom" state={syncState} />
            </span>
          </div>
          <div className={s.group}>
            <ToolButton
              label={expanded ? "Show the table" : "Expand to full width"}
              onClick={() => setExpanded((on) => !on)}
            >
              {expanded ? (
                <Minimize2 size={15} aria-hidden />
              ) : (
                <Maximize2 size={15} aria-hidden />
              )}
            </ToolButton>
            <ToolButton label="Close" onClick={close}>
              <X size={16} aria-hidden />
            </ToolButton>
          </div>
        </div>
      )}
      {/*
        The source document sits beside the record, reading or editing — the
        resizable split the review screen gives AR and the journal. AP's sheet
        runs without its own document pane here so every route shares this
        one. The record's panel keeps its place in the tree whether or not the
        document is there, so opening it never reboots the sheet.
      */}
      <ResizablePanelGroup direction="horizontal" className={s.split}>
        {showDocument && (
          <ResizablePanel
            id="document"
            order={1}
            defaultSize={50}
            minSize={18}
            className={s.documentPane}
          >
            <div className={s.documentInner}>
              <Preview item={item} onHide={hideSource} />
            </div>
          </ResizablePanel>
        )}
        {showDocument && <DocumentSplitHandle />}
        {/* Panel forces its own overflow:hidden (to stay measurable while
            dragging) and isn't a flex container, so .scroll's flex:1 has
            nothing to fill — it needs its own height spelled out here to
            actually clip and scroll instead of growing past the panel. */}
        <ResizablePanel
          id="record"
          order={2}
          defaultSize={50}
          minSize={40}
          className="min-w-0"
        >
          {/* Keyed so each voucher opens at its top, not where the last one
              was left. */}
          <div key={item.id} className={cn(s.scroll, "h-full")}>
            <div className={s.sheet}>{formContent}</div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </aside>
  );
};

export default RecordPanel;
