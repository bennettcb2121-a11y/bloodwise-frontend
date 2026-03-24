# Plan: Addictive, Stand Out, and Liability-Safe

This plan addresses three goals: (1) make Clarion habit-forming and sticky, (2) make it clearly stand out, and (3) keep the product within safe bounds for regulation and liability.

---

## Part 1: Make It Addictive (Habit & Retention)

### 1.1 Protocol tracker as a daily habit
- **Current:** Protocol tracker exists on dashboard with checkboxes (e.g. Iron protocol, Vitamin D).
- **Add:**
  - **Streak:** "You've completed your protocol 5 days in a row." Show streak count; optional gentle nudge if they miss a day ("Keep your streak—log today").
  - **Weekly summary:** "This week you hit 4/7 days." Simple progress ring or bar.
  - **Persist streak in Supabase:** New table or column (e.g. `protocol_streak_days`, `last_protocol_date`) so it survives refresh and devices when logged in.

### 1.2 Retest as a "next milestone"
- **Current:** Retest countdown / "Add new results" exists.
- **Add:**
  - **Clear CTA:** "Your retest window opens in 12 days" with a primary button "Remind me" or "Add to calendar."
  - **Post-retest win:** After they add new results, show a clear "You retested—here’s your updated score" moment and, if score improved, "You’re up 8 points from last time."
  - **Email/SMS reminder:** Use existing phone/email to send one reminder when retest is due (already have Resend/cron; add a "retest due" email template).

### 1.3 Ask Clarion as a daily hook
- **Current:** Ask Clarion is available app-wide.
- **Add:**
  - **Lightweight prompt on dashboard:** If they haven’t asked anything today, show one line: "Ask Clarion anything about your results" with a small link that opens the assistant.
  - **Optional "tip of the day":** One short, non-personal tip (e.g. "Vitamin D absorbs better with a meal") that rotates—drives a quick open.

### 1.4 Progress and "before/after"
- **Current:** Trends chart and score exist.
- **Add:**
  - **Score delta front and center:** When they have 2+ bloodwork saves, show "Then: 72 → Now: 80" (or "First score: X, Latest: Y") on the dashboard hero or right below the score.
  - **"Your journey" micro-section:** List past report dates and scores in one line (e.g. "Mar 2025: 72 · Jan 2025: 68") so progress is visible at a glance.

### 1.5 Small wins and completion
- **Add:**
  - **Onboarding completion:** After they finish the post-payment flow and land on dashboard, one-time toast or line: "You’re all set. Your plan is ready."
  - **Profile completeness:** Optional "Complete your profile" nudge (height, weight, goals) with a small progress indicator (e.g. "3/5 fields") that disappears when done—no guilt, just clarity.

---

## Part 2: Stand Out (Positioning and Differentiation)

### 2.1 One clear tagline and positioning
- **Define a single line** you use everywhere (landing, paywall, meta description):
  - Example: *"The bloodwork coach that explains your numbers and your next steps."*
  - Or: *"Understand your bloodwork. Get a clear plan. No jargon."*
- **Implement:** Use it in `layout.tsx` metadata, paywall headline, and any landing copy. Remove or shorten competing taglines so one message dominates.

### 2.2 Differentiator on the paywall and landing
- **Spell out why Clarion, not a lab or a blog:**
  - "We don’t sell labs—we help you use the ones you have."
  - "Built for when you’ve had bloodwork and didn’t know what to do next."
- **Add one short "How it’s different" block:** 3 bullets (e.g. Personalized to your goals · Plain-English explanations · One place for plan + tracking).

### 2.3 SEO and content that pulls traffic
- **Guides are already key.** Ensure each guide has:
  - A clear meta title and description (e.g. "How to Improve Your Iron and Ferritin | Clarion").
  - One H1 and logical H2s so they rank for "how to improve ferritin," "low vitamin D what to do," etc.
- **Optional:** A simple blog or "Learn" index that lists guides and protocols so search engines and users have one place to land.

### 2.4 Ask Clarion as the differentiator
- **In marketing and in-app:** Call out that they can "ask questions in plain English" about their results and get answers that stay in education territory. Use that in the paywall feature list and in the dashboard one-liner.

### 2.5 Partnerships and distribution
- **Lab affiliates:** If you partner with a lab company, position Clarion as "what you do after you get your results"—they send you traffic; you don’t compete on selling the draw.
- **Clear CTA for shared links:** "Share your plan" or "Send this to your doctor" (e.g. PDF or link to a read-only summary) so users can spread the product naturally.

---

## Part 3: No Regulation and Liability Issues

### 3.1 Disclaimers (strengthen and standardize)
- **Current:** "For education only. Not medical advice" appears in Ask Clarion, guides, protocols, and evidence drawer.
- **Add:**
  - **Global footer or first-time modal:** One short line on first visit or in app footer: "Clarion provides education and decision support only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions."
  - **Results and stack pages:** Ensure the same line (or a shortened version) appears near the top or bottom of the results/stack/summary flow so it’s visible before they act on recommendations.

### 3.2 Copy audit: never diagnose or prescribe
- **Rules:**
  - Never say "you have X" (condition). Use "your results may suggest …" or "some people with similar results …" or "this can be consistent with …".
  - Never say "you should take X mg." Use "many protocols use …" or "common ranges are …" and "discuss with your clinician."
  - Avoid "treat," "cure," "fix." Use "support," "improve," "address," "optimize" in an educational sense.
- **Audit:** Search the codebase and content for "you have," "you should take," "treat," "diagnosis," "prescribe" and replace with the safer phrasing above. Keep supplement and protocol copy in "education and common practice" frame.

### 3.3 Terms of use and consent
- **Add a Terms of Use / Disclaimer page** (e.g. `/terms` or `/disclaimer`) that states:
  - Clarion is for education and decision support only.
  - Not medical advice, not a substitute for a doctor.
  - User is responsible for their own health decisions and for consulting a qualified provider.
- **Optional:** A one-time "I understand" or link to terms at signup or before first results view so you have a record that the user saw the disclaimer.

### 3.4 Data and promises
- **Don’t promise outcomes:** Avoid "get better bloodwork" or "improve your numbers" as a guarantee. Use "understand your numbers," "get a plan," "track your progress."
- **Minimal health data:** You already store profile and bloodwork the user enters. Don’t add claims that you "diagnose" or "assess disease"; you "interpret results in an educational context."

### 3.5 AI and supplements
- **Ask Clarion:** System prompt already says "education only, never diagnose or prescribe." Keep it; add in the UI that "Answers are for education only and may not apply to your situation."
- **Supplements and protocols:** Keep the existing warnings (e.g. iron overdose, clinician for high-dose vitamin D). In any "recommended for you" copy, add a single line: "Discuss supplements and doses with your clinician."

---

## Implementation Order (Suggested)

| Priority | What to do |
|----------|------------|
| **P0** | Copy audit (Part 3.2): search and replace diagnose/prescribe language. Add global disclaimer line (3.1). |
| **P1** | One tagline + paywall/landing differentiator (2.1, 2.2). Terms/disclaimer page (3.3). |
| **P2** | Streak + weekly summary for protocol tracker (1.1). Score delta and "journey" on dashboard (1.4). |
| **P3** | Retest reminder email (1.2). Meta titles for guides (2.3). |
| **P4** | Dashboard one-liner for Ask Clarion (1.3). "How it’s different" block (2.2). |

---

## Files to Touch (Summary)

- **Disclaimers / copy:** `app/layout.tsx` (footer or meta), `OnboardingFlow.tsx` (results/stack/summary), `ClarionAssistant.tsx`, guides and paid protocols content, any paywall copy.
- **Streak / retention:** New migration or columns for streak; dashboard protocol section; optional `app/api/cron/retest-reminders` or email template.
- **Positioning:** `app/page.tsx` (landing), `app/paywall/page.tsx`, metadata in `layout.tsx` and `guides/[slug]`.
- **New page:** `app/terms/page.tsx` or `app/disclaimer/page.tsx` with Terms/Disclaimer content and link from footer or signup.

This keeps the product sticky and differentiated while staying clearly in the "education and decision support" lane and avoiding language that could imply diagnosis or treatment.
