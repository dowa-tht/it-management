import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTargetPointHistory } from '@/app/actions/target'
import { formatDate, formatDateTime } from '@/lib/dateFormat'

export default async function PointHistoryPage({ params }) {
  const resolvedParams = await params
  const { targetId, pointId } = resolvedParams
  
  const result = await getTargetPointHistory(targetId, pointId)

  if (result.error?.includes('ไม่มีสิทธิ์') || result.error?.includes('เข้าสู่ระบบ')) {
    redirect('/dashboard/checklist')
  }

  if (!result.success) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg inline-block">
          {result.error || 'ไม่พบข้อมูลประวัติ'}
        </div>
        <div className="mt-4">
          <Link href={`/dashboard/checklist/targets/${targetId}`} className="text-blue-600 hover:underline">
            ← กลับไปหน้าประวัติอุปกรณ์
          </Link>
        </div>
      </div>
    )
  }

  const { target, history } = result

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/dashboard/checklist/targets/${targetId}`} className="text-slate-400 hover:text-blue-600 transition-colors">
                  {target.name || target.target_code}
                </Link>
                <span className="text-slate-300">/</span>
                <h1 className="text-xl font-bold text-slate-900">Point History: {pointId}</h1>
              </div>
              <p className="text-sm text-slate-500">ประวัติการตรวจสอบรายจุดตรวจ (Evidence Timeline)</p>
            </div>
            <Link 
              href={`/dashboard/checklist/targets/${targetId}`}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
            >
              ← Back to Asset
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Target Code</p>
              <p className="text-sm font-semibold text-slate-700">{target.target_code}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Type</p>
              <p className="text-sm font-semibold text-slate-700">{target.target_type}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Point Identity</p>
              <p className="text-sm font-semibold text-blue-600">{pointId}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Total Captures</p>
              <p className="text-sm font-semibold text-slate-700">{history.length} Records</p>
            </div>
          </div>
        </div>

        {/* History Timeline */}
        {history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-20 text-center">
            <div className="text-4xl mb-4">📸</div>
            <p className="text-slate-500 font-medium">ยังไม่พบประวัติการถ่ายภาพสำหรับจุดนี้</p>
          </div>
        ) : (
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
            {history.map((record, idx) => (
              <div key={`${record.doc_id}-${idx}`} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                {/* Icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <span className="text-xs font-bold">{history.length - idx}</span>
                </div>
                
                {/* Content Card */}
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between space-x-2 mb-3">
                    <div className="font-bold text-slate-900">{formatDate(record.period_date)}</div>
                    <time className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{record.doc_no}</time>
                  </div>
                  
                  <div className="aspect-video w-full overflow-hidden rounded-xl mb-4 border border-slate-100 bg-slate-50">
                    <img 
                      src={record.photo_url} 
                      alt={`Point ${pointId}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Captured At:</span>
                      <span className="font-medium text-slate-700">{formatDateTime(record.checked_at || record.meta?.captured_at)}</span>
                    </div>
                    {record.meta?.lat && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">GPS Status:</span>
                        <a 
                          href={`https://www.google.com/maps?q=${record.meta.lat},${record.meta.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 font-medium hover:underline flex items-center gap-1"
                        >
                          📍 {record.meta.lat.toFixed(6)}, {record.meta.lng.toFixed(6)}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Data Source:</span>
                      <span className={`px-2 py-0.5 rounded-full ${record.source === 'identity' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {record.source === 'identity' ? 'Verified Point' : 'Legacy Map'}
                      </span>
                    </div>
                    {record.meta?.point_label && (
                      <div className="text-xs text-slate-400 mt-2 italic border-t border-slate-50 pt-2">
                        Label: {record.meta.point_label}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Link 
                      href={`/dashboard/checklist/${record.doc_id}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      View Source Document →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .group.is-active:before {
          content: '';
          position: absolute;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          left: 50%;
          top: 0;
          transform: translateX(-50%);
          z-index: 10;
          border: 3px solid #fff;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      `}} />
    </div>
  )
}
