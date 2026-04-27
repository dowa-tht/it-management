'use server'
import { createClient } from '@supabase/supabase-js'

export async function getDashboardData(timezoneOffset = -420) {
  try {
    // สร้าง Supabase Admin Client เพื่อดึงข้อมูล Dashboard (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return { error: 'ไม่พบ SUPABASE_SERVICE_ROLE_KEY หรือ NEXT_PUBLIC_SUPABASE_URL ใน Environment Variables' }
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // timezoneOffset is used to calculate "today" correctly for the user's local time if needed
    // Defaults to -420 for UTC+7 (Bangkok)
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const startIso = start.toISOString()

    // For today string (YYYY-MM-DD), we should use a rough local date to match what checklist period_date stores
    const todayDate = new Date(new Date().getTime() - (timezoneOffset * 60000))
    const todayStr = todayDate.toISOString().split('T')[0]

    const [incRes, bakRes, chkRes] = await Promise.all([
      supabaseAdmin.from('incidents').select('id, case_number, title, severity, status, created_at, affected_system').gte('created_at', startIso).order('created_at', { ascending: false }),
      supabaseAdmin.from('backup_logs').select('id, log_date, system_name, status, notes').gte('log_date', startIso.split('T')[0]).order('log_date', { ascending: false }),
      supabaseAdmin.from('checklist_docs').select('id, status, freq_type, checklist_items(id, status)').eq('period_date', todayStr)
    ])

    if (incRes.error) console.error('Incidents Fetch Error:', incRes.error)
    if (bakRes.error) console.error('Backups Fetch Error:', bakRes.error)
    if (chkRes.error) console.error('Checklists Fetch Error:', chkRes.error)

    const incidents = incRes.data || []
    const backups = bakRes.data || []
    const checklists = chkRes.error ? null : (chkRes.data || [])

    // Aggregate Data to reduce payload size
    const totalIncidents = incidents.length
    const highSeverity = incidents.filter(i => i.severity === 'High').length
    const inProgress = incidents.filter(i => i.status === 'In Progress').length
    
    const backupSuccessRate = backups.length
      ? Math.round((backups.filter(b => b.status === 'Success').length / backups.length) * 100)
      : 0

    // Incident 7 days chart data
    const chartMap = {}
    incidents.forEach(i => {
      try {
        // Format to short date (e.g., 27 เม.ย.)
        const d = new Date(i.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
        chartMap[d] = (chartMap[d] || 0) + 1
      } catch (e) {
        console.error('Date parsing error for incident:', i.id, e)
      }
    })
    const incidentByDay = Object.entries(chartMap).slice(-7).map(([date, count]) => ({ date, count }))

    // Severity Breakdown
    const severityData = [
      { name: 'High', value: highSeverity, color: '#ef4444' },
      { name: 'Medium', value: incidents.filter(i => i.severity === 'Medium').length, color: '#f59e0b' },
      { name: 'Low', value: incidents.filter(i => i.severity === 'Low').length, color: '#10b981' },
    ].filter(d => d.value > 0)

    return {
      stats: {
        totalIncidents,
        highSeverity,
        inProgress,
        backupSuccessRate
      },
      incidentByDay,
      severityData,
      recentIncidents: incidents.slice(0, 5),
      recentBackups: backups.slice(0, 5),
      checklists
    }
  } catch (err) {
    console.error('Dashboard Server Action Exception:', err)
    return { error: `Server Error: ${err.message || String(err)}` }
  }
}
