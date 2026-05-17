import { getTargetPointHistoryPublic } from '@/app/actions/public-checklist'
import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'Point History | Public Inspection',
  description: 'Public view of point inspection history',
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    
    const day = String(d.getDate()).padStart(2, '0')
    const months = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ]
    const month = months[d.getMonth()]
    const year = d.getFullYear() + 543 // พ.ศ.
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    
    return `${day} ${month} ${year} ${hours}:${minutes}`
  } catch (e) {
    return dateStr
  }
}

export default async function PublicPointHistoryPage({ params }) {
  const { targetId, pointId } = await params

  const result = await getTargetPointHistoryPublic(targetId, pointId)

  if (!result.success) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <div className="bg-neutral-800/80 backdrop-blur-xl border border-neutral-700 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
          <h1 className="text-xl font-bold text-white mb-2">ไม่พบข้อมูล</h1>
          <p className="text-neutral-400 mb-8">{result.error || 'เกิดข้อผิดพลาดในการโหลดข้อมูล'}</p>
        </div>
      </div>
    )
  }

  const { target, history } = result

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans pb-20">
      {/* Header Card */}
      <div className="relative pt-12 pb-8 px-6 bg-gradient-to-b from-neutral-800 to-neutral-950 border-b border-neutral-800">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-neutral-900/0 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-medium text-neutral-300 mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            Public Record
          </div>

          <h1 className="text-3xl font-bold text-white tracking-tight mb-1">{target.name}</h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
            <div className="flex items-center gap-1.5 text-sm text-neutral-400">
              <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              {target.target_code}
            </div>
            {target.location && (
              <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {target.location}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-neutral-400">
                <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Point {pointId}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h2 className="text-lg font-semibold text-white mb-8 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ประวัติการตรวจสอบ
        </h2>

        {history.length === 0 ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-neutral-400">ยังไม่มีประวัติการตรวจสอบสำหรับจุดนี้</p>
          </div>
        ) : (
          <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-neutral-800 before:to-transparent">
            {history.map((record, index) => {
              const hasGps = !!(record.meta && record.meta.latitude && record.meta.longitude)

              return (
                <div key={`${record.doc_id}-${index}`} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-neutral-950 bg-neutral-800 group-hover:bg-indigo-600 group-hover:border-indigo-900/30 text-neutral-400 group-hover:text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm transition-colors duration-300 z-10">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>

                  {/* Card */}
                  <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl bg-neutral-900/80 backdrop-blur-sm border border-neutral-800 shadow-sm hover:border-neutral-700 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <time className="text-sm font-medium text-indigo-400">{formatDate(record.checked_at)}</time>
                      <span className="px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase rounded bg-neutral-800 text-neutral-400">
                        {record.doc_no || 'N/A'}
                      </span>
                    </div>

                    {record.photo_url ? (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-neutral-950 mb-3 border border-neutral-800/50 group-hover:border-neutral-700/50 transition-colors">
                        <Image
                          src={record.photo_url}
                          alt="Inspection point"
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          unoptimized // Since it might be external Supabase storage URL
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video rounded-lg bg-neutral-800/50 flex items-center justify-center mb-3 border border-neutral-800/50">
                        <span className="text-xs text-neutral-500">No Photo</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800/60">
                      <div className="flex items-center gap-1.5">
                        {hasGps ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            GPS Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 bg-neutral-800 px-2 py-1 rounded">
                            Standard
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-500">
                         {record.status}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
