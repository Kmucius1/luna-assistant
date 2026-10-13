// Smoke tests for the access gate. Zero dependencies: runs on Node's built-in
// test runner.
//
//   npm run dev                                   (or point at any deployed URL)
//   LUNA_BASE_URL=http://localhost:3000 npm run test:smoke
//
// Logged-out checks always run. To also check that signed-in requests work,
// export a valid session cookie header from the browser:
//   LUNA_TEST_COOKIE='sb-xxxx-auth-token=...' npm run test:smoke
//
// These only send GET requests (plus unsigned POSTs to the secret-protected
// endpoints), so they are safe to point at production.
import test from 'node:test'
import assert from 'node:assert/strict'

const BASE = (process.env.LUNA_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const COOKIE = process.env.LUNA_TEST_COOKIE || ''

// One entry per room: its page, and the API that feeds it.
const ROOMS = [
  { room: 'Home',        page: '/home',            api: '/api/home/summary' },
  { room: 'Today',       page: '/today',           api: '/api/home/day-plan' },
  { room: 'LUNA chat',   page: '/chat',            api: '/api/chat/history' },
  { room: 'Memory',      page: '/memory',          api: '/api/luna/memory' },
  { room: 'Texts',       page: '/luna/texts',      api: '/api/luna/messages/latest' },
  { room: 'Food',        page: '/food',            api: '/api/food/pantry' },
  { room: 'Style',       page: '/style',           api: '/api/atelier/wardrobe' },
  { room: 'Fitness',     page: '/fitness',         api: '/api/fitness/weight' },
  { room: 'Work',        page: '/work',            api: '/api/work/goals' },
  { room: 'DRYP Hub',    page: '/dryp-hub',        api: '/api/dryp/accounts' },
  { room: 'Money',       page: '/money',           api: '/api/money/summary' },
  { room: 'Money list',  page: '/money/transactions', api: '/api/money/transactions' },
  { room: 'Astrology',   page: '/astrology',       api: '/api/luna/daily-readings' },
  { room: 'Spiritual',   page: '/spirit',          api: '/api/ai/hd-daily' },
  { room: 'Travel',      page: '/travel',          api: '/api/travel/trips' },
  { room: 'Wellness',    page: '/wellness',        api: '/api/check-ins' },
  { room: 'Brain Dump',  page: '/brain-dump',      api: '/api/brain-dump/entries' },
  { room: 'Email',       page: '/email',           api: '/api/gmail/status' },
  { room: 'Journal',     page: '/journal',         api: '/api/journal' },
  { room: '30-day plan', page: '/thirty',          api: '/api/thirty' },
]

const PUBLIC_PAGES = ['/auth/login', '/privacy', '/terms']

async function get(path, { cookie = '' } = {}) {
  return fetch(BASE + path, {
    redirect: 'manual',
    headers: cookie ? { cookie } : {},
  })
}

test('health endpoint is open and ok', async () => {
  const res = await get('/api/health')
  assert.equal(res.status, 200)
})

for (const p of PUBLIC_PAGES) {
  test(`public page ${p} loads without a session`, async () => {
    const res = await get(p)
    assert.equal(res.status, 200)
  })
}

for (const { room, page, api } of ROOMS) {
  test(`${room}: page redirects to login when logged out`, async () => {
    const res = await get(page)
    assert.ok([302, 303, 307, 308].includes(res.status), `expected redirect, got ${res.status}`)
    assert.match(res.headers.get('location') || '', /\/auth\/login/)
  })

  test(`${room}: API ${api} returns 401 when logged out`, async () => {
    const res = await get(api)
    assert.equal(res.status, 401, `${api} answered ${res.status} without a session`)
    const body = await res.text()
    // No data may come back with the rejection.
    assert.ok(body.length < 200, `${api} returned ${body.length} bytes to a logged-out caller`)
  })
}

test('write routes reject logged-out callers', async () => {
  for (const path of ['/api/journal', '/api/check-ins', '/api/tasks/create', '/api/chat/message']) {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    })
    assert.equal(res.status, 401, `POST ${path} answered ${res.status} without a session`)
  }
})

test('cron routes reject a missing or guessed secret', async () => {
  for (const path of ['/api/cron/notifications', '/api/luna/generate-readings', '/api/luna/nightly-memory']) {
    const none = await get(path)
    assert.ok([401, 403].includes(none.status), `${path} answered ${none.status} with no secret`)
    const guessed = await fetch(BASE + path, { headers: { authorization: 'Bearer undefined' } })
    assert.ok([401, 403].includes(guessed.status), `${path} accepted "Bearer undefined"`)
  }
})

test('text webhook rejects an unsigned post', async () => {
  const res = await fetch(BASE + '/api/luna/messages/incoming', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  assert.ok([401, 500].includes(res.status), `answered ${res.status}`)
  assert.notEqual(res.status, 200)
})

// Optional: signed-in checks, only when a cookie is supplied.
for (const { room, page, api } of ROOMS) {
  test(`${room}: signed-in page and API respond`, { skip: !COOKIE }, async () => {
    const pageRes = await get(page, { cookie: COOKIE })
    assert.equal(pageRes.status, 200, `${page} answered ${pageRes.status}`)
    const apiRes = await get(api, { cookie: COOKIE })
    assert.ok(apiRes.status < 500, `${api} answered ${apiRes.status}`)
    assert.notEqual(apiRes.status, 401, `${api} rejected a valid session`)
  })
}
