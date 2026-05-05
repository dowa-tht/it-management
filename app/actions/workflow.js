'use server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'

export async function recordLog(docId, type, action, details, userEmail) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const table = type === 'checklist' ? 'checklist_logs' : 'incident_logs'
    const fullAction = details ? `${action}: ${details}` : action
    
    const { error } = await supabaseAdmin.from(table).insert({
      doc_id: docId,
      action: fullAction,
      user_email: userEmail
    })
    if (error) throw error
    return { success: true }
  } catch (err) {
    console.error('recordLog Error:', err)
    return { success: false, error: err.message }
  }
}

export async function getUnifiedPendingApprovals() {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get User Profile ID
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role')
      .eq(session.type === 'internal' ? 'email' : 'id', session.user.email || session.user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // 2. Fetch Pending Checklists
    const { data: checklists, error: chkErr } = await supabaseAdmin
      .from('checklist_docs')
      .select(`
        id, 
        freq_type, 
        period_date, 
        status, 
        assigned_approver_id,
        created_by
      `)
      .eq('workflow_status', 'pending')
      .or(`assigned_approver_id.eq.${profile.id},assigned_approver_id.is.null`)

    // 3. Fetch Pending Incidents
    const { data: incidents, error: incErr } = await supabaseAdmin
      .from('incidents')
      .select(`
        id, 
        case_number, 
        title, 
        status, 
        created_at,
        assigned_approver_id,
        user_profiles!incidents_created_by_fkey(full_name)
      `)
      .eq('status', 'Pending Approval')
      .or(`assigned_approver_id.eq.${profile.id},assigned_approver_id.is.null`)

    // 4. Transform into Unified Format
    const unified = [
      ...(checklists || []).map(c => ({
        id: c.id,
        category: 'Checklist',
        type: c.freq_type,
        docNo: `CHK-${c.period_date}-${c.freq_type.charAt(0)}`,
        subject: `IT Checklist (${c.freq_type}) - ${c.period_date}`,
        requestDate: c.period_date,
        requester: c.created_by || 'System',
        link: `/dashboard/checklist/${c.id}`
      })),
      ...(incidents || []).map(i => ({
        id: i.id,
        category: 'Incident',
        type: 'Ticket',
        docNo: i.case_number,
        subject: i.title,
        requestDate: i.created_at.split('T')[0],
        requester: i.user_profiles?.full_name || 'Unknown',
        link: `/dashboard/incidents/${i.id}`
      }))
    ]

    // Sort by date descending
    unified.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))

    return { data: unified }
  } catch (err) {
    console.error('getUnifiedPendingApprovals Error:', err)
    return { error: err.message }
  }
}

export async function getSystemLogs(type = 'audit') {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    if (type === 'login') {
      const { data, error } = await supabaseAdmin
        .from('login_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return { data }
    }

    if (type === 'audit') {
      const { data: chkLogs } = await supabaseAdmin
        .from('checklist_logs')
        .select('id, action, created_at, user_email')
        .order('created_at', { ascending: false })
        .limit(100)
      
      const { data: incLogs } = await supabaseAdmin
        .from('incident_logs')
        .select('id, action, created_at, user_email')
        .order('created_at', { ascending: false })
        .limit(100)

      const combined = [
        ...(chkLogs || []).map(l => ({ ...l, category: 'Checklist' })),
        ...(incLogs || []).map(l => ({ ...l, category: 'Incident' }))
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return { data: combined }
    }

    if (type === 'approval') {
      const approvalActions = [
        'Submitted', 'Approved', 'Rejected', 'Delegated', 'Auto-Approved', 'Cancelled',
        'ปิดเอกสาร (Closed)', 'บันทึกร่าง', 'ส่งเอกสารเพื่อขออนุมัติ',
        'Submitted: ส่งเอกสารขออนุมัติ', 'Cancelled: ยกเลิกการส่งอนุมัติโดยผู้แจ้ง'
      ]
      
      const { data: chkLogs } = await supabaseAdmin
        .from('checklist_logs')
        .select(`
          id, action, created_at, user_email,
          checklist_docs(doc_no, period_date, freq_type)
        `)
        .order('created_at', { ascending: false })

      const { data: incLogs } = await supabaseAdmin
        .from('incident_logs')
        .select(`
          id, action, created_at, user_email,
          incidents(case_number, title)
        `)
        .order('created_at', { ascending: false })

      const combined = [
        ...(chkLogs || []).map(l => ({
          id: l.id,
          category: 'Checklist',
          docNo: l.checklist_docs?.doc_no || 'N/A',
          subject: `${l.checklist_docs?.freq_type} - ${l.checklist_docs?.period_date}`,
          action: l.action,
          timestamp: l.created_at,
          user: l.user_email
        })),
        ...(incLogs || []).map(l => ({
          id: l.id,
          category: 'Incident',
          docNo: l.incidents?.case_number || 'N/A',
          subject: l.incidents?.title || 'N/A',
          action: l.action,
          timestamp: l.created_at,
          user: l.user_email
        }))
      ]
      
      // Filter by approval actions
      const filtered = combined.filter(l => 
        approvalActions.includes(l.action) || 
        l.action.startsWith('Submitted:') || 
        l.action.startsWith('Cancelled:') ||
        l.action.startsWith('Approved:') ||
        l.action.startsWith('Rejected:')
      )

      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

      return { data: filtered }
    }

    return { data: [] }
  } catch (err) {
    console.error('getSystemLogs Error:', err)
    return { error: err.message }
  }
}
