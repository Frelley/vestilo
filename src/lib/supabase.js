import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth helpers ────────────────────────────────────────────────────────────
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  return supabase.auth.getSession()
}

// ─── Products ────────────────────────────────────────────────────────────────
export async function getProducts(filters = {}) {
  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.size)   query = query.eq('size', filters.size)
  if (filters.color)  query = query.eq('color', filters.color)
  if (filters.priceMax) query = query.lte('price', filters.priceMax)

  return query
}

export async function addProduct(product) {
  return supabase.from('products').insert([product]).select().single()
}

export async function updateProduct(id, updates) {
  return supabase.from('products').update(updates).eq('id', id).select().single()
}

export async function deleteProduct(id) {
  return supabase.from('products').delete().eq('id', id)
}

// ─── Sorted products (psychology-optimized) v2.5 ─────────────────────────────
// Order: [top 3 by like-ratio] → [new arrivals <2d] → [price anchor] → [rest by ratio]
export async function getProductsSorted(filters = {}) {
  const [productsRes, statsRes] = await Promise.all([
    getProducts(filters),
    supabase.from('swipe_stats').select('product_id, likes, skips'),
  ])
  if (productsRes.error) return productsRes

  const statsMap = {}
  ;(statsRes.data || []).forEach(s => { statsMap[s.product_id] = s })

  const now = Date.now()
  const TWO_DAYS = 2 * 24 * 60 * 60 * 1000

  const scored = (productsRes.data || []).map(p => {
    const ageMs = now - new Date(p.created_at).getTime()
    const isNew = ageMs < TWO_DAYS
    const stats = statsMap[p.id]
    const total = stats ? (stats.likes + stats.skips) : 0
    // Items with no swipe data get ratio 0 (neutral), not -1
    const ratio = total >= 5 ? stats.likes / total : 0
    return { ...p, _isNew: isNew, _ratio: ratio, _ageMs: ageMs }
  })

  // Sort proven items by ratio desc (needs ≥5 swipes to count)
  const proven = scored
    .filter(p => !p._isNew)
    .sort((a, b) => b._ratio - a._ratio)

  const newArrivals = scored
    .filter(p => p._isNew)
    .sort((a, b) => a._ageMs - b._ageMs) // newest first

  // Price anchor: highest-priced item not already in top 3
  // Pulled out and inserted at position 6 (after top3 + new)
  const top3Ids = new Set(proven.slice(0, 3).map(p => p.id))
  const anchorCandidate = [...proven]
    .filter(p => !top3Ids.has(p.id))
    .sort((a, b) => b.price - a.price)[0]

  const anchorId = anchorCandidate?.id

  // Rest = everything after top3 + anchor, sorted by ratio
  const rest = proven
    .slice(3)
    .filter(p => p.id !== anchorId)

  // Assemble final order
  const result = [
    ...proven.slice(0, 3),   // 1-3: social proof leaders
    ...newArrivals,           // 4-5: novelty (variable count)
    ...(anchorCandidate ? [anchorCandidate] : []), // price anchor
    ...rest,                  // remainder by ratio
  ]

  return { data: result, error: null }
}

// ─── Auto-label ───────────────────────────────────────────────────────────────
export async function getNextLabelForSize(size) {
  if (!size) return ''
  const prefix = `${size}-`
  const { data } = await supabase
    .from('products')
    .select('name')
    .like('name', `${prefix}%`)
  let max = 0
  ;(data || []).forEach(({ name }) => {
    const num = parseInt(name.replace(prefix, ''), 10)
    if (!isNaN(num) && num > max) max = num
  })
  const next = String(max + 1).padStart(3, '0')
  return `${prefix}${next}`
}

// ─── Photo upload ─────────────────────────────────────────────────────────────
export async function uploadPhoto(file, productId) {
  const ext = file.name.split('.').pop()
  const path = `products/${productId}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('product-photos')
    .getPublicUrl(path)

  return data.publicUrl
}
