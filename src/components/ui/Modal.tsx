import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Modal({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'relative w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl',
        'animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200',
        sizes[size], className
      )}>
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
