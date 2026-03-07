import { classifyUser, type UserProfile } from "./classifyUser";

type BiomarkerResult = {
  name?: string;
  status?: "deficient" | "suboptimal" | "optimal" | "high" | "low";
  value?: number;
  optimalMin?: number | null;
  optimalMax?: number | null;
};

type ContextInsight = {
  marker: string;
  context: string;
};

function normalize(text?: string) {
  return String(text || "").trim().toLowerCase();
}

function isLowish(status?: string) {
  const s = normalize(status);
  return s === "deficient" || s === "suboptimal" || s === "low";
}

function isHigh(status?: string) {
  return normalize(status) === "high";
}

export function buildContextInsights(
  report: BiomarkerResult[] = [],
  profile: UserProfile = {}
): ContextInsight[] {
  const classified = classifyUser(profile);
  const insights: ContextInsight[] = [];

  report.forEach((item) => {
    const marker = String(item?.name || "");
    const markerKey = normalize(marker);

    if (markerKey === "ferritin" && isLowish(item?.status)) {
      if (classified.userClass === "endurance") {
        insights.push({
          marker,
          context:
            "Ferritin matters more in endurance athletes because oxygen delivery and red blood cell support directly affect training quality, recovery, and race performance.",
        });
      }

      if (classified.sex === "female") {
        insights.push({
          marker,
          context:
            "This is especially important in female athletes, where iron depletion risk is often higher and low ferritin can impact energy and performance before anemia appears.",
        });
      }

      if (classified.dietRisk === "moderate" || classified.dietRisk === "high") {
        insights.push({
          marker,
          context:
            "Your diet pattern may raise the likelihood of lower iron intake or reduced iron absorption, so ferritin deserves extra attention.",
        });
      }
    }

    if (markerKey === "vitamin b12" && isLowish(item?.status)) {
      if (classified.dietRisk === "moderate" || classified.dietRisk === "high") {
        insights.push({
          marker,
          context:
            "This result is more meaningful with a vegetarian or vegan diet pattern, since vitamin B12 intake is often lower without regular animal-food intake.",
        });
      }

      if (classified.userClass === "endurance") {
        insights.push({
          marker,
          context:
            "For endurance athletes, lower B12 can matter more because red blood cell support and energy production are especially important.",
        });
      }
    }

    if (markerKey === "vitamin d" && isLowish(item?.status)) {
      insights.push({
        marker,
        context:
          "Vitamin D is especially relevant for athletes because it supports bone health, muscle function, recovery, and immune resilience.",
      });
    }

    if (markerKey === "magnesium" && isLowish(item?.status)) {
      if (classified.trainingLoad === "high" || classified.trainingLoad === "elite") {
        insights.push({
          marker,
          context:
            "This may matter more with higher training load, where magnesium demand, sweat loss, and recovery needs are often greater.",
        });
      }
    }

    if (markerKey === "insulin" && isHigh(item?.status)) {
      if (classified.ageGroup === "masters") {
        insights.push({
          marker,
          context:
            "Elevated insulin can deserve more attention in masters users because metabolic flexibility and long-term cardiometabolic health become more important with age.",
        });
      } else {
        insights.push({
          marker,
          context:
            "Higher fasting insulin can point toward reduced insulin sensitivity, even when glucose still looks acceptable.",
        });
      }
    }

    if (markerKey === "testosterone" && isLowish(item?.status)) {
      if (classified.userClass === "endurance") {
        insights.push({
          marker,
          context:
            "In endurance athletes, lower testosterone may reflect poor recovery, underfueling, or broader training stress rather than just a standalone hormone issue.",
        });
      }

      if (classified.trainingLoad === "high" || classified.trainingLoad === "elite") {
        insights.push({
          marker,
          context:
            "High training volume can increase the importance of this result because chronic load, low energy availability, and poor sleep can suppress hormonal recovery.",
        });
      }
    }
  });

  return insights;
}