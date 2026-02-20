import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Branch, Service } from '@/types'

interface TickerBannerProps { branch: Branch | null }

export function TickerBanner({ branch }: TickerBannerProps) {
  const [services, setServices] = useState<Service[]>([])

  useEffect(() => {
    supabase.from('services').select('name').eq('is_active', true).limit(10)
      .then(({ data }) => setServices(data || []))
  }, [])

  if (!branch) return null

  const isOpen = branch.is_open
  const message = branch.banner_message

  let tickerText = ''
  if (message) {
    tickerText = message
  } else if (!isOpen) {
    tickerText = `🔴 المحل مغلق حالياً | نفتح ${branch.opening_time}`
  } else if (services.length > 0) {
    tickerText = services.map(s => `⚡ ${s.name}`).join('   |   ')
  } else {
    tickerText = '🟢 المحل مفتوح | أهلاً وسهلاً بكم'
  }

  const bgColor = !isOpen ? 'bg-red-600' : branch.banner_color === 'green' ? 'bg-green-600' : 'bg-blue-600'

  return (
    <div className={`${bgColor} text-white text-xs py-2 overflow-hidden relative`}>
      <div className="flex items-center gap-2 px-3">
        <span className="shrink-0 font-medium">
          {isOpen ? '🟢 مفتوح' : '🔴 مغلق'}
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="animate-ticker whitespace-nowrap">
            {tickerText}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100vw); }
        }
        .animate-ticker {
          display: inline-block;
          animation: ticker 20s linear infinite;
        }
      `}</style>
    </div>
  )
}
