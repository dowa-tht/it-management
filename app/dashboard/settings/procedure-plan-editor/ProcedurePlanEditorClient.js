'use client'

import Link from 'next/link'
import { useEffect, startTransition, useDeferredValue, useState } from 'react'
import { saveProcedurePlan } from '@/app/actions/procedure-plan'
import { cn } from '@/lib/cn'
import { PROCEDURE_STEP_TYPES } from '@/lib/procedurePlanValidation'

function createBlankStep(stepNo) {
  return {
    step_no: stepNo,
    title: '',
    instruction: '',
    responsible_person: '',
    success_criteria: '',
    step_type: 'check',
    required: true,
    evidence_rule: {
      photo_required: false,
      note_required: false,
    },
  }
}

function createEmptyPlan() {
  return {
    id: null,
    plan_name: '',
    steps: [],
    step_count: 0,
  }
}

export function ProcedurePlanEditorClient({ currentUser, plans, initialPlanId }) {
  const initialPlan = plans.find((plan) => plan.id === initialPlanId) || plans[0] || createEmptyPlan()
  const debugUx = process.env.NODE_ENV !== 'production'
  const [planList, setPlanList] = useState(plans)
  const [activePlanId, setActivePlanId] = useState(initialPlan.id || null)
  const [draft, setDraft] = useState(initialPlan)
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const deferredSearch = useDeferredValue(search)

  const filteredPlans = (() => {
    const needle = deferredSearch.trim().toLowerCase()
    if (!needle) return planList

    return planList.filter((plan) => plan.plan_name.toLowerCase().includes(needle))
  })()

  function selectPlan(plan) {
    setActivePlanId(plan.id || null)
    setDraft(plan)
    setActiveStepIndex(0)
    setFieldErrors({})
    setStatus({ type: '', text: '' })
  }

  function updatePlanField(field, value) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function addStep() {
    setDraft((current) => ({
      ...current,
      steps: [...current.steps, createBlankStep(current.steps.length + 1)],
    }))
    setActiveStepIndex(draft.steps.length)
  }

  function updateStep(index, field, value) {
    setDraft((current) => {
      const nextSteps = [...current.steps]
      nextSteps[index] = {
        ...nextSteps[index],
        [field]: value,
      }

      return {
        ...current,
        steps: nextSteps,
      }
    })
  }

  function updateEvidenceRule(index, field, value) {
    setDraft((current) => {
      const nextSteps = [...current.steps]
      nextSteps[index] = {
        ...nextSteps[index],
        evidence_rule: {
          ...nextSteps[index].evidence_rule,
          [field]: value,
        },
      }

      return {
        ...current,
        steps: nextSteps,
      }
    })
  }

  function removeStep(index) {
    setDraft((current) => {
      const nextSteps = current.steps
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, reorderedIndex) => ({
          ...step,
          step_no: reorderedIndex + 1,
        }))

      setActiveStepIndex((currentActive) => {
        if (nextSteps.length === 0) return 0
        if (currentActive > index) return currentActive - 1
        return Math.min(currentActive, nextSteps.length - 1)
      })

      return {
        ...current,
        steps: nextSteps,
      }
    })
  }

  function moveStep(index, direction) {
    setDraft((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.steps.length) {
        return current
      }

      const nextSteps = [...current.steps]
      const [targetStep] = nextSteps.splice(index, 1)
      nextSteps.splice(nextIndex, 0, targetStep)
      setActiveStepIndex((currentActive) => {
        if (currentActive === index) return nextIndex
        if (direction === -1 && currentActive === nextIndex) return currentActive + 1
        if (direction === 1 && currentActive === nextIndex) return currentActive - 1
        return currentActive
      })

      return {
        ...current,
        steps: nextSteps.map((step, reorderedIndex) => ({
          ...step,
          step_no: reorderedIndex + 1,
        })),
      }
    })
  }

  function handleNewPlan() {
    selectPlan(createEmptyPlan())
  }

  const selectedStep = draft.steps[activeStepIndex] || null

  if (debugUx) {
    console.info('[ProcedurePlanEditor UX Debug]', {
      activePlanId,
      stepCount: draft.steps.length,
      activeStepIndex,
      selectedStepTitle: selectedStep?.title || null,
      hasInlinePreview: false,
      heroUsesLargeSessionDock: false,
      layout: {
        desktopGrid: 'sidebar + main',
        stepEditorDesktop: 'list + detail',
      },
    })
  }

  useEffect(() => {
    if (!showPreviewModal) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowPreviewModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPreviewModal])

  function handleSave() {
    setSaving(true)
    setStatus({ type: '', text: '' })

    startTransition(async () => {
      const result = await saveProcedurePlan(draft)
      setSaving(false)

      if (!result.success) {
        setFieldErrors(result.fieldErrors || {})
        setStatus({ type: 'error', text: result.error || 'ไม่สามารถบันทึก Procedure Plan ได้' })
        return
      }

      setFieldErrors({})
      setStatus({ type: 'success', text: result.message })
      setPlanList((current) => {
        const existingIndex = current.findIndex((plan) => plan.id === result.plan.id)
        if (existingIndex === -1) {
          return [...current, result.plan]
        }

        const next = [...current]
        next[existingIndex] = result.plan
        return next
      })
      selectPlan(result.plan)
    })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 'var(--page-padding, 24px)',
        paddingBottom: 60,
        background:
          'radial-gradient(circle at top left, rgba(6, 182, 212, 0.1), transparent 24%), linear-gradient(180deg, #f8fbff 0%, #f8fafc 56%, #f1f5f9 100%)',
      }}
    >
      <style>{`
        :root { --page-padding: 24px; }
        .procedure-editor-shell {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
         .procedure-editor-hero {
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
        .procedure-editor-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .procedure-editor-title {
          font-size: 28px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 0;
          line-height: 1.1;
        }
        .procedure-editor-subtitle {
          margin-top: 10px;
          max-width: 780px;
          color: #64748b;
          font-size: 15px;
          line-height: 1.7;
        }
        .procedure-editor-header-top {
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
        }
        .procedure-editor-identity-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 60px;
        }
        .procedure-editor-session-inline {
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
        .procedure-editor-header-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: flex-start;
        }
        .procedure-editor-back-link {
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
        .procedure-editor-main {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .procedure-editor-card {
          border: 1px solid rgba(226, 232, 240, 0.9);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          padding: 24px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        }
        .procedure-editor-input,
        .procedure-editor-select {
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
        .procedure-editor-textarea {
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
        .procedure-editor-input:focus,
        .procedure-editor-select:focus,
        .procedure-editor-textarea:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.08);
        }
        .procedure-step-card {
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.96) 100%);
          padding: 22px;
        }
        .procedure-step-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .procedure-step-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding-right: 2px;
          max-height: 520px;
        }
        .procedure-step-list-content {
          flex: 1;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 460px;
        }
        .procedure-step-list-card {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          background: #ffffff;
          padding: 18px 16px;
          text-align: left;
          transition: all 0.2s ease;
        }
        .procedure-step-list-copy {
          display: grid;
          gap: 8px;
          min-width: 0;
        }
        .procedure-step-list-title {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.45;
          color: #0f172a;
          word-break: break-word;
        }
        .procedure-step-list-meta {
          font-size: 13px;
          line-height: 1.4;
          color: #64748b;
        }
        .procedure-step-detail {
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%);
          padding: 22px;
          min-width: 0;
        }
        .procedure-step-toggle {
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
        .procedure-editor-label {
          display: inline-block;
          margin-bottom: 2px;
          font-size: 14px;
          font-weight: 700;
          color: #334155;
        }
        .procedure-editor-action {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
        }
        .procedure-step-mini-action {
          display: inline-flex;
          min-height: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 700;
        }
        .procedure-plan-item {
          width: 100%;
          border-radius: 20px;
          padding: 18px 16px;
          text-align: left;
          transition: all 0.2s ease;
        }
        .procedure-plan-item-title {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.45;
          color: #0f172a;
          word-break: break-word;
        }
        .procedure-plan-item-meta {
          margin-top: 6px;
          font-size: 13px;
          line-height: 1.4;
          color: #64748b;
        }
        .procedure-preview-item {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: rgba(248, 250, 252, 0.9);
          padding: 20px 22px;
        }
        .procedure-preview-title {
          font-size: 15px;
          font-weight: 700;
          line-height: 1.5;
          color: #0f172a;
          word-break: break-word;
        }
        .procedure-preview-meta {
          margin-top: 8px;
          font-size: 13px;
          line-height: 1.55;
          color: #64748b;
        }
        .procedure-preview-shell {
          border-radius: 22px;
          border: 1px solid rgba(226, 232, 240, 0.92);
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.88) 0%, rgba(255, 255, 255, 0.96) 100%);
          padding: 18px;
        }
        .procedure-preview-grid {
          display: grid;
          gap: 16px;
          margin-top: 18px;
        }
        .procedure-preview-copy {
          display: grid;
          gap: 10px;
        }
        .procedure-snapshot-item {
          border-radius: 18px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          padding: 16px 16px 14px;
          font-size: 14px;
          line-height: 1.6;
          color: #475569;
        }
        .procedure-editor-sidebar,
        .procedure-editor-preview-modal {
          min-width: 0;
        }
        .procedure-preview-trigger {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid #bae6fd;
          background: #ecfeff;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 700;
          color: #0f766e;
        }
        .procedure-preview-modal-backdrop {
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
        .procedure-preview-modal-card {
          width: min(920px, 100%);
          max-height: calc(100vh - 40px);
          overflow: auto;
          border-radius: 28px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%);
          padding: 24px;
          box-shadow: 0 30px 70px -30px rgba(15, 23, 42, 0.6);
        }
        .procedure-preview-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }
        .procedure-preview-close {
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
          .procedure-editor-title {
            font-size: 22px;
          }
          .procedure-editor-hero {
            padding: 18px 16px;
            border-radius: 24px;
          }
          .procedure-editor-header-top {
            align-items: flex-start;
          }
          .procedure-editor-identity-row {
            margin-top: 18px;
          }
          .procedure-editor-header-actions {
            width: 100%;
          }
          .procedure-editor-back-link,
          .procedure-preview-trigger,
          .procedure-editor-action {
            width: 100%;
          }
          .procedure-preview-shell {
            padding: 14px;
          }
          .procedure-preview-item {
            padding: 16px 18px;
          }
          .procedure-preview-modal-card {
            padding: 18px;
            border-radius: 24px;
          }
        }
        @media (min-width: 1200px) {
          .procedure-editor-grid {
            grid-template-columns: 320px minmax(0, 1fr);
          }
          .procedure-editor-sidebar {
            position: sticky;
            top: 24px;
          }
        }
        @media (min-width: 1100px) {
          .procedure-step-layout {
            grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
          }
          .procedure-step-list {
            position: sticky;
            top: 24px;
          }
        }
      `}</style>
      <div className="procedure-editor-shell">
        <section className="procedure-editor-hero">
          <div style={{ minWidth: 0 }}>
            <div className="max-w-4xl">
              <div className="procedure-editor-header-top">
                <Link href="/dashboard/settings/checklist-master-data?type=procedure_plan" className="procedure-editor-back-link transition hover:border-slate-300 hover:bg-slate-50">
                  ← กลับหน้า Master Data
                </Link>
                <div className="procedure-editor-session-inline absolute right-5 top-5">
                  <span className="font-semibold uppercase tracking-[0.16em] text-slate-400">Session</span>
                  <span className="font-semibold text-slate-900">{currentUser.full_name}</span>
                  <span className="text-slate-500">{currentUser.role}</span>
                </div>
              </div>
              <div className="procedure-editor-identity-row" style={{ marginTop: 24 }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-700 to-sky-400 text-lg text-white shadow-lg shadow-cyan-500/30">📜</div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Procedure Editor</p>
              </div>
              <h1 className="procedure-editor-title" style={{ marginTop: 12 }}>Procedure Plan Editor</h1>
              <p className="procedure-editor-subtitle">
                จัดการ SOP รายขั้นตอนสำหรับ `T2 Procedure Table` พร้อม reorder, required rule, และ evidence rule ในหน้าเดียว
              </p>
              <div className="procedure-editor-header-actions" style={{ marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="procedure-preview-trigger transition hover:border-sky-300 hover:bg-cyan-100"
                >
                  👁 Preview
                </button>
                <button
                  type="button"
                  onClick={handleNewPlan}
                  className="procedure-editor-action bg-gradient-to-r from-cyan-700 to-sky-500 text-white shadow-lg shadow-cyan-500/20 transition hover:translate-y-[-1px]"
                >
                  + New Plan
                </button>
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

        <div className="procedure-editor-grid">
          <aside className="procedure-editor-sidebar procedure-editor-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plans</p>
                <h2 className="mt-2 text-lg font-extrabold text-slate-900">Procedure Plans</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {planList.length} plans
              </span>
            </div>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหา plan..."
              className="procedure-editor-input"
            />

            <div className="mt-4 space-y-3">
              {filteredPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => selectPlan(plan)}
                  className={cn(
                    'procedure-plan-item border text-left',
                    activePlanId === plan.id
                      ? 'border-cyan-300 bg-cyan-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <p className="procedure-plan-item-title">{plan.plan_name}</p>
                  <p className="procedure-plan-item-meta">{plan.step_count} ขั้นตอน</p>
                </button>
              ))}
            </div>
          </aside>

          <main className="procedure-editor-main">
            <section className="procedure-editor-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Plan Name</p>
                  <input
                    value={draft.plan_name}
                    onChange={(event) => updatePlanField('plan_name', event.target.value)}
                    placeholder="เช่น SOP ตรวจตู้ CCTV รายเดือน"
                    className="procedure-editor-input"
                  />
                  {fieldErrors.plan_name?.[0] && <p className="mt-2 text-xs text-rose-600">{fieldErrors.plan_name[0]}</p>}
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    'procedure-editor-action px-5 text-white transition',
                    saving
                      ? 'cursor-not-allowed bg-slate-300'
                      : 'bg-gradient-to-r from-cyan-700 to-sky-500 shadow-lg shadow-cyan-500/20 hover:translate-y-[-1px]'
                  )}
                >
                  {saving ? 'กำลังบันทึก...' : 'Save Plan'}
                </button>
              </div>
            </section>

            <section className="procedure-editor-card">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step Editor</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-950">Procedure Steps</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">แยก step list ออกจาก detail editor เพื่อลดการไถยาวและให้ actions อยู่ใกล้ context ที่กำลังแก้</p>
              </div>

              {fieldErrors.steps?.[0] && <p className="mb-4 text-xs text-rose-600">{fieldErrors.steps[0]}</p>}

              <div className="procedure-step-layout">
                <div className="procedure-step-list">
                  <div className="procedure-step-list-content">
                    {draft.steps.map((step, index) => (
                      <button
                        key={`${step.step_no}-${index}`}
                        type="button"
                        onClick={() => setActiveStepIndex(index)}
                        className={cn(
                          'procedure-step-list-card relative',
                          activeStepIndex === index
                            ? 'border-cyan-500 bg-cyan-50 shadow-md ring-2 ring-cyan-200'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="procedure-step-list-copy">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</p>
                            <p className="procedure-step-list-title">{step.title || 'ยังไม่ได้ตั้งชื่อขั้นตอน'}</p>
                            <p className="procedure-step-list-meta">{step.step_type} • {step.required ? 'required' : 'optional'}</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                            {index + 1}
                          </span>
                        </div>
                      </button>
                    ))}

                    {draft.steps.length === 0 && (
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                        ยังไม่มีขั้นตอนในแผนนี้ กด `Add Step` เพื่อเริ่มสร้าง SOP
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addStep}
                    className="procedure-editor-action w-full justify-center border border-cyan-200 bg-cyan-50 text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100 shrink-0"
                  >
                    + Add Step
                  </button>
                </div>

                {selectedStep && (
                  <div className="procedure-step-detail">
                    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div style={{ minWidth: 0 }}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Editing Step {activeStepIndex + 1}</p>
                        <p className="mt-2 text-lg font-bold text-slate-900">{selectedStep.title || 'ยังไม่ได้ตั้งชื่อขั้นตอน'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => moveStep(activeStepIndex, -1)} className="procedure-step-mini-action border border-slate-200 bg-white text-slate-600">ขึ้น</button>
                        <button type="button" onClick={() => moveStep(activeStepIndex, 1)} className="procedure-step-mini-action border border-slate-200 bg-white text-slate-600">ลง</button>
                        <button type="button" onClick={() => removeStep(activeStepIndex)} className="procedure-step-mini-action border border-rose-200 bg-rose-50 text-rose-600">ลบ</button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block md:col-span-2">
                        <span className="procedure-editor-label">ชื่อขั้นตอน</span>
                        <input
                          value={selectedStep.title}
                          onChange={(event) => updateStep(activeStepIndex, 'title', event.target.value)}
                          placeholder="เช่น เปิดฝาตู้"
                          className="procedure-editor-input"
                        />
                        {fieldErrors.stepDetails?.[activeStepIndex]?.title?.[0] && (
                          <p className="mt-2 text-xs text-rose-600">{fieldErrors.stepDetails[activeStepIndex].title[0]}</p>
                        )}
                      </label>

                      <label className="block">
                        <span className="procedure-editor-label">ชนิดขั้นตอน</span>
                        <select
                          value={selectedStep.step_type}
                          onChange={(event) => updateStep(activeStepIndex, 'step_type', event.target.value)}
                          className="procedure-editor-select"
                        >
                          {PROCEDURE_STEP_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="procedure-step-toggle">
                        <input type="checkbox" checked={Boolean(selectedStep.required)} onChange={(event) => updateStep(activeStepIndex, 'required', event.target.checked)} />
                        <span className="text-sm text-slate-700">Required step</span>
                      </label>

                      <label className="block md:col-span-2">
                        <span className="procedure-editor-label">ขั้นตอนการดำเนินการ</span>
                        <textarea
                          value={selectedStep.instruction}
                          onChange={(event) => updateStep(activeStepIndex, 'instruction', event.target.value)}
                          rows={4}
                          placeholder="คำอธิบายหรือเงื่อนไขสำหรับผู้ตรวจ"
                          className="procedure-editor-textarea"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="procedure-editor-label">ผู้รับผิดชอบ</span>
                        <input
                          value={selectedStep.responsible_person}
                          onChange={(event) => updateStep(activeStepIndex, 'responsible_person', event.target.value)}
                          placeholder="เช่น IT Support, หัวหน้างาน IT"
                          className="procedure-editor-input"
                        />
                      </label>

                      <label className="block md:col-span-2">
                        <span className="procedure-editor-label">เกณฑ์วัดผลการซ้อม</span>
                        <textarea
                          value={selectedStep.success_criteria}
                          onChange={(event) => updateStep(activeStepIndex, 'success_criteria', event.target.value)}
                          rows={3}
                          placeholder="ระบุเกณฑ์ที่ใช้วัดว่าการซ้อมสำเร็จ เช่น ทำครบทุกขั้นตอน, ไม่เกิดข้อผิดพลาด"
                          className="procedure-editor-textarea"
                        />
                      </label>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="procedure-step-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedStep.evidence_rule?.photo_required)}
                          onChange={(event) => updateEvidenceRule(activeStepIndex, 'photo_required', event.target.checked)}
                        />
                        <span className="text-sm text-slate-700">ต้องแนบรูปภาพ</span>
                      </label>
                      <label className="procedure-step-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedStep.evidence_rule?.note_required)}
                          onChange={(event) => updateEvidenceRule(activeStepIndex, 'note_required', event.target.checked)}
                        />
                        <span className="text-sm text-slate-700">ต้องกรอกหมายเหตุ</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>

        </div>

        {showPreviewModal && (
          <div className="procedure-preview-modal-backdrop" role="dialog" aria-modal="true" aria-label="Procedure execution preview">
            <div className="procedure-preview-modal-card">
              <div className="procedure-preview-modal-header">
                <div className="procedure-preview-copy">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Execution Preview</p>
                  <h2 className="text-2xl font-extrabold leading-tight text-slate-950">{draft.plan_name || 'Procedure Preview'}</h2>
                  <p className="text-sm leading-6 text-slate-500">ดูผลลัพธ์การรันขั้นตอนแบบเต็มโดยไม่ให้ preview กินพื้นที่หน้าทำงานหลัก</p>
                </div>
                <button type="button" onClick={() => setShowPreviewModal(false)} className="procedure-preview-close" aria-label="Close preview">×</button>
              </div>
              <div className="procedure-preview-shell" style={{ marginTop: 20 }}>
                <div className="procedure-preview-grid">
                  {draft.steps.map((step) => (
                    <div key={step.step_no} className="procedure-preview-item">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="procedure-preview-title">{step.step_no}. {step.title || 'ยังไม่ได้ตั้งชื่อ'}</p>
                          <p className="procedure-preview-meta">{step.step_type} • {step.required ? 'required' : 'optional'}</p>
                        </div>
                      </div>
                      {step.instruction && <p className="mt-3 text-[14px] leading-7 text-slate-600">{step.instruction}</p>}
                    </div>
                  ))}
                  {draft.steps.length === 0 && (
                    <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      ยังไม่มีขั้นตอนสำหรับ preview
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
