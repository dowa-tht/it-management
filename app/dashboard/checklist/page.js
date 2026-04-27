'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/dateFormat'
import { getNextNo } from '@/lib/noSeries'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'

export default function ChecklistListPage() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [userEmail, setUserEmail] = useState(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user?.email))
    fetchDocs()
  }, [])

  const fetchDocs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('checklist_docs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error) setDocs(data || [])
    setLoading(false)
  }

  const handleCreate = async (freqType) => {
    setCreating(true)
    const today = new Date().toISOString().split('T')[0]

    // ตรวจสอบว่ามีการสร้างสำหรับช่วงเวลานี้ไปแล้วหรือยัง
    const { data: existing } = await supabase
      .from('checklist_docs')
      .select('id, doc_no')
      .eq('freq_type', freqType)
      .eq('period_date', today)
      .maybeSingle()

    if (existing) {
      alert(`มีเอกสาร ${freqType} ของวันนี้อยู่แล้ว (${existing.doc_no}) ระบบจะพาไปยังเอกสารดังกล่าว`)
      router.push(`/dashboard/checklist/${existing.id}`)
      return
    }

    // สร้างเอกสารใหม่
    const noRes = await getNextNo('CHK')
    const docNo = noRes ? noRes.nextNo : `CHK-${Date.now()}`

    const { data: newDoc, error: insertErr } = await supabase
      .from('checklist_docs')
      .insert([{
        doc_no: docNo,
        freq_type: freqType,
        period_date: today,
        status: 'Open',
        created_by: userEmail
      }])
      .select()
      .single()

    if (insertErr) {
      alert(`สร้างเอกสารไม่สำเร็จ: ${insertErr.message}`)
      setCreating(false)
      return
    }

    if (noRes) {
      const { updateLastNo } = await import('@/lib/noSeries')
      await updateLastNo('CHK', docNo)
    }

    // สร้าง Log
    await supabase.from('checklist_logs').insert([{
      doc_id: newDoc.id,
      action: `สร้างเอกสาร (${freqType})`,
      user_email: userEmail
    }])

    // เตรียม Checklist Items
    const items = CHECKLIST_TEMPLATES[freqType] || []
    if (items.length > 0) {
      const inserts = items.map(item => ({
        doc_id: newDoc.id,
        item_key: item.key,
        item_label: item.label,
        status: null,
        notes: ''
      }))
      await supabase.from('checklist_items').insert(inserts)
    }

    router.push(`/dashboard/checklist/${newDoc.id}`)
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>IT Checklist Documents</h1>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowCreate(!showCreate)}
            disabled={creating}
            style={{
              background: '#1d4ed8', color: '#fff', padding: '10px 20px',
              borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
            {creating ? 'กำลังสร้าง...' : '+ สร้างเอกสารใหม่ (New Checklist)'}
          </button>
          
          {showCreate && !creating && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 8,
              background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb',
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden', zIndex: 50, width: 200
            }}>
              {Object.keys(CHECKLIST_TEMPLATES).map(freq => (
                <button
                  key={freq}
                  onClick={() => handleCreate(freq)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                    background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6',
                    fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: 'inherit'
                  }}>
                  {freq} Checklist
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151' }}>
          ประวัติเอกสารทั้งหมด ({docs.length} รายการ)
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>กำลังโหลด...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            ยังไม่มีเอกสารในระบบ
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['เลขที่เอกสาร', 'ประเภท', 'วันที่ตรวจสอบ', 'สถานะ', 'ผู้สร้าง', 'วันที่สร้าง'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#1d4ed8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      <Link href={`/dashboard/checklist/${doc.id}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: 600 }}>
                        {doc.doc_no}
                      </Link>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#374151' }}>{doc.freq_type}</td>
                    <td style={{ padding: '12px 16px', color: '#111827' }}>{formatDate(doc.period_date, false)}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ 
                        background: doc.status === 'Open' ? '#dbeafe' : '#d1fae5', 
                        color: doc.status === 'Open' ? '#1e40af' : '#065f46', 
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 
                      }}>
                        {doc.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{doc.created_by}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(doc.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}