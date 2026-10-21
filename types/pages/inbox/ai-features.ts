export type ComplianceIssue = {
  id: string;
  company: string;
  documentId: string;
  vendor: string;
  check: string;
  evidence: string;
  impact: number;
  fix: string;
  kind: "journal" | "email" | "note";
  debit?: string;
  status: "open" | "resolved";
  resolution?: string;
  draftId?: string;
};
export type PolicyRule = {
  id: string;
  company: string;
  text: string;
  condition: { description: string; minimum?: number };
  action: { ledger: string };
  active: boolean;
  template?: boolean;
};
export type Playbook = {
  id: string;
  name: string;
  steps: string[];
  createdBy: string;
};
export type PlaybookRun = {
  id: string;
  playbookId: string;
  companies: string[];
  at: string;
  status: "running" | "paused" | "done";
  results: { company: string; step: number; text: string; paused?: boolean }[];
  drafts: { company: string; to: string; body: string; sent?: boolean }[];
};
export type AgentSchedule = {
  id: string;
  playbookId: string;
  when: string;
  companies: string[];
  channel: "WhatsApp" | "Email" | "In-app";
  recipient: string;
  nextRun: string;
  enabled: boolean;
  lastRun?: string;
};
export type WhatsAppNumber = {
  number: string;
  name: string;
  role: string;
  company: string;
  enabled: boolean;
};
