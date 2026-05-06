'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { recordLog } from '@/app/actions/workflow'

export default function WorkflowSettingsPage() {
  const [configs, setConfigs] = useState([])
  const [selectedConfig, setSelectedConfig] = useState(null)
  const [steps, setSteps] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  const roles = ['administrator', 'supervisor', 'approval', 'member']

  useEffect(() => {
    fetchInitialData()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single().then(({ data: p }) => setCurrentUser(p))
      }
    })
  }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    const [{ data: confs }, { data: usrs }] = await Promise.all([
      supabase.from('workflow_configs').select('*').order('doc_type', { ascending: true }),
      supabase.from('user_profiles').select('id, full_name, email, role').eq('is_active', true).order('full_name', { ascending: true })
    ])
    
    if (confs) {
      setConfigs(confs)
      if (confs.length > 0) handleSelectConfig(confs[0])
    }
    if (usrs) setUsers(usrs)
    setLoading(false)
  }

  const handleSelectConfig = (config) => {
    setSelectedConfig(config)
    setSteps(config.steps || [])
  }

  const addStep = () => {
    const nextOrder = steps.length > 0 ? Math.max(...steps.map(s => s.step_order)) + 1 : 1
    setSteps([...steps, { step_order: nextOrder, role_required: 'supervisor', approver_id: null }])
  }

  const removeStep = (idx) => {
    const newSteps = steps.filter((_, i) => i !== idx)
    // Re-order
    const reordered = newSteps.map((s, i) => ({ ...s, step_order: i + 1 }))
    setSteps(reordered)
  }

  const updateStep = (idx, field, value) => {
    const newSteps = [...steps]
    newSteps[idx][field] = value
    if (field === 'approver_id' && value) {
        // Auto set role if user selected
        const user = users.find(u => u.id === value)
        if (user) newSteps[idx].role_required = user.role
    }
    setSteps(newSteps)
  }

  const handleSave = async () => {
    if (!selectedConfig) return
    setSaving(true)
    const { error } = await supabase
      .from('workflow_configs')
      .update({ steps })
      .eq('id', selectedConfig.id)

    if (error) {
      alert(`Error saving: ${error.message}`)
    } else {
      alert('💾 บันทึก Workflow สำเร็จ!')
      await recordLog(selectedConfig.id, 'workflow_config', 'Updated', `ปรับปรุงลำดับการอนุมัติสำหรับ ${selectedConfig.doc_type} (${selectedConfig.trigger_value})`, currentUser?.email)
      fetchInitialData()
    }
    setSaving(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังโหลด...</div>

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>⚙️ Workflow Settings</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>กำหนดลำดับการอนุมัติสำหรับเอกสารประเภทต่างๆ ในระบบ</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Left Sidebar: Config List */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 12, height: 'fit-content', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', padding: '8px 12px', marginBottom: 8 }}>ประเภทเอกสาร</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {configs.map(c => (
              <div 
                key={c.id} 
                onClick={() => handleSelectConfig(c)}
                style={{ 
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                  background: selectedConfig?.id === c.id ? '#eff6ff' : 'transparent',
                  color: selectedConfig?.id === c.id ? '#1d4ed8' : '#374151',
                  fontWeight: selectedConfig?.id === c.id ? 600 : 400,
                  border: `1px solid ${selectedConfig?.id === c.id ? '#bfdbfe' : 'transparent'}`
                }}
              >
                <div style={{ fontSize: 14 }}>{c.doc_type === 'checklist' ? '📋 Checklist' : '🚨 Incident'}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{c.trigger_value}</div>
              </div>
            ))}
          </div>
          <button style={{ width: '100%', marginTop: 12, padding: '10px', border: '1px dashed #d1d5db', borderRadius: 10, background: 'none', color: '#6b7280', fontSize: 13, cursor: 'not-allowed' }}>
            + เพิ่มเงื่อนไขใหม่ (Coming Soon)
          </button>
        </div>

        {/* Right Content: Steps Editor */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 32, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          {selectedConfig ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1d4ed8', marginBottom: 4 }}>
                    กำลังแก้ไข: {selectedConfig.doc_type.toUpperCase()}
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
                    เงื่อนไข: {selectedConfig.trigger_value}
                  </h2>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button 
                    onClick={addStep}
                    style={{ padding: '10px 16px', border: '1px solid #d1d5db', borderRadius: 10, background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                  >
                    + เพิ่มขั้นตอน (Step)
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '10px 24px', border: 'none', borderRadius: 10, background: '#1d4ed8', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.3)' }}
                  >
                    {saving ? 'กำลังบันทึก...' : '💾 บันทึกการตั้งค่า'}
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                {steps.length === 0 ? (
                  <div style={{ padding: '60px 0', textAlign: 'center', color: '#9ca3af', border: '2px dashed #f3f4f6', borderRadius: 12 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🖇️</div>
                    <div>ยังไม่มีลำดับการอนุมัติ</div>
                    <button onClick={addStep} style={{ marginTop: 12, color: '#1d4ed8', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>กดเพื่อเริ่มเพิ่มขั้นตอนแรก</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {steps.map((step, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', gap: 20, alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6', position: 'relative',
                        animation: 'fadeIn 0.3s ease-out'
                      }}>
                        <div style={{ 
                          width: 40, height: 40, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)'
                        }}>
                          {step.step_order}
                        </div>
                        
                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>สิทธิ์ที่ต้องการ (Role)</label>
                            <select 
                              value={step.role_required} 
                              onChange={(e) => updateStep(idx, 'role_required', e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                            >
                              {roles.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>ระบุผู้อนุมัติเฉพาะเจาะจง (Optional)</label>
                            <select 
                              value={step.approver_id || ''} 
                              onChange={(e) => updateStep(idx, 'approver_id', e.target.value || null)}
                              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                            >
                              <option value="">-- อนุมัติโดยใครก็ได้ที่มีสิทธิ์ข้างต้น --</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button 
                          onClick={() => removeStep(idx)}
                          style={{ padding: '8px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.7 }}
                          title="ลบขั้นตอนนี้"
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '100px 0', textAlign: 'center', color: '#9ca3af' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
              <div>เลือกประเภทเอกสารทางด้านซ้ายเพื่อเริ่มตั้งค่า Workflow</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
