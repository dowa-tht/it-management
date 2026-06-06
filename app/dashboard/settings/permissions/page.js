'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { recordClientAuditLog } from '@/app/actions/audit'
import { ALL_ROLES, ROLE_BADGE } from '@/lib/auth'

const FEATURES = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'reports',   label: 'Reports' },
  { key: 'backup',    label: 'Backup Log' },
  { key: 'checklist', label: 'IT Checklist' },
  { key: 'settings',  label: 'Settings' },
]

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState([]) // ข้อมูลจาก DB
  const [edits, setEdits] = useState({}) // เก็บค่าที่แก้ไขรอการบันทึก { "role:feature": "level" }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchPermissions()
    fetchGuide()
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      setCurrentUser(profile)
    }
  }

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'permissions_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### 🛡️ คู่มือการจัดการสิทธิ์ (Permission Management)
ระบบใช้การควบคุมสิทธิ์แบบ Role-Based Access Control (RBAC) เพื่อกำหนดการเข้าถึงฟีเจอร์ต่างๆ

---
#### 1. ระดับของสิทธิ์ (Access Levels)
- **RW (Read & Write)**: สามารถดูและแก้ไขข้อมูลได้ทั้งหมด
- **RO (Read Only)**: สามารถดูข้อมูลได้เท่านั้น ไม่สามารถแก้ไขได้
- **NONE (No Access)**: ไม่เห็นเมนูและไม่สามารถเข้าถึงหน้าจอได้

---
#### 2. การบันทึกข้อมูล
- เมื่อมีการเปลี่ยนค่าในตาราง ระบบจะยังไม่บันทึกทันทีจนกว่าจะกดปุ่ม **Save Changes**
- คุณสามารถกด **Reset** เพื่อล้างการแก้ไขที่ยังไม่ได้บันทึกได้ทุกเมื่อ`)
    }
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({ key: 'permissions_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
      setEditingGuide(false)
    }
    setSaving(false)
  }

  const fetchPermissions = async () => {
    const { data, error } = await supabase.from('permission_sets').select('*')
    if (error) {
      setMsg({ text: 'ดึงข้อมูลไม่สำเร็จ: ' + error.message, type: 'error' })
    } else {
      setPermissions(data)
    }
    setLoading(false)
  }

  // เปลี่ยนค่าเฉพาะใน UI ก่อน
  const handleChange = (role, feature, level) => {
    setEdits(prev => ({
      ...prev,
      [`${role}:${feature}`]: level
    }))
  }

  // คืนค่าเดิม
  const handleReset = () => {
    setEdits({})
    setMsg({ text: 'ยกเลิกการแก้ไขทั้งหมดแล้ว', type: 'info' })
    setTimeout(() => setMsg({ text: '', type: '' }), 2000)
  }

  // บันทึกลง Database ทีเดียวทั้งหมด
  const handleSaveAll = async () => {
    const editKeys = Object.keys(edits)
    if (editKeys.length === 0) return

    setSaving(true)
    const payload = editKeys.map(key => {
      const [role, feature] = key.split(':')
      return { role_name: role, feature_key: feature, access_level: edits[key] }
    })

    const { error } = await supabase
      .from('permission_sets')
      .upsert(payload, { onConflict: 'role_name,feature_key' })
    
    if (error) {
      setMsg({ text: 'บันทึกไม่สำเร็จ: ' + error.message, type: 'error' })
    } else {
      for (const entry of payload) {
        const current = permissions.find((item) => item.role_name === entry.role_name && item.feature_key === entry.feature_key)
        await recordClientAuditLog({
          scope: 'settings',
          entityType: 'permission',
          entityId: `${entry.role_name}:${entry.feature_key}`,
          entityLabel: `${entry.role_name}:${entry.feature_key}`,
          sourceModule: 'settings_permissions',
          action: 'Updated',
          details: 'Updated permission access level',
          before: {
            role_name: entry.role_name,
            feature_key: entry.feature_key,
            access_level: current?.access_level ?? null,
          },
          after: entry,
          allowlist: ['role_name', 'feature_key', 'access_level'],
        })
      }
      setMsg({ text: `บันทึกสิทธิ์ ${payload.length} รายการเรียบร้อยแล้ว ✨`, type: 'success' })
      setEdits({})
      await fetchPermissions()
    }
    setSaving(false)
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  if (loading) return <div style={{ padding: 100, textAlign: 'center', color: '#64748b' }}>กำลังโหลดข้อมูลสิทธิ์...</div>

  const hasChanges = Object.keys(edits).length > 0

  return (
    <div className="permissions-container" style={{ padding: 'var(--page-padding, 32px 24px)', maxWidth: 1200, margin: '0 auto', paddingBottom: 100 }}>
      <style>{`
        :root { --page-padding: 32px 24px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .perm-table tr:hover { background: rgba(248, 250, 252, 0.8); }
        .status-select { transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .is-edited { background: #f0f9ff !important; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .header-flex { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .header-actions { width: 100% !important; display: flex !important; gap: 8px !important; }
          .header-actions button { flex: 1 !important; }
          .title-text { font-size: 22px !important; }
          .perm-table { min-width: 800px !important; }
          .table-container { margin: 0 -12px !important; border-radius: 0 !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div className="header-flex" style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)' }}>
              🛡️
            </div>
            <h1 className="title-text" style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              Permission Management
              <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#eff6ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>บริหารจัดการสิทธิ์แบบ Dynamic (RO/RW) สำหรับโครงสร้างระบบ DOWA IT</p>
        </div>

        <div className="header-actions" style={{ 
          display: 'flex', gap: 12, 
          padding: '6px', background: '#fff', borderRadius: 20, 
          boxShadow: hasChanges ? '0 20px 25px -5px rgba(0,0,0,0.1)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
          border: '1px solid', borderColor: '#e2e8f0',
          transition: 'all 0.3s'
        }}>
          {hasChanges && (
            <button 
              onClick={handleReset}
              disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 12, border: 'none', background: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Reset
            </button>
          )}
          <button 
            onClick={handleSaveAll}
            disabled={!hasChanges || saving}
            style={{ 
              padding: '10px 24px', borderRadius: 12, border: 'none', 
              background: hasChanges ? 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)' : '#e2e8f0', 
              color: hasChanges ? '#fff' : '#94a3b8', 
              fontWeight: 800, fontSize: 13, cursor: hasChanges ? 'pointer' : 'default',
              boxShadow: hasChanges ? '0 10px 15px -3px rgba(29, 78, 216, 0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {saving ? 'Saving...' : `Save Changes ${hasChanges ? `(${Object.keys(edits).length})` : ''}`}
          </button>
        </div>
      </div>

      {msg.text && (
        <div style={{ 
          padding: '14px 20px', borderRadius: 16, marginBottom: 24, 
          background: msg.type === 'success' ? '#ecfdf5' : msg.type === 'info' ? '#f0f9ff' : '#fef2f2', 
          color: msg.type === 'success' ? '#065f46' : msg.type === 'info' ? '#0369a1' : '#991b1b',
          border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : msg.type === 'info' ? '#bae6fd' : '#fecaca'}`,
          fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: 18 }}>{msg.type === 'success' ? '✨' : msg.type === 'info' ? 'ℹ️' : '⚠️'}</span> {msg.text}
        </div>
      )}

      <div className="table-container" style={{ 
        background: 'rgba(255, 255, 255, 0.8)', 
        backdropFilter: 'blur(20px)',
        borderRadius: 24, 
        border: '1px solid rgba(226, 232, 240, 0.8)', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="perm-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' }}>MODULE / FEATURE</th>
                {ALL_ROLES.map(role => {
                  const badge = ROLE_BADGE[role]
                  return (
                    <th key={role} style={{ padding: '20px 12px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', minWidth: 140 }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 20 }}>{badge.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: badge.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{badge.label}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feat, idx) => {
                const isRowEdited = Object.keys(edits).some(k => k.endsWith(`:${feat.key}`))
                return (
                  <tr key={feat.key} className={isRowEdited ? 'is-edited' : ''} style={{ borderBottom: idx === FEATURES.length - 1 ? 'none' : '1px solid #f1f5f9', transition: 'background 0.3s' }}>
                    <td style={{ padding: '24px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{feat.label}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace', background: '#f8fafc', padding: '2px 6px', borderRadius: 4, display: 'inline-block' }}>{feat.key}</div>
                    </td>
                    {ALL_ROLES.map(role => {
                      const editValue = edits[`${role}:${feat.key}`]
                      const dbValue = permissions.find(p => p.role_name === role && p.feature_key === feat.key)?.access_level || 'NONE'
                      const current = editValue !== undefined ? editValue : dbValue
                      const isFieldEdited = editValue !== undefined && editValue !== dbValue
                      
                      const getStyle = (lvl) => {
                        if (lvl === 'RW') return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' }
                        if (lvl === 'RO') return { bg: '#fffbeb', border: '#fef3c7', color: '#d97706' }
                        return { bg: '#fff', border: '#e2e8f0', color: '#94a3b8' }
                      }
                      const s = getStyle(current)
                      return (
                        <td key={role} style={{ padding: '16px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          <select 
                            value={current}
                            onChange={(e) => handleChange(role, feat.key, e.target.value)}
                            disabled={saving}
                            className="status-select"
                            style={{ 
                              width: '100%', maxWidth: 130,
                              padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                              border: `2px solid ${isFieldEdited ? '#3b82f6' : s.border}`, outline: 'none', cursor: 'pointer',
                              background: s.bg, color: s.color, appearance: 'none', textAlign: 'center',
                              backgroundImage: 'linear-gradient(45deg, transparent 50%, gray 50%), linear-gradient(135deg, gray 50%, transparent 50%)',
                              backgroundPosition: 'calc(100% - 15px) calc(1em + 2px), calc(100% - 10px) calc(1em + 2px)',
                              backgroundSize: '5px 5px, 5px 5px', backgroundRepeat: 'no-repeat',
                              boxShadow: isFieldEdited ? '0 0 10px rgba(59, 130, 246, 0.2)' : 'none'
                            }}
                          >
                            <option value="NONE">❌ No Access</option>
                            <option value="RO">👁️ Read Only</option>
                            <option value="RW">✍️ Read & Write</option>
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 40, padding: 24, background: 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)', borderRadius: 24, border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#1e293b', fontWeight: 800 }}>
            <span>💡</span> มาตรฐานการตั้งค่าสิทธิ์
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <div>
              <strong style={{ color: '#1d4ed8' }}>✍️ RW (Read & Write)</strong>
              <div style={{ fontSize: 12, color: '#64748b' }}>สิทธิ์ระดับสูงสุด สามารถดูข้อมูล สร้าง แก้ไข และลบรายการในโมดูลนั้นๆ ได้ทั้งหมด</div>
            </div>
            <div>
              <strong style={{ color: '#d97706' }}>👁️ RO (Read Only)</strong>
              <div style={{ fontSize: 12, color: '#64748b' }}>ผู้ใช้เข้าดูข้อมูลได้ปกติ แต่ระบบจะทำการปิดกั้นฟังก์ชันแก้ไขและปุ่มบันทึกทั้งหมดเพื่อความปลอดภัย</div>
            </div>
            <div>
              <strong style={{ color: '#94a3b8' }}>❌ NONE (No Access)</strong>
              <div style={{ fontSize: 12, color: '#64748b' }}>เมนูจะถูกนำออกจากระบบ Sidebar และผู้ใช้จะไม่สามารถเข้าถึงหน้านี้ได้แม้จะทราบ URL</div>
            </div>
          </div>
        </div>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>🛡️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Permission Guide</h3>
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>คู่มือการจัดการสิทธิ์และโครงสร้างความปลอดภัย</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'admin' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '14px 36px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' }}>บันทึกคู่มือ</button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #6366f1` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section.trim().split('\n').map((line, lIdx) => {
                          if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: 800, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                          if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                          return <p key={lIdx} style={{ margin: '0 0 10px 0' }}>{line.includes('**') ? line.split('**').map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#1e3a8a' }}>{p}</strong> : p) : line}</p>
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
    </div>
  )
}
