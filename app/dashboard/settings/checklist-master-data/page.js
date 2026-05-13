'use client'

import { MasterDataStandalonePage } from '../_components/MasterDataScope'

export default function ChecklistMasterDataPage() {
  return (
    <MasterDataStandalonePage
      forcedGroup="checklist"
      initialType="checklist_category"
      title="Checklist Master Data"
      subtitle="จัดการหมวดหมู่ รายการตรวจเช็ค และ Procedure Plans สำหรับ IT Checklist"
    />
  )
}
