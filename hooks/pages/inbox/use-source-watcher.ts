import { useEffect } from "react";
import { getState } from "@/components/inbox/v2/store";
import {
  collectSources,
  shouldWatchSources,
} from "@/hooks/pages/inbox/use-inbox-sources";

/** Session-only provider event simulation. Production uses provider webhooks
 * and durable jobs, not browser intervals. Reuses Neo's idempotent importer. */
export const useSourceWatcher = () => {
  useEffect(() => {
    let cancelled = false;
    const timer = window.setInterval(() => {
      const company = getState().company;
      if (!shouldWatchSources(company)) return;
      void collectSources(
        company,
        `source-watch-${Date.now()}`,
        async () => {
          if (cancelled || getState().company !== company)
            throw new Error("Collection stopped");
        },
        undefined,
        undefined,
        undefined,
        "continuous"
      ).catch(() => {
        /* Failures stay retryable; source check time is not advanced. */
      });
    }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);
};
