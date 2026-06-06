'use server'

import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { getCurrentActorProfile, getCurrentUserSession } from './user'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { recordEntityAuditLog } from './audit'
import { createClient as createServerSupabaseClient } from '@/lib/supabaseServer'
import { normalizeProcedurePlan, normalizeProcedurePlanSteps, validateProcedurePlanInput } from '@/lib/procedurePlanValidation'

async function requireAdminProfile() {
  const session = await getCurrentUserSession()

  if (!session || session.type !== 'internal') {
    throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน')
  }

  const adminClient = getSupabaseAdmin()
  const { data: profile, error } = await adminClient
    .from('user_profiles')
    .select('id, role, is_active, full_name')
    .eq('id', session.user.id)
    .single()

  if (error || !profile) {
    throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')
  }

  if (!profile.is_active || profile.role !== 'admin') {
    throw new Error('คุณไม่มีสิทธิ์จัดการ Procedure Plans')
  }

  return { adminClient, profile, session }
}

async function requireProcedurePlanViewer() {
  const session = await getCurrentUserSession()

  if (!session || session.type !== 'internal') {
    throw new Error('กรุณาเข้าสู่ระบบก่อนใช้งาน')
  }

  const profile = await getCurrentActorProfile()

  if (!profile?.id || !profile?.role) {
    throw new Error('ไม่พบข้อมูลผู้ใช้ในระบบ')
  }

  if (!['admin', 'auditor'].includes(profile.role)) {
    throw new Error('คุณไม่มีสิทธิ์ดู Procedure Plans')
  }

  return { profile }
}

function formatProcedurePlan(record) {
  const normalized = normalizeProcedurePlan(record)

  return {
    ...normalized,
    step_count: normalized.steps.length,
  }
}

export async function getProcedurePlanEditorPageData() {
  noStore()

  const { profile } = await requireProcedurePlanViewer()
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('checklist_procedure_plans')
    .select('id, plan_name, steps')
    .order('plan_name')

  if (error) throw new Error(error.message)

  return {
    currentUser: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
    },
    plans: (data || []).map(formatProcedurePlan),
  }
}

export async function saveProcedurePlan(payload) {
  try {
    const { adminClient, profile, session } = await requireAdminProfile()
    const validation = validateProcedurePlanInput(payload)

    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validation.errors,
      }
    }

    const plan = validation.data
    let beforeRecord = null
    if (plan.id) {
      const { data: currentPlan } = await adminClient
        .from('checklist_procedure_plans')
        .select('id, plan_name, steps')
        .eq('id', plan.id)
        .maybeSingle()
      beforeRecord = currentPlan || null
    }
    const planData = {
      plan_name: plan.plan_name,
      steps: {
        rows: plan.steps,
      },
    }

    const query = plan.id
      ? adminClient.from('checklist_procedure_plans').update(planData).eq('id', plan.id).select('id, plan_name, steps').single()
      : adminClient.from('checklist_procedure_plans').insert([planData]).select('id, plan_name, steps').single()

    const { data, error } = await query

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    await recordEntityAuditLog({
      scope: 'settings',
      entityType: 'procedure_plan',
      entityId: data.id,
      entityLabel: data.plan_name,
      sourceModule: 'settings_procedure_plan_editor',
      docId: data.id,
      docType: 'procedure_plan',
      action: plan.id ? 'Updated' : 'Created',
      details: plan.id ? 'Updated procedure plan' : 'Created procedure plan',
      userEmail: session.user.email,
      before: beforeRecord || {},
      after: data,
      allowlist: ['plan_name', 'steps'],
      metadata: {
        actor_name: profile.full_name,
        diffOptions: {
          summarizeFields: ['steps'],
        },
      },
    })

    revalidatePath('/dashboard/settings/procedure-plan-editor')
    revalidatePath('/dashboard/settings/checklist-master-data')
    revalidatePath('/dashboard/settings/checklist-template-builder')

    return {
      success: true,
      plan: formatProcedurePlan(data),
      message: plan.id ? 'บันทึก Procedure Plan สำเร็จ' : 'สร้าง Procedure Plan สำเร็จ',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function createProcedurePlanDraft() {
  const emptyPlan = normalizeProcedurePlan({
    id: null,
    plan_name: '',
    steps: [],
  })

  return {
    ...emptyPlan,
    step_count: 0,
  }
}

export async function getProcedurePlanSteps(planId) {
  const { adminClient } = await requireAdminProfile()
  const { data, error } = await adminClient
    .from('checklist_procedure_plans')
    .select('steps')
    .eq('id', planId)
    .single()

  if (error) throw new Error(error.message)
  return normalizeProcedurePlanSteps(data?.steps)
}
