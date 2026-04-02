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

// ─── Sorted products (new grace + like ratio) ────────────────────────────────
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

  const withScore = (productsRes.data || []).map(p => {
    const ageMs = now - new Date(p.created_at).getTime()
    const isNew = ageMs < TWO_DAYS
    const stats = statsMap[p.id]
    const total = stats ? (stats.likes + stats.skips) : 0
    const ratio = total > 0 ? stats.likes / total : -1
    return { ...p, _isNew: isNew, _ratio: ratio, _ageMs: ageMs }
  })

  withScore.sort((a, b) => {
    if (a._isNew && b._isNew) return a._ageMs - b._ageMs
    if (a._isNew) return -1
    if (b._isNew) return 1
    return b._ratio - a._ratio
  })

  return { data: withScore, error: null }
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
