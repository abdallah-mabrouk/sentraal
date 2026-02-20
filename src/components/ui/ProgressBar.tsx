import { cn } from '@/utils/cn'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'blue' | 'green' | 'yellow' | 'orange' | 'red'
  size?: 'sm' | 'md'
  showLabel?: boolean
  label?: string
  className?: string
}

export function ProgressBar({
  value, max = 100, color = 'blue', size = 'md',
  showLabel, label, className
}: ProgressBarProps) {
  const percent = Math.min(Math.round((value / max) * 100), 100)
  const autoColor = percent >= 90 ? 'red' : percent >= 80 ? 'orange' : percent >= 70 ? 'yellow' : 'green'
  const c = color === 'blue' ? autoColor : color

  const colors = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  }
  const sizes = { sm: 'h-1.5', md: 'h-2.5' }

  return (
    <div className={cn('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{percent}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden', sizes[size])}>
        <div
          className={cn('rounded-full transition-all duration-500', colors[c], sizes[size])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
