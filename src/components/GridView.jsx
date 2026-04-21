import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPhotos } from '../lib/catalogueHelpers.js'
import CartHeart from './CartHeart.jsx'
import PromoBanner from './PromoBanner.jsx'
import LikedList from './LikedList.jsx'

export default function GridView({ products, likedIds, onToggleLike, onSwitchMode, filterBar, likedProducts, onRemoveLiked }) {
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
        <div style={{ fontSize: 11, color: '#7a6651', marginTop: 8 }}>Retiro en ~1h · Lun–Sáb 10–18h · Envíos disponibles en Santa Cruz</div>
      </div>
    </div>
  )
}
