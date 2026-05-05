'use server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserSession } from './user'

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
    // We fetch docs where workflow_status is 'pending' or doc status is 'Pending Approval'
    // Depending on how your DB is structured. Based on previous edits, we use status='Pending Approval'
    const { data: checklists, error: chkErr } = await supabaseAdmin
      .from('checklist_docs')
      .select(`
        id, 
        freq_type, 
        period_date, 
        status, 
        assigned_approver_id,
        user_profiles!checklist_docs_created_by_fkey(full_name)
      `)
      .eq('status', 'Pending Approval')
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
        requester: c.user_profiles?.full_name || 'System',
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
