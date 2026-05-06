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

export async function getUnifiedMyPendingItems() {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get User Profile
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email')
      .eq(session.type === 'internal' ? 'email' : 'id', session.user.email || session.user.id)
      .single()

    if (!profile) return { error: 'Profile not found' }

    // 2. Fetch My Pending Checklists (Sent by me, still pending)
    const { data: checklists } = await supabaseAdmin
      .from('checklist_docs')
      .select(`id, freq_type, period_date, status, workflow_status, created_by, assigned_approver_id`)
      .in('workflow_status', ['pending', 'PENDING'])
      .eq('created_by', profile.email)

    // 3. Fetch My Pending Incidents (Sent by me OR Reported by me, still pending approval)
    const { data: incidents } = await supabaseAdmin
      .from('incidents')
      .select(`id, case_number, title, status, created_at, reported_by, assigned_to, reported_by_id`)
      .ilike('status', 'Pending Approval')
      .or(`reported_by.eq.${profile.email},assigned_to.eq.${profile.email},reported_by_id.eq.${profile.id}`)

    // 4. Transform into Unified Format
    const unified = [
      ...(checklists || []).map(c => ({
        id: c.id,
        category: 'Checklist',
        type: c.freq_type,
        docNo: `CHK-${c.period_date}-${c.freq_type.charAt(0)}`,
        subject: `IT Checklist (${c.freq_type}) - ${c.period_date}`,
        requestDate: c.period_date,
        status: 'Waiting for Approver',
        link: `/dashboard/checklist/${c.id}`
      })),
      ...(incidents || []).map(i => ({
        id: i.id,
        category: 'Incident',
        type: 'Ticket',
        docNo: i.case_number,
        subject: i.title,
        requestDate: i.created_at.split('T')[0],
        status: 'Waiting for Approval',
        link: `/dashboard/incidents/${i.id}`
      }))
    ]

    unified.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate))
    return { data: unified }
  } catch (err) {
    console.error('getUnifiedMyPendingItems Error:', err)
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

      // Map names for login logs
      const emails = [...new Set(data.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const mapped = data.map(l => ({
        ...l,
        full_name: nameMap[l.user_email] || l.user_email
      }))

      return { data: mapped }
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
      ]

      // Fetch names for all emails
      const emails = [...new Set(combined.map(l => l.user_email).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const mapped = combined.map(l => ({
        ...l,
        full_name: nameMap[l.user_email] || l.user_email
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return { data: mapped }
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
          id, doc_id, action, created_at, user_email,
          checklist_docs(doc_no, period_date, freq_type, workflow_status, status)
        `)
        .order('created_at', { ascending: false })

      const { data: incLogs } = await supabaseAdmin
        .from('incident_logs')
        .select(`
          id, doc_id, action, created_at, user_email,
          incidents(case_number, title, status)
        `)
        .order('created_at', { ascending: false })

      const combined = [
        ...(chkLogs || []).map(l => ({
          id: l.id,
          doc_id: l.doc_id,
          category: 'Checklist',
          docNo: l.checklist_docs?.doc_no || 'N/A',
          subject: `${l.checklist_docs?.freq_type} - ${l.checklist_docs?.period_date}`,
          current_workflow_status: l.checklist_docs?.workflow_status,
          current_status: l.checklist_docs?.status,
          action: l.action,
          timestamp: l.created_at,
          user: l.user_email
        })),
        ...(incLogs || []).map(l => ({
          id: l.id,
          doc_id: l.doc_id,
          category: 'Incident',
          docNo: l.incidents?.case_number || 'N/A',
          subject: l.incidents?.title || 'N/A',
          current_workflow_status: l.incidents?.status === 'Pending Approval' ? 'pending' : 'other',
          current_status: l.incidents?.status,
          action: l.action,
          timestamp: l.created_at,
          user: l.user_email
        }))
      ]
      
      // Fetch names for all emails
      const emails = [...new Set(combined.map(l => l.user).filter(Boolean))]
      const { data: profiles } = await supabaseAdmin.from('user_profiles').select('email, full_name').in('email', emails)
      const nameMap = Object.fromEntries(profiles?.map(p => [p.email, p.full_name]) || [])

      const filtered = combined.map(l => ({
        ...l,
        user: nameMap[l.user] || l.user
      })).filter(l => 
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

export async function submitRequest(docId, targetType, triggerKey, userEmail) {
  try {
    const session = await getCurrentUserSession()
    if (!session) return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Find the current assigned approver from config
    const { data: config } = await supabaseAdmin
      .from('approval_configs')
      .select('primary_approver_id')
      .eq('target_type', targetType)
      .eq('freq_type', triggerKey)
      .single()

    let approverName = 'ระบบ Pool'
    if (config?.primary_approver_id) {
      const { data: apProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('full_name')
        .eq('id', config.primary_approver_id)
        .single()
      if (apProfile) approverName = apProfile.full_name
    }

    const isAutoApprove = !config || !config.primary_approver_id

    const { error } = await supabaseAdmin
      .from('checklist_docs')
      .update({
        workflow_status: isAutoApprove ? 'approved' : 'pending',
        status: isAutoApprove ? 'Closed' : 'In Progress', // Update main status
        assigned_approver_id: config?.primary_approver_id || null,
        approval_comment: isAutoApprove ? 'ระบบอนุมัติอัตโนมัติ (ตามการตั้งค่า)' : null
      })
      .eq('id', docId)
    
    if (error) throw error

    await recordLog(docId, targetType, isAutoApprove ? 'Auto-Approved' : 'Submitted', isAutoApprove 
      ? 'ระบบอนุมัติงานให้อัตโนมัติตามการตั้งค่า' 
      : `ส่งเอกสารเพื่อขออนุมัติ (ผู้อนุมัติหลัก: ${approverName})`, userEmail)

    return { success: true, autoApproved: isAutoApprove }
  } catch (err) {
    console.error('submitRequest Error:', err)
    return { success: false, error: err.message }
  }
}

export async function adminResetWorkflow(docId, docType, password) {
  try {
    const session = await getCurrentUserSession()
    if (!session || session.type !== 'internal') return { error: 'Unauthorized' }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify Admin Role
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'administrator') return { error: 'Access Denied: Administrator role required.' }

    // 2. Verify Password (by trying to sign in with a fresh client)
    const { error: authError } = await createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      .auth.signInWithPassword({
        email: session.user.email,
        password: password
      })

    if (authError) return { error: 'รหัสผ่านไม่ถูกต้อง การยืนยันตัวตนล้มเหลว' }

    // 3. Reset Workflow
    const table = docType === 'Checklist' ? 'checklist_docs' : 'incidents'
    const updateData = {
      workflow_status: null,
      status: 'Open',
      assigned_approver_id: null,
      approved_by: null,
      approved_at: null,
      approval_comment: null
    }

    const { error: resetError } = await supabaseAdmin
      .from(table)
      .update(updateData)
      .eq('id', docId)

    if (resetError) throw resetError

    // 4. Record Log
    await recordLog(docId, docType.toLowerCase(), 'Admin Override', `ยกเลิกการอนุมัติ (Workflow Reset) โดย ${profile.full_name} ผ่านหน้าจอ Approval Logs`, session.user.email)

    return { success: true }
  } catch (err) {
    console.error('adminResetWorkflow Error:', err)
    return { error: err.message }
  }
}
