import { rateLimit } from './_rateLimit.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 30, windowMs: 60_000 })
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests', retryAfter: rl.retryAfter })

  const { cat, color, size, ai_tags = [], notes } = req.body

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return res.status(500).json({ error: 'Missing ANTHROPIC_API_KEY' })

  const prompt = `Eres experto en marketing de ropa boliviana. Producto:
- Categoría: ${cat || 'Ropa'}
- Color: ${color || 'N/A'}
- Talla: ${size || 'N/A'}
- Tags: ${ai_tags.length ? ai_tags.join(', ') : 'N/A'}
- Descripción: ${notes || 'N/A'}

Responde SOLO con JSON válido, sin texto extra:
{
  "vibe": "etiqueta de 1-3 palabras en español (ej: Casual, Regalo ideal, Día del Padre, Estilo urbano, Nueva llegada)",
  "cta": "frase de urgencia corta en español (ej: ¡Stock limitado!, ¡Llévalo hoy!, ¡Última unidad!, ¡No te quedes sin él!)"
}`

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) throw new Error('Claude API error')

    const data = await claudeRes.json()
    const raw = data.content?.[0]?.text?.trim() || '{}'
    const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const result = JSON.parse(text)

    res.json({ vibe: result.vibe || null, cta: result.cta || null })
  } catch {
    res.json({ vibe: null, cta: null })
  }
}
