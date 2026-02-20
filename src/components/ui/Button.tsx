import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary', size = 'md', loading, icon, children,
  className, disabled, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
  }

  const sizes = {
    sm: 'text-sm px-3 py-1.5 h-8',
    md: 'text-sm px-4 py-2 h-10',
    lg: 'text-base px-6 py-3 h-12',
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  )
})
Button.displayName = 'Button'
