import React, { useEffect, useRef, useState } from "react";
import {
  Download,
  FilePlus2,
  FileText,
  Lightbulb,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ComboBox } from "@/components/common/combo-box";
import { cn } from "@/lib/utils";
import { isCashLedger } from "@/hooks/pages/inbox/use-banking";
import { BANK_OPTIONS } from "@/config/pages/inbox/mock-banking";
import type {
  BankAccountType,
  BankLedgerData,
  BankUploadTarget,
  FileStatus,
  Statement,
} from "@/types/pages/inbox/banking";
import { Field, Req, T } from "@/components/inbox/v2/ui";
import {
  DeleteStatementDialog,
  StatementStatusPill,
  canDeleteStatement,
  periodOf,
} from "./statement-parts";

/**
 * Upload Statement — a right sheet, 800px.
 *
 * Production: components/bank/upload-statements-sheet.tsx with
 * hooks/pages/bank/useBankUploadSheetController.ts. Ledger, account type and
 * bank come first; the drop zone opens once all three are set. Each file is
 * checked (corrupt? password?) and uploaded with a progress bar.
 *
 * Simulated here: a file named with "corrupt" fails the check; one named with
 * "protected" or "password" asks for its password (any password but "wrong"
 * opens it).
 *
 * DEV: the check reads the PDF with pdfjs; the upload is
 * POST /api/upload-file-to-dms → PUT presigned URL → POST /api/statements.
 */

const MAX_FILE_SIZE_MB = 50;
const ACCOUNT_TYPES: { label: string; value: BankAccountType }[] = [
  { label: "Bank", value: "bank" },
  { label: "Credit Card", value: "credit_card" },
];
const TYPE_LABEL: Record<string, string> = {
  bank: "Bank",
  credit_card: "Credit Card",
};
/** production's DEFAULT_STATUS_PROGRESS for a file without a real figure. */
const STEP_PROGRESS = { pending: 18, checking: 32, uploading: 55 };

const EMPTY_TARGET: BankUploadTarget = {
  ledgerId: "",
  ledgerName: "",
  accountType: "",
  accountTypeLabel: "",
  bankName: "",
  bankId: null,
};

const targetFor = (ledger?: BankLedgerData): BankUploadTarget =>
  ledger
    ? {
        ledgerId: ledger.id,
        ledgerName: ledger.ledgerName,
        accountType: ledger.accountType,
        accountTypeLabel: TYPE_LABEL[ledger.accountType] ?? "",
        bankName: ledger.bankName || ledger.korefiBankName || "",
        bankId: ledger.bankId,
      }
    : EMPTY_TARGET;

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

/** A row in the file list: name • state, then its control. */
const FileRow = ({
  file,
  onRemove,
  onPassword,
}: {
  file: FileStatus;
  onRemove: () => void;
  onPassword: (password: string) => void;
}) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const name = (
    <span className="max-w-[240px] truncate text-sm text-secondary-foreground">
      {file.file.name}
    </span>
  );
  const remove = (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Remove ${file.file.name}`}
      onClick={onRemove}
      className="shrink-0 text-secondary-foreground hover:text-primary"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
  if (
    file.status === "pending" ||
    file.status === "checking" ||
    file.status === "uploading"
  )
    return (
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">{name}</div>
        <Progress
          value={file.progress || STEP_PROGRESS[file.status]}
          className="h-2 w-[290px] shrink-0 bg-neutral-gray"
          indicatorClassName="bg-primary"
          aria-label={`Uploading ${file.file.name}`}
        />
      </div>
    );
  if (file.status === "password_required")
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {name}
          <span className="text-sm text-secondary-foreground">&bull;</span>
          <span className="text-sm text-destructive-foreground">
            Password Required
          </span>
          <div className="flex w-[196px] flex-col gap-1">
            <Input
              type="password"
              placeholder="Enter Password"
              aria-label={`Password for ${file.file.name}`}
              value={password}
              aria-invalid={!!error}
              className={cn("h-8", error && "border-destructive-foreground")}
              onChange={(e) => {
                setPassword(e.target.value);
                if (e.target.value) setError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            {error ? (
              <span className="text-xs text-destructive-foreground">
                {error}
              </span>
            ) : null}
          </div>
          <Button
            variant="link"
            className="h-auto p-0 font-semibold"
            onClick={() => {
              if (!password) return setError("Password is required");
              // Simulated: "wrong" stands in for a password pdfjs rejects.
              if (password === "wrong") return setError("Incorrect password");
              setError("");
              onPassword(password);
            }}
          >
            Give Access
          </Button>
        </div>
        {remove}
      </div>
    );
  if (file.status === "corrupted" || file.status === "error")
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {name}
          <span className="text-sm text-secondary-foreground">&bull;</span>
          <span className="truncate text-sm text-destructive-foreground">
            {file.status === "corrupted"
              ? "Corrupted file found"
              : file.error || "Upload failed"}
          </span>
        </div>
        {remove}
      </div>
    );
  return null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgers: BankLedgerData[];
  /** Opening from a ledger's row or its transactions pre-fills it. */
  initialLedgerId?: string;
  statements: Statement[];
  /** Called once a file has uploaded, with the target it went to. */
  onUploaded: (target: BankUploadTarget, fileName: string) => void;
  onDeleteStatement: (statement: Statement) => void;
  notify: (message: string, kind?: "success" | "error" | "info") => void;
  onUnbuilt: (what: string) => void;
};

const UploadStatementSheet = ({
  open,
  onOpenChange,
  ledgers,
  initialLedgerId,
  statements,
  onUploaded,
  onDeleteStatement,
  notify,
  onUnbuilt,
}: Props) => {
  const uploadLedgers = ledgers.filter((l) => !isCashLedger(l));
  const [target, setTarget] = useState<BankUploadTarget>(() =>
    targetFor(uploadLedgers.find((l) => l.id === initialLedgerId))
  );
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState<Statement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  const ready = !!(target.ledgerId && target.accountType && target.bankName);

  const update = (id: string, change: Partial<FileStatus>) =>
    mounted.current &&
    setFiles((list) =>
      list.map((f) => (f.id === id ? { ...f, ...change } : f))
    );

  const upload = async (entry: FileStatus) => {
    update(entry.id, { status: "uploading", progress: 55 });
    for (const progress of [70, 85, 100]) {
      await wait(350);
      update(entry.id, { progress });
    }
    update(entry.id, { status: "completed" });
    onUploaded(entry.uploadTarget ?? target, entry.file.name);
    notify(
      `${entry.file.name} uploaded\nAIA is reading it now. Extraction can take up to 30 minutes.`
    );
  };

  const process = async (entry: FileStatus) => {
    await wait(300);
    update(entry.id, { status: "checking" });
    await wait(500);
    const lower = entry.file.name.toLowerCase();
    if (lower.includes("corrupt"))
      return update(entry.id, {
        status: "corrupted",
        error: "Corrupted File; please obtain new copy of the file.",
      });
    if (lower.includes("protected") || lower.includes("password"))
      return update(entry.id, { status: "password_required" });
    await upload(entry);
  };

  const addFiles = (list: FileList | File[]) => {
    if (!ready) {
      notify(
        "Select a ledger, account type, and bank before uploading.",
        "error"
      );
      return;
    }
    const all = Array.from(list);
    if (all.some((f) => f.size > MAX_FILE_SIZE_MB * 1024 * 1024)) {
      notify(
        `File exceeds the maximum size of ${MAX_FILE_SIZE_MB} MB.`,
        "error"
      );
      return;
    }
    // Production drops anything that is not a PDF without a word.
    const entries: FileStatus[] = all
      .filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name))
      .map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: "pending",
        progress: 0,
        uploadTarget: { ...target },
      }));
    setFiles((current) => [...current, ...entries]);
    entries.forEach((entry) => void process(entry));
  };

  const chooseLedger = (id: string) =>
    setTarget(targetFor(uploadLedgers.find((l) => l.id === id)));

  const shownStatements = target.ledgerId
    ? statements.filter((s) => s.bankAccountUuid === target.ledgerId)
    : statements;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-neutral-gray p-0 sm:max-w-[800px]"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b border-neutral-gray px-6 py-4 text-left">
          <SheetTitle className={T.title}>Upload Statement</SheetTitle>
          <SheetDescription className="sr-only">
            Choose the ledger, then upload its PDF statements.
          </SheetDescription>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close">
              <X className="h-5 w-5 text-secondary-foreground" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label={
                <>
                  <Req />
                  Ledger
                </>
              }
            >
              <ComboBox
                title="Select a Ledger type..."
                options={uploadLedgers.map((l) => ({
                  value: l.id,
                  label: l.ledgerName,
                }))}
                selectedValue={target.ledgerId}
                onChange={(value) => chooseLedger(String(value))}
                isMultiSelect={false}
                actionLabel="+ Create Ledger"
                onAction={() => onUnbuilt("Creating a ledger")}
                hideClearButton
              />
            </Field>
            <Field
              label={
                <>
                  <Req />
                  Account Type
                </>
              }
            >
              <ComboBox
                title="Select an account type..."
                options={ACCOUNT_TYPES}
                selectedValue={target.accountType}
                onChange={(value) =>
                  setTarget((t) => ({
                    ...t,
                    accountType: value as BankAccountType,
                    accountTypeLabel: TYPE_LABEL[String(value)] ?? "",
                  }))
                }
                hasSearch={false}
                isMultiSelect={false}
                disabled={!target.ledgerId}
                hideClearButton
              />
            </Field>
            <Field
              label={
                <>
                  <Req />
                  Bank
                </>
              }
            >
              <ComboBox
                title="Select Bank"
                options={BANK_OPTIONS.map((b) => ({ value: b, label: b }))}
                selectedValue={target.bankName}
                onChange={(value) =>
                  setTarget((t) => ({ ...t, bankName: String(value) }))
                }
                isMultiSelect={false}
                disabled={!target.ledgerId}
                hideClearButton
              />
            </Field>
          </div>

          <div className="flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              aria-disabled={!ready}
              aria-label="Drop your files or browse"
              onClick={() =>
                ready
                  ? inputRef.current?.click()
                  : notify(
                      "Select a ledger, account type, and bank before uploading.",
                      "error"
                    )
              }
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && ready) {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                if (ready) setDragging(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "flex h-[209px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                ready ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                dragging && "border-primary bg-accent"
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-gray">
                  <FilePlus2 className="h-6 w-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-secondary-foreground">
                    Drop your files or{" "}
                    <span className="border-b-[1.5px] border-primary text-primary">
                      browse
                    </span>
                  </p>
                  <p className="text-sm text-secondary-foreground">
                    Supported format: pdf.
                  </p>
                </div>
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="application/pdf"
              className="hidden"
              disabled={!ready}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.some((f) => f.status !== "completed") ? (
              <div className="space-y-2 py-1">
                {files.map((f) =>
                  f.status === "completed" ? null : (
                    <div
                      key={f.id}
                      className="border-b border-neutral-gray pb-2 last:border-b-0"
                    >
                      <FileRow
                        file={f}
                        onRemove={() =>
                          setFiles((list) => list.filter((x) => x.id !== f.id))
                        }
                        onPassword={(password) => {
                          update(f.id, { password });
                          void upload({ ...f, password });
                        }}
                      />
                    </div>
                  )
                )}
              </div>
            ) : null}
          </div>

          <div className="ml-4 flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Lightbulb className="h-4 w-4" />
              Upload Guidelines:
            </span>
            <ul className="list-disc pl-7 text-sm text-secondary-foreground">
              <li>
                Only PDF statements downloaded from your bank&apos;s netbanking
                are supported. Scanned PDFs are not supported.
              </li>
              <li>Extraction might take up to 30 mins.</li>
              <li>
                If extraction fails, our system automatically retries after 30
                minutes.
              </li>
            </ul>
          </div>

          <div className="flex flex-col">
            <h2 className={cn(T.title, "text-secondary-foreground")}>
              Statements
            </h2>
            {shownStatements.length ? (
              <div className="divide-y divide-neutral-gray">
                {shownStatements.map((s) => (
                  <div
                    key={s.bankStmtStatusUuid}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-accent">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="max-w-[400px] truncate text-sm text-foreground">
                            {s.fileName}
                          </span>
                          <StatementStatusPill statement={s} />
                        </div>
                        <p className={cn(T.sub, "mt-1 flex flex-wrap gap-1")}>
                          <span className="mr-1 text-primary">
                            {s.bankAccountName}
                          </span>
                          {s.statementStartDate ? (
                            <>
                              <span>&bull;</span>
                              <span>{periodOf(s)}</span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    {canDeleteStatement(s) ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Download ${s.fileName}`}
                          className="text-secondary-foreground"
                          onClick={() => notify(`${s.fileName} downloaded`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          isDestructive
                          aria-label={`Delete ${s.fileName}`}
                          onClick={() => setDeleting(s)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn(T.value, "py-6")}>
                No statement found, upload statements to see statements here.
              </p>
            )}
          </div>
        </div>
        <DeleteStatementDialog
          statement={deleting}
          onClose={() => setDeleting(null)}
          onConfirm={(statement) => {
            onDeleteStatement(statement);
            setDeleting(null);
            notify("Statement deleted");
          }}
        />
      </SheetContent>
    </Sheet>
  );
};

export default UploadStatementSheet;
