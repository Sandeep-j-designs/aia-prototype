import { getState } from "@/components/inbox/v2/store";
import { RECON_PERIODS } from "@/config/pages/neo/mock-recon-sources";
import {
  REVIEW_LABEL,
  applyEdits,
  checkEdits,
  currentVersion,
  describeEdit,
  exceptionCode,
  getRun,
  groupCode,
  latestRun,
  latestRunOf,
} from "@/hooks/pages/neo/use-recon";
import type { NeoTask, NeoTaskApi } from "@/types/pages/neo";
import type {
  ReconEdit,
  ReconEditOrigin,
  ReconException,
  ReconPeriodId,
  ReconRun,
  RunVersion,
} from "@/types/pages/neo/recon";
import { fileOf, keepFile } from "@/utils/pages/neo/attachment-files";
import { track } from "@/utils/pages/neo/recon-events";
import {
  APPLY_FROM_VIEWER,
  exceptionActions,
  readReport,
  reportFile,
  reportName,
} from "@/utils/pages/neo/recon-workbook";
import { summaryTable } from "./recon-run";

/**
 * Change a reconciliation and run it again (21 Oct 2026). The report is an
 * Excel file; a person changes it in one of two ways:
 *
 * - in the file: Action and Reason on Exceptions and Match groups, Answer
 *   on Questions, then drops the file back into the chat;
 * - in the chat: "defer E4, payout file due 3 Oct", "link HDFC card 26 Sep
 *   to candidate 1 because same UTR", "unlink G62, wrong payer".
 *
 * Either way the changes are read, checked together, confirmed, and the
 * reconciliation runs once more as a new version (FR-12); the version
 * before keeps its review. Changes to locked cells are named and ignored:
 * amounts and source rows are never edited (A2). One bad change stops
 * the set, so an accountant's decisions land together or not at all.
 *
 * DEV: POST /api/recon/runs/:id/report (an edited file) or POST
 * /api/recon/runs/:id/resolutions (changes in words, from the model's
 * tool call) — both return the new version.
 */

const REPORT_FILE = /^recon-.*\.xlsx$/i;
const SAMPLE = /\b(try|use|show)\b.*\bedited report\b|^edited report$/i;
const VERB = /\b(un-?link|re-?open|un-?defer|defer|link|match)\b/i;
const CODE = /\b([EG])(\d{1,3})\b/gi;

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;
const norm = (s: string) =>
  s.toLowerCase().replace(/[·•]/g, " ").replace(/\s+/g, " ").trim();

/**
 * What a person typed, as changes: the verb, the exception or group by
 * code or by name, the candidate, and the reason after "because", a
 * colon, a comma or a dash. Anything missing is asked for.
 */
const fromWords = async (api: NeoTaskApi, run: ReconRun, v: RunVersion) => {
  const edits: ReconEdit[] = [];
  const unread: string[] = [];
  const segments = api.prompt
    .split(/;|\n|\band then\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    const verb = seg.match(VERB)?.[1].toLowerCase().replace("-", "");
    if (!verb) {
      unread.push(seg);
      continue;
    }
    const reason = capital(
      seg
        .split(/\s*(?:\bbecause\b|\bsince\b|\breason:?|[:—–,]|\s-\s)\s*/i)
        .slice(1)
        .join(", ")
        .trim()
    );
    const head = norm(seg.split(/\bbecause\b|\bsince\b|[:—–,]|\s-\s/i)[0]);
    const codes = [...seg.matchAll(CODE)].map((m) => ({
      kind: m[1].toUpperCase(),
      n: Number(m[2]),
    }));
    const exceptions: ReconException[] = codes.length
      ? codes
          .filter((c) => c.kind === "E")
          .map((c) => v.exceptions[c.n - 1])
          .filter(Boolean)
      : v.exceptions.filter((e) => head.includes(norm(e.label)));
    const groups = codes
      .filter((c) => c.kind === "G")
      .map((c) => v.groups[c.n - 1])
      .filter(Boolean);
    if (verb === "unlink") {
      const pool = groups.length
        ? groups
        : v.groups.filter(
            (g) => g.basis === "manual" && head.includes(norm(g.label))
          );
      if (!pool.length) {
        unread.push(seg);
        continue;
      }
      for (const g of pool)
        edits.push({
          type: "unlink",
          groupId: g.id,
          reason:
            reason ||
            (await askReason(api, `Unlink ${groupCode(v, g.id)} ${g.label}`)),
        });
      continue;
    }
    let pool = exceptions;
    if (pool.length > 1 && !codes.length) {
      const id = await api.ask(
        `More than one exception is called “${pool[0].label}”. Which one?`,
        pool.map((e) => ({
          id: e.id,
          label: `${exceptionCode(v, e.id)} · ${e.label}`,
          hint: e.text,
        }))
      );
      pool = pool.filter((e) => e.id === id);
    }
    if (!pool.length) {
      unread.push(seg);
      continue;
    }
    for (const e of pool) {
      const code = `${exceptionCode(v, e.id)} ${e.label}`;
      if (verb === "reopen" || verb === "undefer") {
        edits.push({ type: "reopen", exceptionId: e.id, reason });
        continue;
      }
      if (verb === "defer") {
        edits.push({
          type: "defer",
          exceptionId: e.id,
          reason: reason || (await askReason(api, `Defer ${code}`)),
        });
        continue;
      }
      const named = seg.match(/candidate\s*(\d+)/i);
      let candidate = named
        ? Number(named[1]) - 1
        : e.candidates.length
          ? 0
          : -1;
      if (!named && e.candidates.length > 1)
        candidate = Number(
          await api.ask(
            `${code} has ${e.candidates.length} candidates. Link it to which?`,
            e.candidates.map((c, i) => ({
              id: String(i),
              label: `Candidate ${i + 1}`,
              hint: c.why,
            }))
          )
        );
      edits.push({
        type: "link",
        exceptionId: e.id,
        candidate,
        reason: reason || (await askReason(api, `Link ${code}`)),
      });
    }
  }
  return { edits, unread };
};

const askReason = (api: NeoTaskApi, what: string) =>
  api.askText(`${what}: what's the reason? It goes in the record (US-06).`, {
    placeholder: "A reason for the record",
    parse: (t) => (t.trim().length > 2 ? capital(t.trim()) : undefined),
    retry: "A reason is required. A few words is enough.",
  });

/**
 * A copy of the current version filled in the way a person would in
 * Excel: three Action cells with reasons, and one amount typed over,
 * which Neo has to refuse. For demos without Excel.
 */
const sampleFile = async (run: ReconRun, v: RunVersion) => {
  const open = v.exceptions.filter((e) => !e.deferred);
  const amount = open.find((e) => e.kind === "amount");
  const cand = open.find((e) => e.candidates.length > 0);
  const other = open.find(
    (e) => e !== amount && e !== cand && exceptionActions(e).includes("Defer")
  );
  const prefill: Record<string, { action: string; reason: string }> = {};
  if (amount)
    prefill[amount.id] = {
      action: "Link as matched",
      reason:
        "Difference is the gateway's MDR, confirmed on the 2 Oct statement",
    };
  if (cand)
    prefill[cand.id] = {
      action: "Link to candidate 1",
      reason: "Same UTR as the settlement report",
    };
  if (other)
    prefill[other.id] = {
      action: "Defer",
      reason: "Receipt not yet entered in Tally; accounts team posts by 5 Oct",
    };
  const target = other || amount;
  const file = await reportFile(run, v, {
    prefill,
    name: reportName(run, v, "-edited"),
    tamper: target && {
      id: target.id,
      header: "Bank (₹)",
      value: 99999,
    },
  });
  keepFile(file);
  return file;
};

const reconEdit: NeoTask = {
  id: "recon-edit",
  title: "Change a reconciliation and run it again",
  match: (p, _ctx, attachments = []) => {
    if (attachments.some((a) => REPORT_FILE.test(a.name))) return 70;
    if (SAMPLE.test(p.trim())) return 80;
    if (
      VERB.test(p) &&
      (/\b[EG]\d{1,3}\b/i.test(p) ||
        /\b(candidate|exception|as matched|reason|because)\b/i.test(p))
    )
      return 60;
    return 0;
  },
  run: async (api) => {
    const company = api.context.company || getState().company;
    // A reason can name a date ("due 3 Oct"), so only "for/in October"
    // names the period; otherwise the company's latest run is changed.
    const said = api.prompt.match(/\b(?:for|in)\s+(oct|sep)\w*/i)?.[1];
    const periodId: ReconPeriodId = said
      ? (said.toLowerCase() as ReconPeriodId)
      : latestRunOf(company)?.periodId || "sep";
    api.stage(7);

    // Which run, and what changes: from a file, the sample, or words.
    const named = api.attachments.find((a) => /\.xlsx$/i.test(a.name));
    let run: ReconRun | undefined;
    let edits: ReconEdit[] = [];
    let origin: ReconEditOrigin = { via: "chat" };
    const notes: string[] = [];
    const problems: string[] = [];

    if (named || SAMPLE.test(api.prompt.trim())) {
      let file = named && fileOf(named.name);
      if (!named) {
        const latest = latestRun(company, periodId);
        const lv = latest && currentVersion(latest);
        if (!latest || !lv || latest.execution !== "completed") {
          await api.say(
            `There's no finished run for ${RECON_PERIODS[periodId].label} to edit yet. Reconcile it first.`
          );
          api.suggest([`Reconcile ${RECON_PERIODS[periodId].short}`]);
          return "Nothing to edit";
        }
        await api.think(
          `Using a copy of version ${lv.n} filled in as you would in Excel: three Action cells with reasons, and one amount typed over.`
        );
        file = await sampleFile(latest, lv);
      }
      if (!file) {
        await api.say(
          `I can't read **${named!.name}** from here. Attach it again with **+** or drop it on the chat.`
        );
        return "File not readable";
      }
      api.sources([file.name]);
      const reading = await api.step(`Reading ${file.name}`, undefined, {
        skills: ["S2"],
        tools: ["report.read"],
      });
      const read = await readReport(file, getRun);
      if (!read.ok) {
        reading("Not a Neo report");
        await api.say(`**${file.name}** can't be applied. ${read.why}`);
        return "Not applied";
      }
      track("report_uploaded", {
        version: read.version,
        edits: read.edits.length,
        ignored: read.ignored.length,
      });
      run = getRun(read.runId)!;
      const latest = currentVersion(run)!;
      reading(
        `Version ${read.version} · ${plural(read.edits.length, "change")}${read.ignored.length ? ` · ${plural(read.ignored.length, "locked cell")} changed` : ""}`
      );
      edits = read.edits;
      origin = { via: "report", file: file.name, fromVersion: read.version };
      if (read.version < latest.n)
        await api.think(
          `The file is version ${read.version}; version ${latest.n} is newer. Its changes are checked against version ${latest.n}.`
        );
      read.ignored.forEach((x) =>
        notes.push(
          `${x.sheet} ${x.code}, ${x.column}: changed from ${x.was || "blank"} to ${x.now || "blank"}. Ignored: amounts and source rows can't be edited in the report. To correct a source, attach a corrected export.`
        )
      );
      if (read.orphanReasons.length)
        notes.push(
          `${read.orphanReasons.join(", ")}: a reason with no action. Nothing changes there.`
        );
      read.problems.forEach((x) => problems.push(`${x.code}: ${x.why}`));
    } else {
      run = latestRun(company, periodId);
      const v = run && currentVersion(run);
      if (!run || !v || run.execution !== "completed") {
        await api.say(
          `There's no finished run for ${RECON_PERIODS[periodId].label} to change yet. Reconcile it first.`
        );
        api.suggest([`Reconcile ${RECON_PERIODS[periodId].short}`]);
        return "Nothing to edit";
      }
      await api.think(
        `Reading your changes against version ${v.n}: ${plural(v.exceptions.length, "exception")}, ${plural(v.groups.length, "match group")}.`
      );
      const words = await fromWords(api, run, v);
      edits = words.edits;
      words.unread.forEach((s) =>
        problems.push(
          `“${s}”: I can't tell which exception or group this is. Use its code from the report, like E3 or G12.`
        )
      );
    }

    const v = currentVersion(run)!;
    const p = RECON_PERIODS[run.periodId];
    checkEdits(run, edits).forEach(({ edit, why }) => {
      const code =
        "exceptionId" in edit
          ? exceptionCode(v, edit.exceptionId)
          : "groupId" in edit
            ? groupCode(v, edit.groupId)
            : "Question";
      problems.push(`${code === "E0" ? "An exception" : code}: ${why}`);
    });

    if (problems.length) {
      await api.say(
        [
          `**Nothing was applied.** ${problems.length === 1 ? "One change needs" : `${problems.length} changes need`} fixing first, so your changes land together:`,
          "",
          ...problems.map((x) => `- ${x}`),
          ...(notes.length
            ? ["", "**Not applied:**", "", ...notes.map((x) => `- ${x}`)]
            : []),
          "",
          origin.via === "report"
            ? "Fix them in the file and drop it here again."
            : "Say it again with the fix.",
        ].join("\n")
      );
      return "Not applied";
    }
    if (!edits.length) {
      await api.say(
        [
          `**No changes to apply.** The Action, Reason and Answer cells match version ${v.n}.`,
          ...(notes.length
            ? ["", "**Not applied:**", "", ...notes.map((x) => `- ${x}`)]
            : []),
        ].join("\n")
      );
      return "No changes";
    }

    // Confirm the set, then run again once.
    await api.say(
      [
        `**${plural(edits.length, "change")} to ${p.label}, version ${v.n}:**`,
        "",
        ...edits.map((e) => `- ${describeEdit(run!, e)}`),
        ...(notes.length
          ? ["", "**Not applied:**", "", ...notes.map((x) => `- ${x}`)]
          : []),
      ].join("\n")
    );
    await api.checkpoint();
    // From Neo's viewer, the Apply click was the sign-off (21 Oct 2026).
    const fromViewer = api.prompt.trim() === APPLY_FROM_VIEWER && !notes.length;
    const go = fromViewer
      ? "go"
      : await api.ask(
          `Apply ${edits.length === 1 ? "it" : `all ${edits.length}`} and run the reconciliation again?`,
          [
            {
              id: "go",
              label: "Apply and run again",
              hint: `Makes version ${v.n + 1}. Version ${v.n} is kept as it is${v.review !== "not-submitted" ? `, ${REVIEW_LABEL[v.review].toLowerCase()}` : ""}.`,
            },
            { id: "cancel", label: "Not now", hint: "Nothing changes" },
          ]
        );
    if (go !== "go") {
      await api.say(`Nothing changed. Version ${v.n} is still current.`);
      return "Not applied";
    }

    api.stage(5);
    const again = await api.step(
      "Running the reconciliation again",
      undefined,
      { skills: ["S3"], tools: ["recon.match"] }
    );
    await api.wait(800);
    const after = applyEdits(run.id, edits, origin);
    const nv = currentVersion(after)!;
    again(
      `Version ${nv.n} · ${nv.groups.length} match groups · ${nv.exceptions.length} exceptions`
    );

    api.stage(7);
    const dg = nv.groups.length - v.groups.length;
    const de = nv.exceptions.length - v.exceptions.length;
    const deferred = nv.exceptions.filter((e) => e.deferred).length;
    const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "±0");
    await api.say(
      [
        `**${p.label}, version ${nv.n}: ${nv.groups.length} match groups (${signed(dg)}), ${nv.exceptions.length} exceptions (${signed(de)})${deferred ? `, ${deferred} of them deferred` : ""}.** Nothing was posted or changed in your books.`,
        "",
        summaryTable(after, nv),
        "",
        v.review !== "not-submitted"
          ? `Version ${v.n} stays ${REVIEW_LABEL[v.review].toLowerCase()}. Version ${nv.n} needs its own review.`
          : `Version ${v.n} is kept as it was.`,
      ].join("\n")
    );
    api.show({
      kind: "recon-report",
      company: after.company,
      runId: after.id,
      version: nv.n,
    });
    api.suggest([`Submit ${p.short} for review`, `Export ${p.short}`]);
    return `Version ${nv.n}`;
  },
};

export default reconEdit;
