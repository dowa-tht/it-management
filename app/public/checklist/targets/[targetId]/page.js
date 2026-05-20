import { cookies } from 'next/headers'
import Link from 'next/link'
import { getTargetHistoryPublic } from '@/app/actions/public-checklist'
import { CalendarView } from './CalendarView'
import { CloseSessionButton } from './CloseSessionButton'

export const metadata = {
  title: 'Target History | Public',
  description: 'Public view of target checklist history',
}

export default async function PublicTargetLandingPage({ params }) {
  const { targetId } = await params

  // 1. Security Check: 30-Minute Session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(`qr_session_${targetId}`)

  if (!sessionCookie || sessionCookie.value !== 'active') {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-800/80 backdrop-blur-xl border border-neutral-700 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Session Expired</h1>
          <p className="text-neutral-400 mb-8">เซสชันหมดอายุ เพื่อความปลอดภัยของข้อมูล กรุณาสแกน QR Code ที่ตัวอุปกรณ์ใหม่อีกครั้ง</p>
          <Link
            href="/"
            className="block w-full py-3 px-4 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
          >
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    )
  }

  // 2. Fetch Data
  const result = await getTargetHistoryPublic(targetId)

  if (!result.success) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="bg-red-500/10 p-8 rounded-3xl text-center max-w-sm w-full border border-red-500/20">
          <h1 className="text-red-500 font-bold mb-2">Error</h1>
          <p className="text-red-400/80 mb-6">{result.error}</p>
          <CloseSessionButton targetId={targetId} label="ปิดหน้าจอ" />
        </div>
      </div>
    )
  }

  const { target, templates, history } = result

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-6 md:p-8 font-sans pb-24">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 p-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{target.name}</h1>
                <p className="text-blue-100 font-mono mt-1">{target.target_code}</p>
              </div>
              <span className="bg-blue-500/50 px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                {target.target_type}
              </span>
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500 mb-1">สถานที่ตั้ง (Location)</p>
              <p className="font-semibold text-slate-800">{target.location || '-'}</p>
            </div>
            {target.metadata && Object.keys(target.metadata).length > 0 && (
              <div>
                <p className="text-slate-500 mb-1">ข้อมูลเพิ่มเติม</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(target.metadata).map(([k, v]) => (
                    <span key={k} className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs border border-slate-200">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Calendar Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            ประวัติการตรวจสอบ (Inspection History)
          </h2>

          <CalendarView templates={templates} history={history} />

          <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> ปกติ (OK)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500"></span> ผิดปกติ (NG)</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> รอตรวจสอบ/รอดำเนินการ</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-200"></span> ไม่มีข้อมูล</div>
          </div>
        </div>

      </div>

      {/* Floating Action Button for Close */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto shadow-xl rounded-full">
          <CloseSessionButton targetId={targetId} />
        </div>
      </div>
    </div>
  )
}
