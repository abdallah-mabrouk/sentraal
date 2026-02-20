import { differenceInCalendarDays, format, startOfMonth, addMonths, addDays, isToday, isTomorrow } from 'date-fns'
import { ar } from 'date-fns/locale'

export function formatDate(date: string | Date, fmt = 'dd/MM/yyyy'): string {
  return format(new Date(date), fmt, { locale: ar })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy - hh:mm a', { locale: ar })
}

export function daysUntil(date: string | Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(date); target.setHours(0, 0, 0, 0)
  return differenceInCalendarDays(target, today)
}

export function calculateNextRechargeDate(
  lastDate: string,
  cycleType: 'monthly' | 'days',
  cycleDay?: number,
  cycleDays?: number
): Date {
  const last = new Date(lastDate)
  if (cycleType === 'monthly' && cycleDay) {
    const next = startOfMonth(addMonths(last, 1))
    next.setDate(cycleDay)
    return next
  }
  if (cycleType === 'days' && cycleDays) {
    return addDays(last, cycleDays)
  }
  return addDays(last, 30)
}

export function timeAgo(date: string | Date): string {
  const diff = differenceInCalendarDays(new Date(), new Date(date))
  if (diff === 0) return 'اليوم'
  if (diff === 1) return 'أمس'
  if (diff < 7) return `منذ ${diff} أيام`
  if (diff < 30) return `منذ ${Math.floor(diff / 7)} أسابيع`
  if (diff < 365) return `منذ ${Math.floor(diff / 30)} أشهر`
  return `منذ ${Math.floor(diff / 365)} سنوات`
}

export function getReminderLabel(days: number): { text: string; color: string } {
  if (days < 0) return { text: 'متأخر', color: 'red' }
  if (days === 0) return { text: 'اليوم', color: 'red' }
  if (days === 1) return { text: 'غداً', color: 'orange' }
  if (days <= 3) return { text: `بعد ${days} أيام`, color: 'yellow' }
  return { text: `بعد ${days} أيام`, color: 'green' }
}

export function getCurrentMonthName(): string {
  return format(new Date(), 'MMMM yyyy', { locale: ar })
}

export function isDateToday(date: string | Date): boolean {
  return isToday(new Date(date))
}

export function isDateTomorrow(date: string | Date): boolean {
  return isTomorrow(new Date(date))
}
