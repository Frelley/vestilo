import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProductsSorted, supabase } from '../lib/supabase.js'
import { SIZES, COLOR_DOTS, WA_NUMBER } from '../lib/constants.js'

const SWIPE_THRESHOLD = 75
const STORAGE_KEY = 'vestilo-liked'
const MODE_KEY = 'vestilo-mode'

function getLiked() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveLiked(ids) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {}
}
function getSavedMode() {
  try { return localStorage.getItem(MODE_KEY) || null } catch { return null }
}
function saveMode(m) {
  try { localStorage.setItem(MODE_KEY, m) } catch {}
}

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

function ModePicker({ onPick }) {
  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>Vestilo a tu sonso</div>
      <div style={{ color: '#9e8a6a', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 48 }}>Santa Cruz · Bolivia</div>
      <div style={{ fontSize: 13, color: '#9e8a6a', marginBottom: 20, textAlign: 'center' }}>¿Cómo querés explorar?</div>
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 340 }}>
        {[
          { key: 'swipe', icon: '👆', label: 'Swipe', desc: 'Desliza una por una y guarda tus favoritas' },
          { key: 'grid', icon: '🗂️', label: 'Catálogo', desc: 'Ve todas las prendas en una cuadrícula' },
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

function LikedList({ likedProducts, onBack, onRemove, emptyMsg }) {
  const [selected, setSelected] = useState([])
  const toggleSelect = id => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  function sendCart() {
    const items = likedProducts.filter(p => selected.includes(p.id))
    if (!items.length) return
    const lines = items.map(p => `• ${p.name} — Talla ${p.size}, Bs. ${p.price}`).join('\n')
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Me interesan estas camisetas:\n\n${lines}\n\n¿Están disponibles?`)}`, '_blank')
  }
  return (
    <div style={{ minHeight: '100vh', background: '#1a1209' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #3d3020' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#9e8a6a', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700, flex: 1 }}>Mis favoritos</div>
        <span style={{ fontSize: 12, color: '#9e8a6a' }}>{likedProducts.length} prenda{likedProducts.length !== 1 ? 's' : ''}</span>
      </div>
      {likedProducts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🤍</div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, marginBottom: 8 }}>Aún no tienes favoritos</div>
          <div style={{ fontSize: 13, marginBottom: 24 }}>{emptyMsg}</div>
          <button onClick={onBack} style={{ background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Seguir explorando</button>
        </div>
      ) : (
        <>
          <div style={{ padding: '10px 16px 4px', fontSize: 12, color: '#9e8a6a' }}>Selecciona las que quieres comprar</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '8px 16px 120px' }}>
            {likedProducts.map(p => {
              const isSel = selected.includes(p.id)
              const ph = getPhotos(p)
              return (
                <div key={p.id} onClick={() => toggleSelect(p.id)} style={{ background: isSel ? '#2d1f0e' : '#241810', border: `2px solid ${isSel ? '#f5e6c8' : '#3d3020'}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
                  {ph[0] ? <img src={ph[0]} alt={p.name} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
                    : <div style={{ height: 140, background: '#3d3020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>👕</div>}
                  {isSel && <div style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%', background: '#f5e6c8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✓</div>}
                  <div style={{ padding: '8px 10px 10px' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: '#f5e6c8', marginBottom: 2, lineHeight: 1.3 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#9e8a6a', marginBottom: 4 }}>Talla {p.size}{p.color ? ` · ${p.color}` : ''}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: '#f5e6c8' }}>Bs. {p.price}</div>
                    <button onClick={e => { e.stopPropagation(); onRemove(p.id); setSelected(s => s.filter(x => x !== p.id)) }}
                      style={{ marginTop: 6, fontSize: 10, color: '#9e8a6a', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Quitar</button>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1a1209', borderTop: '1px solid #3d3020', padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#9e8a6a', flex: 1 }}>{selected.length === 0 ? 'Selecciona prendas' : `${selected.length} seleccionada${selected.length !== 1 ? 's' : ''}`}</div>
            <button onClick={() => setSelected(likedProducts.map(p => p.id))} style={{ fontSize: 12, color: '#9e8a6a', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>Todas</button>
            <button onClick={sendCart} disabled={selected.length === 0}
              style={{ background: selected.length > 0 ? '#25D366' : '#3d3020', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: selected.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
              {WA_SVG} Pedir por WhatsApp
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function GridView({ products, likedIds, onToggleLike, onSwitchMode, filterBar, likedProducts, onRemoveLiked }) {
  const navigate = useNavigate()
  const [showLiked, setShowLiked] = useState(false)
  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={onRemoveLiked} emptyMsg="Toca el corazón en las prendas que te gusten" />
  return (
    <div style={{ minHeight: '100vh', background: '#1a1209' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #3d3020' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, fontWeight: 700 }}>Vestilo a tu sonso</div>
          <div style={{ color: '#9e8a6a', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>Santa Cruz · Bolivia</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onSwitchMode} title="Modo swipe" style={{ background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#9e8a6a', cursor: 'pointer' }}>👆</button>
          <button onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>🤍</span>
            {likedIds.length > 0 && <span style={{ background: '#f5e6c8', color: '#1a1209', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedIds.length}</span>}
          </button>
        </div>
      </div>
      {filterBar}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '12px 12px 32px' }}>
        {products.map(p => {
          const ph = getPhotos(p)
          const isLiked = likedIds.includes(p.id)
          return (
            <div key={p.id} onClick={() => navigate(`/p/${p.id}`)} style={{ background: '#241810', border: '1px solid #3d3020', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                {ph[0] ? <img src={ph[0]} alt={p.name} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                  : <div style={{ height: 180, background: '#3d3020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>👕</div>}
                <button onClick={e => { e.stopPropagation(); onToggleLike(p) }} style={{
                  position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%',
                  background: isLiked ? '#f5e6c8' : 'rgba(26,18,9,0.6)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                }}>{isLiked ? '❤️' : '🤍'}</button>
              </div>
              <div style={{ padding: '10px 10px 12px' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: '#f5e6c8', marginBottom: 3, lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#9e8a6a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Talla {p.size}</span>
                  {p.color && <><span style={{ color: '#3d3020' }}>·</span><span style={{ width: 7, height: 7, borderRadius: '50%', background: COLOR_DOTS[p.color] || '#ccc', display: 'inline-block', flexShrink: 0 }} /><span>{p.color}</span></>}
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#f5e6c8' }}>Bs. {p.price}</div>
              </div>
            </div>
          )
        })}
        {products.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👕</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16 }}>No hay prendas disponibles</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Catalogue() {
  const [mode, setMode] = useState(getSavedMode)
  const [products, setProducts] = useState([])
  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState(getLiked)
  const [showLiked, setShowLiked] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filterSize, setFilterSize] = useState('')
  const [priceMax, setPriceMax] = useState(1000)
  const [maxPrice, setMaxPrice] = useState(1000)
  const [drag, setDrag] = useState({ active: false, x: 0, startX: 0, startY: 0 })
  const [swipeDir, setSwipeDir] = useState(null)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const dragRef = useRef(drag)
  dragRef.current = drag

  useEffect(() => { load() }, [])
  useEffect(() => { saveLiked(likedIds) }, [likedIds])

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
      if (filterSize && p.size !== filterSize) return false
      if (p.price > priceMax) return false
      return true
    })
    setQueue(filtered); setIndex(0); setPhotoIdx(0); setFlipped(false)
  }, [filterSize, priceMax, products])

  function pickMode(m) { setMode(m); saveMode(m) }
  function switchMode() { pickMode(mode === 'swipe' ? 'grid' : 'swipe') }
  function toggleLike(p) {
    setLikedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])
    recordInteraction(p.id, likedIds.includes(p.id) ? 'skip' : 'like')
  }
  function removeLiked(id) { setLikedIds(prev => prev.filter(x => x !== id)) }

  const likedProducts = products.filter(p => likedIds.includes(p.id))
  const hasFilter = filterSize || priceMax < maxPrice

  if (!mode) return <ModePicker onPick={pickMode} />

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ borderColor: '#3d3020', borderTopColor: '#f5e6c8' }} />
    </div>
  )

  const filterBar = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px 4px' }}>
        <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? '#f5e6c8' : 'transparent', color: showFilters ? '#1a1209' : '#9e8a6a', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
          {hasFilter && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilters ? '#1a1209' : '#f5e6c8', display: 'inline-block' }} />}
          Filtros
        </button>
        {hasFilter && (
          <button onClick={() => { setFilterSize(''); setPriceMax(maxPrice) }}
            style={{ fontSize: 11, color: '#9e8a6a', background: 'rgba(26,18,9,0.6)', border: '1px solid #3d3020', borderRadius: 99, padding: '4px 10px', cursor: 'pointer' }}>
            {filterSize || `Bs. ≤${priceMax}`} ✕
          </button>
        )}
      </div>
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
    </>
  )

  if (mode === 'grid') return (
    <GridView products={queue} likedIds={likedIds} onToggleLike={toggleLike} onSwitchMode={switchMode} filterBar={filterBar} likedProducts={likedProducts} onRemoveLiked={removeLiked} />
  )

  const current = queue[index]
  const nextCard = queue[index + 1]
  const photos = getPhotos(current)

  function animate(dir, cb) {
    setSwipeDir(dir)
    setTimeout(() => { setSwipeDir(null); setDrag({ active: false, x: 0, startX: 0, startY: 0 }); cb() }, 320)
  }
  function advance() { setIndex(i => i + 1); setPhotoIdx(0); setFlipped(false) }
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
  function restart() { setIndex(0); setPhotoIdx(0); setFlipped(false) }
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
    if (Math.abs(dragRef.current.x) < 8) { setFlipped(f => !f); setPhotoIdx(0) }
  }

  const dx = swipeDir === 'left' ? -420 : swipeDir === 'right' ? 420 : drag.x
  const rot = dx * 0.07
  const likeOp = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1)
  const skipOp = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1)

  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={removeLiked} emptyMsg="Desliza a la derecha las camisetas que te gusten" />

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, fontWeight: 700 }}>Vestilo a tu sonso</div>
          <div style={{ color: '#9e8a6a', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>Santa Cruz · Bolivia</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? '#f5e6c8' : 'transparent', color: showFilters ? '#1a1209' : '#9e8a6a', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {hasFilter && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilters ? '#1a1209' : '#f5e6c8', display: 'inline-block' }} />}
            Filtros
          </button>
          <button onClick={switchMode} title="Ver catálogo" style={{ background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#9e8a6a', cursor: 'pointer' }}>🗂️</button>
          <button onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>🤍</span>
            {likedIds.length > 0 && <span style={{ background: '#f5e6c8', color: '#1a1209', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedIds.length}</span>}
          </button>
        </div>
      </div>

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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', paddingBottom: 100 }}>
        {!current ? (
          <div style={{ textAlign: 'center', color: '#9e8a6a', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 20, marginBottom: 8 }}>¡Eso es todo!</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>{likedIds.length > 0 ? `Tienes ${likedIds.length} favorito${likedIds.length !== 1 ? 's' : ''} guardado${likedIds.length !== 1 ? 's' : ''}` : 'No había prendas con esos filtros'}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={restart} style={{ background: 'transparent', color: '#f5e6c8', border: '1px solid #3d3020', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>Ver de nuevo</button>
              {likedIds.length > 0 && <button onClick={() => setShowLiked(true)} style={{ background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver favoritos ({likedIds.length})</button>}
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: 380, position: 'relative', height: 520 }}>
            {nextCard && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: 'scale(0.95) translateY(10px)', zIndex: 1 }}>
                {getPhotos(nextCard)[0] ? <img src={getPhotos(nextCard)[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80, opacity: 0.3 }}>👕</div>}
              </div>
            )}
            <div onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
              onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} onClick={onTap}
              style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: `translateX(${dx}px) rotate(${rot}deg)`, transition: swipeDir ? 'transform 0.32s ease' : drag.active ? 'none' : 'transform 0.25s ease', cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'none' }}>
              {!flipped ? (
                <>
                  {photos.length > 0 ? <img src={photos[photoIdx]} alt={current.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
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
                      {current.color && <><span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span><span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_DOTS[current.color] || '#ccc', display: 'inline-block' }} />{current.color}</span></>}
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: '#f5e6c8' }}>Bs. {current.price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>Toca para ver detalles</div>
                  </div>
                </>
              ) : (
                <div style={{ height: '100%', background: '#1a1209', padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>{current.cat}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 20, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{current.name}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Bs. {current.price}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 99, border: '1px solid #3d3020', color: '#f5e6c8' }}>Talla {current.size}</span>
                    {current.color && <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 99, border: '1px solid #3d3020', color: '#f5e6c8', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR_DOTS[current.color] || '#ccc' }} />{current.color}</span>}
                    {(current.styles || []).map(s => <span key={s} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 99, border: '1px solid #3d3020', color: '#9e8a6a' }}>{s}</span>)}
                  </div>
                  {photos.length > 1 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{photos.map((url, i) => <img key={i} src={url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #3d3020', opacity: 0.9 }} />)}</div>}
                  <div style={{ marginTop: 'auto', paddingTop: 16, fontSize: 11, color: '#9e8a6a', textAlign: 'center' }}>Toca para volver a la foto</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {current && (
        <div style={{ position: 'fixed', bottom: 24, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'center', zIndex: 10 }}>
          <button onClick={doSkip} style={{ width: 56, height: 56, borderRadius: '50%', background: '#241810', border: '2px solid #ef5350', color: '#ef5350', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>✕</button>
          <button onClick={doLike} style={{ width: 64, height: 64, borderRadius: '50%', background: '#241810', border: '2px solid #4CAF50', color: '#4CAF50', fontSize: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'} onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}>♥</button>
        </div>
      )}
      {queue.length > 0 && current && (
        <div style={{ position: 'fixed', bottom: 96, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#9e8a6a' }}>{index + 1} / {queue.length}</span>
        </div>
      )}
    </div>
  )
}
