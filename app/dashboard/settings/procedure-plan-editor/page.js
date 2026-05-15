import { redirect } from 'next/navigation'
import { getProcedurePlanEditorPageData } from '@/app/actions/procedure-plan'
import { ProcedurePlanEditorClient } from './ProcedurePlanEditorClient'

export default async function ProcedurePlanEditorPage({ searchParams }) {
  const query = await searchParams
  let data

  try {
    data = await getProcedurePlanEditorPageData()
  } catch (error) {
    if (error.message?.includes('ไม่มีสิทธิ์') || error.message?.includes('เข้าสู่ระบบ')) {
      redirect('/dashboard/settings/checklist-master-data')
    }

    throw error
  }

  return (
    <ProcedurePlanEditorClient
      currentUser={data.currentUser}
      plans={data.plans}
      initialPlanId={query?.planId || null}
    />
  )
}
