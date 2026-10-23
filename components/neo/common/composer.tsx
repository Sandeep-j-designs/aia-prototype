import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Paperclip } from "lucide-react";
import { ArrowUp, FileText, Plus, Slash, Square, X } from "@/components/icons";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { NEO_COMMANDS } from "@/config/pages/neo/suggestions";
import type {
  NeoAttachment,
  NeoDecisionItem,
  NeoMessage,
} from "@/types/pages/neo";
import { cn } from "@/lib/utils";
import { EDIT_LAST_EVENT, useLiveMessage } from "./thread";
import { QuestionsInBox } from "./message";
import { RECON_JOURNEY } from "@/config/pages/neo/skills";

type Props = {
  value: string;
  busy: boolean;
  attachments: NeoAttachment[];
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttachFiles: (files: FileList) => void;
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
 * Where you ask (21 Oct 2026, one line as in ChatGPT): the paperclip, the
 * text, and send — which becomes stop while Neo works. The text grows into
 * more lines as you write; the buttons stay on its last line. What Neo is
 * looking at sits above the line when there is something.
 *
 * / at the start offers Neo's jobs. ↑ in an empty box edits your last
 * request. Enter sends, Shift+Enter breaks the line.
 *
 * The paperclip opens the system's file dialog. Choosing files starts the
 * three-way reconciliation straight away (use-composer); while Neo is
 * working they wait here as tiles and go with the next message.
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
    const [caret, setCaret] = useState(0);
    const [active, setActive] = useState(0);
    const [dismissed, setDismissed] = useState<string | null>(null);
    const file = useRef<HTMLInputElement>(null);
    const field = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => field.current as HTMLTextAreaElement);

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
    // The journey step the run is on: its latest reasoning block's.
    const stageOf = (m: NeoMessage) => {
      const n = [...neo.messages]
        .reverse()
        .find((x) => x.runId === m.runId && x.phase)?.phase;
      return n ? { n, of: RECON_JOURNEY.length } : undefined;
    };
    const sendTyped = () => {
      if (!asking || !value.trim() || !openQ) return;
      setTyped((t) => ({ text: value.trim(), n: (t?.n || 0) + 1 }));
      onChange("");
    };

    return (
      <div className={cn("flex-none", !page && "bg-background px-4 pb-3 pt-2")}>
        {asking && (
          // Structured questions replace the chat field until resolved.
          <div
            key={asking.id}
            className={cn(
              "neo-sheet-rise relative z-0 mb-3 max-h-[64vh] overflow-y-auto rounded-[24px] border border-pi-line bg-pi-brand-tint/40"
            )}
          >
            <QuestionsInBox
              stage={stageOf(asking)}
              m={asking}
              onAnswer={(v) => neo.answer(asking.id, v)}
              onEditCard={(card) => neo.editCard(asking.id, card)}
              typed={typed}
              onActive={setOpenQ}
            />
          </div>
        )}
        <div
          hidden={!!asking}
          data-guide-id="neo-composer"
          className={cn(
            "relative z-10 border transition-[border-color,box-shadow,background-color] duration-200",
            asking
              ? "rounded-2xl border-pi-line-2 bg-background focus-within:border-pi-brand-border focus-within:ring-2 focus-within:ring-pi-brand-tint"
              : "rounded-[26px] bg-background focus-within:border-pi-line-2",
            !asking &&
              (page
                ? "border-pi-line shadow-pi-2 focus-within:shadow-pi-2"
                : "border-pi-line shadow-pi-1")
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

          {context && (
            <div className="flex min-w-0 items-center gap-1.5 px-3 pt-2.5">
              {context}
            </div>
          )}
          <label htmlFor="neo-composer" className="sr-only">
            Ask Neo
          </label>
          <div
            className={cn(
              "flex items-end gap-1",
              page ? "px-2.5 py-2" : "px-2 py-1.5"
            )}
          >
            <div className="flex-none">
              <button
                type="button"
                aria-label="Attach files"
                data-guide-id="neo-attach-button"
                title="Attach files"
                disabled={
                  (busy && !!live?.ask) || (!!asking && !openQ)
                }
                onClick={() => file.current?.click()}
                className={cn(
                  "grid place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:opacity-40",
                  asking
                    ? "text-pi-body hover:bg-pi-fill hover:text-pi-ink"
                    : "text-pi-body hover:bg-pi-fill hover:text-pi-ink",
                  page ? "h-10 w-10" : "h-9 w-9"
                )}
              >
                {asking ? (
                  <Plus className="h-5 w-5" />
                ) : (
                  <Paperclip className="h-[18px] w-[18px]" />
                )}
              </button>
              <input
                ref={file}
                id="neo-attach"
                type="file"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  if (e.target.files?.length) onAttachFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              id="neo-composer"
              ref={field}
              rows={1}
              disabled={!!asking && !openQ}
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
                  ? openQ
                    ? "Or reply directly…"
                    : "Review your answers above to continue"
                  : answering
                    ? `${live?.ask?.input?.placeholder || "Type your answer"} · Enter answers`
                    : busy && live?.card?.kind === "guide-choice"
                      ? "Pick how to start in the guide · Esc stops"
                      : busy && live?.ask
                      ? `Pick an answer above (1–${Math.min(9, live.ask.options.length)}) · Esc stops`
                      : busy && signOff
                        ? signOff.risk === "commit" ||
                          signOff.risk === "external"
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
                "block min-w-0 flex-1 resize-none bg-transparent px-2 text-pi-ink focus-visible:outline-none [field-sizing:content]",
                asking
                  ? "placeholder:text-pi-faint disabled:opacity-75"
                  : "placeholder:text-pi-faint",
                page
                  ? "max-h-52 min-h-[40px] py-2 text-[16px] leading-6 sm:text-[14.5px]"
                  : "max-h-44 min-h-[36px] py-1.5 text-[16px] leading-6 sm:text-[13.5px]"
              )}
            />

            {busy && !asking && !answering ? (
              <button
                type="button"
                aria-label={signOff || live?.ask ? "Cancel" : "Stop"}
                title={signOff || live?.ask ? "Cancel (Esc)" : "Stop (Esc)"}
                onClick={onStop}
                className={cn(
                  "mb-0.5 mr-0.5 grid h-9 w-9 flex-none place-items-center rounded-full transition-[color,background-color,transform] duration-150 animate-in zoom-in-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                  asking || live?.ask
                    ? "bg-background/80 text-pi-body shadow-contact ring-1 ring-inset ring-pi-line-2 hover:bg-pi-fill hover:text-pi-ink"
                    : "bg-pi-ink text-background hover:opacity-90"
                )}
              >
                {asking || live?.ask ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Square className="h-3 w-3 fill-current" />
                )}
              </button>
            ) : (
              <button
                type="button"
                aria-label="Send"
                title="Send (Enter)"
                disabled={asking ? !openQ || !value.trim() : !canSend}
                onClick={asking ? sendTyped : onSend}
                className="mb-0.5 mr-0.5 grid h-9 w-9 flex-none place-items-center rounded-full bg-primary text-primary-foreground transition-[opacity,transform] duration-150 animate-in zoom-in-75 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border disabled:bg-pi-fill disabled:text-pi-faint"
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
