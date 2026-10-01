/**
 * Banking — bank ledgers, their statements and the transactions read off
 * them.
 *
 * These mirror production's contracts field for field, trimmed to what the
 * prototype's screens read:
 *   BankLedgerData  ← types/pages/bank/account-setup.ts
 *   Statement       ← types/pages/bank/statements.ts
 *   BankTransaction ← types/pages/bank/transaction.ts
 * camelCase throughout: apiClient converts at the boundary.
 */

/** "bank" | "credit_card", or "" while the ledger is not mapped. */
export type BankAccountType = "bank" | "credit_card" | "";

export interface BankLedgerData {
  id: string;
  ledgerName: string;
  accountType: BankAccountType;
  bankName: string | null;
  /**
   * Server-computed in production. The prototype recomputes it from the
   * transactions it holds, so marking one ready moves the count.
   */
  unreconciledCount: number;
  /** The Tally group the ledger sits under. */
  accountParent: string | null;
  useInKorefi: boolean;
  bankId: number | null;
  korefiBankName: string | null;
  /** "cash" for a cash ledger, which has no statement to upload. */
  typeOfAccountFixed: string;
}

/** The fields the upload sheet sets before a file can be picked. */
export interface BankUploadTarget {
  ledgerId: string;
  ledgerName: string;
  accountType: BankAccountType;
  accountTypeLabel: string;
  bankName: string;
  bankId: number | null;
}

/** Production's FILE_HITL_* statuses, plus the in-flight one. */
export type StatementStatus =
  "file_hitl_success" | "file_hitl_rejected" | "file_uploaded";

export type StatementWorkflowStage =
  | "extracted"
  | "extraction_failed"
  | "paused"
  | "enriching"
  | "not_found"
  | "extracting";

export type Statement = {
  statementStartDate: string;
  statementEndDate: string;
  fileName: string;
  bankName: string;
  fileCategory: string;
  accountNumber: string;
  status: StatementStatus;
  statusMessage: null | string;
  fileUuid: string;
  bankStmtStatusUuid: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankAccountType: string;
  /**
   * PROTOTYPE: the ledger this statement belongs to. Production filters on
   * the server with ?customerBank=<ledger id> and does not echo it back.
   */
  bankAccountUuid: string;
  fileMetadata?: {
    noOfDuplicates: number;
    noOfLinesExtracted: number;
  };
  workflowStage?: StatementWorkflowStage | null;
  enrichmentPercentage?: number | null;
  workflowError?: string | null;
};

export type FileStatusTypes =
  | "pending"
  | "checking"
  | "corrupted"
  | "password_required"
  | "uploading"
  | "completed"
  | "error";

export interface FileStatus {
  id: string;
  file: File;
  status: FileStatusTypes;
  progress: number;
  error?: string;
  password?: string;
  uploadTarget?: BankUploadTarget;
}

/** Tally's three bank voucher types (production's ExactVoucherType). */
export type TallyVoucherPaymentType = "payment" | "receipt" | "contra";

/** production's ThirdPartySyncStatus values the screen draws. */
export type ThirdPartySyncStatus =
  "not_synced" | "synced" | "in_progress" | "event_creations_failed";

export interface BankTransaction {
  bankLineId: number;
  bankLineUuid: string;
  /** The bank ledger's id. */
  bankAccountUuid: string;
  transactionDate: string;
  /** Rupees as a decimal string, as the API sends it. */
  transactionAmountLc: string;
  /** The statement's side: "debit" is money out, "credit" money in. */
  crDr: "debit" | "credit";
  bankName: string;
  bankAccountName: string;
  bankAccountType: string;
  description: string;
  /** The notes field in the details sheet. */
  remarks: string;
  paymentType: TallyVoucherPaymentType | null;
  voucherConfigLabel?: string | null;
  /** "ai" when AIA filled the type and ledger. */
  categorisedBy: "ai" | "user" | "";
  ledgersNameList: string[];
  ledgersUuidList: string[];
  thirdPartySyncStatus: ThirdPartySyncStatus;
  thirdPartySyncError: string | null;
  thirdPartyPostingDate: string;
  thirdPartyProduct: string;
  // Production's spelling — the API field is `accouting_ready`. Keep it.
  accoutingReady: boolean;
  isReadyToSync: boolean;
  companyGstLabel: string;
  companyGstUuid: string;
  voucherNo?: string | null;
}

/** A Tally ledger the Ledger picker offers, under its group. */
export type LedgerOptionGroup = { heading: string; options: string[] };
