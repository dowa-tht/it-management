'use client'

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
  template,
  fieldErrors,
  onChange,
  onConfigChange,
}) {
  const config = template.template_config || {}

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
          eyebrow="Type"
          title="Template behavior"
          description="เลือกชนิดของการเก็บข้อมูลและกำหนด config ตามประเภท T0-T5"
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
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-700">รายการจุดตรวจเช็ค (Inspection Points)</span>
                  <button 
                    type="button" 
                    onClick={() => {
                      const current = config.photo_points || []
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
                
                <div className="space-y-3">
                  {(config.photo_points || []).length === 0 && (
                    <div className="text-center py-8 bg-white border border-dashed border-slate-200 rounded-2xl">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">ยังไม่มีการกำหนดจุดตรวจ</p>
                      <p className="text-[10px] text-slate-300 mt-1">คลิกปุ่มด้านบนเพื่อเริ่มเพิ่มจุดถ่ายภาพหลักฐาน</p>
                    </div>
                  )}
                  {(config.photo_points || []).map((p, idx) => {
                    const point = typeof p === 'string' ? { label: p, point_code: `P${(idx + 1).toString().padStart(2, '0')}` } : p
                    return (
                      <div key={idx} className="flex gap-3 items-start bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-16 shrink-0">
                          <input
                            value={point.point_code}
                            onChange={(e) => {
                              const newPoints = [...config.photo_points]
                              newPoints[idx] = { ...point, point_code: e.target.value.toUpperCase() }
                              onConfigChange('photo_points', newPoints)
                            }}
                            placeholder="P01"
                            className="template-form-input !mt-0 !h-10 !text-center !font-black !bg-slate-50 border-none"
                          />
                        </div>
                        <div className="grow">
                          <input
                            value={point.label}
                            onChange={(e) => {
                              const newPoints = [...config.photo_points]
                              newPoints[idx] = { ...point, label: e.target.value }
                              onConfigChange('photo_points', newPoints)
                            }}
                            placeholder="ระบุชื่อจุดตรวจ เช่น หน้าตู้ CCTV"
                            className="template-form-input !mt-0 !h-10 !font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newPoints = (config.photo_points || []).filter((_, i) => i !== idx)
                            onConfigChange('photo_points', newPoints)
                          }}
                          className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                        >
                          &times;
                        </button>
                      </div>
                    )
                  })}
                </div>
                <FieldHint text={fieldErrors.photo_points?.[0]} />
              </div>

              <div className="grid gap-4 md:grid-cols-2 bg-white p-4 rounded-2xl border border-slate-100">
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

          {template.ui_template_type === 5 && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">ผู้ลงนาม (1 role ต่อ 1 บรรทัด)</span>
                <textarea
                  value={(config.signers || []).join('\n')}
                  onChange={(event) => onConfigChange('signers', event.target.value.split('\n'))}
                  rows={4}
                  placeholder={'it_staff\nadmin'}
                  className="template-form-textarea"
                />
                <FieldHint text={fieldErrors.signers?.[0]} />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="template-form-toggle">
                  <input type="checkbox" checked={Boolean(config.require_order)} onChange={(event) => onConfigChange('require_order', event.target.checked)} />
                  <span className="text-sm text-slate-700">บังคับลำดับการลงนาม</span>
                </label>
                <label className="template-form-toggle">
                  <input type="checkbox" checked={Boolean(config.pin_required)} onChange={(event) => onConfigChange('pin_required', event.target.checked)} />
                  <span className="text-sm text-slate-700">ต้องยืนยัน PIN</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
