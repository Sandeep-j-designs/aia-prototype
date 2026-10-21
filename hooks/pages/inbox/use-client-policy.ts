import { useSyncExternalStore } from "react";
import {
  FIRM_POLICY,
  MOCK_CLIENT_POLICY,
} from "@/config/pages/inbox/mock-client-policy";
import type { PolicyRule } from "@/types/pages/inbox/ai-features";
import {
  actor,
  getState,
  update,
  type Item,
} from "@/components/inbox/v2/store";
import { logActivity } from "@/hooks/pages/inbox/use-activity";
let rules = structuredClone(MOCK_CLIENT_POLICY);
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
export const policyMatches = (rule: PolicyRule, item: Item) =>
  item.company === rule.company &&
  item.route === "AP" &&
  new RegExp(rule.condition.description, "i").test(
    item.form.lines.map((l) => l.description).join(" ")
  ) &&
  item.form.lines.reduce((s, l) => s + l.amount, 0) >
    (rule.condition.minimum || 0);
export const policyFor = (item: Item) =>
  rules.find((r) => r.active && policyMatches(r, item));
export const policyHistory = (rule: PolicyRule) =>
  getState().items.filter((x) => policyMatches(rule, x));
export const parsePolicy = (text: string, company: string): PolicyRule[] => {
  // DEV: POST /api/policy/parse returns structured rules. Prototype uses a scripted matcher for these phrases, not a language model.
  return text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const template = FIRM_POLICY.find((r) =>
        new RegExp(r.condition.description, "i").test(line)
      );
      if (!template)
        throw new Error(
          `Could not interpret “${line}”. Try equipment, lab testing or generator diesel.`
        );
      const amount = line.match(/(?:over|above)\s*₹?([\d,]+)/i);
      const ledger = line
        .match(/(?:go(?:es)? to|capitalise (?:to|as))\s+(.+?)(?:,|\.|$)/i)?.[1]
        ?.trim();
      return {
        ...structuredClone(template),
        id: crypto.randomUUID(),
        company,
        text: line,
        active: true,
        condition: {
          ...template.condition,
          minimum: amount
            ? Number(amount[1].replaceAll(",", ""))
            : template.condition.minimum,
        },
        action: { ledger: ledger || template.action.ledger },
      };
    });
};
export const savePolicies = (company: string, next: PolicyRule[]) => {
  // DEV: PUT /api/policy?companyUuid=… returns the confirmed rules.
  const before = rules;
  rules = [...rules.filter((r) => !next.some((n) => n.id === r.id)), ...next];
  logActivity(
    {
      company,
      actor: { kind: "person", name: actor },
      kind: "rule",
      module: "Automation",
      action: "Confirmed client policy",
      subject: `${next.length} rules`,
      reason: next.map((x) => x.text).join("\n"),
      undoable: true,
    },
    () => {
      rules = [
        ...rules.filter((r) => !next.some((n) => n.id === r.id)),
        ...before.filter((r) => next.some((n) => n.id === r.id)),
      ];
      emit();
    }
  );
  emit();
};
export const applyFirmPolicy = (companies: string[]) =>
  companies.forEach((company) =>
    savePolicies(
      company,
      FIRM_POLICY.map((r) => ({
        ...structuredClone(r),
        id: `template-${company}-${r.id}`,
        company,
        template: true,
      }))
    )
  );
export const applyPolicyPrediction = (id: string) => {
  const item = getState().items.find((x) => x.id === id);
  if (!item || item.status !== "Needs Review") return;
  const rule = policyFor(item);
  if (!rule) return;
  if (item.form.lines.every((l) => l.ledger === rule.action.ledger)) return;
  const before = structuredClone(item.form);
  update(id, {
    form: {
      ...item.form,
      lines: item.form.lines.map((l) => ({ ...l, ledger: rule.action.ledger })),
    },
  });
  logActivity(
    {
      company: item.company,
      actor: { kind: "ai", name: "Neo · Policy" },
      kind: "predicted",
      module: "Purchases",
      action: "Predicted ledger from policy",
      subject: item.form.voucherNo,
      ref: { kind: "document", id },
      reason: rule.text,
      undoable: true,
    },
    () => {
      const now = getState().items.find((x) => x.id === id);
      if (now?.status !== "Needs Review")
        throw new Error("The bill was approved");
      if (!now.form.lines.every((l) => l.ledger === rule.action.ledger))
        throw new Error("The bill was edited after this prediction");
      update(id, { form: before });
    }
  );
};
export const useClientPolicy = (company: string) => {
  // DEV: GET /api/policy?companyUuid=… returns PolicyRule[].
  const state = useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => {
        listeners.delete(f);
      };
    },
    () => rules,
    () => rules
  );
  return state.filter((r) => r.company === company);
};
