/**
 * The PRD's instrumentation (section 8), as a stand-in. Properties are
 * counts, versions, durations and categories: never raw accounting rows or
 * a person's answers. Kept in memory and echoed to the console so a
 * prototype session can be read back.
 *
 * DEV: replace `track` with the analytics client; the event names and
 * properties are the contract.
 */
export type ReconEvent =
  | "recon_setup_started"
  | "source_validation_completed"
  | "recon_run_started"
  | "recon_run_completed"
  | "recon_run_failed"
  | "exception_presented"
  | "exception_resolved"
  | "review_recorded"
  | "export_completed"
  | "schedule_triggered"
  | "schedule_blocked"
  // PROPOSED (21 Oct 2026), not in the PRD's list: the onboarding funnel.
  | "recon_onboarding_shown"
  | "recon_onboarding_sample_started"
  | "recon_onboarding_completed"
  // PROPOSED (21 Oct 2026): the Excel report and its round trip.
  | "report_downloaded"
  | "report_uploaded"
  | "recon_rerun";

export type ReconEventProps = Record<string, string | number | boolean>;

export const RECON_EVENTS: { event: ReconEvent; props: ReconEventProps }[] = [];

export const track = (event: ReconEvent, props: ReconEventProps = {}) => {
  RECON_EVENTS.push({ event, props });
  if (typeof console !== "undefined") console.debug("[recon]", event, props);
};
