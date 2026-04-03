import { useState, useCallback } from 'react'
import { markSold } from '../lib/supabase.js'

export function useSellModal() {
  const [sellProduct, setSellProduct] = useState(null)
  const [onSoldCallback, setOnSoldCallback] = useState(null)
  const open  = useCallback((p, onSold) => {
    setSellProduct(p)
    setOnSoldCallback(() => onSold)
  }, [])
  const close = useCallback(() => { setSellProduct(null); setOnSoldCallback(null) }, [])
  return { sellProduct, onSoldCallback, open, close }
}

export function SellModal({ product, onClose, onSold }) {
  const [soldPrice, setSoldPrice] = useState(product?.price || '')
  const [discount, setDiscount]   = useState(0)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  if (!product) return null

  const listPrice    = parseFloat(product.price) || 0
  const parsedSold   = parseFloat(soldPrice) || 0
  const parsedDisc   = parseFloat(discount) || 0
  const effectiveDisc = listPrice - parsedSold + parsedDisc
  const margin        = listPrice > 0 ? ((parsedSold - listPrice) / listPrice * 100).toFixed(1) : 0

  function handleSoldPriceChange(val) {
    setSoldPrice(val)
    const raw = parseFloat(val)
    if (!isNaN(raw) && !isNaN(listPrice)) {
      setDiscount(Math.max(0, listPrice - raw))
    }
  }

  function handleDiscountChange(val) {
    setDiscount(val)
    const raw = parseFloat(val)
    if (!isNaN(raw)) {
      setSoldPrice(Math.max(0, listPrice - raw))
    }
  }

  async function handleSave() {
    if (!parsedSold || parsedSold <= 0) {
      setError('Ingresa el precio de venta')
      return
    }
    setSaving(true)
    setError('')
    const { error: err } = await markSold(product.id, {
      sold_price: parsedSold,
      discount: parsedDisc,
    })
    setSaving(false)
    if (err) {
      setError('Error al guardar. Intenta de nuevo.')
      return
    }
    onSold?.({ ...product, status: 'Vendido', sold_price: parsedSold, discount: parsedDisc })
    onClose()
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, backdropFilter: 'blur(2px)'
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#faf8f5', borderRadius: '18px 18px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#c4b9a8' }} />
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#1a1209' }}>
            Registrar venta
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#9e8a6a', cursor: 'pointer' }}>✕</button>
        </div>

        {/* product summary */}
        <div style={{ display: 'flex', gap: 12, padding: '0 20px 16px', alignItems: 'center', borderBottom: '1px solid #e8e0d4', marginBottom: 16 }}>
          {product.photo_url
            ? <img src={product.photo_url} alt={product.name} style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e0d4', flexShrink: 0 }} />
            : <div style={{ width: 52, height: 52, background: '#f0ede8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>👕</div>
          }
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: '#1a1209' }}>{product.name}</div>
            <div style={{ fontSize: 12, color: '#9e8a6a', marginTop: 2 }}>Talla {product.size} · Precio catálogo: <strong style={{ color: '#1a1209' }}>Bs. {product.price}</strong></div>
            {product.bundle_label && (
              <div style={{ fontSize: 11, color: '#9e8a6a', marginTop: 2 }}>📦 {product.bundle_label}</div>
            )}
          </div>
        </div>

        {/* price inputs */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lblStyle}>Precio de venta (Bs.) *</label>
            <input
              type="number"
              value={soldPrice}
              onChange={e => handleSoldPriceChange(e.target.value)}
              style={{ fontSize: 18, fontWeight: 700, color: '#1a1209', padding: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#e8e0d4' }} />
            <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1 }}>o con descuento</div>
            <div style={{ flex: 1, height: 1, background: '#e8e0d4' }} />
          </div>

          <div>
            <label style={lblStyle}>Descuento aplicado (Bs.)</label>
            <input
              type="number"
              value={discount}
              onChange={e => handleDiscountChange(e.target.value)}
              min={0}
              placeholder="0"
            />
            <div style={{ fontSize: 11, color: '#9e8a6a', marginTop: 5 }}>
              Si das descuento, el precio de venta se ajusta automáticamente.
            </div>
          </div>

          {/* summary box */}
          <div style={{ background: '#f0ede8', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#3d3020' }}>
              <span>Precio catálogo</span>
              <span>Bs. {listPrice.toFixed(2)}</span>
            </div>
            {parsedDisc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#e65100' }}>
                <span>Descuento</span>
                <span>− Bs. {parsedDisc.toFixed(2)}</span>
              </div>
            )}
            <div style={{ height: 1, background: '#e8e0d4', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: parsedSold < listPrice ? '#c62828' : '#2e7d32', fontFamily: "'Playfair Display', serif" }}>
              <span>Precio de venta</span>
              <span>Bs. {parsedSold.toFixed(2)}</span>
            </div>
            {parsedSold !== listPrice && (
              <div style={{ fontSize: 11, color: parsedSold < listPrice ? '#c62828' : '#2e7d32', textAlign: 'right' }}>
                {parsedSold < listPrice ? `▼ ${Math.abs(margin)}% bajo el catálogo` : `▲ ${margin}% sobre el catálogo`}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%', padding: '14px', borderRadius: 10,
              background: '#1a1209', color: '#f5e6c8',
              border: 'none', fontSize: 15, fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            {saving
              ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: '#f5e6c8' }} />
              : '✓ Confirmar venta'
            }
          </button>
        </div>
      </div>
    </>
  )
}

const lblStyle = {
  fontSize: 11, color: '#9e8a6a', display: 'block',
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1
}
