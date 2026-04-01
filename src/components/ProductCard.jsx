import { Link } from 'react-router-dom'
import { STATUS_STYLES, COLOR_DOTS, daysSince } from '../lib/constants.js'

export default function ProductCard({ product, admin = false, onStatusChange, onShare }) {
  const days = daysSince(product.created_at)
  const ageDotColor = days > 60 ? '#c62828' : days > 30 ? '#e65100' : '#2e7d32'
  const st = STATUS_STYLES[product.status] || STATUS_STYLES.Disponible

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Photo */}
      <Link to={admin ? `/admin/upload/${product.id}` : `/p/${product.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        {product.photo_url ? (
          <img
            src={product.photo_url}
            alt={product.name}
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <div style={{
            height: 200, background: '#f0ede8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 64, color: '#c4b9a8'
          }}>
            👕
          </div>
        )}
      </Link>

      {/* Info */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          <Link to={admin ? `/admin/upload/${product.id}` : `/p/${product.id}`} style={{
            fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700,
            color: '#1a1209', textDecoration: 'none', lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}>
            {product.name}
          </Link>

          {/* Share button — admin only */}
          {admin && onShare && (
            <button
              onClick={() => onShare(product)}
              title="Compartir por WhatsApp"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 6,
                border: '1px solid #e8e0d4', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, cursor: 'pointer', color: '#25D366',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              📤
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: '#9e8a6a', display: 'flex', alignItems: 'center', gap: 5 }}>
          {product.color && (
            <span style={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: COLOR_DOTS[product.color] || '#ccc',
              border: '1px solid rgba(0,0,0,0.1)', display: 'inline-block'
            }} />
          )}
          Talla {product.size}{product.color ? ` · ${product.color}` : ''}
        </div>

        <div style={{
          fontFamily: "'Playfair Display', serif", fontSize: 16,
          fontWeight: 700, color: '#1a1209', marginTop: 2
        }}>
          Bs. {product.price}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="badge" style={{ background: st.bg, color: st.color }}>
            {product.status}
          </span>

          {admin && (
            <span style={{ fontSize: 11, color: ageDotColor, display: 'flex', alignItems: 'center' }}>
              <span className="age-dot" style={{ background: ageDotColor }} />
              {days === 0 ? 'Hoy' : `${days}d`}
            </span>
          )}
        </div>

        {/* Admin quick actions */}
        {admin && onStatusChange && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
            {product.status !== 'Disponible' && (
              <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: '#2e7d32', flex: 1 }}
                onClick={() => onStatusChange(product.id, 'Disponible')}>
                Disponible
              </button>
            )}
            {product.status !== 'Vendido' && (
              <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: '#c62828', flex: 1 }}
                onClick={() => onStatusChange(product.id, 'Vendido')}>
                Vendido
              </button>
            )}
            {product.status !== 'Reservado' && (
              <button className="btn" style={{ fontSize: 11, padding: '3px 8px', color: '#e65100', flex: 1 }}
                onClick={() => onStatusChange(product.id, 'Reservado')}>
                Reservar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
