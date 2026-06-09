# Implementation Plan: Production Security Hardening Backlog

เอกสารนี้สรุป `security hardening backlog` ที่ยังเหลือหลังจากปิด blocker เรื่อง RLS บน `approval_substitutes`, `working_hours`, `sla_exclusions`, และ `sla_holidays` แล้ว

จุดประสงค์ของเอกสารนี้คือแยกงาน `first production re-baseline migration` ออกจากงาน hardening ระยะถัดไป เพื่อไม่ให้ขยาย scope ของ release แรกเกินจำเป็น

---

## 1. Scope Boundary

### Not in first production re-baseline cut
- function hardening
- grant / execute hardening
- auth password security tuning
- broad RLS refactor ของ tables ที่ไม่ได้อยู่ใน first-migration blocker

### Can be planned immediately after first production baseline
- `user_whitelist` RLS policy completion
- `SECURITY DEFINER` function execute restrictions
- `search_path` hardening
- permissive policy review สำหรับ audit/log tables
- leaked password protection enablement

---

## 2. Evidence Snapshot (09-Jun-2026)

อ้างอิงจาก `dev Supabase` security advisors หลัง USER apply manual RLS migration แล้ว:

### Resolved
- `approval_substitutes` RLS disabled: resolved
- `working_hours` RLS disabled: resolved
- `sla_exclusions` RLS disabled: resolved
- `sla_holidays` RLS disabled: resolved

### Remaining security advisories
1. `public.user_whitelist` — `rls_enabled_no_policy`
2. หลาย functions — `function_search_path_mutable`
3. หลาย `SECURITY DEFINER` functions — executable by `anon`
4. หลาย `SECURITY DEFINER` functions — executable by `authenticated`
5. `admin_audit_logs`, `backup_logs`, `system_audit_logs` — permissive policy warnings
6. Supabase Auth — `auth_leaked_password_protection`

---

## 3. Prioritized Backlog

| Priority | Area | Status | Why |
|---|---|---|---|
| `P1` | `user_whitelist` RLS policy | pending | อยู่ใน selected-user migration scope โดยตรง |
| `P1` | `SECURITY DEFINER` execute review | pending | ลด attack surface ของ exposed RPC endpoints |
| `P1` | function `search_path` hardening | pending | เป็น hardening ที่ควรทำคู่กับ function review |
| `P2` | audit/log permissive policy review | pending | สำคัญ แต่ไม่อยู่ใน first baseline seed scope |
| `P2` | leaked password protection | pending | เพิ่ม auth security โดยไม่กระทบ schema migration หลัก |
| `P3` | broader performance/RLS cleanup | deferred | แยกไปหลัง production baseline เสถียรแล้ว |

---

## 4. Detailed Work Items

## A. `user_whitelist` policy completion

### Current issue
- table เปิด RLS แล้วแต่ยังไม่มี policy

### Risk
- พฤติกรรมขึ้นกับ grants/runtime path มากเกินไป
- เป็น table ที่อยู่ใน selected-user migration รอบแรก จึงควรทำให้ contract ชัด

### Target contract
- `admin` จัดการได้ทั้งหมด
- ผู้ใช้ทั่วไปไม่ควรอ่าน hash ของคนอื่น
- ถ้าระบบไม่ต้อง query จาก client ให้พิจารณา `admin/service-role only`

### Recommended timing
- หลัง first production baseline ผ่าน
- ทำเป็น migration แยก 1 ไฟล์พร้อม verification query

---

## B. `SECURITY DEFINER` function execute review

### Functions flagged in advisor snapshot
- `cleanup_expired_incident_followup_tokens`
- `cleanup_expired_otps`
- `current_user_can_access_checklist_doc`
- `current_user_can_access_incident`
- `current_user_can_edit_incident`
- `current_user_can_read_checklist_doc`
- `current_user_can_read_incident`
- `current_user_has_feature_access`
- `current_user_is_admin`
- `current_user_role`
- `get_template_procedure_plans`
- `handle_approval_step`
- `handle_new_user`

### Review questions
1. function นี้จำเป็นต้องเรียกผ่าน public RPC หรือไม่
2. ต้องเปิดให้ `anon` จริงหรือไม่
3. ต้องเปิดให้ `authenticated` ตรงๆ หรือควรเรียกเฉพาะผ่าน server-side key
4. สามารถเปลี่ยนเป็น `SECURITY INVOKER` ได้หรือไม่
5. ถ้ายังต้องเป็น `SECURITY DEFINER` ควร revoke `EXECUTE` จาก role ใดบ้าง

### Recommended output
- hardening migration สำหรับ `REVOKE EXECUTE`
- function-by-function decision register

---

## C. Function `search_path` hardening

### Current issue
- functions บางตัวไม่มี fixed `search_path`

### Risk
- เพิ่มความเสี่ยงจาก schema resolution ที่ไม่ชัด

### Target contract
- functions ที่คงไว้เป็น `SECURITY DEFINER` ต้อง set `search_path` ให้ชัด
- ใช้ schema-qualified object references ให้มากที่สุด

### Recommended timing
- ทำพร้อมกับ function execute review ในชุด hardening เดียวกัน

---

## D. Audit / Logs permissive policy review

### Tables flagged
- `admin_audit_logs`
- `backup_logs`
- `system_audit_logs`

### Why not in first cut
- USER ต้องการให้ production clean ไม่มี historical logs จาก dev
- ตารางกลุ่มนี้ไม่ใช่ blocker สำหรับ baseline bootstrap รอบแรก

### Recommended outcome
- ออกแบบ policy ใหม่ให้สะท้อน actor จริง:
  - service role insert
  - admin read
  - จำกัด delete/update เท่าที่จำเป็น

---

## E. Leaked password protection

### Current issue
- Supabase Auth ยังปิด leaked password protection

### Recommended timing
- เปิดหลัง baseline release หรือก่อน production go-live ถ้าตรวจผลกระทบกับ onboarding แล้ว

### Note
- เป็น configuration hardening มากกว่า schema migration

---

## 5. Execution Order After First Baseline Release

1. ปิด `user_whitelist` policy contract
2. ตรวจ function inventory และแยก:
   - keep public
   - authenticated only
   - server-side only
3. ออก hardening migration สำหรับ:
   - `REVOKE EXECUTE`
   - fixed `search_path`
   - optional `SECURITY INVOKER`
4. ปรับ audit/log policies
5. เปิด leaked password protection
6. rerun security advisor scan

---

## 6. Deliverables to Create Later

- `supabase/migrations/<timestamp>_user_whitelist_policy_contract.sql`
- `supabase/migrations/<timestamp>_function_execute_hardening.sql`
- `supabase/migrations/<timestamp>_function_search_path_hardening.sql`
- hardening audit report รอบหลัง apply

---

## 7. Decision

สำหรับรอบ `first production re-baseline migration`:
- ให้ `ship baseline first`
- แล้วค่อยทำ security hardening backlog เป็น release ถัดไปแบบควบคุม scope

เหตุผล:
- blocker ด้าน schema และ selected-user migration ปิดแล้ว
- advisory ที่เหลือยังสำคัญ แต่ไม่จำเป็นต้องผูกเข้ากับการ reset-and-baseline รอบแรกทั้งหมด

---

## Related Documents

- [AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md](/C:/Users/Lenovo/dowa-it-system/docs/history/AUDIT_PRODUCTION_REBASELINE_SCHEMA_VERIFICATION_2026_06_08.md:1)
- [PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_RLS_REMEDIATION_PLAN.md:1)
- [PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md](/C:/Users/Lenovo/dowa-it-system/docs/manuals/PRODUCTION_REBASELINE_PRODUCTION_APPLY_ORDER.md:1)
