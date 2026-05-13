'use client'

import { MasterDataStandalonePage } from '../_components/MasterDataScope'

export default function IncidentMasterDataPage() {
  return (
    <MasterDataStandalonePage
      forcedGroup="incident"
      title="Incident Master Data"
      subtitle="จัดการข้อมูลอ้างอิงสำหรับ Incident: ประเภทเหตุการณ์ ระบบที่ได้รับผลกระทบ และเหตุผลยกเว้น SLA"
    />
  )
}
