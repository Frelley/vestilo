import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsSorted, supabase, createOrder } from '../lib/supabase.js'
import { SIZES, COLOR_DOTS, WA_NUMBER, colorsArray } from '../lib/constants.js'
import CartHeart from '../components/CartHeart.jsx'

const SWIPE_THRESHOLD = 75
const STORAGE_KEY     = 'vestilo-liked'
const MODE_KEY        = 'vestilo-mode'

const SEARCH_SUGGESTIONS = [
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

function getLiked()      { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function saveLiked(ids)  { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {} }
function getSavedMode()  { try { return localStorage.getItem(MODE_KEY) || null } catch { return null } }
function saveMode(m)     { try { localStorage.setItem(MODE_KEY, m) } catch {} }
function getDefaultMode(){ const s = getSavedMode(); return s || (window.innerWidth < 640 ? 'swipe' : 'grid') }

const FILTER_KEY = 'vestilo-filters'
const SCROLL_KEY = 'vestilo-scroll'
function getSavedFilters()          { try { return JSON.parse(sessionStorage.getItem(FILTER_KEY) || '{}') } catch { return {} } }
function saveFiltersToSession(obj)  { try { sessionStorage.setItem(FILTER_KEY, JSON.stringify(obj)) } catch {} }

async function recordInteraction(productId, type) {
  try { await supabase.rpc('record_swipe', { p_product_id: productId, p_type: type }) } catch {}
}
function getPhotos(p) {
  if (!p) return []
  return p.photos?.length ? p.photos : p.photo_url ? [p.photo_url] : []
}

const WA_SVG = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

const BULK_MIN    = 6
const BULK_DISC   = 5

function genRef() {
  return Math.random().toString(36).slice(2, 5).toUpperCase()
}

const vibe = (ms) => { try { navigator.vibrate?.(ms) } catch {} }
const PRICE_FLOOR = 20

function bulkSavings(products) {
  if (products.length <= BULK_MIN) return 0
  return products.reduce((sum, p) => {
    const price = parseFloat(p.price) || 0
    return sum + Math.min(BULK_DISC, Math.max(0, price - PRICE_FLOOR))
  }, 0)
}

// ── Promo banner ──────────────────────────────────────────────────────────────
function PromoBanner({ dark }) {
  const bg     = dark ? '#2a1f10' : '#fdf6e8'
  const border = dark ? '#3d3020' : '#e8d9b0'
  const text   = dark ? '#c4b9a8' : '#5a4020'
  const accent = dark ? '#f5e6c8' : '#1a1209'
  return (
    <div style={{ margin: '4px 12px 0', background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14 }}>🏷️</span>
      <span style={{ fontSize: 12, color: text, lineHeight: 1.4 }}>
        Comprá <span style={{ fontWeight: 700, color: accent }}>más de 6</span> camisetas
        {' '}y bajamos <span style={{ fontWeight: 700, color: accent }}>Bs. 5</span> a cada una
        {' '}<span style={{ fontSize: 11, color: dark ? '#9e8a6a' : '#7a6651' }}>(mínimo Bs. 20 c/u)</span>
      </span>
    </div>
  )
}

// ── Mode picker ───────────────────────────────────────────────────────────────
function ModePicker({ onPick }) {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #2d1f12 0%, #1a1209 65%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 30, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>Vestilo a tu sonso!</div>
      <div style={{ color: '#9e8a6a', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Santa Cruz · Bolivia</div>
      <div style={{ width: 32, height: 1, background: '#3d3020', marginBottom: 32 }} />
      <div style={{ fontSize: 13, color: '#7a6a55', marginBottom: 20, textAlign: 'center' }}>¿Cómo querés explorar?</div>
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 340 }}>
        {[
          { key: 'swipe', icon: '👆', label: 'Swipe', desc: 'Desliza una por una y armá tu lista de compra' },
          { key: 'grid',  icon: '🗂️', label: 'Catálogo', desc: 'Ve todas las prendas en una cuadrícula' },
        ].map(opt => (
          <button key={opt.key} onClick={() => onPick(opt.key)} className="mode-card" style={{
            background: '#241810', border: '1px solid #3d3020',
          }}>
            <span style={{ fontSize: 38 }}>{opt.icon}</span>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: '#9e8a6a', textAlign: 'center', lineHeight: 1.55 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Liked list ────────────────────────────────────────────────────────────────
function LikedList({ likedProducts, onBack, onRemove }) {
  const [showNameModal, setShowNameModal] = useState(false)
  const [customerName,  setCustomerName]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [orderDone,     setOrderDone]     = useState(false)

  const savings          = bulkSavings(likedProducts)
  const hasDisc          = savings > 0
  const needed           = Math.max(0, BULK_MIN + 1 - likedProducts.length)
  const potentialSavings = likedProducts.reduce((sum, p) => {
    const price = parseFloat(p.price) || 0
    return sum + Math.min(BULK_DISC, Math.max(0, price - PRICE_FLOOR))
  }, 0)
  const origTotal = likedProducts.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  const discTotal = origTotal - savings

  let waText = likedProducts.map(p => `• ${p.name} — Talla ${p.size} — Bs. ${p.price}`).join('\n')
  if (hasDisc) {
    waText += `\n\nSon ${likedProducts.length} camisetas → descuento de Bs. 5 c/u\nTotal con descuento: Bs. ${discTotal.toFixed(2)} (ahorro Bs. ${savings.toFixed(2)})`
  }

  async function handleSendOrder() {
    if (!customerName.trim()) return
    setSubmitting(true)
    vibe(20)
    const ref        = genRef()
    const productIds = likedProducts.map(p => p.id)
    const fullText   = `Hola! Me interesan estas prendas:\n\n${waText}\n\n¿Están disponibles?\n\nPedido: #${ref}`
    await createOrder({
      ref,
      customerName: customerName.trim(),
      productIds,
      nominalTotal: origTotal,
      discount:     savings,
      waMessage:    fullText,
    }).catch(() => {})
    setSubmitting(false)
    setOrderDone(true)
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(fullText)}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#9e8a6a', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700 }}>Lista de compra ({likedProducts.length})</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', paddingBottom: likedProducts.length > 0 ? 96 : 16 }}>
        {likedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
            <CartHeart liked={false} size={56} color="#9e8a6a" style={{ marginBottom: 12 }} />
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, marginBottom: 8 }}>Todavía no guardaste nada</div>
            <div style={{ fontSize: 13 }}>Deslizá a la derecha las camisetas que te gusten</div>
          </div>
        ) : (
          <>
            {likedProducts.map(p => {
              const photo = getPhotos(p)[0]
              return (
                <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #3d3020' }}>
                  {photo
                    ? <img src={photo} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, background: '#241810', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>👕</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#9e8a6a' }}>Talla {p.size}{p.color ? ` · ${Array.isArray(p.color) ? p.color.join(', ') : p.color}` : ''}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 14, fontWeight: 700, marginTop: 2 }}>Bs. {p.price}</div>
                  </div>
                  <button onClick={() => onRemove(p.id)} style={{ background: 'transparent', border: 'none', color: '#9e8a6a', fontSize: 18, cursor: 'pointer', padding: 8 }}>✕</button>
                </div>
              )
            })}

            {hasDisc ? (
              <div style={{ margin: '16px 0 8px', background: '#1a2e18', border: '1px solid #2e5c23', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#4CAF50', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🎉</span> ¡Descuento por volumen aplicado!
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9e8a6a', marginBottom: 4 }}>
                  <span>Subtotal ({likedProducts.length} prendas)</span>
                  <span>Bs. {origTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4CAF50', marginBottom: 8 }}>
                  <span>Descuento (Bs. 5 c/u)</span>
                  <span>− Bs. {savings.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px solid #2e5c23', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>Total estimado</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>Bs. {discTotal.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#4CAF50', marginTop: 6, textAlign: 'center' }}>Ahorrás Bs. {savings.toFixed(2)} en este pedido</div>
              </div>
            ) : needed > 0 && likedProducts.length > 0 ? (
              <div style={{ margin: '16px 0 8px', background: '#241810', border: '1px solid #3d3020', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🏷️</span>
                <div style={{ fontSize: 12, color: '#c4b9a8', lineHeight: 1.5 }}>
                  {needed === 1 ? <span style={{ color: '#f5c842', fontWeight: 700 }}>¡Casi! </span> : ''}<span style={{ color: '#f5e6c8', fontWeight: 700 }}>{needed} más</span> y bajamos Bs. 5 a cada una{potentialSavings > 0 ? <> → <span style={{ color: '#f5e6c8', fontWeight: 700 }}>ahorrarías Bs. {potentialSavings.toFixed(0)}</span></> : ''}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {likedProducts.length > 0 && (
        <button
          onClick={() => { setOrderDone(false); setShowNameModal(true) }}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '14px 24px', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.45)', whiteSpace: 'nowrap', zIndex: 100 }}
        >
          {WA_SVG} Pedir por WhatsApp ({likedProducts.length})
        </button>
      )}

      {showNameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1a1209', borderRadius: 16, padding: 28, width: '100%', maxWidth: 340, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            {orderDone ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Pedido registrado</div>
                  <div style={{ fontSize: 13, color: '#9e8a6a', lineHeight: 1.5 }}>Las prendas quedan apartadas mientras confirmamos tu pedido por WhatsApp.</div>
                </div>
                <button onClick={() => setShowNameModal(false)} style={{ width: '100%', padding: '12px', background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Listo
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>¿Cómo te llaman en WhatsApp?</div>
                <div style={{ fontSize: 13, color: '#9e8a6a', marginBottom: 18 }}>Para que podamos identificar tu pedido</div>
                <input
                  autoFocus
                  type="text"
                  placeholder="Tu nombre"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && customerName.trim() && handleSendOrder()}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #3d3020', background: '#241810', color: '#f5e6c8', fontSize: 15, marginBottom: 14, boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleSendOrder}
                  disabled={submitting || !customerName.trim()}
                  style={{ width: '100%', padding: '12px', background: submitting || !customerName.trim() ? '#3d3020' : '#25D366', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: submitting || !customerName.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}
                >
                  {submitting ? 'Registrando…' : <>{WA_SVG} Enviar pedido</>}
                </button>
                <button onClick={() => setShowNameModal(false)} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#9e8a6a', border: 'none', fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Grid view ─────────────────────────────────────────────────────────────────
function GridView({ products, likedIds, onToggleLike, onSwitchMode, filterBar, likedProducts, onRemoveLiked }) {
  const navigate   = useNavigate()
  const [showLiked, setShowLiked] = useState(false)
  const likedCount = likedProducts.length

  useEffect(() => {
    const saved = parseInt(sessionStorage.getItem('vestilo-scroll') || '0', 10)
    if (saved > 0) requestAnimationFrame(() => window.scrollTo(0, saved))
    return () => { sessionStorage.setItem('vestilo-scroll', String(window.scrollY)) }
  }, [])

  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={onRemoveLiked} />

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e8e0d4', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1209' }}>Vestilo a tu sonso!</div>
          <div style={{ fontSize: 10, color: '#7a6651', letterSpacing: 2, textTransform: 'uppercase' }}>Santa Cruz · Bolivia</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => {}} style={{ background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#7a6651', cursor: 'pointer' }}>
            Filtros
          </button>
          <button onClick={onSwitchMode} style={{ background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#7a6651', cursor: 'pointer' }}>Swipe</button>
          <button onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CartHeart liked={likedCount > 0} size={18} color="#7a6651" />
            {likedCount > 0 && <span style={{ background: '#1a1209', color: '#f5e6c8', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedCount}</span>}
          </button>
        </div>
      </div>
      <PromoBanner />
      {filterBar}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12 }}>
        {products.map((p, pi) => {
          const photo = getPhotos(p)[0]
          const liked = likedIds.includes(p.id)
          return (
            <div key={p.id} className="product-card">
              <div onClick={() => { sessionStorage.setItem('vestilo-scroll', String(window.scrollY)); navigate(`/p/${p.id}`) }} style={{ cursor: 'pointer' }}>
                {photo
                  ? <img src={photo} alt={p.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ aspectRatio: '3/4', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👕</div>}
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: '#1a1209', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#7a6651' }}>Talla {p.size}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#1a1209', marginTop: 4 }}>Bs. {p.price}</div>
                </div>
              </div>
              <button onClick={() => onToggleLike(p)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', color: liked ? '#ef5350' : '#f5e6c8' }}>
                <CartHeart liked={liked} size={18} />
              </button>
            </div>
          )
        })}
        {products.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👕</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#1a1209', fontSize: 16 }}>No hay prendas disponibles</div>
          </div>
        )}
      </div>

      {/* Location / Pickup */}
      <div style={{ textAlign: 'center', padding: '20px 16px 40px', borderTop: '1px solid #e8e0d4', marginTop: 4 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0ede8', borderRadius: 20, padding: '7px 16px', border: '1px solid #e8e0d4' }}>
          <span style={{ fontSize: 14 }}>📍</span>
          <span style={{ fontSize: 12, color: '#3d3020', fontWeight: 600 }}>Centro, calle Charcas · Santa Cruz</span>
        </div>
        <div style={{ fontSize: 11, color: '#7a6651', marginTop: 8 }}>Retiro en ~1h · Lun–Sáb 10–18h · Coordinar por WhatsApp</div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Catalogue() {
  const [mode, setMode]           = useState(getDefaultMode)
  const [products, setProducts]   = useState([])
  const [queue, setQueue]         = useState([])
  const [index, setIndex]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [likedIds, setLikedIds]   = useState(getLiked)
  const [showLiked, setShowLiked] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterSize, setFilterSize]   = useState(() => getSavedFilters().filterSize || '')
  const [priceMax, setPriceMax]       = useState(() => getSavedFilters().priceMax ?? 1000)
  const [maxPrice, setMaxPrice]       = useState(1000)
  const [drag, setDrag]           = useState({ active: false, x: 0, y: 0, startX: 0, startY: 0 })
  const [swipeDir, setSwipeDir]   = useState(null)
  const [photoIdx, setPhotoIdx]   = useState(0)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchIds, setSearchIds]         = useState(null)   // null = no search active
  const [isSearching, setIsSearching]     = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [suggIdx, setSuggIdx]             = useState(0)

  useEffect(() => {
    if (searchQuery) return
    const t = setInterval(() => setSuggIdx(i => (i + 1) % SEARCH_SUGGESTIONS.length), 3000)
    return () => clearInterval(t)
  }, [searchQuery])

  const dragRef = useRef(drag)
  dragRef.current = drag

  useEffect(() => { load() }, [])
  useEffect(() => { saveLiked(likedIds) }, [likedIds])
  useEffect(() => { saveFiltersToSession({ filterSize, priceMax }) }, [filterSize, priceMax])

  async function load() {
    setLoading(true)
    const { data } = await getProductsSorted({ status: 'Disponible' })
    if (data) {
      setProducts(data)
      const max = Math.max(...data.map(p => p.price), 500)
      setMaxPrice(max); setPriceMax(max)
    }
    setLoading(false)
  }

  useEffect(() => {
    const filtered = products.filter(p => {
      if (searchIds !== null && !searchIds.includes(p.id)) return false
      if (filterSize && p.size !== filterSize) return false
      if (p.price > priceMax) return false
      return true
    })
    setQueue(filtered); setIndex(0); setPhotoIdx(0)
  }, [filterSize, priceMax, products, searchIds])

  function pickMode(m, action = 'pick') {
    setMode(m); saveMode(m)
    supabase.from('mode_logs').insert({ mode: m, action }).then(() => {})
  }
  function switchMode() { pickMode(mode === 'swipe' ? 'grid' : 'swipe', 'switch') }
  function toggleLike(p) {
    vibe(likedIds.includes(p.id) ? 8 : 15)
    setLikedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])
    recordInteraction(p.id, likedIds.includes(p.id) ? 'skip' : 'like')
  }
  function removeLiked(id) { setLikedIds(prev => prev.filter(x => x !== id)) }

  const likedProducts = products.filter(p => likedIds.includes(p.id))
  const hasFilter     = filterSize || priceMax < maxPrice

  async function doSearch(q) {
    if (!q.trim()) { setSearchIds(null); return }
    setIsSearching(true)
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })
      const data = await res.json()
      setSearchIds(data.ids ?? [])
    } catch { setSearchIds([]) }
    setIsSearching(false)
  }

  function clearSearch() { setSearchQuery(''); setSearchIds(null) }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #3d3020', borderTopColor: '#f5e6c8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  const searchBar = (isDark) => (
    <div style={{ padding: '6px 12px 2px' }}>
      <form onSubmit={e => { e.preventDefault(); doSearch(searchQuery) }} style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder=""
            style={{ width: '100%', background: isDark ? '#241810' : '#fff', color: isDark ? '#f5e6c8' : '#1a1209', border: `1px solid ${isDark ? '#3d3020' : '#e8e0d4'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}
          />
          {!searchQuery && !searchFocused && (
            <div key={suggIdx} className="search-suggestion" style={{ color: isDark ? '#9e8a6a' : '#7a6651' }}>
              <span style={{ color: isDark ? '#9e8a6a' : '#9e8a6a' }}>Buscar con IA… </span>
              <span>ej: {SEARCH_SUGGESTIONS[suggIdx]}</span>
            </div>
          )}
        </div>
        <button type="submit" disabled={isSearching || !searchQuery.trim()} style={{ background: isDark ? '#f5e6c8' : '#1a1209', color: isDark ? '#1a1209' : '#f5e6c8', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', opacity: (!searchQuery.trim() || isSearching) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
          {isSearching ? '…' : 'Buscar'}
        </button>
        {searchIds !== null && (
          <button type="button" onClick={clearSearch} style={{ background: 'transparent', color: isDark ? '#9e8a6a' : '#7a6651', border: `1px solid ${isDark ? '#3d3020' : '#e8e0d4'}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✕
          </button>
        )}
      </form>
      {searchIds !== null && (
        <div style={{ fontSize: 11, color: isDark ? '#9e8a6a' : '#7a6651', padding: '4px 4px 2px' }}>
          {queue.length === 0
            ? <span>Sin resultados · <button type="button" onClick={clearSearch} style={{ background: 'none', border: 'none', color: isDark ? '#9e8a6a' : '#7a6651', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, padding: 0 }}>Limpiar búsqueda</button></span>
            : `${queue.length} resultado${queue.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )

  const filterBar = (
    <>
      {searchBar(false)}
      <div style={{ display: 'flex', gap: 8, padding: '6px 12px', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowFilters(f => !f)} style={{ background: hasFilter ? '#f5e6c8' : 'transparent', color: hasFilter ? '#1a1209' : '#7a6651', border: `1px solid ${hasFilter ? '#c4b9a8' : '#e8e0d4'}`, borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          {hasFilter && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1a1209', display: 'inline-block' }} />}
          Filtros
        </button>
      </div>
      {showFilters && (
        <div style={{ background: '#f0ede8', margin: '0 12px 8px', borderRadius: 10, padding: '12px 14px', border: '1px solid #e8e0d4' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ flex: '1 1 80px', borderRadius: 6, padding: '7px 10px', fontSize: 13, border: '1px solid #e8e0d4' }}>
              <option value="">Todas las tallas</option>
              {SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '2 1 160px' }}>
              <span style={{ fontSize: 11, color: '#9e8a6a', whiteSpace: 'nowrap' }}>Hasta Bs. {priceMax}</span>
              <input type="range" min={0} max={maxPrice} step={10} value={priceMax} onChange={e => setPriceMax(+e.target.value)} style={{ flex: 1 }} />
            </div>
            {hasFilter && <button onClick={() => { setFilterSize(''); setPriceMax(maxPrice) }} style={{ fontSize: 11, color: '#9e8a6a', background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Limpiar</button>}
          </div>
        </div>
      )}
    </>
  )

  if (mode === 'grid') return (
    <GridView
      products={queue} likedIds={likedIds} onToggleLike={toggleLike}
      onSwitchMode={switchMode} filterBar={filterBar}
      likedProducts={likedProducts} onRemoveLiked={removeLiked}
    />
  )

  // ── Swipe mode ────────────────────────────────────────────────────────────
  const current  = queue[index]
  const nextCard = queue[index + 1]
  const photos   = getPhotos(current)

  function animate(dir, cb) {
    setSwipeDir(dir)
    setTimeout(() => { setSwipeDir(null); setDrag({ active: false, x: 0, y: 0, startX: 0, startY: 0 }); cb() }, 320)
  }
  function advance() { setIndex(i => i + 1); setPhotoIdx(0) }
  function doLike() {
    if (!current) return
    vibe(15)
    recordInteraction(current.id, 'like')
    setLikedIds(prev => prev.includes(current.id) ? prev : [...prev, current.id])
    animate('right', advance)
  }
  function doSkip() {
    if (!current) return
    vibe(8)
    recordInteraction(current.id, 'skip')
    animate('left', advance)
  }
  function goBack() {
    if (index === 0) return
    animate('left', () => { setIndex(i => i - 1); setPhotoIdx(0) })
  }
  function restart() { setIndex(0); setPhotoIdx(0) }
  function onStart(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX
    const y = e.touches ? e.touches[0].clientY : e.clientY
    setDrag({ active: true, x: 0, startX: x, startY: y })
  }
  function onMove(e) {
    if (!dragRef.current.active) return
    const x = e.touches ? e.touches[0].clientX : e.clientX
    const y = e.touches ? e.touches[0].clientY : e.clientY
    setDrag(d => ({ ...d, x: x - d.startX, y: y - d.startY }))
  }
  function onEnd() {
    const { x, y } = dragRef.current
    const ax = Math.abs(x), ay = Math.abs(y)
    const forward  = (ax >= ay && x >  SWIPE_THRESHOLD) || (ay > ax && y < -SWIPE_THRESHOLD)
    const backward = (ax >= ay && x < -SWIPE_THRESHOLD) || (ay > ax && y >  SWIPE_THRESHOLD)
    if (forward) doLike()
    else if (backward) goBack()
    else setDrag(d => ({ ...d, active: false, x: 0, y: 0 }))
  }

  const dx     = swipeDir === 'left' ? -420 : swipeDir === 'right' ? 420 : drag.x
  const rot    = dx * 0.07
  const likeOp = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1)
  const skipOp = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1)

  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={removeLiked} />

  const currentColors = colorsArray(current?.color)

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, fontWeight: 700 }}>Vestilo a tu sonso!</div>
          <div style={{ color: '#9e8a6a', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>Santa Cruz · Bolivia</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? '#f5e6c8' : 'transparent', color: showFilters ? '#1a1209' : '#9e8a6a', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {hasFilter && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilters ? '#1a1209' : '#f5e6c8', display: 'inline-block' }} />}
            Filtros
          </button>
          <button onClick={switchMode} style={{ background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#9e8a6a', cursor: 'pointer' }}>Ver todo</button>
          <button onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CartHeart liked={likedProducts.length > 0} size={18} color="#9e8a6a" />
            {likedProducts.length > 0 && <span style={{ background: '#f5e6c8', color: '#1a1209', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedProducts.length}</span>}
          </button>
        </div>
      </div>

      {/* Search */}
      {searchBar(true)}

      {/* Location */}
      <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
        <span style={{ fontSize: 10, color: '#9e8a6a', letterSpacing: 0.5 }}>📍 Centro, calle Charcas · Retiro en ~1h · Lun–Sáb 10–18h</span>
      </div>

      {/* Promo */}
      <PromoBanner dark />

      {/* Filters */}
      {showFilters && (
        <div style={{ background: '#241810', margin: '0 12px 8px', borderRadius: 10, padding: '12px 14px', border: '1px solid #3d3020' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ flex: '1 1 80px', background: '#1a1209', color: '#f5e6c8', border: '1px solid #3d3020', borderRadius: 6, padding: '7px 10px', fontSize: 13 }}>
              <option value="">Talla</option>
              {SIZES.map(s => <option key={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '2 1 160px' }}>
              <span style={{ fontSize: 11, color: '#9e8a6a', whiteSpace: 'nowrap' }}>Hasta Bs. {priceMax}</span>
              <input type="range" min={0} max={maxPrice} step={10} value={priceMax} onChange={e => setPriceMax(+e.target.value)} style={{ flex: 1 }} />
            </div>
            {hasFilter && <button onClick={() => { setFilterSize(''); setPriceMax(maxPrice) }} style={{ fontSize: 11, color: '#9e8a6a', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Limpiar</button>}
          </div>
        </div>
      )}

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', paddingBottom: 130 }}>
        {!current ? (
          <div style={{ textAlign: 'center', color: '#9e8a6a', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 20, marginBottom: 8 }}>¡Eso es todo!</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>{likedProducts.length > 0 ? `Tenés ${likedProducts.length} prenda${likedProducts.length !== 1 ? 's' : ''} en tu lista` : 'No había prendas con esos filtros'}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={restart} style={{ background: 'transparent', color: '#f5e6c8', border: '1px solid #3d3020', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>Ver de nuevo</button>
              {likedProducts.length > 0 && <button onClick={() => setShowLiked(true)} style={{ background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver lista de compra ({likedProducts.length})</button>}
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 380, position: 'relative', height: 520 }}>
            {nextCard && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: 'scale(0.95) translateY(10px)', zIndex: 1 }}>
                {getPhotos(nextCard)[0]
                  ? <img src={getPhotos(nextCard)[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: 0.3 }}>👕</div>}
              </div>
            )}
            {/* Drag wrapper */}
            <div
              onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
              onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
              style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: `translateX(${dx}px) rotate(${rot}deg)`, transition: swipeDir ? 'transform 0.32s ease' : drag.active ? 'none' : 'transform 0.25s ease', cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'none', filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.55))' }}>

              {/* ── PHOTO SLIDES ── */}
              {photoIdx < photos.length ? (<>
                {photos.length > 0
                  ? <img src={photos[photoIdx]} alt={current.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100 }}>👕</div>}

                {/* Slide dots — photos + description */}
                <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                  {[...photos, 'desc'].map((_, i) => (
                    <div key={i} style={{ height: 3, width: i === photoIdx ? 20 : 6, borderRadius: i === photos.length ? 1 : 2, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'width 0.2s' }} />
                  ))}
                </div>

                {/* Nav zones */}
                <div onClick={e => { e.stopPropagation(); setPhotoIdx(p => Math.max(p - 1, 0)) }} style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '80%', zIndex: 3, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  {photoIdx > 0 && <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.6)', lineHeight: 1 }}>‹</span>}
                </div>
                <div onClick={e => { e.stopPropagation(); setPhotoIdx(p => Math.min(p + 1, photos.length)) }} style={{ position: 'absolute', right: 0, top: 0, width: '30%', height: '80%', zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8 }}>
                  <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.6)', lineHeight: 1 }}>›</span>
                </div>

                {likeOp > 0.1 && <div style={{ position: 'absolute', top: 32, left: 20, border: '3px solid #4CAF50', borderRadius: 6, padding: '4px 10px', opacity: likeOp, transform: 'rotate(-12deg)' }}><span style={{ color: '#4CAF50', fontWeight: 800, fontSize: 22, fontFamily: "'Playfair Display', serif", letterSpacing: 2 }}>ME GUSTA</span></div>}
                {skipOp > 0.1 && <div style={{ position: 'absolute', top: 32, right: 20, border: '3px solid #ef5350', borderRadius: 6, padding: '4px 10px', opacity: skipOp, transform: 'rotate(12deg)' }}><span style={{ color: '#ef5350', fontWeight: 800, fontSize: 22, fontFamily: "'Playfair Display', serif", letterSpacing: 2 }}>ATRÁS</span></div>}

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '40px 16px 16px', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Talla {current.size}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#f5e6c8' }}>Bs. {current.price}</span>
                  </div>
                </div>
              </>) : (
              /* ── DESCRIPTION SLIDE ── */
              <div style={{ position: 'absolute', inset: 0, background: '#1a1209', display: 'flex', flexDirection: 'column', padding: '22px 20px 18px' }}>
                {/* Slide dots */}
                <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                  {[...photos, 'desc'].map((_, i) => (
                    <div key={i} style={{ height: 3, width: i === photoIdx ? 20 : 6, borderRadius: i === photos.length ? 1 : 2, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'width 0.2s' }} />
                  ))}
                </div>

                {/* Back nav zone */}
                <div onClick={e => { e.stopPropagation(); setPhotoIdx(p => Math.max(p - 1, 0)) }} style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '80%', zIndex: 3, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ fontSize: 22, color: 'rgba(255,255,255,0.35)', lineHeight: 1 }}>‹</span>
                </div>

                <div style={{ fontSize: 10, color: '#9e8a6a', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>Descripción</div>
                <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
                {current.cat && <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#3d3020', color: '#c4b9a8', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', borderRadius: 4, padding: '3px 8px', marginBottom: 14 }}>{current.cat}</span>}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                  {current.notes
                    ? <p style={{ color: '#c4b9a8', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{current.notes}</p>
                    : <p style={{ color: '#9e8a6a', fontSize: 13, fontStyle: 'italic', margin: 0 }}>Sin descripción</p>}
                </div>
                <div style={{ borderTop: '1px solid #3d3020', paddingTop: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ background: '#3d3020', color: '#f5e6c8', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>Talla {current.size}</span>
                    <span style={{ background: '#3d3020', color: '#f5e6c8', borderRadius: 6, padding: '5px 10px', fontSize: 13, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>Bs. {current.price}</span>
                    {currentColors.map(c => (
                      <span key={c} style={{ background: '#3d3020', color: '#f5e6c8', borderRadius: 6, padding: '5px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_DOTS[c] || '#ccc', display: 'inline-block' }} />{c}
                      </span>
                    ))}
                  </div>
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Me interesa la camiseta *"${current.name}"* (Bs. ${current.price}, talla ${current.size}). ¿Está disponible?`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 10, padding: '12px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                    {WA_SVG} Preguntar por WhatsApp
                  </a>
                  <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#9e8a6a' }}>Deslizá para decidir · ‹ volver a fotos</div>
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons — full size centred on photo slides, small side pills on description slide */}
      {current && (photoIdx < photos.length ? (
        <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <button onClick={doLike} className="action-btn"
            style={{ width: 68, height: 68, background: '#241810', border: '2px solid #4CAF50', color: '#4CAF50', boxShadow: '0 4px 22px rgba(76,175,80,0.32)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CartHeart liked size={26} />
            <span style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#4CAF50' }}>me gusta</span>
          </button>
        </div>
      ) : (
        <>
          <button onClick={doLike} className="action-btn"
            style={{ position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, background: '#241810', border: '2px solid #4CAF50', color: '#4CAF50', boxShadow: '0 2px 12px rgba(76,175,80,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <CartHeart liked size={20} />
          </button>
        </>
      ))}
      {queue.length > 0 && current && photoIdx < photos.length && (
        <div style={{ position: 'fixed', bottom: 106, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#9e8a6a' }}>{index + 1} / {queue.length}</span>
        </div>
      )}

    </div>
  )
}
