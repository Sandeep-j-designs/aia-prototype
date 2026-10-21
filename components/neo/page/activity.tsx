import React from "react";
import ActivityLog from "@/components/inbox/v2/automation/activity-log";
import RunList from "@/components/neo/common/run-list";
import { useNeo } from "@/hooks/pages/neo/use-neo";

type Props = {
  company: string;
  user: string;
  onOpenDocument: (id: string) => void;
  notify: (message: string, kind?: "success" | "info") => void;
};

/**
 * Neo › Activity: the activity log, plus Neo's tasks — every run this
 * session with its outcome and its Undo. The tasks used to be a tab in the
 * docked panel; they live here now, so the panel is only a chat.
 */
const NeoActivity = (props: Props) => {
  const neo = useNeo();
  return (
    <ActivityLog
      {...props}
      tasks={{
        label: "Neo tasks",
        count: neo.runs.length,
        content: (
          <RunList
            runs={neo.runs}
            onUndo={neo.undo}
            onRef={neo.goTo}
            busy={!!neo.busy}
          />
        ),
      }}
    />
  );
};

export default NeoActivity;
