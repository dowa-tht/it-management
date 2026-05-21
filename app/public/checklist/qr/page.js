import { resolveChecklistQrPublic } from '@/app/actions/public-checklist'
import Link from 'next/link'
import { QrRedirectClient } from './QrRedirectClient'

export const metadata = {
  title: 'QR Resolver | Public',
  description: 'Public QR Code resolver for checklist assets',
}

export default async function PublicQrResolverPage({ searchParams }) {
  const params = await searchParams
  const qrValue = params.value

  if (!qrValue) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-800/80 backdrop-blur-xl border border-neutral-700 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">ข้อมูลไม่ถูกต้อง</h1>
          <p className="text-neutral-400 mb-8">ไม่พบรหัส QR ในระบบ หรือรหัสไม่สมบูรณ์</p>
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
          >
            กลับสู่หน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  const result = await resolveChecklistQrPublic(qrValue)

  if (result.success && result.redirectUrl) {
    return <QrRedirectClient targetId={result.targetId} redirectUrl={result.redirectUrl} />
  }

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
      <div className="bg-neutral-800/80 backdrop-blur-xl border border-neutral-700 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">ไม่พบข้อมูล</h1>
        <p className="text-neutral-400 mb-8">{result.error || 'ไม่พบอุปกรณ์ที่ตรงกับรหัส QR นี้ในระบบ'}</p>

        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-neutral-700 text-white font-semibold rounded-xl hover:bg-neutral-600 transition-colors"
          >
            สแกนอีกครั้ง
          </Link>
        </div>
      </div>
    </div>
  )
}
