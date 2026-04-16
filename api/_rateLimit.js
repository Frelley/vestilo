// Simple in-memory per-IP rate limiter.
// Works within a single warm serverless instance — not distributed, but
// effective against casual abuse. Each cold start resets all counters.
const store = new Map()

/**
 * @param {string} ip
 * @param {{ limit?: number, windowMs?: number }} options
 * @returns {{ ok: boolean, retryAfter?: number }}
 */
export function rateLimit(ip, { limit = 30, windowMs = 60_000 } = {}) {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  entry.count++
  if (entry.count > limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  }
  return { ok: true }
}
