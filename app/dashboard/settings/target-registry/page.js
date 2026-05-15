import { redirect } from 'next/navigation'
import { getTargetRegistryPageData } from '@/app/actions/target'
import { TargetRegistryClient } from './TargetRegistryClient'

export default async function TargetRegistryPage() {
  let data

  try {
    data = await getTargetRegistryPageData()
  } catch (error) {
    if (error.message?.includes('ไม่มีสิทธิ์') || error.message?.includes('เข้าสู่ระบบ')) {
      redirect('/dashboard/settings/checklist-master-data')
    }

    throw error
  }

  return (
    <TargetRegistryClient
      currentUser={data.currentUser}
      initialTargets={data.targets}
      initialGroups={data.groups}
      mappings={data.mappings}
    />
  )
}
