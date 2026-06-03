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
        position: 'fixed', inset: 0, background: 'rgba(21,16,10,0.5)', zIndex: 200, backdropFilter: 'blur(2px)'
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: 'var(--paper)', borderRadius: '4px 4px 0 0',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(21,16,10,0.18)', borderTop: '1px solid var(--line)',
      }}>
        {/* drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--line)' }} />
        </div>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 21, fontWeight: 500, color: 'var(--ink)' }}>
            Registrar venta
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
        </div>

        {/* product summary */}
        <div style={{ display: 'flex', gap: 12, padding: '0 20px 16px', alignItems: 'center', borderBottom: '1px solid var(--line)', marginBottom: 16 }}>
          {product.photo_url
            ? <img src={product.photo_url} alt={product.name} style={{ width: 52, height: 64, objectFit: 'cover', border: '1px solid var(--line)', flexShrink: 0 }} />
            : <div style={{ width: 52, height: 64, background: 'var(--ph)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>👕</div>
          }
          <div>
            <div style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 16, color: 'var(--ink)' }}>{product.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Talla {product.size} · Precio catálogo: <strong style={{ color: 'var(--ink)' }}>Bs. {product.price}</strong></div>
            {product.bundle_label && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>📦 {product.bundle_label}</div>
            )}
          </div>
        </div>

        {/* price inputs */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="va-field">
            <label>Precio de venta (Bs.) *</label>
            <input
              type="number"
              value={soldPrice}
              onChange={e => handleSoldPriceChange(e.target.value)}
              style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', padding: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>o con descuento</div>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <div className="va-field">
            <label>Descuento aplicado (Bs.)</label>
            <input
              type="number"
              value={discount}
              onChange={e => handleDiscountChange(e.target.value)}
              min={0}
              placeholder="0"
            />
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>
              Si das descuento, el precio de venta se ajusta automáticamente.
            </div>
          </div>

          {/* summary box */}
          <div style={{ background: 'var(--paper2)', border: '1px solid var(--line)', borderRadius: 3, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink2)' }}>
              <span>Precio catálogo</span>
              <span>Bs. {listPrice.toFixed(2)}</span>
            </div>
            {parsedDisc > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--accent)' }}>
                <span>Descuento</span>
                <span>− Bs. {parsedDisc.toFixed(2)}</span>
              </div>
            )}
            <div style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 500, color: parsedSold < listPrice ? '#B23A2E' : '#3E6B45', fontFamily: 'var(--serif)' }}>
              <span>Precio de venta</span>
              <span>Bs. {parsedSold.toFixed(2)}</span>
            </div>
            {parsedSold !== listPrice && (
              <div style={{ fontSize: 11, color: parsedSold < listPrice ? '#B23A2E' : '#3E6B45', textAlign: 'right' }}>
                {parsedSold < listPrice ? `▼ ${Math.abs(margin)}% bajo el catálogo` : `▲ ${margin}% sobre el catálogo`}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: 'rgba(178,58,46,.08)', color: '#B23A2E', padding: '8px 12px', borderRadius: 2, fontSize: 13, border: '1px solid rgba(178,58,46,.25)' }}>
              {error}
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="va-btn-dark"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving
              ? <span className="spinner" style={{ width: 18, height: 18, borderTopColor: 'var(--paper)' }} />
              : '✓ Confirmar venta'
            }
          </button>
        </div>
      </div>
    </>
  )
}
