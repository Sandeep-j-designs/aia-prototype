import React from "react";
import PageTopBar from "@/components/common/page-top-bar";
import { UNDERLINE_TAB } from "@/components/inbox/v2/banking/table-parts";
import { CountPill } from "@/components/inbox/v2/ui";
type Props = {
  title: string;
  tabs?: { id: string; label: string; count?: number }[];
  tab?: string;
  onTab?: (tab: string) => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
};
const FeaturePage = ({
  title,
  tabs = [],
  tab,
  onTab,
  actions,
  children,
}: Props) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
    <div className="px-[var(--inset-page)] pt-6">
      <PageTopBar
        title={title}
        className="flex-wrap gap-4"
        leading={
          <div
            className="flex gap-6 border-b border-pi-line"
            role="tablist"
            aria-label={title}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                data-state={tab === t.id ? "active" : "inactive"}
                className={UNDERLINE_TAB}
                onClick={() => onTab?.(t.id)}
              >
                {t.label}
                {t.count !== undefined && <CountPill>{t.count}</CountPill>}
              </button>
            ))}
          </div>
        }
        leadingActions={actions}
      />
    </div>
    <div className="space-y-6 p-[var(--inset-page)]">{children}</div>
  </div>
);
export default FeaturePage;
