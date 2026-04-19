import { getAppUrlForEmail, getResendClient, getResendFromEmail } from "@/src/lib/resendClient"

export type SendAnalysisReportEmailResult = { ok: true } | { ok: false; error: string }

/**
 * Sends a simple HTML email with a link to the Clarion analysis report (login required).
 */
export async function sendAnalysisReportEmail(opts: { to: string; reportUrl?: string }): Promise<SendAnalysisReportEmailResult> {
  const resend = getResendClient()
  if (!resend) {
    return { ok: false, error: "Email is not configured (RESEND_API_KEY)." }
  }
  const base = getAppUrlForEmail()
  const reportUrl = opts.reportUrl ?? `${base}/dashboard/analysis`
  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: [opts.to],
    subject: "Your Clarion analysis report",
    html: `
      <p>Thanks for unlocking Clarion. Your personalized analysis report—targets, labs, and supplement matches—is ready.</p>
      <p><a href="${reportUrl}" style="display:inline-block;padding:12px 20px;background:#1F6F5B;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Open your analysis report</a></p>
      <p style="font-size:14px;color:#444;">You can also print or save as PDF from that page (Print / Save as PDF in your browser).</p>
      <p style="font-size:12px;color:#666;">Clarion Labs — for education only; not medical advice.</p>
    `,
  })
  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}
