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
    // Step 1: extract semantic tags from the query using Claude Haiku
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
Extrae entre 3 y 8 tags de búsqueda en español que describan lo que busca. Los tags deben ser palabras sueltas o frases cortas que podrían coincidir con las etiquetas de una prenda de ropa: tipo de prenda, color, estilo, ocasión, fit, material, temporada.
Responde SOLO con JSON válido:
{"tags": ["tag1", "tag2", "tag3"]}`,
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    if (!claudeRes.ok) {
      return res.status(500).json({ error: 'Claude API error', details: claudeData })
    }

    const text = claudeData.content?.[0]?.text
    let tags = []
    try {
      tags = JSON.parse(text).tags
    } catch {
      const match = text?.match(/\{[\s\S]*\}/)
      if (match) try { tags = JSON.parse(match[0]).tags } catch {}
    }

    if (!tags?.length) return res.status(200).json({ tags: [], ids: [] })

    // Step 2: query Supabase for products whose ai_tags overlap
    const tagsParam = `{${tags.map(t => `"${t.replace(/\"/g, '\\"')}"`).join(',')}}`
    const sbRes = await fetch(
      `${supabaseUrl}/rest/v1/products?select=id&status=eq.Disponible&ai_tags=ov.${encodeURIComponent(tagsParam)}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    )

    const rows = await sbRes.json()
    const ids = Array.isArray(rows) ? rows.map(r => r.id) : []

    return res.status(200).json({ tags, ids })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
