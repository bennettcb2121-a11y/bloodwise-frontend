import { classifyUser, type UserProfile } from "./classifyUser";

type BiomarkerResult = {
  name?: string;
  status?: "deficient" | "suboptimal" | "optimal" | "high" | "low";
  recommendedTests?: string[];
};

function addMany(set: Set<string>, items: string[]) {
  items.forEach((item) => {
    if (item) set.add(item);
  });
}

export function recommendTests(
  report: BiomarkerResult[] = [],
  profile: UserProfile = {}
) {
  const tests = new Set<string>();
  const classified = classifyUser(profile);

  // Base recommendations by user type
  if (classified.userClass === "endurance") {
    addMany(tests, [
      "Ferritin",
      "Vitamin D",
      "Magnesium",
      "Vitamin B12",
      "CRP",
    ]);
  }

  if (classified.userClass === "strength") {
    addMany(tests, [
      "Testosterone",
      "Vitamin D",
      "Magnesium",
      "CRP",
    ]);
  }

  if (classified.userClass === "mixed") {
    addMany(tests, [
      "Vitamin D",
      "Magnesium",
      "CRP",
      "Glucose",
    ]);
  }

  if (classified.userClass === "general") {
    addMany(tests, [
      "Vitamin D",
      "CRP",
      "Glucose",
      "Insulin",
    ]);
  }

  // Sex-specific logic
  if (classified.sex === "female" && classified.userClass === "endurance") {
    addMany(tests, [
      "CBC",
      "Iron Panel",
      "Transferrin Saturation",
    ]);
  }

  // Age-specific logic
  if (classified.ageGroup === "masters") {
    addMany(tests, [
      "HbA1c",
      "Lipid Panel",
      "TSH",
    ]);
  }

  if (classified.ageGroup === "adolescent") {
    addMany(tests, [
      "CBC",
      "Ferritin",
      "Vitamin D",
    ]);
  }

  // Diet-specific logic
  if (classified.dietRisk === "moderate" || classified.dietRisk === "high") {
    addMany(tests, [
      "Vitamin B12",
      "Ferritin",
      "Iron Panel",
    ]);
  }

  // If there is already analyzed bloodwork, add follow-up tests for flagged markers
  if (Array.isArray(report)) {
    report.forEach((item) => {
      const status = String(item?.status || "").toLowerCase();

      if (
        status === "deficient" ||
        status === "suboptimal" ||
        status === "low" ||
        status === "high"
      ) {
        if (Array.isArray(item?.recommendedTests)) {
          item.recommendedTests.forEach((test) => {
            if (test) tests.add(test);
          });
        }
      }
    });
  }

  return Array.from(tests);
}