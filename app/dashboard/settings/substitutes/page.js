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
  
  const [form, setForm] = useState({
    substitute_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: ''
  })

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const userId = session.user.id
    setCurrentUser(userId)

    const [subsRes, usersRes] = await Promise.all([
      supabase.from('approval_substitutes').select('*').eq('primary_approver_id', userId).order('created_at', { ascending: false }),
      supabase.from('user_profiles').select('id, full_name, role').in('role', ['administrator', 'supervisor', 'approval']).neq('id', userId).eq('is_active', true)
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
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>My Absence / Substitution</h1>
          <div style={{ fontSize: 13, color: '#6b7280' }}>ตั้งค่าช่วงเวลาที่คุณไม่อยู่เพื่อให้ระบบจัดการผู้อนุมัติแทนโดยอัตโนมัติ</div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + แจ้งไม่อยู่ / ตั้งคนแทน
        </button>
      </div>

      {msg.text && (
        <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20, background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', color: msg.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
          {msg.text}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 450, padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>แจ้งไม่อยู่และตั้งผู้อนุมัติแทน</h3>
            <form onSubmit={handleAddSub}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>ตั้งแต่วันที่</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: 8 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>ถึงวันที่</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} required style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: 8 }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>ผู้อนุมัติแทน (ถ้ามีคนเจาะจง)</label>
                <select value={form.substitute_id} onChange={e => setForm({...form, substitute_id: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: 8 }}>
                  <option value="">-- อิงตามกลุ่มสิทธิ์ (Pool) --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>เหตุผล / หมายเหตุ</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} placeholder="เช่น ลาพักร้อน" />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
                <button type="submit" style={{ padding: '10px 24px', border: 'none', borderRadius: 8, background: '#1d4ed8', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>บันทึกการตั้งค่า</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
