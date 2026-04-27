'use client'
import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDate } from '@/lib/dateFormat'
import { getNextNo } from '@/lib/noSeries'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'

function ChecklistListForm() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [userEmail, setUserEmail] = useState(null)
  const [filters, setFilters] = useState({
    freq_type: '',
    status: '',
    date_from: '',
    date_to: '',
    only_ng: false
  })
  
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserEmail(data.session?.user?.email))
    
    // Check if redirected from dashboard with NG filter
    if (searchParams.get('filter') === 'ng') {
      setFilters(prev => ({ ...prev, only_ng: true }))
    }
    
    fetchDocs()
  }, [searchParams])

  // Trigger fetch when filters change (debounced or manual would be better, but let's do it on change for now)
  useEffect(() => {
    fetchDocs()
  }, [filters.freq_type, filters.status, filters.date_from, filters.date_to, filters.only_ng])

  const fetchDocs = async () => {
    setLoading(true)
    let query = supabase
      .from('checklist_docs')
      .select('*')
    
    if (filters.freq_type) query = query.eq('freq_type', filters.freq_type)
    if (filters.status) query = query.eq('status', filters.status)
    if (filters.date_from) query = query.gte('period_date', filters.date_from)
    if (filters.date_to) query = query.lte('period_date', filters.date_to)

    const { data, error } = await query.order('period_date', { ascending: false }).order('created_at', { ascending: false })
    
    if (!error && data) {
      // Fetch NG counts for these docs
      const docIds = data.map(d => d.id)
      if (docIds.length > 0) {
        const { data: ngData } = await supabase
          .from('checklist_items')
          .select('doc_id')
          .eq('status', 'NG')
          .in('doc_id', docIds)
        
        const counts = {}
        ngData?.forEach(item => {
          counts[item.doc_id] = (counts[item.doc_id] || 0) + 1
        })
        
        let processedDocs = data.map(d => ({ ...d, ng_count: counts[d.id] || 0 }))
        
        // Filter by only_ng if enabled
        if (filters.only_ng) {
          processedDocs = processedDocs.filter(d => d.ng_count > 0)
        }
        
        setDocs(processedDocs)
      } else {
        setDocs([])
      }
    }
    setLoading(false)
  }

  const handleCreate = async (freqType) => {
    setCreating(true)
    const today = new Date().toISOString().split('T')[0]

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

    await supabase.from('checklist_logs').insert([{
      doc_id: newDoc.id,
      action: `สร้างเอกสาร (${freqType})`,
      user_email: userEmail
    }])

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

      {/* Filters Bar */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6 }}>ช่วงวันที่</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="date" value={filters.date_from} onChange={e => setFilters({...filters, date_from: e.target.value})} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, flex: 1 }} />
            <span style={{ color: '#9ca3af' }}>-</span>
            <input type="date" value={filters.date_to} onChange={e => setFilters({...filters, date_to: e.target.value})} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, flex: 1 }} />
          </div>
        </div>
        
        <div>
          <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6 }}>ประเภท</label>
          <select value={filters.freq_type} onChange={e => setFilters({...filters, freq_type: e.target.value})} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <option value="">ทั้งหมด</option>
            {Object.keys(CHECKLIST_TEMPLATES).map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 6 }}>สถานะ</label>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})} style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
            <option value="">ทั้งหมด</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div style={{ paddingBottom: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: filters.only_ng ? '#dc2626' : '#374151', fontWeight: filters.only_ng ? 600 : 400 }}>
            <input type="checkbox" checked={filters.only_ng} onChange={e => setFilters({...filters, only_ng: e.target.checked})} style={{ width: 16, height: 16 }} />
            แสดงเฉพาะที่มีปัญหา (NG)
          </label>
        </div>

        <button onClick={() => setFilters({ freq_type: '', status: '', date_from: '', date_to: '', only_ng: false })} style={{ padding: '8px 16px', background: 'none', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, color: '#6b7280', cursor: 'pointer' }}>
          ล้างฟิลเตอร์
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
          <span>ประวัติเอกสาร ({docs.length} รายการ)</span>
          {filters.only_ng && <span style={{ color: '#dc2626', fontSize: 11 }}>กำลังกรอง: พบปัญหา (NG)</span>}
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>กำลังโหลด...</div>
        ) : docs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            ไม่พบเอกสารตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['เลขที่เอกสาร', 'ประเภท', 'วันที่ตรวจสอบ', 'สถานะ', 'ปัญหา (NG)', 'ผู้สร้าง', 'วันที่สร้าง'].map(h => (
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
                    <td style={{ padding: '12px 16px' }}>
                      {doc.ng_count > 0 ? (
                        <span style={{ background: '#fee2e2', color: '#dc2626', padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #fca5a5' }}>
                          ⚠️ {doc.ng_count} NG
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: 11 }}>-</span>
                      )}
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

export default function ChecklistListPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดหน้า Checklist...</div>}>
      <ChecklistListForm />
    </Suspense>
  )
}