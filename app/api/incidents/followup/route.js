import crypto from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { recordSystemError } from '@/app/actions/workflow'

function normalizeToken(value) {
  return String(value || '').trim()
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function GET(request) {
  try {
    const token = normalizeToken(request.nextUrl.searchParams.get('token'))
    const incidentId = String(request.nextUrl.searchParams.get('incidentId') || '').trim()
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400 })

    const adminClient = getSupabaseAdmin()
    const tokenHash = hashToken(token)

    let tokenQuery = adminClient
      .from('incident_followup_tokens')
      .select('id, incident_id, reporter_email, expires_at, revoked_at, revoked_reason, view_count')
      .eq('token_hash', tokenHash)
      .limit(1)

    if (incidentId) tokenQuery = tokenQuery.eq('incident_id', incidentId)

    const { data: tokenRow, error: tokenErr } = await tokenQuery.maybeSingle()
    if (tokenErr) throw tokenErr
    if (!tokenRow) return Response.json({ error: 'Token not found' }, { status: 404 })
    if (tokenRow.revoked_at) {
      return Response.json({ error: 'Token revoked', revokedAt: tokenRow.revoked_at, reason: tokenRow.revoked_reason || null }, { status: 410 })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return Response.json({ error: 'Token expired', expiresAt: tokenRow.expires_at }, { status: 410 })
    }

    const { data: incident, error: incErr } = await adminClient
      .from('incidents')
      .select('id, case_number, title, description, severity, status, affected_system, category, reported_by, reporter_email, created_at, acknowledged_at, assigned_at, resolved_at, workflow_status, assigned_to, root_cause, resolution, corrective_action')
      .eq('id', tokenRow.incident_id)
      .single()

    if (incErr) throw incErr
    if (!incident) return Response.json({ error: 'Incident not found' }, { status: 404 })

    const { data: steps } = await adminClient
      .from('document_approvals')
      .select('id, step_order, role_required, status, action_at, comment')
      .eq('doc_type', 'incident')
      .eq('doc_id', tokenRow.incident_id)
      .order('step_order', { ascending: true })

    await adminClient
      .from('incident_followup_tokens')
      .update({
        last_viewed_at: new Date().toISOString(),
        view_count: (tokenRow.view_count || 0) + 1,
      })
      .eq('id', tokenRow.id)

    return Response.json({
      success: true,
      mode: 'external_followup',
      token: {
        incidentId: tokenRow.incident_id,
        reporterEmail: tokenRow.reporter_email,
        expiresAt: tokenRow.expires_at,
      },
      incident,
      workflowSteps: steps || [],
    })
  } catch (err) {
    await recordSystemError('API', `Incident follow-up GET failed: ${err.message}`, { error: err })
    return Response.json({ error: err.message }, { status: 500 })
  }
}
