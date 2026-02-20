import { forwardRef } from 'react'
import { cn } from '@/utils/cn'
import { ChevronDown } from 'lucide-react'

interface SelectOption { value: string; label: string; disabled?: boolean }

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, options, placeholder, className, ...props
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
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-xl border bg-white dark:bg-gray-800 px-4 py-2.5 text-sm',
            'border-gray-200 dark:border-gray-600',
            'text-gray-900 dark:text-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'transition-all duration-200 pl-10',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
})
Select.displayName = 'Select'
