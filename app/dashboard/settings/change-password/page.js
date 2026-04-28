'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, newPass: false, confirm: false })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    if (form.newPass !== form.confirm) {
      setMsg({ text: 'Password ใหม่ไม่ตรงกัน', type: 'error' })
      return
    }
    
    // Validate Password Complexity
    const pwd = form.newPass
    if (pwd.length < 8) { setMsg({ text: 'Password ต้องมีอย่างน้อย 8 ตัวอักษร', type: 'error' }); return }
    if (!/[A-Z]/.test(pwd)) { setMsg({ text: 'Password ต้องมีตัวพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว', type: 'error' }); return }
    if (!/[a-z]/.test(pwd)) { setMsg({ text: 'Password ต้องมีตัวพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว', type: 'error' }); return }
    if (!/[0-9]/.test(pwd)) { setMsg({ text: 'Password ต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว', type: 'error' }); return }
    if (!/[^A-Za-z0-9]/.test(pwd)) { setMsg({ text: 'Password ต้องมีอักขระพิเศษ อย่างน้อย 1 ตัว', type: 'error' }); return }

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
            { label: 'รหัสผ่านใหม่', key: 'newPass' },
            { label: 'ยืนยันรหัสผ่านใหม่', key: 'confirm' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>{f.label}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd[f.key] ? "text" : "password"}
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd({ ...showPwd, [f.key]: !showPwd[f.key] })}
                  tabIndex="-1"
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 16, color: '#9ca3af' }}
                >
                  {showPwd[f.key] ? '👁️' : '🙈'}
                </button>
              </div>
              {f.key === 'newPass' && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: 'อย่างน้อย 8 ตัวอักษร', met: form.newPass.length >= 8 },
                    { label: 'ตัวพิมพ์ใหญ่ (A-Z)', met: /[A-Z]/.test(form.newPass) },
                    { label: 'ตัวพิมพ์เล็ก (a-z)', met: /[a-z]/.test(form.newPass) },
                    { label: 'ตัวเลข (0-9)', met: /[0-9]/.test(form.newPass) },
                    { label: 'อักขระพิเศษ', met: /[^A-Za-z0-9]/.test(form.newPass) }
                  ].map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.met ? '#059669' : '#9ca3af' }}>
                      <span style={{ fontSize: 12 }}>{c.met ? '✅' : '⚪'}</span> {c.label}
                    </div>
                  ))}
                </div>
              )}
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