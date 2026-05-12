-- 🛠️ Migration: Add assigned_to_id to incidents table
-- Date: 10-May-2026
-- Description: Adds a UUID reference to user_profiles for better tracking of assigned IT staff.

ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS assigned_to_id UUID REFERENCES public.user_profiles(id);

-- Add comment for documentation
COMMENT ON COLUMN public.incidents.assigned_to_id IS 'UUID of the IT staff assigned to this case, linked to user_profiles';

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to_id ON public.incidents(assigned_to_id);
