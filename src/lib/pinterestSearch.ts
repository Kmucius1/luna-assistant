// Live Pinterest search — no API key, no login. Uses the same internal
// resource endpoint Pinterest's own web app calls for search results.
// UNOFFICIAL: this is not Pinterest's public API. It could change or stop
// working without notice, and automated use like this is generally outside
// most platforms' terms of service. Zoe explicitly asked for this despite
// that risk (2026-07-18) — always paired with an AI-generation fallback so
// a Pinterest outage never leaves the Style pool empty.

export interface PinterestResult { image_url: string; label: string }

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

export async function searchPinterestImages(query: string, limit = 6): Promise<PinterestResult[]> {
  try {
    const sourceUrl = `/search/pins/?q=${encodeURIComponent(query)}`
    const data = { options: { query, scope: 'pins' }, context: {} }
    const url = `https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${encodeURIComponent(JSON.stringify(data))}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'X-Pinterest-PWS-Handler': 'www/search/[scope].js',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []

    const json = await res.json()
    const results = json?.resource_response?.data?.results
    if (!Array.isArray(results)) return []

    return results
      .map((r: { images?: { orig?: { url?: string } } }) => r.images?.orig?.url)
      .filter((url: string | undefined): url is string => !!url && url.includes('i.pinimg.com'))
      .slice(0, limit)
      .map((image_url: string) => ({ image_url, label: query }))
  } catch (err) {
    console.error('[pinterestSearch] failed:', err instanceof Error ? err.message : err)
    return []
  }
}
