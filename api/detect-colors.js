import { rateLimit } from './_rateLimit.js'
import { createSmallResponse } from './_openai.js'

export const maxDuration = 15

const UI_COLORS = ['Negro', 'Blanco', 'Gris', 'Azul', 'Azul marino', 'Rojo', 'Vino', 'Verde', 'Café', 'Beige', 'Amarillo', 'Rosa', 'Morado', 'Naranja', 'Multicolor']

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown'
  const rl = rateLimit(ip, { limit: 20, windowMs: 60_000 })
  if (!rl.ok) return res.status(429).json({ error: 'Too many requests' })

  const { image_base64 } = req.body
  if (!image_base64) return res.status(400).json({ error: 'Missing image_base64' })
  if (!/^data:[^;]+;base64,/.test(image_base64)) {
    return res.status(400).json({ error: 'Invalid image format' })
  }

  try {
    const text = await createSmallResponse({
      maxOutputTokens: 80,
      input: [{
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: `What are the main colors of this clothing item? Reply ONLY with a JSON array using ONLY these exact names: ${UI_COLORS.join(', ')}. Pick 1-3 best matches. Example: ["Negro","Azul"]`,
          },
          { type: 'input_image', image_url: image_base64 },
        ],
      }],
    })

    let colors = []
    try {
      colors = JSON.parse(text).filter(c => UI_COLORS.includes(c))
    } catch {
      const match = text.match(/\[[\s\S]*\]/)
      if (match) try { colors = JSON.parse(match[0]).filter(c => UI_COLORS.includes(c)) } catch {}
    }

    return res.status(200).json({ colors })
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}
