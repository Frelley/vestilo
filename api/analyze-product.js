import { CANONICAL_TAGS, toCanonicalTags } from './tags.js'
import { CONTENT_ENTITY_TAGS, CONTENT_THEME_TAGS, toContentEntityTags, toContentThemeTags } from './content-themes.js'
import { rateLimit } from './_rateLimit.js'

export const maxDuration = 30

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 10, windowMs: 60_000 })
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter })

  const { product_id, photo_urls, force } = req.body
  if (!product_id || !photo_urls?.length) {
    return res.status(400).json({ error: 'Missing product_id or photo_urls' })
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!anthropicKey || !supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Missing environment variables' })
  }

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            ...photo_urls.map(url => ({
              type: 'image',
              source: { type: 'url', url },
            })),
            {
              type: 'text',
              text: `Analiza estas fotos de una prenda de ropa. Pueden incluir frente, espalda, etiqueta u otros ángulos.

Responde SOLO con JSON válido, sin texto adicional:
{
  "brand": "nombre de la marca si es visible en etiqueta, o null",
  "colors": ["colores de esta lista exacta: negro, blanco, gris, azul, azul-marino, rojo, verde, amarillo, cafe, naranja, rosa, morado, multicolor, beige, crema"],
  "gender": "mujer, hombre, o unisex",
  "tags": ["8-15 tags de la lista canónica que describe la prenda — incluir tipo de prenda: camiseta, camisa, hoodie, buzo, musculosa, top, etc."],
  "content_themes": ["1-4 temas de contenido de la lista permitida para agrupar reels o drops"],
  "content_entities": ["0-3 franquicias, artistas, equipos o IPs visibles de la lista permitida"]
}

Los tags deben ser ÚNICAMENTE palabras de esta lista canónica (elige los más relevantes):
${CANONICAL_TAGS.join(', ')}

Los content_themes deben salir ÚNICAMENTE de esta lista:
${CONTENT_THEME_TAGS.join(', ')}

Los content_entities deben salir ÚNICAMENTE de esta lista y solo si realmente se ven o se reconocen con mucha confianza:
${CONTENT_ENTITY_TAGS.join(', ')}

Reglas:
- "tags" es para búsqueda objetiva del producto. No mezclar con campañas o vibes.
- "content_themes" es para agrupar varias prendas en un mismo reel.
- "content_entities" es para franquicias, bandas, equipos, shows o personajes concretos.
- Si no aplica una entidad exacta, devuelve [].
- No inventes marcas, personajes o franquicias.`,
            },
          ],
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    if (!claudeRes.ok) {
      return res.status(500).json({ error: 'Claude API error', details: claudeData })
    }

    const text = claudeData.content?.[0]?.text
    let parsed = null
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text?.match(/\{[\s\S]*\}/)
      if (match) try { parsed = JSON.parse(match[0]) } catch {}
    }

    if (!parsed?.tags) {
      return res.status(500).json({ error: 'Parse failed', raw: text })
    }

    // Merge all fields and normalize to canonical vocabulary
    const rawTags = [
      ...(parsed.tags || []),
      ...(parsed.colors || []),
      parsed.gender || null,
      parsed.brand || null,
    ].filter(Boolean)

    const allTags = toCanonicalTags(rawTags)

    const contentThemes = toContentThemeTags(parsed.content_themes || [])
    const contentEntities = toContentEntityTags(parsed.content_entities || [])

    const updateData = {
      ai_tags: allTags,
      content_themes: contentThemes,
      content_entities: contentEntities,
    }
    // if (parsed.description) {
    //   if (force) {
    //     updateData.notes = parsed.description
    //   } else {
    //     // Only fill notes if currently empty
    //     const checkRes = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${product_id}&select=notes`, {
    //       headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    //     })
    //     const [product] = await checkRes.json()
    //     if (!product?.notes?.trim()) updateData.notes = parsed.description
    //   }
    // }

    await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${product_id}`, {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(updateData),
    })

    return res.status(200).json({
      ok: true,
      description: parsed.description,
      brand: parsed.brand,
      colors: parsed.colors,
      aesthetic: parsed.aesthetic,
      gender: parsed.gender,
      tags: allTags,
      content_themes: contentThemes,
      content_entities: contentEntities,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
