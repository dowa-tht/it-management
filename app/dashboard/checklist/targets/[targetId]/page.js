'use server'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTargetAssetHistory } from '@/app/actions/target'
import { formatDate, formatDateTime } from '@/lib/dateFormat'

/**
 * Asset History page – shows timeline of checklist documents for a target (QR asset).
 * URL: /dashboard/checklist/targets/[targetId]
 *
 * 1. Load target record from `checklist_targets` using the `targetId` param.
 * 2. Load all `checklist_docs` where `target_id` matches the target.
 * 3. For each doc, load its items (`checklist_items`) to display a summary.
 * 4. Show a simple timeline (date, status) and a gallery of photos (if any) from the item snapshots.
 */
export default async function TargetAssetHistoryPage({ params }) {
  const resolvedParams = await params
  const result = await getTargetAssetHistory(resolvedParams?.targetId)

  if (result.error?.includes('ไม่มีสิทธิ์') || result.error?.includes('เข้าสู่ระบบ')) {
    redirect('/dashboard/checklist')
  }

  if (!result.success && !result.target) {
    return <div className="p-8 text-center text-red-600">{result.error || 'ไม่พบข้อมูลอุปกรณ์'}</div>
  }

  const target = result.target
  const docs = result.docs || []

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Asset History – {target.name || target.target_code}</h1>
        <div className="mb-6">
          <p className="text-sm text-gray-600"><strong>รหัส:</strong> {target.target_code}</p>
          <p className="text-sm text-gray-600"><strong>ประเภท:</strong> {target.target_type}</p>
          <p className="text-sm text-gray-600"><strong>QR:</strong> {target.qr_value}</p>
        </div>
        {docs.length === 0 ? (
          <p className="text-gray-500">ยังไม่มีประวัติการตรวจสอบสำหรับอุปกรณ์นี้</p>
        ) : (
          <div className="space-y-4">
            {docs.map((doc) => (
              <div key={doc.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{doc.doc_no || `Document ${doc.id}`}</span>
                  <span className="text-sm text-gray-500">{formatDate(doc.period_date)}</span>
                </div>
                <p className="text-sm mb-1">สถานะ: {doc.status || 'N/A'}</p>
                <p className="text-sm mb-3 text-gray-500">ตรวจเมื่อ: {formatDateTime(doc.checked_at || doc.created_at)}</p>
                <div className="grid grid-cols-3 gap-2">
                  {doc.photos.map((photo, idx) => (
                      <img
                        key={`${photo.item_id}-${idx}`}
                        src={photo.url}
                        alt={photo.item_label}
                        className="object-cover w-full h-24 rounded"
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Link href="/dashboard/checklist" className="text-blue-600 hover:underline">← กลับไปยังรายการ Checklist</Link>
        </div>
      </div>
    </div>
  )
}
