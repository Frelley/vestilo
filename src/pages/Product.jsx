import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { WA_NUMBER, COLOR_DOTS, STATUS_STYLES, waMessage, colorsArray } from '../lib/constants.js'
import Header from '../components/Header.jsx'

export default function Product() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data }) => { setProduct(data); setLoading(false) })
  }, [id])

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
        <p>Producto no encontrado.</p>
        <Link to="/" className="btn" style={{ marginTop: 16, display: 'inline-flex' }}>← Volver</Link>
      </div>
    </div>
  )

  const st = STATUS_STYLES[product.status] || STATUS_STYLES.Disponible
  const available = product.status === 'Disponible'
  const allPhotos = product.photos?.length ? product.photos : product.photo_url ? [product.photo_url] : []
  const colors = colorsArray(product.color)

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <Header />

      <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
        <Link to="/" style={{ fontSize: 13, color: '#9e8a6a', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
          ← Volver al catálogo
        </Link>

        <div className="card">
          {allPhotos.length > 0 ? (
            <div>
              <div style={{ position: 'relative' }}>
                <img
                  src={allPhotos[activePhoto]}
                  alt={product.name}
                  style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
                />
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => setActivePhoto(p => (p - 1 + allPhotos.length) % allPhotos.length)}
                      style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ‹
                    </button>
                    <button
                      onClick={() => setActivePhoto(p => (p + 1) % allPhotos.length)}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ›
                    </button>
                    <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
                      {allPhotos.map((_, i) => (
                        <button key={i} onClick={() => setActivePhoto(i)} style={{
                          width: i === activePhoto ? 16 : 6, height: 6,
                          borderRadius: 3, background: i === activePhoto ? '#fff' : 'rgba(255,255,255,0.5)',
                          border: 'none', cursor: 'pointer', padding: 0, transition: 'width 0.2s'
                        }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {allPhotos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto' }}>
                  {allPhotos.map((url, i) => (
                    <img key={i} src={url} alt="" onClick={() => setActivePhoto(i)}
                      style={{
                        width: 52, height: 52, objectFit: 'cover', borderRadius: 6,
                        cursor: 'pointer', flexShrink: 0,
                        border: i === activePhoto ? '2px solid #1a1209' : '2px solid transparent',
                        opacity: i === activePhoto ? 1 : 0.6
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ height: 300, background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 90 }}>
              👕
            </div>
          )}

          <div style={{ padding: 20 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#1a1209', marginBottom: 8, lineHeight: 1.3 }}>
              {product.name}
            </h1>

            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: '#1a1209', marginBottom: 14 }}>
              Bs. {product.price}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span style={{ fontSize: 13, padding: '5px 12px', borderRadius: 99, border: '1px solid #e8e0d4', color: '#1a1209', fontWeight: 500 }}>
                Talla {product.size}
              </span>
              {colors.map(c => (
                <span key={c} style={{ fontSize: 13, padding: '5px 12px', borderRadius: 99, border: '1px solid #e8e0d4', color: '#1a1209', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR_DOTS[c] || '#ccc', border: '1px solid rgba(0,0,0,0.1)' }} />
                  {c}
                </span>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <span className="badge" style={{ background: st.bg, color: st.color, fontSize: 12 }}>
                {product.status}
              </span>
            </div>

         {available ? (
              
                  <a href={`https://wa.me/${WA_NUMBER}?text=${waMessage(product)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wa btn"
                  style={{ display: 'flex', width: '100%', textDecoration: 'none' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white" style={{ flexShrink: 0 }}>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Consultar por WhatsApp
              </a>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', background: '#f5f5f5', borderRadius: 8, fontSize: 14, color: '#9e8a6a' }}>
                Este producto ya no está disponible
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
