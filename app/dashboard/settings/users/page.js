'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const [isSuperUser, setIsSuperUser] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [activeTab, setActiveTab] = useState('users')
  const [filterEmail, setFilterEmail] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [newUser, setNewUser] = useState({ email: '', password: '', full_name: '', role: 'user' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setCurrentUser(session.user)

    const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
    const superUser = profile?.role === 'superuser'
    setIsSuperUser(superUser)

    await fetchLogs(session.user.id, superUser)
    if (superUser) await fetchUsers()
    setLoading(false)
  }

  const fetchUsers = async () => {
    const { data } = await supabase.from('user_profiles').select('*, auth_users:id(email:id)').order('created_at')
    const { data: authData } = await supabase.auth.admin?.listUsers?.() || { data: null }
    setUsers(data || [])
  }

  const fetchLogs = async (userId, superUser) => {
    let query = supabase.from('login_logs').select('*').order('created_at', { ascending: false })
    if (!superUser) query = query.eq('user_id', userId).limit(10)
    else {
      if (filterEmail) query = query.ilike('user_email', `%${filterEmail}%`)
      if (filterDateFrom) query = query.gte('created_at', filterDateFrom)
      if (filterDateTo) query = query.lte('created_at', filterDateTo + 'T23:59:59')
    }
    const { data } = await query.limit(100)
    setLogs(data || [])
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
        is_active: true
      })
      setMsg({ text: `สร้าง User ${newUser.email} สำเร็จแล้ว`, type: 'success' })
      setNewUser({ email: '', password: '', full_name: '', role: 'user' })
      setShowNew(false)
      await fetchUsers()
    }
    setSaving(false)
  }

  const handleToggleActive = async (id, current) => {
    await supabase.from('user_profiles').update({ is_active: !current }).eq('id', id)
    await fetchUsers()
  }

  const handleDeleteUser = async (id, email) => {
    if (!confirm(`ต้องการลบ User ${email} ใช่ไหม?`)) return
    await supabase.from('user_profiles').delete().eq('id', id)
    await fetchUsers()
  }

  const tabStyle = (tab) => ({
    padding: '8px 16px', fontSize: 13, cursor: 'pointer', border: 'none',
    borderBottom: activeTab === tab ? '2px solid #1d4ed8' : '2px solid transparent',
    background: 'none', color: activeTab === tab ? '#1d4ed8' : '#6b7280',
    fontFamily: 'inherit', fontWeight: activeTab === tab ? 600 : 400
  })

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Account Management</h1>
        {isSuperUser && activeTab === 'users' && (
          <button onClick={() => setShowNew(true)} style={{ background: '#1d4ed8', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + สร้าง User ใหม่
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: 20, display: 'flex' }}>
        {isSuperUser && <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>จัดการ Users</button>}
        <button style={tabStyle('logs')} onClick={() => { setActiveTab('logs'); fetchLogs(currentUser?.id, isSuperUser) }}>Login Log</button>
      </div>

      {/* Msg */}
      {msg.text && (
        <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b' }}>
          {msg.text}
        </div>
      )}

      {/* ===== USERS TAB ===== */}
      {activeTab === 'users' && isSuperUser && (
        <>
          {showNew && (
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>สร้าง User ใหม่</div>
              <form onSubmit={handleCreateUser}>
                <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>ชื่อ-นามสกุล</label>
                    <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} required
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Email</label>
                    <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Password เริ่มต้น</label>
                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={8}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Role</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="user">User</option>
                      <option value="superuser">Super User</option>
                    </select>
                  </div>
                </div>
                <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginBottom: 12 }}>
                  ⚠️ User ใหม่จะ Login ได้ทันที กรุณาแจ้ง Password เริ่มต้นให้ User เปลี่ยนเองในครั้งแรกที่ Login
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowNew(false)} style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                  <button type="submit" disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {saving ? 'กำลังสร้าง...' : 'สร้าง User'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['ชื่อ', 'Role', 'สถานะ', 'วันที่สร้าง', 'Action'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มีข้อมูล User</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#111827' }}>{u.full_name || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: u.role === 'superuser' ? '#eff6ff' : '#f3f4f6', color: u.role === 'superuser' ? '#1e40af' : '#374151', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                        {u.role === 'superuser' ? 'Super User' : 'User'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: u.is_active ? '#d1fae5' : '#fee2e2', color: u.is_active ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>
                      {new Date(u.created_at).toLocaleDateString('th-TH')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleToggleActive(u.id, u.is_active)}
                          style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => handleDeleteUser(u.id, u.full_name)}
                          style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 11, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}>
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    style={{ padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', width: 200 }} />
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
              {isSuperUser ? `Login/Logout Log ทั้งหมด (${logs.length} รายการ)` : `Login/Logout Log ของคุณ (10 รายการล่าสุด)`}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {[...(isSuperUser ? ['User'] : []), 'Action', 'วันที่/เวลา', 'IP Address'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>ยังไม่มี Log</td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {isSuperUser && <td style={{ padding: '10px 16px', color: '#374151', fontSize: 12 }}>{log.user_email}</td>}
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: log.action === 'login' ? '#d1fae5' : '#fee2e2', color: log.action === 'login' ? '#065f46' : '#991b1b', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>
                        {log.action === 'login' ? '🔓 Login' : '🔒 Logout'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#374151', fontSize: 12 }}>
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}