'use client'

import Link from 'next/link'
import { useEffect, startTransition, useDeferredValue, useState } from 'react'
import { saveChecklistTemplate } from '@/app/actions/checklist-template'
import { cn } from '@/lib/cn'
import { FREQUENCY_OPTIONS, TEMPLATE_TYPE_OPTIONS, getDefaultTemplateConfig } from '@/lib/checklistTemplateValidation'
import { TemplateForm } from './components/TemplateForm'
import { TemplatePreview } from './components/TemplatePreview'

function createEmptyTemplate(categories) {
  return {
    id: null,
    category: categories[0] || '',
    freq_type: FREQUENCY_OPTIONS[0],
    item_label: '',
    instruction: '',
    ui_template_type: 0,
    template_config: getDefaultTemplateConfig(0),
    is_active: true,
    item_key: '',
    sort_order: 0,
  }
}

export function ChecklistTemplateBuilderClient({
  currentUser,
  templates,
  categories,
  procedurePlans,
  targetTypes = [],
  targets = [],
  targetGroups = [],
  initialTemplateId,
  initialMode,
}) {
  const requestedTemplate = templates.find((template) => String(template.id) === String(initialTemplateId)) || null
  const resolvedInitialMode = initialMode === 'create'
    ? 'create'
    : initialMode === 'edit' && requestedTemplate
      ? 'edit'
      : 'manage'
  const initialTemplate = resolvedInitialMode === 'create'
    ? createEmptyTemplate(categories)
    : requestedTemplate || templates[0] || createEmptyTemplate(categories)
  const [templateList, setTemplateList] = useState(templates)
  const [activeTemplateId, setActiveTemplateId] = useState(initialTemplate.id || null)
  const [draft, setDraft] = useState(initialTemplate)
  const [builderMode, setBuilderMode] = useState(resolvedInitialMode)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState({ type: '', text: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState({ open: false, type: '', title: '', message: '' })
  const deferredSearch = useDeferredValue(search)
  const debugUx = process.env.NODE_ENV !== 'production'

  const filteredTemplates = (() => {
    const needle = deferredSearch.trim().toLowerCase()
    if (!needle) return templateList

    return templateList.filter((template) => {
      const haystack = `${template.item_label} ${template.category} ${template.freq_type}`.toLowerCase()
      return haystack.includes(needle)
    })
  })()

  const activeTemplateTypeLabel = TEMPLATE_TYPE_OPTIONS.find((option) => option.value === draft.ui_template_type)?.label || 'Template'
  const isFocusedMode = builderMode === 'create' || builderMode === 'edit'
  const isCreateMode = builderMode === 'create'
  const pageEyebrow = isCreateMode ? 'Template Creation' : builderMode === 'edit' ? 'Template Editor' : 'Checklist Builder'
  const pageTitle = isCreateMode ? 'Create Checklist Template' : builderMode === 'edit' ? 'Edit Checklist Template' : 'Checklist Template Builder'
  const pageSubtitle = isCreateMode
    ? 'สร้าง Template ใหม่แบบเต็มรูปแบบผ่าน Builder โดยแยกจากหน้า Checklist Master Data เพื่อให้ flow การเพิ่มรายการชัดเจนและตั้งค่า template_config ได้ครบ'
    : builderMode === 'edit'
      ? 'แก้ไข Template รายการเดียวแบบเจาะจง พร้อมคงโครงสร้าง template_config เดิมของ checklist_templates ให้เป็น source of truth'
      : 'ตั้งค่า Template เชิงลึกสำหรับ T0-T5 พร้อม preview แบบเรียลไทม์และบันทึกผ่าน server action ตามมาตรฐานของระบบ'
  const sectionEyebrow = isCreateMode ? 'Creating' : 'Editing'
  const sectionTitle = isCreateMode ? 'New Template Draft' : draft.item_label || 'Template Draft'
  const saveLabel = isCreateMode ? 'Create Template' : 'Save Template'

  if (debugUx) {
    console.info('[ChecklistTemplateBuilder UX Debug]', {
      activeTemplateId,
      focusedMode: isFocusedMode,
      procedurePlanId: draft.template_config?.procedure_plan_id || draft.procedure_plan_id || null,
      hasInlinePreview: false,
      heroUsesLargeSessionDock: false,
      layout: {
        desktopGrid: isFocusedMode ? 'main' : 'sidebar + main',
      },
    })
  }

  useEffect(() => {
    if (!showPreviewModal && !saveFeedback.open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && saveFeedback.open) {
        setSaveFeedback({ open: false, type: '', title: '', message: '' })
        return
      }

      if (event.key === 'Escape' && showPreviewModal) {
        setShowPreviewModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPreviewModal, saveFeedback.open])

  function closeSaveFeedback() {
    setSaveFeedback({ open: false, type: '', title: '', message: '' })
  }

  function applyTemplate(nextTemplate) {
    setActiveTemplateId(nextTemplate.id || null)
    setDraft(nextTemplate)
    setBuilderMode(nextTemplate.id ? 'edit' : 'create')
    setFieldErrors({})
    setStatus({ type: '', text: '' })
  }

  function updateField(field, value) {
    if (field === 'ui_template_type') {
      setDraft((current) => ({
        ...current,
        ui_template_type: value,
        template_config: getDefaultTemplateConfig(value),
      }))
      return
    }

    setDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function updateConfigField(field, value) {
    setDraft((current) => ({
      ...current,
      template_config: {
        ...current.template_config,
        [field]: value,
      },
    }))
  }

  function handleCreateNew() {
    setBuilderMode('create')
    applyTemplate(createEmptyTemplate(categories))
  }

  function handleSave() {
    setSaving(true)
    setStatus({ type: '', text: '' })

    startTransition(async () => {

    // Process target formatting before save
    const payload = {
      ...draft,
      targets: draft.targets || []
    }
    const result = await saveChecklistTemplate(payload)
      setSaving(false)

      if (!result.success) {
        setFieldErrors(result.fieldErrors || {})
        setStatus({ type: 'error', text: result.error || 'ไม่สามารถบันทึกข้อมูลได้' })
        setSaveFeedback({
          open: true,
          type: 'error',
          title: 'บันทึก Template ไม่สำเร็จ',
          message: result.error || 'กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองใหม่อีกครั้ง',
        })
        return
      }

      setFieldErrors({})
      setStatus({ type: 'success', text: result.message })
      setSaveFeedback({
        open: true,
        type: 'success',
        title: isCreateMode ? 'สร้าง Template สำเร็จ' : 'บันทึก Template สำเร็จ',
        message: result.message || 'ระบบบันทึกข้อมูลเรียบร้อยแล้ว',
      })
      setBuilderMode('edit')
      setTemplateList((current) => {
        const existingIndex = current.findIndex((template) => template.id === result.template.id)
        if (existingIndex === -1) {
          return [...current, result.template]
        }

        const next = [...current]
        next[existingIndex] = result.template
        return next
      })
      applyTemplate(result.template)
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 'var(--page-padding, 24px)',
        paddingBottom: 60,
        background:
          'radial-gradient(circle at top left, rgba(37, 99, 235, 0.1), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #f8fafc 56%, #f1f5f9 100%)',
      }}
    >
      <style>{`
        :root { --page-padding: 24px; }
        .template-builder-shell {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .template-builder-hero {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 16px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,250,252,0.92) 100%);
          box-shadow: 0 20px 50px -30px rgba(15,23,42,0.55);
          padding: 22px 24px;
        }
        .template-builder-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .template-builder-title {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0;
          line-height: 1.1;
        }
        .template-builder-subtitle {
          margin-top: 10px;
          max-width: 760px;
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        }
        .template-builder-header-top {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .template-builder-session-inline {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 999px;
          background: rgba(248, 250, 252, 0.92);
          padding: 8px 12px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          color: #475569;
          font-size: 13px;
        }
        .template-builder-header-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: flex-start;
        }
        .template-builder-back-link {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }
        .template-builder-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          padding: 24px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .template-builder-search {
          height: 46px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 0 14px;
          font-size: 14px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .template-builder-search:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }
        .template-builder-item {
          width: 100%;
          border-radius: 20px;
          padding: 16px;
          text-align: left;
          transition: all 0.2s ease;
        }
        .template-builder-item-title {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.45;
          color: #0f172a;
          word-break: break-word;
        }
        .template-builder-item-meta {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.4;
          color: #64748b;
        }
        .template-builder-list {
          display: grid;
          gap: 14px;
        }
        .template-builder-snapshot-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          padding: 28px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .template-builder-snapshot-item {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          padding: 18px 16px;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.6;
          color: #334155;
        }
        .template-builder-snapshot-grid {
          display: grid;
          gap: 12px;
        }
        .template-builder-section-copy {
          display: grid;
          gap: 10px;
          padding: 0;
        }
        .template-builder-snapshot-frame {
          display: grid;
          gap: 16px;
        }
        .template-builder-snapshot-config-box {
          border-radius: 22px;
          border: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.9);
          padding: 20px;
        }
        .template-builder-action {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
        }
        .template-builder-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .template-builder-sidebar,
        .template-builder-preview-modal {
          min-width: 0;
        }
        .template-preview-trigger {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
          color: #1d4ed8;
        }
        .template-preview-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.68);
          backdrop-filter: blur(6px);
        }
        .template-preview-modal-card {
          width: min(920px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%);
          padding: 24px;
          box-shadow: 0 30px 70px -30px rgba(15, 23, 42, 0.6);
        }
        .template-save-feedback-card {
          width: min(520px, 100%);
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.95);
          background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(248,250,252,0.98) 100%);
          padding: 28px;
          box-shadow: 0 30px 70px -30px rgba(15, 23, 42, 0.6);
        }
        .template-save-feedback-icon {
          display: inline-flex;
          height: 52px;
          width: 52px;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          font-size: 24px;
          font-weight: 700;
        }
        .template-save-feedback-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .template-preview-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .template-preview-close {
          display: inline-flex;
          min-height: 40px;
          min-width: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          font-size: 18px;
          font-weight: 700;
          color: #475569;
        }
        @media (max-width: 768px) {
          :root { --page-padding: 12px; }
          .template-builder-title {
            font-size: 22px;
          }
          .template-builder-hero {
            padding: 18px 16px;
            border-radius: 24px;
          }
          .template-builder-header-top {
            align-items: flex-start;
          }
          .template-builder-header-actions {
            width: 100%;
          }
          .template-builder-back-link,
          .template-preview-trigger,
          .template-builder-action {
            width: 100%;
          }
          .template-builder-snapshot-card {
            padding: 22px 18px;
          }
          .template-builder-snapshot-config-box {
            padding: 16px;
          }
          .template-preview-modal-card {
            padding: 18px;
            border-radius: 24px;
          }
          .template-save-feedback-card {
            padding: 22px 18px;
            border-radius: 24px;
          }
          .template-save-feedback-actions {
            flex-direction: column;
          }
        }
        @media (min-width: 1200px) {
          .template-builder-grid {
            grid-template-columns: 320px minmax(0, 1fr);
          }
          .template-builder-sidebar {
            position: sticky;
            top: 24px;
          }
        }
      `}</style>
      <div className="template-builder-shell">
        <section className="template-builder-hero">
          <div style={{ minWidth: 0 }}>
            <div className="max-w-4xl">
              <div className="template-builder-header-top">
                <Link href="/dashboard/settings/checklist-master-data?type=checklist_template" className="template-builder-back-link transition hover:border-slate-300 hover:bg-slate-50">
                  ← กลับหน้า Master Data
                </Link>
                <div className="template-builder-session-inline absolute right-5 top-5">
                  <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">Session</span>
                  <span className="font-semibold text-slate-900">{currentUser.full_name}</span>
                  <span className="text-slate-500">{currentUser.role}</span>
                </div>
              </div>
               <div className="flex items-center gap-3" style={{ marginTop: 24 }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-sky-400 text-lg text-white shadow-lg shadow-blue-500/30">🧩</div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">{pageEyebrow}</p>
              </div>
              <h1 className="template-builder-title" style={{ marginTop: 12 }}>{pageTitle}</h1>
              <p className="template-builder-subtitle">
                {pageSubtitle}
              </p>
              <div className="template-builder-header-actions" style={{ marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="template-preview-trigger transition hover:border-blue-300 hover:bg-blue-100"
                >
                  👁 Preview
                </button>
                <Link href="/dashboard/settings/target-registry" className="template-builder-action border border-violet-200 bg-violet-50 text-violet-700 transition hover:border-violet-300 hover:bg-violet-100">
                  ไปหน้า Target Registry
                </Link>
                {isFocusedMode ? (
                  <Link href="/dashboard/settings/checklist-template-builder" className="template-builder-action border border-blue-200 bg-blue-50 text-blue-700 transition hover:border-blue-300 hover:bg-blue-100">
                    ดูรายการทั้งหมด
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="template-builder-action bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-lg shadow-blue-500/20 transition hover:translate-y-[-1px]"
                  >
                    + New Template
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {status.text && (
          <div
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm',
              status.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            )}
            aria-live="polite"
          >
            {status.text}
          </div>
        )}

        <div className="template-builder-grid" style={isFocusedMode ? { gridTemplateColumns: 'minmax(0, 1fr)' } : undefined}>
          {!isFocusedMode && (
            <aside className="template-builder-sidebar template-builder-card">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Library</p>
                  <h2 className="mt-2 text-lg font-extrabold text-slate-900">Template Library</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {templateList.length} items
                </span>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหา template..."
                className="template-builder-search"
              />

              <div className="template-builder-list" style={{ marginTop: 16 }}>
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={cn(
                      'template-builder-item border text-left',
                      activeTemplateId === template.id
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div style={{ minWidth: 0 }}>
                        <p className="template-builder-item-title">{template.item_label}</p>
                        <p className="template-builder-item-meta">{template.category} • {template.freq_type}</p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                        T{template.ui_template_type}
                      </span>
                    </div>
                  </button>
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    ไม่พบ template ที่ตรงกับคำค้นหา
                  </div>
                )}
              </div>
            </aside>
          )}

          <main className="template-builder-main">
            <section className="template-builder-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div style={{ minWidth: 0 }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{sectionEyebrow}</p>
                  <h2 className="mt-2 text-xl font-extrabold text-slate-950">{sectionTitle}</h2>
                  <p className="mt-1 text-sm text-slate-500">{activeTemplateTypeLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    'template-builder-action px-5 text-white transition',
                    saving
                      ? 'cursor-not-allowed bg-slate-300'
                      : 'bg-gradient-to-r from-blue-700 to-sky-500 shadow-lg shadow-blue-500/20 hover:translate-y-[-1px]'
                  )}
                >
                  {saving ? 'กำลังบันทึก...' : saveLabel}
                </button>
              </div>
            </section>

            <TemplateForm
              categories={categories}
              procedurePlans={procedurePlans}
              targetTypes={targetTypes}
              targets={targets}
              targetGroups={targetGroups}
              template={draft}
              fieldErrors={fieldErrors}
              onChange={updateField}
              onConfigChange={updateConfigField}
            />
          </main>

          <aside>
            <section className="template-builder-snapshot-card">
              <div className="template-builder-snapshot-frame">
                <div className="template-builder-section-copy">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Standards Snapshot</p>
                  <h3 className="text-[20px] font-extrabold text-slate-900">Builder standards</h3>
                  <p className="text-sm leading-7 text-slate-500">
                    สรุปข้อกำหนดหลักที่หน้า Template Builder ต้องยึดไว้ระหว่างสร้างหรือแก้ไข Template
                  </p>
                </div>
                <div className="template-builder-snapshot-config-box">
                  <div className="template-builder-snapshot-grid lg:grid-cols-3">
                    <div className="template-builder-snapshot-item">Standalone route ตาม Settings Design System</div>
                    <div className="template-builder-snapshot-item">Validate `template_config` ที่ server ก่อนบันทึกทุกครั้ง</div>
                    <div className="template-builder-snapshot-item">คง `template_config` เป็น source of truth เดิมของ `checklist_templates`</div>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>

        {showPreviewModal && (
          <div className="template-preview-modal-backdrop" role="dialog" aria-modal="true" aria-label="Checklist template preview">
            <div className="template-preview-modal-card">
              <div className="template-preview-modal-header">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Live Preview</p>
                  <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950">{draft.item_label || 'New template'}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">ดู preview แบบ modal เพื่อลดสิ่งรบกวนในหน้าสร้างและแก้ไข Template</p>
                </div>
                <button type="button" onClick={() => setShowPreviewModal(false)} className="template-preview-close" aria-label="Close preview">×</button>
              </div>
              <div style={{ marginTop: 20 }}>
                <TemplatePreview template={draft} procedurePlans={procedurePlans} />
              </div>
            </div>
          </div>
        )}

        {saveFeedback.open && (
          <div className="template-preview-modal-backdrop" role="dialog" aria-modal="true" aria-label="Save feedback dialog">
            <div className="template-save-feedback-card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'template-save-feedback-icon',
                      saveFeedback.type === 'success'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    )}
                  >
                    {saveFeedback.type === 'success' ? '✓' : '!'}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Save feedback</p>
                    <h2 className="mt-2 text-2xl font-extrabold leading-tight text-slate-950">{saveFeedback.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-500">{saveFeedback.message}</p>
                  </div>
                </div>
                <button type="button" onClick={closeSaveFeedback} className="template-preview-close" aria-label="Close save feedback">×</button>
              </div>

              <div className="template-save-feedback-actions">
                <button
                  type="button"
                  onClick={closeSaveFeedback}
                  className={cn(
                    'template-builder-action px-5 text-white transition',
                    saveFeedback.type === 'success'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/20 hover:translate-y-[-1px]'
                      : 'bg-gradient-to-r from-rose-600 to-rose-500 shadow-lg shadow-rose-500/20 hover:translate-y-[-1px]'
                  )}
                >
                  รับทราบ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
