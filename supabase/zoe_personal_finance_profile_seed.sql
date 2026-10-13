-- Zoe's permanent personal finance profile — a one-time data load into the
-- real Money tables (bills, subscriptions, income_events, budgets), not a
-- schema change. Run once. Nothing here cancels, pauses, or moves any real
-- charge — every "pending cancellation" row is saved with status = 'cancel'
-- (flagged, not done) rather than 'canceled' (actually done), exactly as
-- instructed.
--
-- ZOE_USER_ID matches the constant used throughout the app's admin-client
-- routes (plan-my-day, weekly-reset, etc.) — the single real user this app
-- serves.

-- ── INCOME ───────────────────────────────────────────────────────────────
insert into public.income_events (user_id, source_name, income_type, amount, confirmed, include_in_plan, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Shannon / EHM',            'business_income', 2500.00, true,  true,  '25% of a $10,000/mo agency retainer.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'iVALT + DocuID',           'business_income', 1250.00, true,  true,  '25% of a $5,000/mo agency retainer.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Crafted Kitchen & Bath',   'business_income', 500.00,  true,  true,  'Implies a $2,000/mo agency retainer at the same 25% share.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Emily Harkins',            'unconfirmed_expected_income', 0.00, false, false, 'Monthly amount not yet known. Do not include in totals until confirmed.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Nurturly',                 'unconfirmed_expected_income', 200.00, false, false, 'Agency retainer is $800/mo but PAUSED. Potential share is $200/mo if resumed — do not count while paused.');

-- ── BILLS TO KEEP (real recurring essentials/insurance/fees) ────────────
insert into public.bills (user_id, name, expected_amount, amount_type, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'AT&T',                      328.51, 'variable', 'upcoming', 'personal', 'Estimated amount.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Direct Auto Insurance',     137.75, 'fixed',    'upcoming', 'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Spectrum',                  68.21,  'variable', 'upcoming', 'personal', 'Budgeted at $68.21; recent normal charges have run closer to $40–$46.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Florida Blue (health)',     6.75,   'fixed',    'upcoming', 'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'UnitedHealthcare (dental)', 13.28,  'fixed',    'upcoming', 'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Bank of America fee',       4.95,   'fixed',    'upcoming', 'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Chase fee',                 15.00,  'fixed',    'upcoming', 'personal', null);

-- ── SUBSCRIPTIONS TO KEEP ────────────────────────────────────────────────
insert into public.subscriptions (user_id, merchant_normalized, display_name, expected_amount, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'netflix',        'Netflix',                 22.62, 'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'spotify',        'Spotify',                 14.70, 'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'crunch_fitness', 'Crunch Fitness',          34.51, 'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'chatgpt',        'ChatGPT (base)',          20.00, 'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'vercel',         'Vercel',                  50.00, 'keep',   'personal', 'Should eventually move to the business card — not moved yet, do not move now.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'amazon_prime',   'Amazon Prime',            7.58,  'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'amazon_digital', 'Amazon Digital',          11.30, 'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'acorns',         'Acorns',                  3.00,  'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'apple_digital',  'Apple Digital',           9.99,  'keep',   'personal', null),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'apple_app_store','Apple/App Store (broader est.)', 32.65, 'review', 'personal', 'Rolled-up estimate of broader Apple/app spending beyond the base Apple Digital charge — worth reviewing for what it actually comprises.');

-- ── PENDING CANCELLATION — flagged only, NOT canceled ───────────────────
insert into public.subscriptions (user_id, merchant_normalized, display_name, expected_amount, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'google_workspace',    'Google Workspace',    16.80, 'cancel', 'personal', 'PENDING — not confirmed canceled. Correct Workspace account must be verified; it is NOT info@drypdigital.com.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'south_beach_tanning', 'South Beach Tanning', 32.99, 'cancel', 'personal', 'PENDING — not confirmed canceled.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'opusclip',            'OpusClip',            15.00, 'cancel', 'personal', 'PENDING — not confirmed canceled.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'hulu',                'Hulu',                22.62, 'cancel', 'personal', 'PENDING — not confirmed canceled.');

-- ── ALREADY CANCELED / EXCLUDED ──────────────────────────────────────────
insert into public.subscriptions (user_id, merchant_normalized, display_name, expected_amount, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'read_ai',      'Read AI',       19.75, 'canceled', 'personal', 'Canceled.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'siteseeker_pro','SiteSeeker Pro', 29.00, 'canceled', 'personal', 'Canceled.');

insert into public.bills (user_id, name, expected_amount, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'GEICO',            142.75, 'canceled', 'personal', 'Not current.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'National General',  null,  'canceled', 'personal', 'Not current.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Dairyland',          null, 'canceled', 'personal', 'Not current.');

-- ── UNKNOWN / POTENTIAL / UNRESOLVED — excluded from base totals ────────
insert into public.bills (user_id, name, expected_amount, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Duke Energy', null, 'needs_review', 'personal', 'Amount unknown — missing from totals. True monthly remainder = $3,241.63 minus this bill once known.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'Unidentified recurring bills (rent, water, medical plans, card minimums, loans)', null, 'needs_review', 'personal', 'Not yet found in statements — search for and add once identified.');

insert into public.subscriptions (user_id, merchant_normalized, display_name, expected_amount, status, ownership_type, notes) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'autods',        'AutoDS',                    93.60, 'unknown', 'personal', 'Potential/unconfirmed — up to $93.60. Not included in base total.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'canva',         'Canva',                     15.00, 'unknown', 'personal', 'Potential/unconfirmed. Not included in base total.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'edreams_prime', 'eDreams Prime',             9.99,  'unknown', 'personal', 'Potential/unconfirmed. Not included in base total.'),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'openai_api',    'OpenAI API (extra usage)',  null,  'unknown', 'personal', 'Extra usage-based charges beyond the ChatGPT base subscription — amount not yet quantified.');

-- ── VARIABLE SPENDING AVERAGES ───────────────────────────────────────────
insert into public.budgets (user_id, category, period_type, target_amount) values
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'groceries', 'monthly', 136.43),
  ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 'gas',       'monthly', 91.14)
on conflict (user_id, category, period_type) do update set target_amount = excluded.target_amount, updated_at = now();

insert into public.money_preferences (user_id, weekly_grocery_target, weekly_gas_target)
values ('5fe7c8b7-cc2c-475c-a126-5bf1e73f6dbb', 31.50, 21.04)
on conflict (user_id) do update set
  weekly_grocery_target = excluded.weekly_grocery_target,
  weekly_gas_target = excluded.weekly_gas_target,
  updated_at = now();
