import React from "react";
import { Check } from "lucide-react";
import { NeoStar } from "@/components/icons";

type Pair = { question?: string; answer: string };

type Props = {
  children: React.ReactNode;
  /** The questions behind the answer, on hover. */
  title?: string;
  /**
   * The questions Neo asked and what was picked for each. Given, the
   * exchange reads as a record; without them, `children` is the pick.
   */
  pairs?: Pair[];
};

/**
 * An answered question (23 Oct 2026). Sandeep: a pick read back as a grey
 * bubble looked exactly like something typed. So an answer is a record, not
 * a message: one ruled card on Neo's side of the thread, Neo's question on
 * the left of each row and the pick on the right as a ticked chip. Typed
 * messages keep the grey bubble; picks never wear it.
 */
const ReplyBubble = ({ children, title, pairs }: Props) => {
  const rows: Pair[] =
    pairs && pairs.length
      ? pairs
      : [
          {
            answer: typeof children === "string" ? children : String(children),
          },
        ];
  return (
    <section
      aria-label="Your answer"
      title={title}
      className="neo-reply-in overflow-hidden rounded-xl border border-pi-line bg-background"
    >
      <ul className="divide-y divide-pi-line">
        {rows.map((r, i) => (
          <li
            key={`${r.question}-${i}`}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3.5 py-2.5"
          >
            <span className="flex min-w-0 flex-1 basis-[220px] items-start gap-2.5">
              <span
                aria-hidden
                className="mt-px grid h-5 w-5 flex-none place-items-center rounded-md bg-pi-brand-tint text-pi-brand"
              >
                <NeoStar className="h-3 w-3" />
              </span>
              <span className="min-w-0 text-[13px] leading-5 text-pi-body">
                {r.question || "Your choice"}
              </span>
            </span>
            <span className="ml-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-pi-brand-border bg-pi-brand-tint py-1 pl-1.5 pr-3 text-[12.5px] font-medium leading-[18px] text-pi-ink">
              <span
                aria-hidden
                className="grid h-4 w-4 flex-none place-items-center rounded-full bg-pi-brand text-white"
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="min-w-0 truncate">{r.answer}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ReplyBubble;
