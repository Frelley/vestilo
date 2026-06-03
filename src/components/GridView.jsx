import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getPhotos } from '../lib/catalogueHelpers.js'
import PromoBanner from './PromoBanner.jsx'
import LikedList from './LikedList.jsx'
import { Heart, Filter, SwipeIco, MapPin, Placeholder } from './AtelierIcons.jsx'
import { StatusBadge, ColorDots } from './AtelierBits.jsx'
import { colorsArray } from '../lib/constants.js'

export default function GridView({ products, likedIds, onToggleLike, onSwitchMode, filterBar, likedProducts, onRemoveLiked, setShowFilters, hasFilter }) {
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
    <div className="v-app">
      <header className="v-top">
        <div className="v-top-in">
          <Link to="/" className="v-wm">
            <div className="v-wm-name">Vestilo <em>a tu sonso</em></div>
            <div className="v-wm-sub">Santa Cruz · Bolivia</div>
          </Link>
          <div className="v-top-actions">
            <Link to="/admin" className="v-admin-link">Admin</Link>
            <button className={'v-ibtn' + (hasFilter ? ' on' : '')} onClick={() => setShowFilters(f => !f)} title="Filtros">
              <Filter size={17} />
              {hasFilter && <span className="v-ibtn-dot" />}
            </button>
            <button className="v-ibtn" onClick={onSwitchMode} title="Cambiar vista">
              <SwipeIco size={17} />
              <span className="v-mode-label">Swipe</span>
            </button>
            <button className="v-ibtn" onClick={() => setShowLiked(true)} title="Lista de compra">
              <Heart size={17} filled={likedCount > 0} />
              {likedCount > 0 && <span className="v-badge">{likedCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <div className="v-sub">
        {filterBar}
        <PromoBanner />
      </div>

      <div className="v-loc">
        <MapPin size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span><b>Centro, calle Charcas</b> · Retiro en ~1h · Lun–Sáb 10–18h · Envíos en Santa Cruz</span>
      </div>

      <div className="v-cat">
        {products.length === 0 ? (
          <div className="v-empty">
            <div className="v-empty-title">No hay prendas con esos filtros</div>
            <div className="v-empty-sub">Probá quitar algún filtro o limpiar la búsqueda.</div>
          </div>
        ) : (
          <div className="v-grid">
            {products.map((p) => {
              const photo = getPhotos(p)[0]
              const liked = likedIds.includes(p.id)
              const colors = colorsArray(p.color)
              const open = () => { sessionStorage.setItem('vestilo-scroll', String(window.scrollY)); navigate(`/p/${p.id}`) }
              return (
                <article key={p.id} className="v-card">
                  <div className="v-card-ph" onClick={open}>
                    {photo
                      ? <img src={photo} alt={p.name} />
                      : <Placeholder />}
                    <StatusBadge status={p.status} />
                    <button className={'v-card-heart' + (liked ? ' on' : '')}
                      onClick={e => { e.stopPropagation(); onToggleLike(p) }}>
                      <Heart size={17} filled={liked} />
                    </button>
                  </div>
                  <div className="v-card-body" onClick={open}>
                    <h3 className="v-card-name">{p.name}</h3>
                    <div className="v-card-meta">
                      <ColorDots color={p.color} />
                      <span>Talla {p.size}{colors.length ? ` · ${colors.join(', ')}` : ''}</span>
                    </div>
                    <div className="v-price">Bs. {p.price}</div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
