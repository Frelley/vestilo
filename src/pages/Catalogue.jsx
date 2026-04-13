import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsSorted, supabase } from '../lib/supabase.js'
import { SIZES, COLOR_DOTS, WA_NUMBER, colorsArray } from '../lib/constants.js'

const SWIPE_THRESHOLD = 75
const STORAGE_KEY     = 'vestilo-liked'
const MODE_KEY        = 'vestilo-mode'
const ONBOARDING_KEY    = 'vestilo-onboarded'
const WA_ONBOARDING_KEY = 'vestilo-wa-onboarded'

function getOnboarded()    { try { return localStorage.getItem(ONBOARDING_KEY) === '1' } catch { return false } }
function saveOnboarded()   { try { localStorage.setItem(ONBOARDING_KEY, '1') } catch {} }
function getWaOnboarded()  { try { return localStorage.getItem(WA_ONBOARDING_KEY) === '1' } catch { return false } }
function saveWaOnboarded() { try { localStorage.setItem(WA_ONBOARDING_KEY, '1') } catch {} }
function getLiked()      { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function saveLiked(ids)  { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {} }
function getSavedMode()  { try { return localStorage.getItem(MODE_KEY) || null } catch { return null } }
function saveMode(m)     { try { localStorage.setItem(MODE_KEY, m) } catch {} }

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

// ── Spotlight Onboarding ──────────────────────────────────────────────────────
function SpotlightOnboarding({ steps, onDone }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect]       = useState(null)

  const step   = steps[stepIdx]
  const isLast = stepIdx === steps.length - 1

  useEffect(() => {
    if (!step?.ref?.current) { setRect(null); return }
    // Small delay ensures layout is settled (especially for bottom-fixed elements)
    const t = setTimeout(() => {
      const r = step.ref.current.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }, 50)
    return () => clearTimeout(t)
  }, [stepIdx])

  function next() {
    if (isLast) { onDone() } else { setStepIdx(i => i + 1) }
  }

  if (!step) return null

  const PAD  = 8
  const vw   = window.innerWidth
  const vh   = window.innerHeight
  const TW   = Math.min(vw - 32, 280)
  const TH   = 150   // estimated tooltip height
  const AS   = 10    // arrow size

  // Spotlight bounds
  const sTop  = rect ? rect.top    - PAD : vh / 2 - 20
  const sLeft = rect ? rect.left   - PAD : vw / 2 - 20
  const sW    = rect ? rect.width  + PAD * 2 : 40
  const sH    = rect ? rect.height + PAD * 2 : 40
  const sCx   = sLeft + sW / 2  // center x of spotlight
  const sCy   = sTop  + sH / 2  // center y of spotlight

  // Auto-decide: put tooltip above if element is in bottom half, below if top half
  const placeAbove = sCy > vh / 2

  let tooltipTop, tooltipLeft, arrowStyle

  if (placeAbove) {
    // Tooltip above spotlight, arrow points down toward element
    tooltipTop  = Math.max(8, sTop - TH - AS - 6)
    tooltipLeft = Math.min(Math.max(16, sCx - TW / 2), vw - TW - 16)
    const ax    = Math.max(AS + 4, Math.min(sCx - tooltipLeft - AS, TW - AS * 3))
    arrowStyle  = {
      position: 'absolute', bottom: -(AS * 2) + 1, left: ax,
      width: 0, height: 0,
      borderLeft:  `${AS}px solid transparent`,
      borderRight: `${AS}px solid transparent`,
      borderTop:   `${AS * 2}px solid #f5e6c8`,
    }
  } else {
    // Tooltip below spotlight, arrow points up toward element
    tooltipTop  = Math.min(sTop + sH + AS + 6, vh - TH - 8)
    tooltipLeft = Math.min(Math.max(16, sCx - TW / 2), vw - TW - 16)
    const ax    = Math.max(AS + 4, Math.min(sCx - tooltipLeft - AS, TW - AS * 3))
    arrowStyle  = {
      position: 'absolute', top: -(AS * 2) + 1, left: ax,
      width: 0, height: 0,
      borderLeft:   `${AS}px solid transparent`,
      borderRight:  `${AS}px solid transparent`,
      borderBottom: `${AS * 2}px solid #f5e6c8`,
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, pointerEvents: 'none' }}>
      <style>{`
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(245,230,200,0.55); }
          70%  { box-shadow: 0 0 0 14px rgba(245,230,200,0); }
          100% { box-shadow: 0 0 0 0 rgba(245,230,200,0); }
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Dark overlay with cutout */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && <rect x={sLeft} y={sTop} width={sW} height={sH} rx={10} ry={10} fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.8)" mask="url(#spotlight-mask)" />
      </svg>

      {/* Pulsing ring */}
      {rect && (
        <div style={{
          position: 'absolute', top: sTop, left: sLeft, width: sW, height: sH,
          borderRadius: 10, border: '2px solid rgba(245,230,200,0.9)',
          animation: 'pulse-ring 1.8s ease-out infinite', pointerEvents: 'none',
        }} />
      )}

      {/* Tooltip */}
      <div style={{
        position: 'absolute', top: tooltipTop, left: tooltipLeft, width: TW,
        background: '#f5e6c8', borderRadius: 14, padding: '14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        pointerEvents: 'all',
        animation: 'tooltip-in 0.25s ease',
      }}>
        {/* Arrow */}
        <div style={{ position: 'relative' }}>
          <div style={arrowStyle} />
        </div>

        {/* Progress dots */}
        {steps.length > 1 && (
          <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === stepIdx ? 16 : 6, height: 6, borderRadius: 3,
                background: i === stepIdx ? '#1a1209' : '#c4b9a8',
                transition: 'width 0.2s',
              }} />
            ))}
          </div>
        )}

        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#1a1209', marginBottom: 5 }}>
          {step.title}
        </div>
        <div style={{ fontSize: 12, color: '#3d3020', lineHeight: 1.55, marginBottom: 14 }}>
          {step.desc}
        </div>
        <button onClick={next} style={{
          width: '100%', padding: '9px', borderRadius: 8,
          background: '#1a1209', color: '#f5e6c8', border: 'none',
          fontSize: 13, fontWeight: 700, cursor: 'pointer',
        }}>
          {isLast ? '¡Entendido! ✓' : 'Siguiente →'}
        </button>
      </div>
    </div>
  )
}

// ── Mode picker ───────────────────────────────────────────────────────────────
function ModePicker({ onPick }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>Vestilo a tu sonso!</div>
      <div style={{ color: '#9e8a6a', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 48 }}>Santa Cruz · Bolivia</div>
      <div style={{ fontSize: 13, color: '#9e8a6a', marginBottom: 20, textAlign: 'center' }}>¿Cómo querés explorar?</div>
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 340 }}>
        {[
          { key: 'swipe', icon: '👆', label: 'Swipe', desc: 'Desliza una por una y guarda tus favoritas' },
          { key: 'grid',  icon: '🗂️', label: 'Catálogo', desc: 'Ve todas las prendas en una cuadrícula' },
        ].map(opt => (
          <button key={opt.key} onClick={() => onPick(opt.key)} style={{
            flex: 1, background: '#241810', border: '1px solid #3d3020', borderRadius: 16,
            padding: '28px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 36 }}>{opt.icon}</span>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: '#9e8a6a', textAlign: 'center', lineHeight: 1.5 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Liked list ────────────────────────────────────────────────────────────────
function LikedList({ likedProducts, onBack, onRemove }) {
  const waText  = likedProducts.map(p => `• ${p.name} — Talla ${p.size} — Bs. ${p.price}`).join('\n')
  const waUrl   = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Me interesan estas prendas:\n\n${waText}\n\n¿Están disponibles?`)}`
  const waBtnRef = useRef(null)
  const [showWaOnboarding, setShowWaOnboarding] = useState(false)

  // Trigger WA onboarding once, only when there are items
  useEffect(() => {
    if (likedProducts.length > 0 && !getWaOnboarded()) {
      setTimeout(() => setShowWaOnboarding(true), 350)
    }
  }, [])

  const waSteps = [{
    ref: waBtnRef,
    title: '¡Ya casi! Pedí por WhatsApp',
    desc: 'Tocá este botón para enviar tu lista de favoritas directo a la tienda. Se arma el mensaje automáticamente.',
  }]

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#9e8a6a', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700 }}>Mis favoritas ({likedProducts.length})</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        {likedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🤍</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, marginBottom: 8 }}>Todavía no guardaste nada</div>
            <div style={{ fontSize: 13 }}>Deslizá a la derecha las camisetas que te gusten</div>
          </div>
        ) : likedProducts.map(p => {
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
      </div>
      {likedProducts.length > 0 && (
        <div style={{ padding: '16px 16px 36px' }}>
          <a ref={waBtnRef} href={waUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
            {WA_SVG} Pedir por WhatsApp ({likedProducts.length})
          </a>
        </div>
      )}

      {showWaOnboarding && (
        <SpotlightOnboarding
          steps={waSteps}
          onDone={() => { setShowWaOnboarding(false); saveWaOnboarded() }}
        />
      )}
    </div>
  )
}

// ── Grid view ─────────────────────────────────────────────────────────────────
function GridView({ products, likedIds, onToggleLike, onSwitchMode, filterBar, likedProducts, onRemoveLiked, filterBtnRef, likedBtnRef }) {
  const navigate   = useNavigate()
  const [showLiked, setShowLiked] = useState(false)
  const likedCount = likedIds.length

  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={onRemoveLiked} />

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderBottom: '1px solid #e8e0d4', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1209' }}>Vestilo a tu sonso!</div>
          <div style={{ fontSize: 9, color: '#9e8a6a', letterSpacing: 2, textTransform: 'uppercase' }}>Santa Cruz · Bolivia</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button ref={filterBtnRef} onClick={() => {}} style={{ background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#9e8a6a', cursor: 'pointer' }}>
            Filtros
          </button>
          <button onClick={onSwitchMode} style={{ background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#9e8a6a', cursor: 'pointer' }}>👆</button>
          <button ref={likedBtnRef} onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>🤍</span>
            {likedCount > 0 && <span style={{ background: '#1a1209', color: '#f5e6c8', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedCount}</span>}
          </button>
        </div>
      </div>
      {filterBar}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: 12 }}>
        {products.map((p, pi) => {
          const photo = getPhotos(p)[0]
          const liked = likedIds.includes(p.id)
          return (
            <div key={p.id} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', border: '1px solid #e8e0d4', position: 'relative' }}>
              <div onClick={() => navigate(`/p/${p.id}`)} style={{ cursor: 'pointer' }}>
                {photo
                  ? <img src={photo} alt={p.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                  : <div style={{ aspectRatio: '3/4', background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>👕</div>}
                <div style={{ padding: '8px 10px 10px' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: '#1a1209', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#9e8a6a' }}>Talla {p.size}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#1a1209', marginTop: 4 }}>Bs. {p.price}</div>
                </div>
              </div>
              <button onClick={() => onToggleLike(p)} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, backdropFilter: 'blur(4px)' }}>
                {liked ? '❤️' : '🤍'}
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
        <div style={{ fontSize: 11, color: '#9e8a6a', marginTop: 8 }}>Retiro disponible · Coordinar por WhatsApp</div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Catalogue() {
  const [mode, setMode]           = useState(getSavedMode)
  const [products, setProducts]   = useState([])
  const [queue, setQueue]         = useState([])
  const [index, setIndex]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [likedIds, setLikedIds]   = useState(getLiked)
  const [showLiked, setShowLiked] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterSize, setFilterSize]   = useState('')
  const [priceMax, setPriceMax]       = useState(1000)
  const [maxPrice, setMaxPrice]       = useState(1000)
  const [drag, setDrag]           = useState({ active: false, x: 0, startX: 0, startY: 0 })
  const [swipeDir, setSwipeDir]   = useState(null)
  const [photoIdx, setPhotoIdx]   = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchIds, setSearchIds]         = useState(null)   // null = no search active
  const [isSearching, setIsSearching]     = useState(false)

  const dragRef = useRef(drag)
  dragRef.current = drag

  // Refs for onboarding targets
  const refLikeBtn    = useRef(null)
  const refSkipBtn    = useRef(null)
  const refFilterBtn  = useRef(null)
  const refLikedBtn   = useRef(null)
  const refCardArea   = useRef(null)

  // Grid refs
  const refGridFilter = useRef(null)
  const refGridLiked  = useRef(null)

  useEffect(() => { load() }, [])
  useEffect(() => { saveLiked(likedIds) }, [likedIds])
  useEffect(() => { setFlipped(false) }, [index])

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

  function pickMode(m) {
    setMode(m); saveMode(m)
    if (!getOnboarded()) {
      // slight delay so the UI renders first, then we measure rects
      setTimeout(() => setShowOnboarding(true), 350)
    }
  }
  function switchMode() { pickMode(mode === 'swipe' ? 'grid' : 'swipe') }
  function toggleLike(p) {
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

  // Onboarding steps per mode
  const swipeSteps = [
    { ref: refCardArea,  title: 'Deslizá la tarjeta',        desc: 'Deslizá a la derecha si te gusta, a la izquierda para pasar. También podés usar los botones de abajo.' },
    { ref: refLikeBtn,   title: '♥ Guardá favoritas',        desc: 'Tocá el corazón para agregar esta prenda a tu lista de favoritas.' },
    { ref: refSkipBtn,   title: '✕ Pasá a la siguiente',     desc: 'Tocá la X para ver la siguiente prenda sin guardarla.' },
    { ref: refFilterBtn, title: 'Filtrá por talla o precio', desc: 'Tocá "Filtros" para ver solo las prendas que te quedan y están dentro de tu presupuesto.' },
    { ref: refLikedBtn,  title: 'Tu lista de favoritas',     desc: 'Acá aparecen todas las que guardaste. Cuando termines, podés pedir todo junto por WhatsApp.' },
  ]

  const gridSteps = [
    { ref: refGridFilter, title: 'Filtrá por talla o precio', desc: 'Usá los filtros para encontrar rápido lo que buscás por talla o presupuesto.' },
    { ref: refGridLiked,  title: 'Guardá tus favoritas',      desc: 'Tocá el 🤍 en cualquier prenda para guardarla. Después podés pedir todo junto por WhatsApp.' },
  ]

  const onboardingSteps = mode === 'swipe' ? swipeSteps : gridSteps

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #3d3020', borderTopColor: '#f5e6c8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!mode) return <ModePicker onPick={pickMode} />

  const searchBar = (isDark) => (
    <div style={{ padding: '6px 12px 2px' }}>
      <form onSubmit={e => { e.preventDefault(); doSearch(searchQuery) }} style={{ display: 'flex', gap: 6 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Buscar con IA… ej: algo para el gym"
          style={{ flex: 1, background: isDark ? '#241810' : '#fff', color: isDark ? '#f5e6c8' : '#1a1209', border: `1px solid ${isDark ? '#3d3020' : '#e8e0d4'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', '::placeholder': { color: '#9e8a6a' } }}
        />
        {searchIds !== null ? (
          <button type="button" onClick={clearSearch} style={{ background: isDark ? '#3d3020' : '#f0ede8', color: isDark ? '#f5e6c8' : '#1a1209', border: 'none', borderRadius: 8, padding: '8px 12px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✕ Limpiar
          </button>
        ) : (
          <button type="submit" disabled={isSearching || !searchQuery.trim()} style={{ background: isDark ? '#f5e6c8' : '#1a1209', color: isDark ? '#1a1209' : '#f5e6c8', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', opacity: (!searchQuery.trim() || isSearching) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            {isSearching ? '…' : 'Buscar'}
          </button>
        )}
      </form>
      {searchIds !== null && (
        <div style={{ fontSize: 11, color: '#9e8a6a', padding: '4px 4px 2px' }}>
          {queue.length === 0 ? 'Sin resultados' : `${queue.length} resultado${queue.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )

  const filterBar = (
    <>
      {searchBar(false)}
      <div style={{ display: 'flex', gap: 8, padding: '6px 12px', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button onClick={() => setShowFilters(f => !f)} style={{ background: hasFilter ? '#f5e6c8' : 'transparent', color: hasFilter ? '#1a1209' : '#9e8a6a', border: `1px solid ${hasFilter ? '#c4b9a8' : '#e8e0d4'}`, borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
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
    <>
      <GridView
        products={queue} likedIds={likedIds} onToggleLike={toggleLike}
        onSwitchMode={switchMode} filterBar={filterBar}
        likedProducts={likedProducts} onRemoveLiked={removeLiked}
        filterBtnRef={refGridFilter} likedBtnRef={refGridLiked}
      />
      {showOnboarding && (
        <SpotlightOnboarding
          steps={gridSteps}
          onDone={() => { setShowOnboarding(false); saveOnboarded() }}
        />
      )}
    </>
  )

  // ── Swipe mode ────────────────────────────────────────────────────────────
  const current  = queue[index]
  const nextCard = queue[index + 1]
  const photos   = getPhotos(current)

  function animate(dir, cb) {
    setSwipeDir(dir)
    setTimeout(() => { setSwipeDir(null); setDrag({ active: false, x: 0, startX: 0, startY: 0 }); cb() }, 320)
  }
  function advance() { setIndex(i => i + 1); setPhotoIdx(0) }
  function doLike() {
    if (!current) return
    recordInteraction(current.id, 'like')
    setLikedIds(prev => prev.includes(current.id) ? prev : [...prev, current.id])
    animate('right', advance)
  }
  function doSkip() {
    if (!current) return
    recordInteraction(current.id, 'skip')
    animate('left', advance)
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
    setDrag(d => ({ ...d, x: x - d.startX }))
  }
  function onEnd() {
    const { x } = dragRef.current
    if (x > SWIPE_THRESHOLD) doLike()
    else if (x < -SWIPE_THRESHOLD) doSkip()
    else setDrag(d => ({ ...d, active: false, x: 0 }))
  }
  function onTap() {
    if (Math.abs(dragRef.current.x) < 8) {
      setFlipped(f => !f)
    }
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
          <button ref={refFilterBtn} onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? '#f5e6c8' : 'transparent', color: showFilters ? '#1a1209' : '#9e8a6a', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {hasFilter && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilters ? '#1a1209' : '#f5e6c8', display: 'inline-block' }} />}
            Filtros
          </button>
          <button onClick={switchMode} style={{ background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#9e8a6a', cursor: 'pointer' }}>🗂️</button>
          <button ref={refLikedBtn} onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>🤍</span>
            {likedIds.length > 0 && <span style={{ background: '#f5e6c8', color: '#1a1209', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedIds.length}</span>}
          </button>
        </div>
      </div>

      {/* Search */}
      {searchBar(true)}

      {/* Location */}
      <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
        <span style={{ fontSize: 10, color: '#5a4a35', letterSpacing: 0.5 }}>📍 Centro, calle Charcas · Retiro disponible</span>
      </div>

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
      <div ref={refCardArea} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', paddingBottom: 100 }}>
        {!current ? (
          <div style={{ textAlign: 'center', color: '#9e8a6a', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 20, marginBottom: 8 }}>¡Eso es todo!</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>{likedIds.length > 0 ? `Tenés ${likedIds.length} favorito${likedIds.length !== 1 ? 's' : ''} guardado${likedIds.length !== 1 ? 's' : ''}` : 'No había prendas con esos filtros'}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={restart} style={{ background: 'transparent', color: '#f5e6c8', border: '1px solid #3d3020', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>Ver de nuevo</button>
              {likedIds.length > 0 && <button onClick={() => setShowLiked(true)} style={{ background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver favoritos ({likedIds.length})</button>}
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
            {/* Drag wrapper — no overflow:hidden so 3D flip isn't clipped */}
            <div
              onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
              onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onClick={onTap}
              style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: 16, background: 'transparent', transform: `translateX(${dx}px) rotate(${rot}deg)`, transition: swipeDir ? 'transform 0.32s ease' : drag.active ? 'none' : 'transform 0.25s ease', cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'none', perspective: 1000 }}>
              {/* Flip inner */}
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, transformStyle: 'preserve-3d', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 0.42s ease' }}>

                {/* ── FRONT ── */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: '#241810' }}>
                  {photos.length > 0
                    ? <img src={photos[photoIdx]} alt={current.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
                    : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100 }}>👕</div>}
                  {photos.length > 1 && (
                    <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                      {photos.map((_, i) => <div key={i} style={{ height: 3, width: i === photoIdx ? 20 : 6, borderRadius: 2, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'width 0.2s' }} />)}
                    </div>
                  )}
                  {photos.length > 1 && (
                    <>
                      <div onClick={e => { e.stopPropagation(); setPhotoIdx(p => (p - 1 + photos.length) % photos.length) }} style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '80%', zIndex: 3 }} />
                      <div onClick={e => { e.stopPropagation(); setPhotoIdx(p => (p + 1) % photos.length) }} style={{ position: 'absolute', right: 0, top: 0, width: '30%', height: '80%', zIndex: 3 }} />
                    </>
                  )}
                  {likeOp > 0.1 && <div style={{ position: 'absolute', top: 32, left: 20, border: '3px solid #4CAF50', borderRadius: 6, padding: '4px 10px', opacity: likeOp, transform: 'rotate(-12deg)' }}><span style={{ color: '#4CAF50', fontWeight: 800, fontSize: 22, fontFamily: "'Playfair Display', serif", letterSpacing: 2 }}>ME GUSTA</span></div>}
                  {skipOp > 0.1 && <div style={{ position: 'absolute', top: 32, right: 20, border: '3px solid #ef5350', borderRadius: 6, padding: '4px 10px', opacity: skipOp, transform: 'rotate(12deg)' }}><span style={{ color: '#ef5350', fontWeight: 800, fontSize: 22, fontFamily: "'Playfair Display', serif", letterSpacing: 2 }}>PASAR</span></div>}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '40px 16px 16px', pointerEvents: 'none' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Talla {current.size}</span>
                      {currentColors.map(c => <span key={c} style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>)}
                      {currentColors.map(c => (
                        <span key={c} style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_DOTS[c] || '#ccc', display: 'inline-block' }} />{c}
                        </span>
                      ))}
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#f5e6c8' }}>Bs. {current.price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>Toca para ver descripción ↩</div>
                  </div>
                </div>

                {/* ── BACK ── */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: '#1a1209', transform: 'rotateY(180deg)', display: 'flex', flexDirection: 'column', padding: '22px 20px 18px' }}>
                  <div style={{ fontSize: 10, color: '#5a4a35', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Descripción</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
                  {current.cat && <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#3d3020', color: '#c4b9a8', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', borderRadius: 4, padding: '3px 8px', marginBottom: 14 }}>{current.cat}</span>}
                  <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                    {current.notes
                      ? <p style={{ color: '#c4b9a8', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{current.notes}</p>
                      : <p style={{ color: '#5a4a35', fontSize: 13, fontStyle: 'italic', margin: 0 }}>Sin descripción</p>}
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
                    <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: '#5a4a35' }}>Toca para volver · Deslizá para decidir</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {current && (
        <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center', zIndex: 10 }}>
          <button ref={refSkipBtn} onClick={doSkip}
            style={{ width: 56, height: 56, borderRadius: '50%', background: '#241810', border: '2px solid #ef5350', color: '#ef5350', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>✕</button>
          <button ref={refLikeBtn} onClick={doLike}
            style={{ width: 64, height: 64, borderRadius: '50%', background: '#241810', border: '2px solid #4CAF50', color: '#4CAF50', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>♥</button>
        </div>
      )}
      {queue.length > 0 && current && (
        <div style={{ position: 'fixed', bottom: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#9e8a6a' }}>{index + 1} / {queue.length}</span>
        </div>
      )}

      {showOnboarding && (
        <SpotlightOnboarding
          steps={swipeSteps}
          onDone={() => { setShowOnboarding(false); saveOnboarded() }}
        />
      )}
    </div>
  )
}
