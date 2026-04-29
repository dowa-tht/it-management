'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateFormat'
import { normalizeRole, ROLE_BADGE } from '@/lib/auth'
import { createAdminUser, getAdminUsers, updateAdminUser, updateAdminUserPassword } from '@/app/actions/admin'

// ===== Password Confirm Dialog =====
function PasswordConfirmDialog({ onConfirm, onCancel, targetName, action }) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!password.trim()) { setError('กรุณากรอกรหัสผ่าน'); return }
    setLoading(true)
    setError('')

    // ดึง email ของ admin ที่ login อยู่
    const { data: { user } } = await supabase.auth.getUser()

    // verify password โดย re-signin
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: password,
    })

    if (signInError) {
      setError('รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่')
      setLoading(false)
      return
    }

    setLoading(false)
    onConfirm()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
          🔐 ยืนยันตัวตนก่อนดำเนินการ
        </div>
        <div style={{ fontSize: 13, color: '#374151', marginBottom: 4, lineHeight: 1.6 }}>
          คุณกำลังจะ <strong>{action}</strong> User:
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 16, padding: '6px 10px', background: '#eff6ff', borderRadius: 6 }}>
          {targetName}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
          กรุณากรอกรหัสผ่านของคุณเพื่อยืนยัน
        </div>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          placeholder="กรอกรหัสผ่านของคุณ"
          autoFocus
          style={{
            width: '100%', padding: '10px 12px',
            border: `1px solid ${error ? '#fca5a5' : '#d1d5db'}`,
            borderRadius: 8, fontSize: 14, fontFamily: 'inherit',
            marginBottom: 8, outline: 'none',
            background: error ? '#fff5f5' : '#fff'
          }}
        />
        {error && (
          <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚠ {error}
          </div>
        )}
        {!error && <div style={{ marginBottom: 12 }} />}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading}
            style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            ยกเลิก
          </button>
          <button onClick={handleConfirm} disabled={loading || !password.trim()}
            style={{ padding: '8px 20px', border: 'none', borderRadius: 7, fontSize: 13, background: loading || !password.trim() ? '#fca5a5' : '#dc2626', color: '#fff', cursor: loading || !password.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
            {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== User Setup Dialog (Edit & Logs) =====
function UserSetupDialog({ user, onClose, onRefresh, currentUser }) {
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState({ ...user })
  const [pwdForm, setPwdForm] = useState({ newPass: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loginLogs, setLoginLogs] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const isSelf = user.id === currentUser?.id

  useEffect(() => {
    if (activeTab === 'login_logs') fetchLoginLogs()
    if (activeTab === 'activity_logs') fetchActivityLogs()
  }, [activeTab])

  const fetchLoginLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from('login_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    setLoginLogs(data || [])
    setLoading(false)
  }

  const fetchActivityLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from('incident_logs').select('*').eq('user_email', user.email).order('created_at', { ascending: false }).limit(50)
    setActivityLogs(data || [])
    setLoading(false)
  }

  const handleUpdateGeneral = async () => {
    setLoading(true)
    const res = await updateAdminUser(formData)
    if (res.success) {
      setMsg({ text: 'อัปเดตข้อมูลสำเร็จ', type: 'success' })
      onRefresh()
    } else {
      setMsg({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  const handleMigrateTier = async (newTier, newRole) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการย้าย User นี้ไปที่ Tier: ${newTier} (${newRole})?\nบัญชีเดิมจะถูกระงับการใช้งานและเปลี่ยนไปใช้รูปแบบใหม่ทันที`)) return
    
    setLoading(true)
    setMsg({ text: 'กำลังดำเนินการย้าย Tier...', type: 'success' })
    
    try {
      const res = await fetch('/api/users/migrate-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email, 
          targetTier: newTier, 
          targetRole: newRole 
        })
      })
      const data = await res.json()
      
      if (res.ok) {
        setMsg({ 
          text: `ย้าย Tier สำเร็จ! ${data.newPin ? `PIN ใหม่คือ: ${data.newPin}` : 'ส่งอีเมลตั้งรหัสผ่านใหม่แล้ว'}`, 
          type: 'success' 
        })
        onRefresh()
      } else {
        setMsg({ text: data.error || 'การย้าย Tier ล้มเหลว', type: 'error' })
      }
    } catch (err) {
      setMsg({ text: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (pwdForm.newPass !== pwdForm.confirm) {
      setMsg({ text: 'รหัสผ่านไม่ตรงกัน', type: 'error' })
      return
    }
    // Simplified complexity check: Only length >= 8
    const pwd = pwdForm.newPass
    if (pwd.length < 8) {
      setMsg({ text: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร', type: 'error' })
      return
    }

    setLoading(true)
    const res = await updateAdminUserPassword(user.id, pwd)
    if (res.success) {
      setMsg({ text: 'เปลี่ยนรหัสผ่านสำเร็จ', type: 'success' })
      setPwdForm({ newPass: '', confirm: '' })
    } else {
      setMsg({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  const generatePwd = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let p = ""
    p += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]
    p += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
    p += "0123456789"[Math.floor(Math.random() * 10)]
    p += "!@#$%^&*"[Math.floor(Math.random() * 8)]
    for (let i = 0; i < 4; i++) p += chars[Math.floor(Math.random() * chars.length)]
    const final = p.split('').sort(() => 0.5 - Math.random()).join('')
    setPwdForm({ ...pwdForm, newPass: final })
    setMsg({ text: '', type: '' })
  }

  const tabStyle = (tab) => ({
    padding: '12px 16px', fontSize: 13, cursor: 'pointer', border: 'none',
    borderBottom: activeTab === tab ? '2px solid #1d4ed8' : '2px solid transparent',
    background: 'none', color: activeTab === tab ? '#1d4ed8' : '#6b7280',
    fontFamily: 'inherit', fontWeight: activeTab === tab ? 600 : 400, flex: 1
  })

  const pwdChecks = [
    { label: 'อย่างน้อย 8 ตัวอักษร', met: pwdForm.newPass.length >= 8 },
    { label: 'รหัสผ่านตรงกัน', met: pwdForm.newPass && pwdForm.newPass === pwdForm.confirm }
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
              {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>{user.full_name || '—'}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
          <button style={tabStyle('general')} onClick={() => setActiveTab('general')}>⚙️ ข้อมูลทั่วไป</button>
          <button style={tabStyle('security')} onClick={() => setActiveTab('security')}>🔐 ความปลอดภัย</button>
          <button style={tabStyle('login_logs')} onClick={() => setActiveTab('login_logs')}>🕒 ประวัติ Login</button>
          <button style={tabStyle('activity_logs')} onClick={() => setActiveTab('activity_logs')}>📝 ประวัติการทำงาน</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {msg.text && (
            <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>ชื่อ-นามสกุล</label>
                  <input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} 
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Role</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} disabled={isSelf}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: isSelf ? '#f3f4f6' : '#fff' }}>
                    <option value="user">Supervisor</option>
                    <option value="superuser">Administrator</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => setFormData({ ...formData, can_be_assignee: !formData.can_be_assignee })}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: formData.can_be_assignee ? '#1d4ed8' : '#d1d5db', position: 'relative' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: formData.can_be_assignee ? 21 : 3, transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: 13, color: '#374151' }}>รับมอบหมายเคส (Assignee)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => !isSelf && setFormData({ ...formData, is_active: !formData.is_active })} disabled={isSelf}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: isSelf ? 'not-allowed' : 'pointer', background: formData.is_active ? '#059669' : '#d1d5db', position: 'relative', opacity: isSelf ? 0.5 : 1 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: formData.is_active ? 21 : 3, transition: 'left 0.2s' }} />
                  </button>
                  <span style={{ fontSize: 13, color: '#374151' }}>สถานะการใช้งาน (Active)</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button onClick={handleUpdateGeneral} disabled={loading} style={{ padding: '10px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                  {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลทั่วไป'}
                </button>
              </div>

              {/* Advanced Migration Section */}
              {!isSelf && (
                <div style={{ marginTop: 24, padding: 16, background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 4 }}>⚡ Advanced: ย้ายกลุ่มสิทธิ์ (Cross-Tier Migration)</div>
                  <div style={{ fontSize: 11, color: '#c2410c', marginBottom: 16 }}>ใช้สำหรับย้ายผู้ใช้ข้ามระหว่างระบบ Login ปกติ กับระบบ Guest/External</div>
                  
                  <div style={{ display: 'flex', gap: 10 }}>
                    {normalizeRole(user.role) === 'administrator' || normalizeRole(user.role) === 'supervisor' ? (
                      <>
                        <button 
                          onClick={() => handleMigrateTier('external', 'guest')}
                          disabled={loading}
                          style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #fdba74', color: '#c2410c', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          ย้ายไปเป็น Guest (Tier 4)
                        </button>
                        <button 
                          onClick={() => handleMigrateTier('external', 'approval')}
                          disabled={loading}
                          style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #fdba74', color: '#c2410c', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          ย้ายไปเป็น Approver (Tier 3)
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleMigrateTier('internal', 'supervisor')}
                        disabled={loading}
                        style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #fdba74', color: '#1d4ed8', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        ย้ายกลับมาเป็น Supervisor (Tier 2)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>ตั้งรหัสผ่านใหม่</div>
                <button onClick={generatePwd} style={{ fontSize: 12, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>
                  🎲 Generate Password
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>รหัสผ่านใหม่</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPwd ? "text" : "password"} value={pwdForm.newPass} onChange={e => setPwdForm({ ...pwdForm, newPass: e.target.value })} 
                      style={{ width: '100%', padding: '10px 12px', paddingRight: '40px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
                    <button onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>{showPwd ? '👁️' : '🙈'}</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>ยืนยันรหัสผ่านใหม่</label>
                  <input type={showPwd ? "text" : "password"} value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} 
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ background: '#f9fafb', padding: 16, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 10 }}>เกณฑ์ความปลอดภัย:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {pwdChecks.map((c, i) => (
                    <div key={i} style={{ fontSize: 11, color: c.met ? '#059669' : '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.met ? '✅' : '⚪'} {c.label}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handleUpdatePassword} disabled={loading || !pwdChecks.every(c => c.met)} 
                  style={{ padding: '10px 24px', background: loading || !pwdChecks.every(c => c.met) ? '#93c5fd' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, cursor: loading || !pwdChecks.every(c => c.met) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                  {loading ? 'กำลังบันทึก...' : 'อัปเดตรหัสผ่าน'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'login_logs' && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>Action</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>วันที่/เวลา</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>Device/Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</td></tr>
                  ) : loginLogs.map(log => (
                    <tr key={log.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ background: log.action === 'login' ? '#d1fae5' : '#fee2e2', color: log.action === 'login' ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                          {log.action === 'login' ? '🔓 Login' : '🔒 Logout'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#6b7280' }}>{log.user_agent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'activity_logs' && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f9fafb' }}>
                  <tr>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>งาน</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>หมายเลขเคส</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>วันที่</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogs.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>ไม่พบข้อมูล</td></tr>
                  ) : activityLogs.map(log => (
                    <tr key={log.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{log.action}</td>
                      <td style={{ padding: '10px 16px', color: '#1d4ed8' }}>INC-XXXX</td>
                      <td style={{ padding: '10px 16px' }}>{new Date(log.created_at).toLocaleDateString('th-TH')}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280' }}>{log.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentProfile, setCurrentProfile] = useState(null)
  const [role, setRole] = useState('supervisor')
  const isAdmin = role === 'administrator'
  const [showNew, setShowNew] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [filterEmail, setFilterEmail] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'user', can_be_assignee: false })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const [setupUser, setSetupUser] = useState(null)

  // Password Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState(null)
  // { targetId, targetName, action: 'deactivate'|'activate', currentValue }

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setCurrentUser(session.user)
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
    setCurrentProfile(profile)
    const normalized = normalizeRole(profile?.role)
    setRole(normalized)
    const isAdminRole = normalized === 'administrator'
    await fetchLogs(session.user.id, isAdminRole)
    if (isAdminRole) await fetchUsers()
    setLoading(false)
  }

  const fetchUsers = async () => {
    const res = await getAdminUsers()
    if (res.success && res.data) {
      setUsers(res.data)
    } else {
      setMsg({ text: `โหลดรายชื่อผู้ใช้ล้มเหลว: ${res.error}`, type: 'error' })
    }
  }

  const fetchLogs = async (userId, isAdminRole) => {
    let query = supabase.from('login_logs').select('*').order('created_at', { ascending: false })
    if (!isAdminRole) {
      query = query.eq('user_id', userId).limit(10)
    } else {
      if (filterEmail) query = query.ilike('user_email', `%${filterEmail}%`)
      if (filterDateFrom) query = query.gte('created_at', filterDateFrom)
      if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59')
    }
    const { data } = await query.limit(100)
    setLogs(data || [])
  }

  // ===== Safety Checks =====

  // จำนวน Active Admin ทั้งหมด
  const activeAdminCount = users.filter(u => u.role === 'superuser' && u.is_active).length

  // เช็คว่า Deactivate ได้ไหม
  const canDeactivate = (user) => {
    // ห้าม Deactivate ตัวเอง
    if (user.id === currentUser?.id) return { allowed: false, reason: 'ไม่สามารถ Deactivate ตัวเองได้' }
    // ถ้าเป็น Admin และ Active Admin เหลือแค่ 1 คน
    if (user.role === 'superuser' && user.is_active && activeAdminCount <= 1) {
      return { allowed: false, reason: 'ต้องมี Administrator ที่ Active อย่างน้อย 1 Account' }
    }
    return { allowed: true, reason: '' }
  }

  // เปิด Password Confirm Dialog
  const requestDeactivate = (user) => {
    const check = canDeactivate(user)
    if (!check.allowed) {
      setMsg({ text: check.reason, type: 'error' })
      return
    }
    setConfirmDialog({
      targetId: user.id,
      targetName: user.full_name || user.email,
      action: user.is_active ? 'Deactivate' : 'Activate',
      currentValue: user.is_active,
    })
  }

  // ดำเนินการหลัง confirm password สำเร็จ
  const handleToggleActiveConfirmed = async () => {
    const { targetId, currentValue } = confirmDialog
    setConfirmDialog(null)
    setToggling(targetId + '_active')
    await supabase.from('user_profiles').update({ is_active: !currentValue }).eq('id', targetId)
    setMsg({ text: `${currentValue ? 'Deactivate' : 'Activate'} User สำเร็จแล้ว`, type: 'success' })
    await fetchUsers()
    setToggling(null)
  }

  const handleToggleAssignee = async (id, current) => {
    setToggling(id + '_assignee')
    await supabase.from('user_profiles').update({ can_be_assignee: !current }).eq('id', id)
    await fetchUsers()
    setToggling(null)
  }

  const handleToggleRole = async (id, currentRole) => {
    // ถ้าจะเปลี่ยนจาก superuser → user และ admin เหลือแค่ 1 คน
    if (currentRole === 'superuser' && activeAdminCount <= 1) {
      setMsg({ text: 'ต้องมี Administrator อย่างน้อย 1 Account ไม่สามารถลด Role ได้', type: 'error' })
      return
    }
    if (!confirm(`ต้องการเปลี่ยน Role เป็น "${currentRole === 'superuser' ? 'User' : 'Administrator'}" ใช่ไหม?`)) return
    setToggling(id + '_role')
    const newRole = currentRole === 'superuser' ? 'user' : 'superuser'
    await supabase.from('user_profiles').update({ role: newRole }).eq('id', id)
    setMsg({ text: 'เปลี่ยน Role สำเร็จแล้ว', type: 'success' })
    await fetchUsers()
    setToggling(null)
  }

  const handleDeleteUser = async (id, name) => {
    if (id === currentUser?.id) { setMsg({ text: 'ไม่สามารถลบ Account ตัวเองได้', type: 'error' }); return }
    if (!confirm(`ต้องการลบ User "${name}" ใช่ไหม?\nการลบจะไม่สามารถกู้คืนได้`)) return
    await supabase.from('user_profiles').delete().eq('id', id)
    setMsg({ text: `ลบ User "${name}" สำเร็จแล้ว`, type: 'success' })
    await fetchUsers()
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ text: '', type: '' })

    // Simplified Validation: Only length >= 8
    const pwd = newUser.password
    if (pwd.length < 8) { 
      setMsg({ text: 'Password ต้องมีอย่างน้อย 8 ตัวอักษร', type: 'error' }); 
      setSaving(false); 
      return 
    }

    const result = await createAdminUser({
      email: newUser.email,
      password: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role,
      can_be_assignee: newUser.can_be_assignee
    })

    if (!result.success) {
      setMsg({ text: `เกิดข้อผิดพลาด: ${result.error}`, type: 'error' })
    } else {
      setMsg({ text: `สร้าง User "${newUser.full_name}" สำเร็จแล้ว`, type: 'success' })
      setNewUser({ email: '', password: '', full_name: '', role: 'user', can_be_assignee: false })
      setShowNew(false)
      await fetchUsers()
    }
    setSaving(false)
  }

  const tabStyle = (tab) => ({
    padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: 'none',
    borderBottom: activeTab === tab ? '2px solid #1d4ed8' : '2px solid transparent',
    background: 'none', color: activeTab === tab ? '#1d4ed8' : '#6b7280',
    fontFamily: 'inherit', fontWeight: activeTab === tab ? 600 : 400
  })

  const Toggle = ({ value, onToggle, loading: tog, disabled, disabledReason, colorOn = '#059669' }) => (
    <div title={disabled ? disabledReason : ''}>
      <button onClick={!disabled ? onToggle : undefined} disabled={tog || disabled}
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none',
          cursor: disabled ? 'not-allowed' : tog ? 'wait' : 'pointer',
          background: disabled ? '#e5e7eb' : value ? colorOn : '#d1d5db',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          opacity: disabled ? 0.5 : 1
        }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3, left: value ? 21 : 3,
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </button>
    </div>
  )

  const isVisitor = role === 'guest'

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  if (isVisitor) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔐</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Access Denied</h2>
        <p style={{ color: '#6b7280', maxWidth: 450, fontSize: 16, lineHeight: 1.5 }}>
          ไม่สามารถเข้าถึงหน้าจอนี้ได้เนื่องจากเหตุผลด้านความปลอดภัย <br/> 
          สิทธิ์ <b>Visitor</b> ของคุณไม่ได้รับอนุญาตให้ดูหรือจัดการข้อมูลในส่วนนี้
        </p>
        <button onClick={() => window.location.href = '/dashboard'} style={{ marginTop: 32, padding: '10px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          กลับสู่หน้า Dashboard
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>

      {/* User Setup Dialog */}
      {setupUser && (
        <UserSetupDialog 
          user={setupUser} 
          currentUser={currentUser} 
          onClose={() => setSetupUser(null)} 
          onRefresh={fetchUsers} 
        />
      )}

      {/* Password Confirm Dialog */}
      {confirmDialog && (
        <PasswordConfirmDialog
          targetName={confirmDialog.targetName}
          action={confirmDialog.action}
          onConfirm={handleToggleActiveConfirmed}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Account Management</h1>
          <div style={{ fontSize: 12, color: '#6b7280' }}>จัดการ User และสิทธิ์การเข้าถึงระบบ</div>
        </div>
        {isAdmin && activeTab === 'users' && (
          <button onClick={() => { setShowNew(true); setMsg({ text: '', type: '' }) }}
            style={{ background: '#1d4ed8', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + สร้าง User ใหม่
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 20, display: 'flex' }}>
        {isAdmin && <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>จัดการ Users</button>}
        <button style={tabStyle('logs')} onClick={() => { setActiveTab('logs'); fetchLogs(currentUser?.id, isAdmin) }}>Login Log</button>
      </div>

      {/* Message */}
      {msg.text && (
        <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && isAdmin && (
        <>
          {/* Safety Info Banner */}
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <div>
              <strong>กฎความปลอดภัย:</strong> ไม่สามารถ Deactivate Account ตัวเองได้ · ต้องมี Administrator ที่ Active อย่างน้อย 1 Account · การ Deactivate ต้องยืนยันด้วยรหัสผ่าน
            </div>
          </div>

          {/* New User Form */}
          {showNew && (
            <div style={{ background: '#fff', borderRadius: 10, border: '2px solid #3b82f6', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 16 }}>➕ สร้าง User ใหม่</div>
              <form onSubmit={handleCreateUser}>
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>ชื่อ-นามสกุล *</label>
                    <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} required placeholder="ชื่อ นามสกุล"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Email *</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Password เริ่มต้น *</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        value={newUser.password} 
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })} 
                        required 
                        minLength={8}
                        style={{ width: '100%', padding: '8px 10px', paddingRight: '36px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex="-1"
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, color: '#9ca3af' }}
                      >
                        {showNewPassword ? '👁️' : '🙈'}
                      </button>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        { label: 'อย่างน้อย 8 ตัวอักษร', met: newUser.password.length >= 8 },
                        { label: 'ตัวพิมพ์ใหญ่ (A-Z)', met: /[A-Z]/.test(newUser.password) },
                        { label: 'ตัวพิมพ์เล็ก (a-z)', met: /[a-z]/.test(newUser.password) },
                        { label: 'ตัวเลข (0-9)', met: /[0-9]/.test(newUser.password) },
                        { label: 'อักขระพิเศษ', met: /[^A-Za-z0-9]/.test(newUser.password) }
                      ].map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.met ? '#059669' : '#9ca3af' }}>
                          <span style={{ fontSize: 12 }}>{c.met ? '✅' : '⚪'}</span> {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Role</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="user">Supervisor</option>
                      <option value="superuser">Administrator</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
                  <button type="button" onClick={() => setNewUser({ ...newUser, can_be_assignee: !newUser.can_be_assignee })}
                    style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', background: newUser.can_be_assignee ? '#1d4ed8' : '#d1d5db', position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: newUser.can_be_assignee ? 21 : 3, transition: 'left 0.2s' }} />
                  </button>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>รับมอบหมายเคส (Assignee)</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>หากเปิด จะแสดงชื่อใน Dropdown ตอนสร้าง/แก้ไข Incident</div>
                  </div>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                  ⚠️ User ใหม่จะ Login ได้ทันที กรุณาแจ้ง Password เริ่มต้นให้ User เปลี่ยนเองในครั้งแรก
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowNew(false); setMsg({ text: '', type: '' }) }}
                    style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                  <button type="submit" disabled={saving}
                    style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: saving ? '#93c5fd' : '#1d4ed8', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {saving ? 'กำลังสร้าง...' : 'สร้าง User'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'User ทั้งหมด', value: users.length, color: '#374151', bg: '#f9fafb' },
              { label: 'Administrator', value: users.filter(u => u.role === 'superuser').length, color: '#1e40af', bg: '#eff6ff' },
              { label: 'Active Admin', value: activeAdminCount, color: activeAdminCount <= 1 ? '#dc2626' : '#059669', bg: activeAdminCount <= 1 ? '#fef2f2' : '#f0fdf4' },
              { label: 'Assignee', value: users.filter(u => u.can_be_assignee).length, color: '#1d4ed8', bg: '#eff6ff' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, borderRadius: 8, padding: '10px 16px', border: '1px solid #e5e7eb', display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Active Admin Warning */}
          {activeAdminCount <= 1 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#dc2626', display: 'flex', gap: 8 }}>
              🚨 <strong>คำเตือน:</strong> ขณะนี้มี Administrator ที่ Active เพียง {activeAdminCount} Account — ไม่สามารถ Deactivate Admin Account นี้ได้จนกว่าจะมี Admin อื่นที่ Active อยู่
            </div>
          )}

          {/* Users Table */}
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['ชื่อ-นามสกุล', 'Email', 'Role', 'Assignee', 'Active', 'วันที่สร้าง', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีข้อมูล User</td></tr>
                  ) : users.map(u => {
                    const isSelf = u.id === currentUser?.id
                    const deactivateCheck = canDeactivate(u)
                    const isDeactivateDisabled = !deactivateCheck.allowed

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', background: u.is_active ? '#fff' : '#fafafa' }}>

                        {/* ชื่อ */}
                         <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button 
                              onClick={() => setSetupUser(u)}
                              style={{ 
                                background: 'none', border: 'none', padding: 0, 
                                fontWeight: 500, color: u.is_active ? '#111827' : '#9ca3af', 
                                cursor: 'pointer', textAlign: 'left', textDecoration: 'underline'
                              }}
                            >
                              {u.full_name || '—'}
                            </button>
                            {isSelf && (
                              <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: 20, fontWeight: 500 }}>คุณ</span>
                            )}
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>{u.email}</td>

                        {/* Role */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              background: u.role === 'superuser' ? '#eff6ff' : '#f3f4f6',
                              color: u.role === 'superuser' ? '#1e40af' : '#374151',
                              padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap'
                            }}>
                              {u.role === 'superuser' ? '👑 Administrator' : u.role === 'user' ? '🛡️ Supervisor' : '👤 ' + u.role}
                            </span>
                            {!isSelf && (
                              <button onClick={() => handleToggleRole(u.id, u.role)} disabled={toggling === u.id + '_role'}
                                title={u.role === 'superuser' ? 'เปลี่ยนเป็น Supervisor' : 'เปลี่ยนเป็น Administrator'}
                                style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 4, padding: '2px 6px', fontSize: 10, cursor: 'pointer', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                {toggling === u.id + '_role' ? '...' : '⇄'}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Assignee */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Toggle
                              value={u.can_be_assignee}
                              onToggle={() => handleToggleAssignee(u.id, u.can_be_assignee)}
                              loading={toggling === u.id + '_assignee'}
                              colorOn="#1d4ed8"
                            />
                            <span style={{ fontSize: 11, color: u.can_be_assignee ? '#1d4ed8' : '#9ca3af', whiteSpace: 'nowrap' }}>
                              {u.can_be_assignee ? 'รับเคสได้' : 'ไม่รับเคส'}
                            </span>
                          </div>
                        </td>

                        {/* Active Toggle */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Toggle
                              value={u.is_active}
                              onToggle={() => requestDeactivate(u)}
                              loading={toggling === u.id + '_active'}
                              disabled={isDeactivateDisabled}
                              disabledReason={deactivateCheck.reason}
                              colorOn="#059669"
                            />
                            <div>
                              <span style={{ fontSize: 11, color: u.is_active ? '#059669' : '#9ca3af', whiteSpace: 'nowrap', display: 'block' }}>
                                {u.is_active ? 'Active' : 'Inactive'}
                              </span>
                              {isDeactivateDisabled && (
                                <span style={{ fontSize: 10, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                                  🔒 {isSelf ? 'ตัวเอง' : 'Admin สุดท้าย'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* วันที่สร้าง */}
                        <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {formatDateTime(u.created_at)}
                        </td>

                        {/* Action */}
                         <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setSetupUser(u)}
                              style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ⚙️ Setup
                            </button>
                            {!isSelf && (
                              <button onClick={() => handleDeleteUser(u.id, u.full_name)}
                                style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 11, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}>
                                🗑 ลบ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 12, padding: '10px 14px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>
            ℹ️ User ที่เปิด <strong>Assignee</strong> จะแสดงชื่อใน Dropdown รับมอบหมายเคส ตอนสร้างและแก้ไข Incident
          </div>
        </>
      )}

      {/* ===== LOGS TAB ===== */}
      {activeTab === 'logs' && (
        <>
          {isAdmin && (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Filter Email</label>
                  <input value={filterEmail} onChange={e => setFilterEmail(e.target.value)} placeholder="ค้นหา email..."
                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: 220 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>วันที่เริ่ม</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>วันที่สิ้นสุด</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                </div>
                <button onClick={() => fetchLogs(currentUser?.id, isAdmin)}
                  style={{ padding: '7px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ค้นหา
                </button>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151' }}>
              {isAdmin ? `Login/Logout Log ทั้งหมด (${logs.length} รายการ)` : 'Login/Logout Log ของคุณ (10 รายการล่าสุด)'}
            </div>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {[...(isAdmin ? ['User'] : []), 'Action', 'วันที่/เวลา', 'User Agent'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มี Log</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {isAdmin && <td style={{ padding: '10px 16px', color: '#374151', fontSize: 12 }}>{log.user_email}</td>}
                      <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>
                        <span style={{ background: log.action === 'login' ? '#d1fae5' : '#fee2e2', color: log.action === 'login' ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                          {log.action === 'login' ? '🔓 Login' : '🔒 Logout'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px', color: '#374151', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.created_at)}
                      </td>
                      <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 11, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.user_agent || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}