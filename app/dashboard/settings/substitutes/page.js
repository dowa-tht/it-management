'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateFormat'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'

export default function SubstitutesPage() {
  const [mySubs, setMySubs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [form, setForm] = useState({
    substitute_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  })

  useEffect(() => {
    init()
    fetchGuide()
  }, [])

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'substitutes_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### 👤 คู่มือการตั้งค่าคนแทน (Absence & Substitution Guide)
เพื่อไม่ให้งานสะดุดในช่วงที่คุณไม่อยู่ ระบบมีระบบจัดการคนแทนอัตโนมัติ

---
#### **1. การตั้งค่าไม่อยู่**
- เลือกวันที่เริ่มต้นและสิ้นสุด
- เลือกคนแทน (Substitute) จากรายชื่อ (ระบบจะแนะนำคนที่มี Role เดียวกัน)
- ระบุเหตุผลเพื่อให้ Admin หรือผู้เกี่ยวข้องทราบ

---
#### **2. ผลของการตั้งค่า**
- เมื่อมีการส่งเอกสารมาให้คุณอนุมัติในช่วงเวลาดังกล่าว ระบบจะส่ง Notification ไปหา **คนแทน** ของคุณด้วย
- คนแทนสามารถลงนามได้โดยใช้ PIN ของตนเอง และระบบจะบันทึกว่า "แทนคุณ..."
- หากคุณกลับมาทำงานก่อนกำหนด สามารถกด **[ปิด]** สถานะในหน้านี้ได้ทันที`)
    }
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    await supabase.from('system_settings').upsert({ key: 'substitutes_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
    setEditingGuide(false)
    setSaving(false)
  }

  const init = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const userId = session.user.id
    setCurrentUser(userId)

    const [subsRes, usersRes] = await Promise.all([
      supabase.from('approval_substitutes').select('*').eq('primary_approver_id', userId).order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('id, full_name, role').in('role', ['admin', 'it_staff', 'approver']).eq('is_active', true)
    ])

    if (subsRes.data) setMySubs(subsRes.data)
    if (usersRes.data) setUsers(usersRes.data)
    setLoading(false)
  }

  const handleAddSub = async (e) => {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    const { error } = await supabase
      .from('approval_substitutes')
      .insert({
        primary_approver_id: currentUser,
        substitute_id: form.substitute_id,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
        is_active: true
      })

    if (error) {
      setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: 'ตั้งค่าการไม่อยู่สำเร็จ!', type: 'success' })
      setShowModal(false)
      init()
    }
  }

  const toggleActive = async (id, currentStatus) => {
    const { error } = await supabase
      .from('approval_substitutes')
      .update({ is_active: !currentStatus })
      .eq('id', id)
    
    if (!error) init()
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div className="substitutes-container" style={{ padding: 'var(--page-padding, 24px)', maxWidth: 900, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .header-flex { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .header-button { width: 100% !important; }
          .table-wrapper { overflow-x: auto !important; margin: 0 -12px !important; }
          .substitutes-table { min-width: 700px !important; }
          .modal-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
          .modal-content { padding: 20px !important; width: 95% !important; }
          .modal-actions { flex-direction: column !important; }
          .modal-actions button { width: 100% !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(13, 148, 136, 0.3)' }}>
              👤
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              My Absence / Substitution
              <button className="no-print" onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#f0fdfa', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>ตั้งค่าช่วงเวลาที่คุณไม่อยู่เพื่อให้ระบบจัดการผู้อนุมัติแทนโดยอัตโนมัติ</p>
        </div>
        <div className="action-dock no-print" style={{ display: 'flex', gap: 6, padding: '6px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            ➕ แจ้งไม่อยู่ / ตั้งคนแทน
          </button>
        </div>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #0d9488, #2dd4bf)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>📖</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>Absence & Substitution Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการจัดการคนทำงานแทน</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'admin' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '14px 36px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' }}>บันทึกคู่มือ</button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #0d9488` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section.trim().split('\n').map((line, lIdx) => {
                          if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                          if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                          return <p key={lIdx} style={{ margin: '0 0 10px 0' }}>{line.includes('**') ? line.split('**').map((p,i)=>i%2===1?<strong key={i} style={{color:'#1e3a8a'}}>{p}</strong>:p) : line}</p>
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', color: msg.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
          {msg.text}
        </div>
      )}

      <div className="table-wrapper" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
        <table className="substitutes-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>ช่วงเวลาที่ไม่อยู่</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>ผู้อนุมัติแทน (แนะนำ)</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>เหตุผล</th>
              <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280' }}>สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {mySubs.map(item => {
              const subUser = users.find(u => u.id === item.substitute_id)
              const isExpired = new Date(item.end_date) < new Date(new Date().setHours(0,0,0,0))
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: isExpired ? 0.6 : 1 }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{item.start_date} ถึง {item.end_date}</div>
                    {isExpired && <span style={{ fontSize: 11, color: '#9ca3af' }}>(หมดอายุแล้ว)</span>}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: 14 }}>{subUser?.full_name || 'ไม่ได้ระบุเจาะจง'}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{subUser?.role || 'กลุ่ม Pool'}</div>
                  </td>
                  <td style={{ padding: '16px 20px', fontSize: 13, color: '#4b5563' }}>{item.reason || '-'}</td>
                  <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                    <button 
                      onClick={() => toggleActive(item.id, item.is_active)}
                      style={{ 
                        padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: item.is_active ? '#d1fae5' : '#f3f4f6',
                        color: item.is_active ? '#065f46' : '#6b7280',
                        border: 'none'
                      }}
                    >
                      {item.is_active ? 'เปิดใช้งาน' : 'ปิด'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {mySubs.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>คุณยังไม่มีรายการแจ้งไม่อยู่</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12, backdropFilter: 'blur(8px)' }}>
          <div className="modal-content" style={{ background: '#fff', borderRadius: 28, width: '100%', maxWidth: 500, padding: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>➕</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>แจ้งไม่อยู่และตั้งผู้อนุมัติแทน</h3>
            </div>
            <form onSubmit={handleAddSub}>
              <div className="modal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>ตั้งแต่วันที่</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#f8fafc' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>ถึงวันที่</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#f8fafc' }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>ผู้อนุมัติแทน (ถ้ามีคนเจาะจง)</label>
                <select value={form.substitute_id} onChange={e => setForm({...form, substitute_id: e.target.value})} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#f8fafc' }}>
                  <option value="">-- อิงตามกลุ่มสิทธิ์ (Pool) --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>เหตุผล / หมายเหตุ</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#f8fafc', resize: 'none' }} placeholder="เช่น ลาพักร้อน" />
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '12px 24px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748b' }}>ยกเลิก</button>
                <button type="submit" style={{ padding: '12px 28px', border: 'none', borderRadius: 14, background: 'linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: 14, boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)' }}>บันทึกการตั้งค่า</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
