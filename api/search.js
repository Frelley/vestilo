import { CANONICAL_TAGS, extractTagsFromQuery, toCanonicalTags, getExcludeTags } from './tags.js'
import { rateLimit } from './_rateLimit.js'
import { createSmallResponse } from './_openai.js'

export const maxDuration = 15

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter })

  const { query } = req.body
  if (!query?.trim()) return res.status(400).json({ error: 'Missing query' })

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  try {
    let tags = extractTagsFromQuery(query)

    if (tags.length < 3) {
      const text = await createSmallResponse({
        maxOutputTokens: 256,
        input: [{
          role: 'user',
          content: [{
            type: 'input_text',
            text: `Eres un asistente de busqueda de ropa. El usuario busca: "${query}"
De esta lista de tags, selecciona entre 3 y 5 tags MAS ESPECIFICOS Y REPRESENTATIVOS que describan la busqueda. Interpreta la intencion: "sin diseno" = liso, "para salir" = noche/fiesta, "abrigada" = invierno. Prioriza tags que diferencian la busqueda (ej: liso, estampado, oversize, vintage). Evita tags genericos que casi toda prenda tiene (ej: casual, manga-corta, cuello-redondo).
Tags disponibles: ${CANONICAL_TAGS.join(', ')}
Responde SOLO con JSON valido:
{"tags": ["tag1", "tag2", "tag3"]}`,
          }],
        }],
      })

      let modelTags = []
      try {
        modelTags = JSON.parse(text).tags
      } catch {
        const match = text?.match(/\{[\s\S]*\}/)
        if (match) try { modelTags = JSON.parse(match[0]).tags } catch {}
      }
      if (modelTags?.length) tags = toCanonicalTags(modelTags)
    }

    if (!tags?.length) return res.status(200).json({ tags: [], ids: [] })

    const excludeTags = getExcludeTags(tags)
    const exclParam = excludeTags.length > 0
      ? encodeURIComponent(`{${excludeTags.map(t => `"${t}"`).join(',')}}`)
      : null

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
    return res.status(err.status || 500).json({ error: err.message })
  }
}
