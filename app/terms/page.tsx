import Link from "next/link";
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo";

export const metadata = {
  title: "Terms & Disclaimer | Clarion Labs",
  description: "Terms of use and health disclaimer for Clarion Labs. Education and decision support only—not medical advice.",
};

export default function TermsPage() {
  return (
    <main className="terms-shell">
      <div className="terms-container">
        <ClarionLabsLogo variant="page" href="/" linkClassName="terms-logo" />
        <h1 className="terms-title">Terms of Use &amp; Disclaimer</h1>

        <section className="terms-section" aria-labelledby="disclaimer-heading">
          <h2 id="disclaimer-heading" className="terms-heading">Health disclaimer</h2>
          <p className="terms-body">
            Clarion Labs provides <strong>education and decision support only</strong>. It is not a
            substitute for professional medical advice, diagnosis, or treatment. Always seek the
            advice of your physician or other qualified health provider with any questions you may
            have about a medical condition, supplements, or lifestyle changes.
          </p>
          <p className="terms-body">
            We do not diagnose conditions, prescribe treatments, or recommend specific doses for
            your individual situation. Content on biomarkers, supplements, and protocols is for
            general educational purposes. Discuss any changes to your diet, supplements, or health
            routine with your clinician.
          </p>
          <p className="terms-body">
            <strong>Clarion Lite</strong> (when offered) provides education and habit support from your profile and
            reported symptoms. It does not interpret your bloodwork, estimate deficiencies from your data as if it were lab
            results, or replace clinical judgment. Upgrade to the full analysis when you want biomarker scoring,
            trends, and lab-matched supplement context.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="use-heading">
          <h2 id="use-heading" className="terms-heading">Use of the service</h2>
          <p className="terms-body">
            By using Clarion Labs, you acknowledge that you are responsible for your own health
            decisions. You agree not to rely on Clarion as a sole source of medical or health
            guidance. Lab interpretations, supplement suggestions, and protocol content are
            intended to support informed conversations with your healthcare provider, not to replace
            them.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="liability-heading">
          <h2 id="liability-heading" className="terms-heading">Limitation of liability</h2>
          <p className="terms-body">
            Clarion Labs and its operators are not liable for any actions you take based on the
            information provided. Outcomes depend on many factors; we do not guarantee any specific
            health results. If you have a medical emergency, contact emergency services or your
            doctor immediately.
          </p>
        </section>

        <p className="terms-footer-note">
          For education only. Not medical advice. Last updated: March 2026.
        </p>

        <p className="terms-back">
          <Link href="/legal/privacy">Privacy</Link>
          {" · "}
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </main>
  );
}
