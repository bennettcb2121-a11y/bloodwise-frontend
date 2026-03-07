/**
 * Savings and economics: current spend vs optimized stack, annual savings.
 */

export type OptimizedStackSummary = {
  totalMonthlyCost?: number
  [key: string]: unknown
}

export type SavingsSummary = {
  userCurrentSpend: number
  optimizedSpend: number
  estimatedSavingsVsCurrent: number
  annualSavings: number
}

export function computeSavings(
  currentSupplementSpend: number,
  optimizedStack: OptimizedStackSummary
): SavingsSummary {
  const userCurrentSpend = Number(currentSupplementSpend || 0)
  const optimizedSpend = Number(optimizedStack.totalMonthlyCost || 0)
  const estimatedSavingsVsCurrent = Math.max(userCurrentSpend - optimizedSpend, 0)
  const annualSavings = estimatedSavingsVsCurrent * 12
  return {
    userCurrentSpend,
    optimizedSpend,
    estimatedSavingsVsCurrent,
    annualSavings,
  }
}
