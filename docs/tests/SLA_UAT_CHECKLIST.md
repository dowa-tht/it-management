# SLA UAT Checklist

## Scope
- ตรวจสอบการแสดงผลและการคิดคะแนน SLA บนหน้า Incident List และ SLA Report
- ใช้กติกา Response/Resolution ล่าสุดตามแผนรวมศูนย์ SLA

## Pre-check
- [ ] มี SLA target ของระดับความรุนแรงที่ใช้ทดสอบ (เช่น Low/Medium/High)
- [ ] มีข้อมูลเคสสำหรับสถานะ Open, In Progress, Closed, Cancelled
- [ ] มีเคสตัวอย่างที่เข้า Pending Approval และเคสที่ถูก Reject

## A. Response SLA (Created -> Acknowledged)
- [ ] เคสที่ Ack ภายในเป้า แสดง PASS ในช่อง Response SLA
- [ ] เคสที่ Ack เกินเป้า แสดง FAIL ในช่อง Response SLA
- [ ] ตรวจสอบว่า Response SLA ไม่ได้รับผลจากการ Pause ทุกกรณี

## B. Resolution SLA (Acknowledged/Assigned -> Resolved/Closed)
- [ ] เคสที่ปิดงานทันเวลา แสดง PASS ในช่อง Resolution SLA
- [ ] เคสที่ปิดงานเกินเวลา แสดง FAIL ในช่อง Resolution SLA
- [ ] เคสเข้า Pending Approval แล้วกลับมาทำต่อ: เวลาช่วง Pending ต้องไม่นับ
- [ ] เคสโดน Reject แล้วกลับไปทำงานต่อ: เวลา Resolution ต้องนับต่อ ไม่รีเซ็ต

## C. Scoring ต่อเคส (1 / 0.5 / 0)
- [ ] ผ่านทั้ง Response และ Resolution = 1.0
- [ ] ผ่านเพียงอย่างเดียว = 0.5
- [ ] ไม่ผ่านทั้งสองอย่าง = 0

## D. Eligibility Rule
- [ ] คิดคะแนนเฉพาะเคส Closed
- [ ] เคส Cancelled ไม่ถูกนำมาคิด SLA รวม
- [ ] เคสที่ยังไม่ Ack แสดง N/A และยังไม่ถูกนำมาคิดคะแนนรวม

## E. Cross-page Consistency
- [ ] ค่า Response SLA บน Incident List ตรงกับ Incident Detail
- [ ] ค่า Resolution SLA บน Incident List ตรงกับ Incident Detail
- [ ] ค่า PASS/FAIL/N/A ตรงกันระหว่าง Incident List และ SLA Report
- [ ] SLA% รวมใน SLA Report ตรงกับผลรวมคะแนนเคสในช่วงวันที่เดียวกัน

## F. Date Filter Validation
- [ ] เมื่อเปลี่ยนช่วงวันที่ จำนวนเคสที่ถูกประเมินเปลี่ยนตามช่วงจริง
- [ ] เคสนอกช่วงวันที่ไม่ถูกนำมาคิดใน SLA% รวม

## Result Summary
- [ ] ผ่านทุกข้อใน checklist นี้
- [ ] พร้อมเริ่ม UAT รอบถัดไปหรือ go-live check

