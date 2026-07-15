const BASE_URL = 'https://api.higgsfield.ai/v1'

function auth() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.HIGGSFIELD_API_KEY}`,
  }
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function safeText(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    const j = JSON.parse(text)
    return j.message ?? j.error ?? j.detail ?? text.slice(0, 300)
  } catch {
    return text.slice(0, 300) || `HTTP ${res.status}`
  }
}

function extractUrl(job: Record<string, unknown>): string | null {
  const results = job.results as Record<string, unknown> | undefined
  const candidates = [
    job.url, job.image_url,
    results?.rawUrl, results?.url,
    (job.output as Record<string, unknown> | undefined)?.url,
  ]
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c
  }
  return null
}

async function pollJobUrl(jobId: string, timeoutMs = 45_000): Promise<string> {
  const deadline = Date.now() + timeoutMs
  let waitMs = 3_000
  while (Date.now() < deadline) {
    await delay(waitMs)
    const res = await fetch(`${BASE_URL}/jobs/${jobId}`, { headers: auth(), signal: AbortSignal.timeout(10_000) })
    if (!res.ok) throw new Error(`Higgsfield job poll failed (${res.status}): ${await safeText(res)}`)
    const job = await res.json() as Record<string, unknown>
    const status = String(job.status ?? '').toLowerCase()
    if (['completed', 'done', 'succeeded', 'success', 'ready'].includes(status)) {
      const url = extractUrl(job)
      if (url) return url
      throw new Error('Higgsfield job completed but no output URL found')
    }
    if (['failed', 'error', 'cancelled', 'canceled', 'rejected'].includes(status)) {
      throw new Error(`Higgsfield job failed: ${job.error ?? job.message ?? 'unknown reason'}`)
    }
    waitMs = Math.min(waitMs * 1.4, 10_000)
  }
  throw new Error(`Higgsfield generation timed out after ${Math.round(timeoutMs / 1000)}s`)
}

/** Generate one image and return its URL. Throws if HIGGSFIELD_API_KEY is unset or the call fails. */
export async function generateFashionImage(prompt: string): Promise<string> {
  if (!process.env.HIGGSFIELD_API_KEY) {
    throw new Error('HIGGSFIELD_API_KEY not configured')
  }
  const res = await fetch(`${BASE_URL}/images/generate`, {
    method: 'POST',
    headers: auth(),
    body: JSON.stringify({ prompt, model: 'soul_2', aspect_ratio: '3:4' }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Higgsfield image generation failed (${res.status}): ${await safeText(res)}`)

  const data = await res.json() as Record<string, unknown>
  const direct = extractUrl(data)
  if (direct) return direct

  const jobId = String(data.job_id ?? data.id ?? '')
  if (!jobId) throw new Error('Higgsfield image response contained neither a job_id nor a URL')
  return pollJobUrl(jobId)
}
