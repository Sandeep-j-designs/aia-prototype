import React, { useState } from "react";
import { ArrowUp, Check } from "@/components/icons";
import type { NeoAsk } from "@/types/pages/neo";
import { cn } from "@/lib/utils";

type Props = {
  ask: NeoAsk;
  live: boolean;
  onPick: (id: string) => void;
};

/**
 * A question Neo can't answer from the data, with the likely answers as one
 * tap each — or one key: 1 to 4. Once answered it collapses to the pick, so
 * the conversation reads back as a record of what was decided.
 *
 * Some answers are a value only the person knows — an amount to the rupee,
 * a phone number. Those get a field (the prompt box answers too), and any
 * options are quick fills under it, never the only choices.
 */
const AskOptions = ({ ask, live, onPick }: Props) => {
  const [text, setText] = useState("");
  const typed =
    ask.answer !== undefined && !ask.options.some((o) => o.id === ask.answer);
  return (
    <div className="flex flex-col gap-2">
      {/* First line is the question; anything after it is the evidence. */}
      <p className="text-body-3 font-semibold text-pi-ink">
        {ask.question.split("\n")[0]}
        {ask.question.includes("\n") && (
          <span className="mt-0.5 block text-body-4 font-normal text-pi-body">
            {ask.question.split("\n").slice(1).join(" ")}
          </span>
        )}
      </p>
      {ask.input && live && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) onPick(text.trim());
          }}
          className="flex max-w-sm items-center gap-1.5 rounded-lg border border-pi-line-2 bg-background py-1 pl-3 pr-1 focus-within:border-primary"
        >
          <label className="sr-only" htmlFor="neo-ask-input">
            {ask.question.split("\n")[0]}
          </label>
          <input
            id="neo-ask-input"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={ask.input.placeholder}
            className="min-w-0 flex-1 bg-transparent text-[14px] tabular-nums text-pi-ink placeholder:text-pi-faint focus-visible:outline-none"
          />
          <button
            type="submit"
            aria-label="Answer"
            disabled={!text.trim()}
            className="grid h-7 w-7 flex-none place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary-hover disabled:bg-pi-fill disabled:text-pi-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </form>
      )}
      {typed && !live && (
        <p className="flex items-center gap-2.5 text-label-3 font-semibold text-pi-body">
          <Check className="h-3.5 w-3.5 flex-none text-status-success" />
          {ask.answer}
        </p>
      )}
      {ask.input && live && ask.options.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-body-4 text-pi-body">
            {ask.options[0].hint?.startsWith("Last") ? "Used before:" : "Or:"}
          </span>
          {ask.options.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onPick(o.id)}
              className="h-7 rounded-full border border-pi-line bg-background px-2.5 text-[12px] font-medium tabular-nums text-pi-ink-2 hover:border-pi-line-2 hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
              title={o.hint}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      {!ask.input && (
        <div className="flex flex-col gap-1">
          {ask.options.map((o, i) => {
            const picked = ask.answer === o.id;
            if (!live && !picked) return null;
            return (
              <button
                key={o.id}
                type="button"
                disabled={!live}
                onClick={() => onPick(o.id)}
                className={cn(
                  "group flex min-h-9 items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border",
                  live
                    ? "border-pi-line hover:border-border hover:bg-pi-fill"
                    : "border-transparent px-0 py-0"
                )}
              >
                {live ? (
                  <kbd className="grid h-5 min-w-5 flex-none place-items-center rounded-sm bg-pi-fill px-1 font-sans text-body-4 font-semibold text-primary group-hover:bg-primary group-hover:text-primary-foreground">
                    {i + 1}
                  </kbd>
                ) : (
                  <Check className="h-3.5 w-3.5 flex-none text-status-success" />
                )}
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-label-3 font-semibold",
                      picked && !live ? "text-pi-body" : "text-pi-ink"
                    )}
                  >
                    {o.label}
                  </span>
                  {o.hint && live && (
                    <span className="block truncate text-body-4 text-pi-body tabular-nums">
                      {o.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {ask.input && !live && !typed && ask.answer !== undefined && (
        <p className="flex items-center gap-2.5 text-label-3 font-semibold text-pi-body">
          <Check className="h-3.5 w-3.5 flex-none text-status-success" />
          {ask.options.find((o) => o.id === ask.answer)?.label}
        </p>
      )}
    </div>
  );
};

export default AskOptions;
