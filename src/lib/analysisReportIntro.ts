/** One-time redirect to analysis report after first lab save (per user, this device). */
export const ANALYSIS_REPORT_INTRO_STORAGE_PREFIX = "clarion_analysis_report_intro_done_v1"

export function analysisReportIntroStorageKey(userId: string): string {
  return `${ANALYSIS_REPORT_INTRO_STORAGE_PREFIX}_${userId}`
}
