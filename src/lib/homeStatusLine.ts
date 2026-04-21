/**
 * Home (v2) Block 1 — status line.
 *
 * A single sentence under the greeting that recognizes the user's current
 * state. Priority order matters: the first rule that fires wins. Keep each
 * rule pure so this can be unit tested without React or date mocks.
 */

export type HomeStatusLineInput = {
  runningLowCount: number
  /** Weeks until the next retest window opens (null if no bloodwork on file). */
  retestWeeks: number | null
  streakDays: number
  /** Overall protocol adherence as 0–100. */
  adherencePct: number
  hasStack: boolean
  hasBloodwork: boolean
  /** Day N of the protocol — defaults to max(streakDays, 1) when hasStack. */
  protocolDay?: number
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`
}

export function buildHomeStatusLine(input: HomeStatusLineInput): string {
  const {
    runningLowCount,
    retestWeeks,
    streakDays,
    adherencePct,
    hasStack,
    hasBloodwork,
    protocolDay,
  } = input

  if (runningLowCount > 0) {
    return `${plural(runningLowCount, "supplement")} running low.`
  }

  if (hasBloodwork && retestWeeks != null && retestWeeks > 0 && retestWeeks <= 2) {
    return `Retest window opens in ${plural(retestWeeks, "week")}.`
  }

  if (adherencePct >= 85 && streakDays >= 3) {
    return `${plural(streakDays, "day")} on plan.`
  }

  if (hasStack) {
    if (hasBloodwork && streakDays === 0) {
      return "Your stack is ready. First dose unlocks your streak."
    }
    const day = protocolDay != null && protocolDay > 0 ? protocolDay : Math.max(streakDays, 1)
    return `Day ${day} of your protocol.`
  }

  if (!hasBloodwork && !hasStack) {
    return "Starting today."
  }

  return "Upload your labs when you're ready."
}
