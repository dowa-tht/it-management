'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateFormat'
import { normalizeRole, ROLE_BADGE } from '@/lib/auth'
import { createAdminUser, getAdminUsers, updateAdminUser, updateAdminUserPassword, secureCleanDeleteUser, getUserIdentities, updateAdminUserPin, unlockUserPin } from '@/app/actions/admin'

// --- Modern Action Button Component ---
const ActionButton = ({ onClick, icon, color, title }) => {
  const [hover, setHover] = useState(false)
  const colors = {
    blue: { bg: '#eff6ff', icon: '#2563eb', hover: '#dbeafe' },
    red: { bg: '#fef2f2', icon: '#dc2626', hover: '#fee2e2' },
    gray: { bg: '#f8fafc', icon: '#64748b', hover: '#f1f5f9' },
    green: { bg: '#f0fdf4', icon: '#16a34a', hover: '#dcfce7' }
  }
  const theme = colors[color] || colors.gray
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 34, height: 34, borderRadius: 10, border: 'none',
        background: hover ? theme.hover : theme.bg,
        color: theme.icon, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, transition: 'all 0.2s',
        transform: hover ? 'translateY(-2px)' : 'none',
        boxShadow: hover ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
      }}
    >
      {icon}
    </button>
  )
}

// ===== Password Confirm Dialog =====
function PasswordConfirmDialog({ onConfirm, onCancel, targetName, action }) {
  const [password, setPassword] = useState('')
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    if (!password.trim()) { setError('กรุณากรอกรหัสผ่าน'); return }
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>🔐 ยืนยันตัวตน</div>
        <div style={{ fontSize: 14, color: '#475569', marginBottom: 6, lineHeight: 1.6 }}>คุณกำลังจะ <strong>{action}</strong> บัญชี:</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#1d4ed8', marginBottom: 20, padding: '10px 14px', background: '#eff6ff', borderRadius: 10 }}>{targetName}</div>
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input
            type={showConfirmPwd ? "text" : "password"}
            value={password}
            onChange={e => { setPassword(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
            placeholder="กรอกรหัสผ่านของคุณ"
            autoFocus
            style={{ width: '100%', padding: '12px 16px', border: `1px solid ${error ? '#fca5a5' : '#e2e8f0'}`, borderRadius: 12, fontSize: 14, outline: 'none' }}
          />
          <button 
            type="button"
            onClick={() => setShowConfirmPwd(!showConfirmPwd)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
          >
            {showConfirmPwd ? '👁️' : '🕶️'}
          </button>
        </div>
        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 16 }}>⚠ {error}</div>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} disabled={loading} style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={handleConfirm} disabled={loading || !password.trim()} style={{ padding: '10px 24px', border: 'none', borderRadius: 12, fontSize: 14, background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{loading ? 'ตรวจสอบ...' : 'ยืนยัน'}</button>
        </div>
      </div>
    </div>
  )
}

// ===== User Setup Dialog (Unified Version) =====
function UserSetupDialog({ user, onClose, onRefresh, currentUser }) {
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState({ ...user })
  const [pwdForm, setPwdForm] = useState({ newPass: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loginLogs, setLoginLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [identities, setIdentities] = useState([])
  const [pinForm, setPinForm] = useState({ newPin: '', confirm: '' })
  const [msg, setMsg] = useState({ text: '', type: '' })

  const isSelf = user.id === currentUser?.id

  useEffect(() => {
    if (activeTab === 'login_logs') fetchLoginLogs()
    if (activeTab === 'sso') fetchIdentities()
  }, [activeTab])

  const fetchIdentities = async () => {
    setLoading(true)
    const res = await getUserIdentities(user.id)
    if (res.success) setIdentities(res.identities)
    setLoading(false)
  }

  const fetchLoginLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from('login_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setLoginLogs(data || [])
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

  const handleUpdatePassword = async () => {
    if (pwdForm.newPass !== pwdForm.confirm) {
      setMsg({ text: 'รหัสผ่านไม่ตรงกัน', type: 'error' })
      return
    }
    const pwd = pwdForm.newPass
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) {
      setMsg({ text: 'รหัสผ่านไม่ผ่านเกณฑ์ความปลอดภัย', type: 'error' })
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

  const handleUpdatePin = async () => {
    if (pinForm.newPin.length !== 6) {
      setMsg({ text: 'PIN ต้องมีความยาว 6 หลัก', type: 'error' })
      return
    }
    if (pinForm.newPin !== pinForm.confirm) {
      setMsg({ text: 'PIN ไม่ตรงกัน', type: 'error' })
      return
    }

    setLoading(true)
    const res = await updateAdminUserPin(user.id, pinForm.newPin)
    if (res.success) {
      setMsg({ text: 'อัปเดต Signature PIN สำเร็จ', type: 'success' })
      setPinForm({ newPin: '', confirm: '' })
      onRefresh()
    } else {
      setMsg({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  const handleUnlockPin = async () => {
    setLoading(true)
    const res = await unlockUserPin(user.id)
    if (res.success) {
      setMsg({ text: 'ปลดล็อคบัญชีสำเร็จ', type: 'success' })
      onRefresh()
    } else {
      setMsg({ text: res.error, type: 'error' })
    }
    setLoading(false)
  }

  const pwdChecks = [
    { label: 'อย่างน้อย 8 ตัวอักษร', met: pwdForm.newPass.length >= 8 },
    { label: 'ตัวพิมพ์ใหญ่ (A-Z)', met: /[A-Z]/.test(pwdForm.newPass) },
    { label: 'ตัวพิมพ์เล็ก (a-z)', met: /[a-z]/.test(pwdForm.newPass) },
    { label: 'ตัวเลข (0-9)', met: /[0-9]/.test(pwdForm.newPass) },
    { label: 'อักขระพิเศษ', met: /[^A-Za-z0-9]/.test(pwdForm.newPass) },
    { label: 'รหัสผ่านตรงกัน', met: pwdForm.newPass && pwdForm.newPass === pwdForm.confirm }
  ]

  const tabStyle = (tab) => ({
    padding: '14px 20px', fontSize: 14, cursor: 'pointer', border: 'none',
    borderBottom: activeTab === tab ? '3px solid #1d4ed8' : '3px solid transparent',
    background: 'none', color: activeTab === tab ? '#1d4ed8' : '#64748b',
    fontWeight: activeTab === tab ? 700 : 500, flex: 1, transition: 'all 0.2s'
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 12 }}>
      <div className="dialog-container" style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 700, maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800 }}>{user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{user.full_name || '—'}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, width: 36, height: 36, cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <div className="dialog-tabs" style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
          <button style={tabStyle('general')} onClick={() => setActiveTab('general')}>⚙️ ข้อมูลทั่วไป</button>
          <button style={tabStyle('security')} onClick={() => setActiveTab('security')}>🔐 ความปลอดภัย</button>
          <button style={tabStyle('sso')} onClick={() => setActiveTab('sso')}>🆔 SSO</button>
          <button style={tabStyle('login_logs')} onClick={() => setActiveTab('login_logs')}>🕒 ประวัติ Login</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }} className="dialog-padding">
          <div style={{ padding: 32 }} className="dialog-padding">
          {msg.text && <div style={{ padding: '14px 20px', borderRadius: 14, fontSize: 14, marginBottom: 24, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#bcf0da' : '#fecaca'}` }}>{msg.type === 'success' ? '✅' : '❌'} {msg.text}</div>}

          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="dialog-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>ชื่อ-นามสกุล</label>
                  <input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>สิทธิ์การใช้งาน (Role)</label>
                  <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} disabled={isSelf} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14, background: isSelf ? '#f8fafc' : '#fff' }}>
                    <option value="administrator">Administrator</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="approval">Approval</option>
                    <option value="member">Member</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 12 }}>การมอบหมายงาน (Work Assignment)</label>
                <div 
                  onClick={() => setFormData({ ...formData, can_be_assignee: !formData.can_be_assignee })}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '12px 16px', 
                    background: formData.can_be_assignee ? '#f0fdf4' : '#f8fafc', 
                    borderRadius: 12, border: `1px solid ${formData.can_be_assignee ? '#bcf0da' : '#e2e8f0'}`,
                    width: 'fit-content', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    width: 40, height: 22, borderRadius: 20, 
                    background: formData.can_be_assignee ? '#16a34a' : '#cbd5e1', 
                    position: 'relative', transition: 'all 0.3s' 
                  }}>
                    <div style={{ 
                      position: 'absolute', left: formData.can_be_assignee ? 20 : 2, top: 2, 
                      width: 18, height: 18, borderRadius: '50%', background: '#fff', 
                      transition: 'all 0.3s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' 
                    }} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: formData.can_be_assignee ? '#166534' : '#64748b' }}>
                    สามารถรับมอบหมายงานได้ (Assignee)
                  </span>
                </div>
              </div>
              <button onClick={handleUpdateGeneral} disabled={loading} style={{ padding: '14px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)' }}>บันทึกข้อมูลทั่วไป</button>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="dialog-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>รหัสผ่านใหม่</label>
                  <input type={showPwd ? "text" : "password"} value={pwdForm.newPass} onChange={e => setPwdForm({ ...pwdForm, newPass: e.target.value })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>ยืนยันรหัสผ่าน</label>
                  <input type={showPwd ? "text" : "password"} value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14 }} />
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: 20, borderRadius: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {pwdChecks.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: c.met ? '#059669' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 8, fontWeight: c.met ? 600 : 400 }}>{c.met ? '✅' : '⚪'} {c.label}</div>
                ))}
              </div>
              <button onClick={handleUpdatePassword} disabled={loading || !pwdChecks.every(c => c.met)} style={{ padding: '14px', background: pwdChecks.every(c => c.met) ? '#dc2626' : '#fca5a5', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700 }}>อัปเดตรหัสผ่าน</button>
              
              <div style={{ borderTop: '1px solid #f1f5f9', margin: '12px 0' }} />

              <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 16px' }}>🔑 Signature PIN Management</h4>
              
              {user.pin_locked_until && new Date(user.pin_locked_until) > new Date() && (
                <div style={{ padding: 16, background: '#fef2f2', borderRadius: 12, border: '1px solid #fca5a5', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#991b1b' }}>
                    <strong>บัญชีถูกล็อคชั่วคราว</strong> (เนื่องจากใส่ PIN ผิดเกินกำหนด)<br/>
                    จนถึง: {new Date(user.pin_locked_until).toLocaleString('th-TH')}
                  </div>
                  <button onClick={handleUnlockPin} style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🔓 ปลดล็อคทันที</button>
                </div>
              )}

              <div className="dialog-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>PIN ใหม่ (6 หลัก)</label>
                  <input type="password" maxLength={6} value={pinForm.newPin} onChange={e => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14 }} placeholder="••••••" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>ยืนยัน PIN</label>
                  <input type="password" maxLength={6} value={pinForm.confirm} onChange={e => setPinForm({ ...pinForm, confirm: e.target.value.replace(/\D/g, '') })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, fontSize: 14 }} placeholder="••••••" />
                </div>
              </div>
              <button onClick={handleUpdatePin} disabled={loading || pinForm.newPin.length !== 6} style={{ padding: '14px', background: pinForm.newPin.length === 6 ? '#1d4ed8' : '#93c5fd', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700 }}>อัปเดต Signature PIN</button>
            </div>
          )}

          {activeTab === 'login_logs' && (
            <div style={{ border: '1px solid #f1f5f9', borderRadius: 16, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr><th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b' }}>Action</th><th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b' }}>วันเวลา</th></tr>
                </thead>
                <tbody>
                  {loginLogs.map(log => (
                    <tr key={log.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 20px' }}><span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: log.action === 'login' ? '#dcfce7' : '#fef2f2', color: log.action === 'login' ? '#166534' : '#991b1b' }}>{log.action?.toUpperCase()}</span></td>
                      <td style={{ padding: '12px 20px', color: '#475569' }}>{new Date(log.created_at).toLocaleString('th-TH')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'sso' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ padding: 24, background: '#f8fafc', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: '0 0 20px' }}>Microsoft 365 Single Sign-On</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 48, height: 48, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <svg width="24" height="24" viewBox="0 0 23 23"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: identities.some(id => id.provider === 'azure') ? '#059669' : '#64748b' }}>
                      {identities.some(id => id.provider === 'azure') ? '✅ เชื่อมต่อแล้ว' : '❌ ยังไม่ได้เชื่อมต่อ'}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{identities.find(id => id.provider === 'azure')?.identity_data?.email || 'ไม่มีข้อมูลการเชื่อมต่อกับ Microsoft'}</div>
                  </div>
                </div>
                <div style={{ background: '#eff6ff', padding: 16, borderRadius: 12, border: '1px solid #dbeafe' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>สถานะ SSO</div>
                  <p style={{ margin: 0, fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}>ผู้ใช้รายนี้สามารถเข้าสู่ระบบผ่าน Microsoft 365 ได้หากมีการเชื่อมต่อ Identity เรียบร้อยแล้ว</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  )
}

const CleanDeleteDialog = ({ email, onCancel, onConfirm }) => {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const targetText = `DELETE-${email}`

  const handleConfirm = async () => {
    if (confirmText !== targetText) {
      setError('ข้อความยืนยันไม่ถูกต้อง')
      return
    }
    setLoading(true)
    await onConfirm(confirmText)
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 450, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🗑️</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>ลบข้อมูลผู้ใช้อย่างถาวร</h3>
        <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
          การดำเนินการนี้จะลบข้อมูลทั้งในระบบ **Auth, Whitelist และ Profile** ของผู้ใช้รายนี้ออกทั้งหมด (ไม่สามารถกู้คืนได้)
        </p>
        
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: '#991b1b', marginBottom: 8, fontWeight: 600 }}>กรุณาพิมพ์ข้อความด้านล่างเพื่อยืนยัน:</p>
          <code style={{ display: 'block', background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, textAlign: 'center', fontSize: 14, marginBottom: 12 }}>{targetText}</code>
          <input 
            value={confirmText}
            onChange={e => { setConfirmText(e.target.value); setError('') }}
            placeholder="พิมพ์ข้อความยืนยันที่นี่"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #fecaca', fontSize: 14, outline: 'none' }}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 16, textAlign: 'center' }}>❌ {error}</div>}

        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
          <button 
            disabled={confirmText !== targetText || loading}
            onClick={handleConfirm}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: confirmText === targetText ? '#dc2626' : '#fca5a5', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
          >
            {loading ? 'กำลังลบ...' : 'ลบข้อมูลทันที'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'guest', can_be_assignee: false, sendEmailInvite: true })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [setupUser, setSetupUser] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [cleanDeleteDialog, setCleanDeleteDialog] = useState(null)
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(profile || session.user)
    }
    await fetchUsers()
    await fetchGuide()
    setLoading(false)
  }

  const fetchUsers = async () => {
    const res = await getAdminUsers()
    if (res.success) setUsers(res.data)
  }

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'users_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### 👥 คู่มือการจัดการผู้ใช้ (Account Management)
ยินดีต้อนรับสู่ระบบบริหารจัดการบัญชีผู้ใช้แบบ Unified Identity ที่รวบรวมการจัดการสิทธิ์ทุกระดับไว้ในที่เดียว พร้อมระบบความปลอดภัยชั้นสูง

---
#### **1. Unified Identity Strategy**
ระบบรองรับการเข้าสู่ระบบ 2 รูปแบบหลัก เพื่อความยืดหยุ่นและความปลอดภัย:
- **Microsoft 365 SSO:** สำหรับพนักงานภายใน (Internal) สามารถใช้บัญชีบริษัท Login ได้ทันที
- **Email & Password/PIN:** สำหรับผู้ใช้ทั่วไปหรือ Partner ภายนอก โดยระบบบังคับใช้ Password สำหรับ Staff และ PIN 6 หลักสำหรับการลงนาม (Signature)

---
#### **2. การจัดการสิทธิ์ (The 4 Tiers of RBAC)**

#### **Tier 1: Administrator**
**หน้าที่:** ควบคุมระบบสูงสุด, จัดการบัญชีผู้ใช้ทั้งหมด, ตั้งค่า Master Data (เช่น วันหยุด, No. Series) และแก้ไขคู่มือการใช้งาน

#### **Tier 2: Supervisor**
**หน้าที่:** ตรวจสอบภาพรวมผ่าน Dashboard, เรียกดูรายงาน SLA/KPI, จัดการเคส Incident และตรวจสอบประวัติการทำ Backup

#### **Tier 3: Approval**
**หน้าที่:** พิจารณาอนุมัติคำขอเข้าใช้งานของ Guest และลงนามรับรองความถูกต้องในระบบ Checklist ประจำเดือน

#### **Tier 4: Guest**
**หน้าที่:** สร้างเคส Incident (แจ้งซ่อม/แจ้งปัญหา), ติดตามสถานะงานของตัวเอง และกรอกข้อมูล Checklist พื้นฐาน

---
#### **3. ระบบผู้รับมอบหมายงาน (Assignee)**
ในตารางรายชื่อ คุณสามารถเปิด-ปิดสถานะ **"Assignee"** (ไอคอน 👤) ให้กับผู้ใช้รายบุคคลได้
- **ON (สีฟ้า):** ผู้ใช้รายนี้จะปรากฏในรายชื่อให้เลือกเมื่อมีการมอบหมายงาน (Assign) ใน Incident หรือ Checklist
- **OFF (สีเทา):** ผู้ใช้รายนี้จะไม่ถูกนำไปคำนวณในคิวงาน (ใช้สำหรับผู้อนุมัติหรือผู้ใช้ทั่วไปที่ไม่ได้ปฏิบัติหน้าที่ช่าง IT)

---
#### **4. ระบบความปลอดภัย Signature PIN**
เพื่อใช้แทนการเซ็นชื่อจริง ระบบจึงใช้ **6-digit PIN** ในการยืนยันตัวตนขั้นสุดท้ายก่อนอนุมัติงาน
- **Self-Service:** ผู้ใช้สามารถตั้ง PIN เองได้ที่หน้า My Profile
- **Admin Reset:** หากผู้ใช้ลืม PIN หรือใส่ผิดจนบัญชีล็อค Admin สามารถกด **⚙️ ตั้งค่า** และเลือกแท็บ **ความปลอดภัย** เพื่อปลดล็อคหรือตั้ง PIN ใหม่ให้ได้ทันที

---
#### **5. การเชื่อมต่อ SSO (Microsoft Linking)**
เพื่อให้พนักงานสามารถใช้ SSO ได้อย่างสมบูรณ์:
1. ผู้ใช้ต้องเข้าไปที่หน้า **My Profile**
2. เลือกแท็บ **เชื่อมต่อ SSO** และกดปุ่ม **Link Microsoft Account**
3. เมื่อเชื่อมต่อสำเร็จ Admin จะเห็นสถานะ ✅ ในหน้า SSO ของผู้ใช้รายนั้นๆ`)
    }
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    await supabase.from('system_settings').upsert({ key: 'users_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
    setEditingGuide(false)
    setSaving(false)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault(); 
    
    // หากมีการระบุ Password ให้ถามก่อนว่าจะส่ง Email ไหม (ตามเงื่อนไขที่ 2)
    if (newUser.password && !confirm(`คุณได้ระบุรหัสผ่านให้ผู้ใช้รายนี้เรียบร้อยแล้ว\n\nต้องการส่งอีเมลแจ้งข้อมูลการเข้าใช้งาน (Email & Password) ไปยังผู้ใช้ด้วยหรือไม่?`)) {
      // ถ้าตอบ Cancel ให้ตั้งค่าไม่ส่ง Email
      setSaving(true)
      const result = await createAdminUser({ ...newUser, sendEmailInvite: false })
      handleCreateResult(result)
      return
    }

    setSaving(true)
    const result = await createAdminUser(newUser)
    handleCreateResult(result)
  }

  const handleCreateResult = (result) => {
    if (result.success) {
      setMsg({ text: newUser.password ? `สร้าง User "${newUser.full_name}" สำเร็จ` : `ส่งคำเชิญให้คุณ "${newUser.full_name}" เรียบร้อยแล้ว`, type: 'success' })
      setNewUser({ email: '', password: '', full_name: '', role: 'guest', can_be_assignee: false, sendEmailInvite: true })
      setShowNew(false); fetchUsers()
    } else {
      setMsg({ text: `เกิดข้อผิดพลาด: ${result.error}`, type: 'error' })
    }
    setSaving(false)
  }

  const handleDeleteUser = async (id, name, email) => {
    if (id === currentUser?.id) return setMsg({ text: 'ไม่สามารถลบตัวเองได้', type: 'error' })
    setCleanDeleteDialog({ id, email })
  }

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</div>

  return (
    <div className="users-page-container" style={{ padding: 'var(--page-padding, 24px)', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .header-flex { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .header-button { width: 100% !important; }
          .new-user-form { grid-template-columns: 1fr !important; gap: 16px !important; }
          .form-actions { flex-direction: column !important; }
          .form-actions button { width: 100% !important; }
          .table-wrapper { overflow-x: auto !important; margin: 0 -12px !important; }
          .users-table { min-width: 850px !important; }
          .users-table { min-width: 850px !important; }
          .dialog-content { padding: 20px !important; }
          .dialog-tabs { overflow-x: auto !important; scrollbar-width: none !important; -ms-overflow-style: none !important; }
          .dialog-tabs::-webkit-scrollbar { display: none !important; }
          .dialog-tabs button { font-size: 11px !important; padding: 12px 16px !important; min-width: 120px !important; white-space: nowrap !important; }
          .dialog-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .dialog-padding { padding: 20px !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
      {cleanDeleteDialog && (
        <CleanDeleteDialog 
          email={cleanDeleteDialog.email} 
          onCancel={() => setCleanDeleteDialog(null)} 
          onConfirm={async (confirmText) => {
            const res = await secureCleanDeleteUser(cleanDeleteDialog.email, confirmText);
            if (res.success) {
              setCleanDeleteDialog(null); 
              setMsg({ text: 'ลบข้อมูลผู้ใช้และประวัติทั้งหมดสำเร็จ', type: 'success' }); 
              fetchUsers()
            } else {
              setMsg({ text: `เกิดข้อผิดพลาด: ${res.error}`, type: 'error' })
            }
          }} 
        />
      )}
      {setupUser && <UserSetupDialog user={setupUser} currentUser={currentUser} onClose={() => setSetupUser(null)} onRefresh={fetchUsers} />}
      {confirmDialog && <PasswordConfirmDialog targetName={confirmDialog.targetName} action={confirmDialog.action} onConfirm={async () => {
        await updateAdminUser({ id: confirmDialog.targetId, is_active: !confirmDialog.currentValue })
        setConfirmDialog(null); fetchUsers()
      }} onCancel={() => setConfirmDialog(null)} />}

      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            Account Management
            <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#f1f5f9', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
          </h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>จัดการบัญชีผู้ใช้และกำหนดสิทธิ์เข้าถึงระบบในระดับองค์กร</div>
        </div>
        <button className="header-button" onClick={() => setShowNew(true)} style={{ background: '#1d4ed8', color: '#fff', padding: '12px 24px', borderRadius: 14, border: 'none', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(29, 78, 216, 0.2)' }}>+ สร้าง User ใหม่</button>
      </div>

      {msg.text && <div style={{ padding: '14px 20px', borderRadius: 14, fontSize: 14, marginBottom: 24, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#bcf0da' : '#fecaca'}` }}>{msg.text}</div>}

      {showNew && (
        <div style={{ background: '#fff', borderRadius: 24, border: '1px solid #3b82f6', padding: 'var(--page-padding, 32px)', marginBottom: 32, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 24 }}>➕ สร้างบัญชีผู้ใช้ใหม่</h3>
          <form className="new-user-form" onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>ชื่อ-นามสกุล</label><input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} required style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12 }} /></div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>อีเมล</label><input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12 }} /></div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>
                รหัสผ่านเริ่มต้น (ทิ้งว่างไว้เพื่อส่ง Email Invite)
              </label>
              <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12 }} placeholder="ปล่อยว่างเพื่อทำ Self-Register" />
            </div>
            <div><label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>สิทธิ์การใช้งาน</label><select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}><option value="administrator">Administrator</option><option value="supervisor">Supervisor</option><option value="approval">Approval</option><option value="member">Member</option><option value="guest">Guest</option></select></div>
            <div style={{ gridColumn: 'span 2', display: 'flex', gap: 24 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>การมอบหมายงาน (Work Assignment)</label>
                <div 
                  onClick={() => setNewUser({ ...newUser, can_be_assignee: !newUser.can_be_assignee })}
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', 
                    background: newUser.can_be_assignee ? '#f0fdf4' : '#f8fafc', 
                    borderRadius: 12, border: `1px solid ${newUser.can_be_assignee ? '#bcf0da' : '#e2e8f0'}`,
                    width: 'fit-content' 
                  }}
                >
                  <div style={{ 
                    width: 34, height: 18, borderRadius: 20, 
                    background: newUser.can_be_assignee ? '#16a34a' : '#cbd5e1', 
                    position: 'relative' 
                  }}>
                    <div style={{ 
                      position: 'absolute', left: newUser.can_be_assignee ? 18 : 2, top: 2, 
                      width: 14, height: 14, borderRadius: '50%', background: '#fff' 
                    }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: newUser.can_be_assignee ? '#166534' : '#64748b' }}>
                    เป็นผู้รับมอบหมายงานได้ (Assignee)
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 8 }}>แจ้งเตือนทางอีเมล</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newUser.sendEmailInvite} onChange={e => setNewUser({ ...newUser, sendEmailInvite: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <span style={{ fontSize: 14, color: '#475569' }}>ส่งอีเมลแจ้งข้อมูลให้พนักงานทราบ</span>
                </label>
              </div>
            </div>
            <div className="form-actions" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
              <button type="button" onClick={() => setShowNew(false)} style={{ padding: '12px 24px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff' }}>ยกเลิก</button>
              <button type="submit" disabled={saving} style={{ padding: '12px 32px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700 }}>{saving ? 'กำลังสร้าง...' : 'สร้าง User'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-wrapper" style={{ background: '#fff', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
              {['ชื่อ-นามสกุล', 'Email', 'Role', 'Status', 'Assignee', 'Action'].map(h => <th key={h} style={{ padding: '16px 20px', textAlign: 'left', color: '#64748b', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const badge = ROLE_BADGE[normalizeRole(u.role)] || ROLE_BADGE.guest
              const isSelf = u.id === currentUser?.id
              const isExpired = u.expires_at && new Date(u.expires_at) < new Date()
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9', background: isExpired ? '#fff1f2' : 'none' }}>
                  <td style={{ padding: '16px 20px', fontWeight: 700, color: isExpired ? '#be123b' : '#0f172a' }}>
                    {u.full_name} 
                    {isSelf && <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, marginLeft: 8 }}>ME</span>}
                    {isExpired && <span style={{ fontSize: 10, background: '#fecaca', color: '#dc2626', padding: '2px 8px', borderRadius: 10, marginLeft: 8 }}>EXPIRED</span>}
                  </td>
                  <td style={{ padding: '16px 20px', color: '#64748b' }}>
                    {u.email}
                    {u.expires_at && (
                      <div style={{ fontSize: 11, color: isExpired ? '#dc2626' : '#9ca3af', marginTop: 4 }}>
                        ⌛ {isExpired ? 'หมดอายุเมื่อ:' : 'หมดอายุ:'} {formatDateTime(u.expires_at)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '16px 20px' }}><span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>{badge.emoji} {badge.label}</span></td>
                  <td style={{ padding: '16px 20px' }}>
                    <button onClick={!isSelf ? () => setConfirmDialog({ targetId: u.id, targetName: u.full_name, action: u.is_active ? 'ระงับการใช้งาน' : 'เปิดใช้งาน', currentValue: u.is_active }) : undefined} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: u.is_active ? '#059669' : '#e2e8f0', position: 'relative', cursor: isSelf ? 'default' : 'pointer' }}><div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: u.is_active ? 23 : 3, transition: '0.2s' }} /></button>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <button 
                      onClick={async () => {
                        const newStatus = !u.can_be_assignee
                        // Optimistic UI update
                        setUsers(users.map(user => user.id === u.id ? { ...user, can_be_assignee: newStatus } : user))
                        const res = await updateAdminUser({ id: u.id, can_be_assignee: newStatus })
                        if (!res.success) {
                          setMsg({ text: `ผิดพลาด: ${res.error}`, type: 'error' })
                          fetchUsers() // Revert on failure
                        }
                      }}
                      title="สลับสถานะผู้รับงาน"
                      style={{ 
                        width: 44, height: 24, borderRadius: 12, border: 'none', 
                        background: u.can_be_assignee ? '#3b82f6' : '#e2e8f0', 
                        position: 'relative', cursor: 'pointer' 
                      }}
                    >
                      <div style={{ 
                        width: 18, height: 18, borderRadius: '50%', background: '#fff', 
                        position: 'absolute', top: 3, left: u.can_be_assignee ? 23 : 3, 
                        transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 
                      }}>
                        {u.can_be_assignee ? '👤' : ''}
                      </div>
                    </button>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ActionButton title="ตั้งค่าและตรวจสอบ" onClick={() => setSetupUser(u)} icon="⚙️" color="gray" />
                      {!isSelf && <ActionButton title="ลบข้อมูลถาวร" onClick={() => handleDeleteUser(u.id, u.full_name, u.email)} icon="🗑️" color="red" />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 850, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>👥</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>Account Management Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการจัดการสิทธิ์และบัญชีผู้ใช้</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'administrator' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '14px 36px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' }}>บันทึกคู่มือ</button>
                </div>
              ) : (
                <div style={{ maxWidth: 750, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => {
                    const isCard = section.includes('####')
                    const typeMatch = section.match(/#### Tier (\d)/)
                    const type = typeMatch ? typeMatch[1] : (section.includes('####') ? '0' : null)
                    return (
                      <div key={sIdx} style={{ background: isCard ? '#fff' : 'transparent', borderRadius: 20, padding: isCard ? 28 : 0, marginBottom: isCard ? 24 : 36, borderLeft: isCard ? `6px solid ${['#94a3b8','#2563eb','#10b981','#f59e0b','#6366f1'][type||0]}` : 'none', boxShadow: isCard ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                        <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {section.trim().split('\n').map((line, lIdx) => {
                            if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                            if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                            return <p key={lIdx} style={{ margin: '0 0 10px 0' }}>{line.includes('**') ? line.split('**').map((p,i)=>i%2===1?<strong key={i} style={{color:'#1e3a8a'}}>{p}</strong>:p) : line}</p>
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}