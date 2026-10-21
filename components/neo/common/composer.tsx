import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUp,
  FileStack,
  FileText,
  Plus,
  Slash,
  Square,
  Upload,
  X,
} from "@/components/icons";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { NEO_COMMANDS } from "@/config/pages/neo/suggestions";
import type { NeoAttachment, NeoDecisionItem } from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { EDIT_LAST_EVENT, useLiveMessage } from "./thread";
import { QuestionsInBox } from "./message";

type Props = {
  value: string;
  busy: boolean;
  attachments: NeoAttachment[];
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttachFiles: (files: FileList) => void;
  onAttachSample: () => void;
  onRemoveAttachment: (name: string) => void;
  /** "page" is the wider box on Neo's page; "panel" the docked one. */
  variant?: "panel" | "page";
  placeholder?: string;
  /** Sits in the toolbar beside +: what "this" is (the context pill). */
  context?: React.ReactNode;
  /** The box sits near the top (Neo's empty home): the / menu opens below. */
  menuBelow?: boolean;
};

type Pick = { id: string; label: string; hint?: string; insert: string };

/**
 * Where you ask (19 Oct 2026, the chat apps' prompt box): the text on top,
 * growing as you write; a toolbar underneath with + for reports, what Neo
 * is looking at, and send — which becomes stop while Neo works.
 *
 * / at the start offers Neo's jobs. ↑ in an empty box edits your last
 * request. Enter sends, Shift+Enter breaks the line.
 *
 * Reports go in here too: + attaches files (or the prototype's sample
 * reports), they sit as tiles above the text, and they go with the message.
 */
const Composer = forwardRef<HTMLTextAreaElement, Props>(
  (
    {
      value,
      busy,
      attachments,
      onChange,
      onSend,
      onStop,
      onAttachFiles,
      onAttachSample,
      onRemoveAttachment,
      variant = "panel",
      placeholder,
      context,
      menuBelow,
    },
    ref
  ) => {
    const neo = useNeo();
    const live = useLiveMessage(neo);
    const [typed, setTyped] = useState<{ text: string; n: number }>();
    const [openQ, setOpenQ] = useState<NeoDecisionItem>();
    // Neo is waiting on the person, not working: a question or a sign-off.
    const answering = !!neo.textAsk;
    const signOff = live?.actions?.find((a) => a.primary);
    const [menu, setMenu] = useState(false);
    const [caret, setCaret] = useState(0);
    const [active, setActive] = useState(0);
    const [dismissed, setDismissed] = useState<string | null>(null);
    const file = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => field.current as HTMLTextAreaElement);

    useEffect(() => {
      if (!menu) return;
      const close = (e: MouseEvent) => {
        if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
      };
      window.addEventListener("mousedown", close);
      return () => window.removeEventListener("mousedown", close);
    }, [menu]);

    // What the caret is in the middle of: "/re" at the start.
    const before = value.slice(0, caret);
    const command = before.match(/^\/(\w*)$/);
    const trigger = command ? `/${command[1]}` : null;
    const picks: Pick[] = useMemo(() => {
      if (command) {
        const q = command[1].toLowerCase();
        return NEO_COMMANDS.filter(
          (c) => c.cmd.startsWith(q) || c.label.toLowerCase().includes(q)
        ).map((c) => ({
          id: c.cmd,
          label: c.label,
          hint: `/${c.cmd}`,
          insert: c.prompt,
        }));
      }
      return [];
    }, [command]);
    const open = !!trigger && trigger !== dismissed && picks.length > 0;
    useEffect(() => setActive(0), [trigger]);

    const choose = (p: Pick) => {
      const f = field.current;
      const next = p.insert + value.slice(caret);
      const at = p.insert.length;
      onChange(next);
      setCaret(at);
      window.setTimeout(() => {
        f?.focus();
        f?.setSelectionRange(at, at);
      }, 0);
    };

    const canSend = answering
      ? !!value.trim()
      : !!value.trim() || attachments.length > 0;
    const placeholderText = null;
    const page = variant === "page";

    // Neo is asking: its questions rise out of the top of the prompt box,
    // joined to it, and the box stays. Typing there answers the open
    // question in your own words, as "Something else".
    const asking = live?.card?.kind === "decisions" ? live : undefined;
    const sendTyped = () => {
      if (!asking || !value.trim() || !openQ?.other) return;
      setTyped((t) => ({ text: value.trim(), n: (t?.n || 0) + 1 }));
      onChange("");
    };

    return (
      <div className={cn("flex-none", !page && "bg-background px-4 pb-3 pt-2")}>
        {asking && (
          <div
            className={cn(
              "max-h-[60vh] overflow-y-auto rounded-t-2xl border border-b-0 border-pi-line bg-background duration-200 animate-in fade-in-0 slide-in-from-bottom-3 motion-reduce:animate-none",
              "[&>section]:rounded-none [&>section]:border-0 [&>section]:shadow-none",
              page ? "mx-3 shadow-pi-2" : "mx-2 shadow-pi-1"
            )}
          >
            <QuestionsInBox
              m={asking}
              onAnswer={(v) => neo.answer(asking.id, v)}
              onEditCard={(card) => neo.editCard(asking.id, card)}
              typed={typed}
              onActive={setOpenQ}
            />
          </div>
        )}
        <div
          className={cn(
            "relative rounded-2xl border bg-background transition-[border-color,box-shadow] focus-within:border-pi-line-2",
            page
              ? "border-pi-line shadow-pi-2 focus-within:shadow-pi-2"
              : "border-pi-line shadow-pi-1"
          )}
        >
          {open && (
            <div
              role="listbox"
              aria-label="Commands"
              className={cn(
                "absolute inset-x-2 z-20 overflow-hidden rounded-lg border border-pi-line bg-background py-1 shadow-popover-shadow duration-150 animate-in fade-in-0",
                menuBelow
                  ? "top-full mt-2 slide-in-from-top-1"
                  : "bottom-full mb-2 slide-in-from-bottom-1"
              )}
            >
              <p className="px-3 pb-1 pt-1.5 text-body-4 font-semibold text-pi-faint">
                What Neo can do
              </p>
              {picks.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(p);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] text-pi-ink",
                    i === active && "bg-pi-fill"
                  )}
                >
                  <Slash className="h-3.5 w-3.5 flex-none text-pi-body" />
                  <span className="min-w-0 flex-1 truncate">{p.label}</span>
                  {p.hint && (
                    <span className="code text-body-4 text-pi-faint">
                      {p.hint}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {attachments.length > 0 && (
            <ul
              aria-label="Attached files"
              className="flex max-h-[7.5rem] flex-wrap gap-2 overflow-y-auto px-3 pt-3"
            >
              {attachments.map((a) => (
                <li
                  key={a.name}
                  className="group/file relative flex w-44 items-center gap-2 rounded-lg border border-pi-line bg-background py-1.5 pl-1.5 pr-2 shadow-contact duration-150 animate-in fade-in-0 zoom-in-95"
                >
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-sm bg-pi-fill text-pi-body">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-medium leading-4 text-pi-ink">
                      {a.name}
                    </span>
                    <span className="block text-[11px] uppercase leading-4 text-pi-faint">
                      {a.name.split(".").pop()}
                      {a.docId ? "" : " · not read"}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => onRemoveAttachment(a.name)}
                    className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full border border-pi-line bg-background text-pi-body opacity-0 shadow-contact transition-opacity hover:text-pi-ink focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border group-hover/file:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label htmlFor="neo-composer" className="sr-only">
            Ask Neo
          </label>
          <textarea
            id="neo-composer"
            ref={field}
            rows={1}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setCaret(e.target.selectionStart);
              setDismissed(null);
            }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (open) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const d = e.key === "ArrowDown" ? 1 : -1;
                  setActive((i) => (i + d + picks.length) % picks.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  choose(picks[active]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  setDismissed(trigger);
                  return;
                }
              }
              if (e.key === "ArrowUp" && !value && !attachments.length) {
                e.preventDefault();
                window.dispatchEvent(new Event(EDIT_LAST_EVENT));
                return;
              }
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.ctrlKey &&
                !e.metaKey
              ) {
                e.preventDefault();
                if (asking) sendTyped();
                else onSend();
              }
            }}
            placeholder={
              asking
                ? openQ?.other
                  ? "Pick an answer above, or type your own · Enter sends it"
                  : openQ
                    ? `Pick an answer above (1–${Math.min(9, openQ.options.length)})`
                    : "Check the answers above, then submit · Esc cancels"
                : answering
                  ? `${live?.ask?.input?.placeholder || "Type your answer"} · Enter answers`
                  : busy && live?.ask
                    ? `Pick an answer above (1–${Math.min(9, live.ask.options.length)}) · Esc stops`
                    : busy && signOff
                      ? signOff.risk === "commit" || signOff.risk === "external"
                        ? "Waiting for your sign-off · Esc cancels"
                        : "Waiting for your sign-off · Ctrl ↵ applies · Esc cancels"
                      : busy
                        ? "Neo is working · Esc stops it"
                        : placeholderText
                          ? placeholderText
                          : attachments.length
                            ? "What should Neo know about these?"
                            : placeholder || "Ask Neo, or type / for a job"
            }
            className={cn(
              "block w-full resize-none bg-transparent px-4 text-pi-ink placeholder:text-pi-faint focus-visible:outline-none [field-sizing:content]",
              page
                ? "max-h-52 min-h-[52px] pb-1 pt-4 text-[16px] leading-7"
                : "max-h-44 min-h-[44px] pb-1 pt-3 text-[14px] leading-6"
            )}
          />

          <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
            <div ref={menuRef} className="relative flex-none">
              <button
                type="button"
                aria-label="Add bills"
                title="Add bills"
                aria-haspopup="menu"
                aria-expanded={menu}
                disabled={busy}
                onClick={() => setMenu((m) => !m)}
                className="grid h-8 w-8 place-items-center rounded-full border border-pi-line text-pi-body transition-colors hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-40 aria-expanded:bg-pi-fill"
              >
                <Plus className="h-4 w-4" />
              </button>
              {menu && (
                <div
                  role="menu"
                  className="absolute bottom-10 left-0 z-20 w-72 overflow-hidden rounded-lg border border-pi-line bg-background p-1 shadow-popover-shadow duration-150 animate-in fade-in-0 slide-in-from-bottom-1"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      file.current?.click();
                    }}
                    className="flex w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
                  >
                    <Upload className="mt-0.5 h-4 w-4 flex-none text-pi-body" />
                    <span>
                      <span className="block text-[13px] text-pi-ink">
                        Upload reports
                      </span>
                      <span className="block text-body-4 text-pi-body">
                        POS, settlement and bank statements. Or drop them here
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenu(false);
                      onAttachSample();
                    }}
                    className="flex w-full items-start gap-2.5 rounded-sm px-2.5 py-2 text-left hover:bg-pi-fill focus-visible:bg-pi-fill focus-visible:outline-none"
                  >
                    <FileStack className="mt-0.5 h-4 w-4 flex-none text-pi-body" />
                    <span>
                      <span className="block text-[13px] text-pi-ink">
                        Sample: Nandhini's September reports
                      </span>
                      <span className="block text-body-4 text-pi-body">
                        POS, card, UPI, Zomato, Swiggy and the statement
                      </span>
                    </span>
                  </button>
                </div>
              )}
              <input
                ref={file}
                id="neo-attach"
                type="file"
                multiple
                accept=".pdf,.csv,.xls,.xlsx"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  if (e.target.files?.length) onAttachFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {context}
            </div>
            {busy && !answering && !(asking && value.trim()) ? (
              <button
                type="button"
                aria-label={signOff || live?.ask ? "Cancel" : "Stop"}
                title={signOff || live?.ask ? "Cancel (Esc)" : "Stop (Esc)"}
                onClick={onStop}
                className="grid h-8 w-8 flex-none place-items-center rounded-full bg-pi-ink text-background transition-transform duration-150 animate-in zoom-in-75 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send"
                title="Send (Enter)"
                disabled={asking ? !openQ?.other : !canSend}
                onClick={asking ? sendTyped : onSend}
                className="grid h-8 w-8 flex-none place-items-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] duration-150 animate-in zoom-in-75 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:bg-pi-fill disabled:text-pi-faint"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
Composer.displayName = "Composer";

export default Composer;
