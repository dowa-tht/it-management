-- 🛡️ Add Password Recovery and PIN Reset columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS recovery_otp TEXT,
ADD COLUMN IF NOT EXISTS recovery_otp_expires TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pin_reset_token TEXT,
ADD COLUMN IF NOT EXISTS pin_reset_expires TIMESTAMP WITH TIME ZONE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_recovery_otp ON user_profiles(recovery_otp);
CREATE INDEX IF NOT EXISTS idx_user_profiles_pin_reset_token ON user_profiles(pin_reset_token);

COMMENT ON COLUMN user_profiles.recovery_otp IS '6-digit OTP for password recovery';
COMMENT ON COLUMN user_profiles.pin_reset_token IS 'Token for security PIN reset flow';
