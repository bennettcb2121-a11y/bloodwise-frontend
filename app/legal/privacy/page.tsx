{/*
  ============================================================
  DRAFT — review with a lawyer before shipping. Not legal advice.
  ============================================================
  This privacy policy is a plain-English starting point for Clarion Labs.
  It reflects the current stack (Supabase, Stripe, Resend, OpenAI, Vercel
  Analytics) and a US-only, 18+, non-HIPAA-covered posture. Contact email in
  the policy body is support@clarionlabs.tech; update the "Last updated" date before publishing.
*/}

import Link from "next/link";
import { ClarionLabsLogo } from "@/src/components/ClarionLabsLogo";

export const metadata = {
  title: "Privacy Policy | Clarion Labs",
  description:
    "How Clarion Labs collects, uses, and protects your data. Plain-English privacy policy for US users.",
};

export default function PrivacyPage() {
  return (
    <main className="terms-shell">
      <div className="terms-container">
        <ClarionLabsLogo variant="page" href="/" linkClassName="terms-logo" />
        <h1 className="terms-title">Privacy Policy</h1>

        <section className="terms-section" aria-labelledby="intro-heading">
          <h2 id="intro-heading" className="terms-heading">The short version</h2>
          <p className="terms-body">
            Clarion Labs helps you understand your bloodwork and build a supplement
            routine that actually fits your body. To do that well, we ask for some
            personal health information. This page explains, in plain English, what
            we collect, why we collect it, who we share it with, and the choices
            you have.
          </p>
          <p className="terms-body">
            We are based in the United States and currently serve US users only.
            Clarion Labs is <strong>not</strong> a HIPAA-covered entity, and we are
            not your doctor. We treat your data carefully anyway—because we would
            want the same.
          </p>
          <p className="terms-body">
            For specifics on how we handle biomarker values, uploaded lab reports,
            and other health information, see our separate{" "}
            <Link href="/legal/health-data-privacy">
              Consumer Health Data Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="terms-section" aria-labelledby="what-heading">
          <h2 id="what-heading" className="terms-heading">What we collect and why</h2>
          <p className="terms-body">
            We only ask for information that helps us give you useful insights or
            keep your account working. Here is what lives in your Clarion account:
          </p>
          <p className="terms-body">
            <strong>Account basics.</strong> Your email address and a password (or a
            sign-in token from a provider you choose). We use this to log you in,
            send important account messages, and recover access if something breaks.
          </p>
          <p className="terms-body">
            <strong>Your profile survey.</strong> Things like age, sex at birth,
            training goals, lifestyle, diet, and current supplements. We use this to
            personalize your protocol, adjust dosing suggestions, and decide which
            biomarkers matter most for you.
          </p>
          <p className="terms-body">
            <strong>Lab results and biomarker values.</strong> Anything you upload
            from a blood panel—file, photo, or manual entry. This is the core of
            what Clarion does. We use these values to score your results, show
            trends over time, and match you with education and supplements that
            address what your labs show.
          </p>
          <p className="terms-body">
            <strong>Daily logs and check-ins.</strong> Your symptom ratings, habits,
            supplement intake, sleep, and any notes you record. We use these to
            track progress, spot patterns, and nudge your protocol when something is
            clearly working (or clearly not).
          </p>
          <p className="terms-body">
            <strong>Device and usage data.</strong> Basic technical information like
            browser type, approximate location (from IP), pages visited inside
            Clarion, and error logs. We use this to keep the product running, fix
            bugs, and understand which features are actually useful.
          </p>
          <p className="terms-body">
            <strong>Payment information.</strong> If you subscribe or buy a report,
            Stripe handles your card details. We never see or store your full card
            number—only a record that you paid and what plan you're on.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="how-heading">
          <h2 id="how-heading" className="terms-heading">How we use your data</h2>
          <p className="terms-body">
            We use your information to run the product: score biomarkers, generate
            your protocol, show trends, send you the emails you asked for, support
            you when something breaks, and make Clarion better over time. We do
            <strong> not</strong> sell your personal information. We do
            <strong> not</strong> share it with advertisers or data brokers.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="third-heading">
          <h2 id="third-heading" className="terms-heading">Who we share data with</h2>
          <p className="terms-body">
            We rely on a small set of trusted vendors to run Clarion. Each one only
            sees the data it needs to do its job:
          </p>
          <p className="terms-body">
            <strong>Supabase</strong> hosts our database and handles sign-in. Your
            account, profile, labs, and logs are stored there, encrypted in transit
            and at rest.
          </p>
          <p className="terms-body">
            <strong>Stripe</strong> processes payments and subscriptions. Stripe
            receives your payment details directly—we only receive a confirmation.
          </p>
          <p className="terms-body">
            <strong>Resend</strong> sends transactional email from us (receipts,
            password resets, report delivery, important account notices).
          </p>
          <p className="terms-body">
            <strong>OpenAI</strong> powers some of our AI features, like biomarker
            explanations, protocol guidance, and support chat. When you use those
            features, the relevant parts of your data (for example, the specific
            biomarker you're asking about, along with the context Clarion needs to
            answer well) are sent to OpenAI's API to generate a response. We access
            OpenAI through their API, and we have not opted in to having your data
            used to train their models. OpenAI may retain API inputs and outputs
            for a limited window to monitor for abuse; see OpenAI's own privacy
            policy for details.
          </p>
          <p className="terms-body">
            <strong>Vercel</strong> hosts the website and provides basic analytics
            (page views, performance) without third-party tracking cookies.
          </p>
          <p className="terms-body">
            <strong>Amazon Associates.</strong> Some supplement links on Clarion are
            affiliate links. If you click one and buy on Amazon, we may earn a
            commission. Amazon—not Clarion—controls what happens after you leave our
            site, and their privacy policy applies there.
          </p>
          <p className="terms-body">
            We may also share data if we are required to by law, to protect
            someone's safety, or as part of a business change (merger, acquisition)—
            in which case we would notify you first.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="sensitive-heading">
          <h2 id="sensitive-heading" className="terms-heading">Sensitive information</h2>
          <p className="terms-body">
            Some of what you give us—like lab values, diagnoses you mention, and
            health-related survey answers—is considered <strong>sensitive personal
            information</strong> under US state privacy laws. We only use this
            information for the core purpose of the product: giving you your
            biomarker analysis, personalizing your protocol, and making Clarion
            work for you. We do <strong>not</strong> use it to infer things about
            your character, build marketing profiles, or share it with anyone for
            advertising. Because we don't use sensitive information outside the
            product's core purpose, there isn't a separate "limit the use of my
            sensitive information" toggle to surface here—but you can still
            delete or export any of this data at any time (see the next section).
          </p>
        </section>

        <section className="terms-section" aria-labelledby="cookies-heading">
          <h2 id="cookies-heading" className="terms-heading">Cookies and analytics</h2>
          <p className="terms-body">
            We use a small number of cookies to keep you logged in and remember
            your preferences (like dark mode). For analytics, we use Vercel's
            built-in analytics, which give us aggregate numbers like page views and
            load times without setting third-party tracking cookies or building an
            advertising profile on you. We do not use Google Analytics, Facebook
            Pixel, or similar trackers.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="rights-heading">
          <h2 id="rights-heading" className="terms-heading">Your rights</h2>
          <p className="terms-body">
            If you live in California, Colorado, Virginia, Connecticut, Texas, or
            another state with a consumer privacy law (CCPA/CPRA and similar),
            you have specific rights over your personal information. We extend
            these same rights to every Clarion user, wherever you are in the US:
          </p>
          <p className="terms-body">
            <strong>Access.</strong> You can ask for a copy of the personal
            information we hold about you.
          </p>
          <p className="terms-body">
            <strong>Export.</strong> You can ask us to send you your data in a
            portable format (for example, JSON or CSV).
          </p>
          <p className="terms-body">
            <strong>Delete.</strong> You can delete your account from the settings
            page, which removes your profile, labs, and logs from our active
            systems. You can also email us to request deletion.
          </p>
          <p className="terms-body">
            <strong>Correct.</strong> You can edit most of your data directly in
            the app, or ask us to fix something that isn't right.
          </p>
          <p className="terms-body">
            <strong>No sale or sharing for ads.</strong> We don't sell your personal
            information and we don't share it for cross-context behavioral
            advertising. There is nothing to opt out of on that front.
          </p>
          <p className="terms-body">
            <strong>Appeal.</strong> If we deny a request, you can ask us to review
            that decision. Some states also let you contact your state attorney
            general if you think we got it wrong.
          </p>
          <p className="terms-body">
            <strong>No retaliation.</strong> We won't charge you more or give you
            worse service for exercising your privacy rights.
          </p>
          <p className="terms-body">
            To use any of these rights, email us at <strong>support@clarionlabs.tech</strong>.
            We will respond within 45 days (or the window your state law requires,
            if shorter). We may ask you to verify your identity before we act on a
            request—usually just by confirming from the email on your Clarion
            account.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="retention-heading">
          <h2 id="retention-heading" className="terms-heading">How long we keep your data</h2>
          <p className="terms-body">
            We keep your data for as long as your account is active. When you
            delete your account, we remove your personal data from our active
            systems. Some copies may live in our database provider's routine
            backups for up to about 30 days before they roll off. We also keep a
            minimal record of payments, tax information, and legal notices when
            the law requires it (typically for several years).
          </p>
        </section>

        <section className="terms-section" aria-labelledby="security-heading">
          <h2 id="security-heading" className="terms-heading">How we protect your data</h2>
          <p className="terms-body">
            Your data is encrypted in transit (HTTPS) and at rest in our database.
            Access inside Clarion is limited to the people who need it to run the
            product. No online service is perfectly secure, so please use a strong,
            unique password and let us know right away if you think your account
            has been compromised.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="children-heading">
          <h2 id="children-heading" className="terms-heading">Children</h2>
          <p className="terms-body">
            Clarion is built for adults. You must be <strong>18 or older</strong> to
            create an account. We do not knowingly collect information from anyone
            under 18. If you believe a child has given us their information, email
            <strong> support@clarionlabs.tech</strong> and we will delete it.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="changes-heading">
          <h2 id="changes-heading" className="terms-heading">Changes to this policy</h2>
          <p className="terms-body">
            If we make meaningful changes to how we handle your data, we'll update
            this page and, when the change is significant, send you an email. The
            "last updated" date below always reflects the current version.
          </p>
        </section>

        <section className="terms-section" aria-labelledby="contact-heading">
          <h2 id="contact-heading" className="terms-heading">Contact us</h2>
          <p className="terms-body">
            Questions about privacy, a request about your data, or something that
            just feels off? Email us at <strong>support@clarionlabs.tech</strong>. A real person
            on the Clarion team will get back to you.
          </p>
        </section>

        <p className="terms-footer-note">
          Last updated: April 2026. This policy is informational and not legal advice.
        </p>

        <p className="terms-back">
          <Link href="/terms">Terms &amp; Disclaimer</Link>
          {" · "}
          <Link href="/">← Back to home</Link>
        </p>
      </div>
    </main>
  );
}
