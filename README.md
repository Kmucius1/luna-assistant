# LUNA Assistant

A personal life-organizing app: a 12-room home grid (Today, Food, Style, Fitness, Work,
Create, Wellness, Astrology, Money, Brain Dump, Travel, Spiritual) plus a LUNA chat and
voice companion that plans the day from your real calendar, mail, tasks and finances.

Live at https://www.mylunaguide.online. Single-owner app: one signed-in account.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Supabase (Postgres + auth) · Groq for text AI ·
ElevenLabs for voice · Plaid for banking · Gmail + iCal · Web Push · Vercel (3 cron jobs).

> This is a newer Next.js than most documentation covers. Read the relevant guide in
> `node_modules/next/dist/docs/` before changing framework-level code.

## Run it

```bash
npm install
# create .env.local with the variables below
npm run dev                        # http://localhost:3000
npm run lint
npx tsc --noEmit
npm run test:smoke                 # see Tests
```

## Environment variables

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database and auth |
| `LUNA_OWNER_USER_ID` | Supabase user id of the owner (falls back to the built-in id) |
| `LUNA_ALLOWED_USER_IDS` | Optional comma-separated extra ids allowed to sign in |
| `GROQ_API_KEY`, `AI_MODEL`, `AI_FALLBACK_MODEL` | Text AI |
| `ELEVENLABS_API_KEY` | Voice |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GMAIL_REDIRECT_URI` | Gmail |
| `CALENDAR_ICAL_URL_1..3` | Calendar feeds |
| `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_SANDBOX_SECRET`, `PLAID_TOKEN_ENCRYPTION_KEY` | Banking |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Push notifications |
| `DRYP_SUPABASE_URL`, `DRYP_SUPABASE_SERVICE_KEY` | DRYP Hub (second Supabase project) |
| `CRON_SECRET` | Authorizes Vercel Cron calls. **Required in production.** |
| `LUNA_INCOMING_SECRET` | Signs the iPhone text-message Shortcut webhook |
| `HIGGSFIELD_API_KEY` | Daily art |
| `NEXT_PUBLIC_APP_URL` | Absolute URLs |

## Access model

Every page and API route requires a signed-in session whose user id is on the allow list.
That rule lives in one place, `src/lib/supabase/proxy-utils.ts` (wired up by `src/proxy.ts`).

- Not signed in: pages redirect to `/auth/login`, API routes return `401`.
- Signed in as someone else: `403`. Anyone can create a Supabase account from the login form,
  so being signed in is not enough.
- If the Supabase config is missing in production, the app returns `503` instead of opening up.
- Open on purpose: `/auth/*`, `/privacy`, `/terms`, `/api/health`, `/api/gmail/callback`.
- Machine endpoints that carry their own secret: `/api/cron/*`, `/api/luna/generate-readings`,
  `/api/luna/nightly-memory` (`CRON_SECRET`) and `/api/luna/messages/incoming` (`LUNA_INCOMING_SECRET`).
- AI, voice and image routes are limited to 40 requests per minute per user (best effort, per instance).

Route handlers use the service-role Supabase client, which bypasses row level security, and scope
queries with `OWNER_USER_ID` from `src/lib/owner.ts`. New routes must sit behind the gate above;
do not add an `/api/...` path to the public lists without a reason.

## Layout

- `src/app` pages and `src/app/api` routes (175)
- `src/components` UI by room, `src/components/luna` shared shell and dock
- `src/lib` AI, astrology, money, Gmail, planning and push logic
- `supabase/` SQL files. `supabase/TABLES.md` lists what is used and what is a cleanup candidate.
- `docs/LUNA_DESIGN_BIBLE.md` is the locked design system. `docs/LUNA_V2_ARCHITECTURE.md` is a proposal only.

## Tests

`tests/smoke.test.mjs` uses Node's built-in runner. It checks that every room's page and main API
reject a logged-out visitor, that cron and webhook endpoints reject missing or guessed secrets, and
(with `LUNA_TEST_COOKIE` set) that a signed-in session works.

```bash
LUNA_BASE_URL=http://localhost:3000 npm run test:smoke
```

## Deploying

Do not push or deploy without checking with Zoe first. The `luna-assistant` GitHub and Vercel
accounts are set by her account policy, not by this repo.
