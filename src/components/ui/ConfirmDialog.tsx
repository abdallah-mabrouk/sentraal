import { Modal } from './Modal'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmText = 'تأكيد', cancelText = 'إلغاء',
  variant = 'danger', loading
}: ConfirmDialogProps) {
  const colors = {
    danger: 'text-red-600 bg-red-100',
    warning: 'text-yellow-600 bg-yellow-100',
    info: 'text-blue-600 bg-blue-100',
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-3">
        <div className={`p-3 rounded-full ${colors[variant]}`}>
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
        </div>
        <div className="flex gap-2 w-full pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
