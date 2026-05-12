# Quality Assurance (QA)

> **Note:** นี่คือ template มาตรฐาน ให้ปรับรายละเอียดตาม project ที่นำไปใช้

---

## Role Overview
QA team รับผิดชอบการตรวจสอบคุณภาพของระบบในทุกมิติ ตั้งแต่การวางแผน test จนถึงการรายงานผลและติดตามการแก้ไข bug

---

## Key Responsibilities
- วิเคราะห์ requirement เพื่อออกแบบ Test Case
- ทดสอบระบบทั้ง Functional และ Non-Functional
- รายงานและติดตาม bug จนกว่าจะปิด
- ทำ Regression Test หลังมีการแก้ไขระบบ
- สนับสนุน UAT ร่วมกับ BA และลูกค้า

---

## Key Deliverables
- Test Plan
- Test Case / Test Script
- Bug Report
- Test Summary Report
- UAT Sign-off Document

---

## Tools & Standards
- **Test Management:** TestRail, Zephyr, Xray
- **Bug Tracking:** Jira, Redmine, GitHub Issues
- **Automation:** Selenium, Cypress, Playwright, Appium
- **API Testing:** Postman, REST Assured
- **Performance:** JMeter, k6, Locust
- **Standard:** ISTQB, IEEE 829

---

## Test Types Coverage
- Functional Testing
- Regression Testing
- Integration Testing
- Performance / Load Testing
- Security Testing (Basic)
- UAT (User Acceptance Testing)

---

## Project-Specific Details
> *(กรอกเมื่อนำไปใช้กับ project จริง)*

| Item | Detail |
|------|--------|
| Project Name | DOWA IT System (ระบบจัดการงานไอที Dowa) |
| Test Environment | SIT / UAT / PROD (Supabase Environments) |
| Automation Scope | - Workflow Step Verification (document_approvals)<br>- SLA Business Minutes Accuracy (slaUtils.js)<br>- Security: Server-side PIN Validation Bypass Check |
| Performance Criteria | - Dashboard Table Load < 2s<br>- Image Size < 150kb (Checklist Evidence)<br>- Responsive Check (iOS/Android/Desktop) |
| Go-Live Criteria | - Zero P1/P2 Bugs<br>- Audit Logs stamp (Verified by PIN) accurately<br>- Data Sync (Incident -> Checklist) verified 100% |
