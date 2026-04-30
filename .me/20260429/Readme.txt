4️⃣ การไหลของข้อมูล (Flow) – แบบสรุปขั้นตอน
1. ผู้ใช้เปิด Dashboard → ShowDashboard ดึง KPI, SLA gauge, Incident ล่าสุด จาก Service Layer
2. ผู้ใช้คลิกเมนู Master Data → OpenMasterData → แสดงแท็บ Working Hours, Holidays, …
3. ตั้งค่า Working Hours → UI → UI_SaveWorkingHours → Service → Service_SaveWorkingHours → บันทึกลง DB
4. เพิ่ม/แก้/delete Holiday → UI → UI_AddHoliday / UI_EditHoliday / UI_DeleteHoliday → Service → DB
5. Import Holiday CSV → UI → UI_ImportHolidayCSV → ใช้ฟังก์ชัน CSV → UI_AddHoliday ทำซ้ำหลายรายการ
6. แสดง Incident List → ShowIncidentList → ดึงข้อมูลตาม Filter → แสดงตาราง
7. เปิด Incident Detail → OpenIncidentDetail → ดึง Incident + Exclusions + Checklist → แสดง UI
8. แก้ไข Incident → UI_UpdateIncident → Service → Service_SaveIncident → คำนวณ SLA ใหม่ (SLA_CalcDeadline)
9. เพิ่ม Manual Exclusion → UI_AddExclusion → Service → Service_AddExclusion → คำนวณ SLA ใหม่ → UI แสดงผลใหม่
10. Resume SLA → UI_ResumeSLA → Service → Service_ResumeSLA → คำนวณ SLA ใหม่ → UI refresh
11. ทำ Checklist → ShowChecklist → ดึงรายการ → UI แสดง → UI_UpdateChecklistItem → Service → บันทึก → KPI อัปเดตอัตโนมัติ
12. Dashboard Refresh → ทุกครั้งที่ Incident/Checklist เปลี่ยน → Service → GetStatCards, GetSLAComplianceInfo → UI แสดงผลใหม่
13. Notification (ถ้ามี) → Scheduler (Service_CheckSLAThreshold) ตรวจสอบทุก 5 นาที → ส่ง Alert ไป UI (toast)