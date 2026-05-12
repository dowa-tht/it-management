import { createClient } from '@supabase/supabase-js'
import { recordAuditLog } from '@/app/actions/workflow'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = createClient(supabaseUrl, supabaseKey)

  const cases = [
    {
      id: '157f0664-31fa-4004-9db3-8719c1895dc5',
      no: 'DTT-INC-2604-001',
      created: '2026-04-25T11:22:06.244109+00:00',
      ack: '2026-04-25T11:32:06.244Z'
    },
    {
      id: 'a6c2e4d7-3835-4179-a12b-977b623fea28',
      no: 'DTT-INC-2604-002',
      created: '2026-04-25T11:39:56.169825+00:00',
      ack: '2026-04-25T11:49:56.169Z'
    }
  ]

  const results = []

  for (const c of cases) {
    // 1. Update Incident
    const { error: updateErr } = await supabase
      .from('incidents')
      .update({
        status: 'In Progress',
        acknowledged_at: c.ack,
        assigned_at: c.ack,
        assigned_to: 'IT Staff (System Fix)'
      })
      .eq('id', c.id)

    if (updateErr) {
      results.push({ case: c.no, success: false, error: updateErr.message })
      continue
    }

    // 2. Record Log (System Flow)
    await recordAuditLog({
      docId: c.id,
      docType: 'incident',
      action: 'Acknowledge',
      details: `รับงานแก้ไข (Response Time: 10 นาที) | ดำเนินการโดย Script ตามระบบ`,
      userEmail: 'system@internal'
    })

    results.push({ case: c.no, success: true })
  }

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' }
  })
}
