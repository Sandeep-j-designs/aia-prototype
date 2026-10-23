import { getState } from "@/components/inbox/v2/store";
import { RECON_PERIODS } from "@/config/pages/neo/mock-recon-sources";
import {
  REVIEW_LABEL,
  configOf,
  currentVersion,
  exportRecorded,
  latestUnsavedAnswer,
  latestRun,
} from "@/hooks/pages/neo/use-recon";
import type { NeoTask } from "@/types/pages/neo";
import type { ReconPeriodId } from "@/types/pages/neo/recon";
import { has } from "@/utils/pages/neo";
import { download, exportFiles } from "@/utils/pages/neo/recon-export";
import { downloadReport } from "@/utils/pages/neo/recon-workbook";
import {
  markCompleted,
  reconOnboarding,
} from "@/hooks/pages/neo/use-recon-onboarding";
import { RECON_COMPLETION } from "@/config/pages/neo/onboarding";
import { track } from "@/utils/pages/neo/recon-events";

/**
 * US-08 · Export results (FR-08, aligned 21 Oct 2026). Since 21 Oct the
 * export is the Excel report (utils/pages/neo/recon-workbook.ts), which
 * departs from the PRD's CSV; "export as CSV" still gives the PRD's three
 * files for the current version — summary, match groups, exceptions — each carrying
 * the run ID, version, period, completeness and review status. Partial and
 * unresolved work says so in the file. Cells are protected against
 * formula injection.
 *
 * DEV: GET /api/recon/runs/:id/versions/:n/export, company access checked
 * on the server (US-08 AC3).
 */
const reconExport: NeoTask = {
  id: "recon-export",
  title: "Export a reconciliation",
  match: (p) =>
    has(p, /\b(export|download|csv)\b/i) &&
    has(p, /\b(sep|september|oct|october|recon\w*|run|result)/i)
      ? 55
      : 0,
  run: async (api) => {
    const company = api.context.company || getState().company;
    const periodId: ReconPeriodId = /\boct/i.test(api.prompt) ? "oct" : "sep";
    const p = RECON_PERIODS[periodId];
    const run = latestRun(company, periodId);
    const v = run && currentVersion(run);
    if (!run || !v) {
      await api.say(`There's no run for ${p.label} to export yet.`);
      api.suggest([`Reconcile ${p.short}`]);
      return "Nothing to export";
    }
    api.stage(8);
    // The report is an Excel file (21 Oct 2026); CSV only when asked for.
    const asCsv = /\bcsv\b/i.test(api.prompt);
    const making = await api.step(
      `Writing version ${v.n} as ${asCsv ? "CSV" : "an Excel report"}`,
      undefined,
      { tools: ["recon.export"] }
    );
    const lines: string[] = [];
    if (asCsv) {
      const files = exportFiles(run, v);
      download(files);
      exportRecorded(run.id, `${files.length} CSV files`);
      making(`${files.length} CSV files`);
      lines.push(...files.map((f) => `- \`${f.name}\`: ${f.rows} rows`));
    } else {
      const file = await downloadReport(run, v);
      exportRecorded(run.id, `Excel report, version ${v.n}`);
      making(file.name);
      api.show({ kind: "recon-report", company, runId: run.id, version: v.n });
    }
    await api.say(
      [
        `**Exported ${p.label}, version ${v.n}** · ${v.completeness === "partial" ? "Partial" : "Full"} · ${REVIEW_LABEL[v.review]}${run.execution !== "completed" ? ` · run ${run.execution.replace(/-/g, " ")}` : ""}.`,
        ...(lines.length ? ["", ...lines] : []),
        "",
        v.exceptions.length
          ? `The ${v.exceptions.length} unresolved exceptions are in the export as unresolved${v.exceptions.some((e) => e.deferred) ? ", deferred ones with their reasons" : ""}.`
          : "Every exported row is matched or unmatched; none is unresolved.",
      ].join("\n")
    );
    // Reuse (FR-01 AC3): the next period starts from this configuration.
    const cfg = configOf(company);
    const next = periodId === "sep" ? "1–15 October" : undefined;
    if (cfg && next)
      await api.say(
        `Configuration v${cfg.version} carries to the next period: same template, timezone and currency${cfg.mappings.length ? `, and ${cfg.mappings.length} saved answer${cfg.mappings.length === 1 ? "" : "s"}` : ""}. None of September's rows or results carry over.`
      );
    // The guided sample's last step: the loop is done (onboarding).
    const ob = reconOnboarding();
    if (ob.guided && !ob.completed) {
      markCompleted();
      track("recon_onboarding_completed", { version: v.n });
      await api.say(RECON_COMPLETION);
    }
    api.suggest([
      ...(next ? [`Reconcile ${next}`] : []),
      ...(latestUnsavedAnswer(company)
        ? ["Save the answer to the configuration"]
        : []),
    ]);
    return asCsv ? "CSV files" : "Excel report";
  },
};

export default reconExport;
