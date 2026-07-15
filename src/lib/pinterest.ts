const IMAGE_EXT_RE = /\.(jpg|jpeg|png|webp|gif)(\?|$)/i
const PIN_SHARE_RE = /pin\.it\/|pinterest\.[a-z.]+\/pin\//i

function extractOgImage(html: string): string | null {
  const metaTags = html.match(/<meta[^>]+>/g) ?? []
  for (const tag of metaTags) {
    if (/property="og:image"|name="og:image"/.test(tag)) {
      const m = tag.match(/content="([^"]+)"/)
      if (m) return m[1]
    }
  }
  return null
}

/**
 * Pinterest's own "Share" button gives users a pin.it/... short link or a
 * pinterest.com/pin/... page URL — neither is a direct image file, so an
 * <img> tag can't render it. Resolve those to the real i.pinimg.com image
 * via the page's og:image meta tag. Already-direct image URLs (or anything
 * that isn't a recognizable Pinterest link) pass through unchanged.
 */
export async function resolvePinterestImageUrl(url: string): Promise<string> {
  if (IMAGE_EXT_RE.test(url)) return url
  if (!PIN_SHARE_RE.test(url)) return url

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36' },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return url
    const html = await res.text()
    const image = extractOgImage(html)
    return image ?? url
  } catch {
    return url
  }
}
