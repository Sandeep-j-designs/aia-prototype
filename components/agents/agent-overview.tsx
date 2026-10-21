import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  Pause,
  Play,
  Plus,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { previewSource } from "@/hooks/pages/inbox/use-inbox-sources";
import styles from "./workspace.module.css";
import { Button } from "@/components/ui/button";
import { ProviderIcon } from "@/components/agents/provider-icon";
import type { useCollectionAgent } from "@/hooks/pages/agents/use-collection-agent";

type Props = {
  controller: ReturnType<typeof useCollectionAgent>;
  onConfigure: () => void;
  onActivity: () => void;
  onInbox: () => void;
  onDocument: (id: string) => void;
};

export default function AgentOverview({
  controller: c,
  onConfigure,
  onActivity,
  onInbox,
  onDocument,
}: Props) {
  const latest = c.runs[0];
  const firstRun = !latest;
  const candidates = c.connected.flatMap((s) =>
    previewSource(s.company, s.provider, s.scope, s.since)
  );
  const documents = [
    ...new Map(candidates.map((doc) => [doc.hash, doc])).values(),
  ];
  const recentReceipts = [
    ...new Map(
      c.receipts.filter((r) => r.itemId).map((r) => [r.itemId!, r])
    ).values(),
  ].slice(0, 4);
  const prepared = c.receipts.filter((r) => r.outcome === "prepared").length;
  const attention = c.receipts.filter(
    (r) => r.outcome === "needs-decision" || r.outcome === "failed"
  ).length;
  const title = !c.connected.length
    ? "Reconnect to keep things moving."
    : c.busy
      ? "Bringing your invoices together."
      : c.agent.paused
        ? "Taking a pause. Ready when you are."
        : firstRun
          ? "Connected. Let’s collect your first invoices."
          : c.agent.runMode === "continuous"
            ? "Document collection is keeping an eye on things."
            : "Your next collection is a click away.";
  return (
    <div className="space-y-5">
      <section className={styles.overviewHero}>
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-2 text-xs font-medium text-pi-brand">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pi-brand-tint">
                {c.busy ? (
                  <Radio className="h-3.5 w-3.5 motion-safe:animate-pulse" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </span>
              {!c.connected.length
                ? "CONNECTION NEEDED"
                : c.busy
                  ? "COLLECTION IN PROGRESS"
                  : firstRun
                    ? "ALL SET FOR YOUR FIRST RUN"
                    : "YOUR COLLECTION WORKSPACE"}
            </div>
            <h2 className="max-w-md text-2xl font-semibold leading-tight tracking-tight text-pi-ink">
              {title}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-pi-body">
              {!c.connected.length
                ? "Your saved settings are here. Connect an account to collect new documents."
                : c.busy
                  ? "Checking your connected sources and preparing drafts. Follow the progress in Neo."
                  : c.agent.paused
                    ? "Background collection is paused. You can still run a collection whenever you need."
                    : firstRun
                      ? "Your source is ready. We’ll find supplier invoices, flag anything that needs attention, and bring the drafts to your Inbox."
                      : "Collect from your connected sources. New invoices become drafts; duplicates are linked to the existing document."}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {!c.connected.length ? (
                <Button className="h-11 rounded-xl" onClick={onConfigure}>
                  <Plus />
                  Connect an account
                </Button>
              ) : c.busy ? (
                <Button
                  className="h-10 rounded-lg"
                  variant="outline"
                  onClick={c.stop}
                >
                  Stop task
                </Button>
              ) : (
                <Button
                  className="h-10 rounded-lg"
                  disabled={c.neoBusy}
                  onClick={c.run}
                >
                  <Play />
                  Run now
                  <ArrowRight />
                </Button>
              )}
              {!!c.receipts.length && (
                <Button
                  className="h-10 rounded-lg"
                  variant="outline"
                  onClick={onInbox}
                >
                  Open Inbox
                </Button>
              )}
              {c.agent.runMode === "continuous" && (
                <Button
                  className="h-10 rounded-lg"
                  variant="ghost"
                  onClick={c.pause}
                >
                  {c.agent.paused ? <Play /> : <Pause />}
                  {c.agent.paused ? "Resume agent" : "Pause agent"}
                </Button>
              )}
            </div>
            <p className="mt-3 text-xs text-pi-body">
              {c.agent.runMode === "on-demand"
                ? "Runs only when you ask. You’re in control."
                : c.agent.paused
                  ? "Automatic checks are paused."
                  : "Automatic checks are on while this app is open."}
            </p>
          </div>
          <div className={styles.overviewPreview}>
            <div className="mb-4 flex items-center justify-between gap-2">
              <p className={styles.eyebrow}>
                {firstRun ? "WAITING IN YOUR SOURCES" : "RECENT DOCUMENTS"}
              </p>
              <span className={styles.demoTag}>
                {firstRun ? "Sample preview" : "Collection results"}
              </span>
            </div>
            <div className={styles.previewPaper}>
              {firstRun ? (
                documents.length ? (
                  documents.slice(0, 4).map((doc) => (
                    <div key={doc.hash} className={styles.previewFile}>
                      <span className={styles.fileIcon}>
                        <FileText size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">
                          {doc.document.file.name}
                        </p>
                        <p className="mt-1 truncate text-xs text-pi-body">
                          {doc.document.vendor}
                        </p>
                      </div>
                      <span
                        className={
                          doc.problem ? styles.issueDot : styles.readyDot
                        }
                      />
                    </div>
                  ))
                ) : (
                  <p className="p-5 text-sm text-pi-body">
                    No documents in the current selection. You can adjust access
                    in Configuration.
                  </p>
                )
              ) : recentReceipts.length ? (
                recentReceipts.map((r) => (
                  <button
                    key={r.itemId}
                    className={styles.documentButton}
                    onClick={() => onDocument(r.itemId!)}
                  >
                    <span className={styles.fileIcon}>
                      <FileText size={17} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-xs font-medium">
                        {r.itemId!.replace(`COLLECT-${r.company}-`, "")}
                      </span>
                      <span className="mt-1 block text-xs text-pi-body">
                        {r.outcome === "prepared"
                          ? "Draft prepared"
                          : r.outcome === "linked"
                            ? "Duplicate linked"
                            : r.outcome === "failed"
                              ? "Unreadable · follow up"
                              : "Needs your review"}
                      </span>
                    </span>
                    <ArrowRight size={14} className="text-pi-body" />
                  </button>
                ))
              ) : (
                <p className="p-5 text-sm leading-6 text-pi-body">
                  {c.busy
                    ? "Document collection is checking the connected sources. Documents will appear here as they’re collected."
                    : "No documents collected yet. Check the activity for details."}
                </p>
              )}
            </div>
            <p className="mt-4 text-xs leading-5 text-pi-body">
              {firstRun
                ? `${documents.length} unique sample document${documents.length === 1 ? "" : "s"} in your selected sources. Collection starts when you run the agent.`
                : "Select a document to review it in Inbox."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-pi-line px-6 py-3 text-xs text-pi-body">
          <ShieldCheck className="h-4 w-4 shrink-0 text-pi-success" />
          You approve every draft. Sending messages and Sync need your
          confirmation.
        </div>
      </section>
      {!firstRun && (
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-pi-line bg-background">
          {[
            [c.runs.length, "Collections"],
            [prepared, "Drafts prepared"],
            [attention, "Need attention"],
          ].map(([value, label]) => (
            <div
              key={label}
              className="border-r border-pi-line p-4 last:border-r-0 sm:p-5"
            >
              <p className="text-2xl font-semibold text-pi-ink">{value}</p>
              <p className="mt-1 text-xs text-pi-body">{label}</p>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-pi-line bg-background p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-pi-ink">
              Connected sources
            </h3>
            <Button variant="ghost" size="sm" onClick={onConfigure}>
              Manage
              <ArrowRight />
            </Button>
          </div>
          <div className="space-y-4">
            {c.sources.map((source) => (
              <div key={source.id} className="flex items-start gap-3">
                <ProviderIcon provider={source.provider} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-pi-ink">
                      {source.provider}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${source.status === "connected" ? "bg-pi-success-bg text-pi-success" : "bg-pi-warning-bg text-pi-warning"}`}
                    >
                      {source.status === "connected"
                        ? "Connected"
                        : "Disconnected"}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-xs text-pi-body">
                    {source.account}
                  </p>
                  <p className="mt-1 text-xs text-pi-body">{source.scope}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-pi-line bg-background p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-pi-ink">
              Latest activity
            </h3>
            <Button variant="ghost" size="sm" onClick={onActivity}>
              View all
              <ArrowRight />
            </Button>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pi-sunken text-pi-body">
              {firstRun ? (
                <Clock3 className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-pi-ink">
                {firstRun
                  ? "No collection tasks yet."
                  : latest.trigger === "continuous"
                    ? "Background collection"
                    : "Requested collection"}
              </p>
              <p className="mt-2 text-xs leading-5 text-pi-body">
                {firstRun
                  ? "Your first collection will appear here, with the documents found and anything that needs your attention."
                  : latest.summary}
              </p>
              {latest && (
                <p className="mt-3 text-xs capitalize text-pi-body">
                  {latest.status} ·{" "}
                  {new Date(latest.startedAt).toLocaleString("en-IN")}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
