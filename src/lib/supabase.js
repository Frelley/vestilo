import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Auth ────────────────────────────────────────────────────────────────────
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

  if (filters.status)   query = query.eq('status', filters.status)
  if (filters.size)     query = query.eq('size', filters.size)
  if (filters.color)    query = query.eq('color', filters.color)
  if (filters.priceMax) query = query.lte('price', filters.priceMax)
  if (filters.bundle_id) query = query.eq('bundle_id', filters.bundle_id)

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

// ─── Mark as sold — captures actual sale price + discount ────────────────────
// Call this instead of updateProduct when marking Vendido
export async function markSold(id, { sold_price, discount = 0 }) {
  return supabase.from('products').update({
    status: 'Vendido',
    sold_price,
    discount,
    sold_at: new Date().toISOString(),
  }).eq('id', id).select().single()
}

// ─── Sorted products (psychology-optimized) ───────────────────────────────────
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
    const ratio = total >= 5 ? stats.likes / total : 0
    return { ...p, _isNew: isNew, _ratio: ratio, _ageMs: ageMs }
  })

  const proven = scored
    .filter(p => !p._isNew)
    .sort((a, b) => b._ratio - a._ratio)

  const newArrivals = scored
    .filter(p => p._isNew)
    .sort((a, b) => a._ageMs - b._ageMs)

  const top3Ids = new Set(proven.slice(0, 3).map(p => p.id))
  const anchorCandidate = [...proven]
    .filter(p => !top3Ids.has(p.id))
    .sort((a, b) => b.price - a.price)[0]

  const anchorId = anchorCandidate?.id
  const rest = proven.slice(3).filter(p => p.id !== anchorId)

  const result = [
    ...proven.slice(0, 3),
    ...newArrivals,
    ...(anchorCandidate ? [anchorCandidate] : []),
    ...rest,
  ]

  return { data: result, error: null }
}

// ─── Auto-label with recycling ────────────────────────────────────────────────
// 1. Check freed_labels first (recycled from sold/deleted products)
// 2. Fall back to max+1 from existing products
export async function getNextLabelForSize(size) {
  if (!size) return ''

  // Check freed labels first
  const { data: freed } = await supabase
    .from('freed_labels')
    .select('id, label')
    .eq('size', size)
    .order('created_at', { ascending: true })
    .limit(1)

  if (freed?.length > 0) {
    // Claim this freed label by deleting it
    await supabase.from('freed_labels').delete().eq('id', freed[0].id)
    return freed[0].label
  }

  // No freed labels — find next sequential number
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

// Free a label back into the pool (call when a product is deleted or re-listed)
export async function freeLabel(size, label) {
  if (!size || !label) return
  // Check it's not already in the freed pool
  const { data } = await supabase
    .from('freed_labels')
    .select('id')
    .eq('label', label)
    .limit(1)

  if (!data?.length) {
    await supabase.from('freed_labels').insert([{ size, label }])
  }
}

// ─── Bulk re-compress existing photos ────────────────────────────────────────
// Fetches each photo URL, compresses it, re-uploads, and updates the DB row.
// onProgress(current, total, productName) is called after each product.
export async function recompressAllPhotos(onProgress) {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, photo_url, photos')

  if (error) throw error

  const list = (products || []).filter(p => p.photo_url || p.photos?.length)
  let done = 0

  for (const product of list) {
    try {
      const urls = []
      if (product.photos?.length) {
        product.photos.forEach(u => { if (u && !urls.includes(u)) urls.push(u) })
      } else if (product.photo_url) {
        urls.push(product.photo_url)
      }

      const newUrls = await Promise.all(urls.map(async url => {
        const res = await fetch(url)
        if (!res.ok) return url
        const blob = await res.blob()
        const file = new File([blob], 'photo.jpg', { type: blob.type || 'image/jpeg' })
        const compressed = await compressImage(file)
        const path = `products/${product.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        const { error: upErr } = await supabase.storage
          .from('product-photos')
          .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })
        if (upErr) return url
        const { data } = supabase.storage.from('product-photos').getPublicUrl(path)
        return data.publicUrl
      }))

      await updateProduct(product.id, {
        photo_url: newUrls[0] || null,
        photos: newUrls,
      })
    } catch {
      // skip silently, don't abort batch
    }

    done++
    onProgress?.(done, list.length, product.name)
  }

  return list.length
}

// ─── Image compression ────────────────────────────────────────────────────────
// Resizes to max 1200px on the longest side and encodes as JPEG @ 80% quality.
// Returns a Blob ready for upload.
export function compressImage(file, { maxPx = 1200, quality = 0.8 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      if (width > maxPx || height > maxPx) {
        if (width >= height) { height = Math.round(height * maxPx / width); width = maxPx }
        else                 { width  = Math.round(width  * maxPx / height); height = maxPx }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = reject
    img.src = url
  })
}

// ─── Photo upload ─────────────────────────────────────────────────────────────
export async function uploadPhoto(file, productId) {
  const compressed = await compressImage(file)
  const path = `products/${productId}-${Date.now()}.jpg`

  const { error } = await supabase.storage
    .from('product-photos')
    .upload(path, compressed, { upsert: true, contentType: 'image/jpeg' })

  if (error) throw error

  const { data } = supabase.storage
    .from('product-photos')
    .getPublicUrl(path)

  return data.publicUrl
}

// ─── Bundles ─────────────────────────────────────────────────────────────────
export async function createBundle(bundleData) {
  return supabase.from('bundles').insert([bundleData]).select().single()
}

export async function getBundles(filters = {}) {
  let query = supabase
    .from('bundles')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) query = query.eq('status', filters.status)
  return query
}

export async function getBundle(id) {
  return supabase.from('bundles').select('*').eq('id', id).single()
}

export async function updateBundle(id, updates) {
  return supabase.from('bundles').update(updates).eq('id', id).select().single()
}

export async function deleteBundle(id) {
  return supabase.from('bundles').delete().eq('id', id)
}

export async function getBundleWithProducts(bundleId) {
  const [bundleRes, productsRes] = await Promise.all([
    getBundle(bundleId),
    supabase
      .from('products')
      .select('*')
      .eq('bundle_id', bundleId)
      .order('created_at', { ascending: false }),
  ])
  if (bundleRes.error) return bundleRes
  return {
    data: { ...bundleRes.data, products: productsRes.data || [] },
    error: null,
  }
}

export async function getBundleAudit(bundleId, limit = 50) {
  return supabase
    .from('bundle_audit')
    .select('*')
    .eq('bundle_id', bundleId)
    .order('created_at', { ascending: false })
    .limit(limit)
}

// Generate next label within a bundle (e.g. "L5-001", "L5-002")
export async function getNextBundleLabel(bundlePrefix) {
  if (!bundlePrefix) return ''

  const { data } = await supabase
    .from('products')
    .select('bundle_label')
    .like('bundle_label', `${bundlePrefix}-%`)

  let max = 0
  ;(data || []).forEach(({ bundle_label }) => {
    if (!bundle_label) return
    const num = parseInt(bundle_label.replace(`${bundlePrefix}-`, ''), 10)
    if (!isNaN(num) && num > max) max = num
  })

  const next = String(max + 1).padStart(3, '0')
  return `${bundlePrefix}-${next}`
}
