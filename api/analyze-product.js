import { CANONICAL_TAGS, toCanonicalTags } from './tags.js'

export const maxDuration = 30

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

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
              text: `Analiza estas fotos de una prenda de ropa para una tienda de ropa de segunda mano en Santa Cruz de la Sierra, Bolivia. Pueden incluir frente, espalda, etiqueta u otros ángulos.

Escribe la descripción con energía camba de Santa Cruz — espontánea, con humor, como vendiendo por WhatsApp. El slang debe salir natural, no forzado. Varía el tono según la prenda: si es para mujer, habla a ella; si es para hombre, habla a él; si es unisex, habla a cualquiera. No asumas género del comprador si la prenda no lo define. A veces un chiste sobre la ocasión, a veces entusiasmo genuino — que cada descripción suene diferente. Si detectas la marca en la etiqueta, mencionala. NO menciones desgaste, uso, manchas ni defectos. Solo lo positivo.

Responde SOLO con JSON válido, sin texto adicional:
{
  "description": "descripción atractiva en español con tono camba de 2-3 oraciones, mencionando la marca si se detecta",
  "brand": "nombre de la marca si es visible en etiqueta, o null",
  "colors": ["colores de esta lista exacta: negro, blanco, gris, azul, azul-marino, rojo, verde, amarillo, cafe, naranja, rosa, morado, multicolor, beige, crema"],
  "aesthetic": ["2-4 etiquetas de estética de esta lista: vintage, streetwear, y2k, boho, minimalista, cottagecore, coquette, preppy, sporty, elegante, casual, retro, grunge, punk, rock, hipster, urbano, formal, semi-formal"],
  "gender": "mujer, hombre, o unisex",
  "tags": ["8-15 tags de la lista canónica que describe la prenda"]
}

Los tags deben ser ÚNICAMENTE palabras de esta lista canónica (elige los más relevantes):
${CANONICAL_TAGS.join(', ')}`,
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
      ...(parsed.aesthetic || []),
      ...(parsed.colors || []),
      parsed.gender || null,
      parsed.brand || null,
    ].filter(Boolean)

    const allTags = toCanonicalTags(rawTags)

    const updateData = { ai_tags: allTags }
    if (parsed.description) {
      if (force) {
        updateData.notes = parsed.description
      } else {
        // Only fill notes if currently empty
        const checkRes = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${product_id}&select=notes`, {
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
        })
        const [product] = await checkRes.json()
        if (!product?.notes?.trim()) updateData.notes = parsed.description
      }
    }

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
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
