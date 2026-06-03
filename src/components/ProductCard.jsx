import { Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { daysSince } from '../lib/constants.js'
import { StatusBadge } from './AtelierBits.jsx'
import { Placeholder } from './AtelierIcons.jsx'

function LazyImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!src) return
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setLoaded(true); obs.disconnect() } },
      { rootMargin: '200%' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [src])

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, background: 'var(--ph)' }}>
      {loaded && <img src={src} alt={alt} />}
    </div>
  )
}

export default function ProductCard({ product, admin = false, onStatusChange }) {
  const days = daysSince(product.created_at)
  const ageTone = days > 60 ? '#B23A2E' : days > 30 ? '#B25A1D' : '#3E6B45'
  const to = admin ? `/admin/upload/${product.id}` : `/p/${product.id}`

  return (
    <article className="va-card">
      <Link to={to} className="va-card-ph" style={{ display: 'block' }}>
        {product.photo_url ? <LazyImage src={product.photo_url} alt={product.name} /> : <Placeholder />}
        <StatusBadge status={product.status} />
      </Link>

      <div className="va-card-body">
        <div className="va-card-row">
          <Link to={to} className="va-card-name" style={{ textDecoration: 'none' }}>{product.name}</Link>
          {admin && (
            <span className="va-age" style={{ color: ageTone }}>
              <span className="va-age-dot" style={{ background: ageTone }} />
              {days === 0 ? 'hoy' : `${days}d`}
            </span>
          )}
        </div>
        <div className="va-card-meta">Talla {product.size} · Bs. {product.price}</div>

        {admin && onStatusChange && (
          <div className="va-quick">
            {product.status !== 'Disponible' && (
              <button className="va-q va-q-av" onClick={() => onStatusChange(product.id, 'Disponible')}>Disponible</button>
            )}
            {product.status !== 'Reservado' && (
              <button className="va-q va-q-re" onClick={() => onStatusChange(product.id, 'Reservado')}>Reservar</button>
            )}
            {product.status !== 'Vendido' && (
              <button className="va-q va-q-so" onClick={() => onStatusChange(product.id, 'Vendido')}>Vendido</button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
