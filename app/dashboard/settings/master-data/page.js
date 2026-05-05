'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'
import ApprovalFlowsPage from '../approvals/page'
import SubstitutesPage from '../substitutes/page'

const MASTER_GROUPS = [
  {
    name: 'Incident Setup',
    items: [
      { key: 'incident_category', label: 'Incident Category', icon: '🏷️' },
      { key: 'affected_system', label: 'Affected System', icon: '🖥️' },
      { key: 'sla_exclusion_reason', label: 'SLA Exclusion Reason', icon: '⏸️' },
    ]
  },
  {
    name: 'Checklist Setup',
    items: [
      { key: 'checklist_category', label: 'Checklist Category', icon: '📁' },
      { key: 'checklist_template', label: 'Checklist Master', icon: '📋' },
      { key: 'procedure_plan', label: 'Procedure Plans', icon: '📜' },
    ]
  },
  {
    name: 'General Setup',
    items: [
      { key: 'holidays', label: 'Holidays (วันหยุด)', icon: '🌴' },
      { key: 'working_hours', label: 'Working Hours', icon: '🕘' },
    ]
  },
  {
    name: 'Workflow Setup',
    items: [
      { key: 'approval_flows', label: 'Approval Flows', icon: '🛡️' },
      { key: 'substitutes', label: 'Substitute Approvers', icon: '👤' },
    ]
  }
]

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—'
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const [y, m, d] = parts
  const monthIdx = parseInt(m) - 1
  return `${d.padStart(2, '0')} / ${MONTHS_EN[monthIdx]} / ${y}`
}

const TEMPLATE_NAMES = {
  0: 'T0: Standard',
  1: 'T1: Photo Evidence',
  2: 'T2: Procedure Table',
  3: 'T3: Measurement',
  4: 'T4: Link Verification',
  5: 'T5: Sign-off'
}

const DAYS = [
  { id: 1, label: 'Monday', short: 'Mon' },
  { id: 2, label: 'Tuesday', short: 'Tue' },
  { id: 3, label: 'Wednesday', short: 'Wed' },
  { id: 4, label: 'Thursday', short: 'Thu' },
  { id: 5, label: 'Friday', short: 'Fri' },
  { id: 6, label: 'Saturday', short: 'Sat' },
  { id: 0, label: 'Sunday', short: 'Sun' },
]

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly']

// --- Modern Action Button Component ---
// --- Modern Action Button Component moved to @/app/dashboard/checklist/components/ActionButton.js ---

const TimePicker24 = ({ value, onChange, label }) => {
  const [show, setShow] = useState(false)
  const [h, m] = value ? value.split(':') : ['08', '00']
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const mins = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>{label}</label>
      <div onClick={() => setShow(!show)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 18, fontWeight: 700, color: '#1e293b', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s', borderLeft: '4px solid #3b82f6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 20 }}>🕒</span><span style={{ letterSpacing: '0.05em' }}>{h}:{m}</span></div>
        <span style={{ fontSize: 10, color: '#94a3b8' }}>{show ? '▲' : '▼'}</span>
      </div>
      {show && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShow(false)} />
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 10, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', zIndex: 999, width: 300, padding: 16, display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, maxHeight: 220, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>HOUR</div>
              {hours.map(hr => (
                <div key={hr} onClick={() => onChange(`${hr}:${m}`)} style={{ padding: '8px', textAlign: 'center', borderRadius: 10, cursor: 'pointer', fontSize: 14, background: hr === h ? '#3b82f6' : 'transparent', color: hr === h ? '#fff' : '#475569', fontWeight: hr === h ? 700 : 500 }}>{hr}</div>
              ))}
            </div>
            <div style={{ flex: 1, maxHeight: 220, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>MIN</div>
              {mins.map(mn => (
                <div key={mn} onClick={() => onChange(`${h}:${mn}`)} style={{ padding: '8px', textAlign: 'center', borderRadius: 10, cursor: 'pointer', fontSize: 14, background: mn === m ? '#3b82f6' : 'transparent', color: mn === m ? '#fff' : '#475569', fontWeight: mn === m ? 700 : 500 }}>{mn}</div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function MasterDataPage() {
  const [activeType, setActiveType] = useState('incident_category')
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editDate, setEditDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ freq_type: 'Daily', category: '', item_label: '', instruction: '', ui_template_type: 1, template_config: {} })
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayDesc, setNewHolidayDesc] = useState('')
  const [whSettings, setWhSettings] = useState({ start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] })
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [configModalItem, setConfigModalItem] = useState(null)
  const [procedurePlans, setProcedurePlans] = useState([])
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [freqFilter, setFreqFilter] = useState('All')
  const [monthFilter, setMonthFilter] = useState('All')

  useEffect(() => {
    const group = MASTER_GROUPS.find(g => g.items.some(i => i.key === activeType))
    if (group) setExpandedGroup(group.name)
  }, [activeType])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
        setCurrentUser(profile)
      }
    }
    getUser()
  }, [])

  const isVisitor = currentUser?.role === 'visitor'
  const isAdmin = currentUser?.role === 'administrator'
  const currentType = MASTER_GROUPS.flatMap(g => g.items).find(t => t.key === activeType)

  const fetchGuide = async () => {
    const guideKey = `${activeType}_guide_content`
    const { data } = await supabase.from('system_settings').select('value').eq('key', guideKey).single()
    if (data) setGuideContent(data.value)
    else {
      let content = ''
      if (activeType === 'incident_category') {
        content = `### 🏷️ การจัดการ Incident Category\nใช้สำหรับกำหนด "ประเภทของปัญหา" เพื่อนำไปแยกประเภทในรายงาน SLA และ KPI\n\n**ข้อแนะนำ:**\n1. ควรแบ่งกลุ่มตามลักษณะงาน เช่น Hardware, Software, Network หรือ Account\n2. ข้อมูลนี้จะปรากฏในหน้า Create Incident เพื่อให้ User หรือ Agent เลือก`
      } else if (activeType === 'affected_system') {
        content = `### 🖥️ การจัดการ Affected System\nใช้สำหรับระบุ "ระบบที่ได้รับผลกระทบ" เช่น SAP, Email, Internet, หรือ CCTV\n\n**ข้อแนะนำ:**\n1. ช่วยให้สามารถวิเคราะห์ได้ว่าระบบใดมีปัญหาบ่อยที่สุด (Top 5 Failed Systems)\n2. ใช้ในการประเมินความสำคัญ (Severity) ของปัญหาตามความสำคัญของระบบนั้นๆ`
      } else if (activeType === 'sla_exclusion_reason') {
        content = `### ⏸️ การจัดการ SLA Exclusion Reason\nเหตุผลที่ใช้ "หยุดเวลานับ SLA" ในกรณีที่ความล่าช้าไม่ได้เกิดจากทีม IT\n\n**ตัวอย่างเหตุผล:**\n- **Waiting for User:** รอข้อมูลหรือการยืนยันจากผู้ใช้\n- **Waiting for Vendor:** รอการดำเนินการจากผู้ให้บริการภายนอก\n- **Customer Request:** ลูกค้าขอยืดเวลาดำเนินการ\n\n**สำคัญ:** การใช้เหตุผลเหล่านี้จะทำให้ค่า KPI ของทีม IT ยังคงอยู่ในเกณฑ์แม้จะใช้เวลาปิดเคสนานขึ้น`
      } else if (activeType === 'checklist_category') {
        content = `### 📁 การจัดการ Checklist Category\nใช้สำหรับจัดกลุ่มรายการตรวจเช็ค (Checklist Master) ให้เป็นระเบียบ\n\n**ตัวอย่างการแบ่งกลุ่ม:**\n- **Server Room:** งานตรวจเช็คในห้อง Server\n- **Network Devices:** งานตรวจเช็คอุปกรณ์เครือข่าย\n- **Security:** งานตรวจด้านความปลอดภัย\n\n**ประโยชน์:** ช่วยให้พนักงานหาหัวข้อที่จะตรวจได้ง่ายขึ้นในหน้า Dashboard`
      } else if (activeType === 'checklist_template') {
        content = `### 📋 การจัดการ Checklist Master (Dynamic Engine)\nระบบโครงสร้างการตรวจงานแบบ 6 รูปแบบหลัก (T0-T5)\n\n---\n#### 📝 การระบุ "วิธีการตรวจสอบ" (Instruction)\nคุณสามารถระบุคำแนะนำหรือขั้นตอนการตรวจสอบให้ชัดเจนได้ในช่อง "วิธีการตรวจสอบ" ซึ่งข้อความนี้จะไปปรากฏในหน้า Checklist ของผู้ปฏิบัติงาน เพื่อให้รู้ว่าควรตรวจเช็คอย่างไร\n\n---\n#### 📖 รายละเอียด Template\n\n**T0: Standard**\n- การเช็ค OK/NG ทั่วไป ไม่มีการเก็บข้อมูลเพิ่มเติม\n- เหมาะสำหรับงานตรวจเช็คเบื้องต้น\n\n**T1: Photo Evidence**\n- บังคับถ่ายภาพตามจุดที่กำหนด (เช่น ตู้ Rack, หน้าจอ CCTV)\n- ระบบจะประทับลายน้ำ Timestamp อัตโนมัติ\n\n**T2: Procedure Table (SOP)**\n- ต้องทำตามขั้นตอน 1, 2, 3... ห้ามข้าม\n- เหมาะกับงาน Maintenance ใหญ่ หรือการซ้อมแผนฉุกเฉิน\n\n**T3: Measurement**\n- บันทึกค่าตัวเลข (เช่น อุณหภูมิ, แรงดันไฟฟ้า)\n- ระบบเช็ค Min/Max ทันที ถ้าไม่อยู่ในเกณฑ์จะแจ้งเตือน NG\n\n**T4: Link Verification**\n- สำหรับเปิดเช็คระบบ Cloud/Portal ภายนอก\n\n**T5: Sign-off**\n- ระบบอนุมัติและเซ็นชื่อดิจิทัลหลังจบงาน`
      } else if (activeType === 'holidays') {
        content = `### 🌴 การจัดการ Holidays (วันหยุด)\nใช้สำหรับกำหนดวันหยุดประจำปีของบริษัท เพื่อให้ระบบ "ไม่นับเวลา SLA" ในวันดังกล่าว\n\n**การใช้งาน:**\n1. สามารถเพิ่มทีละวัน หรือใช้ระบบ **Import CSV** เพื่อความรวดเร็ว\n2. ข้อมูลนี้จะถูกนำไปหักลบออกจากสูตรคำนวณระยะเวลาแก้ไขปัญหาอัตโนมัติ`
      } else if (activeType === 'working_hours') {
        content = `### 🕘 การจัดการ Working Hours (เวลาทำการ)\nกำหนดช่วงเวลาที่ทีม IT เริ่มและเลิกงานในแต่ละวัน\n\n**ผลกระทบ:**\n1. ระบบจะนับเวลา SLA เฉพาะในช่วงเวลาที่กำหนดเท่านั้น\n2. หากเคสเปิดนอกเวลาทำการ เวลาจะเริ่มนับเมื่อถึงเวลาเริ่มงานในวันทำการถัดไป\n3. **แนะนำ:** ตรวจสอบวันทำงาน (Mon-Fri) ให้ตรงกับนโยบายบริษัท`
      } else {
        content = `### 📖 คู่มือการใช้งาน ${activeType}\nกรุณาติดต่อ System Administrator เพื่อเพิ่มรายละเอียดคู่มือในส่วนนี้`
      }
      setGuideContent(content)
    }
  }

  useEffect(() => {
    fetchItems()
    if (activeType) {
      fetchGuide()
      setMsg({ text: '', type: '' })
      setSearchTerm('')
      setFreqFilter('All')
      setMonthFilter('All') // ล้างตัวกรองเดือนเมื่อเปลี่ยน Tab
    }
  }, [activeType])

  const handleSaveGuide = async () => {
    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({ key: `${activeType}_guide_content`, value: guideContent, updated_at: new Date().toISOString() })
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else { 
      setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
      setEditingGuide(false)
      setTimeout(() => setMsg({ text: '', type: '' }), 3000) // ล้างข้อความหลัง 3 วินาที
    }
    setSaving(false)
  }

  const handleDragStart = (e, item) => { setDraggedItem(item); e.dataTransfer.effectAllowed = "move" }
  const handleDragEnd = (e) => { setDraggedItem(null) }
  const handleDragOver = (e) => { e.preventDefault() }
  const handleDrop = async (e, targetItem, table) => {
    e.preventDefault()
    if (!draggedItem || draggedItem.id === targetItem.id) return
    const newItems = [...items]
    const dIdx = newItems.findIndex(i => i.id === draggedItem.id)
    const tIdx = newItems.findIndex(i => i.id === targetItem.id)
    newItems.splice(dIdx, 1); newItems.splice(tIdx, 0, draggedItem)
    setLoading(true)
    const updates = newItems.map((item, idx) => supabase.from(table).update({ sort_order: idx }).eq('id', item.id))
    await Promise.all(updates); await fetchItems(); setLoading(false)
  }

  const fetchItems = async () => {
    setLoading(true)
    if (activeType === 'checklist_template') {
      const { data } = await supabase.from('checklist_templates').select('*').order('freq_type').order('sort_order')
      setItems(data || [])
      const { data: catData } = await supabase.from('master_data').select('value').eq('type', 'checklist_category').eq('is_active', true)
      setCategories(catData?.map(c => c.value) || [])
    } else if (activeType === 'holidays') {
      const { data } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: false }); setItems(data || [])
    } else if (activeType === 'working_hours') {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'working_hours').single()
      if (data) setWhSettings(data.value); setItems([])
    } else if (activeType === 'procedure_plan') {
      const { data } = await supabase.from('checklist_procedure_plans').select('*').order('plan_name')
      setItems(data || [])
    } else {
      const { data } = await supabase.from('master_data').select('*').eq('type', activeType).order('sort_order'); setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { if (activeType === 'checklist_template') fetchProcedurePlans() }, [activeType])
  const fetchProcedurePlans = async () => { const { data } = await supabase.from('checklist_procedure_plans').select('*').order('plan_name'); setProcedurePlans(data || []) }

  const handleAddStandard = async () => {
    if (!newValue.trim()) return; setAdding(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1
    await supabase.from('master_data').insert([{ type: activeType, value: newValue.trim(), sort_order: maxOrder, is_active: true }])
    setNewValue(''); fetchItems(); setAdding(false)
  }

  const handleAddTemplate = async () => {
    if (!newTemplate.item_label.trim()) return; setAdding(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1
    await supabase.from('checklist_templates').insert([{ ...newTemplate, item_key: `custom_${Date.now()}`, sort_order: maxOrder, is_active: true }])
    setNewTemplate({ freq_type: 'Daily', category: categories[0] || '', item_label: '', instruction: '', ui_template_type: 1, template_config: {} }); fetchItems(); setAdding(false)
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayDesc.trim()) return; setAdding(true)
    
    // แปลง dd / mmm / yyyy หรือ dd/mm/yyyy เป็น ISO (YYYY-MM-DD)
    let isoDate = newHolidayDate
    const parts = newHolidayDate.split(/[\/\s-]+/).filter(Boolean)
    if (parts.length === 3) {
      let [d, m, y] = parts
      // จัดการเดือนที่เป็นชื่อย่อ
      const mIdx = MONTHS_EN.findIndex(month => month.toLowerCase() === m.toLowerCase())
      if (mIdx !== -1) m = (mIdx + 1).toString().padStart(2, '0')
      
      // ตรวจสอบว่าปีเป็น พ.ศ. หรือไม่ (ถ้า > 2400 ให้ลบ 543)
      if (parseInt(y) > 2400) y = (parseInt(y) - 543).toString()
      
      isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    const { error } = await supabase.from('holidays').insert([{ holiday_date: isoDate, description: newHolidayDesc.trim() }])
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setNewHolidayDate(''); setNewHolidayDesc(''); fetchItems()
    }
    setAdding(false)
  }
  
  const handleUpdateHoliday = async (id) => {
    setSaving(true)
    const { error } = await supabase.from('holidays').update({ holiday_date: editDate, description: editValue.trim() }).eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setEditingId(null); fetchItems(); setMsg({ text: 'อัปเดตข้อมูลสำเร็จ', type: 'success' })
      setTimeout(() => setMsg({ text: '', type: '' }), 3000)
    }
    setSaving(false)
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const csv = event.target.result; const lines = csv.split('\n')
      const records = lines.slice(1).filter(l => l.trim()).map(line => {
        const [date, desc] = line.split(','); return { holiday_date: date.trim(), description: desc.trim() }
      })
      setLoading(true); const { error } = await supabase.from('holidays').insert(records)
      if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
      else { setMsg({ text: `Imported ${records.length} holidays`, type: 'success' }); fetchItems() }
      setLoading(false)
    }
    reader.readAsText(file)
  }

  const downloadCSVTemplate = () => {
    const csv = "holiday_date,description\n2026-01-01,New Year's Day"; const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'holiday_template.csv'; a.click()
  }

  const handleSaveWorkingHours = async () => {
    setSaving(true); await supabase.from('system_settings').upsert({ key: 'working_hours', value: whSettings, updated_at: new Date().toISOString() })
    setMsg({ text: 'บันทึกสำเร็จ', type: 'success' }); setSaving(false); setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  const handleToggleDay = (id) => setWhSettings(p => ({ ...p, work_days: p.work_days.includes(id) ? p.work_days.filter(d => d !== id) : [...p.work_days, id].sort() }))
  const handleEditTemplate = async (item) => { setSaving(true); await supabase.from('checklist_templates').update({ freq_type: item.freq_type, category: item.category, item_label: item.item_label, instruction: item.instruction, ui_template_type: item.ui_template_type }).eq('id', item.id); setEditingId(null); fetchItems(); setSaving(false) }
  const handleEditStandard = async (id) => { if (!editValue.trim()) return; setSaving(true); await supabase.from('master_data').update({ value: editValue.trim() }).eq('id', id); setEditingId(null); fetchItems(); setSaving(false) }
  const handleToggle = async (id, cur, tbl = 'master_data') => { await supabase.from(tbl).update({ is_active: !cur }).eq('id', id); fetchItems() }
  const handleDelete = async (id, val, tbl = 'master_data') => { if (confirm(`ลบ "${val}"?`)) { await supabase.from(tbl).delete().eq('id', id); fetchItems() } }

  if (isVisitor) return <div style={{ padding: 100, textAlign: 'center' }}><h2>Access Denied</h2></div>

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Master Data & Settings</h1>
        <div style={{ fontSize: 13, color: '#64748b' }}>จัดการข้อมูลอ้างอิงและตั้งค่าระบบพื้นฐานทั้งหมด</div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, alignItems: 'flex-start' }}>
        {/* Sidebar */}
        <div style={{ width: 220, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '12px 0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexShrink: 0, position: 'sticky', top: 24 }}>
          {MASTER_GROUPS.map(g => (
            <div key={g.name} style={{ marginBottom: 4 }}>
              <div onClick={() => setExpandedGroup(expandedGroup === g.name ? null : g.name)} style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', padding: '10px 20px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {g.name} <span style={{ fontSize: 8 }}>{expandedGroup === g.name ? '▼' : '▶'}</span>
              </div>
              {expandedGroup === g.name && g.items.map(t => (
                <button key={t.key} onClick={() => { setActiveType(t.key); setEditingId(null) }} style={{ width: '100%', padding: '10px 20px', border: 'none', background: activeType === t.key ? '#eff6ff' : 'transparent', color: activeType === t.key ? '#2563eb' : '#475569', textAlign: 'left', cursor: 'pointer', fontWeight: activeType === t.key ? 700 : 500, fontSize: 13, borderLeft: activeType === t.key ? '4px solid #2563eb' : '4px solid transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              {currentType?.icon} {currentType?.label}
              <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#f1f5f9', width: 32, height: 32, borderRadius: 10, cursor: 'pointer', fontSize: 16 }}>📖</button>
            </h2>
            {activeType === 'holidays' && isAdmin && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={downloadCSVTemplate} style={{ fontSize: 12, padding: '8px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}>📄 Template</button>
                <label style={{ fontSize: 12, padding: '8px 20px', background: '#059669', color: '#fff', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}>📥 Import CSV <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} /></label>
              </div>
            )}
          </div>

          {msg.text && <div style={{ padding: '14px 20px', borderRadius: 14, fontSize: 13, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#bcf0da' : '#fecaca'}` }}>{msg.text}</div>}

          {/* Search & Filter Section */}
          {!['working_hours', 'approval_flows', 'substitutes'].includes(activeType) && (
            <div style={{ marginBottom: 4, display: 'flex', gap: 12 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
                <input 
                  placeholder={`ค้นหาใน ${currentType?.label}...`} 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width: '100%', padding: '14px 14px 14px 44px', border: '1px solid #e2e8f0', borderRadius: 18, fontSize: 14, background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', outline: 'none', transition: 'all 0.2s' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>
              {activeType === 'checklist_template' && (
                <select 
                  value={freqFilter}
                  onChange={e => setFreqFilter(e.target.value)}
                  style={{ width: 140, padding: '0 16px', border: '1px solid #e2e8f0', borderRadius: 18, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All">ทุกความถี่</option>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
              {activeType === 'holidays' && (
                <select 
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  style={{ width: 160, padding: '0 16px', border: '1px solid #e2e8f0', borderRadius: 18, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="All">ทุกเดือน</option>
                  {MONTHS_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Form Section */}
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            {activeType === 'approval_flows' ? (
              <ApprovalFlowsPage />
            ) : activeType === 'substitutes' ? (
              <SubstitutesPage />
            ) : activeType === 'working_hours' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', gap: 24 }}>
                  <TimePicker24 label="เวลาเริ่มงาน" value={whSettings.start} onChange={v => setWhSettings({ ...whSettings, start: v })} />
                  <TimePicker24 label="เวลาเลิกงาน" value={whSettings.end} onChange={v => setWhSettings({ ...whSettings, end: v })} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 12 }}>วันทำงานปกติ</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {DAYS.map(d => (
                      <button key={d.id} onClick={() => handleToggleDay(d.id)} style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid #e2e8f0', background: whSettings.work_days.includes(d.id) ? '#2563eb' : '#fff', color: whSettings.work_days.includes(d.id) ? '#fff' : '#475569', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}>{d.label}</button>
                    ))}
                  </div>
                </div>
                <button onClick={handleSaveWorkingHours} style={{ padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>บันทึกการตั้งค่าทั้งหมด</button>
              </div>
            ) : activeType === 'holidays' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ position: 'relative', width: 220 }}>
                  <input 
                    type="text" 
                    placeholder="dd / mmm / yyyy" 
                    value={newHolidayDate ? formatDateDisplay(newHolidayDate) : ''} 
                    readOnly
                    onClick={(e) => e.target.nextSibling.showPicker()}
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14, background: '#fff', cursor: 'pointer' }} 
                  />
                  <input 
                    type="date" 
                    value={newHolidayDate} 
                    onChange={e => setNewHolidayDate(e.target.value)} 
                    style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', pointerEvents: 'none' }} 
                  />
                </div>
                <input placeholder="ชื่อวันหยุด เช่น วันสงกรานต์..." value={newHolidayDesc} onChange={e => setNewHolidayDesc(e.target.value)} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14 }} />
                <button onClick={handleAddHoliday} style={{ padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600 }}>+ เพิ่มวันหยุด</button>
              </div>
            ) : activeType === 'checklist_template' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <select value={newTemplate.category} onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={newTemplate.freq_type} onChange={e => setNewTemplate({ ...newTemplate, freq_type: e.target.value })} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={newTemplate.ui_template_type} onChange={e => setNewTemplate({ ...newTemplate, ui_template_type: parseInt(e.target.value) })} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                    <option value={0}>T0: Standard</option>
                    <option value={1}>T1: Photo Evidence</option>
                    <option value={2}>T2: Procedure Table</option>
                    <option value={3}>T3: Measurement</option>
                    <option value={4}>T4: Link Verification</option>
                    <option value={5}>T5: Sign-off</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input value={newTemplate.item_label} onChange={e => setNewTemplate({ ...newTemplate, item_label: e.target.value })} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14 }} placeholder="ชื่อรายการตรวจเช็ค..." />
                  <input value={newTemplate.instruction || ''} onChange={e => setNewTemplate({ ...newTemplate, instruction: e.target.value })} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14 }} placeholder="วิธีการตรวจสอบ (ถ้ามี)..." />
                  <button onClick={handleAddTemplate} disabled={adding} style={{ width: 180, padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600 }}>{adding ? 'กำลังเพิ่ม...' : '+ เพิ่มข้อมูล'}</button>
                </div>
              </div>
            ) : activeType === 'procedure_plan' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <input value={newValue} onChange={e => setNewValue(e.target.value)} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14 }} placeholder="ชื่อแผนการตรวจสอบใหม่ เช่น SOP การกู้คืนระบบ..." />
                <button
                  onClick={async () => {
                    if (!newValue.trim()) return; setAdding(true)
                    const defaultSteps = {
                      columns: ["ลำดับ", "ขั้นตอนดำเนินการ", "ผู้รับผิดชอบ", "เกณฑ์วัดผล"],
                      rows: [
                        { "ลำดับ": "1", "ขั้นตอนดำเนินการ": "", "ผู้รับผิดชอบ": "", "เกณฑ์วัดผล": "" }
                      ]
                    }
                    await supabase.from('checklist_procedure_plans').insert([{ plan_name: newValue.trim(), steps: defaultSteps }])
                    setNewValue(''); fetchItems(); setAdding(false)
                  }}
                  style={{ padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600 }}
                >+ สร้างแผนใหม่</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <input value={newValue} onChange={e => setNewValue(e.target.value)} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14 }} placeholder={`ระบุ ${currentType?.label} ใหม่...`} />
                <button onClick={handleAddStandard} style={{ padding: '0 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 600 }}>+ เพิ่มข้อมูล</button>
              </div>
            )}
          </div>

          {/* Table Section */}
          {!['working_hours', 'approval_flows', 'substitutes'].includes(activeType) && (
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                  {activeType === 'holidays' ? (
                    <tr><th style={{ padding: '16px 20px', textAlign: 'left', width: 220 }}>วันที่</th><th style={{ padding: '16px 20px', textAlign: 'left' }}>วันหยุด</th><th style={{ padding: '16px 20px', textAlign: 'right', width: 100 }}>จัดการ</th></tr>
                  ) : activeType === 'checklist_template' ? (
                    <tr>
                      <th style={{ width: 60, padding: '16px 20px' }}>ลำดับ</th>
                      <th style={{ width: 160, padding: '16px 20px', textAlign: 'left' }}>หมวดหมู่ / ความถี่</th>
                      <th style={{ padding: '16px 20px', textAlign: 'left' }}>รายการ</th>
                      <th style={{ width: 180, padding: '16px 20px', textAlign: 'center' }}>Template</th>
                      <th style={{ width: 100, padding: '16px 20px', textAlign: 'center' }}>สถานะ</th>
                      <th style={{ width: 100, padding: '16px 20px', textAlign: 'right' }}>จัดการ</th>
                    </tr>
                  ) : activeType === 'procedure_plan' ? (
                    <tr><th style={{ padding: '16px 20px', textAlign: 'left' }}>ชื่อแผนการตรวจสอบ</th><th style={{ padding: '16px 20px', textAlign: 'left' }}>จำนวนขั้นตอน</th><th style={{ width: 120, padding: '16px 20px', textAlign: 'right' }}>จัดการ</th></tr>
                  ) : (
                    <tr><th style={{ width: 60, padding: '16px 20px' }}>ลำดับ</th><th style={{ padding: '16px 20px', textAlign: 'left' }}>รายการ</th><th style={{ width: 120, padding: '16px 20px', textAlign: 'center' }}>สถานะ</th><th style={{ width: 120, padding: '16px 20px', textAlign: 'right' }}>จัดการ</th></tr>
                  )}
                </thead>
                <tbody>
                  {items.filter(it => {
                    if (!searchTerm && freqFilter === 'All' && monthFilter === 'All') return true
                    const search = searchTerm.toLowerCase()
                    if (activeType === 'holidays') {
                      const matchesSearch = it.description.toLowerCase().includes(search) || formatDateDisplay(it.holiday_date).toLowerCase().includes(search)
                      // Fix: ใช้การตัดสตริงเพื่อความแม่นยำของเดือน
                      const itemMonth = parseInt(it.holiday_date.split('-')[1]) - 1
                      const matchesMonth = monthFilter === 'All' || itemMonth === parseInt(monthFilter)
                      return matchesSearch && matchesMonth
                    } else if (activeType === 'checklist_template') {
                      const matchesFreq = freqFilter === 'All' || it.freq_type === freqFilter
                      const matchesSearch = it.item_label.toLowerCase().includes(search) || it.category.toLowerCase().includes(search) || (it.instruction && it.instruction.toLowerCase().includes(search))
                      return matchesFreq && matchesSearch
                    } else if (activeType === 'procedure_plan') {
                      return it.plan_name.toLowerCase().includes(search)
                    } else {
                      return it.value && it.value.toLowerCase().includes(search)
                    }
                  }).map(it => (
                    <tr key={it.id} draggable={activeType !== 'holidays'} onDragStart={e => handleDragStart(e, it)} onDrop={e => handleDrop(e, it, activeType === 'checklist_template' ? 'checklist_templates' : 'master_data')} onDragOver={e => e.preventDefault()} style={{ borderBottom: '1px solid #f1f5f9', background: it.is_active ? '#fff' : '#fafafa' }}>
                      {activeType === 'holidays' ? (
                        <>
                          <td style={{ padding: '14px 20px' }}>
                            {editingId === it.id ? (
                              <div style={{ position: 'relative', width: '100%' }}>
                                <input 
                                  type="text" 
                                  value={editDate ? formatDateDisplay(editDate) : ''} 
                                  readOnly
                                  onClick={(e) => e.target.nextSibling.showPicker()}
                                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #3b82f6', borderRadius: 10, fontSize: 13, background: '#fff' }} 
                                />
                                <input 
                                  type="date" 
                                  value={editDate} 
                                  onChange={e => setEditDate(e.target.value)} 
                                  style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', pointerEvents: 'none' }} 
                                />
                              </div>
                            ) : (
                              <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatDateDisplay(it.holiday_date)}</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            {editingId === it.id ? (
                              <input 
                                value={editValue} 
                                onChange={e => setEditValue(e.target.value)} 
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #3b82f6', borderRadius: 10, fontSize: 13 }} 
                              />
                            ) : (
                              <span style={{ color: '#475569' }}>{it.description}</span>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              {editingId === it.id ? (
                                <>
                                  <ActionButton color="green" icon="✅" onClick={() => handleUpdateHoliday(it.id)} title="บันทึก" />
                                  <ActionButton color="gray" icon="❌" onClick={() => setEditingId(null)} title="ยกเลิก" />
                                </>
                              ) : (
                                <>
                                  <ActionButton color="blue" icon="✏️" onClick={() => { setEditingId(it.id); setEditDate(it.holiday_date); setEditValue(it.description) }} title="แก้ไข" />
                                  <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.description, 'holidays')} title="ลบ" />
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      ) : activeType === 'checklist_template' ? (
                        <>
                          <td style={{ textAlign: 'center', padding: '14px 20px', color: '#cbd5e1' }}>⠿</td>
                          <td style={{ padding: '14px 20px' }}>
                            {editingId === it.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <select value={it.category} onChange={e => {
                                  const newItems = [...items];
                                  const idx = newItems.findIndex(i => i.id === it.id);
                                  newItems[idx].category = e.target.value;
                                  setItems(newItems);
                                }} style={{ padding: '4px', borderRadius: 6, border: '1px solid #3b82f6', fontSize: 11 }}>
                                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={it.freq_type} onChange={e => {
                                  const newItems = [...items];
                                  const idx = newItems.findIndex(i => i.id === it.id);
                                  newItems[idx].freq_type = e.target.value;
                                  setItems(newItems);
                                }} style={{ padding: '4px', borderRadius: 6, border: '1px solid #3b82f6', fontSize: 11 }}>
                                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{it.category}</div>
                                <div style={{ fontSize: 11, color: '#64748b' }}>{it.freq_type}</div>
                              </>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px', color: '#1e293b', fontWeight: 500, verticalAlign: 'top' }}>
                            {editingId === it.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input value={it.item_label} onChange={e => {
                                  const newItems = [...items];
                                  const idx = newItems.findIndex(i => i.id === it.id);
                                  newItems[idx].item_label = e.target.value;
                                  setItems(newItems);
                                }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #3b82f6', width: '100%', fontSize: 13 }} placeholder="ชื่อรายการตรวจเช็ค..." />
                                <textarea value={it.instruction || ''} onChange={e => {
                                  const newItems = [...items];
                                  const idx = newItems.findIndex(i => i.id === it.id);
                                  newItems[idx].instruction = e.target.value;
                                  setItems(newItems);
                                }} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #cbd5e1', width: '100%', fontSize: 12, minHeight: 60, resize: 'vertical' }} placeholder="อธิบายวิธีการตรวจสอบสำหรับรายการนี้ (ไม่บังคับ)..." />
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{it.item_label}</span>
                                {it.instruction && (
                                  <div style={{ display: 'flex', gap: 6, background: '#f8fafc', border: '1px solid #f1f5f9', padding: '10px 12px', borderRadius: 8, marginTop: 4 }}>
                                    <span style={{ fontSize: 12 }}>📝</span>
                                    <div>
                                      <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', marginBottom: 2 }}>วิธีการตรวจสอบ:</div>
                                      <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{it.instruction}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px 20px' }}>
                            {editingId === it.id ? (
                              <select value={it.ui_template_type} onChange={e => {
                                const newItems = [...items];
                                const idx = newItems.findIndex(i => i.id === it.id);
                                newItems[idx].ui_template_type = parseInt(e.target.value);
                                setItems(newItems);
                              }} style={{ padding: '4px', borderRadius: 6, border: '1px solid #3b82f6', fontSize: 11 }}>
                                {Object.entries(TEMPLATE_NAMES).map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            ) : (
                              it.ui_template_type > 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: 6 }}>
                                  {TEMPLATE_NAMES[it.ui_template_type]}
                                </span>
                              ) : null
                            )}
                          </td>
                          <td style={{ textAlign: 'center', padding: '14px 20px' }}>
                            <span onClick={() => handleToggle(it.id, it.is_active, 'checklist_templates')} style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: it.is_active ? '#dcfce7' : '#f1f5f9', color: it.is_active ? '#166534' : '#64748b' }}>{it.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <ActionButton color="blue" icon={editingId === it.id ? '💾' : '✏️'} onClick={() => editingId === it.id ? handleEditTemplate(it) : setEditingId(it.id)} title="แก้ไข" />
                              <ActionButton color="green" icon="⚙️" onClick={() => setConfigModalItem(it)} title="ตั้งค่า Template" />
                              <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.item_label, 'checklist_templates')} title="ลบ" />
                            </div>
                          </td>
                        </>
                      ) : activeType === 'procedure_plan' ? (
                        <>
                          <td style={{ padding: '14px 20px' }}>
                            {editingId === it.id ? (
                              <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #3b82f6', width: '100%' }} />
                            ) : (
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{it.plan_name}</div>
                            )}
                          </td>
                          <td style={{ padding: '14px 20px' }}>
                            <div style={{ fontSize: 12, color: '#64748b' }}>{(it.steps || []).length} ขั้นตอน</div>
                          </td>
                          <td style={{ textAlign: 'right', padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <ActionButton color="green" icon="⚙️" onClick={() => setConfigModalItem(it)} title="จัดการขั้นตอน" />
                              <ActionButton color="blue" icon={editingId === it.id ? '💾' : '✏️'} onClick={() => {
                                if (editingId === it.id) {
                                  supabase.from('checklist_procedure_plans').update({ plan_name: editValue }).eq('id', it.id).then(() => { setEditingId(null); fetchItems(); })
                                } else {
                                  setEditingId(it.id); setEditValue(it.plan_name);
                                }
                              }} title="แก้ไขชื่อ" />
                              <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.plan_name, 'checklist_procedure_plans')} title="ลบ" />
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ textAlign: 'center', padding: '14px 20px', color: '#cbd5e1' }}>⠿</td>
                          <td style={{ padding: '14px 20px', color: '#1e293b', fontWeight: 500 }}>{editingId === it.id ? <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #3b82f6', width: '100%' }} /> : (it.value || it.item_label)}</td>
                          <td style={{ textAlign: 'center', padding: '14px 20px' }}>
                            <span onClick={() => handleToggle(it.id, it.is_active)} style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: it.is_active ? '#dcfce7' : '#f1f5f9', color: it.is_active ? '#166534' : '#64748b' }}>{it.is_active ? 'Active' : 'Inactive'}</span>
                          </td>
                          <td style={{ textAlign: 'right', padding: '14px 20px' }}>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <ActionButton color="blue" icon={editingId === it.id ? '💾' : '✏️'} onClick={() => editingId === it.id ? handleEditStandard(it.id) : { setEditingId: setEditingId(it.id), setEditValue: setEditValue(it.value || it.item_label) }} title="แก้ไข" />
                              <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.value || it.item_label)} title="ลบ" />
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📖</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Guide & Documentation</h3>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>คู่มือการใช้งานและการตั้งค่า</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {isAdmin && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 32, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 400, padding: 20, borderRadius: 16, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 13 }} />
                  <button onClick={handleSaveGuide} style={{ padding: '12px 32px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-end' }}>บันทึกเนื้อหา</button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => {
                    const isCard = section.includes('####')
                    const typeMatch = section.match(/#### T(\d)/)
                    const type = typeMatch ? typeMatch[1] : (section.includes('####') ? '0' : null)
                    return (
                      <div key={sIdx} style={{
                        background: isCard ? '#fff' : 'transparent',
                        borderRadius: 16, padding: isCard ? 24 : 0,
                        marginBottom: isCard ? 20 : 32,
                        borderLeft: isCard ? `5px solid ${['#94a3b8', '#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#f43f5e'][type || 0]}` : 'none',
                        boxShadow: isCard ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
                      }}>
                        <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                          {section.trim().split('\n').map((line, lIdx) => {
                            if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                            if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                            return <p key={lIdx} style={{ margin: '0 0 8px 0' }}>{line.includes('**') ? line.split('**').map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#1e3a8a' }}>{p}</strong> : p) : line}</p>
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
      {configModalItem && (
        <TemplateConfigModal
          item={configModalItem}
          onClose={() => setConfigModalItem(null)}
          onSave={async (config) => {
            const isPlan = !!configModalItem.plan_name
            const table = isPlan ? 'checklist_procedure_plans' : 'checklist_templates'
            const field = isPlan ? 'steps' : 'template_config'
            const { error } = await supabase.from(table).update({ [field]: config }).eq('id', configModalItem.id)
            if (error) alert(error.message)
            else {
              setConfigModalItem(null)
              fetchItems()
            }
          }}
          procedurePlans={procedurePlans}
        />
      )}
    </div>
  )
}

function TemplateConfigModal({ item, onClose, onSave, procedurePlans }) {
  const isPlan = !!item.plan_name
  const defaultPlanSteps = { columns: ["ลำดับ", "ขั้นตอนดำเนินการ"], rows: [{ "ลำดับ": "1", "ขั้นตอนดำเนินการ": "" }] }
  const [config, setConfig] = useState(isPlan ? (item.steps?.columns ? item.steps : (Array.isArray(item.steps) ? { columns: ["ขั้นตอน"], rows: item.steps.map(s => ({ "ขั้นตอน": s })) } : defaultPlanSteps)) : (item.template_config || {}))
  const type = item.ui_template_type

  const handleSave = () => onSave(config)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, width: '95%', maxWidth: 1400, height: '90vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>{isPlan ? 'Plan Steps Setup' : 'Template Configuration'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{isPlan ? item.plan_name : item.item_label}</div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
        </div>

        <div style={{ padding: 32, flex: 1, overflowY: 'auto' }}>
          {isPlan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>📐 ตั้งค่าหัวข้อคอลัมน์ (Table Columns)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  {(config.columns || []).map((col, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: 8, fontSize: 12 }}>
                      <input
                        value={col}
                        onChange={e => {
                          const oldVal = config.columns[idx]
                          const newVal = e.target.value
                          const newCols = [...config.columns]
                          newCols[idx] = newVal
                          const newRows = config.rows.map(r => {
                            const newR = { ...r, [newVal]: r[oldVal] }
                            delete newR[oldVal]
                            return newR
                          })
                          setConfig({ ...config, columns: newCols, rows: newRows })
                        }}
                        style={{ border: 'none', outline: 'none', width: 80 }}
                      />
                      <button onClick={() => {
                        const colToRem = config.columns[idx]
                        const newCols = config.columns.filter((_, i) => i !== idx)
                        const newRows = config.rows.map(r => { const newR = { ...r }; delete newR[colToRem]; return newR })
                        setConfig({ ...config, columns: newCols, rows: newRows })
                      }} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
                    </div>
                  ))}
                  <button onClick={() => setConfig({ ...config, columns: [...(config.columns || []), "คอลัมน์ใหม่"] })} style={{ border: '1px dashed #cbd5e1', background: '#fff', padding: '4px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#64748b' }}>+ เพิ่มหัวข้อ</button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8 }}>📝 ข้อมูลขั้นตอน (Procedure Data)</label>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {(config.columns || []).map(col => <th key={col} style={{ padding: 10, textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>{col}</th>)}
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(config.rows || []).map((row, rIdx) => (
                        <tr key={rIdx}>
                          {(config.columns || []).map(col => (
                            <td key={col} style={{ padding: 4, borderBottom: '1px solid #f1f5f9' }}>
                              <input
                                value={row[col] || ""}
                                onChange={e => {
                                  const newRows = [...config.rows]
                                  newRows[rIdx] = { ...newRows[rIdx], [col]: e.target.value }
                                  setConfig({ ...config, rows: newRows })
                                }}
                                style={{ width: '100%', padding: '6px 8px', border: '1px solid transparent', borderRadius: 6, fontSize: 12 }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = 'transparent'}
                              />
                            </td>
                          ))}
                          <td style={{ padding: 4, textAlign: 'center' }}>
                            <button onClick={() => setConfig({ ...config, rows: config.rows.filter((_, i) => i !== rIdx) })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#fca5a5' }}>🗑</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button
                    onClick={() => setConfig({ ...config, rows: [...(config.rows || []), {}] })}
                    style={{ width: '100%', padding: 10, background: '#fff', border: 'none', borderTop: '1px solid #e2e8f0', color: '#2563eb', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                  >+ เพิ่มแถวใหม่</button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {type === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>📍 จุดที่ต้องถ่ายภาพ (Photo Points)</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(config.photo_points || ["ภาพยืนยัน"]).map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 8 }}>
                          <input
                            value={p}
                            onChange={e => {
                              const newPoints = [...(config.photo_points || ["ภาพยืนยัน"])]
                              newPoints[idx] = e.target.value
                              setConfig({ ...config, photo_points: newPoints })
                            }}
                            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14 }}
                            placeholder="ชื่อจุดตรวจสอบ เช่น กล้องตัวที่ 1..."
                          />
                          <button
                            onClick={() => {
                              const newPoints = (config.photo_points || ["ภาพยืนยัน"]).filter((_, i) => i !== idx)
                              setConfig({ ...config, photo_points: newPoints })
                            }}
                            style={{ padding: '0 12px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: 10, cursor: 'pointer' }}
                          >🗑</button>
                        </div>
                      ))}
                      <button
                        onClick={() => setConfig({ ...config, photo_points: [...(config.photo_points || ["ภาพยืนยัน"]), "จุดใหม่"] })}
                        style={{ padding: '10px', background: '#f0fdf4', border: '1px dashed #bcf0da', color: '#166534', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                      >+ เพิ่มจุดถ่ายภาพ</button>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.require_timestamp ?? false} onChange={e => setConfig({ ...config, require_timestamp: e.target.checked })} style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>บังคับลายน้ำ Timestamp ในภาพ</span>
                  </label>
                </div>
              )}

              {type === 2 && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 10 }}>📋 เลือกแผนการตรวจสอบ (Procedure Plan)</label>
                  <select
                    value={config.plan_id || ""}
                    onChange={e => setConfig({ ...config, plan_id: e.target.value })}
                    style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 14 }}
                  >
                    <option value="">-- เลือกแผน --</option>
                    {procedurePlans.map(p => <option key={p.id} value={p.id}>{p.plan_name}</option>)}
                  </select>
                </div>
              )}

              {type === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>ค่าต่ำสุด (Min)</label>
                      <input type="number" value={config.min || ""} onChange={e => setConfig({ ...config, min: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>ค่าสูงสุด (Max)</label>
                      <input type="number" value={config.max || ""} onChange={e => setConfig({ ...config, max: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>หน่วย (Unit)</label>
                    <input placeholder="เช่น °C, V, %" value={config.unit || ""} onChange={e => setConfig({ ...config, unit: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  </div>
                </div>
              )}

              {type === 4 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Target URL</label>
                    <input placeholder="https://..." value={config.url || ""} onChange={e => setConfig({ ...config, url: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={config.note_required ?? false} onChange={e => setConfig({ ...config, note_required: e.target.checked })} style={{ width: 18, height: 18 }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#334155' }}>บังคับระบุหมายเหตุหลังเปิดลิงก์</span>
                  </label>
                </div>
              )}

              {![1, 2, 3, 4].includes(type) && (
                <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 14 }}>
                  Template นี้ไม่มีการตั้งค่าเพิ่มเติม
                </div>
              )}
            </>
          )}
        </div>

        <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>ยกเลิก</button>
          <button onClick={handleSave} style={{ padding: '10px 30px', borderRadius: 12, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>บันทึกตั้งค่า</button>
        </div>
      </div>
    </div>
  )
}
