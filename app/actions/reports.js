'use server'
import { createClient } from '@supabase/supabase-js'
import { SLA_LIMITS, calculateSLARates, calculateIncidentSlaSnapshot } from '@/lib/slaUtils'

export async function getSLAReportData(startDate, endDate, page = 0) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase Environment Variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // ดึงข้อมูล Incident
    const { data: incidents, error: incError } = await supabaseAdmin
      .from('incidents')
      .select(`
        id, case_number, title, severity, status, 
        created_at, acknowledged_at, assigned_at, resolved_at,
        affected_system
      `)
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false })
      .range(page * 20, (page + 1) * 20 - 1)

    if (incError) throw incError

    // แยกดึงข้อมูลเพื่อคำนวณ Summary ทั้งหมด (เพื่อความแม่นยำของ Dashboard)
    const { data: allIncidentsForSummary } = await supabaseAdmin
      .from('incidents')
      .select('id, severity, status, created_at, acknowledged_at, assigned_at, resolved_at')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)

    // ดึง Master Data ที่เกี่ยวข้อง
    const [holidayRes, settingsRes, exclusionsRes, slaLimitsRes] = await Promise.all([
      supabaseAdmin.from('holidays').select('holiday_date'),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'working_hours').maybeSingle(),
      supabaseAdmin.from('incident_exclusions').select('*'),
      supabaseAdmin.from('system_settings').select('value').eq('key', 'sla_limits').maybeSingle()
    ])

    const holidays = holidayRes.data?.map(h => h.holiday_date) || []
    const wh = settingsRes.data?.value || { start: '08:30', end: '17:30', work_days: [1, 2, 3, 4, 5] }
    const allExclusions = exclusionsRes.data || []
    
    // SLA Limits fallback
    const dynamicSlaLimits = slaLimitsRes.data?.value || SLA_LIMITS
    
    const exclusionsMap = new Map()
    for (const exclusion of allExclusions) {
      if (!exclusionsMap.has(exclusion.incident_id)) exclusionsMap.set(exclusion.incident_id, [])
      exclusionsMap.get(exclusion.incident_id).push(exclusion)
    }

    const buildSnapshot = (inc) =>
      calculateIncidentSlaSnapshot(inc, {
        workingHours: wh,
        holidays,
        exclusions: exclusionsMap.get(inc.id) || [],
        slaLimits: dynamicSlaLimits,
      })

    const reportData = (incidents || []).map((inc) => ({
      ...inc,
      ...buildSnapshot(inc),
    }))

    const processedAllIncidents = (allIncidentsForSummary || []).map((inc) => ({
      ...inc,
      ...buildSnapshot(inc),
    }))

    const { 
      responseRate, 
      resolutionRate, 
      complianceRate, 
      acknowledgedCount: acknowledged, 
      resolvedCount: resolved,
      responsePassedCount,
      resolutionPassedCount,
      evaluatedCount,
    } = calculateSLARates(processedAllIncidents);

    const total = evaluatedCount;

    return {
      success: true,
      data: reportData,
      summary: {
        total,
        resolved,
        acknowledged,
        responsePassedCount,
        resolutionPassedCount,
        responseRate,
        resolutionRate,
        complianceRate
      },
      settings: {
        working_hours: wh,
        sla_limits: dynamicSlaLimits
      }
    }

  } catch (err) {
    console.error('SLA Report Server Action Error:', err)
    return { success: false, error: err.message }
  }
}

export async function saveSLASettings(wh, limits) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Update working_hours
    await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'working_hours', value: wh }, { onConflict: 'key' })

    // Update sla_limits
    await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'sla_limits', value: limits }, { onConflict: 'key' })

    return { success: true }
  } catch (err) {
    console.error('Save SLA Settings Error:', err)
    return { success: false, error: err.message }
  }
}
