-- 🛡️ [MIGRATION] ปรับปรุงชื่อ Role ในระบบสิทธิ์และ Workflow ให้ตรงกับมาตรฐานใหม่
-- รันคำสั่งนี้ใน Supabase SQL Editor

-- 1. อัปเดตตาราง permission_sets (เพื่อให้ Sidebar แสดงผลถูกต้อง)
UPDATE public.permission_sets SET role_name = 'admin'    WHERE role_name IN ('administrator', 'superuser');
UPDATE public.permission_sets SET role_name = 'it_staff' WHERE role_name IN ('supervisor', 'it_member');
UPDATE public.permission_sets SET role_name = 'employee' WHERE role_name IN ('member', 'user');
UPDATE public.permission_sets SET role_name = 'auditor'  WHERE role_name IN ('guest', 'visitor');
UPDATE public.permission_sets SET role_name = 'approver' WHERE role_name = 'approval';

-- 2. อัปเดตตาราง workflow_configs (เพื่อให้การสร้าง Step ใหม่ใช้ Role ถูกต้อง)
UPDATE public.workflow_configs SET role_required = 'admin'    WHERE role_required IN ('administrator', 'superuser');
UPDATE public.workflow_configs SET role_required = 'it_staff' WHERE role_required IN ('supervisor', 'it_member');
UPDATE public.workflow_configs SET role_required = 'employee' WHERE role_required IN ('member', 'user');
UPDATE public.workflow_configs SET role_required = 'auditor'  WHERE role_required IN ('guest', 'visitor');
UPDATE public.workflow_configs SET role_required = 'approver' WHERE role_required = 'approval';

-- 3. อัปเดตตาราง document_approvals (สำหรับเอกสารที่อยู่ระหว่างดำเนินการ)
UPDATE public.document_approvals SET role_required = 'admin'    WHERE role_required IN ('administrator', 'superuser');
UPDATE public.document_approvals SET role_required = 'it_staff' WHERE role_required IN ('supervisor', 'it_member');
UPDATE public.document_approvals SET role_required = 'employee' WHERE role_required IN ('member', 'user');
UPDATE public.document_approvals SET role_required = 'auditor'  WHERE role_required IN ('guest', 'visitor');
UPDATE public.document_approvals SET role_required = 'approver' WHERE role_required = 'approval';
