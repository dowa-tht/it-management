import { redirect } from 'next/navigation'
import { ChecklistTemplateBuilderClient } from './ChecklistTemplateBuilderClient'
import { getChecklistTemplateBuilderPageData } from '@/app/actions/checklist-template'

export default async function ChecklistTemplateBuilderPage({ searchParams }) {
  const query = await searchParams
  let data

  try {
    data = await getChecklistTemplateBuilderPageData()
  } catch (error) {
    if (error.message?.includes('ไม่มีสิทธิ์') || error.message?.includes('เข้าสู่ระบบ')) {
      redirect('/dashboard/settings/checklist-master-data')
    }

    throw error
  }

  return (
    <ChecklistTemplateBuilderClient
      currentUser={data.currentUser}
      templates={data.templates}
      categories={data.categories}
      procedurePlans={data.procedurePlans}
      initialTemplateId={query?.templateId || null}
      initialMode={query?.mode || 'manage'}
    />
  )
}
