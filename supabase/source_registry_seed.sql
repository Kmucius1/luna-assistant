-- ============================================================
-- source_registry seed data — Phase 1
-- Run AFTER luna_astrology_readings_schema.sql
-- Safe to re-run: upserts by unique `name`.
-- ============================================================

insert into public.source_registry (name, category, url, use_case, trust_level, notes, last_verified_at)
values
  ('astronomy-engine', 'astronomy', 'https://github.com/cosinekitty/astronomy',
   'Real-time planet/Moon ecliptic longitude, retrograde detection, eclipse search — VSOP87/ELP2000-based ephemeris math powering every calculated (non-symbolic) fact in Luna''s astrology system.',
   'primary', 'The single source of astronomical truth for this app. Everything under "cosmic_weather" in a daily reading is computed from this, not looked up or scraped.', now()),

  ('Astro.com', 'western_astrology', 'https://www.astro.com',
   'Reference for chart-calculation conventions and interpretation depth/structure.', 'reference',
   'Used as a quality bar for interpretation style. Never scraped; all reading text is generated fresh from our own calculated data.', now()),

  ('Astro-Seek', 'western_astrology', 'https://horoscopes.astro-seek.com',
   'Reference for transit/aspect interpretation phrasing conventions.', 'reference',
   'Inspiration only — not queried programmatically.', now()),

  ('Cafe Astrology', 'western_astrology', 'https://cafeastrology.com',
   'Reference for daily-horoscope tone and sign/aspect meaning structure.', 'reference',
   'Inspiration only — not queried programmatically.', now()),

  ('CHANI', 'western_astrology', 'https://chani.com',
   'Reference for a modern, psychologically-aware, non-deterministic astrology voice.', 'reference',
   'Voice/tone inspiration for Luna''s hedged, non-fatalistic language.', now()),

  ('Astrology King', 'western_astrology', 'https://astrologyking.com',
   'Reference for retrograde and eclipse-cycle interpretation framing.', 'reference',
   'Inspiration only — not queried programmatically.', now()),

  ('The Astrology Podcast', 'western_astrology', 'https://theastrologypodcast.com',
   'Reference for traditional/technical astrology framing and terminology precision.', 'secondary',
   'Long-form reference for getting technical concepts (aspects, houses) right when Luna does explain jargon.', now()),

  ('World Numerology', 'numerology', 'https://www.worldnumerology.com',
   'Reference for Life Path / Personal Day-Month-Year formula conventions.', 'reference',
   'Formula cross-check only; all numerology in this app is computed in src/lib/numerology.ts, not fetched.', now()),

  ('Numerology.com', 'numerology', 'https://www.numerology.com',
   'Reference for numerology meaning-dictionary tone.', 'reference', 'Inspiration only.', now()),

  ('Cafe Astrology Numerology', 'numerology', 'https://cafeastrology.com/numerology.html',
   'Reference for numerology meaning-dictionary tone.', 'reference', 'Inspiration only.', now()),

  ('Token Rock', 'numerology', 'https://www.tokenrock.com/numerology',
   'Reference for master-number (11/22/33) handling conventions.', 'reference', 'Formula cross-check only.', now()),

  ('Joey Yap', 'chinese_astrology', 'https://www.joeyyap.com',
   'Reference for BaZi / Four Pillars methodology.', 'reference',
   'Phase 3 (full BaZi engine) not yet built. Registered now so Phase 3 has a home for it.', now()),

  ('Master Sean Chan', 'chinese_astrology', 'https://www.masterseanchan.com',
   'Reference for BaZi interpretation style.', 'reference', 'Phase 3 — not yet built.', now()),

  ('Imperial Harvest', 'chinese_astrology', 'https://imperialharvest.com',
   'Reference for BaZi/Chinese metaphysics interpretation style.', 'reference', 'Phase 3 — not yet built.', now()),

  ('Master Tsai', 'chinese_astrology', 'https://www.mastertsai.com',
   'Reference for Chinese astrology interpretation style.', 'reference', 'Phase 3 — not yet built.', now()),

  ('OpenFate', 'chinese_astrology', 'https://www.openfate.co',
   'Reference for BaZi calculation UX conventions.', 'reference', 'Phase 3 — not yet built.', now()),

  ('Barnum/Forer Effect Research', 'psychology_research', 'https://en.wikipedia.org/wiki/Barnum_effect',
   'Explains why vague, universally-true statements feel personally accurate — the core reason Luna avoids deterministic, one-size-fits-all claims and keeps language hedged and specific to real calculated data.',
   'reference', 'Foundational rationale for the non-deterministic-language rule baked into every AI system prompt in this system.', now())

on conflict (name) do update set
  category         = excluded.category,
  url              = excluded.url,
  use_case         = excluded.use_case,
  trust_level      = excluded.trust_level,
  notes            = excluded.notes,
  last_verified_at = excluded.last_verified_at,
  updated_at       = now();
