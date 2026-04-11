export const maxDuration = 30

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { product_id, photo_urls } = req.body
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
              text: `Analiza estas fotos de una prenda de ropa para una tienda de segunda mano. Pueden incluir frente, espalda, etiqueta u otros ángulos.
Responde SOLO con JSON válido, sin texto adicional:
{
  "description": "descripción natural en español de 2-3 oraciones para el listing",
  "tags": ["array", "de", "tags", "semánticos", "en", "español"]
}
Los tags deben cubrir: tipo de prenda, material (si visible en etiqueta o textura), corte/fit, paleta de colores, estética/estilo, ocasión, temporada. Entre 8-15 tags.`,
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

    // Only fill notes if currently empty
    const checkRes = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${product_id}&select=notes`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    })
    const [product] = await checkRes.json()
    const updateData = { ai_tags: parsed.tags }
    if (parsed.description && !product?.notes?.trim()) {
      updateData.notes = parsed.description
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

    return res.status(200).json({ ok: true, description: parsed.description, tags: parsed.tags })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
