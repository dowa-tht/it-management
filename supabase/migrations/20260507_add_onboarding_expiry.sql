-- 🛡️ Add Onboarding Token Expiry to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS onboarding_token_expires TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN user_profiles.onboarding_token_expires IS 'Expiration date for onboarding token (security standard)';
