-- Add account_type column to user_profiles
-- Stores 'practitioner' or 'center' to distinguish account type at signup
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'practitioner'
CHECK (account_type IN ('practitioner', 'center'));

-- Comment for clarity
COMMENT ON COLUMN user_profiles.account_type IS 'Type of provider account: practitioner or center. Defaults to practitioner for existing users.';
