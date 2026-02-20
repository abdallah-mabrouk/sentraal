import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconEnd?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, icon, iconEnd, className, ...props
}, ref) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {props.required && <span className="text-red-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-sm',
            'border-gray-200 dark:border-gray-600',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200',
            error && 'border-red-500 focus:ring-red-500',
            icon && 'pr-10',
            iconEnd && 'pl-10',
            className
          )}
          {...props}
        />
        {iconEnd && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconEnd}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
})
Input.displayName = 'Input'
