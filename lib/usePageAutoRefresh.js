'use client'

import { useEffect, useRef } from 'react'

export function usePageAutoRefresh({
  enabled = true,
  onRefresh,
  intervalMs = 0,
  minIntervalMs = 5000,
  refreshOnFocus = true,
  refreshOnVisible = true,
}) {
  const refreshRef = useRef(onRefresh)
  const runningRef = useRef(false)
  const lastRunAtRef = useRef(0)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined

    const runRefresh = async (reason) => {
      const now = Date.now()
      if (runningRef.current) return
      if (minIntervalMs > 0 && now - lastRunAtRef.current < minIntervalMs) return
      if (reason === 'interval' && typeof document !== 'undefined' && document.visibilityState !== 'visible') return

      runningRef.current = true
      try {
        await refreshRef.current?.(reason)
      } finally {
        lastRunAtRef.current = Date.now()
        runningRef.current = false
      }
    }

    const handleFocus = () => {
      void runRefresh('focus')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runRefresh('visible')
      }
    }

    let timerId = null

    if (refreshOnFocus) {
      window.addEventListener('focus', handleFocus)
    }

    if (refreshOnVisible) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    if (intervalMs > 0) {
      timerId = window.setInterval(() => {
        void runRefresh('interval')
      }, intervalMs)
    }

    return () => {
      if (refreshOnFocus) {
        window.removeEventListener('focus', handleFocus)
      }
      if (refreshOnVisible) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (timerId) {
        window.clearInterval(timerId)
      }
    }
  }, [enabled, intervalMs, minIntervalMs, refreshOnFocus, refreshOnVisible])
}
