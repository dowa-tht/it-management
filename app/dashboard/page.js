import { getDashboardData } from '@/app/actions/dashboard'
import DashboardClient from './DashboardClient'

// In a Server Component, timezone is typically UTC, but we'll fetch default data
export default async function DashboardPage() {
  const initialData = await getDashboardData(-420) // Default to BKK time
  return <DashboardClient initialData={initialData} />
}
