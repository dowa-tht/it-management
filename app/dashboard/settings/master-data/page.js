'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CHECKLIST_TEMPLATES } from '@/lib/checklistItems'

const MASTER_GROUPS = [
  { 
    name: 'Incident Setup', 
    items: [
      { key: 'incident_category', label: 'Incident Category', icon: '🏷️' },
      { key: 'affected_system',   label: 'Affected System',   icon: '🖥️' },
    ]
  },
  {
    name: 'Checklist Setup',
    items: [
      { key: 'checklist_category', label: 'Checklist Category', icon: '📁' },
      { key: 'checklist_template', label: 'Checklist Master', icon: '📋' },
    ]
  },
  {
    name: 'General Setup',
    items: [
      { key: 'holidays', label: 'Holidays (วันหยุด)', icon: '🌴' },
    ]
  }
]

const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Yearly']

export default function MasterDataPage() {
  const [activeType, setActiveType] = useState('incident_category')
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([]) // For checklist categories
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })

  // Standard Fields
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Checklist Template Fields
  const [newTemplate, setNewTemplate] = useState({ freq_type: 'Daily', category: '', item_label: '', instruction: '' })

  // Holiday Fields
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayDesc, setNewHolidayDesc] = useState('')

  useEffect(() => { fetchItems() }, [activeType])

  const fetchItems = async () => {
    setLoading(true)
    if (activeType === 'checklist_template') {
      const { data } = await supabase
        .from('checklist_templates')
        .select('*')
        .order('freq_type', { ascending: true })
        .order('sort_order', { ascending: true })
      setItems(data || [])

      const { data: catData } = await supabase.from('master_data').select('value').eq('type', 'checklist_category').eq('is_active', true)
      setCategories(catData?.map(c => c.value) || [])
    } else if (activeType === 'holidays') {
      const { data } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: false }) // Show newest first
      setItems(data || [])
    } else {
      const { data } = await supabase
        .from('master_data')
        .select('*')
        .eq('type', activeType)
        .order('sort_order', { ascending: true })
        .order('value', { ascending: true })
      setItems(data || [])
    }
    setLoading(false)
  }

  const handleAddStandard = async () => {
    if (!newValue.trim()) return
    setAdding(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1
    const { error } = await supabase.from('master_data').insert([{ type: activeType, value: newValue.trim(), sort_order: maxOrder, is_active: true }])
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else { setNewValue(''); setMsg({ text: 'เพิ่มสำเร็จ', type: 'success' }); fetchItems() }
    setAdding(false)
  }

  const handleAddTemplate = async () => {
    if (!newTemplate.item_label.trim()) return
    setAdding(true)
    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1
    const { error } = await supabase.from('checklist_templates').insert([{ ...newTemplate, item_key: `custom_${Date.now()}`, sort_order: maxOrder, is_active: true }])
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else { setNewTemplate({ freq_type: 'Daily', category: categories[0] || '', item_label: '', instruction: '' }); setMsg({ text: 'เพิ่มรายการสำเร็จ', type: 'success' }); fetchItems() }
    setAdding(false)
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayDesc.trim()) return
    setAdding(true)
    const { error } = await supabase.from('holidays').insert([{ holiday_date: newHolidayDate, description: newHolidayDesc.trim() }])
    if (error) {
      if (error.code === '23505') setMsg({ text: 'วันนี้ถูกตั้งค่าเป็นวันหยุดไปแล้ว', type: 'error' })
      else setMsg({ text: `Error: ${error.message}`, type: 'error' })
    } else { setNewHolidayDate(''); setNewHolidayDesc(''); setMsg({ text: 'เพิ่มวันหยุดสำเร็จ', type: 'success' }); fetchItems() }
    setAdding(false)
  }

  const handleEditTemplate = async (item) => {
    setSaving(true)
    const { error } = await supabase.from('checklist_templates').update({ freq_type: item.freq_type, category: item.category, item_label: item.item_label, instruction: item.instruction }).eq('id', item.id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else { setEditingId(null); setMsg({ text: 'แก้ไขสำเร็จ', type: 'success' }); fetchItems() }
    setSaving(false)
  }

  const handleEditStandard = async (id) => {
    if (!editValue.trim()) return
    setSaving(true)
    const { error } = await supabase.from('master_data').update({ value: editValue.trim() }).eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else { setEditingId(null); setMsg({ text: 'แก้ไขสำเร็จ', type: 'success' }); fetchItems() }
    setSaving(false)
  }

  const handleToggle = async (id, current, table = 'master_data') => {
    await supabase.from(table).update({ is_active: !current }).eq('id', id)
    fetchItems()
  }

  const handleDelete = async (id, value, table = 'master_data') => {
    if (!confirm(`ต้องการลบ "${value}" ใช่ไหม?`)) return
    await supabase.from(table).delete().eq('id', id)
    setMsg({ text: 'ลบสำเร็จ', type: 'success' })
    fetchItems()
  }

  const handleImportDefault = async () => {
    if (!confirm('ระบบจะนำเข้าข้อมูลเริ่มต้นทั้งหมด ยืนยันไหม?')) return
    setLoading(true)
    const inserts = []
    Object.keys(CHECKLIST_TEMPLATES).forEach(freq => {
      CHECKLIST_TEMPLATES[freq].forEach((item, idx) => {
        inserts.push({ freq_type: freq, category: item.category, item_label: item.label, item_key: item.key, instruction: item.instruction, sort_order: idx + 1 })
      })
    })
    const { error } = await supabase.from('checklist_templates').insert(inserts)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      const uniqueCats = [...new Set(inserts.map(i => i.category))]
      for (const cat of uniqueCats) await supabase.from('master_data').insert([{ type: 'checklist_category', value: cat, is_active: true }])
      setMsg({ text: 'นำเข้าสำเร็จแล้ว!', type: 'success' }); fetchItems()
    }
    setLoading(false)
  }

  const currentType = MASTER_GROUPS.flatMap(g => g.items).find(t => t.key === activeType)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Master Data & Settings</h1>
        <div style={{ fontSize: 13, color: '#6b7280' }}>จัดการข้อมูลอ้างอิงและตั้งค่าระบบทั้งหมด</div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, alignItems: 'flex-start' }}>
        {/* Left Sidebar Menu */}
        <div style={{ width: 260, flexShrink: 0, background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {MASTER_GROUPS.map(group => (
            <div key={group.name}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 10, paddingLeft: 12, letterSpacing: '0.05em' }}>
                {group.name}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {group.items.map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setActiveType(t.key); setMsg({ text: '', type: '' }); setEditingId(null) }}
                    style={{
                      padding: '10px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer', textAlign: 'left',
                      border: 'none',
                      background: activeType === t.key ? '#eff6ff' : 'transparent',
                      color: activeType === t.key ? '#1d4ed8' : '#374151',
                      fontWeight: activeType === t.key ? 600 : 500,
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{t.icon}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Content Area */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentType?.icon} {currentType?.label}
            </h2>
            {activeType === 'checklist_template' && items.length === 0 && (
              <button onClick={handleImportDefault} style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                📥 นำเข้าข้อมูลเริ่มต้น
              </button>
            )}
          </div>

          {msg.text && (
            <div style={{ padding: '12px 16px', borderRadius: 8, fontSize: 13, background: msg.type === 'success' ? '#d1fae5' : '#fee2e2', color: msg.type === 'success' ? '#065f46' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#a7f3d0' : '#fecaca'}` }}>
              {msg.type === 'success' ? '✅' : '❌'} {msg.text}
            </div>
          )}

          {/* Form Area */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>➕ เพิ่มข้อมูลใหม่</div>
            
            {activeType === 'checklist_template' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '120px 180px 1fr 1fr 100px', gap: 10 }}>
                <select value={newTemplate.freq_type} onChange={e => setNewTemplate({...newTemplate, freq_type: e.target.value})} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                  {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={newTemplate.category} onChange={e => setNewTemplate({...newTemplate, category: e.target.value})} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                  <option value="">เลือกหมวดหมู่...</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="ชื่อรายการตรวจสอบ..." value={newTemplate.item_label} onChange={e => setNewTemplate({...newTemplate, item_label: e.target.value})} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <input placeholder="คำแนะนำวิธีตรวจ (ถ้ามี)..." value={newTemplate.instruction} onChange={e => setNewTemplate({...newTemplate, instruction: e.target.value})} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <button onClick={handleAddTemplate} disabled={adding} style={{ padding: '8px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>{adding ? '...' : '+ เพิ่ม'}</button>
              </div>
            ) : activeType === 'holidays' ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                <input placeholder="ชื่อวันหยุด (เช่น วันสงกรานต์)..." value={newHolidayDesc} onChange={e => setNewHolidayDesc(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddHoliday()} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <button onClick={handleAddHoliday} disabled={adding} style={{ padding: '8px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>{adding ? '...' : '+ เพิ่ม'}</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 12 }}>
                <input value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddStandard()} placeholder={`ระบุ ${currentType?.label}...`} style={{ flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <button onClick={handleAddStandard} disabled={adding} style={{ padding: '8px 24px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>{adding ? '...' : '+ เพิ่ม'}</button>
              </div>
            )}
          </div>

          {/* List Area */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
              <span>รายการทั้งหมด ({items.length})</span>
            </div>
            
            {loading ? <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>กำลังโหลดข้อมูล...</div> : items.length === 0 ? <div style={{ padding: 60, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>ยังไม่มีข้อมูลในระบบ</div> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#fff', borderBottom: '2px solid #f3f4f6' }}>
                      {activeType === 'checklist_template' ? (
                        <>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>ความถี่</th>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>หมวดหมู่</th>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>รายการตรวจสอบ</th>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>คำแนะนำ</th>
                          <th style={{ padding: '12px 20px', textAlign: 'center', color: '#6b7280', fontWeight: 600, width: 80 }}>สถานะ</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right', color: '#6b7280', fontWeight: 600, width: 100 }}>จัดการ</th>
                        </>
                      ) : activeType === 'holidays' ? (
                        <>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600, width: 150 }}>วันที่</th>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>ชื่อวันหยุด</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right', color: '#6b7280', fontWeight: 600, width: 100 }}>จัดการ</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '12px 20px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>ชื่อรายการ</th>
                          <th style={{ padding: '12px 20px', textAlign: 'center', color: '#6b7280', fontWeight: 600, width: 80 }}>สถานะ</th>
                          <th style={{ padding: '12px 20px', textAlign: 'right', color: '#6b7280', fontWeight: 600, width: 100 }}>จัดการ</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: item.is_active === false ? '#fafafa' : '#fff' }}>
                        {activeType === 'checklist_template' ? (
                          editingId === item.id ? (
                            <>
                              <td style={{ padding: '8px 20px' }}><select value={item.freq_type} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, freq_type: e.target.value} : i))} style={{ width: '100%', padding: '6px' }}>{FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}</select></td>
                              <td style={{ padding: '8px 20px' }}><select value={item.category} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, category: e.target.value} : i))} style={{ width: '100%', padding: '6px' }}><option value="">-</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                              <td style={{ padding: '8px 20px' }}><input value={item.item_label} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, item_label: e.target.value} : i))} style={{ width: '100%', padding: '6px' }} /></td>
                              <td style={{ padding: '8px 20px' }}><input value={item.instruction || ''} onChange={e => setItems(items.map(i => i.id === item.id ? {...i, instruction: e.target.value} : i))} style={{ width: '100%', padding: '6px' }} /></td>
                              <td style={{ padding: '8px 20px', textAlign: 'center' }}>-</td>
                              <td style={{ padding: '8px 20px', textAlign: 'right' }}>
                                <button onClick={() => handleEditTemplate(item)} style={{ color: '#1d4ed8', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>บันทึก</button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '12px 20px' }}><span style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: 4, fontSize: 11, color: '#4b5563' }}>{item.freq_type}</span></td>
                              <td style={{ padding: '12px 20px', color: '#1d4ed8', fontWeight: 500 }}>{item.category}</td>
                              <td style={{ padding: '12px 20px', color: item.is_active ? '#111827' : '#9ca3af' }}>{item.item_label}</td>
                              <td style={{ padding: '12px 20px', color: '#6b7280', fontSize: 12 }}>{item.instruction || '-'}</td>
                              <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                                <span onClick={() => handleToggle(item.id, item.is_active, 'checklist_templates')} style={{ cursor: 'pointer', padding: '2px 8px', background: item.is_active ? '#d1fae5' : '#f3f4f6', color: item.is_active ? '#065f46' : '#6b7280', borderRadius: 20, fontSize: 11 }}>{item.is_active ? 'Active' : 'Inactive'}</span>
                              </td>
                              <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                  <button onClick={() => { setEditingId(item.id) }} style={{ color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                                  <button onClick={() => handleDelete(item.id, item.item_label, 'checklist_templates')} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>🗑</button>
                                </div>
                              </td>
                            </>
                          )
                        ) : activeType === 'holidays' ? (
                          <>
                            <td style={{ padding: '12px 20px', color: '#111827', fontWeight: 500 }}>{new Date(item.holiday_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                            <td style={{ padding: '12px 20px', color: '#4b5563' }}>{item.description}</td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                <button onClick={() => handleDelete(item.id, item.description, 'holidays')} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>🗑</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '12px 20px' }}>
                              {editingId === item.id ? <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ padding: 6, width: '100%' }} /> : <span style={{ color: item.is_active ? '#111827' : '#9ca3af', textDecoration: item.is_active ? 'none' : 'line-through' }}>{item.value}</span>}
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                              <span onClick={() => handleToggle(item.id, item.is_active, 'master_data')} style={{ cursor: 'pointer', padding: '2px 8px', background: item.is_active ? '#d1fae5' : '#f3f4f6', color: item.is_active ? '#065f46' : '#6b7280', borderRadius: 20, fontSize: 11 }}>{item.is_active ? 'Active' : 'Inactive'}</span>
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                {editingId === item.id ? (
                                  <button onClick={() => handleEditStandard(item.id)} style={{ color: '#1d4ed8', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600 }}>บันทึก</button>
                                ) : (
                                  <button onClick={() => { setEditingId(item.id); setEditValue(item.value || '') }} style={{ color: '#6b7280', border: 'none', background: 'none', cursor: 'pointer' }}>✏️</button>
                                )}
                                <button onClick={() => handleDelete(item.id, item.value, 'master_data')} style={{ color: '#dc2626', border: 'none', background: 'none', cursor: 'pointer' }}>🗑</button>
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
      </div>
    </div>
  )
}
