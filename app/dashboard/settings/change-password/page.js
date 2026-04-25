'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    if (form.newPass !== form.confirm) {
      setMsg({ text: 'Password ใหม่ไม่ตรงกัน', type: 'error' })
      return
    }
    if (form.newPass.length < 8) {
      setMsg({ text: 'Password ต้องมีอย่างน้อย 8 ตัวอักษร', type: 'error' })
      return
    }

    setLoading(true)

    // Verify current password โดย re-signin
    const { data: { user } } = await supabase.auth.getUser()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: form.current
    })

    if (signInError) {
      setMsg({ text: 'Password ปัจจุบันไม่ถูกต้อง', type: 'error' })
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: form.newPass })

    if (error) {
      setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: '✅ เปลี่ยนรหัสผ่านสำเร็จแล้ว', type: 'success' })
      setForm({ current: '', newPass: '', confirm: '' })
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>เปลี่ยนรหัสผ่าน</h1>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 24 }}>เปลี่ยนรหัสผ่านของบัญชีคุณ</div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24 }}>
        <form onSubmit={handleSubmit}>
          {[
            { label: 'รหัสผ่านปัจจุบัน', key: 'current' },
            { label: 'รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)', key: 'newPass' },
            { label: 'ยืนยันรหัสผ่านใหม่', key: 'confirm' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <input
                type="password"
                value={form[f.key]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
              />
            </div>
          ))}

          {msg.text && (
            <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b' }}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', background: loading ? '#93c5fd' : '#1d4ed8',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit'
          }}>
            {loading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
          </button>
        </form>
      </div>
    </div>
  )
}