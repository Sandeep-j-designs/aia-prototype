import { useRouter } from "next/router";
import { useNeo } from "@/hooks/pages/neo/use-neo";
import { prefillComposer } from "@/hooks/pages/neo/use-composer";

/**
 * Start a fresh Neo chat with a request, on Neo's page. While a run is live
 * it only goes to the chat, so the run in progress is what you see.
 */
export const useStartChat = () => {
  const router = useRouter();
  const neo = useNeo();
  return async (prompt: string, opts?: { prefill?: boolean }) => {
    // A request to finish first: a new chat with it typed in, not sent.
    if (opts?.prefill && !neo.busy) {
      neo.reset();
      prefillComposer(prompt);
      await router.push("/inbox?module=NEO");
      return;
    }
    if (neo.busy) {
      await router.push("/inbox?module=NEO");
      return;
    }
    neo.reset();
    await router.push("/inbox?module=NEO");
    void neo.startRun(prompt);
  };
};
