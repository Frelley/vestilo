import { CANONICAL_TAGS, extractTagsFromQuery, toCanonicalTags, getExcludeTags } from './tags.js'
import { rateLimit } from './_rateLimit.js'

export const maxDuration = 15

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter })

  const { query } = req.body
  if (!query?.trim()) return res.status(400).json({ error: 'Missing query' })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!anthropicKey || !supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  try {
    // ── Step 1: try pure-JS tag extraction (free, instant, deterministic) ──
    let tags = extractTagsFromQuery(query)

    // ── Step 2: if too few matches, fall back to Claude Haiku ───────────────
    if (tags.length < 3) {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          messages: [{
            role: 'user',
            content: `Eres un asistente de búsqueda de ropa. El usuario busca: "${query}"
De esta lista de tags, selecciona entre 3 y 5 tags MÁS ESPECÍFICOS Y REPRESENTATIVOS que describan la búsqueda. Interpreta la intención: "sin diseño" = liso, "para salir" = noche/fiesta, "abrigada" = invierno. Prioriza tags que diferencian la búsqueda (ej: liso, estampado, oversize, vintage). Evita tags genéricos que casi toda prenda tiene (ej: casual, manga-corta, cuello-redondo).
Tags disponibles: ${CANONICAL_TAGS.join(', ')}
Responde SOLO con JSON válido:
{"tags": ["tag1", "tag2", "tag3"]}`,
          }],
        }),
      })

      const claudeData = await claudeRes.json()
      if (claudeRes.ok) {
        const text = claudeData.content?.[0]?.text
        let haikuTags = []
        try {
          haikuTags = JSON.parse(text).tags
        } catch {
          const match = text?.match(/\{[\s\S]*\}/)
          if (match) try { haikuTags = JSON.parse(match[0]).tags } catch {}
        }
        if (haikuTags?.length) {
          // No semantic expansion — Haiku already understands context
          tags = toCanonicalTags(haikuTags)
        }
      }
    }

    if (!tags?.length) return res.status(200).json({ tags: [], ids: [] })

    // ── Step 3: compute antonym exclusions ──────────────────────────────────
    const excludeTags = getExcludeTags(tags)
    const exclParam = excludeTags.length > 0
      ? encodeURIComponent(`{${excludeTags.map(t => `"${t}"`).join(',')}}`)
      : null

    // ── Step 4: parallel — scored results + exclusion IDs ───────────────────
    const [rpcRes, exclRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/rpc/search_products_scored`, {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ search_tags: tags }),
      }),
      exclParam
        ? fetch(`${supabaseUrl}/rest/v1/products?select=id&status=eq.Disponible&ai_tags=ov.${exclParam}`, {
            headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
          })
        : Promise.resolve(null),
    ])

    const rows = await rpcRes.json()
    const exclRows = exclRes ? await exclRes.json() : []
    const excludeIds = new Set(Array.isArray(exclRows) ? exclRows.map(r => r.id) : [])

    const ids = Array.isArray(rows)
      ? rows.filter(r => r.score >= 2 && !excludeIds.has(r.id)).map(r => r.id)
      : []

    // Log the search — fire-and-forget, non-fatal
    fetch(`${supabaseUrl}/rest/v1/search_logs`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ query, tags, result_count: ids.length }),
    }).catch(() => {})

    return res.status(200).json({ tags, ids })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
