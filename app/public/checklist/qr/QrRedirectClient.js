'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function QrRedirectClient({ targetId, redirectUrl }) {
  const router = useRouter()

  useEffect(() => {
    document.cookie = `qr_session_${targetId}=active; max-age=1800; path=/; samesite=lax`
    router.replace(redirectUrl)
  }, [targetId, redirectUrl, router])

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="bg-neutral-800/80 backdrop-blur-xl border border-neutral-700 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-2">กำลังเปิดหน้าประวัติอุปกรณ์...</h1>
        <p className="text-neutral-400">โปรดรอสักครู่</p>
      </div>
    </div>
  )
}

