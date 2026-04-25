'use client'
import { useState } from 'react'

const DEFAULT_TASKS = [
  { id: 1, label: 'ตรวจสอบ M365 Service Health', done: false, category: 'Microsoft 365' },
  { id: 2, label: 'ตรวจสอบ Sign-in Log ผิดปกติ', done: false, category: 'Microsoft 365' },
  { id: 3, label: 'ตรวจสอบ Meraki Dashboard', done: false, category: 'Network' },
  { id: 4, label: 'ตรวจสอบ Aruba Site Health', done: false, category: 'Network' },
  { id: 5, label: 'ตรวจสอบ CCTV Online', done: false, category: 'CCTV' },
  { id: 6, label: 'ตรวจสอบ NAS Health & Backup Log', done: false, category: 'Server' },
  { id: 7, label: 'ตรวจสอบ Backup Status (Synology)', done: false, category: 'Server' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS)
  const [newTask, setNewTask] = useState('')

  const toggle = (id) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const addTask = () => {
    if (!newTask.trim()) return
    setTasks([...tasks, { id: Date.now(), label: newTask, done: false, category: 'อื่นๆ' }])
    setNewTask('')
  }
  const remove = (id) => setTasks(tasks.filter(t => t.id !== id))

  const done = tasks.filter(t => t.done).length
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>Daily IT Task</h1>
        <div style={{ fontSize: 24, fontWeight: 700, color: progress === 100 ? '#059669' : '#1d4ed8' }}>{progress}%</div>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>
        {new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })} · {done}/{tasks.length} เสร็จแล้ว
      </div>

      <div style={{ background: '#e5e7eb', borderRadius: 999, height: 8, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ background: progress === 100 ? '#059669' : '#1d4ed8', height: '100%', width: `${progress}%`, borderRadius: 999, transition: 'width 0.3s' }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden', marginBottom: 16 }}>
        {tasks.map((task, i) => (
          <div key={task.id} style={{
            display: 'flex', alignItems: 'center', padding: '12px 16px',
            borderBottom: i < tasks.length - 1 ? '1px solid #f3f4f6' : 'none',
            background: task.done ? '#f0fdf4' : '#fff'
          }}>
            <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)}
              style={{ width: 18, height: 18, cursor: 'pointer', marginRight: 14, accentColor: '#1d4ed8' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: task.done ? '#9ca3af' : '#111827', textDecoration: task.done ? 'line-through' : 'none' }}>
                {task.label}
              </div>
              <div style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>{task.category}</div>
            </div>
            <button onClick={() => remove(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, padding: '0 4px' }}>×</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addTask()}
          placeholder="เพิ่ม Task ใหม่..."
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 }}
        />
        <button onClick={addTask} style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
          เพิ่ม
        </button>
      </div>
    </div>
  )
}