/**
 * Stamp Duty Calculation Service
 * Calculates stamp duty for ownership transfers
 */

/**
 * Stamp duty rates (Zimbabwe - simplified, would need actual rates)
 */
export interface StampDutyRate {
  minAmount: number
  maxAmount?: number
  rate: number // Percentage
  fixedAmount?: number // Fixed amount if applicable
}

/**
 * Default stamp duty rates (example - needs actual Zimbabwe rates)
 */
const STAMP_DUTY_RATES: Record<string, StampDutyRate[]> = {
  sale: [
    { minAmount: 0, maxAmount: 10000, rate: 0.01 }, // 1% up to $10,000
    { minAmount: 10000, maxAmount: 50000, rate: 0.015 }, // 1.5% from $10,000 to $50,000
    { minAmount: 50000, rate: 0.02 }, // 2% above $50,000
  ],
  gift: [
    { minAmount: 0, rate: 0.005 }, // 0.5% for gifts
  ],
  inheritance: [
    { minAmount: 0, rate: 0 }, // No stamp duty on inheritance
  ],
  court_order: [
    { minAmount: 0, rate: 0 }, // No stamp duty on court orders
  ],
  other: [
    { minAmount: 0, rate: 0.01 }, // Default 1%
  ],
}

/**
 * Calculate stamp duty for a transfer
 */
export function calculateStampDuty(
  transferType: 'sale' | 'inheritance' | 'gift' | 'court_order' | 'other',
  considerationAmount: number,
  currency: string = 'USD'
): {
  amount: number
  currency: string
  breakdown: Array<{
    tier: string
    amount: number
    rate: number
    duty: number
  }>
} {
  const rates = STAMP_DUTY_RATES[transferType] || STAMP_DUTY_RATES.other
  let totalDuty = 0
  const breakdown: Array<{
    tier: string
    amount: number
    rate: number
    duty: number
  }> = []

  let remainingAmount = considerationAmount

  for (const rate of rates) {
    if (remainingAmount <= 0) break

    const tierMin = rate.minAmount
    const tierMax = rate.maxAmount || Infinity
    const tierAmount = Math.min(remainingAmount, tierMax - tierMin)

    if (tierAmount > 0) {
      const tierDuty = rate.fixedAmount
        ? rate.fixedAmount
        : tierAmount * (rate.rate / 100)

      totalDuty += tierDuty
      breakdown.push({
        tier: `$${tierMin.toLocaleString()}${rate.maxAmount ? ` - $${rate.maxAmount.toLocaleString()}` : '+'}`,
        amount: tierAmount,
        rate: rate.rate,
        duty: tierDuty,
      })

      remainingAmount -= tierAmount
    }
  }

  // Minimum stamp duty (if applicable)
  const minimumDuty = 50 // Example minimum
  if (totalDuty < minimumDuty && considerationAmount > 0) {
    totalDuty = minimumDuty
    breakdown.push({
      tier: 'Minimum duty',
      amount: considerationAmount,
      rate: 0,
      duty: minimumDuty,
    })
  }

  return {
    amount: Math.round(totalDuty * 100) / 100, // Round to 2 decimal places
    currency,
    breakdown,
  }
}

/**
 * Get stamp duty information for display
 */
export function getStampDutyInfo(
  transferType: 'sale' | 'inheritance' | 'gift' | 'court_order' | 'other',
  considerationAmount?: number
): {
  applicable: boolean
  description: string
  estimatedAmount?: number
} {
  if (!considerationAmount || considerationAmount === 0) {
    return {
      applicable: transferType === 'sale',
      description:
        transferType === 'sale'
          ? 'Stamp duty applies to sale transfers'
          : 'No stamp duty for this transfer type',
    }
  }

  const calculation = calculateStampDuty(transferType, considerationAmount)

  return {
    applicable: true,
    description: `Stamp duty calculated based on consideration amount`,
    estimatedAmount: calculation.amount,
  }
}

