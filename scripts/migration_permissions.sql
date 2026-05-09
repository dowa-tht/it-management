-- 🛡️ สร้างตาราง Permission Sets สำหรับบริหารจัดการสิทธิ์ผ่าน Web App
CREATE TABLE IF NOT EXISTS public.permission_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    access_level TEXT NOT NULL CHECK (access_level IN ('NONE', 'RO', 'RW')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role_name, feature_key)
);

-- 📝 ลงข้อมูลตั้งต้น (Default Permissions)
INSERT INTO public.permission_sets (role_name, feature_key, access_level) VALUES
-- Admin (RW All)
('admin', 'dashboard', 'RW'),
('admin', 'incidents', 'RW'),
('admin', 'reports', 'RW'),
('admin', 'backup', 'RW'),
('admin', 'checklist', 'RW'),
('admin', 'settings', 'RW'),

-- IT Staff (RW Ops, RO Settings)
('it_staff', 'dashboard', 'RW'),
('it_staff', 'incidents', 'RW'),
('it_staff', 'reports', 'RW'),
('it_staff', 'backup', 'RW'),
('it_staff', 'checklist', 'RW'),
('it_staff', 'settings', 'NONE'),

-- Approver (Same as IT Staff)
('approver', 'dashboard', 'RW'),
('approver', 'incidents', 'RW'),
('approver', 'reports', 'RW'),
('approver', 'backup', 'RW'),
('approver', 'checklist', 'RW'),
('approver', 'settings', 'NONE'),

-- Employee (Global Dashboard, Own Incidents)
('employee', 'dashboard', 'RO'),
('employee', 'incidents', 'RW'),
('employee', 'reports', 'NONE'),
('employee', 'backup', 'NONE'),
('employee', 'checklist', 'NONE'),
('employee', 'settings', 'NONE'),

-- Auditor (Read Only All)
('auditor', 'dashboard', 'RO'),
('auditor', 'incidents', 'RO'),
('auditor', 'reports', 'RO'),
('auditor', 'backup', 'RO'),
('auditor', 'checklist', 'RO'),
('auditor', 'settings', 'RO')
ON CONFLICT (role_name, feature_key) DO UPDATE SET access_level = EXCLUDED.access_level;
