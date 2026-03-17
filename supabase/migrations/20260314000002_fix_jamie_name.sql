-- Fix Jamie Eversweet Belmarez listing
-- Problem: display_name was set to the business name ("Jamie Eversweet Belmarez" or similar
--          business value), so the adapter was showing business name instead of personal name.
-- Fix: Clear display_name, set first_name + last_name so the adapter always uses personal name.
--
-- Run in Supabase SQL editor (Dashboard → SQL editor → New query → Paste → Run)
--
-- STEP 1: Preview — find the row first to confirm we have the right ID
SELECT id, name, display_name, first_name, last_name, business_name
FROM practitioners
WHERE name ILIKE '%jamie%belmarez%'
   OR name ILIKE '%eversweet%'
   OR display_name ILIKE '%jamie%belmarez%'
   OR display_name ILIKE '%eversweet%';

-- STEP 2: Apply the fix (run after confirming the row above is correct)
-- Replace the WHERE clause id if you see the exact UUID from the SELECT above.
UPDATE practitioners
SET
  first_name   = 'Jamie',
  last_name    = 'Belmarez',
  display_name = NULL,       -- clear the stale display_name so adapter falls back to first+last
  business_name = CASE
    WHEN business_name IS NULL OR business_name = ''
    THEN 'Jamie Eversweet Belmarez'  -- preserve business identity if needed
    ELSE business_name
  END
WHERE name ILIKE '%belmarez%'
   OR name ILIKE '%eversweet%'
   OR display_name ILIKE '%belmarez%'
   OR display_name ILIKE '%eversweet%';

-- STEP 3: Verify
SELECT id, name, display_name, first_name, last_name, business_name, status
FROM practitioners
WHERE first_name = 'Jamie' AND last_name = 'Belmarez';
