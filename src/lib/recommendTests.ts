import { normalize } from "./panelEngine"
import { classifyUser, type UserProfile } from "./classifyUser"
import { getHealthContext } from "./healthContext"

type BiomarkerResult = {
  name?: string
  status?: "deficient" | "suboptimal" | "optimal" | "high" | "low"
  recommendedTests?: string[]
}

export type RecommendedTestsResult = {
  tests: string[]
  /** One-line education / context per test (first reason wins on merge). */
  rationaleByTest: Record<string, string>
}

function reportMatchesSuggested(report: BiomarkerResult[], suggested: string): BiomarkerResult | undefined {
  const s = normalize(suggested)
  return report.find((r) => {
    const n = normalize(r.name || "")
    return n === s || n.includes(s) || s.includes(n)
  })
}

/** Skip suggesting a panel test when we already have an optimal result for that marker. */
function shouldSkipAsAlreadyOptimal(report: BiomarkerResult[], suggested: string): boolean {
  const hit = reportMatchesSuggested(report, suggested)
  return Boolean(hit && hit.status === "optimal")
}

function addTest(
  tests: Set<string>,
  rationaleByTest: Record<string, string>,
  test: string,
  rationale: string,
  report: BiomarkerResult[]
) {
  if (!test || shouldSkipAsAlreadyOptimal(report, test)) return
  tests.add(test)
  if (!rationaleByTest[test]) rationaleByTest[test] = rationale
}

export function recommendTests(
  report: BiomarkerResult[] = [],
  profile: UserProfile = {}
): RecommendedTestsResult {
  const tests = new Set<string>()
  const rationaleByTest: Record<string, string> = {}
  const classified = classifyUser(profile)

  const healthContext = getHealthContext({
    height_cm: profile.height_cm ?? undefined,
    weight_kg: profile.weight_kg ?? undefined,
    profile_type: profile.profile_type ?? undefined,
    goal: profile.goal ?? undefined,
    sex: profile.sex ?? undefined,
  })
  if (healthContext?.emphasizeMetabolic) {
    addTest(
      tests,
      rationaleByTest,
      "HbA1c",
      "Metabolic focus from BMI/goal context — glycemic control and cardiometabolic risk.",
      report
    )
    addTest(tests, rationaleByTest, "Fasting insulin", "Pairs with glucose for insulin resistance context.", report)
    addTest(tests, rationaleByTest, "Glucose", "Core glycemic marker when metabolic emphasis applies.", report)
    addTest(tests, rationaleByTest, "Triglycerides", "Lipid pair with glycemic markers in metabolic risk context.", report)
    addTest(tests, rationaleByTest, "HDL-C", "Lipid context alongside triglycerides.", report)
  }
  if (healthContext?.emphasizeIron) {
    addTest(
      tests,
      rationaleByTest,
      "CBC",
      "Iron/anemia focus — complete blood count for hemoglobin context.",
      report
    )
    addTest(tests, rationaleByTest, "Ferritin", "Iron storage marker when iron emphasis applies.", report)
    addTest(tests, rationaleByTest, "Iron Panel", "Serum iron studies alongside ferritin.", report)
    addTest(tests, rationaleByTest, "Transferrin Saturation", "Helps interpret iron availability vs ferritin alone.", report)
    addTest(tests, rationaleByTest, "Vitamin B12", "Often paired with iron studies in fatigue or diet context.", report)
  }

  if (classified.userClass === "endurance") {
    addTest(tests, rationaleByTest, "Ferritin", "Endurance training increases iron demand and turnover.", report)
    addTest(tests, rationaleByTest, "Vitamin D", "Common gap in athletes; ties to bone, immunity, recovery.", report)
    addTest(tests, rationaleByTest, "Magnesium", "Sweat, training load, and recovery context.", report)
    addTest(tests, rationaleByTest, "Vitamin B12", "Energy metabolism and endurance performance context.", report)
    addTest(tests, rationaleByTest, "CRP", "Training load and recovery strain context.", report)
  }

  if (classified.userClass === "strength") {
    addTest(tests, rationaleByTest, "Testosterone", "Strength-focused training and adaptation context.", report)
    addTest(tests, rationaleByTest, "Vitamin D", "Musculoskeletal and hormone milieu context.", report)
    addTest(tests, rationaleByTest, "Magnesium", "Recovery and neuromuscular function.", report)
    addTest(tests, rationaleByTest, "CRP", "Recovery and systemic load context.", report)
  }

  if (classified.userClass === "mixed") {
    addTest(tests, rationaleByTest, "Vitamin D", "General athletic sufficiency across mixed training.", report)
    addTest(tests, rationaleByTest, "Magnesium", "Recovery across strength and conditioning.", report)
    addTest(tests, rationaleByTest, "CRP", "Inflammation/recovery context.", report)
    addTest(tests, rationaleByTest, "Glucose", "Metabolic flexibility in hybrid training.", report)
  }

  if (classified.userClass === "general") {
    addTest(tests, rationaleByTest, "Vitamin D", "Widely relevant population screening marker.", report)
    addTest(tests, rationaleByTest, "CRP", "Baseline inflammation context.", report)
    addTest(tests, rationaleByTest, "Glucose", "Core metabolic screen.", report)
    addTest(tests, rationaleByTest, "Insulin", "Useful when glucose or weight/insulin goals apply.", report)
  }

  if (classified.sex === "female" && classified.userClass === "endurance") {
    addTest(tests, rationaleByTest, "CBC", "Female endurance athletes often track iron-related CBC.", report)
    addTest(tests, rationaleByTest, "Iron Panel", "Complements ferritin for iron deficiency workup.", report)
    addTest(tests, rationaleByTest, "Transferrin Saturation", "Interprets iron availability with ferritin.", report)
  }

  if (classified.ageGroup === "masters") {
    addTest(tests, rationaleByTest, "HbA1c", "Age-related metabolic risk screening.", report)
    addTest(tests, rationaleByTest, "Lipid Panel", "Cardiovascular risk context in older adults.", report)
    addTest(tests, rationaleByTest, "TSH", "Thyroid symptoms and energy overlap with age.", report)
  }

  if (classified.ageGroup === "adolescent") {
    addTest(tests, rationaleByTest, "CBC", "Growth and training load context in younger athletes.", report)
    addTest(tests, rationaleByTest, "Ferritin", "Iron status during growth and sport.", report)
    addTest(tests, rationaleByTest, "Vitamin D", "Bone and development context.", report)
  }

  if (classified.dietRisk === "moderate" || classified.dietRisk === "high") {
    addTest(tests, rationaleByTest, "Vitamin B12", "Plant-forward diets often warrant B12 monitoring.", report)
    addTest(tests, rationaleByTest, "Ferritin", "Diet patterns can affect iron intake/absorption.", report)
    addTest(tests, rationaleByTest, "Iron Panel", "Follow-up when plant-based iron intake is uncertain.", report)
  }

  if (Array.isArray(report)) {
    report.forEach((item) => {
      const status = String(item?.status || "").toLowerCase()

      if (
        status === "deficient" ||
        status === "suboptimal" ||
        status === "low" ||
        status === "high"
      ) {
        if (Array.isArray(item?.recommendedTests)) {
          item.recommendedTests!.forEach((test) => {
            if (test) {
              addTest(
                tests,
                rationaleByTest,
                test,
                `Follow-up tied to your flagged ${item.name || "marker"} result — discuss timing with your clinician.`,
                report
              )
            }
          })
        }
      }
    })
  }

  const ordered = Array.from(tests).sort((a, b) => a.localeCompare(b))
  return { tests: ordered, rationaleByTest }
}
