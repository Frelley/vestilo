import { rateLimit } from './_rateLimit.js'

export const maxDuration = 15

const UI_COLORS = ['Negro', 'Blanco', 'Gris', 'Azul', 'Azul marino', 'Rojo', 'Vino', 'Verde', 'Café', 'Beige', 'Amarillo', 'Rosa', 'Morado', 'Naranja', 'Multicolor']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' })

  const { image_base64 } = req.body
  if (!image_base64) return res.status(400).json({ error: 'Missing image_base64' })

  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return res.status(500).json({ error: 'Missing API key' })

  const match = image_base64.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return res.status(400).json({ error: 'Invalid image format' })
  const [, mediaType, data] = match

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
        max_tokens: 60,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
            {
              type: 'text',
              text: `What are the main colors of this clothing item? Reply ONLY with a JSON array using ONLY these exact names: ${UI_COLORS.join(', ')}. Pick 1-3 best matches. Example: ["Negro","Azul"]`,
            },
          ],
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text || '[]'

    let colors = []
    try {
      colors = JSON.parse(text).filter(c => UI_COLORS.includes(c))
    } catch {
      const m = text.match(/\[[\s\S]*\]/)
      if (m) try { colors = JSON.parse(m[0]).filter(c => UI_COLORS.includes(c)) } catch {}
    }

    return res.status(200).json({ colors })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
