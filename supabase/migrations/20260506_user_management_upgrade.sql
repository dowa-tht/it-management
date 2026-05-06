-- 🛡️ Update user_profiles table for Secure Onboarding & OTP Flow
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_token TEXT,
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_otp_code ON user_profiles(otp_code);
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_token ON user_profiles(onboarding_token);
CREATE INDEX IF NOT EXISTS idx_user_profiles_expires_at ON user_profiles(expires_at);

COMMENT ON COLUMN user_profiles.otp_code IS '6-digit OTP for signature verification';
COMMENT ON COLUMN user_profiles.expires_at IS 'Account expiration date (for Guests)';
