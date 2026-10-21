import { useNeo } from "@/hooks/pages/neo/use-neo";
import {
  collectionAgent,
  configureCollectionAgent,
  stopCollection,
  useInboxSources,
} from "@/hooks/pages/inbox/use-inbox-sources";
import type { AgentRunMode } from "@/types/pages/inbox/sources";

export const useCollectionAgent = (company: string) => {
  const state = useInboxSources();
  const neo = useNeo();
  const agent = collectionAgent(company);
  const sources = state.sources.filter((s) => s.company === company);
  const connected = sources.filter((s) => s.status === "connected");
  const runs = state.runs.filter((r) => r.company === company);
  const receipts = state.receipts.filter((r) => r.company === company);
  const busy = state.busy.includes(company);
  const status = !agent.configured
    ? "Not configured"
    : busy
      ? "Running"
      : !connected.length
        ? "Needs attention"
        : agent.runMode === "on-demand"
          ? "Ready"
          : agent.paused
            ? "Paused"
            : "Watching";
  const run = () => {
    neo.setOpen(true);
    void neo.startRun(
      "Collect documents from my connected sources and prepare my Inbox"
    );
  };
  const saveMode = (mode: AgentRunMode) =>
    configureCollectionAgent(company, mode);
  const pause = () =>
    configureCollectionAgent(company, agent.runMode, !agent.paused);
  const stop = () => {
    stopCollection(company);
    if (
      neo.busy &&
      runs.some((r) => r.id === neo.busy && r.status === "running")
    )
      neo.stop();
  };
  return {
    agent,
    sources,
    connected,
    runs,
    receipts,
    busy,
    status,
    run,
    saveMode,
    pause,
    stop,
    neoBusy: !!neo.busy,
  };
};
