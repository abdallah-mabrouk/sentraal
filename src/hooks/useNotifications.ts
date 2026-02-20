import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { Notification } from '@/types'

export function useNotifications() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const loadNotifications = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) {
      setNotifications(data)
      setUnreadCount(data.filter(n => !n.is_read).length)
    }
  }

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    if (!user) return
    await supabase.from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  useEffect(() => {
    if (!user) return
    loadNotifications()

    // Realtime
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const newNotif = payload.new as Notification
        setNotifications(prev => [newNotif, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  return { notifications, unreadCount, markAsRead, markAllAsRead, loadNotifications }
}
