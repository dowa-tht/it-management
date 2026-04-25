'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewIncidentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', severity: 'Medium',
    status: 'Open', category: '', affected_system: '',
    reported_by: '', assigned_to: '',
  })

  const handleSubmit = async (e) => {
  e.preventDefault()
  setLoading(true)

  const now = new Date()
  const case_number = `INC-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`

  const { error } = await supabase.from('incidents').insert([{ ...form, case_number }])

  if (!error) {
    // LINE Notify
    if (form.severity === 'High' || form.severity === 'Medium') {
      const emoji = form.severity === 'High' ? '🔴' : '🟡'
      const msg = `${emoji} [DOWA IT] Incident แจ้งใหม่\n` +
        `Case: ${case_number}\n` +
        `ระดับ: ${form.severity}\n` +
        `หัวข้อ: ${form.title}\n` +
        `ระบบ: ${form.affected_system || '-'}\n` +
        `ผู้แจ้ง: ${form.reported_by || '-'}`

      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      })
    }
    router.push('/dashboard/incidents')
  } else {
    alert('เกิดข้อผิดพลาด กรุณาลองใหม่')
    setLoading(false)
  }
}

  const field = (label, key, type = 'text', options = null) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 6 }}>{label}</label>
      {options ? (
        <select
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff' }}
        >
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={form[key]}
          onChange={e => setForm({ ...form, [key]: e.target.value })}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
        />
      )}
    </div>
  )

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/dashboard/incidents" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← กลับ</Link>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>เพิ่ม Incident ใหม่</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
            ข้อมูลหลัก
          </div>
          {field('หัวข้อ Incident *', 'title')}
          {field('รายละเอียด / อาการที่พบ', 'description', 'textarea')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('ระดับความรุนแรง', 'severity', 'select', ['High', 'Medium', 'Low'])}
            {field('สถานะ', 'status', 'select', ['Open', 'In Progress', 'Resolved'])}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('ประเภท Incident', 'category', 'text')}
            {field('ระบบที่ได้รับผลกระทบ', 'affected_system', 'text')}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 24, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid #f3f4f6' }}>
            ผู้รับผิดชอบ
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {field('ผู้แจ้ง', 'reported_by')}
            {field('ผู้รับผิดชอบ', 'assigned_to')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <Link href="/dashboard/incidents" style={{
            padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8,
            fontSize: 14, color: '#374151', textDecoration: 'none', background: '#fff'
          }}>
            ยกเลิก
          </Link>
          <button type="submit" disabled={loading} style={{
            padding: '10px 24px', background: loading ? '#93c5fd' : '#1d4ed8',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500
          }}>
            {loading ? 'กำลังบันทึก...' : 'บันทึก Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}