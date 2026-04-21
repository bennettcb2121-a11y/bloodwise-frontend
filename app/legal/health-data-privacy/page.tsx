{/*
  ============================================================
  DRAFT — review with a lawyer before shipping. Not legal advice.
  ============================================================
  Standalone Consumer Health Data Privacy Policy. Washington's My Health My Data
  Act (MHMDA) requires health-data practices to be disclosed in a policy that is
  separately linked from the homepage (not buried inside a general privacy policy).

  Contact email in the policy body is support@clarionlabs.tech; update "Last updated" before publishing.
*/}

import Link from "next/link"
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo"

export const metadata = {
  title: "Consumer Health Data Privacy Policy | Clarion Labs",
  description:
    "How Clarion Labs handles biomarker results, lab uploads, symptom data, and other consumer health data. Separate health data policy required by Washington's My Health My Data Act (MHMDA).",
}

export default function HealthDataPrivacyPage() {
  return (
    <main className="terms-shell">
      <div className="terms-container">
        <ClarionLabsLogo variant="page" href="/" linkClassName="terms-logo" />
        <h1 className="terms-title">Consumer Health Data Privacy Policy</h1>

        <section className="terms-section">
          <p className="terms-body">
            This policy explains specifically how Clarion Labs collects, uses, shares,
            retains, and protects <strong>consumer health data</strong>: biomarker
            values, uploaded lab reports, symptom check-ins, medication and
            supplement entries, and anything else that reveals information about
            your physical or mental health status.
          </p>
          <p className="terms-body">
            We publish this as a standalone document because Washington&apos;s
            <em> My Health My Data Act</em> (MHMDA) — and similar laws in Nevada and
            Connecticut — require a separate health data privacy notice that is
            distinct from our main privacy policy. For everything else we do, see
            our <Link href="/legal/privacy">general privacy policy</Link>.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Categories of health data we collect</h2>
          <p className="terms-body">
            <strong>Lab uploads.</strong> PDF or photo of your lab report. We use
            this to extract biomarker values. The raw file is deleted immediately
            after you confirm the extracted values.
          </p>
          <p className="terms-body">
            <strong>Biomarker values.</strong> Individual test results (ferritin,
            vitamin D, etc.) and their units. We use these to score your panel and
            generate your protocol.
          </p>
          <p className="terms-body">
            <strong>Symptom and wellness reports.</strong> Daily check-ins, energy
            ratings, sleep, stress, training load. Used to personalize suggestions
            and detect patterns over time.
          </p>
          <p className="terms-body">
            <strong>Supplements and medications you log.</strong> Names, doses, and
            context. Used to check for conflicts and to personalize your plan.
          </p>
          <p className="terms-body">
            <strong>Profile facts that imply health status.</strong> Age band, sex
            at birth, training focus, diet pattern, self-reported conditions you
            enter.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">How we use your health data</h2>
          <p className="terms-body">
            We only use your health data to run Clarion for you. Specifically:
            extracting values from uploads, scoring biomarkers, generating your
            personalized interpretation, suggesting supplements, tracking trends,
            and sending the reminders you ask for.
          </p>
          <p className="terms-body">
            We do <strong>not</strong> use your health data for advertising, lead
            generation, or behavioral profiling. We do <strong>not</strong> sell it.
            We do <strong>not</strong> use it to train machine learning models
            beyond what is strictly needed to process your request in the moment.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">How AI is used on your health data</h2>
          <p className="terms-body">
            Clarion uses OpenAI&apos;s API to (a) read lab PDFs and images you
            upload and extract biomarker values, and (b) generate your personalized
            interpretation and supplement suggestions.
          </p>
          <p className="terms-body">
            Before any file or text is sent to OpenAI, we remove direct identifiers
            (your name, date of birth, MRN, address, phone, and provider NPI) from
            the content where feasible. We have not opted in to having your data
            used to train OpenAI&apos;s models. Where available, Clarion operates
            under OpenAI&apos;s Zero Data Retention configuration so that your
            inputs and outputs are not retained by OpenAI beyond the duration of
            the API call.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Who we share health data with</h2>
          <p className="terms-body">
            We share health data only with the subprocessors required to run the
            product:
          </p>
          <p className="terms-body">
            <strong>Supabase</strong> — database and private file storage for
            uploads, with row-level security scoped to your account.
          </p>
          <p className="terms-body">
            <strong>OpenAI</strong> — AI extraction and interpretation as described
            above.
          </p>
          <p className="terms-body">
            <strong>Vercel</strong> — application hosting. Vercel&apos;s first-party
            analytics do not receive health data.
          </p>
          <p className="terms-body">
            We do not share health data with <strong>Stripe</strong>,
            <strong> Resend</strong>, or <strong>Amazon Associates</strong>.
            Payments, emails, and affiliate links do not carry biomarker values
            or symptoms.
          </p>
          <p className="terms-body">
            We will <strong>never</strong> share health data with advertisers, data
            brokers, or cross-context behavioral advertising networks. There are
            no third-party tracking pixels on the upload, dashboard, or analysis
            routes.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Your consent</h2>
          <p className="terms-body">
            Before you upload a lab report, Clarion asks for <strong>three
            separate opt-in consents</strong>: (1) to process your lab results,
            (2) to use AI to extract and interpret them, and (3) to apply our
            default retention policy (raw files deleted after confirmation). Each
            checkbox is unchecked by default and recorded individually with a
            version number. When the underlying terms change materially, we
            re-request consent.
          </p>
          <p className="terms-body">
            You can revoke any consent at any time in <Link href="/settings">Settings</Link>.
            Revoking consent stops future processing tied to that consent and
            triggers deletion of the derived data.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Retention</h2>
          <p className="terms-body">
            <strong>Uploaded PDFs and images</strong> are deleted immediately after
            you confirm the extracted biomarker values. We do not retain the raw
            file by default.
          </p>
          <p className="terms-body">
            <strong>Extracted biomarker values, symptom logs, and your stack</strong>
            are retained for as long as your account is active so you can see
            trends over time. You can delete any of it from the app, or delete
            your whole account.
          </p>
          <p className="terms-body">
            <strong>Consent records</strong> are retained as a legal record even
            after revocation, so we can demonstrate the state of consent at the
            time of each action.
          </p>
          <p className="terms-body">
            <strong>Backups.</strong> Deleted data may persist in encrypted
            database backups maintained by Supabase for up to about 30 days before
            they roll off.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Your rights</h2>
          <p className="terms-body">
            MHMDA and similar laws give you specific rights over your consumer
            health data. Clarion extends these rights to every user:
          </p>
          <p className="terms-body">
            <strong>Access and confirm.</strong> You can see every health data
            element we have about you inside the app, or request an export.
          </p>
          <p className="terms-body">
            <strong>Delete.</strong> You can delete individual biomarker values,
            lab sessions, symptom entries, or your whole account. Deletion also
            propagates to our subprocessors.
          </p>
          <p className="terms-body">
            <strong>Withdraw consent.</strong> Any consent can be revoked at any
            time.
          </p>
          <p className="terms-body">
            <strong>Non-discrimination.</strong> Exercising any of these rights
            will never change your pricing or access.
          </p>
          <p className="terms-body">
            <strong>Appeal.</strong> If we deny a request, you can appeal by
            emailing us. You may also contact your state attorney general.
          </p>
          <p className="terms-body">
            To exercise a right or ask a question, email us at{" "}
            <strong>support@clarionlabs.tech</strong>. We respond within 45 days (or the
            shorter window your state law requires).
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Security</h2>
          <p className="terms-body">
            Uploads are transmitted over HTTPS and stored in a private bucket
            scoped to your user ID. Database tables holding health data are
            protected by row-level security. Access to production systems inside
            Clarion is limited to the people who need it to operate the service.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Not a HIPAA-covered entity</h2>
          <p className="terms-body">
            Clarion Labs is a direct-to-consumer product and is not a HIPAA-covered
            entity. HIPAA does not apply to this relationship. The Federal Trade
            Commission&apos;s Health Breach Notification Rule and state health
            data laws (including MHMDA) do, and we comply with them.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Children</h2>
          <p className="terms-body">
            Clarion is for adults 18 and older. We do not knowingly collect
            health data from anyone under 18.
          </p>
        </section>

        <section className="terms-section">
          <h2 className="terms-heading">Changes to this policy</h2>
          <p className="terms-body">
            We&apos;ll update this page and email you when changes are material.
            The version string shown in the app consent gate reflects the current
            revision of this policy.
          </p>
        </section>

        <p className="terms-footer-note">
          Last updated: April 2026. This policy is informational and not legal advice.
        </p>

        <p className="terms-back">
          <Link href="/legal/privacy">General Privacy Policy</Link>
          {" · "}
          <Link href="/terms">Terms &amp; Disclaimer</Link>
          {" · "}
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </main>
  )
}
