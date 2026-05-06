-- 👥 Add 'member' role to constraints
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role IN ('administrator', 'supervisor', 'approval', 'guest', 'member'));

ALTER TABLE public.user_registry DROP CONSTRAINT IF EXISTS user_registry_user_role_check;
ALTER TABLE public.user_registry ADD CONSTRAINT user_registry_user_role_check CHECK (user_role IN ('administrator', 'supervisor', 'approval', 'guest', 'member'));

-- Update existing 'user' roles to 'member' if any
UPDATE public.user_profiles SET role = 'member' WHERE role = 'user';
UPDATE public.user_registry SET user_role = 'member' WHERE user_role = 'user';
