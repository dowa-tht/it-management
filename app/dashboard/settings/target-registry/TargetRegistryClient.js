'use client'

import Link from 'next/link'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { saveChecklistTarget, saveChecklistTargetGroup } from '@/app/actions/target'
import { cn } from '@/lib/cn'

const EMPTY_TARGET = {
  id: null,
  target_code: '',
  target_type: 'cctv_terminal_box',
  name: '',
  location: '',
  qr_value: '',
  metadata: {},
  is_active: true,
}

const EMPTY_GROUP = {
  id: null,
  group_code: '',
  group_name: '',
  target_type: 'cctv_terminal_box',
  description: '',
}

function metadataToText(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return ''
  return JSON.stringify(metadata, null, 2)
}

function getTargetTypeOptions(targets, groups) {
  const types = new Set(['cctv_terminal_box', 'ups', 'nvr', 'switch'])
  targets.forEach((target) => target.target_type && types.add(target.target_type))
  groups.forEach((group) => group.target_type && types.add(group.target_type))
  return Array.from(types).sort()
}

function TargetForm({ draft, fieldErrors, saving, targetTypeOptions, onChange, onSave, onNew }) {
  const metadataText = metadataToText(draft.metadata)

  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Target record</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{draft.id ? 'Edit Target' : 'Create Target'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">ลงทะเบียน asset รายตัวพร้อม QR value สำหรับใช้ต่อยอด Asset History</p>
        </div>
        <button type="button" onClick={onNew} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
          New Target
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Target Code
          <input value={draft.target_code} onChange={(event) => onChange('target_code', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
          {fieldErrors.target_code && <span className="text-xs text-red-600">{fieldErrors.target_code}</span>}
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Target Type
          <input list="target-type-options" value={draft.target_type} onChange={(event) => onChange('target_type', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
          <datalist id="target-type-options">
            {targetTypeOptions.map((type) => <option key={type} value={type} />)}
          </datalist>
          {fieldErrors.target_type && <span className="text-xs text-red-600">{fieldErrors.target_type}</span>}
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Target Name
          <input value={draft.name} onChange={(event) => onChange('name', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
          {fieldErrors.name && <span className="text-xs text-red-600">{fieldErrors.name}</span>}
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Location
          <input value={draft.location} onChange={(event) => onChange('location', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          QR Value
          <input value={draft.qr_value} onChange={(event) => onChange('qr_value', event.target.value)} placeholder="ปล่อยว่างเพื่อ generate จาก type/code" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
          {fieldErrors.qr_value && <span className="text-xs text-red-600">{fieldErrors.qr_value}</span>}
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Metadata JSON
          <textarea value={metadataText} onChange={(event) => onChange('metadataText', event.target.value)} rows={6} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-900 outline-none focus:border-blue-500" />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-700">
          <input type="checkbox" checked={draft.is_active !== false} onChange={(event) => onChange('is_active', event.target.checked)} />
          Active target
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" disabled={saving} onClick={onSave} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Target'}
        </button>
      </div>
    </section>
  )
}

function GroupForm({ draft, fieldErrors, saving, targetTypeOptions, onChange, onSave, onNew }) {
  return (
    <section className="rounded-[28px] border border-slate-200/90 bg-white/95 p-6 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-violet-600">Target group</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{draft.id ? 'Edit Group' : 'Create Group'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">จัดกลุ่ม asset เพื่อเตรียมผูก template แบบ per_group</p>
        </div>
        <button type="button" onClick={onNew} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
          New Group
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Group Code
          <input value={draft.group_code} onChange={(event) => onChange('group_code', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500" />
          {fieldErrors.group_code && <span className="text-xs text-red-600">{fieldErrors.group_code}</span>}
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Target Type
          <input list="group-target-type-options" value={draft.target_type} onChange={(event) => onChange('target_type', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500" />
          <datalist id="group-target-type-options">
            {targetTypeOptions.map((type) => <option key={type} value={type} />)}
          </datalist>
          {fieldErrors.target_type && <span className="text-xs text-red-600">{fieldErrors.target_type}</span>}
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Group Name
          <input value={draft.group_name} onChange={(event) => onChange('group_name', event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-violet-500" />
          {fieldErrors.group_name && <span className="text-xs text-red-600">{fieldErrors.group_name}</span>}
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
          Description
          <textarea value={draft.description} onChange={(event) => onChange('description', event.target.value)} rows={4} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500" />
        </label>
      </div>

      <div className="mt-6 flex justify-end">
        <button type="button" disabled={saving} onClick={onSave} className="rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-600/20 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Group'}
        </button>
      </div>
    </section>
  )
}

export function TargetRegistryClient({ currentUser, initialTargets, initialGroups, mappings }) {
  const [targets, setTargets] = useState(initialTargets)
  const [groups, setGroups] = useState(initialGroups)
  const [activeTab, setActiveTab] = useState('targets')
  const [search, setSearch] = useState('')
  const [targetDraft, setTargetDraft] = useState(EMPTY_TARGET)
  const [groupDraft, setGroupDraft] = useState(EMPTY_GROUP)
  const [targetErrors, setTargetErrors] = useState({})
  const [groupErrors, setGroupErrors] = useState({})
  const [status, setStatus] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const deferredSearch = useDeferredValue(search)

  const targetTypeOptions = useMemo(() => getTargetTypeOptions(targets, groups), [targets, groups])
  const activeTargets = targets.filter((target) => target.is_active !== false).length
  const mappedTargets = new Set((mappings || []).map((mapping) => mapping.target_id).filter(Boolean)).size

  const filteredTargets = targets.filter((target) => {
    const needle = deferredSearch.trim().toLowerCase()
    if (!needle) return true
    return `${target.target_code} ${target.target_type} ${target.name} ${target.location}`.toLowerCase().includes(needle)
  })

  function updateTargetDraft(field, value) {
    if (field === 'metadataText') {
      try {
        setTargetDraft((current) => ({ ...current, metadata: value.trim() ? JSON.parse(value) : {} }))
      } catch {
        setTargetDraft((current) => ({ ...current, metadata: current.metadata }))
      }
      return
    }

    setTargetDraft((current) => ({ ...current, [field]: value }))
  }

  function saveTarget() {
    setSaving(true)
    setStatus({ type: '', text: '' })
    startTransition(async () => {
      const result = await saveChecklistTarget(targetDraft)
      setSaving(false)
      if (!result.success) {
        setTargetErrors(result.fieldErrors || {})
        setStatus({ type: 'error', text: result.error || 'ไม่สามารถบันทึก Target ได้' })
        return
      }
      setTargetErrors({})
      setStatus({ type: 'success', text: result.message })
      setTargetDraft(result.target)
      setTargets((current) => {
        const index = current.findIndex((target) => target.id === result.target.id)
        if (index === -1) return [...current, result.target]
        const next = [...current]
        next[index] = result.target
        return next
      })
    })
  }

  function saveGroup() {
    setSaving(true)
    setStatus({ type: '', text: '' })
    startTransition(async () => {
      const result = await saveChecklistTargetGroup(groupDraft)
      setSaving(false)
      if (!result.success) {
        setGroupErrors(result.fieldErrors || {})
        setStatus({ type: 'error', text: result.error || 'ไม่สามารถบันทึก Target Group ได้' })
        return
      }
      setGroupErrors({})
      setStatus({ type: 'success', text: result.message })
      setGroupDraft(result.group)
      setGroups((current) => {
        const index = current.findIndex((group) => group.id === result.group.id)
        if (index === -1) return [...current, result.group]
        const next = [...current]
        next[index] = result.group
        return next
      })
    })
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.10),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_56%,#f1f5f9_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-[30px] border border-slate-200/90 bg-white/95 p-6 shadow-sm md:p-8">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Target Registry Foundation</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Target Registry</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                จัดการ asset/target รายตัวสำหรับ checklist แบบผูกอุปกรณ์ เช่น CCTV Terminal Box พร้อม QR value และข้อมูลตั้งต้นสำหรับ Asset History
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <div><span className="font-black text-slate-950">User:</span> {currentUser?.full_name || 'Admin'}</div>
              <Link href="/dashboard/settings/checklist-master-data?type=checklist_categories" className="rounded-2xl bg-slate-900 px-4 py-2 text-center text-sm font-black text-white">
                Back to Master Data
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['Total Targets', targets.length],
            ['Active Targets', activeTargets],
            ['Mapped Targets', mappedTargets],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
              <div className="mt-3 text-3xl font-black text-slate-950">{value}</div>
            </div>
          ))}
        </section>

        {status.text && (
          <div className={cn('rounded-2xl border px-4 py-3 text-sm font-bold', status.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
            {status.text}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <aside className="grid gap-4 rounded-[28px] border border-slate-200 bg-white/95 p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button type="button" onClick={() => setActiveTab('targets')} className={cn('rounded-xl px-3 py-2 text-sm font-black', activeTab === 'targets' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500')}>
                Targets
              </button>
              <button type="button" onClick={() => setActiveTab('groups')} className={cn('rounded-xl px-3 py-2 text-sm font-black', activeTab === 'groups' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500')}>
                Groups
              </button>
            </div>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search target..." className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500" />
            <div className="grid max-h-[640px] gap-3 overflow-auto pr-1">
              {activeTab === 'targets' ? filteredTargets.map((target) => (
                <button key={target.id} type="button" onClick={() => setTargetDraft(target)} className={cn('rounded-2xl border p-4 text-left transition', targetDraft.id === target.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-black text-slate-950">{target.target_code}</div>
                    <span className={cn('rounded-full px-2 py-1 text-[11px] font-black', target.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{target.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-700">{target.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{target.target_type} · {target.location || 'No location'}</div>
                </button>
              )) : groups.map((group) => (
                <button key={group.id} type="button" onClick={() => setGroupDraft(group)} className={cn('rounded-2xl border p-4 text-left transition', groupDraft.id === group.id ? 'border-violet-300 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50')}>
                  <div className="font-black text-slate-950">{group.group_code}</div>
                  <div className="mt-1 text-sm font-bold text-slate-700">{group.group_name}</div>
                  <div className="mt-1 text-xs text-slate-500">{group.target_type}</div>
                </button>
              ))}
            </div>
          </aside>

          <main className="grid gap-6">
            {activeTab === 'targets' ? (
              <TargetForm draft={targetDraft} fieldErrors={targetErrors} saving={saving} targetTypeOptions={targetTypeOptions} onChange={updateTargetDraft} onSave={saveTarget} onNew={() => setTargetDraft(EMPTY_TARGET)} />
            ) : (
              <GroupForm draft={groupDraft} fieldErrors={groupErrors} saving={saving} targetTypeOptions={targetTypeOptions} onChange={(field, value) => setGroupDraft((current) => ({ ...current, [field]: value }))} onSave={saveGroup} onNew={() => setGroupDraft(EMPTY_GROUP)} />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
