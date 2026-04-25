'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const CHECKLIST_ITEMS = [
  { key: 'm365_health', label: 'ตรวจสอบ M365 Service Health', freq: 'ทุกวัน', category: 'Microsoft 365' },
  { key: 'm365_signin', label: 'ตรวจสอบ M365 Sign-in Log', freq: 'ทุกสัปดาห์', category: 'Microsoft 365' },
  { key: 'meraki', label: 'ตรวจสอบ Cisco Meraki Dashboard', freq: 'ทุกวัน', category: 'Network' },
  { key: 'aruba', label: 'ตรวจสอบ HPE Aruba Instant On Site Health', freq: 'ทุกวัน', category: 'Network' },
  { key: 'checkmk', label: 'ตรวจสอบ CheckMK Host / Service Status', freq: 'ทุกไตรมาส', category: 'Network' },
  { key: 'firmware', label: 'Firmware Review (Meraki / Aruba / Yeastar)', freq: 'ทุกวัน', category: 'Network' },
  { key: 'cctv', label: 'ตรวจสอบกล้อง CCTV Online / Recording', freq: 'ทุกวัน', category: 'CCTV' },
  { key: 'nas_health', label: 'ตรวจสอบ Synology NAS Health / Storage', freq: 'ทุกวัน', category: 'Server & NAS' },
  { key: 'pbx', label: 'ตรวจสอบ IP PBX Extension / Trunk', freq: 'ตามความจำเป็น', category: 'Phone' },
  { key: 'user_license', label: 'จัดการ User / License (พนักงานเข้า-ออก)', freq: 'ทุกวัน', category: 'Microsoft 365' },
]

const CATEGORIES = [...new Set(CHECKLIST_ITEMS.map(i => i.category))]

export default function ChecklistPage() {
  const [checks, setChecks] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { fetchToday() }, [])

  const fetchToday = async () => {
    const { data } = await supabase.from('infra_checklists')
      .select('*').eq('check_date', today)
    const map = {}
    data?.forEach(d => { map[d.item_key] = { done: d.is_done, notes: d.notes, id: d.id } })
    setChecks(map)
    setLoading(false)
  }

  const handleToggle = async (item) => {
    const current = checks[item.key]
    const newDone = !current?.done
    setSaving(true)

    if (current?.id) {
      await supabase.from('infra_checklists').update({ is_done: newDone }).eq('id', current.id)
    } else {
      const { data } = await supabase.from('infra_checklists').insert([{
        check_date: today, item_key: item.key,
        item_label: item.label, is_done: newDone
      }]).select().single()
      setChecks(prev => ({ ...prev, [item.key]: { done: newDone, id: data?.id } }))
      setSaving(false)
      return
    }
    setChecks(prev => ({ ...prev, [item.key]: { ...current, done: newDone } }))
    setSaving(false)
  }

  const doneCount = CHECKLIST_ITEMS.filter(i => checks[i.key]?.done).length
  const progress = Math.round((doneCount / CHECKLIST_ITEMS.length) * 100)

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>IT Infrastructure Checklist</h1>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
            {new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: progress === 100 ? '#059669' : '#1d4ed8' }}>{progress}%</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>{doneCount}/{CHECKLIST_ITEMS.length} รายการ</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ background: progress === 100 ? '#059669' : '#1d4ed8', height: '100%', width: `${progress}%`, borderRadius: 999, transition: 'width 0.3s' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>กำลังโหลด...</div>
      ) : (
        CATEGORIES.map(cat => (
          <div key={cat} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 13, fontWeight: 600, color: '#374151' }}>
              {cat}
            </div>
            {CHECKLIST_ITEMS.filter(i => i.category === cat).map(item => {
              const done = checks[item.key]?.done
              return (
                <div key={item.key} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 16px',
                  borderBottom: '1px solid #f9fafb', background: done ? '#f0fdf4' : '#fff',
                  transition: 'background 0.2s'
                }}>
                  <input type="checkbox" checked={!!done} onChange={() => handleToggle(item)}
                    style={{ width: 18, height: 18, cursor: 'pointer', marginRight: 14, accentColor: '#1d4ed8' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: done ? '#6b7280' : '#111827', textDecoration: done ? 'line-through' : 'none' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{item.freq}</div>
                  </div>
                  {done && <span style={{ fontSize: 11, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 20 }}>✓ เสร็จแล้ว</span>}
                </div>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}