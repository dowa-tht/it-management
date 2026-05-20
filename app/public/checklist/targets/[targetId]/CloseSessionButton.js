'use client'

import { useRouter } from 'next/navigation'

export function CloseSessionButton({ targetId, label = "ปิดหน้าจอ / ปิดเซสชัน" }) {
  const router = useRouter()

  const handleClose = () => {
    // Clear session cookie
    document.cookie = `qr_session_${targetId}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`

    // Attempt to close window (works mostly on mobile apps/PWA or tabs opened by JS)
    window.close()

    // Fallback if window.close doesn't work (which is common in modern browsers)
    router.push('/')
  }

  return (
    <button
      onClick={handleClose}
      className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-3 px-8 rounded-full flex items-center gap-2 transition-transform hover:scale-105"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      {label}
    </button>
  )
}
