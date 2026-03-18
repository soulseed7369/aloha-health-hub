-- Analytics tracking tables for Premium/Featured tier differentiation

-- Profile/center page views
CREATE TABLE IF NOT EXISTS listing_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  viewed_at   timestamptz NOT NULL DEFAULT now(),
  referrer    text,
  session_hash text
);
CREATE INDEX IF NOT EXISTS idx_listing_views_listing ON listing_views(listing_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_listing_views_date ON listing_views(viewed_at);

-- Search/homepage/similar impressions (Featured-meaningful)
CREATE TABLE IF NOT EXISTS listing_impressions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL,
  listing_type    text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  impression_type text NOT NULL CHECK (impression_type IN ('search', 'homepage', 'similar')),
  impressed_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_listing_impressions_listing ON listing_impressions(listing_id, impressed_at);

-- Contact CTA clicks
CREATE TABLE IF NOT EXISTS contact_clicks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('practitioner', 'center')),
  click_type  text NOT NULL CHECK (click_type IN ('phone', 'email', 'website', 'booking', 'discovery_call')),
  clicked_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_clicks_listing ON contact_clicks(listing_id, clicked_at);

-- Verified badge column on practitioners and centers
ALTER TABLE practitioners ADD COLUMN IF NOT EXISTS verified_at timestamptz;
ALTER TABLE centers ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- RLS policies for analytics tables (allow inserts from anon, reads from authenticated)
ALTER TABLE listing_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert views" ON listing_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert impressions" ON listing_impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert clicks" ON contact_clicks FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated users can read own listing views" ON listing_views
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
      UNION ALL
      SELECT id FROM centers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can read own listing impressions" ON listing_impressions
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
      UNION ALL
      SELECT id FROM centers WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can read own listing clicks" ON contact_clicks
  FOR SELECT USING (
    listing_id IN (
      SELECT id FROM practitioners WHERE owner_id = auth.uid()
      UNION ALL
      SELECT id FROM centers WHERE owner_id = auth.uid()
    )
  );
