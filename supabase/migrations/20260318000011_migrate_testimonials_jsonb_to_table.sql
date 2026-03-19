-- Migrate legacy JSONB testimonials into practitioner_testimonials table.
-- Only copies rows that don't already exist (by matching practitioner_id + author + text).
-- Safe to run multiple times (idempotent).

INSERT INTO practitioner_testimonials (practitioner_id, author, text, testimonial_date, status, sort_order)
SELECT
  p.id,
  t.value->>'author',
  t.value->>'text',
  CASE
    WHEN t.value->>'date' IS NOT NULL AND t.value->>'date' != ''
    THEN (t.value->>'date')::date
    ELSE NULL
  END,
  'published',
  t.ordinality
FROM practitioners p,
  jsonb_array_elements(p.testimonials) WITH ORDINALITY AS t(value, ordinality)
WHERE jsonb_array_length(p.testimonials) > 0
  AND NOT EXISTS (
    SELECT 1 FROM practitioner_testimonials pt
    WHERE pt.practitioner_id = p.id
      AND pt.author = t.value->>'author'
      AND pt.text = t.value->>'text'
  );
