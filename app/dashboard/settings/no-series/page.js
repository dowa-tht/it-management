'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { generateNextNo } from '@/lib/noSeries'
import { formatDate } from '@/lib/dateFormat'

const LINKED_FORMS = ['FR-IT-01', 'FR-IT-02', 'ไม่ผูกกับเอกสาร']

export default function NoSeriesPage() {
  const [series, setSeries] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [hasDuplicate, setHasDuplicate] = useState(false)
  const [duplicateForms, setDuplicateForms] = useState([])
  const [form, setForm] = useState({
    code: '', description: '', format: '', starting_no: '',
    ending_no: '', starting_date: '', ending_date: '',
    last_no_used: '', manual_nos: false, linked_form: 'ไม่ผูกกับเอกสาร'
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetchSeries() }, [])

  const fetchSeries = async () => {
    setLoading(true)
    const { data } = await supabase.from('no_series').select('*').order('code')
    const list = data || []
    setSeries(list)
    checkDuplicates(list)
    setLoading(false)
  }

  const checkDuplicates = (list) => {
    const countMap = {}
    list.forEach(s => {
      if (s.linked_form && s.linked_form !== 'ไม่ผูกกับเอกสาร') {
        countMap[s.linked_form] = (countMap[s.linked_form] || 0) + 1
      }
    })
    const dupes = Object.entries(countMap)
      .filter(([_, count]) => count > 1)
      .map(([form]) => form)
    setDuplicateForms(dupes)
    setHasDuplicate(dupes.length > 0)
  }

  const handleSaveNew = async () => {
    if (!form.code.trim() || !form.format.trim()) {
      setMsg({ text: 'กรุณากรอก Code และ Format', type: 'error' })
      return
    }
    setSaving(true)
    setMsg({ text: '', type: '' })

    const { error } = await supabase.from('no_series').insert([{
      ...form,
      code: form.code.toUpperCase().trim()
    }])

    if (error) {
      if (error.code === '23505') {
        setMsg({ text: `Code "${form.code}" มีอยู่แล้วในระบบ`, type: 'error' })
      } else if (error.message?.includes('no_series_linked_form_unique')) {
        setMsg({ text: `Linked Form "${form.linked_form}" ถูกใช้แล้วใน Series อื่น`, type: 'error' })
      } else {
        setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
      }
    } else {
      setShowNew(false)
      setForm({
        code: '', description: '', format: '', starting_no: '',
        ending_no: '', starting_date: '', ending_date: '',
        last_no_used: '', manual_nos: false, linked_form: 'ไม่ผูกกับเอกสาร'
      })
      setMsg({ text: 'สร้าง No. Series สำเร็จแล้ว', type: 'success' })
      await fetchSeries()
    }
    setSaving(false)
  }

  const handleSaveEdit = async (id) => {
    setSaving(true)
    setMsg({ text: '', type: '' })
    const editing = series.find(s => s.id === id)

    const { error } = await supabase.from('no_series').update(editing).eq('id', id)

    if (error) {
      if (error.message?.includes('no_series_linked_form_unique')) {
        setMsg({ text: `Linked Form "${editing.linked_form}" ถูกใช้แล้วใน Series อื่น`, type: 'error' })
      } else {
        setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
      }
    } else {
      setEditingId(null)
      setMsg({ text: 'บันทึกสำเร็จแล้ว', type: 'success' })
      await fetchSeries()
    }
    setSaving(false)
  }

  const handleDelete = async (id, code) => {
    if (!confirm(`ต้องการลบ No. Series "${code}" ใช่ไหม?`)) return
    const { error } = await supabase.from('no_series').delete().eq('id', id)
    if (error) {
      setMsg({ text: `ลบไม่สำเร็จ: ${error.message}`, type: 'error' })
    } else {
      setMsg({ text: `ลบ "${code}" สำเร็จแล้ว`, type: 'success' })
      await fetchSeries()
    }
  }

  const handleCancelEdit = (id) => {
    setEditingId(null)
    fetchSeries()
  }

  const updateField = (id, field, value) => {
    setSeries(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const previewNo = (fmt, lastNo) => {
    if (!fmt) return '—'
    try { return generateNextNo(fmt, lastNo) } catch { return '—' }
  }

  const isExpired = (s) => s.ending_date && new Date(s.ending_date) < new Date()
  const isNotStarted = (s) => s.starting_date && new Date(s.starting_date) > new Date()
  const isDuplicateLinked = (s) => duplicateForms.includes(s.linked_form)

  const getStatusBadge = (s) => {
    if (isExpired(s)) return { label: 'หมดอายุ', bg: '#fee2e2', color: '#991b1b' }
    if (isNotStarted(s)) return { label: 'ยังไม่เริ่ม', bg: '#f3f4f6', color: '#6b7280' }
    return { label: 'Active', bg: '#d1fae5', color: '#065f46' }
  }

  const inputStyle = {
    padding: '6px 8px', border: '1px solid #d1d5db',
    borderRadius: 6, fontSize: 12, fontFamily: 'inherit', width: '100%'
  }
  const readStyle = { fontSize: 13, color: '#374151', padding: '4px 0', minHeight: 28 }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
  )

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>No. Series</h1>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            ตั้งค่าเลขที่เอกสารและผูกกับฟอร์มแต่ละประเภท
          </div>
        </div>
        <button
          onClick={() => { setShowNew(true); setMsg({ text: '', type: '' }) }}
          style={{
            background: '#1d4ed8', color: '#fff', padding: '8px 16px',
            borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'inherit'
          }}
        >
          + New Series
        </button>
      </div>

      {/* Duplicate Warning Banner */}
      {hasDuplicate && (
        <div style={{
          background: '#fef3c7', border: '1px solid #fcd34d',
          borderRadius: 10, padding: '14px 18px',
          marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
              พบ Linked Form ซ้ำกัน — อาจทำให้เลขที่เอกสารซ้ำกันได้
            </div>
            <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>
              Form ต่อไปนี้ถูกผูกกับ No. Series มากกว่า 1 รายการ:
              {duplicateForms.map(f => (
                <span key={f} style={{
                  display: 'inline-block', margin: '0 4px',
                  background: '#fbbf24', color: '#78350f',
                  padding: '1px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600
                }}>
                  {f}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: '#92400e' }}>
              กรุณาแก้ไขให้แต่ละ Form มี No. Series เพียง 1 รายการเท่านั้น
              มิฉะนั้นเลขที่เอกสารอาจซ้ำกันและทำให้ระบบบันทึกข้อมูลไม่ได้
            </div>
          </div>
        </div>
      )}

      {/* Success / Error Message */}
      {msg.text && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16,
          background: msg.type === 'success' ? '#d1fae5' : '#fee2e2',
          color: msg.type === 'success' ? '#065f46' : '#991b1b',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* New Series Form */}
      {showNew && (
        <div style={{
          background: '#fff', borderRadius: 10,
          border: '2px solid #3b82f6', padding: 20, marginBottom: 16
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8', marginBottom: 16 }}>
            ➕ สร้าง No. Series ใหม่
          </div>

          {/* Row 1 */}
          <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Code *</label>
              <input
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="เช่น INC"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Description</label>
              <input
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="คำอธิบาย"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Format *</label>
              <input
                value={form.format}
                onChange={e => setForm({ ...form, format: e.target.value })}
                placeholder="DTT-INC-YYMM-###"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Linked Form</label>
              <select
                value={form.linked_form}
                onChange={e => setForm({ ...form, linked_form: e.target.value })}
                style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
              >
                {LINKED_FORMS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2 */}
          <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Starting No.</label>
              <input
                value={form.starting_no}
                onChange={e => setForm({ ...form, starting_no: e.target.value })}
                placeholder="DTT-INC-2601-001"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Ending No.</label>
              <input
                value={form.ending_no}
                onChange={e => setForm({ ...form, ending_no: e.target.value })}
                placeholder="DTT-INC-9912-999"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Starting Date</label>
              <input
                type="date"
                value={form.starting_date}
                onChange={e => setForm({ ...form, starting_date: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', display: 'block', marginBottom: 4 }}>Ending Date</label>
              <input
                type="date"
                value={form.ending_date}
                onChange={e => setForm({ ...form, ending_date: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Manual Nos */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.manual_nos}
                onChange={e => setForm({ ...form, manual_nos: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: '#1d4ed8' }}
              />
              <span>Manual Nos.</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>— อนุญาตให้แก้ไขเลขที่เอกสารได้ในฟอร์ม</span>
            </label>
          </div>

          {/* Preview */}
          {form.format && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#1e40af', marginBottom: 14
            }}>
              ตัวอย่างเลขถัดไป: <strong style={{ fontFamily: 'monospace', fontSize: 14 }}>
                {previewNo(form.format, form.last_no_used)}
              </strong>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => { setShowNew(false); setMsg({ text: '', type: '' }) }}
              style={{
                padding: '7px 16px', border: '1px solid #d1d5db', borderRadius: 7,
                fontSize: 13, background: '#fff', cursor: 'pointer', fontFamily: 'inherit'
              }}
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveNew}
              disabled={saving}
              style={{
                padding: '7px 16px', border: 'none', borderRadius: 7,
                fontSize: 13, background: saving ? '#93c5fd' : '#1d4ed8',
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        </div>
      )}

      {/* Series List */}
      {series.length === 0 && !showNew ? (
        <div style={{
          background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb',
          padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 14
        }}>
          ยังไม่มี No. Series กด "+ New Series" เพื่อสร้างครับ
        </div>
      ) : series.map(s => {
        const status = getStatusBadge(s)
        const isDupe = isDuplicateLinked(s)

        return (
          <div key={s.id} style={{
            background: '#fff', borderRadius: 10,
            border: `1px solid ${isDupe ? '#fcd34d' : editingId === s.id ? '#3b82f6' : '#e5e7eb'}`,
            padding: 20, marginBottom: 12,
            transition: 'border-color 0.2s'
          }}>
            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{s.code}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{s.description}</div>

                {/* Status Badge */}
                <span style={{
                  background: status.bg, color: status.color,
                  padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 500
                }}>
                  {status.label}
                </span>

                {/* Linked Form Badge */}
                {s.linked_form && s.linked_form !== 'ไม่ผูกกับเอกสาร' && (
                  <span style={{
                    background: isDupe ? '#fef3c7' : '#eff6ff',
                    color: isDupe ? '#92400e' : '#1e40af',
                    padding: '2px 8px', borderRadius: 20, fontSize: 11,
                    border: isDupe ? '1px solid #fcd34d' : 'none'
                  }}>
                    {isDupe ? '⚠️ ' : ''}{s.linked_form}
                  </span>
                )}

                {/* Manual Badge */}
                {s.manual_nos && (
                  <span style={{
                    background: '#fef3c7', color: '#92400e',
                    padding: '2px 8px', borderRadius: 20, fontSize: 11
                  }}>
                    Manual
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {editingId === s.id ? (
                  <>
                    <button
                      onClick={() => handleCancelEdit(s.id)}
                      style={{
                        padding: '5px 12px', border: '1px solid #d1d5db',
                        borderRadius: 6, fontSize: 12, background: '#fff',
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => handleSaveEdit(s.id)}
                      disabled={saving}
                      style={{
                        padding: '5px 12px', border: 'none', borderRadius: 6,
                        fontSize: 12, background: saving ? '#93c5fd' : '#1d4ed8',
                        color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit'
                      }}
                    >
                      {saving ? 'บันทึก...' : '💾 บันทึก'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingId(s.id); setMsg({ text: '', type: '' }) }}
                      style={{
                        padding: '5px 12px', border: '1px solid #d1d5db',
                        borderRadius: 6, fontSize: 12, background: '#fff',
                        cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.code)}
                      style={{
                        padding: '5px 12px', border: 'none', borderRadius: 6,
                        fontSize: 12, background: '#fee2e2',
                        color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit'
                      }}
                    >
                      🗑 ลบ
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Duplicate Warning สำหรับ Card นี้ */}
            {isDupe && (
              <div style={{
                background: '#fef3c7', border: '1px solid #fcd34d',
                borderRadius: 7, padding: '8px 12px', marginBottom: 14,
                fontSize: 12, color: '#92400e',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                ⚠️ <strong>{s.linked_form}</strong> ถูกใช้ใน Series อื่นด้วย — กรุณาแก้ไขเพื่อป้องกันเลขซ้ำ
              </div>
            )}

            {/* Fields Grid */}
            <div className="form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>

              {/* Format */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Format</div>
                {editingId === s.id ? (
                  <input value={s.format || ''} onChange={e => updateField(s.id, 'format', e.target.value)} style={inputStyle} />
                ) : (
                  <div style={{ ...readStyle, fontFamily: 'monospace' }}>{s.format || '—'}</div>
                )}
              </div>

              {/* Starting No */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Starting No.</div>
                {editingId === s.id ? (
                  <input value={s.starting_no || ''} onChange={e => updateField(s.id, 'starting_no', e.target.value)} style={inputStyle} />
                ) : (
                  <div style={readStyle}>{s.starting_no || '—'}</div>
                )}
              </div>

              {/* Ending No */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ending No.</div>
                {editingId === s.id ? (
                  <input value={s.ending_no || ''} onChange={e => updateField(s.id, 'ending_no', e.target.value)} style={inputStyle} />
                ) : (
                  <div style={readStyle}>{s.ending_no || '—'}</div>
                )}
              </div>

              {/* Linked Form */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Linked Form</div>
                {editingId === s.id ? (
                  <select
                    value={s.linked_form || 'ไม่ผูกกับเอกสาร'}
                    onChange={e => updateField(s.id, 'linked_form', e.target.value)}
                    style={{ ...inputStyle, background: '#fff', cursor: 'pointer' }}
                  >
                    {LINKED_FORMS.map(f => <option key={f}>{f}</option>)}
                  </select>
                ) : (
                  <div style={readStyle}>{s.linked_form || '—'}</div>
                )}
              </div>

              {/* Starting Date */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Starting Date</div>
                {editingId === s.id ? (
                  <input type="date" value={s.starting_date || ''} onChange={e => updateField(s.id, 'starting_date', e.target.value)} style={inputStyle} />
                ) : (
                  <div style={readStyle}>{formatDate(s.starting_date)}</div>
                )}
              </div>

              {/* Ending Date */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ending Date</div>
                {editingId === s.id ? (
                  <input type="date" value={s.ending_date || ''} onChange={e => updateField(s.id, 'ending_date', e.target.value)} style={inputStyle} />
                ) : (
                  <div style={{ ...readStyle, color: isExpired(s) ? '#dc2626' : '#374151' }}>
                    {formatDate(s.ending_date)}
                    {isExpired(s) && <span style={{ fontSize: 11, marginLeft: 6, color: '#dc2626' }}>(หมดอายุแล้ว)</span>}
                  </div>
                )}
              </div>

              {/* Last No Used */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last No. Used</div>
                {editingId === s.id ? (
                  <input value={s.last_no_used || ''} onChange={e => updateField(s.id, 'last_no_used', e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
                ) : (
                  <div style={{ ...readStyle, color: s.last_no_used ? '#1d4ed8' : '#d1d5db', fontWeight: s.last_no_used ? 600 : 400, fontFamily: 'monospace' }}>
                    {s.last_no_used || '—'}
                  </div>
                )}
              </div>

              {/* Last Date Used */}
              <div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Last Date Used</div>
                <div style={readStyle}>{formatDate(s.last_date_used)}</div>
              </div>
            </div>

            {/* Manual Nos Toggle */}
            {editingId === s.id && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={s.manual_nos || false}
                    onChange={e => updateField(s.id, 'manual_nos', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#1d4ed8' }}
                  />
                  <span>Manual Nos.</span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>— อนุญาตให้แก้ไขเลขที่เอกสารได้ในฟอร์ม</span>
                </label>
              </div>
            )}

            {/* Footer: Preview + Date Range */}
            <div style={{
              marginTop: 14, paddingTop: 14, borderTop: '1px solid #f3f4f6',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 8
            }}>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                เลขถัดไป:{' '}
                <strong style={{ color: '#1d4ed8', fontFamily: 'monospace', fontSize: 13 }}>
                  {previewNo(s.format, s.last_no_used)}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                ช่วงเวลา: {formatDate(s.starting_date)} — {formatDate(s.ending_date)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}