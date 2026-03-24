/**
 * In-app guides: how to improve specific biomarkers or topics.
 * Used by the Guides list and detail pages; linked from biomarker insights.
 */

export type Guide = {
  slug: string
  title: string
  /** Biomarker key or topic for linking from insights (e.g. Ferritin, Vitamin D). */
  biomarkerKey: string
  /** Short description for list view. */
  description: string
  /** Body content (HTML-safe; use <p>, <ul>, <strong>, etc.). */
  body: string
  order: number
}

export const GUIDES: Guide[] = [
  {
    slug: "iron",
    title: "How to improve your iron and ferritin",
    biomarkerKey: "Ferritin",
    description: "Diet, supplements, and timing to support healthy iron stores.",
    order: 1,
    body: `
<p>Iron and ferritin (stored iron) matter for energy, oxygen transport, and focus. Low ferritin is common, especially in active people and those who don’t eat much red meat.</p>
<h3>Diet</h3>
<ul>
  <li><strong>Heme iron</strong> (best absorbed): red meat, poultry, fish, shellfish, liver.</li>
  <li><strong>Non-heme iron</strong>: lentils, beans, spinach, fortified cereals. Pair with vitamin C (citrus, peppers, berries) to boost absorption.</li>
  <li>Avoid drinking coffee or tea with iron-rich meals; they can reduce absorption.</li>
</ul>
<h3>Supplements</h3>
<p>If your ferritin is low or suboptimal, your clinician may suggest supplemental iron (e.g. ferrous sulfate or gentler bisglycinate). Typical repletion is 25–65 mg elemental iron, often every other day. Take with vitamin C and away from calcium and caffeine. Do not megadose; retest in 8–12 weeks.</p>
<h3>When to retest</h3>
<p>Retest ferritin in 8–10 weeks after starting diet or supplement changes so you can adjust without over-correcting.</p>
<p><em>This guide is for education only. Always work with a clinician for iron supplementation, especially if your levels are very low or the cause is unclear.</em></p>
`,
  },
  {
    slug: "vitamin-d",
    title: "How to improve your vitamin D",
    biomarkerKey: "Vitamin D",
    description: "Sun, food, and supplements to reach and maintain a healthy level.",
    order: 2,
    body: `
<p>Vitamin D supports bone health, immunity, and mood. Many adults are low or insufficient, especially in winter or with limited sun exposure.</p>
<h3>Diet and sun</h3>
<ul>
  <li>Fatty fish (salmon, sardines), egg yolks, fortified dairy or plant milks.</li>
  <li>Short, regular sun exposure (skin type and location matter; avoid burning).</li>
</ul>
<h3>Supplements</h3>
<p>Maintenance is often 1,000–2,000 IU/day. If your level is low, a clinician may suggest a higher repletion dose (e.g. 2,000–5,000 IU/day) for a period, then retest. Form (D3) and taking with a meal can help absorption.</p>
<h3>When to retest</h3>
<p>Retest after 8–12 weeks of consistent intake to see the effect and adjust dose.</p>
<p><em>For education only. High-dose vitamin D should be supervised by a clinician.</em></p>
`,
  },
  {
    slug: "magnesium-sleep",
    title: "Magnesium and sleep",
    biomarkerKey: "Magnesium",
    description: "How magnesium supports sleep, recovery, and when to take it.",
    order: 3,
    body: `
<p>Magnesium supports muscle relaxation, the nervous system, and sleep. Low intake or high stress can deplete stores; many people benefit from diet and targeted supplementation.</p>
<h3>Diet</h3>
<ul>
  <li>Leafy greens, nuts, seeds, dark chocolate, whole grains, and legumes.</li>
  <li>Heavy sweating and alcohol can increase needs.</li>
</ul>
<h3>Supplements</h3>
<p>Magnesium glycinate or citrate are often well tolerated. Taking magnesium in the evening may support sleep for some. Avoid high doses without clinician input, especially if you have kidney concerns.</p>
<h3>When to retest</h3>
<p>Retest in 6–8 weeks if repleting. Discuss with your clinician for persistent low levels.</p>
<p><em>For education only. Not a substitute for medical advice.</em></p>
`,
  },
  {
    slug: "b12-absorption",
    title: "Understanding B12 absorption",
    biomarkerKey: "Vitamin B12",
    description: "Why B12 can be low and how to improve absorption.",
    order: 4,
    body: `
<p>Vitamin B12 supports red blood cells, energy metabolism, and the nervous system. Low or low-normal B12 is common with limited animal foods, certain medications, or absorption issues.</p>
<h3>Diet</h3>
<ul>
  <li>Shellfish, beef, salmon, dairy, eggs. Plant-based diets need fortified foods or a B12 supplement.</li>
  <li>PPIs and metformin can affect absorption; discuss with your clinician.</li>
</ul>
<h3>Supplements</h3>
<p>Oral B12 (1,000 mcg/day) or sublingual forms often work. If levels stay low despite supplementation, your clinician may check for malabsorption or recommend injections.</p>
<h3>When to retest</h3>
<p>Retest in 8–12 weeks. Do not megadose without follow-up; severe deficiency or neurologic symptoms need clinician-guided treatment.</p>
<p><em>For education only. Always discuss B12 with your clinician if levels are low or you have symptoms.</em></p>
`,
  },
  {
    slug: "gut-health",
    title: "Gut health basics",
    biomarkerKey: "Gut health",
    description: "Diet, fiber, and habits that support a healthy gut.",
    order: 5,
    body: `
<p>Gut health affects digestion, immunity, and energy. Small, consistent habits often help more than quick fixes.</p>
<h3>Diet</h3>
<ul>
  <li>Fiber from vegetables, fruits, legumes, and whole grains.</li>
  <li>Fermented foods (yogurt, kefir, sauerkraut) for variety of beneficial bacteria.</li>
  <li>Stay hydrated and increase fiber gradually to avoid discomfort.</li>
</ul>
<h3>Lifestyle</h3>
<p>Regular movement, sleep, and stress management support gut function. If you take probiotics or supplements, give them time and discuss with a clinician if you have ongoing symptoms.</p>
<p><em>For education only. See a clinician for persistent digestive issues.</em></p>
`,
  },
]

export function getGuideBySlug(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug)
}

export function getGuidesForBiomarker(biomarkerKey: string): Guide[] {
  const key = biomarkerKey.trim().toLowerCase()
  return GUIDES.filter(
    (g) => g.biomarkerKey.toLowerCase() === key || g.biomarkerKey.toLowerCase().includes(key)
  )
}

/** Get up to 3 guides that match the given priority marker names; fallback to first 2 guides if no match. */
export function getGuidesForPriorities(priorityNames: string[]): Guide[] {
  const seen = new Set<string>()
  const out: Guide[] = []
  for (const name of priorityNames) {
    if (!name?.trim()) continue
    const guides = getGuidesForBiomarker(name)
    for (const g of guides) {
      if (!seen.has(g.slug)) {
        seen.add(g.slug)
        out.push(g)
        if (out.length >= 3) return out
      }
    }
  }
  if (out.length > 0) return out
  return GUIDES.slice(0, 2)
}
