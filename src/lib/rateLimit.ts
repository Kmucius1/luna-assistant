// Small in-memory sliding-window limiter. It is per server instance, so on
// Vercel it is a best-effort brake against runaway loops and abuse of the paid
// AI/voice routes, not a hard global quota.
const hits = new Map<string, number[]>()

export function rateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)

  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some(t => now - t < windowMs)) hits.delete(k)
    }
  }
  return false
}
