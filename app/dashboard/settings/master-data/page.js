'use client'
import { MasterDataStandalonePage } from '../_components/MasterDataScope'

/**
 * MasterDataPage acts as a legacy fallback for /dashboard/settings/master-data
 * It now uses the shared MasterDataStandalonePage component.
 * New standalone routes like /incident-master-data should be used instead.
 */
export default function MasterDataPage() {
  return (
    <MasterDataStandalonePage 
      title="Master Data Management"
      subtitle="ระบบจัดการข้อมูลหลัก (Legacy View) - โปรดใช้เมนูแยกเพื่อความชัดเจน"
    />
  )
}
