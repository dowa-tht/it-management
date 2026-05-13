'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'
import { updateApprovalConfig } from '@/app/actions/workflow'

export default function ApprovalFlowsPage() {
  const [configs, setConfigs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const FREQ_TYPES = ['Daily', 'Weekly', 'Monthly', 'Yearly']

  useEffect(() => {
    fetchData()
    fetchGuide()
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'approvals_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### 🛡️ คู่มือการตั้งค่าผู้อนุมัติ (Approval Flows Guide)
ระบบใช้โครงสร้างการอนุมัติแบบ **Tiered Approval** เพื่อให้การทำงานมีความยืดหยุ่นและรวดเร็ว

---
#### **1. ประเภทการอนุมัติ**
- **Checklist Approver:** ผู้อนุมัติที่ถูกกำหนดแยกตามความถี่ (Daily, Weekly, Monthly, Yearly)
- **Incident Approver:** ผู้อนุมัติสำหรับเคส Incident ที่มีความสำคัญสูง

---
#### **2. ระบบ Approval Pool (การเซ็นแทน)**
ระบบมีกลไกช่วยเหลือในกรณีผู้อนุมัติหลักไม่อยู่:
1. **Primary Approver:** บุคคลที่ถูกเลือกในหน้านี้จะเป็นผู้รับแจ้งเตือนคนแรก
2. **Substitutes:** หากผู้อนุมัติหลักตั้งค่าคนแทนไว้ คนแทนสามารถเซ็นได้ทันที
3. **Pool Permissions:** ผู้ใช้ที่มี Role เป็น **Admin, it_staff หรือ Approver** สามารถลงนามแทนได้หากจำเป็น โดยระบบจะบันทึกใน Audit Log ว่าเป็นการ "Signed on behalf of"`)
    }
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    await supabase.from('system_settings').upsert({ key: 'approvals_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
    setEditingGuide(false)
    setSaving(false)
  }

  const fetchData = async () => {
    setLoading(true)
    const [configsRes, usersRes] = await Promise.all([
      supabase.from('approval_configs').select('*'),
      supabase.from('user_profiles').select('id, full_name, role').in('role', ['admin', 'it_staff', 'approver']).eq('is_active', true)
    ])

    if (configsRes.data) setConfigs(configsRes.data)
    if (usersRes.data) setUsers(usersRes.data)
    setLoading(false)
  }

  const handleUpdateConfig = async (freqType, approverId) => {
    setSaving(true)
    setMsg({ text: '', type: '' })

    // Fix: If approverId is empty string, send null to avoid UUID syntax error
    const finalApproverId = approverId === '' ? null : approverId

    // Use Server Action to bypass RLS and record logs
    const result = await updateApprovalConfig(freqType, finalApproverId)

    if (result.error) {
      setMsg({ text: `บันทึกไม่สำเร็จ: ${result.error}`, type: 'error' })
    } else {
      setMsg({ text: 'บันทึกการตั้งค่าสำเร็จ!', type: 'success' })
      fetchData()
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>

  return (
    <div className="approvals-container" style={{ padding: 'var(--page-padding, 24px)', maxWidth: 800, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .table-wrapper { overflow-x: auto !important; margin: 0 -12px !important; }
          .approvals-table { min-width: 600px !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
              🛡️
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              Approval Flows
              <button className="no-print" onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#eff6ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>กำหนดผู้อนุมัติหลักแยกตามประเภทความถี่ของงาน</p>
        </div>
        <div className="action-dock no-print" style={{ display: 'flex', gap: 6, padding: '6px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <button onClick={() => fetchData()} style={{ padding: '10px 20px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #2563eb, #60a5fa)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>📖</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>Approval Flows Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการจัดการสายการอนุมัติ</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'admin' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
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
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #2563eb` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
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
        <table className="approvals-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Checklist Frequency</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Primary Approver</th>
              <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {FREQ_TYPES.map(type => {
              const config = configs.find(c => c.freq_type === type && c.target_type === 'checklist')
              return (
                <tr key={type} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{type} Checklist</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>ทุกรายการในหมวด {type}</div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <select 
                      value={config?.primary_approver_id || ''} 
                      onChange={(e) => handleUpdateConfig(type, e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
                    >
                      <option value="">-- ไม่จำเป็นต้องอนุมัติ (Auto-Approve) --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {config?.primary_approver_id ? (
                      <span style={{ fontSize: 11, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 20 }}>✓ อนุมัติโดยบุคคล</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 20 }}>🛡️ ระบบอนุมัติอัตโนมัติ</span>
                    )}
                  </td>
                </tr>
              )
            })}
            
            {/* Incident Section */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e5e7eb' }}>
              <td style={{ padding: '16px 20px' }} colSpan={3}>
                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>🚀 INCIDENT MANAGEMENT</div>
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 600, color: '#dc2626' }}>High Priority Incident</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>เคสที่มีความสำคัญสูงและเร่งด่วน</div>
              </td>
              <td style={{ padding: '16px 20px' }}>
                {(() => {
                  const incConfig = configs.find(c => c.freq_type === 'Incident' && c.target_type === 'incident')
                  return (
                    <select 
                      value={incConfig?.primary_approver_id || ''} 
                      onChange={(e) => handleUpdateConfig('Incident', e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, background: '#fff' }}
                    >
                      <option value="">-- ไม่จำเป็นต้องอนุมัติ --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                      ))}
                    </select>
                  )
                })()}
              </td>
              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                {configs.find(c => c.freq_type === 'Incident')?.primary_approver_id ? (
                  <span style={{ fontSize: 11, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 20 }}>✓ ต้องอนุมัติ</span>
                ) : (
                  <span style={{ fontSize: 11, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 20 }}>ไม่ต้องอนุมัติ</span>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 24, padding: 16, background: '#eff6ff', borderRadius: 12, border: '1px solid #dbeafe', display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 20 }}>💡</span>
        <div style={{ fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
          <strong>Tip:</strong> การตั้งค่าที่นี่จะเป็นแบบ "Approval Pool" เบื้องต้น หากผู้อนุมัติหลักไม่อยู่ ระบบจะอนุญาตให้ผู้ที่มีสิทธิ์ในระดับเดียวกัน (IT Staff, Approver หรือ Admin) สามารถเซ็นแทนได้โดยใช้ PIN ของตนเองครับ
        </div>
      </div>
    </div>
  )
}
