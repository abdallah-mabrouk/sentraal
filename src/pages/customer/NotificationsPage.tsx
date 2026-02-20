import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/utils/dates'

const TYPE_ICONS: Record<string, string> = {
  reminder: '🔔',
  alert: '⚠️',
  offer: '🎁',
  achievement: '🏆',
  service_request: '📋',
  approval: '✅',
  transaction: '💸',
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/profile')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ArrowRight size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">الإشعارات</h1>
          <p className="text-sm text-gray-400">
            {unreadCount > 0 ? `${unreadCount} غير مقروء` : 'لا توجد إشعارات جديدة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="ghost" onClick={markAllAsRead}>
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <Card>
          <EmptyState icon="🔔" title="لا توجد إشعارات" />
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <button
              key={n.id}
              onClick={() => {
                if (!n.is_read) markAsRead(n.id)
                if (n.link) navigate(n.link)
              }}
              className={`w-full text-right ${
                n.is_read
                  ? 'bg-white dark:bg-gray-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
              } rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{TYPE_ICONS[n.type] || '📬'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-800 dark:text-white">{n.title}</p>
                    {!n.is_read && <Badge variant="info" size="sm">جديد</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                </div>
                {n.is_read && (
                  <Check size={16} className="text-green-500 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
