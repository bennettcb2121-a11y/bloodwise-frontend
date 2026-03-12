# Clarion — Implementation Roadmap

This doc tells Clarion (or any implementer) exactly what to do next. Keep the existing blue/purple gradient theme, premium feel, and minimal layout.

---

## Done in this pass

1. **Dashboard access** — Removed the redirect that sent paid users back to `/` when they hadn’t completed the “results flow.” Anyone with `analysis_purchased_at` can access the dashboard.
2. **Selection states** — Stronger selected state for all choice cards: orange border, filled background, lift, so “What best describes you?” and every other selectable card clearly change when selected.
3. **Sex options** — Replaced dropdown with selectable cards: Male, Female, Other, Prefer not to say. Same `.onboarding-answer-card.selected` styling.
4. **Friendlier paywall/lock copy** — Replaced “Subscription required” with “Your personalized analysis is ready” and “Unlock my analysis” across results lock overlays and paywall.

---

## 1. Supplements: selectable chips + “add your own” + adaptive stack

**Where:** Onboarding step 4 — “Do you currently take supplements?”

**Current:** Yes/No + free-text area.

**Target:**

- **A. Select from common supplements**  
  Tappable chips/cards for: Vitamin D, Magnesium, Fish oil / Omega-3, Iron, Zinc, Creatine, Protein powder, B12, Folate, Fiber, Electrolytes, Multivitamin, Probiotic.
- **B. Add your own**  
  “Add your own” input for anything not listed.
- **C. Persist and use in stack**  
  Save selected supplements (and custom ones) on profile. When building the optimized stack:
  - If user already takes a recommended supplement → say if it’s **good**, **not ideal**, **worth upgrading**, or **unnecessary**, and why.
  - Example: “You already take magnesium, but your current form may not be ideal for absorption. Clarion recommends magnesium glycinate.”
  - Example: “Already in your stack — dosage may still need adjustment based on your labs.”

**Data:** Add something like `current_supplements_list: string[]` (and/or a structured list) to profile so stack logic can compare and adapt.

**UX:** Smart and helpful, not judgmental.

---

## 2. “Do you already have lab results?” split + blood test affiliate

**Where:** Before lab entry (currently step 7). Insert two steps.

**New step A — “Do you already have lab results?”**

- **Options (cards):**
  - **Yes, I already have results** → go to manual lab entry (current step 7).
  - **No, help me get the right test** → go to blood test affiliate step.

**New step B — Blood test affiliate (when “No”)**

- **Tone:** Calm, guided, trustworthy, premium. Not pushy.
- **Two paths (cards/sections):**
  1. **Use your doctor**  
     “Take Clarion’s recommended panel to your doctor or lab provider.”  
     Show recommended panel summary + why these biomarkers matter.
  2. **Order a test online**  
     “Prefer to skip the hassle? Order a recommended blood test online through one of our partners.”  
     Partner cards with: provider name, short description, biomarkers included, price, affiliate link, optional badge (“Best value”, “Most complete”).
- **Data structure (for later partners):**  
  `{ providerName, description, biomarkersIncluded: string[], price, affiliateUrl, badge? }`
- **Navigation:** After choosing a path (or later “I have results”), allow continuing to lab entry.

**Step renumbering:** After inserting these two steps, shift all following step indices (lab entry, analysis, score, insights, stack, summary) by +2 so deep links and `currentStep` stay consistent.

---

## 3. Health score visual upgrade

**Where:** Results flow — health score screen (current step 9).

**Keep:** Same concept (circular score, optimal/borderline/flagged).

**Improve:**

- Cleaner circular score ring (stroke, gradient, glow).
- Better spacing and hierarchy (score vs supporting stats).
- Clearer layout for optimal / borderline / flagged.
- Nicer insight panel below.
- More depth (e.g. soft shadow/glow), no cartoonish look.

---

## 4. Biomarker insights: “What this means for you” + adaptive + science links

**Where:** Biomarker insights step (current step 10).

**Rename / structure each card:**

- **Heading:** “What this means for you” (not generic “Biomarker insights” only).
- **Content:** Adapt by:
  - User profile type (e.g. general adult, fatigue, vegetarian, heart-health).
  - Sex, goal, supplement preference, current supplements.
  - Biomarker value vs optimal range.
- **Example:** Ferritin — if profile is “fatigue / low energy,” emphasize energy and fatigue; if “general health adult,” keep it broad; if vegetarian, add diet context.
- **Per-card structure:**  
  Biomarker name · Current value · Optimal range for you · Status badge · **What this means for you** · Why it matters in your context · Recommended next steps · Retest timing · **Science / Evidence** (see below).

**Science links:**

- Each biomarker has 1–3 study references.
- Data-driven: e.g. `{ studyTitle, journalOrSource, url }[]` per biomarker.
- In UI: “Science” or “Evidence” section with clickable links (open in new tab).
- Store in biomarker metadata (e.g. in `biomarkerDatabase` or a separate evidence map), not hardcoded in JSX.

---

## 5. Amazon (affiliate) cards: images, placement, premium look

**Where:** Stack / protocol step and anywhere supplements are recommended.

**Current:** Text-heavy affiliate list.

**Target:**

- **Product cards include:** image, title, badge (Cheapest / Premium / Overall winner), short rationale, optional monthly cost, clear “Buy on Amazon” CTA.
- **Placement:** Show these cards next to the first recommended supplement section so they feel part of the protocol, not a separate list.
- **Style:** Premium curated cards (spacing, subtle shadows, consistent with app). Intelligence and recommendation stay primary; cards support the protocol.
- **Images:** Use product image URLs (e.g. from affiliate API or stored per ASIN) in `<img>` or Next.js `Image` with proper sizing and aspect ratio.

---

## 6. Clarion+ copy and positioning

**Where:** All Clarion+ mentions (summary step, dashboard, paywall).

**Positioning:** Intelligent health membership, not a generic subscription.

**Emphasize:**

- Biomarker history and trend analysis
- Adherence tracking
- Retest reminders
- Smarter recommendations over time
- Protocol evolution

**Tone:** Confident, helpful, premium. Review and tighten all Clarion+ copy to match.

---

## 7. General UX polish

- **Consistency:** All buttons, toggles, cards, and selection states use the same design system (e.g. `.onboarding-answer-card.selected` and shared hover).
- **Copy:** Intelligent, friendly, reassuring, premium — not robotic or overly clinical.
- **Preserve:** Gradient theme, immersive feel, large typography, minimal structure, smooth flow.

---

## Suggested build order

1. Supplements selector + adaptive stack logic (data + UI).
2. “Already have lab results?” step + blood test affiliate step (incl. step renumbering).
3. Health score visual upgrade.
4. Biomarker insights: “What this means for you” + adaptive text + science links (data + UI).
5. Amazon cards: images, placement, premium styling.
6. Clarion+ copy pass.
7. Global UX polish pass.

---

## Technical notes

- **Profile / Supabase:** New fields (e.g. `current_supplements_list`, sex value `"Other"` / `"Prefer not to say"`) may require migration or schema notes.
- **Step indices:** Any new steps (e.g. “have labs?”, blood test affiliate) require updating `currentStep` checks, `TOTAL_STEPS`, and any `preview` or deep-link step maps.
- **Biomarker evidence:** Add a small evidence/studies structure per biomarker and wire it into the insights UI and any export.
