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

  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)

  const roleOptions = [
    { value: 'admin', label: 'Admin (System Role)' },
    { value: 'it_staff', label: 'IT Staff (System Role)' },
    { value: 'approver', label: 'Approver (System Role)' },
    { value: 'employee', label: 'Employee (System Role)' },
    { value: 'auditor', label: 'Auditor (System Role)' },
    { value: 'reporter', label: 'Reporter (Dynamic Role)' },
    { value: 'creator', label: 'Creator (Dynamic Role)' }
  ]

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'workflow_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### ⚙️ คู่มือการตั้งค่าลำดับการอนุมัติ (Workflow Guide)
ระบบใช้การอนุมัติแบบลำดับขั้น (Sequential Approval) โดยคุณสามารถกำหนดการอนุมัติในแต่ละระดับได้หลากหลายประเภท

---
#### **1. ประเภทบทบาทในการอนุมัติ (Role Types)**
การเลือกผู้อนุมัติแบ่งออกเป็น 2 กลุ่มหลัก เพื่อรองรับความยืดหยุ่นในแบบ Static และ Dynamic:

##### **A. System Roles (บทบาทระบบ)**
เป็นสิทธิ์ที่ถูกกำหนดไว้ตายตัวในโปรไฟล์ของผู้ใช้แต่ละคน:
- **Admin (System Role):** ผู้ดูแลระบบสูงสุด มีสิทธิ์จัดการและอนุมัติทุกส่วน
- **IT Staff (System Role):** เจ้าหน้าที่ไอที สำหรับขั้นตอนการแก้ไขหรือปฏิบัติงานด้านเทคนิค
- **Approver (System Role):** ผู้อนุมัติ/หัวหน้างานที่ได้รับมอบหมายสิทธิ์อนุมัติทั่วไป
- **Employee (System Role):** พนักงานทั่วไปในระบบ
- **Auditor (System Role):** ผู้ตรวจสอบระบบ

##### **B. Dynamic Roles (บทบาทแปรผันตามเอกสาร)**
เป็นสิทธิ์ที่จะถูกคำนวณและระบุตัวบุคคลโดยอัตโนมัติจากข้อมูลในเอกสารแต่ละฉบับ:
- **Creator (Dynamic Role):** ผู้สร้างเอกสาร (อ้างอิงจาก \`created_by_id\` และจะใช้ \`reported_by_id\` เป็นค่าสำรองหากไม่พบ)
- **Reporter (Dynamic Role):** ผู้แจ้งเรื่อง/ผู้รายงาน (อ้างอิงจาก \`reported_by_id\` และจะใช้ \`created_by_id\` เป็นค่าสำรองหากไม่พบ)

> 💡 **การประยุกต์ใช้:** ในกรณีที่เจ้าหน้าที่ IT Staff สร้างเอกสารแทนพนักงาน (IT Staff เป็น Creator, พนักงานเป็น Reporter) ระบบจะแยกแยะและส่งใบงานให้ผู้ที่เกี่ยวข้องลงนามตามจริงได้อย่างถูกต้องตามประเภทบทบาทที่เลือก

---
#### **2. สิทธิ์และผู้อนุมัติเฉพาะเจาะจง**
- **Role Only:** หากระบุเฉพาะบทบาท (Role) ใครก็ตามที่มีบทบาทนั้นจะสามารถเห็นและอนุมัติเอกสารในขั้นนั้นได้ (ใครอนุมัติก่อนถือว่าผ่านขั้นตอนนั้นทันที)
- **Specific Person:** หากระบุตัวบุคคล (User) ระบบจะเจาะจงให้บุคคลนั้นลงนามเท่านั้น แม้ว่าจะมีผู้ใช้อื่นที่มีบทบาทตรงกันก็จะไม่สามารถลงนามแทนได้

---
#### **3. เงื่อนไขการจัดเส้นทางอนุมัติ (Approval Routing Conditions)**
ระบบจะเลือกรูปแบบขั้นตอนอนุมัติตามประเภทและระดับเงื่อนไขของเอกสารแต่ละใบดังนี้:

##### **📋 Checklist Docs (เงื่อนไขตามความถี่)**
- **Daily (รายวัน):** กระบวนการสั้น กระชับ สำหรับงานประเมินประจำวัน
- **Weekly (รายสัปดาห์):** สำหรับงานประเมินสรุปรอบสัปดาห์
- **Monthly (รายเดือน):** สำหรับงานตรวจสอบประจำเดือนที่มีผู้เกี่ยวข้องมากขึ้น
- **Yearly (รายปี):** งานประเมินระดับปีที่ครอบคลุมหน่วยงานระดับผู้บริหาร

##### **🚨 Incidents (เงื่อนไขตามความรุนแรง)**
- **Low (ต่ำ):** สำหรับการซ่อมแซม/แก้ปัญหาระบบทั่วไปที่ไม่ส่งผลกระทบวงกว้าง
- **Medium (ปานกลาง):** สำหรับปัญหาเฉพาะด้านที่มีความสำคัญปานกลาง
- **High (สูง):** สำหรับปัญหาระบบหลักขัดข้องหรือส่งผลกระทบต่อธุรกิจสูง

---
#### **4. กฎการอนุมัติอัตโนมัติ (Auto-Approval Rules)**
ระบบมีกลไกตรวจสอบและอนุมัติอัตโนมัติเพื่อป้องกันการหยุดชะงักของงานดังนี้:
- **Auto-Approval (ไม่มีขั้นตอนอนุมัติ):** หากเงื่อนไขบางประเภท (เช่น Incident ความรุนแรงต่ำ หรือ Checklist รายวัน) ไม่มีการตั้งขั้นตอนการอนุมัติ (Steps) ไว้เลย เมื่อผู้ใช้กดส่งคำขออนุมัติ ระบบจะทำเครื่องหมายผ่านอนุมัติให้อัตโนมัติทันที
- **ผลลัพธ์ของ Auto-Approval:** เอกสารจะถูกปรับสถานะเป็น **Closed** และ **approved** ทันที พร้อมเรียกใช้ Post-Approval Sync ไปอัปเดตโมดูลอื่น (ถ้ามี)
- **การบันทึกประวัติ:** ระบบจะทำการบันทึก Log กลางในตาราง \`system_audit_logs\` โดยระบุ Action เป็น **Auto-Approved** และรายละเอียดระบุเหตุผลชัดเจนว่าได้รับการอนุมัติอัตโนมัติตามค่าตั้งคอนฟิก

---
#### **5. ผลของการแก้ไขตั้งค่า**
- การเปลี่ยนแปลงลำดับขั้นและการตั้งค่าจะมีผลกับ **เอกสารที่เริ่มส่งอนุมัติใหม่** หลังจากบันทึกค่าแล้วเท่านั้น เอกสารเดิมที่กำลังดำเนินขั้นตอนอยู่จะใช้โครงสร้างและลำดับเดิมจนเสร็จสิ้นกระบวนการ`)
    }
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    await supabase.from('system_settings').upsert({ key: 'workflow_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    setEditingGuide(false)
    setSaving(false)
  }

  const fetchInitialData = async () => {
    setLoading(true)
    const [{ data: rawConfs }, { data: usrs }] = await Promise.all([
      supabase.from('workflow_configs').select('*').order('target_type', { ascending: true }).order('condition_value', { ascending: true }).order('step_order', { ascending: true }),
      supabase.from('user_profiles').select('id, full_name, email, role').eq('is_active', true).order('full_name', { ascending: true })
    ])
    
    if (rawConfs) {
      const getTriggerValue = (c) => {
         if (c.target_type === 'checklist') {
            if (c.condition_value === '0') return 'ความถี่: Daily (รายวัน)'
            if (c.condition_value === '1') return 'ความถี่: Weekly (รายสัปดาห์)'
            if (c.condition_value === '2') return 'ความถี่: Monthly (รายเดือน)'
            if (c.condition_value === '3') return 'ความถี่: Yearly (รายปี)'
         }
         if (c.target_type === 'incident') {
            if (c.condition_value === '0') return 'ความรุนแรง: Low (ต่ำ)'
            if (c.condition_value === '1') return 'ความรุนแรง: Medium (ปานกลาง)'
            if (c.condition_value === '2') return 'ความรุนแรง: High (สูง)'
         }
         return 'ไม่ระบุเงื่อนไข'
      }

      // Group steps by config
      const grouped = {}
      rawConfs.forEach(row => {
        const key = `${row.target_type}_${row.condition_key}_${row.condition_value}`
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            target_type: row.target_type,
            condition_key: row.condition_key,
            condition_value: row.condition_value,
            trigger_value: getTriggerValue(row),
            steps: []
          }
        }
        grouped[key].steps.push({
          id: row.id,
          step_order: row.step_order,
          role_required: row.role_required,
          approver_id: row.approver_id
        })
      })
      
      const confList = Object.values(grouped)
      setConfigs(confList)
      if (confList.length > 0) {
         const currentKey = selectedConfig?.id
         const nextConfig = confList.find(c => c.id === currentKey) || confList[0]
         setSelectedConfig(nextConfig)
         setSteps(nextConfig.steps || [])
      } else {
         setSelectedConfig(null)
         setSteps([])
      }
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
    setSteps([...steps, { step_order: nextOrder, role_required: 'it_staff', approver_id: null }])
  }

  const removeStep = (idx) => {
    const newSteps = steps.filter((_, i) => i !== idx)
    const reordered = newSteps.map((s, i) => ({ ...s, step_order: i + 1 }))
    setSteps(reordered)
  }

  // Helper: Filter users based on selected role
  // Dynamic roles (reporter, creator) show all users
  // System roles filter by that specific role
  const getFilteredUsersForRole = (roleRequired) => {
    if (!roleRequired) return users
    const dynamicRoles = ['reporter', 'creator']
    if (dynamicRoles.includes(roleRequired)) {
      return users // Show all users for dynamic roles
    }
    return users.filter(u => u.role === roleRequired)
  }

  const updateStep = (idx, field, value) => {
    const newSteps = [...steps]
    newSteps[idx][field] = value
    
    // When role changes, clear approver_id if it doesn't match new role
    if (field === 'role_required') {
      const currentApproverId = newSteps[idx].approver_id
      if (currentApproverId) {
        const currentApprover = users.find(u => u.id === currentApproverId)
        const dynamicRoles = ['reporter', 'creator']
        if (currentApprover && !dynamicRoles.includes(value) && currentApprover.role !== value) {
          newSteps[idx].approver_id = null // Clear approver if role doesn't match
        }
      }
    }
    
    if (field === 'approver_id' && value) {
        const user = users.find(u => u.id === value)
        if (user) newSteps[idx].role_required = user.role
    }
    setSteps(newSteps)
  }

  const handleSave = async () => {
    if (!selectedConfig) return

    // 🛡️ [Phase 2] UI Guardrails
    if (selectedConfig.target_type === 'incident') {
      const hasDynamicRole = steps.some(s => ['reporter', 'creator'].includes(s.role_required))
      if (!hasDynamicRole) {
        alert('⚠️ ไม่สามารถบันทึกได้: Workflow ของ Incident จำเป็นต้องมีขั้นตอนสำหรับ "reporter" (ผู้แจ้ง) หรือ "creator" (ผู้สร้าง)')
        return
      }
    }

    setSaving(true)
    
    // 1. Delete existing steps for this config
    const { error: delErr } = await supabase
      .from('workflow_configs')
      .delete()
      .eq('target_type', selectedConfig.target_type)
      .eq('condition_key', selectedConfig.condition_key)
      .eq('condition_value', selectedConfig.condition_value)
      
    if (delErr) {
       alert(`Error deleting old configs: ${delErr.message}`)
       setSaving(false)
       return
    }
    
    // 2. Insert new steps
    if (steps.length > 0) {
        const inserts = steps.map((s, idx) => ({
            target_type: selectedConfig.target_type,
            condition_key: selectedConfig.condition_key,
            condition_value: selectedConfig.condition_value,
            step_order: idx + 1,
            role_required: s.role_required,
            approver_id: s.approver_id || null,
            is_active: true
        }))
        const { error: insErr } = await supabase.from('workflow_configs').insert(inserts)
        if (insErr) {
            alert(`Error saving: ${insErr.message}`)
            setSaving(false)
            return
        }
    }

    alert('💾 บันทึก Workflow สำเร็จ!')
    await recordLog('00000000-0000-0000-0000-000000000000', 'workflow_config', 'Updated', `ปรับปรุงลำดับการอนุมัติสำหรับ ${selectedConfig.target_type} (${selectedConfig.trigger_value})`, currentUser?.email)
    fetchInitialData()
    setSaving(false)
  }



  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchInitialData()
    fetchGuide()
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        supabase.from('user_profiles').select('*').eq('id', data.session.user.id).single().then(({ data: p }) => setCurrentUser(p))
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>กำลังโหลด...</div>

  return (
    <div className="workflow-settings-container" style={{ padding: 'var(--page-padding, 24px)', maxWidth: 1200, margin: '0 auto', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 1024px) {
          :root { --page-padding: 12px; }
          .workflow-layout { flex-direction: column !important; }
          .workflow-sidebar { 
            width: 100% !important; 
            display: flex !important; 
            overflow-x: auto !important; 
            gap: 8px !important; 
            padding: 8px !important;
            scrollbar-width: none;
            border-radius: 12px !important;
            margin-bottom: 16px !important;
          }
          .workflow-sidebar::-webkit-scrollbar { display: none; }
          .workflow-sidebar > div:first-child { display: none !important; } /* Hide label */
          .workflow-sidebar-list { display: flex !important; flex-direction: row !important; gap: 8px !important; }
          .workflow-sidebar-item { 
            white-space: nowrap !important; 
            padding: 8px 16px !important; 
            border: 1px solid #e2e8f0 !important;
            width: auto !important;
          }
          .workflow-content { padding: 20px !important; }
          .workflow-header { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
          .workflow-header-actions { width: 100% !important; display: flex !important; gap: 8px !important; }
          .workflow-header-actions button { flex: 1 !important; padding: 12px !important; font-size: 13px !important; }
          .step-row { flex-direction: column !important; align-items: flex-start !important; padding: 16px !important; }
          .step-inputs { grid-template-columns: 1fr !important; width: 100% !important; }
          .step-number { width: 32px !important; height: 32px !important; font-size: 14px !important; }
          .step-delete { position: absolute !important; top: 12px !important; right: 12px !important; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; }
      `}</style>
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>📖</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>Workflow Settings Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการตั้งค่าลำดับการอนุมัติ</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                {currentUser?.role === 'admin' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '14px 36px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end' }}>บันทึกคู่มือ</button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #7c3aed` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
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

      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.3)' }}>
              ⚙️
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              Workflow Settings
              <button className="no-print" onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#f5f3ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>กำหนดลำดับการอนุมัติสำหรับเอกสารประเภทต่างๆ ในระบบ</p>
        </div>
        <div className="action-dock no-print" style={{ display: 'flex', gap: 6, padding: '6px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <button 
            onClick={addStep}
            disabled={!selectedConfig}
            style={{ padding: '10px 20px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 14, fontSize: 13, fontWeight: 600, cursor: selectedConfig ? 'pointer' : 'not-allowed', opacity: selectedConfig ? 1 : 0.5 }}
          >
            ➕ เพิ่มขั้นตอน (Step)
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || !selectedConfig}
            style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 13, fontWeight: 800, cursor: selectedConfig ? 'pointer' : 'not-allowed', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.2)' }}
          >
            {saving ? 'กำลังบันทึก...' : '💾 บันทึก Workflow'}
          </button>
        </div>
      </div>

      <div className="workflow-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Left Sidebar: Config List */}
        <div className="workflow-sidebar" style={{ background: 'rgba(255, 255, 255, 0.6)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', padding: 12, height: 'fit-content', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', padding: '8px 12px', marginBottom: 8 }}>ประเภทเอกสาร</div>
          <div className="workflow-sidebar-list" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {configs.map(c => (
              <div 
                key={c.id} 
                onClick={() => handleSelectConfig(c)}
                className="workflow-sidebar-item"
                style={{ 
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s',
                  background: selectedConfig?.id === c.id ? '#eff6ff' : 'transparent',
                  color: selectedConfig?.id === c.id ? '#1d4ed8' : '#374151',
                  fontWeight: selectedConfig?.id === c.id ? 600 : 400,
                  border: `1px solid ${selectedConfig?.id === c.id ? '#bfdbfe' : 'transparent'}`,
                  width: '100%'
                }}
              >
                <div style={{ fontSize: 14 }}>{c.target_type === 'checklist' ? '📋 Checklist' : '🚨 Incident'}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{c.trigger_value}</div>
              </div>
            ))}
          </div>
          <button style={{ width: '100%', marginTop: 12, padding: '10px', border: '1px dashed #d1d5db', borderRadius: 10, background: 'none', color: '#6b7280', fontSize: 13, cursor: 'not-allowed' }}>
            + เพิ่มเงื่อนไขใหม่ (Coming Soon)
          </button>
        </div>

        {/* Right Content: Steps Editor */}
        <div className="workflow-content" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', padding: 32, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
          {selectedConfig ? (
            <>
              <div className="workflow-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#7c3aed', marginBottom: 4, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    EDITING WORKFLOW: {selectedConfig.target_type.toUpperCase()}
                    <span style={{ padding: '2px 8px', background: '#fef3c7', color: '#d97706', borderRadius: 6, fontSize: 11, border: '1px solid #fde68a' }}>
                      ⚡ ROLE-BASED DYNAMIC LOGIC
                    </span>
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
                    {selectedConfig.trigger_value}
                  </h2>
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
                      <div key={idx} className="step-row" style={{ 
                        display: 'flex', gap: 20, alignItems: 'center', padding: 20, background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6', position: 'relative',
                        animation: 'fadeIn 0.3s ease-out'
                      }}>
                        <div className="step-number" style={{ 
                          width: 40, height: 40, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0,
                          boxShadow: '0 4px 10px rgba(29, 78, 216, 0.2)'
                        }}>
                          {step.step_order}
                        </div>
                        
                        <div className="step-inputs" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
                          <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>สิทธิ์ที่ต้องการ (Role)</label>
                            <select 
                              value={step.role_required} 
                              onChange={(e) => updateStep(idx, 'role_required', e.target.value)}
                              style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                            >
                              {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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
                              {getFilteredUsersForRole(step.role_required).map(u => (
                                <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <button 
                          onClick={() => removeStep(idx)}
                          className="step-delete"
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
    </div>
  )
}
