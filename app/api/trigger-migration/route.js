import { runWorkflowMigration } from '@/app/actions/workflow'
import { NextResponse } from 'next/server'

export async function GET() {
  const res = await runWorkflowMigration()
  return NextResponse.json(res)
}
