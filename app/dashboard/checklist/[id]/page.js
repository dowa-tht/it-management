'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateTime } from '@/lib/dateFormat'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'

// ===== Instruction Dialog =====
function InstructionDialog({ item, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{item.category}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{item.item_label}</div>
          </div>
          <button onClick={onCancel} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
        </div>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          <strong>📝 วิธีการตรวจสอบ:</strong><br />
          {item.instruction || 'ไม่มีคำแนะนำเพิ่มเติมสำหรับหัวข้อนี้'}
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button onClick={onCancel} style={{ padding: '8px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>ตกลง</button>
        </div>
      </div>
    </div>
  )
}

// ===== NG Dialog =====
function NgDialog({ item, onConfirm, onCancel }) {
  const [notes, setNotes] = useState(item.notes || '')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>⚠️ ระบุปัญหา (NG)</div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>หัวข้อ: {item.item_label}</div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="กรุณาระบุรายละเอียดหรืออาการที่พบ..."
          rows={4}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
          <button onClick={() => onConfirm(notes)} disabled={!notes.trim()} style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: notes.trim() ? '#dc2626' : '#fca5a5', color: '#fff', cursor: notes.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>บันทึก NG</button>
        </div>
      </div>
    </div>
  )
}

export default function ChecklistDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [logs, setLogs] = useState([])
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeNgItem, setActiveNgItem] = useState(null)
  const [activeInstruction, setActiveInstruction] = useState(null)
  const [templates, setTemplates] = useState([]) // Master List from DB
  const [userEmail, setUserEmail] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user?.email)
      if (data.session?.user) {
        supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single().then(({ data: profile }) => {
          setCurrentUser(profile)
        })
      }
    })
    fetchData()
  }, [id])

  const isVisitor = currentUser?.role === 'visitor'

  const fetchData = async () => {
    setLoading(true)
    const [{ data: docData }, { data: itemsData }, { data: logsData }, { data: templateData }] = await Promise.all([
      supabase.from('checklist_docs').select('*').eq('id', id).single(),
      supabase.from('checklist_items').select('*').eq('doc_id', id).order('created_at', { ascending: true }),
      supabase.from('checklist_logs').select('*').eq('doc_id', id).order('created_at', { ascending: false }),
      supabase.from('checklist_templates').select('*') // Get all templates to map categories/instructions
    ])

    if (docData) setDoc(docData)
    if (itemsData) setItems(itemsData)
    if (logsData) setLogs(logsData)
    if (templateData) setTemplates(templateData)

    if (itemsData && itemsData.length > 0) {
      const itemIds = itemsData.map(i => i.id)
      const { data: incs } = await supabase.from('incidents').select('id, ref_id, case_number, status').eq('ref_type', 'checklist').in('ref_id', itemIds)
      if (incs) setIncidents(incs)
    }

    setLoading(false)
  }

  const handleStatusClick = (index, newStatus) => {
    if (doc.status === 'Closed' || isVisitor) return

    const newItems = [...items]
    if (newStatus === 'NG') {
      setActiveNgItem({ ...newItems[index], index })
    } else {
      newItems[index].status = 'OK'
      newItems[index].notes = ''
      setItems(newItems)
    }
  }

  const handleNgConfirm = (notes) => {
    const newItems = [...items]
    newItems[activeNgItem.index].status = 'NG'
    newItems[activeNgItem.index].notes = notes
    setItems(newItems)
    setActiveNgItem(null)
  }

  const handleSaveAll = async (isClosing = false) => {
    setSaving(true)
    
    // อัปเดต Items (Batch Upsert เพื่อลดจำนวน API Request)
    const itemsToUpdate = items
      .filter(item => item.status)
      .map(item => ({
        id: item.id,
        doc_id: id,
        item_key: item.item_key,
        item_label: item.item_label,
        status: item.status,
        notes: item.notes || ''
      }))

    if (itemsToUpdate.length > 0) {
      await supabase.from('checklist_items').upsert(itemsToUpdate)
    }

    if (isClosing) {
      await supabase.from('checklist_docs').update({ status: 'Closed' }).eq('id', id)
      await supabase.from('checklist_logs').insert([{
        doc_id: id, action: 'ปิดเอกสาร (Closed)', user_email: userEmail
      }])
    } else {
      await supabase.from('checklist_docs').update({ updated_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('checklist_logs').insert([{
        doc_id: id, action: 'บันทึกความคืบหน้า', user_email: userEmail
      }])
    }

    alert(isClosing ? '✅ ปิดเอกสารเรียบร้อย' : '💾 บันทึกความคืบหน้าสำเร็จ')
    await fetchData()
    setSaving(false)
  }

  const handleReopen = async () => {
    const reason = prompt("ระบุเหตุผลที่ต้องการเปิดเอกสารใหม่ (Reopen):")
    if (!reason) return

    setSaving(true)
    await supabase.from('checklist_docs').update({ status: 'Open' }).eq('id', id)
    await supabase.from('checklist_logs').insert([{
      doc_id: id, action: `เปิดเอกสารใหม่ (Reopen) - เหตุผล: ${reason}`, user_email: userEmail
    }])
    alert('เปิดเอกสารใหม่สำเร็จ')
    await fetchData()
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลด...</div>
  if (!doc) return <div style={{ padding: 40, textAlign: 'center' }}>ไม่พบเอกสารนี้</div>

  const doneCount = items.filter(i => i.status).length
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0
  const isClosed = doc.status === 'Closed'

  return (
    <div style={{ padding: 24, paddingBottom: 100, maxWidth: 1000, margin: '0 auto' }}>
      {activeNgItem && <NgDialog item={activeNgItem} onConfirm={handleNgConfirm} onCancel={() => setActiveNgItem(null)} />}
      {activeInstruction && <InstructionDialog item={activeInstruction} onCancel={() => setActiveInstruction(null)} />}

      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/checklist" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
          ← กลับไปหน้ารวม
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>{doc.doc_no}</h1>
              <span style={{ background: isClosed ? '#d1fae5' : '#dbeafe', color: isClosed ? '#065f46' : '#1e40af', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {doc.status}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              ประเภท: <strong>{doc.freq_type}</strong> | ประจำวันที่: <strong>{formatDate(doc.period_date, false)}</strong>
            </div>
          </div>
          
          <div style={{ textAlign: 'right', background: '#f9fafb', padding: '12px 20px', borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: progress === 100 ? '#059669' : '#1d4ed8' }}>{progress}%</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>ทำแล้ว {doneCount}/{items.length}</div>
          </div>
        </div>
      </div>

      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ background: progress === 100 ? '#059669' : '#1d4ed8', height: '100%', width: `${progress}%`, borderRadius: 999, transition: 'width 0.3s' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          รายการตรวจสอบ (Checklist Items)
        </div>
        
        {items.map((item, index) => {
          // Find category and instruction from Master List (templates state)
          const dbTemplate = templates.find(t => t.item_key === item.item_key || t.item_label === item.item_label)
          
          // Fallback to static if not found in DB yet
          const staticTemplate = CHECKLIST_TEMPLATES[doc.freq_type]?.find(t => t.key === item.item_key)
          
          const category = dbTemplate?.category || staticTemplate?.category || 'General'
          const instruction = dbTemplate?.instruction || staticTemplate?.instruction

          return (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', padding: '16px', flexWrap: 'wrap', gap: 10,
              borderBottom: '1px solid #f3f4f6', background: item.status === 'OK' ? '#f0fdf4' : item.status === 'NG' ? '#fef2f2' : '#fff',
              transition: 'background 0.2s', opacity: isClosed ? 0.7 : 1
            }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600, marginBottom: 4 }}>{category}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 14, color: '#111827', fontWeight: 500 }}>{item.item_label}</div>
                  <button 
                    onClick={() => setActiveInstruction({ ...item, category, instruction })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4, display: 'flex', alignItems: 'center', opacity: 0.7 }}
                    title="วิธีตรวจสอบ"
                  >
                    📄
                  </button>
                </div>
                {item.status === 'NG' && item.notes && (() => {
                  const relatedInc = incidents.find(inc => inc.ref_id === item.id)
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6, background: '#fee2e2', padding: '6px 10px', borderRadius: 6, display: 'inline-block' }}>
                        <strong>สาเหตุ:</strong> {item.notes}
                      </div>
                      {relatedInc ? (
                        <Link 
                          href={`/dashboard/incidents/${relatedInc.id}`}
                          style={{
                            padding: '6px 12px', background: '#fef3c7', color: '#92400e', borderRadius: 6, border: '1px solid #fcd34d',
                            fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex',
                            alignItems: 'center', gap: 4, marginTop: 8
                          }}
                        >
                          📌 เปิดเคสแล้ว: {relatedInc.case_number} ({relatedInc.status})
                        </Link>
                      ) : !isVisitor && (
                        <Link 
                          href={`/dashboard/incidents/new?ref_type=checklist&ref_id=${item.id}&doc_no=${doc.doc_no}`}
                          style={{
                            padding: '6px 12px', background: '#dc2626', color: '#fff', borderRadius: 6,
                            fontSize: 11, fontWeight: 600, textDecoration: 'none', display: 'inline-flex',
                            alignItems: 'center', gap: 4, marginTop: 8, boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
                          }}
                        >
                          🚨 เปิด Incident Case
                        </Link>
                      )}
                    </div>
                  )
                })()}
              </div>
              
              <div style={{ display: 'flex', gap: 6 }}>
                <button 
                  onClick={() => handleStatusClick(index, 'OK')}
                  disabled={isClosed || isVisitor}
                  style={{ 
                    padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (isClosed || isVisitor) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    border: item.status === 'OK' ? 'none' : '1px solid #d1d5db',
                    background: item.status === 'OK' ? '#059669' : '#fff',
                    color: item.status === 'OK' ? '#fff' : '#6b7280'
                  }}>
                  OK
                </button>
                <button 
                  onClick={() => handleStatusClick(index, 'NG')}
                  disabled={isClosed || isVisitor}
                  style={{ 
                    padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: (isClosed || isVisitor) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    border: item.status === 'NG' ? 'none' : '1px solid #d1d5db',
                    background: item.status === 'NG' ? '#dc2626' : '#fff',
                    color: item.status === 'NG' ? '#fff' : '#6b7280'
                  }}>
                  NG
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Audit Logs */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
          ประวัติการดำเนินการ (Audit Logs)
        </div>
        <div style={{ padding: 16 }}>
          {logs.length === 0 ? (
            <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>ไม่มีประวัติ</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                  <div style={{ color: '#6b7280', width: 140, flexShrink: 0 }}>{formatDateTime(log.created_at)}</div>
                  <div style={{ flex: 1, color: '#111827' }}>
                    <strong>{log.action}</strong>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>โดย {log.user_email || 'System'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Save Button */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 24px',
        background: '#fff', borderTop: '1px solid #e5e7eb', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex', justifyContent: 'flex-end', zIndex: 100
      }}>
        {!isVisitor && (
          <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'flex-end', gap: 12, paddingLeft: 220 }}>
            {isClosed ? (
              <button 
                onClick={handleReopen} 
                disabled={saving}
                style={{ 
                  padding: '10px 24px', border: '1px solid #dc2626', borderRadius: 8, fontSize: 14, fontWeight: 600, 
                  background: '#fff', color: '#dc2626', cursor: saving ? 'not-allowed' : 'pointer', 
                  fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8
                }}>
                🔓 Reopen (เปิดเอกสารใหม่)
              </button>
            ) : (
              <>
                <button 
                  onClick={() => handleSaveAll(false)} 
                  disabled={saving || loading}
                  style={{ 
                    padding: '10px 24px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontWeight: 600, 
                    background: '#fff', color: '#374151', cursor: saving ? 'not-allowed' : 'pointer', 
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                  💾 Save Draft (บันทึก)
                </button>
                <button 
                  onClick={() => {
                    if(confirm('ยืนยันการปิดเอกสาร? จะไม่สามารถแก้ไขได้อีกนอกจากจะกด Reopen')) {
                      handleSaveAll(true)
                    }
                  }} 
                  disabled={saving || loading || progress < 100}
                  style={{ 
                    padding: '10px 24px', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, 
                    background: (progress < 100) ? '#9ca3af' : '#1d4ed8', color: '#fff', cursor: (saving || progress < 100) ? 'not-allowed' : 'pointer', 
                    fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8
                  }}>
                  ✅ Submit & Close (ยืนยันปิดงาน)
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
