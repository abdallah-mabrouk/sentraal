import { cn } from '@/utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div className={cn('border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin', sizes[size])} />
      {text && <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">جاري التحميل...</p>
      </div>
    </div>
  )
}

interface EmptyStateProps {
  icon?: string | React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && <div className="mb-4 text-4xl opacity-40">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}
