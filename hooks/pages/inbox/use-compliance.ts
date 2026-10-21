import { useSyncExternalStore } from "react";
import { MOCK_COMPLIANCE } from "@/config/pages/inbox/mock-compliance";
import type { ComplianceIssue } from "@/types/pages/inbox/ai-features";
import { getGstState } from "@/hooks/pages/inbox/use-gst";
import {
  actor,
  getState,
  personCreate,
  neoDiscard,
  blankForm,
  type Item,
} from "@/components/inbox/v2/store";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
import { notificationActions } from "@/hooks/pages/notifications/use-notifications";
let issues = structuredClone(MOCK_COMPLIANCE);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const seeded = new Set<string>();
export const checkCompany = (company: string) => {
  if (!seeded.has(company)) {
    seeded.add(company);
    const rows = Object.values(getGstState(company).invoices)
      .flat()
      .filter((r) => r.matchType === "missing_in_pr" && r.gstr2b);
    issues = [
      ...issues,
      ...rows.map((r): ComplianceIssue => ({
        id: `missing-${r.gstr2b!.gstr2bLineUuid}`,
        company,
        documentId: "",
        vendor: r.gstr2b!.vendorName,
        check: "ITC in 2B, no bill in books",
        evidence: `${r.gstr2b!.invoiceNo} appears in GSTR-2B; no purchase register match. Obtain the source invoice before claiming.`,
        impact: r.gstr2b!.totalGst,
        fix: "Draft request for bill",
        kind: "email",
        status: "open",
      })),
    ];
  }
};
export const runComplianceChecks = (company: string, documentId?: string) => {
  checkCompany(company);
  const open = issues.filter(
    (x) =>
      x.company === company &&
      x.status === "open" &&
      (!documentId || x.documentId === documentId)
  );
  if (open.length)
    notificationActions.push(
      {
        companyId: company,
        kind: "compliance_issue",
        data: { count: open.length },
        actor: { kind: "ai", name: "Neo · Compliance check" },
        target: { href: "/inbox", label: "Inbox" },
        refs: open.map((x) => x.id),
      },
      { toast: false }
    );
  logActivity({
    company,
    actor: { kind: "ai", name: "Neo · Compliance check" },
    kind: "predicted",
    module: "GST",
    action: "Checked compliance",
    subject: `${open.length} open issues`,
    reason:
      "Document evidence and GST reconciliation compared with the configured checks",
  });
  emit();
};
/** Open and resolved issues for a company, outside React (the firm brief). */
export const getComplianceIssues = (company: string) => {
  checkCompany(company);
  return issues.filter((x) => x.company === company);
};
export const subscribeCompliance = (f: () => void) => {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
};
export const useCompliance = (company: string) => {
  // DEV: GET /api/compliance/issues?companyUuid=… returns ComplianceIssue[].
  const current = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => issues,
    () => issues
  );
  return current.filter((x) => x.company === company);
};
export const resolveCompliance = (
  issue: ComplianceIssue,
  resolution: string,
  body?: string
) => {
  // DEV: POST /api/compliance/issues/:id/resolve, with the draft or explicit simulated-send confirmation.
  if (getState().company !== issue.company || !resolution.trim()) return;
  let draft: Item | undefined;
  if (resolution === "Draft created") {
    const source = getState().items.find(
      (x) => x.id === issue.documentId && x.company === issue.company
    );
    if (!source) throw new Error("Source document is unavailable");
    const form = {
      ...blankForm(),
      gst: source.form.gst,
      voucherType: "Journal",
      voucherNo: `JV/26-27/${issue.id}`,
      date: "2026-10-13",
      narration: issue.evidence,
      lines: [
        {
          description: issue.evidence,
          ledger: issue.debit || "GST Expense",
          amount: issue.impact,
          dr: issue.impact,
          cr: 0,
          costCentre: "",
        },
        {
          description: "Reverse input credit",
          ledger: "Input GST",
          amount: issue.impact,
          dr: 0,
          cr: issue.impact,
          costCentre: "",
        },
      ],
    };
    draft = personCreate(
      {
        ...structuredClone(source),
        id: `FIX-${crypto.randomUUID()}`,
        route: "JV",
        aiRoute: "JV",
        created: true,
        amount: issue.impact,
        form,
        arSheet: undefined,
        sheet: undefined,
        reason: issue.evidence,
      },
      `compliance-${issue.id}`,
      source.id
    );
  }
  const before = issues;
  issues = issues.map((x) =>
    x.id === issue.id
      ? { ...x, status: "resolved", resolution, draftId: draft?.id }
      : x
  );
  notificationActions.resolve(issue.company, ["compliance_issue"], issue.id);
  logActivity(
    {
      company: issue.company,
      actor: { kind: "person", name: actor },
      kind: "override",
      module: "GST",
      action: resolution,
      subject: issue.vendor,
      reason: body || issue.evidence,
      ref: draft ? { kind: "document", id: draft.id } : undefined,
      undoable: resolution !== "Sent (simulated)",
    },
    resolution !== "Sent (simulated)"
      ? () => {
          if (draft) {
            const result = neoDiscard([draft], `compliance-${issue.id}`);
            if (!result.reversed.length)
              throw new Error("Journal was changed or approved");
          }
          issues = issues.map((x) =>
            x.id === issue.id
              ? before.find((prior) => prior.id === issue.id)!
              : x
          );
          emit();
        }
      : undefined
  );
  emit();
};
