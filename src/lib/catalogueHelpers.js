import { supabase } from './supabase.js'

export const SWIPE_THRESHOLD = 75
export const STORAGE_KEY     = 'vestilo-liked'
export const MODE_KEY        = 'vestilo-mode'
export const FILTER_KEY      = 'vestilo-filters'
export const SCROLL_KEY      = 'vestilo-scroll'

export const BULK_MIN    = 2
export const BULK_DISC   = 5
export const PRICE_FLOOR = 20

export const SEARCH_SUGGESTIONS = [
  'algo para el gym',
  'camiseta negra oversize',
  'algo para salir de noche',
  'básica blanca sin diseño',
  'estampado vintage',
  'ropa fresca de verano',
  'estilo urbano streetwear',
  'manga larga abrigada',
  'colores vivos y llamativos',
  'algo minimalista',
]

export function getLiked()     { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
export function saveLiked(ids) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {} }
export function getSavedMode() { try { return localStorage.getItem(MODE_KEY) || null } catch { return null } }
export function saveMode(m)    { try { localStorage.setItem(MODE_KEY, m) } catch {} }
export function getDefaultMode() { const s = getSavedMode(); return s || (window.innerWidth < 640 ? 'swipe' : 'grid') }

export function getSavedFilters()         { try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}') } catch { return {} } }
export function saveFiltersToSession(obj) { try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(obj)) } catch {} }

export async function recordInteraction(productId, type) {
  try { await supabase.rpc('record_swipe', { p_product_id: productId, p_type: type }) } catch {}
}

export function getPhotos(p) {
  if (!p) return []
  return p.photos?.length ? p.photos : p.photo_url ? [p.photo_url] : []
}

export function genRef() {
  return Math.random().toString(36).slice(2, 5).toUpperCase()
}

export const vibe = (ms) => { try { navigator.vibrate?.(ms) } catch {} }

export function bulkSavings(products) {
  if (products.length <= BULK_MIN) return 0
  return products.reduce((sum, p) => {
    const price = parseFloat(p.price) || 0
    return sum + Math.min(BULK_DISC, Math.max(0, price - PRICE_FLOOR))
  }, 0)
}
