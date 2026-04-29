import { createClient } from '@supabase/supabase-js'

// ─── Meta Commerce Manager product feed ──────────────────────────────────────
// GET https://vestilo.vercel.app/api/meta-feed
// Returns CSV of all Disponible products in Meta's feed format.
// Register this URL in Commerce Manager → Catálogos → Orígenes de datos → URL.
// Meta will pull it on the configured schedule (min every hour).

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send('Missing environment variables')
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, cat, size, color, price, styles, notes, photo_url, photos, status')
    .eq('status', 'Disponible')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase error:', error)
    return res.status(500).send('Error fetching products')
  }

  const BASE_URL = 'https://vestilo.vercel.app'
  const BRAND    = 'Vestilo a tu sonso'

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function colorsLabel(color) {
    if (!color) return ''
    return Array.isArray(color) ? color.join(', ') : color
  }

  // Wrap value in quotes if it contains commas, quotes, or newlines
  function csvEscape(val) {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  // Build a human-readable title from product fields
  // e.g. "Camiseta Premium talla M – Negro"
  function buildTitle(p) {
    const parts = ['Camiseta']
    if (p.cat)   parts.push(p.cat)
    if (p.size)  parts.push('talla ' + p.size)
    const color = colorsLabel(p.color)
    if (color)   parts.push('– ' + color)
    return parts.join(' ')
  }

  // Build description from notes → styles → fallback
  function buildDescription(p) {
    if (p.notes?.trim()) return p.notes.trim()
    const parts = []
    if (p.cat)    parts.push(p.cat)
    const styles = Array.isArray(p.styles) ? p.styles : []
    if (styles.length) parts.push(styles.join(', '))
    if (p.size)   parts.push('Talla ' + p.size)
    const color = colorsLabel(p.color)
    if (color)    parts.push(color)
    return parts.length ? parts.join(' · ') : 'Camiseta disponible en ' + BRAND
  }

  // ── Build CSV ────────────────────────────────────────────────────────────────

  const COLUMNS = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'brand',
    'google_product_category',
    'size',
    'color',
  ]

  function productToRow(p) {
    const imageUrl = (p.photos?.length > 0) ? p.photos[0] : (p.photo_url || '')
    const price    = parseFloat(p.price || 0).toFixed(2) + ' BOB'

    return [
      p.id,
      buildTitle(p),
      buildDescription(p),
      'in stock',
      'new',
      price,
      `${BASE_URL}/p/${p.id}`,
      imageUrl,
      BRAND,
      'Apparel & Accessories > Clothing',
      p.size  || '',
      colorsLabel(p.color),
    ]
  }

  const rows = [COLUMNS, ...(products || []).map(productToRow)]
  const csv  = rows.map(row => row.map(csvEscape).join(',')).join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.status(200).send(csv)
}
