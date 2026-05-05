import { createClient } from '@supabase/supabase-js'

// ─── TikTok Shop / Ads Manager product feed ──────────────────────────────────
// GET https://vestilo.vercel.app/api/tiktok-feed
// Returns CSV in TikTok's catalogue feed format.
// Register URL in TikTok Ads Manager → Assets → Catalogue → Add data source → URL.
// TikTok will pull it on the configured schedule (min every hour).

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

  function colorsLabel(color) {
    if (!color) return ''
    return Array.isArray(color) ? color.join(', ') : color
  }

  function csvEscape(val) {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"'
    }
    return str
  }

  function buildTitle(p) {
    const parts = ['Camiseta']
    if (p.cat)  parts.push(p.cat)
    if (p.size) parts.push('talla ' + p.size)
    const color = colorsLabel(p.color)
    if (color)  parts.push('– ' + color)
    return parts.join(' ')
  }

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

  const COLUMNS = [
    'sku_id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'additional_image_link',
    'brand',
    'product_type',
    'size',
    'color',
    'gender',
  ]

  function productToRow(p) {
    const photos   = Array.isArray(p.photos) && p.photos.length ? p.photos : p.photo_url ? [p.photo_url] : []
    const imageUrl = photos[0] || ''
    const extraImages = photos.slice(1).join(',')
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
      extraImages,
      BRAND,
      'Apparel & Accessories > Clothing > Shirts & Tops',
      p.size  || '',
      colorsLabel(p.color),
      'unisex',
    ]
  }

  const rows = [COLUMNS, ...(products || []).map(productToRow)]
  const csv  = rows.map(row => row.map(csvEscape).join(',')).join('\n')

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.status(200).send(csv)
}
