'use client'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'
import { saveChecklistTarget } from '@/app/actions/target'
import { cn } from '@/lib/cn'

const EMPTY_TARGET = {
  id: null,
  target_code: '',
  target_type: 'cctv_terminal_box',
  name: '',
  location: '',
  qr_value: '',
  metadata: {},
  building: '',
  floor: '',
  zone: '',
  serial_no: '',
  vendor: '',
  _original_qr_value: '',
  is_active: true,
}

function metadataToText(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return ''
  return JSON.stringify(metadata, null, 2)
}

const KNOWN_METADATA_KEYS = ['building', 'floor', 'zone', 'serial_no', 'vendor']

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withProtocol)
    return `${u.protocol}//${u.host}`
  } catch {
    return ''
  }
}

function buildAbsolutePublicUrl(baseUrl, qrValue) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const code = String(qrValue || '').trim()
  if (!normalizedBase || !code) return ''
  return `${normalizedBase}/public/checklist/qr?value=${encodeURIComponent(code)}`
}

function hydrateTargetDraft(record) {
  const metadata = record?.metadata && typeof record.metadata === 'object' ? record.metadata : {}
  return {
    ...record,
    metadata,
    building: metadata.building || '',
    floor: metadata.floor || '',
    zone: metadata.zone || '',
    serial_no: metadata.serial_no || '',
    vendor: metadata.vendor || '',
    _original_qr_value: record?.qr_value || '',
  }
}

function composeMetadataFromDraft(draft) {
  const base = { ...(draft.metadata || {}) }
  for (const key of KNOWN_METADATA_KEYS) delete base[key]

  const next = {
    ...base,
    ...(draft.building ? { building: draft.building } : {}),
    ...(draft.floor ? { floor: draft.floor } : {}),
    ...(draft.zone ? { zone: draft.zone } : {}),
    ...(draft.serial_no ? { serial_no: draft.serial_no } : {}),
    ...(draft.vendor ? { vendor: draft.vendor } : {}),
  }

  return next
}

function getTargetTypeOptions(targets) {
  const types = new Set(['cctv_terminal_box', 'ups', 'nvr', 'switch'])
  targets.forEach((target) => target.target_type && types.add(target.target_type))
  return Array.from(types).sort()
}

// ── Shared styles ──────────────────────────────────────────────
const S = {
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '24px 32px',
    borderBottom: '1px solid #f1f5f9',
    background: '#fafafa',
  },
  cardBody: {
    padding: '28px 32px',
  },
  cardFooter: {
    padding: '16px 32px',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  eyebrow: (color) => ({
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.18em',
    color,
    marginBottom: 6,
  }),
  h2: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.6,
    margin: 0,
  },
  newBtn: {
    padding: '8px 16px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  input: (accent) => ({
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 14,
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }),
  textarea: {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0f172a',
    background: '#f8fafc',
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box',
    lineHeight: 1.6,
  },
  errMsg: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 2,
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    background: '#f8fafc',
    cursor: 'pointer',
    fontSize: 14,
    color: '#334155',
    fontWeight: 500,
  },
  saveBtn: (color, shadow) => ({
    padding: '10px 24px',
    borderRadius: 10,
    border: 'none',
    background: color,
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: shadow,
  }),
}

function TargetForm({
  draft,
  fieldErrors,
  saving,
  targetTypeOptions,
  qrBaseDefault,
  qrEnvLabel,
  qrBaseOverride,
  onQrBaseOverrideChange,
  onResetQrBaseOverride,
  onChange,
  onSave,
  onNew,
}) {
  const metadataText = metadataToText(draft.metadata)
  const qrValue = String(draft.qr_value || '').trim()
  const publicPreviewUrl = qrValue
    ? `/public/checklist/qr?value=${encodeURIComponent(qrValue)}`
    : ''
  const effectiveBaseUrl = String(qrBaseOverride || '').trim() || qrBaseDefault
  const absolutePublicUrl = buildAbsolutePublicUrl(effectiveBaseUrl, qrValue)
  const publicLinkDisplay = absolutePublicUrl || publicPreviewUrl
  const hasBaseUrlError = Boolean(qrValue) && !absolutePublicUrl
  const qrPreviewImage = absolutePublicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(absolutePublicUrl)}`
    : ''

  function handleDownloadQr() {
    if (!qrPreviewImage) return
    const a = document.createElement('a')
    a.href = qrPreviewImage
    a.download = `${(draft.target_code || 'qr-code').replace(/\s+/g, '-')}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <section style={S.card}>
      {/* Header */}
      <div style={S.cardHeader}>
        <div>
          <p style={S.eyebrow('#3b82f6')}>Target Record</p>
          <h2 style={S.h2}>{draft.id ? 'Edit Target' : 'Create Target'}</h2>
          <p style={S.subtitle}>ลงทะเบียน asset รายตัวพร้อม QR value สำหรับใช้ต่อยอด Asset History</p>
        </div>
        <button type="button" onClick={onNew} style={S.newBtn}>+ New Target</button>
      </div>

      {/* Fields */}
      <div style={S.cardBody}>
        <div style={S.formGrid}>

          {/* Target Code */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Target Code</label>
            <input
              value={draft.target_code}
              onChange={(e) => onChange('target_code', e.target.value)}
              style={S.input('#3b82f6')}
            />
            {fieldErrors.target_code && <span style={S.errMsg}>{fieldErrors.target_code}</span>}
          </div>

          {/* Target Type */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Target Type</label>
            <input
              list="target-type-options"
              value={draft.target_type}
              onChange={(e) => onChange('target_type', e.target.value)}
              style={S.input('#3b82f6')}
            />
            <datalist id="target-type-options">
              {targetTypeOptions.map((type) => <option key={type} value={type} />)}
            </datalist>
            {fieldErrors.target_type && <span style={S.errMsg}>{fieldErrors.target_type}</span>}
          </div>

          {/* Target Name — full width */}
          <div style={{ ...S.fieldGroup, gridColumn: 'span 2' }}>
            <label style={S.label}>Target Name</label>
            <input
              value={draft.name}
              onChange={(e) => onChange('name', e.target.value)}
              style={S.input('#3b82f6')}
            />
            {fieldErrors.name && <span style={S.errMsg}>{fieldErrors.name}</span>}
          </div>

          {/* Location */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Location</label>
            <input
              value={draft.location}
              onChange={(e) => onChange('location', e.target.value)}
              style={S.input('#3b82f6')}
            />
          </div>

          {/* QR Value */}
          <div style={S.fieldGroup}>
            <label style={S.label}>QR Value</label>
            <input
              value={draft.qr_value}
              onChange={(e) => onChange('qr_value', e.target.value)}
              placeholder="ปล่อยว่างเพื่อ generate จาก type/code"
              style={S.input('#3b82f6')}
            />
            {fieldErrors.qr_value && <span style={S.errMsg}>{fieldErrors.qr_value}</span>}
          </div>

          {/* QR Preview + Public link */}
          <div style={{ ...S.fieldGroup, gridColumn: 'span 2', padding: '14px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
            <label style={S.label}>QR Preview</label>
            {qrValue ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                <a href={qrPreviewImage} target="_blank" rel="noreferrer" title="Open full size QR (400x400)">
                  <img src={qrPreviewImage} alt="QR Preview" style={{ width: 160, height: 160, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
                </a>
                <div style={{ display: 'grid', gap: 8, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                    <span>Public Link</span>
                    <span
                      title={`QR จะใช้โดเมนจาก environment อัตโนมัติ (${qrEnvLabel}) และสามารถ override ได้เฉพาะครั้งก่อน Download`}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 999,
                        border: '1px solid #cbd5e1',
                        color: '#64748b',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'help',
                        background: '#fff',
                      }}
                    >
                      i
                    </span>
                  </div>
                  <input value={publicLinkDisplay} readOnly style={{ ...S.input(), fontSize: 12, background: '#fff' }} />
                  {hasBaseUrlError ? (
                    <span style={S.errMsg}>Base URL ไม่ถูกต้อง กรุณาใส่โดเมนให้ถูกต้อง เช่น https://it.dowa.co.th</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    disabled={!qrPreviewImage}
                    style={{ ...S.newBtn, textAlign: 'center', opacity: qrPreviewImage ? 1 : 0.5 }}
                  >
                    Download QR Code
                  </button>
                  <a href={absolutePublicUrl || publicPreviewUrl} target="_blank" rel="noreferrer" style={{ ...S.newBtn, textDecoration: 'none', textAlign: 'center', pointerEvents: hasBaseUrlError ? 'none' : 'auto', opacity: hasBaseUrlError ? 0.5 : 1 }}>
                    Preview Public Page
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8' }}>กรอกหรือปล่อยให้ระบบ generate QR Value ก่อน เพื่อดูตัวอย่าง QR</div>
            )}
          </div>

          {/* Metadata Fields — full width */}
          <div style={{ ...S.fieldGroup, gridColumn: 'span 2' }}>
            <label style={S.label}>Asset Metadata</label>
            <div style={S.formGrid} className="tr-form-grid">
              <div style={S.fieldGroup}>
                <label style={S.label}>Building</label>
                <input value={draft.building || ''} onChange={(e) => onChange('building', e.target.value)} style={S.input('#3b82f6')} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Floor</label>
                <input value={draft.floor || ''} onChange={(e) => onChange('floor', e.target.value)} style={S.input('#3b82f6')} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Zone</label>
                <input value={draft.zone || ''} onChange={(e) => onChange('zone', e.target.value)} style={S.input('#3b82f6')} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Serial No</label>
                <input value={draft.serial_no || ''} onChange={(e) => onChange('serial_no', e.target.value)} style={S.input('#3b82f6')} />
              </div>
              <div style={{ ...S.fieldGroup, gridColumn: 'span 2' }}>
                <label style={S.label}>Vendor</label>
                <input value={draft.vendor || ''} onChange={(e) => onChange('vendor', e.target.value)} style={S.input('#3b82f6')} />
              </div>
            </div>
          </div>

          {/* Metadata JSON (read-only) */}
          <div style={{ ...S.fieldGroup, gridColumn: 'span 2' }}>
            <label style={S.label}>Metadata JSON (Auto-generated)</label>
            <textarea
              value={metadataText}
              readOnly
              rows={5}
              style={S.textarea}
            />
          </div>

          {/* Active checkbox */}
          <label style={{ ...S.checkboxRow, gridColumn: 'span 2', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={draft.is_active !== false}
              onChange={(e) => onChange('is_active', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
            />
            Active target
          </label>

        </div>
      </div>

      {/* Footer */}
      <div style={S.cardFooter}>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          style={{ ...S.saveBtn('#2563eb', '0 4px 12px rgba(37,99,235,0.25)'), opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Target'}
        </button>
      </div>
    </section>
  )
}

export function TargetRegistryClient({ currentUser, initialTargets, mappings, embedded = false }) {
  const [targets, setTargets] = useState(initialTargets)
  const [search, setSearch] = useState('')
  const [targetDraft, setTargetDraft] = useState(EMPTY_TARGET)
  const [targetErrors, setTargetErrors] = useState({})
  const [status, setStatus] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)
  const [qrBaseOverride, setQrBaseOverride] = useState('')
  const deferredSearch = useDeferredValue(search)

  const qrBaseDefault = useMemo(() => {
    const fromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL)
    if (fromEnv) return fromEnv
    if (typeof window !== 'undefined') return normalizeBaseUrl(window.location.origin)
    return ''
  }, [])

  const qrEnvLabel = useMemo(() => {
    if (typeof window !== 'undefined') {
      const host = String(window.location.hostname || '').toLowerCase()
      if (host.includes('localhost') || host === '127.0.0.1') return 'Localhost'
    }
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') return 'Production'
    return 'Development'
  }, [])

  const targetTypeOptions = useMemo(() => getTargetTypeOptions(targets), [targets])
  const activeTargets = targets.filter((target) => target.is_active !== false).length
  const mappedTargets = new Set((mappings || []).map((mapping) => mapping.target_id).filter(Boolean)).size

  const filteredTargets = targets.filter((target) => {
    const needle = deferredSearch.trim().toLowerCase()
    if (!needle) return true
    return `${target.target_code} ${target.target_type} ${target.name} ${target.location}`.toLowerCase().includes(needle)
  })

  function updateTargetDraft(field, value) {
    setTargetDraft((current) => ({ ...current, [field]: value }))
  }

  function saveTarget() {
    const qrChanged = Boolean(targetDraft.id) && String(targetDraft.qr_value || '').trim() !== String(targetDraft._original_qr_value || '').trim()
    if (qrChanged) {
      const confirmed = window.confirm('QR Value มีการเปลี่ยนแปลง\nระบบแนะนำให้พิมพ์/บันทึกรูป QR ใหม่ทุกครั้ง\nยืนยันบันทึกต่อหรือไม่?')
      if (!confirmed) return
    }

    const payload = {
      ...targetDraft,
      metadata: composeMetadataFromDraft(targetDraft),
    }

    setSaving(true)
    setStatus({ type: '', text: '' })
    startTransition(async () => {
      const result = await saveChecklistTarget(payload)
      setSaving(false)
      if (!result.success) {
        setTargetErrors(result.fieldErrors || {})
        setStatus({ type: 'error', text: result.error || 'ไม่สามารถบันทึก Target ได้' })
        return
      }
      setTargetErrors({})
      setStatus({ type: 'success', text: result.message })
      setTargetDraft(hydrateTargetDraft(result.target))
      setTargets((current) => {
        const index = current.findIndex((target) => target.id === result.target.id)
        if (index === -1) return [...current, result.target]
        const next = [...current]
        next[index] = result.target
        return next
      })
    })
  }

  return (
    <div>
      <style>{`
        * { box-sizing: border-box; }
        .tr-input:focus { border-color: #93c5fd !important; box-shadow: 0 0 0 3px rgba(147,197,253,0.25) !important; background: #fff !important; }
        .tr-input-violet:focus { border-color: #c4b5fd !important; box-shadow: 0 0 0 3px rgba(196,181,253,0.25) !important; background: #fff !important; }
        .tr-list-btn:hover { background: #f8fafc !important; }
        .tr-list-btn-active { background: #eff6ff !important; border-color: #bfdbfe !important; }
        .tr-list-btn-active-violet { background: #f5f3ff !important; border-color: #ddd6fe !important; }
        .tr-new-btn:hover { background: #f1f5f9 !important; border-color: #cbd5e1 !important; color: #1e293b !important; }
        .tr-save-btn:hover { filter: brightness(1.08); }
        @media (max-width: 768px) {
          .tr-form-grid { grid-template-columns: 1fr !important; }
          .tr-form-grid > [style*="span 2"] { grid-column: span 1 !important; }
          .tr-main-layout { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: embedded ? 16 : 20 }}>

        {/* ── Page Header (standalone mode) ── */}
        {!embedded && (
          <header style={{ ...S.card, padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#2563eb', marginBottom: 6 }}>Checklist Setup</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.5px' }}>Target Registry</h1>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 16px', maxWidth: 640 }}>
              จัดการ asset/target รายตัวสำหรับ checklist แบบผูกอุปกรณ์ เช่น CCTV Terminal Box พร้อม QR value และข้อมูลตั้งต้นสำหรับ Asset History
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#f1f5f9', borderRadius: 8, fontSize: 13, color: '#475569' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>User:</span> {currentUser?.full_name || 'Admin'}
            </div>
          </header>
        )}

        {/* ── Stats row (standalone mode) ── */}
        {!embedded && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[['Total Targets', targets.length], ['Active Targets', activeTargets], ['Mapped Targets', mappedTargets]].map(([label, value]) => (
              <div key={label} style={{ ...S.card, padding: '20px 24px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#94a3b8', margin: '0 0 10px' }}>{label}</p>
                <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Status message ── */}
        {status.text && (
          <div style={{
            padding: '12px 18px', borderRadius: 12, fontSize: 14, fontWeight: 600,
            background: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
            color: status.type === 'error' ? '#b91c1c' : '#15803d',
            border: `1px solid ${status.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          }}>
            {status.text}
          </div>
        )}

        {/* ── Main layout: aside + form ── */}
        <div className="tr-main-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>

          {/* Sidebar */}
          <aside style={{ ...S.card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Search */}
            <input
              className="tr-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา Target..."
              style={{ ...S.input(), padding: '10px 14px', borderRadius: 10 }}
            />

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto', paddingRight: 2 }}>
              {filteredTargets.map((target) => (
                <button
                  key={target.id}
                  type="button"
                  onClick={() => setTargetDraft(hydrateTargetDraft(target))}
                  className={cn('tr-list-btn', targetDraft.id === target.id ? 'tr-list-btn-active' : '')}
                  style={{
                    width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0',
                    background: targetDraft.id === target.id ? '#eff6ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s',
                    borderColor: targetDraft.id === target.id ? '#bfdbfe' : '#e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{target.target_code}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: target.is_active ? '#dcfce7' : '#f1f5f9', color: target.is_active ? '#16a34a' : '#64748b' }}>
                      {target.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 2 }}>{target.name}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{target.target_type} · {target.location || 'No location'}</div>
                </button>
              ))}

              {filteredTargets.length === 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: 12, background: '#f8fafc' }}>
                  ไม่พบ Target ตามคำค้นหา
                </div>
              )}
            </div>
          </aside>

          {/* Form */}
          <main>
            <TargetForm
              draft={targetDraft}
              fieldErrors={targetErrors}
              saving={saving}
              targetTypeOptions={targetTypeOptions}
              qrBaseDefault={qrBaseDefault}
              qrEnvLabel={qrEnvLabel}
              qrBaseOverride={qrBaseOverride}
              onQrBaseOverrideChange={setQrBaseOverride}
              onResetQrBaseOverride={() => setQrBaseOverride('')}
              onChange={updateTargetDraft}
              onSave={saveTarget}
              onNew={() => setTargetDraft(EMPTY_TARGET)}
            />
          </main>

        </div>
      </div>
    </div>
  )
}
