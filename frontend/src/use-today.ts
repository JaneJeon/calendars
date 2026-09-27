import { useEffect, useState } from 'react'
import { millisecondsUntilNextLaDate, todayDateKey } from './calendar'

export function useToday(initialNow: Date): string {
  const [today, setToday] = useState(() => todayDateKey(initialNow))

  useEffect(() => {
    let timer: number
    const refresh = () => {
      const now = new Date()
      setToday(todayDateKey(now))
      window.clearTimeout(timer)
      timer = window.setTimeout(refresh, millisecondsUntilNextLaDate(now) + 25)
    }
    const onVisible = () => {
      if (!document.hidden) refresh()
    }
    refresh()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return today
}
