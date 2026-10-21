import React, { createContext, ReactNode } from "react";
import { useSourceWatcher } from "@/hooks/pages/inbox/use-source-watcher";
import {
  useNeoRuntime,
  type NeoRuntime,
} from "@/hooks/pages/neo/use-neo-runtime";

export const NeoContext = createContext<NeoRuntime | null>(null);

type Props = { children: ReactNode };

/**
 * Neo lives above the routes, like the guide: a run started on the queue has
 * to survive opening the document it created.
 *
 * DEV: mount in production's pages/_app.tsx beside GuideProvider.
 */
const NeoProvider = ({ children }: Props) => {
  useSourceWatcher();
  const runtime = useNeoRuntime();
  return <NeoContext.Provider value={runtime}>{children}</NeoContext.Provider>;
};

export default NeoProvider;
