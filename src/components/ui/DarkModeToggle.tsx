import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // تحميل التفضيل المحفوظ
    const saved = localStorage.getItem('darkMode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = saved ? saved === 'true' : prefersDark
    
    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggle = () => {
    const newValue = !isDark
    setIsDark(newValue)
    
    if (newValue) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    localStorage.setItem('darkMode', String(newValue))
  }

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="تبديل الوضع الليلي"
    >
      {isDark ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-gray-600" />
      )}
    </button>
  )
}
