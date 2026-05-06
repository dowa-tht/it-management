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
-- Administrator (RW All)
('administrator', 'dashboard', 'RW'),
('administrator', 'incidents', 'RW'),
('administrator', 'reports', 'RW'),
('administrator', 'backup', 'RW'),
('administrator', 'checklist', 'RW'),
('administrator', 'settings', 'RW'),

-- Supervisor (RW Ops, RO Settings)
('supervisor', 'dashboard', 'RW'),
('supervisor', 'incidents', 'RW'),
('supervisor', 'reports', 'RW'),
('supervisor', 'backup', 'RW'),
('supervisor', 'checklist', 'RW'),
('supervisor', 'settings', 'NONE'),

-- Approval (Same as Supervisor)
('approval', 'dashboard', 'RW'),
('approval', 'incidents', 'RW'),
('approval', 'reports', 'RW'),
('approval', 'backup', 'RW'),
('approval', 'checklist', 'RW'),
('approval', 'settings', 'NONE'),

-- Member (Global Dashboard, Own Incidents)
('member', 'dashboard', 'RO'),
('member', 'incidents', 'RW'),
('member', 'reports', 'NONE'),
('member', 'backup', 'NONE'),
('member', 'checklist', 'NONE'),
('member', 'settings', 'NONE'),

-- Guest (Read Only All)
('guest', 'dashboard', 'RO'),
('guest', 'incidents', 'RO'),
('guest', 'reports', 'RO'),
('guest', 'backup', 'RO'),
('guest', 'checklist', 'RO'),
('guest', 'settings', 'RO')
ON CONFLICT (role_name, feature_key) DO UPDATE SET access_level = EXCLUDED.access_level;
