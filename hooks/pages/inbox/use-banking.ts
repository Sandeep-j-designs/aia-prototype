import { useMemo, useSyncExternalStore } from "react";
import {
  EXTRACTED_ROWS,
  VOUCHER_TYPE_LABEL,
  buildTransaction,
  gstRegistrationsOf,
  seedFor,
} from "@/config/pages/inbox/mock-banking";
import type {
  BankAccountType,
  BankLedgerData,
  BankTransaction,
  Statement,
} from "@/types/pages/inbox/banking";

/**
 * Banking state: ledgers, statements and transactions for one company.
 *
 * Module-level, so moving between the bank list, an account's transactions
 * and Statement Logs keeps every edit, and an extraction started from the
 * upload sheet still finishes after the sheet closes. In memory only: a
 * reload starts from the mocks again.
 *
 * Every write below names the production endpoint it stands in for.
 */

type BankingState = {
  ledgers: BankLedgerData[];
  statements: Statement[];
  transactions: BankTransaction[];
};

/** How long the simulated extraction and sync take. */
const EXTRACTION_MS = 6000;
const SYNC_MS = 3000;

const stores = new Map<string, BankingState>();
const listeners = new Set<() => void>();

const seed = (company: string): BankingState => {
  const data = seedFor(company);
  return {
    // DEV: GET /api/bank/account-setup?companyId=…
    ledgers: structuredClone(data.ledgers),
    // DEV: GET /api/statements?companyId=…&groupName=bank
    statements: structuredClone(data.statements),
    // DEV: GET /api/transactions/bank?companyId=…&customerBank=…
    transactions: structuredClone(data.transactions),
  };
};

const read = (company: string) => {
  let state = stores.get(company);
  if (!state) {
    state = seed(company);
    stores.set(company, state);
  }
  return state;
};

const write = (company: string, next: Partial<BankingState>) => {
  stores.set(company, { ...read(company), ...next });
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A row is ready to sync once it has a voucher type and a ledger. */
const withReadiness = (txn: BankTransaction): BankTransaction => ({
  ...txn,
  isReadyToSync: !!txn.paymentType && txn.ledgersNameList.length > 0,
  voucherConfigLabel: txn.paymentType
    ? VOUCHER_TYPE_LABEL[txn.paymentType]
    : null,
});

const patchTransactions = (
  company: string,
  uuids: string[],
  change: (txn: BankTransaction) => Partial<BankTransaction>
) =>
  write(company, {
    transactions: read(company).transactions.map((txn) =>
      uuids.includes(txn.bankLineUuid)
        ? withReadiness({ ...txn, ...change(txn) })
        : txn
    ),
  });

export const bankingActions = {
  /** DEV: PATCH /api/bank/inline-edit?companyId=…&bankLineUuid=… */
  updateTransaction: (
    company: string,
    uuid: string,
    change: Partial<BankTransaction>
  ) => patchTransactions(company, [uuid], () => change),

  /**
   * DEV: POST /api/transactions/v1/transaction-link/{payment|receipt|contra}
   * -voucher-bulk-edit — one call per voucher type in the selection.
   */
  bulkCategorise: (
    company: string,
    uuids: string[],
    change: Partial<BankTransaction>
  ) => patchTransactions(company, uuids, () => change),

  /** DEV: PATCH /api/transactions/bank/toggle-accounting-ready */
  setAccountingReady: (company: string, uuids: string[], ready: boolean) =>
    patchTransactions(company, uuids, () => ({ accoutingReady: ready })),

  /** DEV: DELETE /api/transactions/bank/delete-transactions */
  deleteTransactions: (company: string, uuids: string[]) =>
    write(company, {
      transactions: read(company).transactions.filter(
        (txn) => !uuids.includes(txn.bankLineUuid)
      ),
    }),

  /**
   * DEV: POST /api/sync — then poll GET /api/sync for the result. Rows go
   * to in progress at once and to synced when Tally answers.
   */
  sync: (company: string, uuids: string[], onDone: (count: number) => void) => {
    patchTransactions(company, uuids, () => ({
      thirdPartySyncStatus: "in_progress",
      thirdPartyProduct: "Tally",
      thirdPartySyncError: null,
    }));
    window.setTimeout(() => {
      const now = new Date().toISOString().slice(0, 19);
      patchTransactions(company, uuids, () => ({
        thirdPartySyncStatus: "synced",
        thirdPartyPostingDate: now,
      }));
      onDone(uuids.length);
    }, SYNC_MS);
  },

  /**
   * DEV: POST /api/configuration/integration/zoho/accounts-mapping — the
   * upload saves the type and bank chosen for an unmapped ledger.
   */
  mapLedger: (
    company: string,
    ledgerId: string,
    accountType: BankAccountType,
    bankName: string
  ) =>
    write(company, {
      ledgers: read(company).ledgers.map((ledger) =>
        ledger.id === ledgerId
          ? {
              ...ledger,
              accountType,
              bankName,
              korefiBankName: bankName,
              typeOfAccountFixed: accountType,
            }
          : ledger
      ),
    }),

  /**
   * DEV: POST /api/upload-file-to-dms (presigned URL) → PUT the file →
   * POST /api/statements. Extraction then runs server-side; the screens poll
   * GET /api/statements and POST /api/workflow/status for its stage.
   *
   * Here a statement appears as Extracting and, a few seconds later, turns
   * Extracted and adds its transactions to Needs Review.
   */
  addStatement: (
    company: string,
    ledgerId: string,
    fileName: string,
    onExtracted: (statement: Statement, count: number) => void
  ) => {
    const ledger = read(company).ledgers.find((l) => l.id === ledgerId);
    if (!ledger) return;
    const id = `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const uploaded: Statement = {
      statementStartDate: "",
      statementEndDate: "",
      fileName,
      bankName: ledger.bankName ?? "",
      fileCategory:
        ledger.accountType === "credit_card"
          ? "credit_card_statement"
          : "bank_statement",
      accountNumber: ledger.ledgerName.match(/\d{4,}/)?.[0] ?? "",
      status: "file_uploaded",
      statusMessage: null,
      fileUuid: `file-${id}`,
      bankStmtStatusUuid: `stmt-${id}`,
      bankAccountNumber: ledger.ledgerName.match(/\d{4,}/)?.[0] ?? "",
      bankAccountName: ledger.ledgerName,
      bankAccountType: ledger.accountType,
      bankAccountUuid: ledgerId,
      workflowStage: "extracting",
      enrichmentPercentage: null,
      workflowError: null,
    };
    write(company, { statements: [uploaded, ...read(company).statements] });
    window.setTimeout(() => {
      const rows =
        EXTRACTED_ROWS[
          ledger.accountType === "credit_card" ? "credit_card" : "bank"
        ];
      const gst = gstRegistrationsOf(company)[0];
      const added = rows.map((row) => buildTransaction(ledgerId, row, gst));
      const done: Statement = {
        ...uploaded,
        status: "file_hitl_success",
        statementStartDate: "2026-09-01",
        statementEndDate: "2026-09-30",
        workflowStage: "extracted",
        enrichmentPercentage: 100,
        fileMetadata: { noOfDuplicates: 0, noOfLinesExtracted: added.length },
      };
      const state = read(company);
      write(company, {
        statements: state.statements.map((s) =>
          s.bankStmtStatusUuid === uploaded.bankStmtStatusUuid ? done : s
        ),
        transactions: [...state.transactions, ...added],
      });
      onExtracted(done, added.length);
    }, EXTRACTION_MS);
  },

  /** DEV: DELETE /api/statements/delete-statement */
  deleteStatement: (company: string, bankStmtStatusUuid: string) =>
    write(company, {
      statements: read(company).statements.filter(
        (s) => s.bankStmtStatusUuid !== bankStmtStatusUuid
      ),
    }),
};

export const isCashLedger = (ledger: BankLedgerData) =>
  ledger.typeOfAccountFixed.trim().toLowerCase() === "cash";

export const useBanking = (company: string) => {
  const state = useSyncExternalStore(
    subscribe,
    () => read(company),
    () => read(company)
  );
  // Production's server counts these; recounting keeps the list honest as
  // rows are marked ready here.
  const ledgers = useMemo(
    () =>
      state.ledgers.map((ledger) => ({
        ...ledger,
        unreconciledCount: state.transactions.filter(
          (txn) => txn.bankAccountUuid === ledger.id && !txn.accoutingReady
        ).length,
      })),
    [state]
  );
  return {
    ledgers,
    statements: state.statements,
    transactions: state.transactions,
  };
};
