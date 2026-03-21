-- Auth phone OTPs — stores hashed 6-digit codes for phone-based sign-in.
-- Used by the auth-phone-otp edge function (Twilio SMS delivery).

CREATE TABLE IF NOT EXISTS auth_phone_otps (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  phone       text        NOT NULL,              -- E.164 format (+1XXXXXXXXXX)
  code_hash   text        NOT NULL,              -- SHA-256 hex of the 6-digit code
  attempts    int         DEFAULT 0,             -- wrong-guess counter (lockout at 5)
  expires_at  timestamptz DEFAULT now() + interval '10 minutes',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_auth_phone_otps_phone ON auth_phone_otps (phone);
CREATE INDEX idx_auth_phone_otps_expires ON auth_phone_otps (expires_at);

-- RLS: only service role can access this table (edge functions use service role key)
ALTER TABLE auth_phone_otps ENABLE ROW LEVEL SECURITY;
-- No policies = no access for anon/authenticated roles. Service role bypasses RLS.

-- Auto-cleanup: delete expired rows (run via pg_cron or on each insert)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_phone_otps()
RETURNS trigger AS $$
BEGIN
  DELETE FROM auth_phone_otps WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_auth_phone_otps
  AFTER INSERT ON auth_phone_otps
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_expired_auth_phone_otps();
