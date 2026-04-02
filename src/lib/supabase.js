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

// ─── Auto-label ───────────────────────────────────────────────────────────────
// Returns next label like "M-003" by counting existing names that match SIZE-NNN
export async function getNextLabelForSize(size) {
  if (!size) return ''
  const prefix = `${size}-`
  const { data } = await supabase
    .from('products')
    .select('name')
    .like('name', `${prefix}%`)
  // Find the highest existing number for this size
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
