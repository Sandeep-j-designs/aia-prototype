import React, { useState } from "react";
import { bankingActions, useBanking } from "@/hooks/pages/inbox/use-banking";
import BankList from "./bank-list";
import StatementLogs from "./statement-logs";
import Transactions from "./transactions";
import UploadStatementSheet from "./upload-statement-sheet";

export type BankingView = {
  /** A bank ledger's id: its Transactions screen. Absent: the bank list. */
  account?: string;
  /** Statement Logs, for one account when `account` is also set. */
  logs?: boolean;
};

type Props = {
  view: BankingView;
  company: string;
  /** Move within Banking. Every screen is a URL, so Back works. */
  onNavigate: (view: BankingView) => void;
  notify: (
    message: string,
    kind?: "success" | "error" | "warning" | "info"
  ) => void;
  /** Real in the app, not built here. */
  onUnbuilt: (what: string) => void;
};

/**
 * Banking: the bank list, one account's transactions, and Statement Logs,
 * with the Upload Statement sheet reachable from all of them.
 *
 * Production: pages/bank/index.tsx, pages/bank/transaction/[id].tsx and
 * pages/bank/statement-logs.tsx. Here they are views of one module, picked by
 * the URL (?module=BANK[&account=][&logs=1]).
 */
const Banking = ({ view, company, onNavigate, notify, onUnbuilt }: Props) => {
  const { ledgers, statements, transactions } = useBanking(company);
  const [upload, setUpload] = useState<{
    ledgerId?: string;
    key: number;
  } | null>(null);

  const ledger = view.account
    ? ledgers.find((l) => l.id === view.account)
    : undefined;

  const openUpload = (ledgerId?: string) =>
    setUpload({ ledgerId, key: Date.now() });

  const sheet = upload ? (
    <UploadStatementSheet
      key={upload.key}
      open
      onOpenChange={(open) => !open && setUpload(null)}
      ledgers={ledgers}
      initialLedgerId={upload.ledgerId}
      statements={statements}
      onUploaded={(target, fileName) => {
        const mapped = ledgers.find((l) => l.id === target.ledgerId);
        if (
          mapped &&
          (mapped.accountType !== target.accountType ||
            mapped.bankName !== target.bankName)
        )
          bankingActions.mapLedger(
            company,
            target.ledgerId,
            target.accountType,
            target.bankName
          );
        bankingActions.addStatement(
          company,
          target.ledgerId,
          fileName,
          (statement, count) =>
            notify(
              `${statement.fileName} extracted\n${count} transactions are waiting in Needs Review for ${statement.bankAccountName}.`
            )
        );
      }}
      onDeleteStatement={(s) =>
        bankingActions.deleteStatement(company, s.bankStmtStatusUuid)
      }
      notify={notify}
      onUnbuilt={onUnbuilt}
    />
  ) : null;

  if (view.logs)
    return (
      <>
        <StatementLogs
          key={ledger?.id ?? "all"}
          statements={statements}
          ledger={ledger}
          onBack={() => onNavigate(ledger ? { account: ledger.id } : {})}
          onDelete={(s) =>
            bankingActions.deleteStatement(company, s.bankStmtStatusUuid)
          }
          notify={notify}
        />
        {sheet}
      </>
    );

  if (ledger)
    return (
      <>
        <Transactions
          key={ledger.id}
          company={company}
          ledger={ledger}
          ledgers={ledgers}
          transactions={transactions}
          onBack={() => onNavigate({})}
          onSwitch={(id) => onNavigate({ account: id })}
          onLogs={() => onNavigate({ account: ledger.id, logs: true })}
          onUpload={() => openUpload(ledger.id)}
          notify={notify}
          onUnbuilt={onUnbuilt}
        />
        {sheet}
      </>
    );

  return (
    <>
      <BankList
        ledgers={ledgers}
        onOpen={(l) => onNavigate({ account: l.id })}
        onUpload={(l) => openUpload(l?.id)}
        onLogs={(l) =>
          onNavigate(l ? { account: l.id, logs: true } : { logs: true })
        }
        notify={notify}
        onUnbuilt={onUnbuilt}
      />
      {sheet}
    </>
  );
};

export default Banking;
