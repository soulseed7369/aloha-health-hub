-- Track contact info reveals for analytics + rate limiting
CREATE TABLE contact_reveals (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id  uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  reveal_type text NOT NULL CHECK (reveal_type IN ('phone', 'email')),
  ip_hash     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_reveals_listing ON contact_reveals (listing_id);
CREATE INDEX idx_reveals_rate ON contact_reveals (ip_hash, created_at);

-- Enable RLS
ALTER TABLE contact_reveals ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (Edge Function uses service role)
CREATE POLICY "service_insert" ON contact_reveals
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
