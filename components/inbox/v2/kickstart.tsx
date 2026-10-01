import React, { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  Copy,
  FileText,
  Inbox,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import s from "./kickstart.module.css";

/**
 * What is already in the Inbox when the welcome opens.
 *
 * Present only when documents arrived before the user's first visit — someone
 * registered with the WhatsApp bot before Inbox launched. The welcome then
 * stops asking them to send something in and points at what is waiting.
 */
export type Arrivals = {
  /** Documents in the queue, whatever their state. */
  total: number;
  /** Ready for review now. */
  ready: number;
  /** How many of them came in on WhatsApp. */
  whatsapp: number;
  /** The phone number registered with the WhatsApp bot. */
  whatsappNumber?: string;
  /** AI Accountant's WhatsApp number, where that phone sends its bills. */
  botNumber?: string;
};

type Props = {
  companyName: string;
  email: string;
  maxFiles: number;
  onUpload: (files?: FileList) => void;
  onWhatsApp: () => void;
  onCopy: () => Promise<boolean>;
  /** Copy AI Accountant's WhatsApp number. Connected state only. */
  onCopyNumber?: () => Promise<boolean>;
  arrivals?: Arrivals;
  /** Close the welcome on the Needs review queue. Arrivals only. */
  onReview?: () => void;
  onTour?: () => void;
  onSkip?: () => void;
  /** Laid out for the welcome dialog rather than as a page band. */
  inDialog?: boolean;
};
const steps = [
  { label: "Classify", icon: Inbox },
  { label: "Prepare", icon: Sparkles },
  { label: "Review", icon: ShieldCheck },
];

/**
 * The line-art that fills each channel card, bled off its right edge.
 *
 * It draws what the channel carries — paper, post, a conversation — at an
 * opacity where it reads as surface rather than as content. That is the point:
 * the cards each lost a line of subtext that only restated the heading, and a
 * motif fills the space the sentence held without asking to be read.
 *
 * Inherits `color` from the card, so each one is tinted by its own channel and
 * nothing here carries a palette of its own. `strokeWidth` stays at 1.3 to
 * match the illustration in the demo card above.
 */
const ChannelMotif = ({ kind }: { kind: "upload" | "email" | "whatsapp" }) => (
  <span className={s.channelMotif} aria-hidden>
    <svg
      viewBox="0 0 120 96"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === "upload" && (
        /* A fanned stack: three sheets, the front one dog-eared. */
        <>
          <rect x="18" y="24" width="46" height="60" rx="4" />
          <g transform="rotate(8 60 54)">
            <rect x="36" y="18" width="46" height="60" rx="4" />
          </g>
          <g transform="rotate(16 78 48)">
            <path d="M54 12h30l12 12v48a4 4 0 0 1-4 4H54a4 4 0 0 1-4-4V16a4 4 0 0 1 4-4Z" />
            <path d="M84 12v12h12" />
            <path d="M60 44h24M60 56h24M60 68h14" />
          </g>
        </>
      )}
      {kind === "email" && (
        /* Two envelopes, the back one only just showing. */
        <>
          <rect x="10" y="30" width="62" height="44" rx="4" />
          <path d="M10 34l31 22 31-22" />
          <g transform="rotate(-10 88 44)">
            <rect x="52" y="16" width="62" height="44" rx="4" />
            <path d="M52 20l31 22 31-22" />
          </g>
        </>
      )}
      {kind === "whatsapp" && (
        /* A reply arriving over the message it answers. */
        <>
          <path d="M14 26a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6H34l-14 12V54a6 6 0 0 1-6-6Z" />
          <path d="M28 32h24M28 42h16" />
          <path d="M106 52a6 6 0 0 0-6-6H66a6 6 0 0 0-6 6v18a6 6 0 0 0 6 6h26l14 10V70a6 6 0 0 0 0-6Z" />
          <path d="M74 58h18" />
        </>
      )}
    </svg>
  </span>
);

/** A bounded, interactive example explains intake without adding demo records. */
export default function InboxKickstart({
  companyName,
  email,
  maxFiles,
  onUpload,
  onWhatsApp,
  onCopy,
  onCopyNumber,
  arrivals,
  onReview,
  onTour,
  onSkip,
  inDialog,
}: Props) {
  const waiting = !!arrivals?.total;
  const connected = !!arrivals?.whatsapp;
  const [copied, setCopied] = useState(false);
  const [numberCopied, setNumberCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        setStep((current) => (current + 1) % steps.length);
      },
      step === 1 ? 3600 : 2400
    );
    return () => window.clearTimeout(timer);
  }, [step]);
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);
  useEffect(() => {
    if (!numberCopied) return;
    const timer = window.setTimeout(() => setNumberCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [numberCopied]);
  const selectStep = (index: number) => {
    setStep(index);
  };
  return (
    <section
      aria-labelledby="inbox-kickstart-title"
      className={cn(s.root, inDialog && s.inDialog)}
    >
      <div className={s.split}>
        <div className={s.pitch}>
          <div className={s.intro}>
            <div className={s.eyebrow}>
              <span /> AI ACCOUNTANT · DOCUMENT INBOX
            </div>
            <h2 id="inbox-kickstart-title">
              All your documents. <span>One inbox.</span>
            </h2>
            <p>
              Send Bills, Invoices &amp; Expenses. AI Accountant reads it,
              prepares the details, and suggests whether it belongs in
              purchases, sales or journals. You review before anything is
              posted.
            </p>
          </div>

          <div className={s.demo} data-step={step} data-playing={true}>
            <div className={s.demoTop}>
              <span>How it works</span>
            </div>
            <div
              className={s.animationStage}
              aria-label={`Example: ${steps[step].label}`}
            >
              <div className={s.scene} aria-hidden="true">
                <div className={s.orbit} />
                <div className={s.orbitInner} />
                <div className={cn(s.paper, s.paperLeft)}>
                  <span className={s.paperLabel}>
                    <FileText size={13} /> BILL
                  </span>
                  <i />
                  <i />
                  <div className={s.paperTotal}>₹11,800</div>
                </div>
                <div className={cn(s.paper, s.paperRight)}>
                  <span className={s.paperLabel}>
                    <FileText size={13} /> INVOICE
                  </span>
                  <i />
                  <i />
                  <div className={s.paperRows}>
                    <b />
                    <b />
                    <b />
                  </div>
                </div>
                <div className={s.sparkleTile}>
                  <Sparkles size={19} />
                </div>
                <div className={s.inboxTile}>
                  {step === 1 ? (
                    <Sparkles size={36} strokeWidth={1.3} />
                  ) : (
                    <Inbox size={42} strokeWidth={1.3} />
                  )}
                  <span className={s.scanLine} />
                </div>
                <div className={s.reviewDocument}>
                  <div className={s.reviewHeading}>
                    <span>
                      <FileText size={16} /> Purchase bill
                    </span>
                    <span className={s.reviewBadge}>
                      <Check size={11} /> Ready to review
                    </span>
                  </div>
                  <div className={s.reviewVendor}>Vardhman Packaging</div>
                  <div className={s.reviewAmount}>
                    ₹11,800<span>GST included</span>
                  </div>
                  <div className={s.reviewFooter}>
                    <ShieldCheck size={13} /> Prepared for your approval
                  </div>
                </div>
                <div className={s.extractedFields}>
                  {["Vendor", "GST", "Total"].map((label, index) => (
                    <span
                      key={label}
                      style={{ "--index": index } as React.CSSProperties}
                    >
                      <Check size={11} />
                      {label}
                    </span>
                  ))}
                </div>
                <span className={s.starOne}>✦</span>
                <span className={s.starTwo}>✦</span>
              </div>
              <div className={s.sceneCaption}>
                <strong>
                  {
                    [
                      "Every document, one destination",
                      "The details take care of themselves",
                      "Prepared by AI Accountant. Approved by you.",
                    ][step]
                  }
                </strong>
                <p>
                  {
                    [
                      "Bills, invoices and expenses come together in your inbox.",
                      "Reading vendor, GST and totals. Mapping your Tally ledgers.",
                      "Review your entry before anything is posted to Tally.",
                    ][step]
                  }
                </p>
              </div>
            </div>
            <div className={s.process} aria-label="Explore how Inbox works">
              {steps.map(({ label }, index) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={step === index}
                  data-complete={step > index}
                  onClick={() => selectStep(index)}
                >
                  <span className={s.stepMarker}>
                    {step > index ? (
                      <Check size={11} aria-hidden />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={s.intake}>
          <div className={s.intakeHeading}>
            <h3>
              {waiting
                ? `${arrivals.total} ${arrivals.total === 1 ? "document is" : "documents are"} already waiting`
                : "Let’s get your inbox started"}
            </h3>
            <span>
              Receiving for <strong>{companyName}</strong>
            </span>
          </div>
          <div className={s.channels}>
            <article
              className={cn(s.channel, s.upload, dragOver && s.dragging)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setDragOver(true);
              }}
              onDragLeave={(event) => {
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null
                  )
                )
                  setDragOver(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                if (event.dataTransfer.files.length)
                  onUpload(event.dataTransfer.files);
              }}
            >
              <ChannelMotif kind="upload" />
              <span className={s.channelIcon}>
                <Upload size={23} aria-hidden />
              </span>
              <div className={s.channelText}>
                <h4>{dragOver ? "Release to upload" : "Upload a document"}</h4>
              </div>
              <div className={s.channelAction}>
                <Button
                  data-guide-id="inbox-upload"
                  className={cn(s.uploadButton, waiting && s.uploadQuiet)}
                  onClick={() => onUpload()}
                >
                  <Upload size={16} aria-hidden /> Upload files{" "}
                  <ArrowRight size={16} aria-hidden />
                </Button>
                <span className={s.fileHint}>
                  PDF, JPG, PNG · Up to {maxFiles} files
                </span>
              </div>
              {dragOver && (
                <div className={s.dropHint} aria-hidden>
                  <ArrowDown size={32} />
                  <strong>Release to add your documents</strong>
                </div>
              )}
            </article>
            <article className={cn(s.channel, s.email)}>
              <ChannelMotif kind="email" />
              <span className={s.channelIcon}>
                <Mail size={23} aria-hidden />
              </span>
              <div className={s.channelText}>
                <h4>Forward an email</h4>
              </div>
              <div className={s.channelAction}>
                <div className={s.emailAddress} data-guide-id="inbox-email">
                  <code>{email}</code>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      copied
                        ? "Email address copied"
                        : "Copy forwarding email address"
                    }
                    onClick={async () => setCopied(await onCopy())}
                  >
                    {copied ? <Check /> : <Copy />}
                  </Button>
                </div>
                {/* The visible hint is gone; the check icon carries the
                    confirmation on screen, this carries it to a reader. */}
                <span className="sr-only" role="status">
                  {copied ? "Address copied" : ""}
                </span>
              </div>
            </article>
            <article className={cn(s.channel, s.whatsapp)}>
              <ChannelMotif kind="whatsapp" />
              <span className={s.channelIcon}>
                <MessageCircle size={23} aria-hidden />
              </span>
              <div className={s.channelText}>
                <h4>{connected ? "Forward on WhatsApp" : "Send on WhatsApp"}</h4>
                {/* Where to send leads; the registered phone follows as the
                    reminder of which phone the bot listens to. */}
                {connected && arrivals.botNumber && (
                  <p className={s.sendTo}>
                    Send to <strong>{arrivals.botNumber}</strong>
                    {onCopyNumber && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          numberCopied
                            ? "WhatsApp number copied"
                            : "Copy AI Accountant WhatsApp number"
                        }
                        onClick={async () =>
                          setNumberCopied(await onCopyNumber())
                        }
                      >
                        {numberCopied ? <Check /> : <Copy />}
                      </Button>
                    )}
                    <span className="sr-only" role="status">
                      {numberCopied ? "Number copied" : ""}
                    </span>
                  </p>
                )}
                {connected && arrivals.whatsappNumber && (
                  <p className={s.registeredNumber}>
                    From your number{" "}
                    <strong>{arrivals.whatsappNumber}</strong>
                  </p>
                )}
              </div>
              <div className={s.channelAction}>
                {connected ? (
                  /* Already set up, so there is nothing to do here — the card
                     reports what the channel has delivered instead. */
                  <span className={s.connected} data-guide-id="inbox-whatsapp">
                    <Check size={14} aria-hidden />
                    {arrivals.whatsapp} received
                  </span>
                ) : (
                  <Button
                    data-guide-id="inbox-whatsapp"
                    variant="ghost"
                    className={s.whatsappButton}
                    onClick={onWhatsApp}
                  >
                    Set up WhatsApp <ArrowRight size={16} aria-hidden />
                  </Button>
                )}
              </div>
            </article>
          </div>
          {(onTour || onReview || onSkip) && (
            <div className={s.footer}>
              {onTour && (
                <Button variant="link" className={s.tourLink} onClick={onTour}>
                  Take the tour
                </Button>
              )}
              <div className={s.footerEnd}>
                {waiting && onReview ? (
                  <Button className={s.reviewButton} onClick={onReview}>
                    {arrivals.ready
                      ? `Review ${arrivals.ready} ${arrivals.ready === 1 ? "document" : "documents"}`
                      : "Go to Inbox"}
                    <ArrowRight size={16} aria-hidden />
                  </Button>
                ) : (
                  onSkip && (
                    <Button variant="ghost" onClick={onSkip}>
                      Skip for now
                    </Button>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * The welcome, as a dialog over the Inbox on a company's first visit.
 *
 * It used to be the page: an Inbox with nothing sent in yet showed this in
 * place of the table. That broke for anyone who registered with the WhatsApp
 * bot before Inbox launched — their documents were already there, hidden
 * behind a screen asking them to send some. As a dialog the queue is always
 * the page, full or empty, and the welcome sits over it once.
 *
 * Every way out counts as seen: the close button, Escape, a click outside,
 * and each action inside. Reopened from "How Inbox works" in the page menu.
 */
export function InboxWelcomeDialog({
  open,
  onClose,
  ...props
}: Props & { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent 
        // Keep focus on the dialog itself. Radix would focus the first step
        // button, and on a first visit, with no click yet, Chrome rings it.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="max-h-[calc(100vh-32px)] w-[calc(100vw-48px)] max-w-[1180px] gap-0 overflow-y-auto overscroll-contain rounded-xl border-neutral-gray p-0 outline-none">
        <DialogTitle className="sr-only">Welcome to Inbox</DialogTitle>
        <DialogDescription className="sr-only">
          How documents reach the Inbox, and the ways to send them in.
        </DialogDescription>
        <InboxKickstart {...props} inDialog />
      </DialogContent>
    </Dialog>
  );
}
