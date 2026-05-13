'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ActionButton } from '@/app/dashboard/checklist/components/ActionButton'

const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '-'
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const [y, m, d] = parts
  const monthIdx = parseInt(m) - 1
  return `${d.padStart(2, '0')} / ${MONTHS_EN[monthIdx] || m} / ${y}`
}

export default function HolidaysPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [monthFilter, setMonthFilter] = useState('All')
  const [newHolidayDate, setNewHolidayDate] = useState('')
  const [newHolidayDesc, setNewHolidayDesc] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editValue, setEditValue] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchItems()
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
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'holidays_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### 🌴 การจัดการวันหยุดประจำปี (Holidays)
ใช้กำหนดวันหยุดที่ต้องไม่นับรวมในการคำนวณ SLA และ Working Time

---
#### 1. การเพิ่มวันหยุด
- เลือกวันที่
- ระบุชื่อวันหยุด
- กดเพิ่มวันหยุด

---
#### 2. การนำเข้า CSV
- ใช้ Template เพื่อจัดรูปแบบข้อมูล
- คอลัมน์ที่ต้องมีคือ holiday_date และ description
- รูปแบบวันที่ควรเป็น YYYY-MM-DD`)
    }
  }

  const fetchItems = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: false })
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else setItems(data || [])
    setLoading(false)
  }

  const handleSaveGuide = async () => {
    setSaving(true)
    const { error } = await supabase.from('system_settings').upsert({ key: 'holidays_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setMsg({ text: 'บันทึกคู่มือสำเร็จ', type: 'success' })
      setEditingGuide(false)
    }
    setSaving(false)
  }

  const normalizeHolidayDate = (dateValue) => {
    let isoDate = dateValue
    const parts = dateValue.split(/[\/\s-]+/).filter(Boolean)
    if (parts.length === 3) {
      let [d, m, y] = parts
      const mIdx = MONTHS_EN.findIndex(month => month.toLowerCase() === m.toLowerCase())
      if (mIdx !== -1) m = (mIdx + 1).toString().padStart(2, '0')
      if (parseInt(y) > 2400) y = (parseInt(y) - 543).toString()
      isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    return isoDate
  }

  const handleAddHoliday = async () => {
    if (!newHolidayDate || !newHolidayDesc.trim()) return
    setSaving(true)
    const { error } = await supabase.from('holidays').insert([{ holiday_date: normalizeHolidayDate(newHolidayDate), description: newHolidayDesc.trim() }])
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setNewHolidayDate('')
      setNewHolidayDesc('')
      setMsg({ text: 'เพิ่มวันหยุดสำเร็จ', type: 'success' })
      fetchItems()
    }
    setSaving(false)
  }

  const handleUpdateHoliday = async (id) => {
    if (!editDate || !editValue.trim()) return
    setSaving(true)
    const { error } = await supabase.from('holidays').update({ holiday_date: editDate, description: editValue.trim() }).eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else {
      setEditingId(null)
      setMsg({ text: 'อัปเดตข้อมูลสำเร็จ', type: 'success' })
      fetchItems()
    }
    setSaving(false)
  }

  const handleDelete = async (id, description) => {
    if (!confirm(`ลบ "${description}"?`)) return
    const { error } = await supabase.from('holidays').delete().eq('id', id)
    if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
    else fetchItems()
  }

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const csv = event.target.result
      const lines = csv.split('\n')
      const records = lines.slice(1).filter(l => l.trim()).map(line => {
        const [date, desc] = line.split(',')
        return { holiday_date: date.trim(), description: desc.trim() }
      })
      setLoading(true)
      const { error } = await supabase.from('holidays').insert(records)
      if (error) setMsg({ text: `Error: ${error.message}`, type: 'error' })
      else {
        setMsg({ text: `Imported ${records.length} holidays`, type: 'success' })
        fetchItems()
      }
      setLoading(false)
    }
    reader.readAsText(file)
  }

  const downloadCSVTemplate = () => {
    const csv = "holiday_date,description\n2026-01-01,New Year's Day"
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'holiday_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const filteredItems = items.filter(it => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = !search || it.description?.toLowerCase().includes(search) || formatDateDisplay(it.holiday_date).toLowerCase().includes(search)
    const itemMonth = parseInt(it.holiday_date?.split('-')[1] || '0') - 1
    const matchesMonth = monthFilter === 'All' || itemMonth === parseInt(monthFilter)
    return matchesSearch && matchesMonth
  })

  return (
    <div className="holidays-container" style={{ padding: 'var(--page-padding, 24px)', background: '#f8fafc', minHeight: '100vh', paddingBottom: 60 }}>
      <style>{`
        :root { --page-padding: 24px; }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .holidays-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
          .holidays-tools { flex-direction: column !important; }
          .holidays-form { flex-direction: column !important; }
          .holidays-table { min-width: 620px !important; }
        }
        * { box-sizing: border-box; }
      `}</style>

      <div className="holidays-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 32 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' }}>
              📅
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '0', display: 'flex', alignItems: 'center', gap: 12 }}>
              Holidays
              <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#eff6ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0 }}>จัดการวันหยุดที่ใช้ยกเว้นการคำนวณ SLA และเวลาทำงาน</p>
        </div>
        <div className="action-dock" style={{ display: 'flex', gap: 6, padding: '6px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <button onClick={downloadCSVTemplate} style={{ fontSize: 13, padding: '10px 18px', background: '#f8fafc', color: '#475569', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700 }}>📄 Template</button>
          <label style={{ fontSize: 13, padding: '10px 20px', background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff', borderRadius: 14, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}>📥 Import CSV <input type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} /></label>
        </div>
      </div>

      {msg.text && <div style={{ padding: '14px 20px', borderRadius: 14, fontSize: 13, marginBottom: 20, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', border: `1px solid ${msg.type === 'success' ? '#bcf0da' : '#fecaca'}` }}>{msg.text}</div>}

      <div className="holidays-tools" style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 16 }}>🔍</span>
          <input
            placeholder="ค้นหาใน Holidays..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 44px', border: '1px solid #e2e8f0', borderRadius: 18, fontSize: 14, background: '#fff', outline: 'none' }}
          />
        </div>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ width: 180, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 18, fontSize: 14, background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="All">ทุกเดือน</option>
          {MONTHS_FULL.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      <div className="holidays-form" style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid #e2e8f0', padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ position: 'relative', width: 240 }}>
          <input type="text" placeholder="dd / mmm / yyyy" value={newHolidayDate ? formatDateDisplay(newHolidayDate) : ''} readOnly onClick={(e) => e.target.nextSibling.showPicker()} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14, background: '#fff', cursor: 'pointer' }} />
          <input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', pointerEvents: 'none' }} />
        </div>
        <input placeholder="ชื่อวันหยุด เช่น วันสงกรานต์..." value={newHolidayDesc} onChange={e => setNewHolidayDesc(e.target.value)} style={{ flex: 1, padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 14, fontSize: 14 }} />
        <button onClick={handleAddHoliday} disabled={saving} style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>{saving ? 'Saving...' : '+ Add Holiday'}</button>
      </div>

      <div className="table-card" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(20px)', borderRadius: 24, border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}>
        <table className="holidays-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
            <tr>
              <th style={{ padding: '16px 20px', textAlign: 'left', width: 220 }}>วันที่</th>
              <th style={{ padding: '16px 20px', textAlign: 'left' }}>วันหยุด</th>
              <th style={{ padding: '16px 20px', textAlign: 'right', width: 120 }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>กำลังโหลด...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan="3" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>ไม่พบข้อมูลวันหยุด</td></tr>
            ) : filteredItems.map(it => (
              <tr key={it.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '14px 20px' }}>
                  {editingId === it.id ? (
                    <div style={{ position: 'relative', width: '100%' }}>
                      <input type="text" value={editDate ? formatDateDisplay(editDate) : ''} readOnly onClick={(e) => e.target.nextSibling.showPicker()} style={{ width: '100%', padding: '8px 12px', border: '1px solid #3b82f6', borderRadius: 10, fontSize: 13, background: '#fff' }} />
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ position: 'absolute', opacity: 0, inset: 0, width: '100%', pointerEvents: 'none' }} />
                    </div>
                  ) : (
                    <span style={{ fontWeight: 600, color: '#1e293b' }}>{formatDateDisplay(it.holiday_date)}</span>
                  )}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  {editingId === it.id ? (
                    <input value={editValue} onChange={e => setEditValue(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #3b82f6', borderRadius: 10, fontSize: 13 }} />
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
                        <ActionButton color="red" icon="🗑" onClick={() => handleDelete(it.id, it.description)} title="ลบ" />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 24, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '24px 32px', background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📖</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Holidays Guide</h3>
                  <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>คู่มือการใช้งานและการตั้งค่า</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {currentUser?.role === 'admin' && <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>}
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
                  {guideContent.split('---').map((section, sIdx) => (
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 16, padding: section.includes('####') ? 24 : 0, marginBottom: section.includes('####') ? 20 : 32, borderLeft: section.includes('####') ? '5px solid #3b82f6' : 'none', boxShadow: section.includes('####') ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none' }}>
                      <div style={{ fontSize: 15, color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {section.trim().split('\n').map((line, lIdx) => {
                          if (line.startsWith('####')) return <h4 key={lIdx} style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 700, color: '#1e293b' }}>{line.replace(/#/g, '').trim()}</h4>
                          if (line.startsWith('###')) return <h3 key={lIdx} style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{line.replace(/#/g, '').trim()}</h3>
                          return <p key={lIdx} style={{ margin: '0 0 8px 0' }}>{line.includes('**') ? line.split('**').map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#1e3a8a' }}>{p}</strong> : p) : line}</p>
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
