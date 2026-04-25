'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateNextNo } from '@/lib/noSeries'

const LINKED_FORMS = ['FR-IT-01', 'FR-IT-02', 'ไม่ผูกกับเอกสาร']

export default function NoSeriesPage() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    code: '', description: '', format: '', starting_no: '',
    ending_no: '', starting_date: '', ending_date: '',
    last_no_used: '', manual_nos: false, linked_form: 'ไม่ผูกกับเอกสาร'
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSeries() }, [])

  const fetchSeries = async () => {
    const { data } = await supabase.from('no_series').select('*').order('code')
    setSeries(data || [])
    setLoading(false)
  }

  const handleSave = async (id = null) => {
    setSaving(true)
    if (id) {
      const editing = series.find(s => s.id === id)
      await supabase.from('no_series').update(editing).eq('id', id)
    } else {
      await supabase.from('no_series').insert([form])
      setShowNew(false)
      setForm({ code: '', description: '', format: '', starting_no: '', ending_no: '', starting_date: '', ending_date: '', last_no_used: '', manual_nos: false, linked_form: 'ไม่ผูกกับเอกสาร' })
    }
    await fetchSeries()
    setEditingId(null)
    setSaving(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('ต้องการลบ No. Series นี้ใช่ไหม?')) return
    await supabase.from('no_series').delete().eq('id', id)
    await fetchSeries()
  }

  const updateField = (id, field, value) => {
    setSeries(series.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const previewNo = (fmt, lastNo) => {
    if (!fmt) return '—'
    return generateNextNo(fmt, lastNo, null)
  }

  const inputStyle = { padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, fontFamily: 'inherit', width: '100%' }
  const readStyle = { fontSize: 12, color: '#374151', padding: '6px 0' }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>No. Series</h1>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>ตั้งค่าเลขที่เอกสารสำหรับแต่ละประเภท</div>
        </div>
        <button onClick={() => setShowNew(true)} style={{
          background: '#1d4ed8', color: '#fff', padding: '8px 16px',
          borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
        }}>
          + New Series
        </button>
      </div>

      {/* New Form */}
      {showNew && (
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#374151' }}>สร้าง No. Series ใหม่</div>
          <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Code *', key: 'code' },
              { label: 'Description', key: 'description' },
              { label: 'Format *', key: 'format', placeholder: 'เช่น DTT-INC-YYMM-###' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder || ''} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>ผูกกับเอกสาร</label>
              <select value={form.linked_form} onChange={e => setForm({ ...form, linked_form: e.target.value })}
                style={{ ...inputStyle, background: '#fff' }}>
                {LINKED_FORMS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            {[
              { label: 'Starting No.', key: 'starting_no' },
              { label: 'Ending No.', key: 'ending_no' },
              { label: 'Starting Date', key: 'starting_date', type: 'date' },
              { label: 'Ending Date', key: 'ending_date', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.manual_nos} onChange={e => setForm({ ...form, manual_nos: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#1d4ed8' }} />
              Manual Nos. (อนุญาตให้แก้ไขเลขเองในฟอร์ม)
            </label>
          </div>
          {form.format && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1e40af', marginBottom: 12 }}>
              ตัวอย่างเลขที่: <strong>{previewNo(form.format, form.last_no_used)}</strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowNew(false)} style={{ padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
            <button onClick={() => handleSave()} disabled={saving} style={{ padding: '7px 16px', border: 'none', borderRadius: 7, fontSize: 13, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      {/* Series List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>กำลังโหลด...</div>
      ) : series.map(s => (
        <div key={s.id} style={{ background: '#fff', borderRadius: 10, border: `1px solid ${editingId === s.id ? '#3b82f6' : '#e5e7eb'}`, padding: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{s.code}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{s.description}</div>
              {s.linked_form && s.linked_form !== 'ไม่ผูกกับเอกสาร' && (
                <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>{s.linked_form}</span>
              )}
              {s.manual_nos && (
                <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, fontSize: 11 }}>Manual</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {editingId === s.id ? (
                <>
                  <button onClick={() => setEditingId(null)} style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>ยกเลิก</button>
                  <button onClick={() => handleSave(s.id)} disabled={saving} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, fontSize: 12, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {saving ? 'บันทึก...' : 'บันทึก'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditingId(s.id)} style={{ padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>✏️ แก้ไข</button>
                  <button onClick={() => handleDelete(s.id)} style={{ padding: '5px 12px', border: 'none', borderRadius: 6, fontSize: 12, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}>🗑 ลบ</button>
                </>
              )}
            </div>
          </div>

          <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[
              { label: 'Format', key: 'format' },
              { label: 'Starting No.', key: 'starting_no' },
              { label: 'Ending No.', key: 'ending_no' },
              { label: 'Linked Form', key: 'linked_form', type: 'select', options: LINKED_FORMS },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{f.label}</div>
                {editingId === s.id ? (
                  f.type === 'select' ? (
                    <select value={s[f.key] || ''} onChange={e => updateField(s.id, f.key, e.target.value)}
                      style={{ ...inputStyle, background: '#fff' }}>
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input value={s[f.key] || ''} onChange={e => updateField(s.id, f.key, e.target.value)} style={inputStyle} />
                  )
                ) : (
                  <div style={readStyle}>{s[f.key] || '—'}</div>
                )}
              </div>
            ))}

            {[
              { label: 'Starting Date', key: 'starting_date', type: 'date' },
              { label: 'Ending Date', key: 'ending_date', type: 'date' },
              { label: 'Last No. Used', key: 'last_no_used', editable: true },
              { label: 'Last Date Used', key: 'last_date_used', editable: false },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{f.label}</div>
                {editingId === s.id && f.editable !== false ? (
                  <input type={f.type || 'text'} value={s[f.key] || ''} onChange={e => updateField(s.id, f.key, e.target.value)} style={inputStyle} />
                ) : (
                  <div style={{ ...readStyle, color: f.key === 'last_no_used' ? '#1d4ed8' : '#374151', fontWeight: f.key === 'last_no_used' ? 600 : 400 }}>
                    {s[f.key] || '—'}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Manual Nos toggle */}
          {editingId === s.id && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={s.manual_nos || false} onChange={e => updateField(s.id, 'manual_nos', e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#1d4ed8' }} />
                Manual Nos. (อนุญาตให้แก้ไขเลขเองในฟอร์ม)
              </label>
            </div>
          )}

          {/* Preview */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 24, fontSize: 12 }}>
            <div style={{ color: '#6b7280' }}>
              เลขถัดไป: <strong style={{ color: '#1d4ed8' }}>{previewNo(s.format, s.last_no_used)}</strong>
            </div>
            {s.starting_date && <div style={{ color: '#6b7280' }}>ช่วงเวลา: {new Date(s.starting_date).toLocaleDateString('th-TH')} — {s.ending_date ? new Date(s.ending_date).toLocaleDateString('th-TH') : 'ไม่กำหนด'}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}