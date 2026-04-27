'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateFormat'

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

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [currentProfile, setCurrentProfile] = useState(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [filterEmail, setFilterEmail] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'user', can_be_assignee: false })
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [msg, setMsg] = useState({ text: '', type: '' })

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
    const superUser = profile?.role === 'superuser'
    setIsSuperUser(superUser)
    await fetchLogs(session.user.id, superUser)
    if (superUser) await fetchUsers()
    setLoading(false)
  }

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('user_profiles').select('*').order('created_at', { ascending: true })

    const { data: logEmails } = await supabase
      .from('login_logs').select('user_id, user_email').order('created_at', { ascending: false })

    const emailMap = {}
    logEmails?.forEach(l => { if (!emailMap[l.user_id]) emailMap[l.user_id] = l.user_email })

    const merged = (profiles || []).map(p => ({ ...p, email: emailMap[p.id] || '—' }))
    setUsers(merged)
  }

  const fetchLogs = async (userId, superUser) => {
    let query = supabase.from('login_logs').select('*').order('created_at', { ascending: false })
    if (!superUser) {
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

    const { data, error } = await supabase.auth.admin.createUser({
      email: newUser.email,
      password: newUser.password,
      email_confirm: true,
      user_metadata: { full_name: newUser.full_name }
    })

    if (error) {
      setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
    } else {
      await supabase.from('user_profiles').upsert({
        id: data.user.id,
        full_name: newUser.full_name,
        role: newUser.role,
        is_active: true,
        can_be_assignee: newUser.can_be_assignee,
      })
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

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div style={{ padding: 24 }}>

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
        {isSuperUser && activeTab === 'users' && (
          <button onClick={() => { setShowNew(true); setMsg({ text: '', type: '' }) }}
            style={{ background: '#1d4ed8', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + สร้าง User ใหม่
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 20, display: 'flex' }}>
        {isSuperUser && <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>จัดการ Users</button>}
        <button style={tabStyle('logs')} onClick={() => { setActiveTab('logs'); fetchLogs(currentUser?.id, isSuperUser) }}>Login Log</button>
      </div>

      {/* Message */}
      {msg.text && (
        <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16 }}>×</button>
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && isSuperUser && (
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
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Password เริ่มต้น (อย่างน้อย 8 ตัว) *</label>
                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={8}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Role</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="user">User</option>
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
                            <div style={{ fontWeight: 500, color: u.is_active ? '#111827' : '#9ca3af' }}>
                              {u.full_name || '—'}
                            </div>
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
                            <span style={{ background: u.role === 'superuser' ? '#eff6ff' : '#f3f4f6', color: u.role === 'superuser' ? '#1e40af' : '#374151', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
                              {u.role === 'superuser' ? '⭐ Admin' : 'User'}
                            </span>
                            {!isSelf && (
                              <button onClick={() => handleToggleRole(u.id, u.role)} disabled={toggling === u.id + '_role'}
                                title={u.role === 'superuser' ? 'เปลี่ยนเป็น User' : 'เปลี่ยนเป็น Administrator'}
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
                          {!isSelf ? (
                            <button onClick={() => handleDeleteUser(u.id, u.full_name)}
                              style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 11, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}>
                              🗑 ลบ
                            </button>
                          ) : (
                            <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>
                          )}
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
          {isSuperUser && (
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
                <button onClick={() => fetchLogs(currentUser?.id, isSuperUser)}
                  style={{ padding: '7px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ค้นหา
                </button>
              </div>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', fontSize: 13, fontWeight: 500, color: '#374151' }}>
              {isSuperUser ? `Login/Logout Log ทั้งหมด (${logs.length} รายการ)` : 'Login/Logout Log ของคุณ (10 รายการล่าสุด)'}
            </div>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {[...(isSuperUser ? ['User'] : []), 'Action', 'วันที่/เวลา', 'User Agent'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มี Log</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {isSuperUser && <td style={{ padding: '10px 16px', color: '#374151', fontSize: 12 }}>{log.user_email}</td>}
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