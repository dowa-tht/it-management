'use server'

import { createClient } from '@supabase/supabase-js'
import { SLA_LIMITS } from '@/lib/slaUtils'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function toSafeInt(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return null
  return Math.floor(num)
}

function normalizeLimits(payload) {
  const severities = ['High', 'Medium', 'Low']
  const response = {}
  const resolution = {}

  for (const severity of severities) {
    const responseVal = toSafeInt(payload?.Response?.[severity])
    const resolutionVal = toSafeInt(payload?.Resolution?.[severity])
    if (responseVal === null || resolutionVal === null) {
      throw new Error(`Invalid SLA minutes for severity: ${severity}`)
    }
    response[severity] = responseVal
    resolution[severity] = resolutionVal
  }

  return {
    Response: response,
    Resolution: resolution,
  }
}

export async function getSLASettingsPageData() {
  const supabaseAdmin = getAdminClient()

  const [slaLimitsRes, workingHoursRes, reasonsRes, holidaysRes] = await Promise.all([
    supabaseAdmin.from('system_settings').select('value').eq('key', 'sla_limits').maybeSingle(),
    supabaseAdmin.from('system_settings').select('value').eq('key', 'working_hours').maybeSingle(),
    supabaseAdmin
      .from('master_data')
      .select('id, value, is_active, sort_order')
      .eq('type', 'sla_exclusion_reason')
      .order('sort_order', { ascending: true }),
    supabaseAdmin.from('holidays').select('id', { count: 'exact', head: true }),
  ])

  if (slaLimitsRes.error) throw slaLimitsRes.error
  if (workingHoursRes.error) throw workingHoursRes.error
  if (reasonsRes.error) throw reasonsRes.error
  if (holidaysRes.error) throw holidaysRes.error

  return {
    success: true,
    data: {
      slaLimits: slaLimitsRes.data?.value || SLA_LIMITS,
      workingHours: workingHoursRes.data?.value || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] },
      exclusionReasons: reasonsRes.data || [],
      holidaysCount: holidaysRes.count || 0,
    },
  }
}

export async function saveSLATargets(payload) {
  const supabaseAdmin = getAdminClient()
  const normalized = normalizeLimits(payload)

  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert(
      {
        key: 'sla_limits',
        value: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: normalized }
}

export async function saveSLAExclusionReason(payload) {
  const supabaseAdmin = getAdminClient()
  const action = payload?.action || 'create'

  if (action === 'create') {
    const value = (payload?.value || '').trim()
    if (!value) return { success: false, error: 'Reason is required' }

    const { data: maxRow } = await supabaseAdmin
      .from('master_data')
      .select('sort_order')
      .eq('type', 'sla_exclusion_reason')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sortOrder = (maxRow?.sort_order || 0) + 1
    const { error } = await supabaseAdmin.from('master_data').insert({
      type: 'sla_exclusion_reason',
      value,
      is_active: true,
      sort_order: sortOrder,
    })

    if (error) return { success: false, error: error.message }
  }

  if (action === 'update') {
    const id = Number(payload?.id)
    if (!id) return { success: false, error: 'Invalid reason id' }
    const value = (payload?.value || '').trim()
    if (!value) return { success: false, error: 'Reason is required' }

    const { error } = await supabaseAdmin.from('master_data').update({ value }).eq('id', id)
    if (error) return { success: false, error: error.message }
  }

  if (action === 'toggle') {
    const id = Number(payload?.id)
    if (!id) return { success: false, error: 'Invalid reason id' }
    const isActive = !!payload?.is_active

    const { error } = await supabaseAdmin.from('master_data').update({ is_active: !isActive }).eq('id', id)
    if (error) return { success: false, error: error.message }
  }

  return getSLASettingsPageData()
}
