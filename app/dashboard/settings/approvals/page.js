'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'

export default function ApprovalFlowsPage() {
  const [configs, setConfigs] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const FREQ_TYPES = ['Daily', 'Weekly', 'Monthly', 'Yearly']

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [configsRes, usersRes] = await Promise.all([
      supabase.from('approval_configs').select('*'),
      supabase.from('user_profiles').select('id, full_name, role').in('role', ['administrator', 'supervisor', 'approval']).eq('is_active', true)
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

    const { error } = await supabase
      .from('approval_configs')
      .upsert({ 
        freq_type: freqType, 
        primary_approver_id: finalApproverId,
        target_type: freqType === 'Incident' ? 'incident' : 'checklist',
        category: freqType === 'Incident' ? 'high_priority' : 'general',
        allowed_roles: ['administrator', 'supervisor', 'approval']
      }, { onConflict: 'freq_type, category' })

    if (error) {
      setMsg({ text: `บันทึกไม่สำเร็จ: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: 'บันทึกการตั้งค่าสำเร็จ!', type: 'success' })
      fetchData()
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลดข้อมูล...</div>

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Approval Flows</h1>
        <div style={{ fontSize: 13, color: '#6b7280' }}>กำหนดผู้อนุมัติหลักแยกตามประเภทความถี่ของงาน</div>
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
          <strong>Tip:</strong> การตั้งค่าที่นี่จะเป็นแบบ "Approval Pool" เบื้องต้น หากผู้อนุมัติหลักไม่อยู่ ระบบจะอนุญาตให้ผู้ที่มีตำแหน่งเดียวกัน (ในระดับ Supervisor หรือ Admin) สามารถเซ็นแทนได้โดยใช้ PIN ของตนเองครับ
        </div>
      </div>
    </div>
  )
}
