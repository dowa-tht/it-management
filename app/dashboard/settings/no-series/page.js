'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { generateNextNo } from '@/lib/noSeries'
import { formatDate } from '@/lib/dateFormat'
import { useWorkingDate } from '@/lib/context/WorkingDateContext'

const LINKED_FORMS = ['FR-IT-02', 'ไม่ผูกกับเอกสาร']

// --- Modern Action Button Component ---
const ActionButton = ({ onClick, icon, color, title, disabled }) => {
  const [hover, setHover] = useState(false)
  const colors = {
    blue: { bg: '#eff6ff', icon: '#2563eb', hover: '#dbeafe' },
    red: { bg: '#fef2f2', icon: '#dc2626', hover: '#fee2e2' },
    gray: { bg: '#f8fafc', icon: '#64748b', hover: '#f1f5f9' },
    green: { bg: '#f0fdf4', icon: '#16a34a', hover: '#dcfce7' }
  }
  const theme = colors[color] || colors.gray
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 32, height: 32, borderRadius: 10, border: 'none',
        background: disabled ? '#f1f5f9' : (hover ? theme.hover : theme.bg),
        color: disabled ? '#cbd5e1' : theme.icon, cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, transition: 'all 0.2s',
        transform: hover && !disabled ? 'translateY(-2px)' : 'none'
      }}
    >
      {icon}
    </button>
  )
}

export default function NoSeriesPage() {
  const { workingDate, getFormattedDate } = useWorkingDate()
  const [series, setSeries] = useState([])
  const [lines, setLines] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ code: '', description: '', format: '', linked_form: 'ไม่ผูกกับเอกสาร' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })
  const [currentUser, setCurrentUser] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single()
      setCurrentUser(profile || session.user)
    }
    await fetchData()
    setLoading(false)
  }

  const fetchData = async () => {
    const { data: headerData } = await supabase.from('no_series').select('*').order('code')
    const { data: lineData } = await supabase.from('no_series_lines').select('*').order('starting_date', { ascending: false })
    setSeries(headerData || [])
    setLines(lineData || [])
  }

  const handleSaveHeader = async () => {
    if (!form.code.trim() || !form.format.trim()) { setMsg({ text: 'กรอก Code และ Format', type: 'error' }); return }
    setSaving(true)
    const { error } = await supabase.from('no_series').insert([{ ...form, code: form.code.toUpperCase().trim() }])
    if (error) setMsg({ text: error.message, type: 'error' })
    else { setShowNew(false); setForm({ code: '', description: '', format: '', linked_form: 'ไม่ผูกกับเอกสาร' }); fetchData(); }
    setSaving(false)
  }

  const handleAddLine = async (code) => {
    const lastLine = lines.find(l => l.series_code === code)
    const nextDate = lastLine ? new Date(lastLine.starting_date) : new Date()
    if (lastLine) nextDate.setMonth(nextDate.getMonth() + 1)
    nextDate.setDate(1)

    const newLine = {
      series_code: code,
      starting_date: nextDate.toISOString().split('T')[0],
      format: null,
      starting_no: lastLine ? lastLine.starting_no : '',
      increment_by: 1,
      is_open: true
    }

    const { error } = await supabase.from('no_series_lines').insert([newLine])
    if (error) setMsg({ text: error.message, type: 'error' })
    else fetchData()
  }

  const handleDownloadTemplate = () => {
    const headers = ['code', 'format', 'starting_date', 'last_no_used']
    const todayStr = new Date().toISOString().split('T')[0]
    const csvBody = headers.join(',') + '\n' + 
      `INC,DTT-INC-YYMM-###,${todayStr},0\n` +
      `CHK,DTT-CHK-YYMM-###,${todayStr},0`
    const encodedUri = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvBody)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', 'no_series_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target.result
      await processImport(text)
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
    reader.readAsText(file)
  }

  const processImport = async (csvText) => {
    const rows = csvText.split(/\r?\n/).filter(r => r.trim() !== '')
    if (rows.length < 2) { setMsg({ text: 'ไฟล์ CSV ไม่มีข้อมูล', type: 'error' }); return }
    
    // Check headers
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase())
    const required = ['code', 'format', 'starting_date', 'last_no_used']
    const missing = required.filter(r => !headers.includes(r))
    if (missing.length > 0) {
      setMsg({ text: `ไฟล์ CSV ขาดคอลัมน์: ${missing.join(', ')}`, type: 'error' })
      return
    }

    let successCount = 0
    let errorCount = 0

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(',').map(c => c.trim())
      if (cols.length < required.length) continue
      
      const rowData = {}
      headers.forEach((h, idx) => { rowData[h] = cols[idx] })
      
      const code = rowData.code.toUpperCase()
      if (!code) continue

      try {
        // 1. Check or Insert Header
        const { data: header } = await supabase.from('no_series').select('id').eq('code', code).single()
        if (!header) {
          const { error: hErr } = await supabase.from('no_series').insert([{
            code,
            description: code,
            format: rowData.format || `${code}-YYMM-###`,
            linked_form: 'ไม่ผูกกับเอกสาร',
            manual_nos: false
          }])
          if (hErr) throw hErr
        }

        // 2. Insert Line
        const startingDate = rowData.starting_date || new Date().toISOString().split('T')[0]
        const lastNo = rowData.last_no_used && !isNaN(parseInt(rowData.last_no_used)) ? parseInt(rowData.last_no_used) : 0

        // Check if line exists for this date
        const { data: existingLine } = await supabase.from('no_series_lines').select('id').eq('series_code', code).eq('starting_date', startingDate).maybeSingle()
        if (existingLine) {
           await supabase.from('no_series_lines').update({ last_no_used: lastNo, format: rowData.format || null }).eq('id', existingLine.id)
        } else {
           await supabase.from('no_series_lines').insert([{
             series_code: code,
             starting_date: startingDate,
             format: rowData.format || null,
             starting_no: '',
             last_no_used: lastNo,
             increment_by: 1,
             is_open: true
           }])
        }
        successCount++
      } catch (err) {
        console.error('Import error row ' + i, err)
        errorCount++
      }
    }
    
    setMsg({ text: `นำเข้าข้อมูลเสร็จสิ้น: สำเร็จ ${successCount} รายการ, ผิดพลาด ${errorCount} รายการ`, type: successCount > 0 ? 'success' : 'error' })
    fetchData()
  }

  const handleDeleteLine = async (id) => {
    if (confirm('ลบบรรทัดนี้?')) {
      await supabase.from('no_series_lines').delete().eq('id', id)
      fetchData()
    }
  }

  const handleUpdateLine = async (id, field, value) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
  }

  const toDisplayDate = (dateStr) => {
    if (!dateStr) return ''
    const parts = dateStr.split('-')
    if (parts.length !== 3) return dateStr
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`
  }

  const fromDisplayDate = (displayStr) => {
    const clean = displayStr.replace(/\s/g, '')
    const parts = clean.split('/')
    if (parts.length !== 3) return null
    const [d, m, y] = parts
    if (y.length !== 4 || m.length > 2 || d.length > 2) return null
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const saveLine = async (line) => {
    setSaving(true)
    const { error } = await supabase.from('no_series_lines').update(line).eq('id', line.id)
    if (error) setMsg({ text: error.message, type: 'error' })
    else { setMsg({ text: 'บันทึกสำเร็จ', type: 'success' }); fetchData(); }
    setSaving(false)
  }

  const handleDeleteSeries = async (id, code) => {
    if (!confirm(`Are you sure you want to delete the entire series [${code}]? This will delete all associated lines.`)) return
    setSaving(true)
    await supabase.from('no_series_lines').delete().eq('series_code', code)
    const { error } = await supabase.from('no_series').delete().eq('id', id)
    if (error) setMsg({ text: error.message, type: 'error' })
    else { setMsg({ text: `ลบ Series ${code} สำเร็จ`, type: 'success' }); fetchData(); }
    setSaving(false)
  }

  const getPreview = (s) => {
    const sLines = lines.filter(l => l.series_code === s.code)
    const activeLine = sLines.find(l => new Date(l.starting_date) <= (workingDate || new Date()))
    if (activeLine) return generateNextNo(s.format, activeLine.last_no_used, workingDate)
    return generateNextNo(s.format, s.last_no_used, workingDate)
  }

  const [showGuide, setShowGuide] = useState(false)
  const [guideContent, setGuideContent] = useState('')
  const [editingGuide, setEditingGuide] = useState(false)

  const fetchGuide = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'no_series_guide_content').single()
    if (data) setGuideContent(data.value)
    else {
      setGuideContent(`### 🔢 คู่มือการจัดการเลขที่เอกสาร (No. Series Management)
ระบบจัดการเลขรันเอกสารแบบอัตโนมัติที่รองรับโครงสร้างแบบ **Header & Lines** เพื่อความยืดหยุ่นตามช่วงเวลา

---
#### **1. โครงสร้างของ No. Series**

#### **Header (ระดับหัวข้อ)**
- **Series Code:** ตัวย่อของเอกสาร (เช่น INC สำหรับ Incident, CHK สำหรับ Checklist)
- **Format:** รูปแบบหลัก (เช่น DTT-INC-YYMM-###)
  - **YY:** ปี ค.ศ. (2 หลัก)
  - **MM:** เดือน (2 หลัก)
  - **###:** จำนวนหลักของตัวเลขรัน (เช่น ### คือ 001, #### คือ 0001)

#### **Lines (ระดับรายละเอียด)**
- ใช้สำหรับ "เริ่มนับเลขใหม่" เมื่อถึงวันที่กำหนด (เช่น เริ่มเดือนใหม่)
- **Starting Date:** วันที่เริ่มใช้เลขรันชุดนี้
- **Last No. Used:** เลขล่าสุดที่ถูกใช้งานไป (ระบบจะบวก 1 อัตโนมัติสำหรับใบถัดไป)

---
#### **2. เทคนิคการใช้งาน**
- **Working Date:** ระบบจะอ้างอิงเลขรันตาม "Working Date" ที่คุณเลือกไว้ในระบบ (ไม่ใช่แค่วันที่ปัจจุบัน) ทำให้สามารถคีย์งานย้อนหลังได้โดยเลขรันยังคงถูกต้องตามเดือนนั้นๆ
- **CSV Import:** แนะนำให้ใช้การ Import CSV หากต้องการตั้งค่าเลขรันล่วงหน้าทั้งปี

---
#### **⚠️ ข้อควรระวัง**
- การแก้ไข **Last No. Used** ด้วยตนเองอาจทำให้เลขที่เอกสารซ้ำซ้อนได้ ควรทำเมื่อจำเป็นเท่านั้น
- หากต้องการเปลี่ยนรูปแบบเลขรันกลางคัน ให้สร้าง **Line ใหม่** แทนการแก้ไข Header เดิม`)
    }
  }

  useEffect(() => {
    fetchGuide()
  }, [])

  const handleSaveGuide = async () => {
    const { error } = await supabase.from('system_settings').upsert({ key: 'no_series_guide_content', value: guideContent, updated_at: new Date().toISOString() })
    if (error) alert(error.message)
    else { setEditingGuide(false); alert('บันทึกคู่มือสำเร็จ') }
  }

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}>กำลังโหลด...</div>

  return (
    <div style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      {showGuide && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div style={{ background: '#fff', borderRadius: 28, width: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '28px 36px', background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{display:'flex', alignItems:'center', gap:16}}><span style={{fontSize:28}}>🔢</span><div><h3 style={{margin:0, fontSize:22, fontWeight:800}}>No. Series Guide</h3><p style={{margin:0, fontSize:13, opacity:0.85}}>คู่มือการจัดการเลขที่เอกสาร</p></div></div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setEditingGuide(!editingGuide)} style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>{editingGuide ? '👁 View' : '✏️ Edit'}</button>
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
                    <div key={sIdx} style={{ background: section.includes('####') ? '#fff' : 'transparent', borderRadius: 20, padding: section.includes('####') ? 28 : 0, marginBottom: section.includes('####') ? 24 : 36, borderLeft: section.includes('####') ? `6px solid #1d4ed8` : 'none', boxShadow: section.includes('####') ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            No. Series Management <span style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', padding: '2px 10px', borderRadius: 20 }}>Enterprise</span>
            <button onClick={() => setShowGuide(true)} style={{ border: 'none', background: '#eff6ff', width: 34, height: 34, borderRadius: 10, cursor: 'pointer', fontSize: 18 }}>📖</button>
          </h1>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            ตั้งค่าเลขที่เอกสารแบบ Header & Lines อ้างอิง Working Date: <strong style={{ color: '#1d4ed8' }}>{getFormattedDate().split('-').reverse().join(' / ')}</strong>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleDownloadTemplate} style={{ background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            📄 Template
          </button>
          
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={importing} style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '10px 16px', borderRadius: 12, cursor: importing ? 'wait' : 'pointer', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {importing ? '⏳ Importing...' : '📥 Import CSV'}
          </button>
          
          <button onClick={() => setShowNew(true)} style={{ background: '#1d4ed8', color: '#fff', padding: '10px 24px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            + New Series
          </button>
        </div>
      </div>

      {msg.text && <div style={{ padding: '14px 20px', borderRadius: 14, fontSize: 14, marginBottom: 24, background: msg.type === 'success' ? '#f0fdf4' : '#fef2f2', color: msg.type === 'success' ? '#166534' : '#991b1b', border: '1px solid #e2e8f0' }}>{msg.text}</div>}

      {showNew && (
        <div style={{ background: '#fff', borderRadius: 24, padding: 32, marginBottom: 32, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>➕ สร้าง Series Header ใหม่</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Series Code (e.g. SO)" style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12 }} />
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description" style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12 }} />
            <input value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} placeholder="Format (e.g. SO-YYMM-###)" style={{ padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 12 }} />
            <button onClick={handleSaveHeader} style={{ background: '#1d4ed8', color: '#fff', borderRadius: 12, border: 'none', fontWeight: 700 }}>บันทึก Header</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {series.map(s => {
          const sLines = lines.filter(l => l.series_code === s.code)
          const isExpanded = expandedId === s.id
          const nextNo = getPreview(s)

          return (
            <div key={s.id} style={{ background: '#fff', borderRadius: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div onClick={() => setExpandedId(isExpanded ? null : s.id)} style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ width: 50, height: 50, background: '#eff6ff', color: '#1d4ed8', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800 }}>{s.code}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{s.description || s.code}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Format: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.format}</span></div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>Next Number for {getFormattedDate().split('-').reverse().join(' / ')}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>{nextNo}</div>
                  </div>
                  <div style={{ width: 32, display: 'flex', justifyContent: 'center', color: '#94a3b8' }}>{isExpanded ? '▲' : '▼'}</div>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 32px 32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Series Lines</div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteSeries(s.id, s.code) }} style={{ fontSize: 12, color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>🗑️ Delete Series</button>
                    </div>
                    <button onClick={() => handleAddLine(s.code)} style={{ fontSize: 12, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #dbeafe', padding: '6px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>+ Add Line</button>
                  </div>
                  
                  <div style={{ border: '1px solid #f1f5f9', borderRadius: 16, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        <tr>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Starting Date</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Format (Override)</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Starting No.</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Last No. Used</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sLines.length === 0 ? (
                          <tr><td colSpan="6" style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No lines defined. Using legacy header logic.</td></tr>
                        ) : sLines.map(line => (
                          <tr key={line.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <input 
                                type="text" 
                                value={toDisplayDate(line.starting_date)} 
                                onChange={e => {
                                  const val = e.target.value
                                  handleUpdateLine(line.id, 'starting_date', val)
                                }}
                                onBlur={e => {
                                  const iso = fromDisplayDate(e.target.value)
                                  if (iso) handleUpdateLine(line.id, 'starting_date', iso)
                                  else fetchData() // revert if invalid
                                }}
                                placeholder="DD / MM / YYYY"
                                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, width: 110 }} 
                              />
                            </td>
                            <td style={{ padding: '12px 16px' }}><input type="text" value={line.format || ''} placeholder="Use Header" onChange={e => handleUpdateLine(line.id, 'format', e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, width: 140 }} /></td>
                            <td style={{ padding: '12px 16px' }}><input value={line.starting_no} onChange={e => handleUpdateLine(line.id, 'starting_no', e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontFamily: 'monospace' }} /></td>
                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#1d4ed8' }}>{line.last_no_used || '—'}</td>
                            <td style={{ padding: '12px 16px' }}>
                              {new Date(line.starting_date) <= (workingDate || new Date()) ? <span style={{ color: '#16a34a', fontWeight: 700 }}>● Active</span> : <span style={{ color: '#94a3b8' }}>○ Scheduled</span>}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <ActionButton icon="💾" color="green" onClick={() => saveLine(line)} title="Save Line" />
                                <ActionButton icon="🗑" color="red" onClick={() => handleDeleteLine(line.id)} title="Delete Line" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}