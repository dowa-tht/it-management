'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { FREQUENCY_OPTIONS, TEMPLATE_TYPE_OPTIONS } from '@/lib/checklistTemplateValidation'

function FieldHint({ text }) {
  if (!text) return null
  return <p className="mt-2 text-xs text-rose-600">{text}</p>
}

function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="mb-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
      <h3 className="template-form-title" style={{ marginTop: 8 }}>{title}</h3>
      <p className="template-form-description">{description}</p>
    </div>
  )
}

export function TemplateForm({
  categories,
  procedurePlans,
  targetTypes = [],
  targets = [],
  templates = [],
  template,
  fieldErrors,
  onChange,
  onConfigChange,
}) {
  const config = template.template_config || {}

  const [targetSearch, setTargetSearch] = useState('')
  const [isSeparateBehavior, setIsSeparateBehavior] = useState(false)

  // Memoized available targets for selected type
  const availableTargets = useMemo(() => {
    if (!template.target_type) return []
    return targets.filter(t => t.target_type === template.target_type)
  }, [template.target_type, targets])

  const filteredTargets = useMemo(() => {
    if (!targetSearch) return availableTargets
    return availableTargets.filter(t =>
      t.name.toLowerCase().includes(targetSearch.toLowerCase()) ||
      t.target_code.toLowerCase().includes(targetSearch.toLowerCase())
    )
  }, [availableTargets, targetSearch])

  const selectedMappings = template.targets || []
  const selectedTargetIds = new Set(selectedMappings.map((t) => t.target_id).filter(Boolean))

  const targetCollisions = useMemo(() => {
    const collisions = {}
    const relevantTemplates = templates.filter(t => 
      t.is_active && 
      t.freq_type === template.freq_type && 
      t.id !== template.id &&
      t.scope_mode !== 'global'
    )
    for (const t of relevantTemplates) {
      if (t.targets) {
        for (const mapping of t.targets) {
          if (mapping.target_id) {
            collisions[mapping.target_id] = t
          }
        }
      }
    }
    return collisions
  }, [templates, template.freq_type, template.id])

  const toggleTarget = (targetId) => {
    const currentTargets = template.targets || []
    const exists = currentTargets.find(t => t.target_id === targetId)

    if (exists) {
      onChange('targets', currentTargets.filter(t => t.target_id !== targetId))
    } else {
      onChange('targets', [...currentTargets, {
        target_id: targetId,
        target_type: template.target_type,
        override_config: null
      }])
    }
  }

  const applyBulkBehavior = () => {
    if (!template.targets || template.targets.length === 0) return

    const baseOverride = {
      ui_template_type: template.ui_template_type,
      template_config: { ...template.template_config }
    }

    onChange('targets', template.targets.map(t => ({
      ...t,
      override_config: baseOverride
    })))
  }

  const updateTargetBehavior = (mapping, field, value) => {
    const currentTargets = template.targets || []
      const updated = currentTargets.map(t => {
      const match = mapping.target_id && t.target_id === mapping.target_id
      if (match) {
        const baseConfig = t.override_config || { ui_template_type: template.ui_template_type, template_config: { ...template.template_config } }
        return {
          ...t,
          override_config: {
            ...baseConfig,
            [field]: value
          }
        }
      }
      return t
    })
    onChange('targets', updated)
  }

  const updateTargetConfig = (mapping, field, value) => {
    const currentTargets = template.targets || []
      const updated = currentTargets.map(t => {
      const match = mapping.target_id && t.target_id === mapping.target_id
      if (match) {
        const baseConfig = t.override_config || { ui_template_type: template.ui_template_type, template_config: { ...template.template_config } }
        return {
          ...t,
          override_config: {
            ...baseConfig,
            template_config: {
              ...baseConfig.template_config,
              [field]: value
            }
          }
        }
      }
      return t
    })
    onChange('targets', updated)
  }


  return (
    <div className="template-form-stack">
      <style>{`
        .template-form-stack {
          display: grid;
          gap: 28px;
        }
        .template-form-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          padding: 28px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .template-form-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f172a;
        }
        .template-form-description {
          margin-top: 6px;
          font-size: 14px;
          line-height: 1.65;
          color: #64748b;
        }
        .template-form-input,
        .template-form-select {
          margin-top: 10px;
          height: 46px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 0 14px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .template-form-input:focus,
        .template-form-select:focus,
        .template-form-textarea:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }
        .template-form-textarea {
          margin-top: 10px;
          width: 100%;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 14px;
          font-size: 14px;
          line-height: 1.6;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .template-form-choice {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          padding: 18px 16px;
          text-align: left;
          transition: all 0.2s ease;
        }
        .template-form-config-box {
          margin-top: 20px;
          border-radius: 22px;
          border: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.9);
          padding: 20px;
        }
        .template-form-toggle {
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 14px 16px;
          font-size: 14px;
          color: #334155;
        }
        @media (max-width: 768px) {
          .template-form-stack {
            gap: 22px;
          }
          .template-form-card {
            padding: 22px 18px;
          }
          .template-form-title {
            font-size: 18px;
          }
        }
        .photo-evidence-stack {
          display: grid;
          gap: 20px;
        }
        .photo-points-list {
          display: grid;
          gap: 12px;
        }
        .photo-point-row {
          display: flex;
          gap: 12px;
          align-items: center;
          background: #ffffff;
          padding: 12px 16px;
          border-radius: 16px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
        }
        .photo-config-card {
          display: grid;
          gap: 16px;
          background: #ffffff;
          padding: 20px;
          border-radius: 18px;
          border: 1px solid #f1f5f9;
        }
        @media (min-width: 768px) {
          .photo-config-card {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>
      <section className="template-form-card">
        <SectionTitle
          eyebrow="General"
          title="Template identity"
          description="กำหนดชื่อ หมวดหมู่ ความถี่ และคำอธิบายหลักของรายการตรวจเช็ค"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">หมวดหมู่</span>
            <select
              value={template.category}
              onChange={(event) => onChange('category', event.target.value)}
              className={cn('template-form-select')}
            >
              <option value="">เลือกหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldHint text={fieldErrors.category?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">ความถี่</span>
            <select
              value={template.freq_type}
              onChange={(event) => onChange('freq_type', event.target.value)}
              className={cn('template-form-select')}
            >
              {FREQUENCY_OPTIONS.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </select>
            <FieldHint text={fieldErrors.freq_type?.[0]} />
          </label>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">ชื่อรายการตรวจเช็ค</span>
            <input
              value={template.item_label}
              onChange={(event) => onChange('item_label', event.target.value)}
              placeholder="เช่น ตรวจสภาพภายนอกตู้ CCTV"
              className={cn('template-form-input')}
            />
            <FieldHint text={fieldErrors.item_label?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">คำแนะนำสำหรับผู้ตรวจ</span>
            <textarea
              value={template.instruction}
              onChange={(event) => onChange('instruction', event.target.value)}
              rows={4}
              placeholder="ระบุคำแนะนำ วิธีสังเกต หรือหมายเหตุที่ผู้ปฏิบัติงานควรรู้"
              className={cn('template-form-textarea')}
            />
          </label>
        </div>
      </section>

      <section className="template-form-card">
        <SectionTitle
          eyebrow="Scope"
          title="Target scope & mapping"
          description="กำหนดขอบเขตการใช้งาน template และเลือกอุปกรณ์/กลุ่มอุปกรณ์ที่ผูกกับ template นี้"
        />

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Scope mode</span>
            <select
              value={template.scope_mode || 'global'}
              onChange={(event) => onChange('scope_mode', event.target.value)}
              className="template-form-select"
            >
              <option value="global">global — ใช้กับทุกเครื่อง</option>
              <option value="per_target">per_target — ผูกรายอุปกรณ์</option>
              <option value="per_type">per_type — ผูกรายประเภทอุปกรณ์</option>
            </select>
            <FieldHint text={fieldErrors.scope_mode?.[0]} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Target type (Master Data)</span>
            <select
              value={template.target_type || ''}
              onChange={(event) => {
                onChange('target_type', event.target.value)
                onChange('targets', [])
              }}
              className="template-form-select"
            >
              <option value="">เลือกประเภทอุปกรณ์</option>
              {targetTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <FieldHint text={fieldErrors.target_type?.[0]} />
          </label>
        </div>

        {template.scope_mode !== 'global' && (
          <div className="template-form-config-box">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">ค้นหาอุปกรณ์</span>
                <input
                  value={targetSearch}
                  onChange={(event) => setTargetSearch(event.target.value)}
                  placeholder="ค้นหาด้วยชื่อหรือรหัสอุปกรณ์"
                  className="template-form-input"
                />
              </label>

              {template.scope_mode === 'per_target' ? (
                <div className="md:col-span-2 grid gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Targets</p>
                  {filteredTargets.length === 0 && (
                    <p className="text-sm text-slate-500">ไม่พบอุปกรณ์ตามเงื่อนไขที่เลือก</p>
                  )}
                  {filteredTargets.map((target) => {
                    const collision = targetCollisions[target.id]
                    return (
                      <label key={target.id} className={cn("template-form-toggle cursor-pointer", collision && "opacity-60 cursor-not-allowed")}>
                        <input
                          type="checkbox"
                          checked={selectedTargetIds.has(target.id)}
                          onChange={() => !collision && toggleTarget(target.id)}
                          disabled={Boolean(collision)}
                        />
                        <span className="text-sm text-slate-700">
                          {target.target_code} — {target.name}
                          {collision && <span className="text-rose-500 font-medium text-xs ml-2">(ใช้ใน: "{collision.item_label}")</span>}
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : (
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-600">โหมด per_type จะผูกกับอุปกรณ์ทุกตัวที่มี Target type ตรงกับค่าที่เลือก</p>
                </div>
              )}
            </div>
          </div>
        )}

        <FieldHint text={fieldErrors.targets?.[0]} />
      </section>

      <section className="template-form-card">
        <SectionTitle
          eyebrow="Behavior"
          title="Behavior & Configurations"
          description="กำหนดพฤติกรรมการตรวจเช็ค ค่าเริ่มต้น และการตั้งค่าแยกรายอุปกรณ์ (T0-T4)"
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATE_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange('ui_template_type', option.value)}
              className={cn(
                'template-form-choice',
                template.ui_template_type === option.value
                  ? 'border-blue-300 bg-blue-50 text-blue-900 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              <div className="text-sm font-bold">{option.label}</div>
            </button>
          ))}
        </div>

        <FieldHint text={fieldErrors.ui_template_type?.[0]} />

        <div className="template-form-config-box">
          {template.ui_template_type === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="template-form-toggle">
                <input type="checkbox" checked={Boolean(config.allow_na)} onChange={(event) => onConfigChange('allow_na', event.target.checked)} />
                <span className="text-sm text-slate-700">รองรับคำตอบ N/A</span>
              </label>
              <label className="template-form-toggle">
                <input type="checkbox" checked={Boolean(config.note_required_on_ng)} onChange={(event) => onConfigChange('note_required_on_ng', event.target.checked)} />
                <span className="text-sm text-slate-700">หาก NG ต้องมีหมายเหตุ</span>
              </label>
              <label className="template-form-toggle">
                <input type="checkbox" checked={Boolean(config.auto_open_incident)} onChange={(event) => onConfigChange('auto_open_incident', event.target.checked)} />
                <span className="text-sm text-slate-700">เปิด Incident อัตโนมัติเมื่อพบ NG</span>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Severity เริ่มต้น</span>
                <select
                  value={config.severity || 'medium'}
                  onChange={(event) => onConfigChange('severity', event.target.value)}
                  className="template-form-select"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </label>
            </div>
          )}

          {template.ui_template_type === 1 && (
            <div className="photo-evidence-stack">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-700">รายการจุดตรวจเช็ค (Inspection Points)</span>
                    <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold">P01 บังคับ</span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => {
                      // Auto-ensure P01 exists before adding more
                      const current = (() => {
                        const pts = config.photo_points || []
                        if (pts.length === 0) return [{ point_code: 'P01', label: 'ภาพยืนยัน' }]
                        return pts
                      })()
                      const nextIdx = current.length + 1
                      const newPoint = { 
                        label: '', 
                        point_code: `P${nextIdx.toString().padStart(2, '0')}` 
                      }
                      onConfigChange('photo_points', [...current, newPoint])
                    }}
                    className="text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                  >
                    + เพิ่มจุดตรวจ
                  </button>
                </div>
                
                <div className="photo-points-list">
                  {/* Auto-inject P01 if list is empty (handles legacy empty templates) */}
                  {(() => {
                    const pts = config.photo_points || []
                    const displayPoints = pts.length === 0
                      ? [{ point_code: 'P01', label: 'ภาพยืนยัน' }]
                      : pts
                    return displayPoints.map((p, idx) => {
                      const point = typeof p === 'string' ? { label: p, point_code: `P${(idx + 1).toString().padStart(2, '0')}` } : p
                      const isAnchor = idx === 0  // P01 is the undeletable anchor point
                      return (
                        <div key={idx} className={`photo-point-row ${isAnchor ? 'ring-1 ring-blue-100 bg-blue-50/30' : ''}`}>
                          <div className="w-16 shrink-0 relative">
                            <input
                              value={point.point_code}
                              readOnly={isAnchor}
                              onChange={(e) => {
                                if (isAnchor) return
                                const newPoints = [...(config.photo_points || [])]
                                newPoints[idx] = { ...point, point_code: e.target.value.toUpperCase() }
                                onConfigChange('photo_points', newPoints)
                              }}
                              placeholder="P01"
                              className={`template-form-input !mt-0 !h-10 !text-center !font-black border-none ${isAnchor ? '!bg-blue-50 !text-blue-700 cursor-default select-none' : '!bg-slate-50'}`}
                            />
                            {isAnchor && (
                              <span title="P01 คือจุดถ่ายภาพหลัก ลบไม่ได้" className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 text-white text-[8px] rounded-full flex items-center justify-center font-black leading-none">🔒</span>
                            )}
                          </div>
                          <div className="grow">
                            <input
                              value={point.label}
                              onChange={(e) => {
                                // If currently using auto-injected P01, materialize it into config first
                                const currentPts = config.photo_points || []
                                const newPoints = currentPts.length === 0
                                  ? [{ point_code: 'P01', label: e.target.value }]
                                  : [...currentPts]
                                if (currentPts.length > 0) {
                                  newPoints[idx] = { ...point, label: e.target.value }
                                }
                                onConfigChange('photo_points', newPoints)
                              }}
                              placeholder={isAnchor ? 'ชื่อจุดหลัก เช่น ภาพยืนยัน, ด้านหน้า' : 'ระบุชื่อจุดตรวจ เช่น ด้านข้าง, ด้านใน'}
                              className="template-form-input !mt-0 !h-10 !font-bold"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={isAnchor}
                            title={isAnchor ? 'P01 ลบไม่ได้ — เป็นจุดถ่ายภาพบังคับ' : 'ลบจุดตรวจนี้'}
                            onClick={() => {
                              if (isAnchor) return
                              const newPoints = (config.photo_points || []).filter((_, i) => i !== idx)
                              onConfigChange('photo_points', newPoints)
                            }}
                            className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl transition-colors ${
                              isAnchor
                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                            }`}
                          >
                            &times;
                          </button>
                        </div>
                      )
                    })
                  })()}
                </div>
                <FieldHint text={fieldErrors.photo_points?.[0]} />
              </div>

              <div className="photo-config-card">
                <label className="block">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-700">จำนวนภาพขั้นต่ำ</span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black">MIN</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={config.min_photos ?? (config.photo_points?.length || 0)}
                    onChange={(event) => onConfigChange('min_photos', event.target.value)}
                    className="template-form-input !mt-0"
                  />
                  <FieldHint text={fieldErrors.min_photos?.[0]} />
                </label>
                <div className="flex flex-col gap-2 justify-center pt-5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={Boolean(config.allow_retake)} onChange={(event) => onConfigChange('allow_retake', event.target.checked)} />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">อนุญาตให้ถ่ายใหม่</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={Boolean(config.enable_location_toggle)} onChange={(event) => onConfigChange('enable_location_toggle', event.target.checked)} />
                    <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">ให้ผู้ใช้เลือกแนบพิกัดได้</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {template.ui_template_type === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Procedure Plan</span>
                <select
                  value={config.plan_id || ''}
                  onChange={(event) => onConfigChange('plan_id', event.target.value)}
                  className="template-form-select"
                >
                  <option value="">เลือกแผนขั้นตอน</option>
                  {procedurePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.plan_name} ({plan.step_count} steps)
                    </option>
                  ))}
                </select>
                <FieldHint text={fieldErrors.plan_id?.[0]} />
              </label>
              <label className="template-form-toggle">
                <input type="checkbox" checked={Boolean(config.enforce_sequence)} onChange={(event) => onConfigChange('enforce_sequence', event.target.checked)} />
                <span className="text-sm text-slate-700">บังคับทำตามลำดับ</span>
              </label>
              <label className="template-form-toggle">
                <input type="checkbox" checked={Boolean(config.require_all_steps)} onChange={(event) => onConfigChange('require_all_steps', event.target.checked)} />
                <span className="text-sm text-slate-700">ต้องทำครบทุกขั้นตอน</span>
              </label>
            </div>
          )}

          {template.ui_template_type === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">หน่วยวัด</span>
                <input
                  value={config.unit || ''}
                  onChange={(event) => onConfigChange('unit', event.target.value)}
                  placeholder="เช่น °C, Volt, %"
                  className="template-form-input"
                />
                <FieldHint text={fieldErrors.unit?.[0]} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Decimal places</span>
                <input
                  type="number"
                  min="0"
                  max="4"
                  value={config.decimal_places ?? 1}
                  onChange={(event) => onConfigChange('decimal_places', event.target.value)}
                  className="template-form-input"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">ค่าต่ำสุด</span>
                <input
                  type="number"
                  value={config.min ?? ''}
                  onChange={(event) => onConfigChange('min', event.target.value)}
                  className="template-form-input"
                />
                <FieldHint text={fieldErrors.min?.[0]} />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">ค่าสูงสุด</span>
                <input
                  type="number"
                  value={config.max ?? ''}
                  onChange={(event) => onConfigChange('max', event.target.value)}
                  className="template-form-input"
                />
                <FieldHint text={fieldErrors.max?.[0]} />
              </label>
              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Fail mode</span>
                <select
                  value={config.fail_mode || 'outside_range'}
                  onChange={(event) => onConfigChange('fail_mode', event.target.value)}
                  className="template-form-select"
                >
                  <option value="outside_range">Outside range = NG</option>
                  <option value="warning_only">Outside range = Warning</option>
                </select>
              </label>
            </div>
          )}

          {template.ui_template_type === 4 && (
            <div className="grid gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">URL สำหรับตรวจสอบ</span>
                <input
                  value={config.url || ''}
                  onChange={(event) => onConfigChange('url', event.target.value)}
                  placeholder="https://device.local/health"
                  className="template-form-input"
                />
                <FieldHint text={fieldErrors.url?.[0]} />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="template-form-toggle">
                  <input type="checkbox" checked={Boolean(config.note_required)} onChange={(event) => onConfigChange('note_required', event.target.checked)} />
                  <span className="text-sm text-slate-700">บังคับกรอกหมายเหตุ</span>
                </label>
                <label className="template-form-toggle">
                  <input type="checkbox" checked={Boolean(config.screenshot_required)} onChange={(event) => onConfigChange('screenshot_required', event.target.checked)} />
                  <span className="text-sm text-slate-700">บังคับแนบภาพหน้าจอ</span>
                </label>
              </div>
            </div>
          )}


        </div>

        {template.scope_mode !== 'global' && selectedMappings.length > 0 && (
          <div className="border-t border-slate-100 mt-6 pt-6">
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800">Target Behavior Overrides</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                ตั้งค่าความเบี่ยงเบนหรือปรับเปลี่ยนประเภทพฤติกรรมเฉพาะสำหรับอุปกรณ์บางชิ้น
              </p>
            </div>

            <label className="template-form-toggle cursor-pointer">
              <input
                type="checkbox"
                checked={isSeparateBehavior}
                onChange={(event) => {
                  const checked = event.target.checked
                  setIsSeparateBehavior(checked)
                  if (!checked) {
                    applyBulkBehavior()
                  }
                }}
              />
              <span className="text-sm text-slate-700">
                {isSeparateBehavior ? 'ตั้งค่าแยก Behavior ราย Target' : 'ปรับให้ทุก Target ใช้ Behavior เดียวกันหมด'}
              </span>
            </label>

            {!isSeparateBehavior && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={applyBulkBehavior}
                  className="template-form-choice border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                >
                  Apply current template behavior to all mapped targets
                </button>
              </div>
            )}

            {isSeparateBehavior && (
              <div className="mt-4 grid gap-4">
                {selectedMappings.map((mapping, index) => {
                  const target = targets.find((t) => t.id === mapping.target_id)
                  const override = mapping.override_config || {}
                  const overrideConfig = override.template_config || {}
                  const rowKey = mapping.target_id || `row-${index}`
                  const rowLabel = target
                    ? `${target.target_code} — ${target.name}`
                    : 'Mapped target'

                  const effectiveUiType = override.ui_template_type ?? template.ui_template_type

                  return (
                    <div key={rowKey} className="template-form-config-box">
                      <p className="text-sm font-bold text-slate-800">{rowLabel}</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">UI Type Override</span>
                          <select
                            value={override.ui_template_type ?? template.ui_template_type}
                            onChange={(event) => updateTargetBehavior(mapping, 'ui_template_type', Number(event.target.value))}
                            className="template-form-select"
                          >
                            {TEMPLATE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Severity Override</span>
                          <select
                            value={overrideConfig.severity || 'medium'}
                            onChange={(event) => updateTargetConfig(mapping, 'severity', event.target.value)}
                            className="template-form-select"
                          >
                            <option value="low">low</option>
                            <option value="medium">medium</option>
                            <option value="high">high</option>
                            <option value="critical">critical</option>
                          </select>
                        </label>
                        {effectiveUiType === 4 && (
                          <div className="md:col-span-2 mt-2">
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">URL Override</span>
                              <input
                                type="text"
                                value={overrideConfig.url || ''}
                                onChange={(event) => updateTargetConfig(mapping, 'url', event.target.value)}
                                placeholder="https://device.local/health (เฉพาะอุปกรณ์นี้)"
                                className="template-form-input !mt-2"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
