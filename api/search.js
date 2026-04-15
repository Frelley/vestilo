import { CANONICAL_TAGS, extractTagsFromQuery, toCanonicalTags, expandWithSemantic } from './tags.js'

export const maxDuration = 15

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

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
De esta lista de tags, selecciona entre 3 y 8 que mejor describan lo que busca. Interpreta la intención — por ejemplo "sin diseño" = liso, "para salir" = noche/fiesta, "abrigada" = invierno.
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
          // Normalize through canonical dictionary only — no semantic expansion.
          // Haiku already understands context; expansion would dilute precision.
          tags = toCanonicalTags(haikuTags)
        }
      }
    }

    if (!tags?.length) return res.status(200).json({ tags: [], ids: [] })

    // ── Step 3: scored Supabase RPC — returns ids ordered by match count ────
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/search_products_scored`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ search_tags: tags }),
    })

    const rows = await rpcRes.json()
    // Require at least 2 tag matches to avoid single-tag coincidental hits
    const ids = Array.isArray(rows) ? rows.filter(r => r.score >= 2).map(r => r.id) : []

    return res.status(200).json({ tags, ids })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
