import type { FeeCalculation, PricingTier } from '@/types'

export function calculateBaseFees(amount: number, feeBase = 5, feePer = 500): number {
  return Math.ceil(amount / feePer) * feeBase
}

export function calculateFees(
  amount: number,
  operationType: 'transfer' | 'withdrawal',
  tier: PricingTier | null,
  walletFees = 1,
  feeBase = 5,
  feePer = 500
): FeeCalculation {
  const baseServiceFees = calculateBaseFees(amount, feeBase, feePer)
  let discountPercent = 0
  if (tier) {
    discountPercent = operationType === 'transfer'
      ? tier.transfer_discount_percent
      : tier.withdrawal_discount_percent
  }
  const discountAmount = Math.round((baseServiceFees * discountPercent) / 100 * 100) / 100
  const finalServiceFees = baseServiceFees - discountAmount
  const totalCharged = amount + walletFees + finalServiceFees
  const profit = totalCharged - amount - walletFees
  return {
    amount,
    wallet_fees: walletFees,
    base_service_fees: baseServiceFees,
    tier_discount_percent: discountPercent,
    tier_discount_amount: discountAmount,
    final_service_fees: finalServiceFees,
    total_charged: totalCharged,
    profit,
  }
}

export function calculateLoyaltyPoints(amount: number, pointsPer = 500): number {
  return Math.floor(amount / pointsPer)
}

export function formatCurrency(amount: number, currency = 'ج'): string {
  const formatted = Math.abs(amount).toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return amount < 0 ? `-${formatted} ${currency}` : `${formatted} ${currency}`
}

export function calculateUsagePercent(used: number, limit: number): number {
  if (limit === 0) return 0
  return Math.min(Math.round((used / limit) * 100), 100)
}

export function getUsageColor(percent: number): string {
  if (percent < 70) return 'green'
  if (percent < 80) return 'yellow'
  if (percent < 90) return 'orange'
  return 'red'
}

export function getTierName(level: number): string {
  const names: Record<number, string> = {
    1: 'برونزية', 2: 'فضية', 3: 'ذهبية', 4: 'ماسية'
  }
  return names[level] || 'غير محدد'
}

export function getTierIcon(level: number): string {
  const icons: Record<number, string> = {
    1: '🥉', 2: '🥈', 3: '🥇', 4: '💎'
  }
  return icons[level] || '⭐'
}
