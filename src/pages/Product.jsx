import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { WA_NUMBER, COLOR_DOTS, waMessage, colorsArray } from '../lib/constants.js'
import Header from '../components/Header.jsx'
import { ArrowLeft, ChevL, ChevR, Heart, Whatsapp, Placeholder } from '../components/AtelierIcons.jsx'
import { StatusBadge } from '../components/AtelierBits.jsx'

const STORAGE_KEY = 'vestilo-liked'
function getLiked() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function saveLiked(ids) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)) } catch {} }

export default function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [likedIds, setLikedIds] = useState(getLiked)

  useEffect(() => {
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => { setProduct(data); setLoading(false) })
  }, [id])

  function toggleLike() {
    setLikedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      saveLiked(next)
      return next
    })
  }

  const isLiked = likedIds.includes(id)

  if (loading) return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner" />
      </div>
    </div>
  )

  if (!product) return (
    <div style={{ minHeight: '100vh' }}>
      <Header />
      <div style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: 'var(--ink2)' }}>Producto no encontrado.</p>
        <Link to="/" className="v-btn-ghost" style={{ marginTop: 16, display: 'inline-flex' }}>← Volver</Link>
      </div>
    </div>
  )

  const available = product.status === 'Disponible'
  const photos = product.photos?.length ? product.photos : product.photo_url ? [product.photo_url] : []
  const colors = colorsArray(product.color)
  const multi = photos.length > 1

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Header />

      <div className="v-detail">
        <div className="v-detail-bar">
          <Link to="/" className="v-back"><ArrowLeft size={16} /> Volver al catálogo</Link>
          <button className={'v-save' + (isLiked ? ' on' : '')} onClick={toggleLike}>
            <Heart size={16} filled={isLiked} /> {isLiked ? 'Guardado' : 'Guardar'}
          </button>
        </div>

        <div className="v-detail-grid">
          <div className="v-gallery">
            <div className="v-gallery-main">
              {photos.length > 0
                ? <img src={photos[activePhoto]} alt={product.name}
                    onClick={() => multi && setActivePhoto(p => (p + 1) % photos.length)}
                    style={{ cursor: multi ? 'pointer' : 'default' }} />
                : <Placeholder />}
              {multi && (
                <>
                  <button className="v-gnav v-gnav-l" onClick={() => setActivePhoto(p => (p - 1 + photos.length) % photos.length)}><ChevL size={20} /></button>
                  <button className="v-gnav v-gnav-r" onClick={() => setActivePhoto(p => (p + 1) % photos.length)}><ChevR size={20} /></button>
                  <div className="v-gdots">
                    {photos.map((_, i) => (
                      <button key={i} className={'v-gdot' + (i === activePhoto ? ' on' : '')} onClick={() => setActivePhoto(i)} />
                    ))}
                  </div>
                </>
              )}
            </div>
            {multi && (
              <div className="v-thumbs">
                {photos.map((url, i) => (
                  <button key={i} className={'v-thumb' + (i === activePhoto ? ' on' : '')} onClick={() => setActivePhoto(i)}>
                    <img src={url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="v-detail-info">
            {product.category && <div className="v-detail-cat">{product.category}</div>}
            <h1 className="v-detail-name">{product.name}</h1>
            <div className="v-detail-price">Bs. {product.price}</div>
            <div className="v-chips">
              <span className="v-chip">Talla {product.size}</span>
              {colors.map(c => (
                <span key={c} className="v-chip">
                  <span className="v-cdot" style={{ width: 10, height: 10, background: COLOR_DOTS[c] || '#ccc' }} />
                  {c}
                </span>
              ))}
            </div>
            {product.notes && <p className="v-notes">{product.notes}</p>}
            <div className="v-detail-status"><StatusBadge status={product.status} /></div>
            {available ? (
              <a
                className="v-wa-btn"
                href={`https://wa.me/${WA_NUMBER}?text=${waMessage(product)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => supabase.rpc('record_swipe', { p_product_id: product.id, p_type: 'wa' })}
              >
                <Whatsapp size={18} /> Consultar por WhatsApp
              </a>
            ) : (
              <div className="v-unavail">Esta prenda ya no está disponible</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
