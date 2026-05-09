import { useState, useRef } from 'react'
import { COLOR_DOTS, WA_NUMBER, colorsArray } from '../lib/constants.js'
import {
  SWIPE_THRESHOLD,
  getPhotos, recordInteraction, vibe,
} from '../lib/catalogueHelpers.js'
import CartHeart from './CartHeart.jsx'
import PromoBanner from './PromoBanner.jsx'
import LikedList from './LikedList.jsx'
import FlyParticle from './FlyParticle.jsx'
import FilterPanel from './FilterPanel.jsx'
import { WA_SVG } from './WhatsappIcon.jsx'

export default function SwipeView({
  queue,
  index, setIndex, photoIdx, setPhotoIdx,
  setLikedIds, likedProducts,
  onRemoveLiked, onSwitchMode,
  searchBar,
  showFilters, setShowFilters, hasFilter,
  filterSize, setFilterSize,
  priceMax, setPriceMax, maxPrice,
}) {
  const [drag, setDrag]         = useState({ active: false, x: 0, y: 0, startX: 0, startY: 0 })
  const [swipeDir, setSwipeDir] = useState(null)
  const [showLiked, setShowLiked] = useState(false)
  const [particles, setParticles] = useState([])
  const [glowCount, setGlowCount] = useState(0)
  const [showHint, setShowHint]   = useState(() => !localStorage.getItem('vestilo-hint-seen'))

  const dragRef    = useRef(drag)
  dragRef.current  = drag
  const dragY      = useRef(0)
  const cartBtnRef = useRef(null)
  const cardRef    = useRef(null)
  const containerRef = useRef(null)

  const current  = queue[index]
  const prevCard = queue[index === 0 ? queue.length - 1 : index - 1]
  const nextCard = queue[index >= queue.length - 1 ? 0 : index + 1]
  const photos   = getPhotos(current)

  function animate(dir, cb) {
    setSwipeDir(dir)
    setTimeout(() => { setSwipeDir(null); setDrag({ active: false, x: 0, y: 0, startX: 0, startY: 0 }); cb() }, 320)
  }
  function advance() { setIndex(i => (i >= queue.length - 1 ? 0 : i + 1)); setPhotoIdx(0) }
  function dismissHint() {
    if (showHint) { setShowHint(false); localStorage.setItem('vestilo-hint-seen', '1') }
  }
  function doLike() {
    if (!current) return
    dismissHint()
    vibe(15)
    recordInteraction(current.id, 'like')
    setLikedIds(prev => prev.includes(current.id) ? prev : [...prev, current.id])
    if (cardRef.current && cartBtnRef.current) {
      const from = cardRef.current.getBoundingClientRect()
      const to   = cartBtnRef.current.getBoundingClientRect()
      const id   = Date.now()
      const src  = photos[photoIdx] || null
      setParticles(p => [...p, { id, src, fromX: from.left + from.width / 2, fromY: from.top + from.height / 3, toX: to.left + to.width / 2, toY: to.top + to.height / 2 }])
      setTimeout(() => setParticles(p => p.filter(x => x.id !== id)), 700)
    }
    setGlowCount(n => n + 1)
    animate('left', advance)
  }
  function doSkip() {
    if (!current) return
    dismissHint()
    vibe(8)
    recordInteraction(current.id, 'skip')
    animate('left', advance)
  }
  function goBack() {
    animate('right', () => { setIndex(i => (i === 0 ? queue.length - 1 : i - 1)); setPhotoIdx(0) })
  }
  function restart() { setIndex(0); setPhotoIdx(0) }
  function onStart(e) {
    const x = e.touches ? e.touches[0].clientX : e.clientX
    const y = e.touches ? e.touches[0].clientY : e.clientY
    dragY.current = 0
    setDrag({ active: true, x: 0, y: 0, startX: x, startY: y })
  }
  function onMove(e) {
    if (!dragRef.current.active) return
    const x = e.touches ? e.touches[0].clientX : e.clientX
    const y = e.touches ? e.touches[0].clientY : e.clientY
    dragY.current = y - dragRef.current.startY
    setDrag(d => ({ ...d, x: x - d.startX }))
  }
  function onEnd() {
    const { x } = dragRef.current
    const y = dragY.current
    if      (x >  SWIPE_THRESHOLD) goBack()
    else if (x < -SWIPE_THRESHOLD) animate('left', advance)
    else if (Math.abs(x) < 10 && Math.abs(y) < 10) setPhotoIdx(p => p >= photos.length ? 0 : p + 1)
    else setDrag(d => ({ ...d, active: false, x: 0, y: 0 }))
  }

  const w      = containerRef.current?.offsetWidth ?? 420
  const dx     = swipeDir === 'left' ? -w : swipeDir === 'right' ? w : drag.x
  const transition = swipeDir ? 'transform 0.32s ease' : drag.active ? 'none' : 'transform 0.25s ease'
  const likeOp = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1)
  const skipOp = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1)

  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={onRemoveLiked} />

  const currentColors = colorsArray(current?.color)

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
        <div>
          <div style={{ fontFamily: "'Nunito', sans-serif", color: '#c8622e', fontSize: 16, fontWeight: 800 }}>Vestilo a tu sonso!</div>
          <div style={{ color: '#9e8a6a', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' }}>Santa Cruz · Bolivia</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowFilters(f => !f)} style={{ background: showFilters ? '#f5e6c8' : 'transparent', color: showFilters ? '#1a1209' : '#9e8a6a', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {hasFilter && <span style={{ width: 6, height: 6, borderRadius: '50%', background: showFilters ? '#1a1209' : '#f5e6c8', display: 'inline-block' }} />}
            Filtros
          </button>
          <button onClick={onSwitchMode} style={{ background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#9e8a6a', cursor: 'pointer' }}>Ver todo</button>
          <button ref={cartBtnRef} onClick={() => setShowLiked(true)} style={{ position: 'relative', background: 'transparent', border: '1px solid #3d3020', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {glowCount > 0 && <span key={glowCount} className="cart-glow-ring" />}
            <CartHeart liked={likedProducts.length > 0} size={18} color="#9e8a6a" />
            {likedProducts.length > 0 && <span style={{ background: '#f5e6c8', color: '#1a1209', borderRadius: 99, fontSize: 11, fontWeight: 700, minWidth: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{likedProducts.length}</span>}
          </button>
        </div>
      </div>

      {/* Search */}
      {searchBar}

      {/* Location */}
      <div style={{ textAlign: 'center', padding: '2px 0 4px' }}>
        <span style={{ fontSize: 10, color: '#9e8a6a', letterSpacing: 0.5 }}>📍 Centro, calle Charcas · Retiro en ~1h · Lun–Sáb 10–18h · Envíos disponibles en Santa Cruz</span>
      </div>

      {/* Promo */}
      <PromoBanner dark />

      {/* Filters */}
      {showFilters && (
        <FilterPanel dark
          filterSize={filterSize} setFilterSize={setFilterSize}
          priceMax={priceMax} setPriceMax={setPriceMax} maxPrice={maxPrice}
          hasFilter={hasFilter}
        />
      )}

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 16px', paddingBottom: 130 }}>
        {!current ? (
          <div style={{ textAlign: 'center', color: '#9e8a6a', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", color: '#f5e6c8', fontSize: 20, marginBottom: 8 }}>¡Eso es todo!</div>
            <div style={{ fontSize: 13, marginBottom: 24 }}>{likedProducts.length > 0 ? `Tenés ${likedProducts.length} prenda${likedProducts.length !== 1 ? 's' : ''} en tu lista` : 'No había prendas con esos filtros'}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={restart} style={{ background: 'transparent', color: '#f5e6c8', border: '1px solid #3d3020', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer' }}>Ver de nuevo</button>
              {likedProducts.length > 0 && <button onClick={() => setShowLiked(true)} style={{ background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Ver lista de compra ({likedProducts.length})</button>}
            </div>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: '100%', maxWidth: 380, position: 'relative', height: 520, overflow: 'hidden' }}>
            {/* Prev card — only mount when swiping right, avoiding snap-back artifact */}
            {prevCard && (swipeDir === 'right' || (drag.active && dx > 0)) && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: `translateX(calc(-100% + ${dx}px))`, transition, zIndex: 1 }}>
                {getPhotos(prevCard)[0]
                  ? <img src={getPhotos(prevCard)[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>👕</div>}
              </div>
            )}
            {/* Next card — only mount when swiping left, avoiding snap-back artifact */}
            {nextCard && (swipeDir === 'left' || (drag.active && dx < 0)) && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: `translateX(calc(100% + ${dx}px))`, transition, zIndex: 1 }}>
                {getPhotos(nextCard)[0]
                  ? <img src={getPhotos(nextCard)[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 80 }}>👕</div>}
              </div>
            )}
            {/* Current card */}
            <div
              ref={cardRef}
              onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
              onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={e => { e.preventDefault(); onEnd() }}
              style={{ position: 'absolute', inset: 0, zIndex: 2, borderRadius: 16, overflow: 'hidden', background: '#241810', transform: `translateX(${dx}px)`, transition, cursor: drag.active ? 'grabbing' : 'grab', touchAction: 'none', filter: 'drop-shadow(0 10px 40px rgba(0,0,0,0.55))' }}>

              {/* ── PHOTO SLIDES ── */}
              {photoIdx < photos.length ? (<>
                {photos.length > 0
                  ? <img src={photos[photoIdx]} alt={current.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} draggable={false} />
                  : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 100 }}>👕</div>}

                {/* Slide dots — photos + description */}
                <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                  {[...photos, 'desc'].map((_, i) => (
                    <div key={i} style={{ height: 3, width: 20, borderRadius: i === photos.length ? 1 : 2, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transform: `scaleX(${i === photoIdx ? 1 : 0.3})`, transformOrigin: 'center', transition: 'transform 0.2s' }} />
                  ))}
                </div>



                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))', padding: '40px 16px 16px', pointerEvents: 'none' }}>
                  <div style={{ fontFamily: "'Nunito', sans-serif", color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>Talla {current.size}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                    <span style={{ fontFamily: "'Nunito', sans-serif", fontSize: 15, fontWeight: 700, color: '#f5e6c8' }}>Bs. {current.price}</span>
                  </div>
                </div>
              </>) : (
              /* ── DESCRIPTION SLIDE ── */
              <div style={{ position: 'absolute', inset: 0, background: '#1a1209', display: 'flex', flexDirection: 'column', padding: '22px 20px 18px' }}>
                {/* Slide dots */}
                <div style={{ position: 'absolute', top: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4, pointerEvents: 'none' }}>
                  {[...photos, 'desc'].map((_, i) => (
                    <div key={i} style={{ height: 3, width: 20, borderRadius: i === photos.length ? 1 : 2, background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.4)', transform: `scaleX(${i === photoIdx ? 1 : 0.3})`, transformOrigin: 'center', transition: 'transform 0.2s' }} />
                  ))}
                </div>


                <div style={{ fontSize: 10, color: '#9e8a6a', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, marginTop: 20 }}>Descripción</div>
                <div style={{ fontFamily: "'Nunito', sans-serif", color: '#f5e6c8', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{current.name}</div>
                {current.cat && <span style={{ display: 'inline-block', alignSelf: 'flex-start', background: '#3d3020', color: '#c4b9a8', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', borderRadius: 4, padding: '3px 8px', marginBottom: 14 }}>{current.cat}</span>}
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
                  {current.notes
                    ? <p style={{ color: '#c4b9a8', fontSize: 14, lineHeight: 1.75, margin: 0 }}>{current.notes}</p>
                    : <p style={{ color: '#9e8a6a', fontSize: 13, fontStyle: 'italic', margin: 0 }}>Sin descripción</p>}
                </div>
                <div style={{ borderTop: '1px solid #3d3020', paddingTop: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ background: '#3d3020', color: '#f5e6c8', borderRadius: 6, padding: '5px 10px', fontSize: 12 }}>Talla {current.size}</span>
                    <span style={{ background: '#3d3020', color: '#f5e6c8', borderRadius: 6, padding: '5px 10px', fontSize: 13, fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>Bs. {current.price}</span>
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
      {showHint && current && photoIdx < photos.length && (
        <div style={{ position: 'fixed', bottom: 116, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9 }}>
          <span style={{ fontSize: 11, color: 'rgba(158,138,106,0.75)', letterSpacing: 0.5 }}>← pasar · guardar →</span>
        </div>
      )}
      {current && (photoIdx < photos.length ? (
        <div style={{ position: 'fixed', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20, zIndex: 10 }}>
          <button onClick={doSkip} className="action-btn"
            style={{ width: 52, height: 52, background: '#241810', border: '2px solid #3d3020', color: '#9e8a6a', boxShadow: '0 2px 12px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
            <span style={{ fontSize: 7, letterSpacing: 1, textTransform: 'uppercase' }}>pasar</span>
          </button>
          <button onClick={doLike} className="action-btn"
            style={{ position: 'relative', width: 68, height: 68, background: '#241810', border: '2px solid #c8622e', color: '#c8622e', boxShadow: '0 4px 22px rgba(200,98,46,0.32)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {glowCount > 0 && <span key={glowCount} className="cart-glow-ring" style={{ borderRadius: '50%' }} />}
            <CartHeart liked size={26} />
            <span style={{ fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: '#c8622e' }}>me gusta</span>
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

      {particles.map(p => <FlyParticle key={p.id} {...p} />)}

      {/* Preload remaining photos of current shirt */}
      {photos.map((src, i) => i !== photoIdx && <img key={src} src={src} style={{ display: 'none' }} alt="" />)}
    </div>
  )
}
