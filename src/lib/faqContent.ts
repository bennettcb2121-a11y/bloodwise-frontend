/**
 * Single source for /faq page and keyword support matcher.
 * Keep `id` stable for anchors: /faq#account
 */

export type FaqItem = {
  id: string
  question: string
  /** Plain text; shown on FAQ page and in matcher replies */
  answer: string
  /** Lowercase tokens for matchSupportFaq (no need to duplicate question words) */
  keywords: string[]
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-clarion",
    question: "What is Clarion Labs?",
    answer:
      "Clarion Labs helps you understand bloodwork in plain language, see a health score, and get structured next steps—including supplement and lifestyle context. It is for education and decision support, not a substitute for your doctor.",
    keywords: ["what is", "clarion", "about", "product", "app"],
  },
  {
    id: "account",
    question: "How do I create or access my account?",
    answer:
      "Use Log in from the home page. You can sign in with email (magic link or password, depending on your setup). Your dashboard saves after you complete onboarding or purchase analysis access.",
    keywords: ["account", "sign up", "signup", "register", "log in", "login", "sign in", "password", "email"],
  },
  {
    id: "billing",
    question: "How does billing work?",
    answer:
      "One-time analysis purchases and optional subscriptions (e.g. Clarion+) are handled at checkout. For receipt or billing questions, use the Help chat or contact support with the email on this page.",
    keywords: ["bill", "billing", "payment", "charge", "refund", "subscription", "clarion+", "stripe", "receipt", "price", "pay"],
  },
  {
    id: "clarion-lite",
    question: "What is Clarion Lite?",
    answer:
      "Clarion Lite is a lower-priced subscription that gives you dashboard access and education based on your profile and symptoms—not on your lab results. It does not provide biomarker scoring, personalized lab interpretation, or lab-matched dosing. Full Clarion adds the one-time analysis and bloodwork-based personalization. Clarion Lite is for education and habit support only, not a substitute for labs or medical care.",
    keywords: ["lite", "clarion lite", "cheap", "basic", "tier", "symptom", "without labs", "no bloodwork"],
  },
  {
    id: "labs",
    question: "How do I add or update my lab results?",
    answer:
      "From the home flow or your dashboard, follow the guided steps to enter labs. After you have results saved, you can add new panels or updates from the dashboard and Plan areas—use “Add new results” or similar links when shown.",
    keywords: ["labs", "lab", "bloodwork", "results", "upload", "enter", "update", "panel", "retest"],
  },
  {
    id: "dashboard",
    question: "Where do I find my score, plan, and trends?",
    answer:
      "After signing in, open Dashboard for your overview. Use the top tabs for Biomarkers, Actions, Trends, Plan, and more. Your supplement stack and retest reminders live under Plan and the home dashboard.",
    keywords: ["dashboard", "score", "trends", "biomarkers", "plan", "stack", "where", "find", "navigate", "tabs"],
  },
  {
    id: "medical",
    question: "Is this medical advice?",
    answer:
      "No. Clarion provides education and decision support only. It does not diagnose or prescribe. Always talk to a qualified clinician about your results, supplements, and treatment.",
    keywords: ["medical", "advice", "doctor", "diagnosis", "prescribe", "legal", "disclaimer"],
  },
  {
    id: "privacy",
    question: "How is my data handled?",
    answer:
      "We use secure sign-in and store your profile and lab-related data to run the product. See our Terms for the full disclaimer and limitations. Do not share emergency health information through chat—call emergency services or your clinician.",
    keywords: ["privacy", "data", "secure", "delete", "gdpr", "hipaa", "store"],
  },
  {
    id: "contact",
    question: "How can I contact support?",
    answer:
      "Use the Help button (bottom-left) for product and account questions, or browse this FAQ. For issues we can’t resolve in chat, email the support address shown below.",
    keywords: ["contact", "support", "help", "human", "email", "talk to", "someone"],
  },
]

