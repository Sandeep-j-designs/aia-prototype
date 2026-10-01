import React from "react";
import {
  coaActions,
  useChartOfAccounts,
} from "@/hooks/pages/inbox/use-chart-of-accounts";
import LedgerForm from "./ledger-form";
import LedgerTree from "./ledger-tree";

export type CoaView = {
  /** "new" for New Ledger, a ledger's id for Edit Ledger. Absent: the tree. */
  ledger?: string;
};

type Props = {
  view: CoaView;
  company: string;
  /** Move within Chart of Accounts. Every screen is a URL, so Back works. */
  onNavigate: (view: CoaView) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  /** Real in the app, not built here. */
  onUnbuilt: (what: string) => void;
};

/**
 * Chart of Accounts: the group and ledger tree, and the New Ledger / Edit
 * Ledger page.
 *
 * Production: pages/accounting-masters/index.tsx,
 * pages/accounting-masters/create-ledger.tsx and
 * pages/accounting-masters/update-ledger/[id].tsx. Here they are views of one
 * module, picked by the URL (?module=COA[&ledger=new|<id>]).
 *
 * Not built: the ledger statement page, the Cost Centre tab, the GSTIN link
 * modal and party documents.
 */
const ChartOfAccounts = ({
  view,
  company,
  onNavigate,
  notify,
  onUnbuilt,
}: Props) => {
  const { nodesByParent, allNodes, counts } = useChartOfAccounts(company);

  if (view.ledger)
    return (
      <LedgerForm
        company={company}
        ledgerId={view.ledger === "new" ? undefined : view.ledger}
        onBack={() => onNavigate({})}
        notify={notify}
        onUnbuilt={onUnbuilt}
      />
    );

  return (
    <LedgerTree
      nodesByParent={nodesByParent}
      allNodes={allNodes}
      counts={counts}
      onAdd={() => onNavigate({ ledger: "new" })}
      onEdit={(node) =>
        node.accountUuid && onNavigate({ ledger: node.accountUuid })
      }
      onDelete={(node) => {
        if (!node.accountUuid) return;
        coaActions.deleteLedger(company, node.accountUuid);
        notify("Ledger deleted successfully");
      }}
      onSync={(ids) => {
        const count = coaActions.sync(company, ids, (done) =>
          notify(
            `Sync finished\n${done} ${done === 1 ? "ledger is" : "ledgers are"} now in Tally.`
          )
        );
        if (count)
          notify("Sync started\nAIA will tell you here when it finishes.");
        else
          notify("Nothing to sync\nEvery ledger is already in Tally.", "info");
      }}
      notify={notify}
    />
  );
};

export default ChartOfAccounts;
