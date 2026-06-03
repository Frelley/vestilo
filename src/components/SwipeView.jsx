import { useState, useRef } from 'react'
import { COLOR_DOTS, WA_NUMBER, colorsArray } from '../lib/constants.js'
import {
  SWIPE_THRESHOLD,
  getPhotos, recordInteraction, vibe,
} from '../lib/catalogueHelpers.js'
import LikedList from './LikedList.jsx'
import FlyParticle from './FlyParticle.jsx'
import FilterPanel from './FilterPanel.jsx'
import { Heart, Filter, GridIco, Whatsapp, Placeholder } from './AtelierIcons.jsx'

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
    else {
      // Two-step: first enable transition, then reset position — keeps snap-back animated
      setDrag(d => ({ ...d, active: false }))
      requestAnimationFrame(() => setDrag(d => ({ ...d, x: 0, y: 0 })))
    }
  }

  const w      = containerRef.current?.offsetWidth ?? 420
  const dx     = swipeDir === 'left' ? -w : swipeDir === 'right' ? w : drag.x
  const transition = swipeDir ? 'transform 0.32s ease' : drag.active ? 'none' : 'transform 0.25s ease'
  const likeOp = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1)
  const skipOp = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1)
  const rotate = drag.active && !swipeDir ? dx * 0.05 : 0

  if (showLiked) return <LikedList likedProducts={likedProducts} onBack={() => setShowLiked(false)} onRemove={onRemoveLiked} />

  const currentColors = colorsArray(current?.color)

  return (
    <div className="v-app v-app-swipe" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Header */}
      <header className="v-top">
        <div className="v-top-in">
          <div className="v-wm">
            <div className="v-wm-name">Vestilo <em>a tu sonso</em></div>
            <div className="v-wm-sub">Santa Cruz · Bolivia</div>
          </div>
          <div className="v-top-actions">
            <button className={'v-ibtn' + (hasFilter ? ' on' : '')} onClick={() => setShowFilters(f => !f)} title="Filtros">
              <Filter size={17} />
              {hasFilter && <span className="v-ibtn-dot" />}
            </button>
            <button className="v-ibtn" onClick={onSwitchMode} title="Ver catálogo">
              <GridIco size={17} />
              <span className="v-mode-label">Catálogo</span>
            </button>
            <button ref={cartBtnRef} className="v-ibtn" onClick={() => setShowLiked(true)} title="Lista de compra" style={{ position: 'relative' }}>
              {glowCount > 0 && <span key={glowCount} className="cart-glow-ring" />}
              <Heart size={17} filled={likedProducts.length > 0} />
              {likedProducts.length > 0 && <span className="v-badge">{likedProducts.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Search + filters */}
      <div className="v-sub">
        {searchBar}
        {showFilters && (
          <FilterPanel
            filterSize={filterSize} setFilterSize={setFilterSize}
            priceMax={priceMax} setPriceMax={setPriceMax} maxPrice={maxPrice}
            hasFilter={hasFilter}
          />
        )}
      </div>

      {/* Card area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', paddingBottom: 130 }}>
        {!current ? (
          <div className="v-swipe-end">
            <div className="v-swipe-end-mark">✦</div>
            <div className="v-swipe-end-title">¡Eso es todo por ahora!</div>
            <div className="v-swipe-end-sub">{likedProducts.length > 0 ? `Tenés ${likedProducts.length} prenda${likedProducts.length !== 1 ? 's' : ''} en tu lista` : 'No había prendas con esos filtros'}</div>
            <div className="v-swipe-end-actions">
              <button className="v-btn-ghost" onClick={restart}>Ver de nuevo</button>
              {likedProducts.length > 0 && <button className="v-btn-dark" onClick={() => setShowLiked(true)}>Ver lista ({likedProducts.length})</button>}
            </div>
          </div>
        ) : (
          <div ref={containerRef} style={{ width: '100%', maxWidth: 380, position: 'relative', height: 520, overflow: 'hidden' }}>
            {/* Prev card — only mount when swiping right */}
            {prevCard && (swipeDir === 'right' || (drag.active && dx > 0)) && (
              <div key={prevCard.id} className="v-swipe-card" style={{ transform: `translateX(calc(-100% + ${dx}px))`, transition, zIndex: 1 }}>
                {getPhotos(prevCard)[0]
                  ? <img src={getPhotos(prevCard)[0]} alt="" />
                  : <Placeholder />}
              </div>
            )}
            {/* Next card — stationary behind current */}
            {nextCard && (
              <div key={nextCard.id} className="v-swipe-card" style={{ zIndex: 1 }}>
                {getPhotos(nextCard)[0]
                  ? <img src={getPhotos(nextCard)[0]} alt="" />
                  : <Placeholder />}
              </div>
            )}
            {/* Current card */}
            <div
              key={current.id}
              ref={cardRef}
              className="v-swipe-card v-swipe-current"
              onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
              onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={e => { e.preventDefault(); onEnd() }}
              style={{ transform: `translateX(${dx}px) rotate(${rotate}deg)`, transition, cursor: drag.active ? 'grabbing' : 'grab' }}>

              {/* ── PHOTO SLIDES ── */}
              {photoIdx < photos.length ? (<>
                {photos.length > 0
                  ? <img src={photos[photoIdx]} alt={current.name} style={{ pointerEvents: 'none' }} draggable={false} />
                  : <Placeholder />}

                {/* Drag feedback overlays */}
                {skipOp > 0.05 && (
                  <div className="v-stamp v-stamp-skip" style={{ opacity: skipOp }}>PASAR</div>
                )}
                {likeOp > 0.05 && (
                  <div className="v-stamp v-stamp-back" style={{ opacity: likeOp }}>VOLVER</div>
                )}

                {/* Slide dots — photos + description */}
                <div className="v-swipe-dots">
                  {[...photos, 'desc'].map((_, i) => (
                    <i key={i} className={i === photoIdx ? 'on' : ''} />
                  ))}
                </div>

                <div className="v-swipe-ov">
                  <div className="v-swipe-name">{current.name}</div>
                  <div className="v-swipe-row">
                    <span className="v-swipe-size">Talla {current.size}</span>
                    <span className="v-swipe-dot-sep">·</span>
                    <span className="v-swipe-price">Bs. {current.price}</span>
                  </div>
                  <div className="v-swipe-tap">tocá para ver más fotos</div>
                </div>
              </>) : (
              /* ── DESCRIPTION SLIDE ── */
              <div className="v-swipe-desc">
                <div className="v-swipe-dots">
                  {[...photos, 'desc'].map((_, i) => (
                    <i key={i} className={i === photoIdx ? 'on' : ''} />
                  ))}
                </div>

                <div className="v-desc-eyebrow">Descripción</div>
                <div className="v-desc-name">{current.name}</div>
                {current.category && <span className="v-desc-cat">{current.category}</span>}
                <div className="v-desc-notes">
                  {current.notes
                    ? <p style={{ margin: 0 }}>{current.notes}</p>
                    : <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--muted)' }}>Sin descripción</p>}
                </div>
                <div className="v-desc-foot">
                  <div className="v-desc-chips">
                    <span className="v-desc-chip">Talla {current.size}</span>
                    <span className="v-desc-chip" style={{ fontFamily: 'var(--serif)', fontWeight: 500 }}>Bs. {current.price}</span>
                    {currentColors.map(c => (
                      <span key={c} className="v-desc-chip">
                        <span className="v-cdot" style={{ width: 8, height: 8, background: COLOR_DOTS[c] || '#ccc' }} />{c}
                      </span>
                    ))}
                  </div>
                  <a
                    className="v-wa-btn"
                    href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Me interesa la camiseta *"${current.name}"* (Bs. ${current.price}, talla ${current.size}). ¿Está disponible?`)}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}>
                    <Whatsapp size={18} /> Preguntar por WhatsApp
                  </a>
                  <div className="v-desc-back">Deslizá para decidir · ‹ volver a fotos</div>
                </div>
              </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint + action buttons */}
      {showHint && current && photoIdx < photos.length && (
        <div style={{ position: 'fixed', bottom: 116, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 9 }}>
          <span className="v-swipe-hint">← pasar · guardar →</span>
        </div>
      )}
      {current && (photoIdx < photos.length ? (
        <div className="v-swipe-actions">
          <button onClick={doSkip} className="v-act v-act-skip">
            <span style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
            <span>pasar</span>
          </button>
          <button onClick={doLike} className="v-act v-act-like" style={{ position: 'relative' }}>
            {glowCount > 0 && <span key={glowCount} className="cart-glow-ring" style={{ borderRadius: '50%' }} />}
            <Heart size={26} filled />
            <span>guardar</span>
          </button>
        </div>
      ) : (
        <button onClick={doLike} className="v-act v-act-like"
          style={{ position: 'fixed', right: 12, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, zIndex: 10 }}>
          <Heart size={20} filled />
        </button>
      ))}
      {queue.length > 0 && current && photoIdx < photos.length && (
        <div style={{ position: 'fixed', bottom: 106, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <span className="v-swipe-counter">{index + 1} / {queue.length}</span>
        </div>
      )}

      {particles.map(p => <FlyParticle key={p.id} {...p} />)}

      {/* Preload remaining photos of current shirt */}
      {photos.map((src, i) => i !== photoIdx && <img key={src} src={src} style={{ display: 'none' }} alt="" />)}
    </div>
  )
}
