/**
 * Paid protocols: one-time purchase for full protocol content (e.g. Iron, Gut health).
 */

export type PaidProtocol = {
  slug: string
  title: string
  priceCents: number
  description: string
  /** HTML body content for unlocked view. */
  body: string
  /** Optional biomarker key for linking from insights. */
  biomarkerKey?: string
}

export const PAID_PROTOCOLS: PaidProtocol[] = [
  {
    slug: "iron",
    title: "Full Iron Protocol",
    priceCents: 499, // $4.99
    description: "Step-by-step iron repletion and maintenance, dosing, timing, and retest schedule.",
    biomarkerKey: "Ferritin",
    body: `
<h3>Who this is for</h3>
<p>This protocol is for adults with low or suboptimal ferritin who want a clear, structured approach to repletion and maintenance. Always work with a clinician to confirm cause and dosing.</p>
<h3>Phase 1: Repletion</h3>
<ul>
  <li><strong>Dose:</strong> 25–65 mg elemental iron per day or every other day (every-other-day can improve absorption and tolerance).</li>
  <li><strong>Form:</strong> Ferrous sulfate is cost-effective; ferrous bisglycinate is gentler on the gut.</li>
  <li><strong>Timing:</strong> Take on an empty stomach or with a small meal; avoid calcium, coffee, and tea within 1–2 hours.</li>
  <li><strong>Vitamin C:</strong> Pair with 100–200 mg vitamin C (or citrus) to support absorption.</li>
</ul>
<h3>Phase 2: Retest and adjust</h3>
<p>Retest ferritin in 8–12 weeks. Do not megadose; over-correction can be harmful. If levels are still low, your clinician may adjust dose or investigate cause (e.g. blood loss, absorption issues).</p>
<h3>Phase 3: Maintenance</h3>
<p>Once ferritin is in a healthy range, switch to a lower maintenance dose or diet-first approach. Retest periodically as advised by your clinician.</p>
<p><em>This protocol is for education only. It does not replace medical advice. Iron supplementation can be dangerous if misused; always follow your clinician’s guidance.</em></p>
`,
  },
  {
    slug: "gut-health",
    title: "Gut Health Protocol",
    priceCents: 499, // $4.99
    description: "Diet, fiber, and habits to support a healthy gut — especially useful for women and anyone with digestive goals.",
    body: `
<h3>Who this is for</h3>
<p>This protocol is for anyone who wants to support digestion, regularity, and gut comfort through diet and lifestyle. It is not a substitute for medical care if you have a diagnosed condition.</p>
<h3>Diet foundations</h3>
<ul>
  <li><strong>Fiber:</strong> Aim for 25–30 g per day from vegetables, fruits, legumes, and whole grains. Increase gradually to avoid bloating.</li>
  <li><strong>Fermented foods:</strong> Yogurt, kefir, sauerkraut, or kimchi can add variety to beneficial bacteria.</li>
  <li><strong>Hydration:</strong> Enough water supports fiber and motility.</li>
</ul>
<h3>Habits</h3>
<ul>
  <li>Eat at consistent times when possible.</li>
  <li>Chew well and avoid rushing meals.</li>
  <li>Manage stress (sleep, movement, relaxation); stress affects gut function.</li>
</ul>
<h3>When to see a clinician</h3>
<p>If you have persistent bloating, pain, changes in bowel habits, or blood in stool, see a doctor. This protocol is for general wellness only.</p>
<p><em>For education only. Not medical advice.</em></p>
`,
  },
]

export function getPaidProtocolBySlug(slug: string): PaidProtocol | undefined {
  return PAID_PROTOCOLS.find((p) => p.slug === slug)
}
