'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const MASTER_TYPES = [
  { key: 'incident_category', label: 'Incident Category', icon: '🏷️' },
  { key: 'affected_system',   label: 'Affected System',   icon: '🖥️' },
]

export default function MasterDataPage() {
  const [activeType, setActiveType] = useState('incident_category')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetchItems() }, [activeType])

  const fetchItems = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('master_data')
      .select('*')
      .eq('type', activeType)
      .order('sort_order', { ascending: true })
      .order('value', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!newValue.trim()) return
    setAdding(true)
    setMsg({ text: '', type: '' })

    const maxOrder = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) + 1 : 1

    const { error } = await supabase.from('master_data').insert([{
      type: activeType,
      value: newValue.trim(),
      sort_order: maxOrder,
      is_active: true,
    }])

    if (error) {
      if (error.code === '23505') {
        setMsg({ text: `"${newValue}" มีอยู่แล้วในรายการนี้`, type: 'error' })
      } else {
        setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
      }
    } else {
      setNewValue('')
      setMsg({ text: `เพิ่ม "${newValue}" สำเร็จแล้ว`, type: 'success' })
      await fetchItems()
    }
    setAdding(false)
  }

  const handleEdit = async (id) => {
    if (!editValue.trim()) return
    setSaving(true)
    const { error } = await supabase.from('master_data').update({ value: editValue.trim() }).eq('id', id)
    if (error) {
      setMsg({ text: `เกิดข้อผิดพลาด: ${error.message}`, type: 'error' })
    } else {
      setEditingId(null)
      setMsg({ text: 'แก้ไขสำเร็จแล้ว', type: 'success' })
      await fetchItems()
    }
    setSaving(false)
  }

  const handleToggle = async (id, current) => {
    await supabase.from('master_data').update({ is_active: !current }).eq('id', id)
    await fetchItems()
  }

  const handleDelete = async (id, value) => {
    if (!confirm(`ต้องการลบ "${value}" ใช่ไหม?`)) return
    await supabase.from('master_data').delete().eq('id', id)
    setMsg({ text: `ลบ "${value}" สำเร็จแล้ว`, type: 'success' })
    await fetchItems()
  }

  const handleMoveUp = async (item, index) => {
    if (index === 0) return
    const prev = items[index - 1]
    await supabase.from('master_data').update({ sort_order: prev.sort_order }).eq('id', item.id)
    await supabase.from('master_data').update({ sort_order: item.sort_order }).eq('id', prev.id)
    await fetchItems()
  }

  const handleMoveDown = async (item, index) => {
    if (index === items.length - 1) return
    const next = items[index + 1]
    await supabase.from('master_data').update({ sort_order: next.sort_order }).eq('id', item.id)
    await supabase.from('master_data').update({ sort_order: item.sort_order }).eq('id', next.id)
    await fetchItems()
  }

  const currentType = MASTER_TYPES.find(t => t.key === activeType)

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px' }}>Master Data</h1>
        <div style={{ fontSize: 12, color: '#6b7280' }}>จัดการข้อมูลอ้างอิงที่ใช้ใน Dropdown ทั้งระบบ</div>
      </div>

      {/* Type Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {MASTER_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveType(t.key); setMsg({ text: '', type: '' }); setEditingId(null) }}
            style={{
              padding: '8px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
              border: activeType === t.key ? 'none' : '1px solid #e5e7eb',
              background: activeType === t.key ? '#1d4ed8' : '#fff',
              color: activeType === t.key ? '#fff' : '#374151',
              fontFamily: 'inherit', fontWeight: activeType === t.key ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6
            }}
          >
            {t.icon} {t.label}
            <span style={{
              background: activeType === t.key ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
              color: activeType === t.key ? '#fff' : '#6b7280',
              padding: '1px 7px', borderRadius: 20, fontSize: 11
            }}>
              {activeType === t.key ? items.length : ''}
            </span>
          </button>
        ))}
      </div>

      {/* Message */}
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

      {/* Add New */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 12 }}>
          ➕ เพิ่ม {currentType?.label} ใหม่
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder={`พิมพ์ชื่อ ${currentType?.label} ใหม่...`}
            style={{
              flex: 1, padding: '9px 12px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 14, fontFamily: 'inherit', outline: 'none'
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newValue.trim()}
            style={{
              padding: '9px 20px', border: 'none', borderRadius: 8,
              fontSize: 13, background: adding || !newValue.trim() ? '#93c5fd' : '#1d4ed8',
              color: '#fff', cursor: adding || !newValue.trim() ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap'
            }}
          >
            {adding ? 'กำลังเพิ่ม...' : '+ เพิ่ม'}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
            {currentType?.icon} {currentType?.label} ({items.length} รายการ)
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>ลากเรียงลำดับโดยใช้ปุ่ม ↑↓</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>กำลังโหลด...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            ยังไม่มีข้อมูล กรุณาเพิ่มรายการด้านบน
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['ลำดับ', 'ชื่อ', 'สถานะ', 'เรียงลำดับ', 'Action'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: '#6b7280', fontWeight: 500, fontSize: 12, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: item.is_active ? '#fff' : '#fafafa' }}>
                  {/* ลำดับ */}
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: 12, width: 60 }}>
                    {index + 1}
                  </td>

                  {/* ชื่อ */}
                  <td style={{ padding: '12px 16px' }}>
                    {editingId === item.id ? (
                      <input
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                        autoFocus
                        style={{ padding: '6px 10px', border: '1px solid #3b82f6', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', outline: 'none', width: '100%', maxWidth: 300 }}
                      />
                    ) : (
                      <span style={{ color: item.is_active ? '#111827' : '#9ca3af', textDecoration: item.is_active ? 'none' : 'line-through' }}>
                        {item.value}
                      </span>
                    )}
                  </td>

                  {/* สถานะ */}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: item.is_active ? '#d1fae5' : '#f3f4f6',
                      color: item.is_active ? '#065f46' : '#6b7280',
                      padding: '2px 8px', borderRadius: 20, fontSize: 11
                    }}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* เรียงลำดับ */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => handleMoveUp(item, index)}
                        disabled={index === 0}
                        style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, background: '#fff', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#d1d5db' : '#374151' }}
                      >↑</button>
                      <button
                        onClick={() => handleMoveDown(item, index)}
                        disabled={index === items.length - 1}
                        style={{ padding: '3px 8px', border: '1px solid #e5e7eb', borderRadius: 5, fontSize: 12, background: '#fff', cursor: index === items.length - 1 ? 'not-allowed' : 'pointer', color: index === items.length - 1 ? '#d1d5db' : '#374151' }}
                      >↓</button>
                    </div>
                  </td>

                  {/* Action */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {editingId === item.id ? (
                        <>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                          >ยกเลิก</button>
                          <button
                            onClick={() => handleEdit(item.id)}
                            disabled={saving}
                            style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 11, background: '#1d4ed8', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                          >{saving ? '...' : 'บันทึก'}</button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditingId(item.id); setEditValue(item.value) }}
                            style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, background: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                          >✏️ แก้ไข</button>
                          <button
                            onClick={() => handleToggle(item.id, item.is_active)}
                            style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, background: '#fff', cursor: 'pointer', fontFamily: 'inherit', color: item.is_active ? '#d97706' : '#059669' }}
                          >{item.is_active ? 'ปิดใช้' : 'เปิดใช้'}</button>
                          <button
                            onClick={() => handleDelete(item.id, item.value)}
                            style={{ padding: '4px 10px', border: 'none', borderRadius: 6, fontSize: 11, background: '#fee2e2', color: '#991b1b', cursor: 'pointer', fontFamily: 'inherit' }}
                          >🗑 ลบ</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop: 16, padding: '12px 16px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af' }}>
        ℹ️ รายการที่ปิดใช้งาน (Inactive) จะไม่แสดงใน Dropdown ของระบบ แต่ข้อมูลเดิมที่บันทึกไว้แล้วจะยังแสดงอยู่
      </div>
    </div>
  )
}
