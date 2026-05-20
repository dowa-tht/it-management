'use server'

import { randomUUID } from 'crypto'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { getCurrentUserSession } from './user'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { buildTemplatePreview, normalizeTemplateRecord, validateChecklistTemplate } from '@/lib/checklistTemplateValidation'

/**
 * Fetch checklist templates applicable to a specific target (per_target) or group (per_group).
 * Returns array of template records.
 */
export async function getTemplatesForTarget(targetId) {
  const supabase = getSupabaseAdmin()
  // Find target record to get its type and group (if any)
  const { data: target, error: targetErr } = await supabase
    .from('checklist_targets')
    .select('id, target_type, target_group_id')
    .eq('id', targetId)
    .single()
  if (targetErr) throw new Error(targetErr.message)

  // Fetch template-target mappings for this target or its group
  const { data: mappings, error: mapErr } = await supabase
    .from('checklist_template_targets')
    .select('template_id')
    .or(`target_id.eq.${targetId},target_group_id.eq.${target?.target_group_id}`)
  if (mapErr) throw new Error(mapErr.message)

  const templateIds = (mappings || []).map(m => m.template_id)
  if (templateIds.length === 0) return []

  const { data: templates, error: tmplErr } = await supabase
    .from('checklist_templates')
    .select('*')
    .in('id', templateIds)
  if (tmplErr) throw new Error(tmplErr.message)
  return templates
}

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
    throw new Error('คุณไม่มีสิทธิ์จัดการ Checklist Template Builder')
  }

  return { session, profile, adminClient }
}

function formatBuilderTemplate(record, procedurePlans) {
  const normalized = normalizeTemplateRecord(record)
  return {
    ...normalized,
    preview: buildTemplatePreview(normalized, procedurePlans),
  }
}

export async function getChecklistTemplateBuilderPageData() {
  noStore()

  const { profile, adminClient } = await requireAdminProfile()

  const [templatesResult, categoriesResult, procedurePlansResult, targetTypesResult, targetsResult, groupsResult] = await Promise.all([
    adminClient
      .from('checklist_templates')
      .select('id, item_key, category, freq_type, item_label, instruction, ui_template_type, template_config, is_active, sort_order, scope_mode, target_type')
      .order('freq_type')
      .order('sort_order'),
    adminClient
      .from('master_data')
      .select('id, value')
      .eq('type', 'checklist_category')
      .eq('is_active', true)
      .order('sort_order'),
    adminClient
      .from('checklist_procedure_plans')
      .select('id, plan_name, steps')
      .order('plan_name'),
    adminClient
      .from('master_data')
      .select('id, value')
      .eq('type', 'target_type')
      .eq('is_active', true)
      .order('sort_order'),
    adminClient
      .from('checklist_targets')
      .select('id, name, target_code, target_type')
      .eq('is_active', true)
      .order('name'),
    adminClient
      .from('checklist_target_groups')
      .select('id, group_name, group_code, target_type')
      .order('group_name'),
  ])

  // Need to also fetch mappings for templates
  let templateMappings = []
  if (templatesResult.data && templatesResult.data.length > 0) {
    const { data: mappings } = await adminClient
      .from('checklist_template_targets')
      .select('*')

    templateMappings = mappings || []
  }

  if (templatesResult.error) throw new Error(templatesResult.error.message)
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (procedurePlansResult.error) throw new Error(procedurePlansResult.error.message)

  const procedurePlans = (procedurePlansResult.data || []).map((plan) => ({
    ...plan,
    step_count: Array.isArray(plan.steps?.rows) ? plan.steps.rows.length : Array.isArray(plan.steps) ? plan.steps.length : 0,
  }))

  const templates = (templatesResult.data || []).map((record) => {
    const targets = templateMappings.filter(m => m.template_id === record.id)
    return formatBuilderTemplate({ ...record, targets }, procedurePlans)
  })

  return {
    currentUser: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
    },
    categories: (categoriesResult.data || []).map((category) => category.value),
    targetTypes: (targetTypesResult.data || []).map((t) => t.value),
    targets: targetsResult.data || [],
    targetGroups: groupsResult.data || [],
    procedurePlans,
    templates,
  }

}

export async function saveChecklistTemplate(payload) {
  try {
    const { adminClient } = await requireAdminProfile()
    const validation = validateChecklistTemplate(payload)

    if (!validation.success) {
      return {
        success: false,
        error: 'Validation failed',
        fieldErrors: validation.errors,
      }
    }

    const template = validation.data
    const existingId = template.id || null
    let sortOrder = payload?.sort_order ?? 0
    let itemKey = payload?.item_key || ''

    if (!existingId) {

    const { data: latestTemplate } = await adminClient
        .from('checklist_templates')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      sortOrder = (latestTemplate?.sort_order || 0) + 1
      itemKey = `custom_${Date.now()}_${randomUUID().slice(0, 8)}`
    }

    // Checking for overlapping frequencies for the targets
    if (template.scope_mode !== 'global' && template.targets && template.targets.length > 0) {
      const targetIds = template.targets.filter(t => t.target_id).map(t => t.target_id)

      if (targetIds.length > 0) {
        // Fetch all templates for these targets
        const { data: existingMappings, error: mapError } = await adminClient
          .from('checklist_template_targets')
          .select(`
            target_id,
            template:checklist_templates (id, freq_type, item_label)
          `)
          .in('target_id', targetIds)

        if (!mapError && existingMappings) {
          // Check if any mapping has the same frequency
          for (const mapping of existingMappings) {
            // Ignore if it's the current template being updated
            if (mapping.template && mapping.template.id !== existingId && mapping.template.freq_type === template.freq_type) {
               return {
                  success: false,
                  error: `ไม่สามารถบันทึกได้: อุปกรณ์มีเทมเพลตรอบการตรวจแบบ ${template.freq_type} อยู่แล้ว ("${mapping.template.item_label}")`,
               }
            }
          }
        }
      }
    }

    const dataToSave = {
      category: template.category,
      freq_type: template.freq_type,
      item_label: template.item_label,
      instruction: template.instruction,
      ui_template_type: template.ui_template_type,
      template_config: template.template_config,
      scope_mode: template.scope_mode,
      target_type: template.target_type,
      is_active: payload?.is_active !== false,
      sort_order: sortOrder,
      item_key: itemKey,
    }

    const query = existingId
      ? adminClient.from('checklist_templates').update(dataToSave).eq('id', existingId).select('*').single()
      : adminClient.from('checklist_templates').insert([dataToSave]).select('*').single()

    const { data, error } = await query

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    const savedTemplateId = data.id

    // Process targets mapping
    if (template.scope_mode !== 'global') {
      // First, delete existing mappings
      await adminClient.from('checklist_template_targets').delete().eq('template_id', savedTemplateId)

      // Insert new mappings
      if (template.targets && template.targets.length > 0) {
        const mappingsToInsert = template.targets.map(t => ({
          template_id: savedTemplateId,
          target_id: t.target_id || null,
          target_group_id: t.target_group_id || null,
          target_type: t.target_type || template.target_type,
          override_config: t.override_config || null,
          is_active: t.is_active !== false
        }))

        const { error: insertMapError } = await adminClient.from('checklist_template_targets').insert(mappingsToInsert)
        if (insertMapError) {
          console.error('Failed to insert mappings:', insertMapError)
          // Continue execution, but log error
        }
      }
    } else {
      // If changed back to global, clear all mappings
      await adminClient.from('checklist_template_targets').delete().eq('template_id', savedTemplateId)
    }


    const { data: procedurePlans } = await adminClient
      .from('checklist_procedure_plans')
      .select('id, plan_name, steps')
      .order('plan_name')

    revalidatePath('/dashboard/settings/checklist-template-builder')
    revalidatePath('/dashboard/settings/checklist-master-data')

    return {
      success: true,
      template: formatBuilderTemplate(data, (procedurePlans || []).map((plan) => ({
        ...plan,
        step_count: Array.isArray(plan.steps?.rows) ? plan.steps.rows.length : Array.isArray(plan.steps) ? plan.steps.length : 0,
      }))),
      message: existingId ? 'บันทึกการแก้ไข Template สำเร็จ' : 'สร้าง Template ใหม่สำเร็จ',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    }
  }
}
