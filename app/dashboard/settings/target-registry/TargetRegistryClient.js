'use client'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { saveChecklistTarget, deleteChecklistTarget } from '@/app/actions/target'
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
    target_code: record?.target_code ?? '',
    target_type: record?.target_type ?? '',
    name: record?.name ?? '',
    location: record?.location ?? '',
    qr_value: record?.qr_value ?? '',
    is_active: record?.is_active !== false,
    metadata,
    building: metadata.building ?? '',
    floor: metadata.floor ?? '',
    zone: metadata.zone ?? '',
    serial_no: metadata.serial_no ?? '',
    vendor: metadata.vendor ?? '',
    _original_qr_value: record?.qr_value ?? '',
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

function buildQrPreview(targetType, targetCode) {
  const safeType = String(targetType || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-') || 'TARGET'
  const safeCode = String(targetCode || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-')
  if (!safeCode) return ''
  return `${safeType}-${safeCode}`
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

// ── TargetTypeDropdown ──────────────────────────────────────────
function TargetTypeDropdown({ value, options, onChange, error, onAddType }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [addError, setAddError] = useState('')

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
  const canAdd = search.trim().length > 0 && !options.some((o) => o.toLowerCase() === search.trim().toLowerCase())

  function selectType(type) {
    onChange(type)
    setOpen(false)
    setSearch('')
  }

  function openAddModal() {
    setNewTypeName(search.trim())
    setAddError('')
    setAddModal(true)
  }

  function confirmAdd() {
    const val = newTypeName.trim()
    if (!val) { setAddError('กรุณากรอกชื่อประเภท'); return }
    if (options.some((o) => o.toLowerCase() === val.toLowerCase())) { setAddError('ประเภทนี้มีอยู่แล้ว'); return }
    onAddType(val)
    onChange(val)
    setAddModal(false)
    setOpen(false)
    setSearch('')
    setNewTypeName('')
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch('') }}
        style={{
          ...S.input(),
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
          color: value ? '#0f172a' : '#94a3b8',
        }}
      >
        <span>{value || 'กรุณาเลือกประเภท Target'}</span>
        <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาประเภท..."
              style={{ flex: 1, padding: '10px 14px', border: 'none', outline: 'none', fontSize: 13, background: 'transparent', color: '#0f172a' }}
            />
            {canAdd && (
              <button
                type="button"
                onClick={openAddModal}
                title={`เพิ่ม "${search.trim()}" เป็นประเภทใหม่`}
                style={{
                  padding: '0 14px', height: 40, border: 'none', borderLeft: '1px solid #f1f5f9',
                  background: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: 18,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                }}
              >+</button>
            )}
          </div>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>
                ไม่พบประเภทที่ค้นหา{canAdd ? '' : ' — พิมพ์เพื่อเพิ่มใหม่'}
              </div>
            ) : filtered.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => selectType(type)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none',
                  background: type === value ? '#eff6ff' : '#fff',
                  color: type === value ? '#2563eb' : '#0f172a',
                  fontSize: 13, fontWeight: type === value ? 700 : 400,
                  cursor: 'pointer', display: 'block',
                }}
              >{type}</button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => { setOpen(false); setSearch('') }} />
      )}

      {/* Add Type Confirm Modal */}
      {addModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(15,23,42,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '28px 32px', maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.16)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>เพิ่มประเภท Target ใหม่</p>
            <div style={S.fieldGroup}>
              <label style={S.label}>ชื่อประเภท</label>
              <input
                autoFocus
                value={newTypeName}
                onChange={(e) => { setNewTypeName(e.target.value); setAddError('') }}
                onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
                placeholder="เช่น cctv_outdoor"
                style={S.input()}
              />
              {addError && <span style={S.errMsg}>{addError}</span>}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>ประเภทใหม่นี้จะถูกบันทึกพร้อมกับ Target</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAddModal(false)} style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>ยกเลิก</button>
              <button type="button" onClick={confirmAdd} style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>ยืนยันเพิ่ม</button>
            </div>
          </div>
        </div>
      )}

      {error && <span style={S.errMsg}>{error}</span>}
    </div>
  )
}

// ── QR Frame Presets ────────────────────────────────────────────
const QR_FRAME_PRESETS = [
  { id: 'none', label: 'ไม่มีกรอบ', icon: '🚫' },
  { id: 'simple', label: 'กรอบเรียบ', icon: '▢' },
  { id: 'rounded', label: 'กรอบโค้ง', icon: '▣' },
  { id: 'double', label: 'กรอบคู่', icon: '⊡' },
  { id: 'shadow', label: 'เงา', icon: '◫' },
  { id: 'dashed', label: 'เส้นปะ', icon: '⬚' },
  { id: 'badge', label: 'Badge', icon: '🏷' },
  { id: 'banner_top', label: 'Banner บน', icon: '🔳' },
  { id: 'banner_bottom', label: 'Banner ล่าง', icon: '🔲' },
  { id: 'ticket', label: 'Ticket', icon: '🎫' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'label', label: 'สติ๊กเกอร์', icon: '🔖' },
]

function drawQrFrame(ctx, preset, W, H, bgColor, fgColor, frameText, subText, qrImg) {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)

  const qrSize = 260
  const qrX = (W - qrSize) / 2

  switch (preset) {
    case 'none': {
      ctx.drawImage(qrImg, qrX, (H - qrSize) / 2, qrSize, qrSize)
      break
    }
    case 'simple': {
      ctx.strokeStyle = fgColor; ctx.lineWidth = 2
      ctx.strokeRect(10, 10, W - 20, H - 20)
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 42) }
      ctx.drawImage(qrImg, qrX, 55, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 55 + qrSize + 28) }
      break
    }
    case 'rounded': {
      ctx.strokeStyle = fgColor; ctx.lineWidth = 3
      ctx.beginPath(); if (ctx.roundRect) { ctx.roundRect(10, 10, W - 20, H - 20, 20) } else { ctx.rect(10, 10, W - 20, H - 20) }; ctx.stroke()
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 44) }
      ctx.drawImage(qrImg, qrX, 58, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 58 + qrSize + 28) }
      break
    }
    case 'double': {
      ctx.strokeStyle = fgColor; ctx.lineWidth = 1.5; ctx.strokeRect(6, 6, W - 12, H - 12)
      ctx.lineWidth = 3; ctx.strokeRect(14, 14, W - 28, H - 28)
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 44) }
      ctx.drawImage(qrImg, qrX, 58, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 58 + qrSize + 26) }
      break
    }
    case 'shadow': {
      ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4
      ctx.fillStyle = '#fff'; ctx.fillRect(14, 14, W - 28, H - 28)
      ctx.shadowColor = 'transparent'
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 46) }
      ctx.drawImage(qrImg, qrX, 60, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 60 + qrSize + 28) }
      break
    }
    case 'dashed': {
      ctx.setLineDash([10, 6]); ctx.strokeStyle = fgColor; ctx.lineWidth = 2
      ctx.strokeRect(10, 10, W - 20, H - 20); ctx.setLineDash([])
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 42) }
      ctx.drawImage(qrImg, qrX, 55, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 55 + qrSize + 28) }
      break
    }
    case 'badge': {
      ctx.fillStyle = fgColor
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(0, 0, W, 56, [20, 20, 0, 0]); ctx.fill() }
      else { ctx.fillRect(0, 0, W, 56) }
      ctx.fillStyle = bgColor; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText || 'SCAN ME', W / 2, 36)
      ctx.drawImage(qrImg, qrX, 70, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 70 + qrSize + 26) }
      break
    }
    case 'banner_top': {
      ctx.fillStyle = fgColor; ctx.fillRect(0, 0, W, 52)
      ctx.fillStyle = bgColor; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText || 'SCAN ME', W / 2, 34)
      ctx.strokeStyle = fgColor; ctx.lineWidth = 2; ctx.strokeRect(8, 60, W - 16, qrSize + 16)
      ctx.drawImage(qrImg, qrX, 68, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 68 + qrSize + 26) }
      break
    }
    case 'banner_bottom': {
      ctx.strokeStyle = fgColor; ctx.lineWidth = 2; ctx.strokeRect(8, 10, W - 16, qrSize + 16)
      ctx.drawImage(qrImg, qrX, 18, qrSize, qrSize)
      ctx.fillStyle = fgColor; ctx.fillRect(0, H - 52, W, 52)
      ctx.fillStyle = bgColor; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText || frameText || 'SCAN ME', W / 2, H - 18)
      break
    }
    case 'ticket': {
      ctx.strokeStyle = fgColor; ctx.lineWidth = 2; ctx.setLineDash([8, 5]); ctx.strokeRect(10, 10, W - 20, H - 20); ctx.setLineDash([])
      ctx.beginPath(); ctx.arc(0, H / 2, 18, -Math.PI / 2, Math.PI / 2); ctx.fillStyle = bgColor; ctx.fill()
      ctx.beginPath(); ctx.arc(W, H / 2, 18, Math.PI / 2, -Math.PI / 2); ctx.fill()
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 40) }
      ctx.drawImage(qrImg, qrX, 54, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 54 + qrSize + 24) }
      break
    }
    case 'card': {
      ctx.fillStyle = '#f8fafc'
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(8, 8, W - 16, H - 16, 16); ctx.fill() }
      else { ctx.fillRect(8, 8, W - 16, H - 16) }
      ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(8, 8, W - 16, H - 16, 16); ctx.stroke() }
      else { ctx.strokeRect(8, 8, W - 16, H - 16) }
      if (frameText) { ctx.fillStyle = fgColor; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText, W / 2, 40) }
      ctx.drawImage(qrImg, qrX, 52, qrSize, qrSize)
      if (subText) { ctx.fillStyle = '#64748b'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 52 + qrSize + 26) }
      break
    }
    case 'label': {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1; ctx.strokeRect(4, 4, W - 8, H - 8)
      ctx.fillStyle = fgColor; ctx.fillRect(0, 0, W, 36)
      ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameText || 'ASSET TAG', W / 2, 24)
      ctx.drawImage(qrImg, qrX, 46, qrSize, qrSize)
      if (subText) { ctx.fillStyle = fgColor; ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(subText, W / 2, 46 + qrSize + 22) }
      break
    }
    default:
      ctx.drawImage(qrImg, qrX, (H - qrSize) / 2, qrSize, qrSize)
  }
}

// ── QR Field Selector ───────────────────────────────────────────
function FieldSelector({ label, value, onChange, customValue, onCustomChange, fieldOptions }) {
  return (
    <div style={S.fieldGroup}>
      <label style={S.label}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: value === 'custom' ? 8 : 0 }}>
        {fieldOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: value === opt.value ? 700 : 500,
              border: value === opt.value ? '2px solid #2563eb' : '1px solid #e2e8f0',
              background: value === opt.value ? '#eff6ff' : '#f8fafc',
              color: value === opt.value ? '#2563eb' : '#475569',
              cursor: 'pointer',
            }}
          >
            {opt.label}
            {opt.value !== 'custom' && opt.displayValue && (
              <span style={{ marginLeft: 6, color: value === opt.value ? '#93c5fd' : '#94a3b8', fontWeight: 400 }}>
                — {opt.displayValue}
              </span>
            )}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <input
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="พิมพ์ข้อความเอง..."
          style={S.input()}
        />
      )}
      {value !== 'custom' && (
        <div style={{ fontSize: 12, color: '#94a3b8', padding: '6px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
          ค่าที่จะแสดง: <strong style={{ color: '#475569' }}>{(fieldOptions.find(f => f.value === value)?.displayValue || '') || '(ว่าง)'}</strong>
        </div>
      )}
    </div>
  )
}

// ── QR Preview Modal ────────────────────────────────────────────
function QrPreviewModal({ qrImageUrl, draft, onClose }) {
  const targetCode = draft?.target_code || ''
  const targetName = draft?.name || ''
  const targetType = draft?.target_type || ''
  const location = draft?.location || ''

  const fieldOptions = [
    { value: 'target_code', label: 'Target Code', displayValue: targetCode },
    { value: 'target_type', label: 'Target Type', displayValue: targetType },
    { value: 'target_name', label: 'Target Name', displayValue: targetName },
    { value: 'location', label: 'Location', displayValue: location },
    { value: 'custom', label: 'Custom...' },
  ]

  const [activeTab, setActiveTab] = useState('frame')
  const [framePreset, setFramePreset] = useState('simple')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [fgColor, setFgColor] = useState('#000000')

  const [topFieldKey, setTopFieldKey] = useState('target_code')
  const [topCustom, setTopCustom] = useState(targetCode)
  const [bottomFieldKey, setBottomFieldKey] = useState('target_name')
  const [bottomCustom, setBottomCustom] = useState(targetName)

  const canvasRef = useRef(null)
  const [qrImgLoaded, setQrImgLoaded] = useState(false)
  const qrImgRef = useRef(null)

  const qrSrc = qrImageUrl
    ? qrImageUrl.replace('size=400x400', 'size=300x300') + `&bgcolor=${bgColor.replace('#', '')}&color=${fgColor.replace('#', '')}`
    : ''

  const frameText = topFieldKey === 'custom' ? topCustom : (fieldOptions.find(f => f.value === topFieldKey)?.displayValue || '')
  const subText = bottomFieldKey === 'custom' ? bottomCustom : (fieldOptions.find(f => f.value === bottomFieldKey)?.displayValue || '')

  function redrawCanvas() {
    if (!canvasRef.current || !qrImgRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawQrFrame(ctx, framePreset, canvas.width, canvas.height, bgColor, fgColor, frameText, subText, qrImgRef.current)
  }

  useEffect(() => {
    if (!qrSrc) return
    qrImgRef.current = null
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      qrImgRef.current = img
      setQrImgLoaded(true)
      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawQrFrame(ctx, framePreset, canvas.width, canvas.height, bgColor, fgColor, frameText, subText, img)
      }
    }
    img.onerror = () => { qrImgRef.current = null }
    img.src = qrSrc
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrSrc])

  useEffect(() => {
    redrawCanvas()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framePreset, bgColor, fgColor, frameText, subText])

  function handleDownload() {
    if (!canvasRef.current || !qrImgRef.current) return
    canvasRef.current.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${(targetCode || 'qr').replace(/\s+/g, '-')}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/jpeg', 0.95)
  }

  const tabs = [{ id: 'frame', label: 'กรอบ' }, { id: 'text', label: 'ข้อความ' }, { id: 'color', label: 'สี & รูปทรง' }]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 840, maxHeight: '92vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>ออกแบบ QR Code</p>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', padding: 4 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left: Canvas Preview */}
          <div style={{ width: 280, flexShrink: 0, background: '#f8fafc', borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
            <canvas
              ref={canvasRef}
              width={400}
              height={420}
              style={{ width: 220, height: 231, borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', background: bgColor }}
            />
            {!qrImgLoaded && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, textAlign: 'center' }}>กำลังโหลด QR...</p>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!qrImgLoaded}
              style={{ ...S.saveBtn('#2563eb', '0 4px 12px rgba(37,99,235,0.2)'), width: '100%', opacity: qrImgLoaded ? 1 : 0.5, fontSize: 13 }}
            >
              Download QR (.jpg)
            </button>
          </div>

          {/* Right: Controls */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '14px 24px', border: 'none', background: 'none', cursor: 'pointer',
                    fontSize: 14, fontWeight: activeTab === t.id ? 700 : 500,
                    color: activeTab === t.id ? '#2563eb' : '#64748b',
                    borderBottom: activeTab === t.id ? '2px solid #2563eb' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >{t.label}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

              {/* Tab: กรอบ */}
              {activeTab === 'frame' && (
                <div>
                  <p style={{ ...S.label, marginBottom: 14 }}>เลือกรูปแบบกรอบ</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {QR_FRAME_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setFramePreset(p.id)}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 6, padding: '12px 8px', borderRadius: 12,
                          border: framePreset === p.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                          background: framePreset === p.id ? '#eff6ff' : '#f8fafc',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 22 }}>{p.icon}</span>
                        <span style={{ fontSize: 11, color: framePreset === p.id ? '#2563eb' : '#64748b', fontWeight: framePreset === p.id ? 700 : 400, textAlign: 'center' }}>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: ข้อความ */}
              {activeTab === 'text' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <FieldSelector
                    label="ข้อความบน QR"
                    value={topFieldKey}
                    onChange={setTopFieldKey}
                    customValue={topCustom}
                    onCustomChange={setTopCustom}
                    fieldOptions={fieldOptions}
                  />
                  <FieldSelector
                    label="ข้อความล่าง QR"
                    value={bottomFieldKey}
                    onChange={setBottomFieldKey}
                    customValue={bottomCustom}
                    onCustomChange={setBottomCustom}
                    fieldOptions={fieldOptions}
                  />
                </div>
              )}

              {/* Tab: สี */}
              {activeTab === 'color' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>สีพื้นหลัง</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 48, height: 40, border: '1px solid #e2e8f0', borderRadius: 10, padding: 3, cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, color: '#475569', fontFamily: 'monospace' }}>{bgColor}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {['#ffffff', '#f8fafc', '#1e293b', '#1d4ed8', '#16a34a', '#dc2626', '#d97706', '#7c3aed'].map((c) => (
                        <button key={c} type="button" onClick={() => setBgColor(c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: bgColor === c ? '3px solid #2563eb' : '1px solid #e2e8f0', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                  <div style={S.fieldGroup}>
                    <label style={S.label}>สี QR / ข้อความ</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} style={{ width: 48, height: 40, border: '1px solid #e2e8f0', borderRadius: 10, padding: 3, cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, color: '#475569', fontFamily: 'monospace' }}>{fgColor}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {['#000000', '#0f172a', '#1e40af', '#166534', '#991b1b', '#92400e', '#5b21b6', '#ffffff'].map((c) => (
                        <button key={c} type="button" onClick={() => setFgColor(c)} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: fgColor === c ? '3px solid #2563eb' : '1px solid #e2e8f0', cursor: 'pointer' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TargetForm({
  draft,
  fieldErrors,
  saving,
  deleting,
  targetTypeOptions,
  qrBaseDefault,
  qrEnvLabel,
  qrBaseOverride,
  onQrBaseOverrideChange,
  onResetQrBaseOverride,
  onChange,
  onSave,
  onNew,
  onDelete,
  onAddTargetType,
}) {
  const [showQrModal, setShowQrModal] = useState(false)

  const qrValue = draft.id
    ? String(draft.qr_value || '').trim()
    : buildQrPreview(draft.target_type, draft.target_code)
  const effectiveBaseUrl = String(qrBaseOverride || '').trim() || qrBaseDefault
  const absolutePublicUrl = buildAbsolutePublicUrl(effectiveBaseUrl, qrValue)
  const publicPreviewUrl = qrValue ? `/public/checklist/qr?value=${encodeURIComponent(qrValue)}` : ''
  const publicLinkDisplay = absolutePublicUrl || publicPreviewUrl
  const hasBaseUrlError = Boolean(qrValue) && !absolutePublicUrl
  const qrPreviewImage = absolutePublicUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(absolutePublicUrl)}`
    : ''

  return (
    <section style={{ ...S.card, height: '100%', boxSizing: 'border-box' }}>
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

          {/* Target Type — custom dropdown */}
          <div style={S.fieldGroup}>
            <label style={S.label}>Target Type</label>
            <TargetTypeDropdown
              value={draft.target_type}
              options={targetTypeOptions}
              onChange={(v) => onChange('target_type', v)}
              error={fieldErrors.target_type}
              onAddType={onAddTargetType}
            />
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

          {/* QR Value — read-only */}
          <div style={S.fieldGroup}>
            <label style={S.label}>QR Value <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#94a3b8' }}>(Auto-generated)</span></label>
            <input
              value={draft.id ? draft.qr_value : buildQrPreview(draft.target_type, draft.target_code)}
              readOnly
              tabIndex={-1}
              placeholder="จะ generate อัตโนมัติจาก Type + Code"
              style={{ ...S.input('#3b82f6'), background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
            />
            <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>ระบบสร้างให้อัตโนมัติ ไม่สามารถแก้ไขได้</span>
            {fieldErrors.qr_value && <span style={S.errMsg}>{fieldErrors.qr_value}</span>}
          </div>

          {/* QR Preview section */}
          <div style={{ ...S.fieldGroup, gridColumn: 'span 2', padding: '14px', border: '1px solid #e2e8f0', borderRadius: 12, background: '#f8fafc' }}>
            <label style={S.label}>QR Preview</label>
            {qrValue ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrPreviewImage} alt="QR Preview" style={{ width: 120, height: 120, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }} />
                <div style={{ display: 'grid', gap: 8, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
                    <span>Public Link</span>
                    <span title={`QR ใช้โดเมน ${qrEnvLabel}`} style={{ width: 16, height: 16, borderRadius: 999, border: '1px solid #cbd5e1', color: '#64748b', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, cursor: 'help', background: '#fff' }}>i</span>
                  </div>
                  <input value={publicLinkDisplay} readOnly style={{ ...S.input(), fontSize: 12, background: '#fff' }} />
                  {hasBaseUrlError && <span style={S.errMsg}>Base URL ไม่ถูกต้อง เช่น https://it.dowa.co.th</span>}
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    disabled={!qrPreviewImage}
                    style={{ ...S.newBtn, textAlign: 'center', opacity: qrPreviewImage ? 1 : 0.5 }}
                  >
                    Preview QR Code
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

          {/* Metadata Fields */}
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

      {/* Footer — Save + Delete side by side */}
      <div style={{ ...S.cardFooter, justifyContent: 'space-between' }}>
        <div>
          {draft.id && (
            <button
              type="button"
              disabled={deleting || saving}
              onClick={onDelete}
              style={{
                padding: '10px 20px', borderRadius: 10, border: '1px solid #fecaca',
                background: '#fff', color: '#dc2626', fontSize: 14, fontWeight: 700,
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>✕</span>
              {deleting ? 'กำลังลบ...' : 'ลบ Target นี้'}
            </button>
          )}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          style={{ ...S.saveBtn('#2563eb', '0 4px 12px rgba(37,99,235,0.25)'), opacity: saving ? 0.5 : 1 }}
        >
          {saving ? 'Saving...' : 'Save Target'}
        </button>
      </div>

      {/* QR Preview Modal */}
      {showQrModal && (
        <QrPreviewModal
          qrImageUrl={qrPreviewImage}
          draft={draft}
          onClose={() => setShowQrModal(false)}
        />
      )}
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
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
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

  const [extraTargetTypes, setExtraTargetTypes] = useState([])

  const targetTypeOptions = useMemo(() => {
    const base = getTargetTypeOptions(targets)
    const all = new Set([...base, ...extraTargetTypes])
    return Array.from(all).sort()
  }, [targets, extraTargetTypes])

  function addTargetType(type) {
    setExtraTargetTypes((prev) => prev.includes(type) ? prev : [...prev, type])
  }

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

  function requestDelete() {
    setDeleteConfirm(true)
  }

  function cancelDelete() {
    setDeleteConfirm(false)
  }

  function confirmDelete() {
    setDeleteConfirm(false)
    setDeleting(true)
    setStatus({ type: '', text: '' })
    startTransition(async () => {
      const result = await deleteChecklistTarget(targetDraft.id)
      setDeleting(false)
      if (!result.success) {
        setStatus({ type: 'error', text: result.error || 'ไม่สามารถลบ Target ได้' })
        return
      }
      setTargets((current) => current.filter((t) => t.id !== targetDraft.id))
      setTargetDraft(EMPTY_TARGET)
      setTargetErrors({})
      setStatus({ type: 'success', text: result.message || 'ลบ Target เรียบร้อยแล้ว' })
    })
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
        <div className="tr-main-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'stretch' }}>

          {/* Sidebar */}
          <aside style={{ ...S.card, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0, alignSelf: 'stretch', boxSizing: 'border-box', maxHeight: 'calc(100vh - 200px)', overflow: 'hidden' }}>
            {/* Search */}
            <input
              className="tr-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา Target..."
              style={{ ...S.input(), padding: '10px 14px', borderRadius: 10 }}
            />

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
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
          <main style={{ height: '100%' }}>
            <TargetForm
              draft={targetDraft}
              fieldErrors={targetErrors}
              saving={saving}
              deleting={deleting}
              targetTypeOptions={targetTypeOptions}
              qrBaseDefault={qrBaseDefault}
              qrEnvLabel={qrEnvLabel}
              qrBaseOverride={qrBaseOverride}
              onQrBaseOverrideChange={setQrBaseOverride}
              onResetQrBaseOverride={() => setQrBaseOverride('')}
              onChange={updateTargetDraft}
              onSave={saveTarget}
              onNew={() => setTargetDraft(EMPTY_TARGET)}
              onDelete={requestDelete}
              onAddTargetType={addTargetType}
            />
          </main>

        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15,23,42,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '32px 36px',
            maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 28 }}>🗑️</span>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>ยืนยันการลบ Target</p>
                <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>การลบนี้ไม่สามารถกู้คืนได้</p>
              </div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>{targetDraft.target_code}</p>
              <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>{targetDraft.name}</p>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Target นี้จะถูกลบออกจากระบบพร้อมกับ Template Mapping ที่เชื่อมไว้ทั้งหมด
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="button"
                onClick={cancelDelete}
                style={{ padding: '9px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.25)' }}
              >
                ยืนยันลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
