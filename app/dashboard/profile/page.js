'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { formatDateTime } from '@/lib/dateFormat'
import { getCurrentUserSession, changeExternalPIN } from '@/app/actions/user'
import { ROLE_BADGE, normalizeRole } from '@/lib/auth'

function ProfileContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [fullName, setFullName] = useState('')
  const [sessionType, setSessionType] = useState('internal') // 'internal' or 'external'
  const [loginLogs, setLoginLogs] = useState([])
  const [msg, setMsg] = useState({ text: '', type: '' })

  // Password state
  const [pwdForm, setPwdForm] = useState({ current: '', newPass: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, newPass: false, confirm: false })
  const [pwdLoading, setPwdLoading] = useState(false)

  useEffect(() => {
    // Check for tab parameter
    const tab = searchParams.get('tab')
    if (tab) setActiveTab(tab)
    
    init()
  }, [searchParams])

  const init = async () => {
    const sessionInfo = await getCurrentUserSession()
    if (!sessionInfo) return
    
    setSessionType(sessionInfo.type)
    const u = sessionInfo.user
    setUser(u)

    // ดึงข้อมูลจาก registry เพื่อความชัวร์เรื่อง Role
    const { data: regData } = await supabase
      .from('user_registry')
      .select('*')
      .eq('email', u.email)
      .single()

    if (regData) {
      setProfile(regData)
      setFullName(regData.full_name || '')
    }

    // Fetch login logs (เฉพาะ internal เพราะ external ใช้ cookie session)
    if (sessionInfo.type === 'internal') {
      const { data: logs } = await supabase
        .from('login_logs')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .limit(10)
      setLoginLogs(logs || [])
    }
    
    setLoading(false)
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMsg({ text: '', type: '' })

    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)

    if (error) {
      setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว', type: 'success' })
      setProfile({ ...profile, full_name: fullName })
    }
    setSaving(false)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setMsg({ text: '', type: '' })

    if (sessionType === 'external') {
      // --- เปลี่ยน PIN (External) ---
      if (!/^\d{6}$/.test(pwdForm.newPass)) {
        setMsg({ text: 'PIN ใหม่ต้องเป็นตัวเลข 6 หลัก', type: 'error' })
        return
      }
      setPwdLoading(true)
      const res = await changeExternalPIN({ currentPIN: pwdForm.current, newPIN: pwdForm.newPass })
      if (res.success) {
        setMsg({ text: '✅ เปลี่ยน PIN สำเร็จแล้ว', type: 'success' })
        setPwdForm({ current: '', newPass: '', confirm: '' })
      } else {
        setMsg({ text: `เกิดข้อผิดพลาด: ${res.error}`, type: 'error' })
      }
      setPwdLoading(false)
    } else {
      // --- เปลี่ยนรหัสผ่าน (Internal) ---
      if (pwdForm.newPass !== pwdForm.confirm) {
        setMsg({ text: 'รหัสผ่านใหม่ไม่ตรงกัน', type: 'error' })
        return
      }

      const pwd = pwdForm.newPass
      if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[^A-Za-z0-9]/.test(pwd)) {
        setMsg({ text: 'รหัสผ่านใหม่ไม่ผ่านเกณฑ์ความปลอดภัย', type: 'error' })
        return
      }

      setPwdLoading(true)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pwdForm.current
      })

      if (signInError) {
        setMsg({ text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง', type: 'error' })
        setPwdLoading(false)
        return
      }

      const { error } = await supabase.auth.updateUser({ password: pwdForm.newPass })
      if (error) {
        setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
      } else {
        setMsg({ text: '✅ เปลี่ยนรหัสผ่านสำเร็จแล้ว', type: 'success' })
        setPwdForm({ current: '', newPass: '', confirm: '' })
      }
      setPwdLoading(false)
    }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>

  const tabStyle = (tab) => ({
    padding: '10px 20px',
    border: 'none',
    background: 'none',
    borderBottom: activeTab === tab ? '2px solid #1d4ed8' : '2px solid transparent',
    color: activeTab === tab ? '#1d4ed8' : '#6b7280',
    fontWeight: activeTab === tab ? 600 : 400,
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'inherit'
  })

  const pwdChecks = [
    { label: 'อย่างน้อย 8 ตัวอักษร', met: pwdForm.newPass.length >= 8 },
    { label: 'ตัวพิมพ์ใหญ่ (A-Z)', met: /[A-Z]/.test(pwdForm.newPass) },
    { label: 'ตัวพิมพ์เล็ก (a-z)', met: /[a-z]/.test(pwdForm.newPass) },
    { label: 'ตัวเลข (0-9)', met: /[0-9]/.test(pwdForm.newPass) },
    { label: 'อักขระพิเศษ', met: /[^A-Za-z0-9]/.test(pwdForm.newPass) },
    { label: 'รหัสผ่านตรงกัน', met: pwdForm.newPass && pwdForm.newPass === pwdForm.confirm }
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>My Profile</h1>
        <div style={{ fontSize: 13, color: '#6b7280' }}>จัดการข้อมูลส่วนตัวและตรวจสอบประวัติการเข้าใช้งาน</div>
      </div>

      {msg.text && (
        <div style={{ 
          padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 20, 
          background: msg.type === 'success' ? '#ecfdf5' : '#fef2f2', 
          color: msg.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ borderBottom: '1px solid #f3f4f6', display: 'flex', background: '#f9fafb', padding: '0 16px' }}>
          <button style={tabStyle('general')} onClick={() => setActiveTab('general')}>ข้อมูลทั่วไป</button>
          <button style={tabStyle('security')} onClick={() => setActiveTab('security')}>ความปลอดภัย</button>
          <button style={tabStyle('logs')} onClick={() => setActiveTab('logs')}>ประวัติการเข้าใช้งาน</button>
        </div>

        <div style={{ padding: 24 }}>
          {activeTab === 'general' && (
            <form onSubmit={handleUpdateProfile}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
                <div style={{ 
                  width: 80, height: 80, borderRadius: '50%', background: '#1d4ed8', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700
                }}>
                  {fullName.charAt(0) || user?.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{fullName || 'User'}</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{user?.email}</div>
                  <div style={{ marginTop: 8 }}>
                    <span style={{ 
                      background: ROLE_BADGE[normalizeRole(profile?.user_role)]?.bg || '#f3f4f6', 
                      color: ROLE_BADGE[normalizeRole(profile?.user_role)]?.color || '#374151', 
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600
                    }}>
                      {ROLE_BADGE[normalizeRole(profile?.user_role)]?.emoji} {ROLE_BADGE[normalizeRole(profile?.user_role)]?.label || 'User'}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>ชื่อ-นามสกุล</label>
                <input 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุลของคุณ"
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>อีเมล (ไม่สามารถเปลี่ยนได้)</label>
                <input 
                  value={user?.email}
                  disabled
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', background: '#f9fafb', color: '#9ca3af' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
                <button 
                  type="submit" 
                  disabled={saving}
                  style={{ 
                    padding: '10px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, 
                    fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit' 
                  }}
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                  {sessionType === 'external' ? 'เปลี่ยนรหัส PIN 6 หลัก' : 'เปลี่ยนรหัสผ่าน'}
                </h3>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                  {sessionType === 'external' 
                    ? 'กรุณากรอกรหัส PIN เดิมและ PIN ใหม่ 6 หลักเพื่อทำการเปลี่ยนแปลง' 
                    : 'กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่เพื่อทำการเปลี่ยนแปลง'}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
                {[
                  { label: sessionType === 'external' ? 'รหัส PIN ปัจจุบัน' : 'รหัสผ่านปัจจุบัน', key: 'current' },
                  { label: sessionType === 'external' ? 'รหัส PIN ใหม่ (6 หลัก)' : 'รหัสผ่านใหม่', key: 'newPass' },
                  { label: sessionType === 'external' ? 'ยืนยันรหัส PIN ใหม่' : 'ยืนยันรหัสผ่านใหม่', key: 'confirm' },
                ].map(f => {
                  // ข้าม Confirm Field สำหรับ PIN เพื่อความง่าย หรือจะเก็บไว้ก็ได้
                  if (sessionType === 'external' && f.key === 'confirm') return null
                  
                  return (
                    <div key={f.key}>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>{f.label}</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showPwd[f.key] ? "text" : "password"}
                          value={pwdForm[f.key]}
                          onChange={e => {
                            const val = e.target.value
                            if (sessionType === 'external') {
                              if (/^\d*$/.test(val) && val.length <= 6) setPwdForm({ ...pwdForm, [f.key]: val })
                            } else {
                              setPwdForm({ ...pwdForm, [f.key]: val })
                            }
                          }}
                          required
                          placeholder={sessionType === 'external' ? 'ตัวเลข 6 หลัก' : ''}
                          style={{ width: '100%', padding: '10px 14px', paddingRight: '44px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPwd({ ...showPwd, [f.key]: !showPwd[f.key] })}
                          style={{ position: 'absolute', right: 12, top: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16 }}
                        >
                          {showPwd[f.key] ? '👁️' : '🙈'}
                        </button>
                      </div>
                      
                      {sessionType === 'external' && f.key === 'newPass' && pwdForm.newPass && pwdForm.newPass.length < 6 && (
                        <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>⚠️ กรุณาระบุให้ครบ 6 หลัก</div>
                      )}

                      {sessionType === 'internal' && f.key === 'newPass' && (
                        <div style={{ marginTop: 12, background: '#f9fafb', padding: 12, borderRadius: 8, border: '1px solid #f3f4f6' }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>เกณฑ์ความปลอดภัย:</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {pwdChecks.map((c, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: c.met ? '#059669' : '#9ca3af' }}>
                                <span>{c.met ? '✅' : '⚪'}</span> {c.label}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
                  <button 
                    type="submit" 
                    disabled={pwdLoading || (sessionType === 'internal' && !pwdChecks.every(c => c.met)) || (sessionType === 'external' && (!pwdForm.current || pwdForm.newPass.length < 6))}
                    style={{ 
                      padding: '10px 24px', background: (pwdLoading || (sessionType === 'internal' && !pwdChecks.every(c => c.met)) || (sessionType === 'external' && (!pwdForm.current || pwdForm.newPass.length < 6))) ? '#93c5fd' : '#dc2626', 
                      color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, 
                      cursor: 'pointer', fontFamily: 'inherit' 
                    }}
                  >
                    {pwdLoading ? 'กำลังบันทึก...' : sessionType === 'external' ? 'เปลี่ยนรหัส PIN' : 'เปลี่ยนรหัสผ่าน'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'logs' && (
            <div>
              <div style={{ marginBottom: 16, fontSize: 14, fontWeight: 600, color: '#374151' }}>ประวัติการเข้าใช้งานล่าสุด (10 รายการ)</div>
              <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>กิจกรรม</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500 }}>วันที่/เวลา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loginLogs.map(log => (
                      <tr key={log.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ 
                            background: log.action === 'login' ? '#d1fae5' : '#fee2e2', 
                            color: log.action === 'login' ? '#065f46' : '#991b1b',
                            padding: '2px 8px', borderRadius: 20, fontSize: 11
                          }}>
                            {log.action === 'login' ? 'เข้าสู่ระบบ' : 'ออกจากระบบ'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#374151' }}>{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                    {loginLogs.length === 0 && (
                      <tr><td colSpan="2" style={{ padding: 20, textAlign: 'center', color: '#9ca3af' }}>ไม่มีข้อมูลประวัติ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>}>
      <ProfileContent />
    </Suspense>
  )
}
