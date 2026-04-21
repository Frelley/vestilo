import { useState } from 'react'
import { createOrder } from '../lib/supabase.js'
import { WA_NUMBER } from '../lib/constants.js'
import {
  BULK_MIN, BULK_DISC, PRICE_FLOOR,
  bulkSavings, genRef, getPhotos, vibe,
} from '../lib/catalogueHelpers.js'
import CartHeart from './CartHeart.jsx'
import { WA_SVG } from './WhatsappIcon.jsx'

export default function LikedList({ likedProducts, onBack, onRemove }) {
  const [showNameModal, setShowNameModal] = useState(false)
  const [customerName,  setCustomerName]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [orderDone,     setOrderDone]     = useState(false)

  const savings          = bulkSavings(likedProducts)
  const hasDisc          = savings > 0
  const needed           = Math.max(0, BULK_MIN + 1 - likedProducts.length)
  const potentialSavings = likedProducts.reduce((sum, p) => {
    const price = parseFloat(p.price) || 0
    return sum + Math.min(BULK_DISC, Math.max(0, price - PRICE_FLOOR))
  }, 0)
  const origTotal = likedProducts.reduce((s, p) => s + (parseFloat(p.price) || 0), 0)
  const discTotal = origTotal - savings

  let waText = likedProducts.map(p => `• ${p.name} — Talla ${p.size} — Bs. ${p.price}`).join('\n')
  if (hasDisc) {
    waText += `\n\nSon ${likedProducts.length} camisetas → descuento de Bs. 5 c/u\nTotal con descuento: Bs. ${discTotal.toFixed(2)} (ahorro Bs. ${savings.toFixed(2)})`
  }

  async function handleSendOrder() {
    if (!customerName.trim()) return
    setSubmitting(true)
    vibe(20)
    const ref        = genRef()
    const productIds = likedProducts.map(p => p.id)
    const fullText   = `Hola! Me interesan estas prendas:\n\n${waText}\n\n¿Están disponibles?\n\nPedido: #${ref}`
    await createOrder({
      ref,
      customerName: customerName.trim(),
      productIds,
      nominalTotal: origTotal,
      discount:     savings,
      waMessage:    fullText,
    }).catch(() => {})
    setSubmitting(false)
    setOrderDone(true)
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(fullText)}`, '_blank')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 12px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#9e8a6a', fontSize: 20, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700 }}>Lista de compra ({likedProducts.length})</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px', paddingBottom: likedProducts.length > 0 ? 96 : 16 }}>
        {likedProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
            <CartHeart liked={false} size={56} color="#9e8a6a" style={{ marginBottom: 12 }} />
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 16, marginBottom: 8 }}>Todavía no guardaste nada</div>
            <div style={{ fontSize: 13 }}>Deslizá a la derecha las camisetas que te gusten</div>
          </div>
        ) : (
          <>
            {likedProducts.map(p => {
              const photo = getPhotos(p)[0]
              return (
                <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #3d3020' }}>
                  {photo
                    ? <img src={photo} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                    : <div style={{ width: 56, height: 56, background: '#241810', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>👕</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#9e8a6a' }}>Talla {p.size}{p.color ? ` · ${Array.isArray(p.color) ? p.color.join(', ') : p.color}` : ''}</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 14, fontWeight: 700, marginTop: 2 }}>Bs. {p.price}</div>
                  </div>
                  <button onClick={() => onRemove(p.id)} style={{ background: 'transparent', border: 'none', color: '#9e8a6a', fontSize: 18, cursor: 'pointer', padding: 8 }}>✕</button>
                </div>
              )
            })}

            {hasDisc ? (
              <div style={{ margin: '16px 0 8px', background: '#1a2e18', border: '1px solid #2e5c23', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#4CAF50', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🎉</span> ¡Descuento por volumen aplicado!
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#9e8a6a', marginBottom: 4 }}>
                  <span>Subtotal ({likedProducts.length} prendas)</span>
                  <span>Bs. {origTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4CAF50', marginBottom: 8 }}>
                  <span>Descuento (Bs. 5 c/u)</span>
                  <span>− Bs. {savings.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px solid #2e5c23', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>Total estimado</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>Bs. {discTotal.toFixed(2)}</span>
                </div>
                <div style={{ fontSize: 11, color: '#4CAF50', marginTop: 6, textAlign: 'center' }}>Ahorrás Bs. {savings.toFixed(2)} en este pedido</div>
              </div>
            ) : needed > 0 && likedProducts.length > 0 ? (
              <div style={{ margin: '16px 0 8px', background: '#241810', border: '1px solid #3d3020', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16 }}>🏷️</span>
                <div style={{ fontSize: 12, color: '#c4b9a8', lineHeight: 1.5 }}>
                  {needed === 1 ? <span style={{ color: '#f5c842', fontWeight: 700 }}>¡Casi! </span> : ''}<span style={{ color: '#f5e6c8', fontWeight: 700 }}>{needed} más</span> y bajamos Bs. 5 a cada una{potentialSavings > 0 ? <> → <span style={{ color: '#f5e6c8', fontWeight: 700 }}>ahorrarías Bs. {potentialSavings.toFixed(0)}</span></> : ''}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {likedProducts.length > 0 && (
        <button
          onClick={() => { setOrderDone(false); setShowNameModal(true) }}
          style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 50, padding: '14px 24px', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.45)', whiteSpace: 'nowrap', zIndex: 100 }}
        >
          {WA_SVG} Pedir por WhatsApp ({likedProducts.length})
        </button>
      )}

      {showNameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#1a1209', borderRadius: 16, padding: 28, width: '100%', maxWidth: 340, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
            {orderDone ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>✓</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Pedido registrado</div>
                  <div style={{ fontSize: 13, color: '#9e8a6a', lineHeight: 1.5 }}>Las prendas quedan apartadas mientras confirmamos tu pedido por WhatsApp.</div>
                </div>
                <button onClick={() => setShowNameModal(false)} style={{ width: '100%', padding: '12px', background: '#f5e6c8', color: '#1a1209', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Listo
                </button>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>¿Cómo te llaman en WhatsApp?</div>
                <div style={{ fontSize: 13, color: '#9e8a6a', marginBottom: 18 }}>Para que podamos identificar tu pedido</div>
                <input
                  autoFocus
                  type="text"
                  placeholder="Tu nombre"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && customerName.trim() && handleSendOrder()}
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #3d3020', background: '#241810', color: '#f5e6c8', fontSize: 15, marginBottom: 14, boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleSendOrder}
                  disabled={submitting || !customerName.trim()}
                  style={{ width: '100%', padding: '12px', background: submitting || !customerName.trim() ? '#3d3020' : '#25D366', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: submitting || !customerName.trim() ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}
                >
                  {submitting ? 'Registrando…' : <>{WA_SVG} Enviar pedido</>}
                </button>
                <button onClick={() => setShowNameModal(false)} style={{ width: '100%', padding: '10px', background: 'transparent', color: '#9e8a6a', border: 'none', fontSize: 13, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
