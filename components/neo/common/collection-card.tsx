import React, { useState } from "react";
import { Check, Copy } from "@/components/icons";
import { companyOf } from "@/components/inbox/v2/store";
import { ProviderIcon } from "@/components/agents/provider-icon";
import {
  BACKFILL_LABEL,
  patchCollectionDraft,
  sinceFor,
  useInboxSources,
} from "@/hooks/pages/inbox/use-inbox-sources";
import {
  forwardingAddress,
  MOCK_GMAIL_FILTER,
} from "@/config/pages/inbox/mock-sources";
import type { NeoCard } from "@/types/pages/neo";
import type {
  CollectionBackfill,
  CollectionSetup,
} from "@/types/pages/inbox/sources";
import { cn } from "@/lib/utils";

type Props = { card: Extract<NeoCard, { kind: "collection-setup" }> };

const MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(" ");
export const dayOf = (iso: string) =>
  `${Number(iso.slice(8))} ${MONTHS.at(Number(iso.slice(5, 7)) - 1)} ${iso.slice(0, 4)}`;

const CHANNEL_STATUS = {
  connected: "Connected",
  pending: "Not connected",
  skipped: "Skipped",
} as const;

const SELECT =
  "h-8 w-full min-w-0 rounded-sm border border-pi-line-2 bg-background px-2 text-body-4 text-pi-ink focus-visible:border-primary focus-visible:outline-none";

/** A value the person can copy: the forwarding address, the Gmail filter. */
const CopyLine = ({ value, label }: { value: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <code
        className="code min-w-0 flex-1 truncate rounded-xs bg-pi-fill px-1.5 py-0.5 text-[11px] text-pi-ink"
        title={value}
      >
        {value}
      </code>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        title={copied ? "Copied" : `Copy ${label}`}
        onClick={() => {
          try {
            void navigator.clipboard?.writeText(value);
          } catch {
            /* Clipboard blocked; the value stays on screen to copy by hand. */
          }
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
        className="grid size-6 flex-none place-items-center rounded-sm text-pi-body hover:bg-pi-fill hover:text-pi-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border"
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
    </span>
  );
};

/**
 * Document Collection's setup card (19 Oct 2026). Neo fills it from the
 * answers in the chat; while setup is open every rule is a field the person
 * can change here, and Neo never overwrites one they changed. After saving
 * it reads back the saved setup.
 */
const CollectionCard = ({ card }: Props) => {
  const sources = useInboxSources();
  const draft = sources.drafts.find((d) => d.company === card.company)?.setup;
  const agent = sources.agents.find((a) => a.company === card.company);
  const setup = draft || agent?.setup;
  const company = companyOf(card.company);
  if (!setup)
    return (
      <p className="rounded-lg border border-pi-line px-4 py-3 text-body-4 text-pi-body">
        Setup closed. Nothing was saved.
      </p>
    );
  const editable = !!draft;
  const edit = (patch: Partial<CollectionSetup>) =>
    patchCollectionDraft(card.company, patch, true);
  const state = editable ? "Setting up" : agent?.configured ? "On" : "Draft";

  return (
    <div className="overflow-hidden rounded-lg border border-pi-line bg-background text-pi-ink">
      <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-3">
        <div className="min-w-0">
          <p className="text-label-2 font-semibold">Document collection</p>
          <p className="mt-0.5 text-body-4 text-pi-body">
            {company?.name}
            {editable && " · change anything here"}
          </p>
        </div>
        <span
          className={cn(
            "flex-none rounded-sm border px-1.5 py-0.5 text-body-4 font-semibold",
            state === "On"
              ? "border-pi-success-line bg-pi-success-bg text-pi-success"
              : "border-pi-line text-pi-body"
          )}
        >
          {state}
        </span>
      </div>

      <dl className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-3 border-t border-pi-line px-4 py-3 text-body-4 leading-5">
        <dt className="pt-1 text-pi-body">Channels</dt>
        <dd className="flex min-w-0 flex-col gap-2.5">
          {setup.channels.length ? (
            setup.channels.map((c) => (
              <div key={c.provider} className="flex min-w-0 items-start gap-2">
                <ProviderIcon
                  provider={c.provider}
                  className="size-6 [&>svg]:size-3.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center justify-between gap-2">
                    <span className="font-semibold">
                      {c.provider === "Forwarding"
                        ? "Forwarding address"
                        : c.provider}
                    </span>
                    <span
                      className={cn(
                        "flex-none",
                        c.status === "connected"
                          ? "text-pi-success"
                          : "text-pi-faint"
                      )}
                    >
                      {CHANNEL_STATUS[c.status]}
                    </span>
                  </p>
                  {c.provider === "Forwarding" && c.status !== "skipped" ? (
                    <div className="mt-1 flex flex-col gap-1">
                      <CopyLine
                        value={forwardingAddress(company?.slug || card.company)}
                        label="forwarding address"
                      />
                      <span className="text-pi-body">{c.scope}</span>
                    </div>
                  ) : (
                    c.status !== "skipped" && (
                      <p
                        className="truncate text-pi-body"
                        title={`${c.account} · ${c.scope}`}
                      >
                        {c.account} · {c.scope}
                      </p>
                    )
                  )}
                  {c.provider === "Gmail" && c.status === "connected" && (
                    <div className="mt-1">
                      <CopyLine
                        value={MOCK_GMAIL_FILTER}
                        label="Gmail filter"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <span className="pt-1 text-pi-faint">Not chosen yet</span>
          )}
        </dd>

        <dt className="pt-1.5 text-pi-body">Senders</dt>
        <dd>
          {editable ? (
            <select
              aria-label="Senders"
              className={SELECT}
              value={setup.senders}
              onChange={(e) =>
                edit({ senders: e.target.value as CollectionSetup["senders"] })
              }
            >
              <option value="known">Your vendors and staff</option>
              <option value="anyone">Anyone</option>
            </select>
          ) : (
            <span className="block pt-1">
              {setup.senders === "known" ? "Your vendors and staff" : "Anyone"}
            </span>
          )}
        </dd>

        <dt className="pt-1.5 text-pi-body">Files</dt>
        <dd>
          {editable ? (
            <select
              aria-label="Files"
              className={SELECT}
              value={setup.files}
              onChange={(e) =>
                edit({ files: e.target.value as CollectionSetup["files"] })
              }
            >
              <option value="bills">Only bills; skip the rest</option>
              <option value="all">Everything; hold non-bills for me</option>
            </select>
          ) : (
            <span className="block pt-1">
              {setup.files === "bills"
                ? "Only bills; skip the rest"
                : "Everything; hold non-bills for me"}
            </span>
          )}
          <span className="mt-1 block text-pi-body">
            Duplicates are linked, never drafted twice
          </span>
        </dd>

        <dt className="text-pi-body">Company</dt>
        <dd>Everything goes to {company?.name}</dd>

        <dt className="pt-1.5 text-pi-body">Collect from</dt>
        <dd>
          {editable ? (
            <select
              aria-label="Collect from"
              className={SELECT}
              value={setup.backfill}
              onChange={(e) =>
                edit({ backfill: e.target.value as CollectionBackfill })
              }
            >
              {(Object.keys(BACKFILL_LABEL) as CollectionBackfill[]).map(
                (b) => (
                  <option key={b} value={b}>
                    {BACKFILL_LABEL[b]} · {dayOf(sinceFor(b))}
                  </option>
                )
              )}
            </select>
          ) : (
            <span className="block pt-1">
              {BACKFILL_LABEL[setup.backfill]} ·{" "}
              {dayOf(sinceFor(setup.backfill))}
            </span>
          )}
        </dd>

        <dt className="pt-1.5 text-pi-body">Checks</dt>
        <dd>
          {editable ? (
            <select
              aria-label="Checks"
              className={SELECT}
              value={setup.schedule}
              onChange={(e) =>
                edit({
                  schedule: e.target.value as CollectionSetup["schedule"],
                })
              }
            >
              <option value="15m">Every 15 minutes</option>
              <option value="manual">Only when I ask</option>
            </select>
          ) : (
            <span className="block pt-1">
              {setup.schedule === "15m"
                ? "Every 15 minutes"
                : "Only when I ask"}
            </span>
          )}
        </dd>

        <dt className="pt-1.5 text-pi-body">Notices</dt>
        <dd>
          {editable ? (
            <select
              aria-label="Notices"
              className={SELECT}
              value={setup.notify}
              onChange={(e) =>
                edit({ notify: e.target.value as CollectionSetup["notify"] })
              }
            >
              <option value="daily">Daily summary at 6 pm</option>
              <option value="each">Each bill</option>
              <option value="off">Off</option>
            </select>
          ) : (
            <span className="block pt-1">
              {setup.notify === "daily"
                ? "Daily summary at 6 pm"
                : setup.notify === "each"
                  ? "Each bill"
                  : "Off"}
            </span>
          )}
        </dd>
      </dl>
      <p className="border-t border-pi-line bg-pi-sunken px-4 py-2 text-body-4 text-pi-body">
        Prepares drafts only. Never approves, posts or messages a vendor.
      </p>
    </div>
  );
};

export default CollectionCard;
