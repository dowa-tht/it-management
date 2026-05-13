'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'

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
]

const TEMPLATE_NAMES = {
  0: 'T0: Standard',
  1: 'T1: Photo Evidence',
  2: 'T2: Procedure Table',
  3: 'T3: Measurement',
  4: 'T4: Link Verification',
  5: 'T5: Sign-off'
}

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly']

const DEFAULT_MASTER_GUIDES = {
  incident_category: `### 🏷️ Incident Category Guide
หมวดหมู่ของเหตุการณ์ขัดข้อง ใช้สำหรับจัดกลุ่มปัญหาเพื่อให้สามารถออกรายงานสรุปและวิเคราะห์สาเหตุเชิงลึกได้

---
#### ➕ วิธีเพิ่มข้อมูล
1. พิมพ์ชื่อหมวดหมู่ในช่อง "เพิ่ม Incident Category ใหม่..."
2. กดปุ่ม "+ เพิ่มข้อมูล"
3. ข้อมูลจะถูกจัดเก็บและพร้อมใช้งานในหน้าการรายงาน Incident ทันที

---
#### ✏️ การแก้ไขและลบ
- **การแก้ไข**: คลิกที่ชื่อรายการเพื่อแก้ไขข้อความ และกด Enter หรือคลิกนอกช่องเพื่อบันทึก
- **การปิดใช้งาน**: คลิกที่ปุ่มสถานะ (Active/Inactive) เพื่อซ่อนหมวดหมู่จากหน้าจอผู้ใช้โดยไม่ต้องลบข้อมูล
- **การลบ**: ใช้ปุ่มถังขยะ 🗑️ เพื่อลบข้อมูล (แนะนำให้ใช้การปิดใช้งานแทนหากข้อมูลถูกนำไปใช้งานแล้ว)

---
#### ⚠️ ข้อควรระวัง
หากหมวดหมู่ถูกนำไปผูกกับ Incident เดิมแล้ว การเปลี่ยนชื่ออาจส่งผลต่อความถูกต้องของรายงานในอดีต`,
  affected_system: `### 🖥️ Affected System Guide
รายการระบบหรืออุปกรณ์ที่ได้รับผลกระทบ เพื่อระบุว่าปัญหาเกิดขึ้นที่จุดใดใน Infrastructure

---
#### ➕ วิธีเพิ่มข้อมูล
ระบุชื่อระบบ (เช่น SAP, Network, Email Server) และกดปุ่ม "+ เพิ่มข้อมูล"

---
#### ⚙️ การจัดการ
- ใช้ **Inactive** สำหรับระบบที่ยกเลิกการใช้งานแล้ว
- ระบบที่ตั้งค่าที่นี่จะไปแสดงผลในขั้นตอนการรายงานเหตุการณ์ (Step 1)`,
  sla_exclusion_reason: `### ⏸️ SLA Exclusion Reason Guide
เหตุผลที่ใช้ในการหยุดนับเวลา SLA (Pause SLA) ในกรณีที่ความล่าช้าไม่ได้เกิดจากทีม IT

---
#### 💡 ตัวอย่างการใช้งาน
- **Waiting for Spare Parts**: รอนำเข้าอะไหล่จากต่างประเทศ
- **Waiting for Third Party**: รอการแก้ไขจากผู้ให้บริการภายนอก (Vendor)
- **User Unreachable**: ไม่สามารถติดต่อผู้แจ้งเหตุได้

---
#### ⚠️ ผลกระทบ
เหตุผลเหล่านี้จะปรากฏในหน้าแก้ไข Incident เมื่อมีการเลือกสถานะที่ต้องการหยุดนับเวลา`,
  checklist_category: `### 📁 Checklist Category Guide
การจัดกลุ่มแผนการตรวจเช็ค (Checklist) ตามลักษณะงานหรือหน่วยงาน

---
#### ➕ การใช้งาน
- ใช้จัดกลุ่มในหน้า Dashboard และการค้นหา
- หมวดหมู่เหล่านี้จะถูกนำไปเลือกใช้ในหน้า "Checklist Master"`,
  checklist_template: `### 📋 Checklist Master Guide
กำหนดรายการตรวจเช็ค (Inspection Items) และรูปแบบการเก็บข้อมูล

---
#### ➕ วิธีเพิ่มรายการ
1. เลือก **หมวดหมู่** และ **ความถี่** (Daily/Weekly/...)
2. พิมพ์ชื่อรายการตรวจเช็ค
3. กดปุ่ม "+ เพิ่มรายการ"

---
#### ⚙️ การตั้งค่า UI Template
แต่ละรายการสามารถเลือกรูปแบบการตอบกลับได้ (คลิกปุ่ม ⚙️ ที่รายการเพื่อตั้งค่า):
- **Standard**: ผ่าน/ไม่ผ่าน
- **Photo Evidence**: ต้องแนบรูปถ่าย
- **Measurement**: กรอกตัวเลขและตรวจสอบช่วงค่าที่ยอมรับได้
- **Procedure Table**: การตรวจเช็คแบบตารางขั้นตอน`,
  procedure_plan: `### 📜 Procedure Plans Guide
ชุดขั้นตอนการแก้ไขปัญหา (SOP) ที่จะแสดงให้ผู้ปฏิบัติงานเห็นเมื่อพบปัญหาใน Checklist

---
#### ➕ การใช้งาน
1. สร้างแผนใหม่ด้วยชื่อที่เข้าใจง่าย
2. คลิก **Edit (✏️)** เพื่อเข้าไปเพิ่มขั้นตอนการทำงานทีละ Step
3. นำแผนนี้ไปผูกกับ Checklist Item ในหน้า Checklist Master`
}

export function MasterDataStandalonePage({ forcedGroup, initialType, title, subtitle }) {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading Master Data...</div>}>
      <MasterDataContent forcedGroup={forcedGroup} initialType={initialType} title={title} subtitle={subtitle} />
    </Suspense>
  )
}

function MasterDataContent({ forcedGroup, initialType, title, subtitle }) {
  const searchParams = useSearchParams()
  const paramGroup = forcedGroup || searchParams.get('group')
  const paramType = searchParams.get('type')

  const [activeType, setActiveType] = useState(initialType || (paramGroup === 'checklist' ? 'checklist_category' : 'incident_category'))
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ freq_type: 'Daily', category: '', item_label: '', instruction: '', ui_template_type: 1, template_config: {} })
  const [expandedGroup, setExpandedGroup] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [configModalItem, setConfigModalItem] = useState(null)
  const [procedurePlans, setProcedurePlans] = useState([])
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [freqFilter, setFreqFilter] = useState('All')

  const isCompactMasterData = paramGroup === 'incident'

  const visibleGroups = MASTER_GROUPS.filter(g => {
    if (!paramGroup) return true
    if (paramGroup === 'incident') return g.name === 'Incident Setup'
    if (paramGroup === 'checklist') return g.name === 'Checklist Setup'
    return true
  })

  useEffect(() => {
    if (!forcedGroup && paramType) {
      const exists = MASTER_GROUPS.flatMap(g => g.items).some(i => i.key === paramType)
      if (exists) setActiveType(paramType)
    }
  }, [paramType, forcedGroup])

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
    fetchItems()
  }, [activeType])

  const isAdmin = currentUser?.role === 'admin'
  const currentType = MASTER_GROUPS.flatMap(g => g.items).find(t => t.key === activeType)

  const fetchGuide = async () => {
    const guideKey = `${activeType}_guide_content`
    const { data } = await supabase.from('system_settings').select('value').eq('key', guideKey).single()
    if (data?.value) setGuideContent(data.value)
    else setGuideContent(DEFAULT_MASTER_GUIDES[activeType] || `### 📖 ${currentType?.label} Guide\n(เนื้อหาคู่มือยังไม่ได้ตั้งค่า)`)
  }

  useEffect(() => {
    if (showGuide) fetchGuide()
  }, [showGuide, activeType])

  const fetchItems = async () => {
    setLoading(true)
    if (activeType === 'checklist_template') {
      const { data } = await supabase.from('checklist_templates').select('*').order('freq_type').order('sort_order')
      setItems(data || [])
      const { data: catData } = await supabase.from('master_data').select('value').eq('type', 'checklist_category').eq('is_active', true)
      setCategories(catData?.map(c => c.value) || [])
    } else if (activeType === 'procedure_plan') {
      const { data } = await supabase.from('checklist_procedure_plans').select('*').order('plan_name')
      setItems(data || [])
    } else {
      const { data } = await supabase.from('master_data').select('*').eq('type', activeType).order('sort_order')
      setItems(data || [])
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

  const handleSaveGuide = async () => {
    setSaving(true)
    const guideKey = `${activeType}_guide_content`
    const { error } = await supabase.from('system_settings').upsert({ key: guideKey, value: guideContent, updated_at: new Date().toISOString() })
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
      setEditingGuide(false)
    }
    setSaving(false)
  }

  const handleDelete = async (id, label, table = 'master_data') => {
    if (!confirm(`ยืนยันการลบ "${label}"?`)) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else fetchItems()
  }

  const handleToggle = async (id, currentStatus, table = 'master_data') => {
    await supabase.from(table).update({ is_active: !currentStatus }).eq('id', id)
    fetchItems()
  }

  const handleEditTemplate = async (it) => {
    setSaving(true)
    const { error } = await supabase.from('checklist_templates').update({
      category: it.category,
      freq_type: it.freq_type,
      item_label: it.item_label,
      instruction: it.instruction,
      ui_template_type: it.ui_template_type
    }).eq('id', it.id)
    if (!error) {
      setEditingId(null)
      fetchItems()
    }
    setSaving(false)
  }

  const filteredItems = items.filter(it => {
    const searchVal = it.value?.toLowerCase() || ''
    const matchesSearch = searchVal.includes(searchTerm.toLowerCase())
    if (freqFilter === 'All') return matchesSearch
    return matchesSearch && it.freq_type === freqFilter
  })

  return (
    <div className="master-data-container" style={{ padding: 'var(--page-padding, 24px)', background: '#f8fafc', minHeight: '100vh' }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 1024px) {
          .master-layout { flex-direction: column !important; }
          .sidebar-nav { width: 100% !important; position: static !important; margin-bottom: 20px; }
          .sidebar-group { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px; }
          .sidebar-group-title { width: 100%; margin-bottom: 5px; }
          .sidebar-item { 
            width: auto !important; 
            padding: 8px 16px !important; 
            border-radius: 12px !important;
            border: 1px solid #e2e8f0 !important;
          }
          :root { --page-padding: 12px; }
          .form-section { flex-direction: column !important; gap: 12px !important; }
          .form-section > * { width: 100% !important; }
          .table-wrapper { overflow-x: auto !important; margin: 0 -12px !important; }
          .master-table { min-width: 600px !important; }
          .checklist-table { min-width: 900px !important; }
        }
        * { box-sizing: border-box; }
      `}</style>
      <div className="header-flex" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(29, 78, 216, 0.3)' }}>
              {paramGroup === 'checklist' ? '📋' : '🏷️'}
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              {title}
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>{subtitle}</p>
        </div>
      </div>

      <div className="master-layout" style={{ display: 'flex', gap: 24, flex: 1, alignItems: 'flex-start', maxWidth: '100%' }}>
        {/* Sidebar */}
        <div className="sidebar-nav" style={{ width: 220, background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: '12px 0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexShrink: 0, position: 'sticky', top: 24 }}>
          {visibleGroups.map(g => (
            <div key={g.name} className="sidebar-group" style={{ marginBottom: 4 }}>
              <div className="sidebar-group-title" onClick={() => setExpandedGroup(expandedGroup === g.name ? null : g.name)} style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', padding: '10px 20px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {g.name} <span style={{ fontSize: 8 }}>{expandedGroup === g.name ? '▼' : '▶'}</span>
              </div>
              {(expandedGroup === g.name || (typeof window !== 'undefined' && window.innerWidth <= 1024)) && g.items.map(t => (
                <button key={t.key} className="sidebar-item" onClick={() => { setActiveType(t.key); setEditingId(null) }} style={{ width: '100%', padding: '10px 20px', border: 'none', background: activeType === t.key ? '#eff6ff' : 'transparent', color: activeType === t.key ? '#2563eb' : '#475569', textAlign: 'left', cursor: 'pointer', fontWeight: activeType === t.key ? 700 : 500, fontSize: 13, borderLeft: activeType === t.key ? '4px solid #2563eb' : '4px solid transparent', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  <span style={{ lineHeight: 1.3 }}>{t.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="main-content-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, maxWidth: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{currentType?.icon}</span>
              {currentType?.label}
              <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#eff6ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h2>
          </div>

          {msg.text && <div style={{ padding: '14px 20px', borderRadius: 14, fontSize: 13, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#bcf0da' : '#fecaca'}` }}>{msg.text}</div>}

          {/* Search & Filter */}
          <div className="responsive-flex" style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
              <input 
                placeholder={`ค้นหาใน ${currentType?.label}...`} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: isCompactMasterData ? '10px 12px 10px 38px' : '14px 14px 14px 44px', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: isCompactMasterData ? 12 : 18, 
                  fontSize: 14, 
                  background: '#fff', 
                  outline: 'none' 
                }}
              />
            </div>
            {activeType === 'checklist_template' && (
              <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)} style={{ width: 140, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 18, fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                <option value="All">ทุกความถี่</option>
                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </div>

          {/* Add Form */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(20px)', 
            borderRadius: isCompactMasterData ? 16 : 24, 
            border: '1px solid #e2e8f0', 
            padding: isCompactMasterData ? '16px' : 24, 
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
          }}>
            {activeType === 'checklist_template' ? (
              <div className="form-section" style={{ display: 'flex', gap: 12 }}>
                <select value={newTemplate.category} onChange={e => setNewTemplate({ ...newTemplate, category: e.target.value })} style={{ width: 160, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                  <option value="">-- หมวดหมู่ --</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={newTemplate.freq_type} onChange={e => setNewTemplate({ ...newTemplate, freq_type: e.target.value })} style={{ width: 140, padding: '12px', border: '1px solid #e2e8f0', borderRadius: 14 }}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <input placeholder="ชื่อรายการ..." value={newTemplate.item_label} onChange={e => setNewTemplate({ ...newTemplate, item_label: e.target.value })} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14 }} />
                <button onClick={handleAddTemplate} disabled={adding} style={{ padding: isCompactMasterData ? '10px 16px' : '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 600 }}>{adding ? '...' : '+ เพิ่มรายการ'}</button>
              </div>
            ) : activeType === 'procedure_plan' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <input placeholder="ชื่อแผนการตรวจสอบใหม่..." value={newValue} onChange={e => setNewValue(e.target.value)} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14 }} />
                <button onClick={async () => {
                  if (!newValue.trim()) return; setAdding(true)
                  await supabase.from('checklist_procedure_plans').insert([{ plan_name: newValue.trim(), steps: [] }])
                  setNewValue(''); fetchItems(); setAdding(false)
                }} disabled={adding} style={{ padding: isCompactMasterData ? '10px 16px' : '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 600 }}>{adding ? '...' : '+ สร้างแผนใหม่'}</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <input placeholder={`เพิ่ม ${currentType?.label} ใหม่...`} value={newValue} onChange={e => setNewValue(e.target.value)} style={{ flex: 1, padding: isCompactMasterData ? '10px 12px' : '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14 }} />
                <button onClick={handleAddStandard} disabled={adding} style={{ padding: isCompactMasterData ? '10px 16px' : '12px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 600 }}>{adding ? '...' : '+ เพิ่มข้อมูล'}</button>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="table-wrapper" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                {activeType === 'checklist_template' ? (
                  <tr><th style={{ width: 40 }}></th><th style={{ padding: '16px 20px', textAlign: 'left' }}>หมวดหมู่ / ความถี่</th><th style={{ padding: '16px 20px', textAlign: 'left' }}>รายการตรวจเช็ค</th><th style={{ padding: '16px 20px', textAlign: 'center' }}>Template</th><th style={{ padding: '16px 20px', textAlign: 'center' }}>สถานะ</th><th style={{ width: 120, padding: '16px 20px', textAlign: 'right' }}>จัดการ</th></tr>
                ) : activeType === 'procedure_plan' ? (
                  <tr><th style={{ padding: isCompactMasterData ? '12px 16px' : '16px 20px', textAlign: 'left' }}>ชื่อแผนการตรวจสอบ</th><th style={{ padding: isCompactMasterData ? '12px 16px' : '16px 20px', textAlign: 'left' }}>จำนวนขั้นตอน</th><th style={{ width: 120, padding: isCompactMasterData ? '12px 16px' : '16px 20px', textAlign: 'right' }}>จัดการ</th></tr>
                ) : (
                  <tr><th style={{ width: 60, padding: isCompactMasterData ? '12px 16px' : '16px 20px' }}>ลำดับ</th><th style={{ padding: isCompactMasterData ? '12px 16px' : '16px 20px', textAlign: 'left' }}>รายการ</th><th style={{ width: 120, padding: isCompactMasterData ? '12px 16px' : '16px 20px', textAlign: 'center' }}>สถานะ</th><th style={{ width: 120, padding: isCompactMasterData ? '12px 16px' : '16px 20px', textAlign: 'right' }}>จัดการ</th></tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</td></tr>
                ) : filteredItems.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>ไม่พบข้อมูล</td></tr>
                ) : filteredItems.map((it, idx) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {activeType === 'checklist_template' ? (
                      <>
                        <td style={{ textAlign: 'center', color: '#cbd5e1' }}>⠿</td>
                        <td style={{ padding: '14px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{it.category}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>{it.freq_type}</div>
                        </td>
                        <td style={{ padding: '14px 20px' }}>
                          {editingId === it.id ? (
                            <input value={it.item_label} onChange={e => {
                              const newItems = [...items];
                              const i = newItems.findIndex(x => x.id === it.id);
                              newItems[i].item_label = e.target.value;
                              setItems(newItems);
                            }} style={{ width: '100%', padding: '6px' }} />
                          ) : <span style={{ fontWeight: 600 }}>{it.item_label}</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>{TEMPLATE_NAMES[it.ui_template_type]}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span onClick={() => handleToggle(it.id, it.is_active, 'checklist_templates')} style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 20, fontSize: 11, background: it.is_active ? '#dcfce7' : '#f1f5f9', color: it.is_active ? '#166534' : '#64748b' }}>{it.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={{ textAlign: 'right', padding: '14px 20px' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <ActionButton color="blue" icon="✏️" onClick={() => setEditingId(it.id)} />
                            <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.item_label, 'checklist_templates')} />
                          </div>
                        </td>
                      </>
                    ) : activeType === 'procedure_plan' ? (
                      <>
                        <td style={{ padding: '14px 20px', fontWeight: 700 }}>{it.plan_name}</td>
                        <td style={{ padding: '14px 20px' }}>{(it.steps || []).length} ขั้นตอน</td>
                        <td style={{ textAlign: 'right', padding: '14px 20px' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <ActionButton color="blue" icon="✏️" onClick={() => setEditingId(it.id)} />
                            <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.plan_name, 'checklist_procedure_plans')} />
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ textAlign: 'center', padding: isCompactMasterData ? '10px 12px' : '14px 20px' }}>{idx + 1}</td>
                        <td style={{ padding: isCompactMasterData ? '10px 16px' : '14px 20px' }}>
                          {editingId === it.id ? (
                            <input value={editValue} onChange={e => setEditValue(e.target.value)} onBlur={async () => {
                              await supabase.from('master_data').update({ value: editValue }).eq('id', it.id)
                              setEditingId(null); fetchItems()
                            }} autoFocus style={{ width: '100%', padding: '6px', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                          ) : <span onClick={() => { setEditingId(it.id); setEditValue(it.value) }} style={{ cursor: 'pointer', fontWeight: 500 }}>{it.value}</span>}
                        </td>
                        <td style={{ textAlign: 'center', padding: isCompactMasterData ? '10px 12px' : '14px 20px' }}>
                          <span onClick={() => handleToggle(it.id, it.is_active)} style={{ cursor: 'pointer', padding: '4px 10px', borderRadius: 20, fontSize: 11, background: it.is_active ? '#dcfce7' : '#f1f5f9', color: it.is_active ? '#166534' : '#64748b', fontWeight: 600 }}>{it.is_active ? 'Active' : 'Inactive'}</span>
                        </td>
                        <td style={{ textAlign: 'right', padding: isCompactMasterData ? '10px 16px' : '14px 20px' }}>
                          <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.value)} />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 28 }}>📖</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{currentType?.label} Guide</h3>
                  <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>คู่มือการใช้งานระบบและการจัดการข้อมูล</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {isAdmin && (
                  <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                    {editingGuide ? '👁 View' : '✏️ Edit'}
                  </button>
                )}
                <button onClick={() => { setShowGuide(false); setEditingGuide(false); }} style={{ color: '#fff', background: 'none', border: 'none', fontSize: 32, cursor: 'pointer' }}>&times;</button>
              </div>
            </div>
            <div style={{ padding: 40, overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
              {editingGuide ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <textarea value={guideContent} onChange={e => setGuideContent(e.target.value)} style={{ width: '100%', minHeight: 450, padding: 24, borderRadius: 20, border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: 14, outline: 'none' }} />
                  <button onClick={handleSaveGuide} disabled={saving} style={{ padding: '14px 36px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, alignSelf: 'flex-end', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'กำลังบันทึก...' : 'บันทึกคู่มือ'}
                  </button>
                </div>
              ) : (
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #1e3a8a` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
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
    </div>
  )
}
