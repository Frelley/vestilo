import { useState } from 'react'
import { createOrder } from '../lib/supabase.js'
import { WA_NUMBER, colorsArray } from '../lib/constants.js'
import {
  BULK_MIN, BULK_DISC, PRICE_FLOOR,
  bulkSavings, genRef, getPhotos, vibe,
} from '../lib/catalogueHelpers.js'
import { ArrowLeft, Heart, Close, Whatsapp, Check, Placeholder } from './AtelierIcons.jsx'

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
    <div className="v-liked">
      <div className="v-detail-bar">
        <button className="v-back" onClick={onBack}><ArrowLeft size={16} /> Seguir mirando</button>
        <div className="v-liked-title">Lista de compra <span>({likedProducts.length})</span></div>
      </div>

      {likedProducts.length === 0 ? (
        <div className="v-empty">
          <Heart size={46} style={{ color: 'var(--line)' }} />
          <div className="v-empty-title" style={{ marginTop: 14 }}>Todavía no guardaste nada</div>
          <div className="v-empty-sub">Tocá el corazón en las prendas que te gusten.</div>
        </div>
      ) : (
        <>
          <div className="v-liked-list">
            {likedProducts.map(p => {
              const photo = getPhotos(p)[0]
              const colors = colorsArray(p.color)
              return (
                <div key={p.id} className="v-liked-row">
                  <div className="v-liked-thumb">
                    {photo ? <img src={photo} alt="" /> : <Placeholder />}
                  </div>
                  <div className="v-liked-info">
                    <div className="v-liked-name">{p.name}</div>
                    <div className="v-liked-meta">Talla {p.size}{colors.length ? ` · ${colors.join(', ')}` : ''}</div>
                    <div className="v-liked-price">Bs. {p.price}</div>
                  </div>
                  <button className="v-liked-x" onClick={() => onRemove(p.id)}><Close size={16} /></button>
                </div>
              )
            })}
          </div>

          <div className="v-summary">
            {hasDisc ? (
              <>
                <div className="v-sum-row"><span>Subtotal ({likedProducts.length} prendas)</span><span>Bs. {origTotal.toFixed(2)}</span></div>
                <div className="v-sum-row v-sum-disc"><span>Descuento por volumen</span><span>− Bs. {savings.toFixed(2)}</span></div>
                <div className="v-sum-row v-sum-total"><span>Total estimado</span><span>Bs. {discTotal.toFixed(2)}</span></div>
                <div className="v-sum-note">Ahorrás Bs. {savings.toFixed(2)} en este pedido</div>
              </>
            ) : (
              <>
                <div className="v-sum-row v-sum-total"><span>Total</span><span>Bs. {origTotal.toFixed(2)}</span></div>
                {needed > 0 && (
                  <div className="v-nudge">
                    <b>{needed === 1 ? '¡Una más' : `${needed} más`}</b> y bajamos Bs. 5 a cada una
                    {potentialSavings > 0 ? ` → ahorrarías Bs. ${potentialSavings.toFixed(0)}` : ''}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {likedProducts.length > 0 && (
        <div className="v-liked-cta">
          <button className="v-wa-btn v-wa-order" onClick={() => { setOrderDone(false); setShowNameModal(true) }}>
            <Whatsapp size={18} /> Pedir por WhatsApp ({likedProducts.length})
          </button>
        </div>
      )}

      {showNameModal && (
        <div className="v-modal-bg" onClick={e => { if (e.target === e.currentTarget) setShowNameModal(false) }}>
          <div className="v-modal">
            {orderDone ? (
              <>
                <div className="v-modal-ok"><Check size={26} style={{ color: 'var(--accent)' }} /></div>
                <h3 className="v-modal-title">Pedido registrado</h3>
                <p className="v-modal-sub">Las prendas quedan apartadas mientras confirmamos tu pedido por WhatsApp.</p>
                <button className="v-modal-done" onClick={() => setShowNameModal(false)}>Listo</button>
              </>
            ) : (
              <>
                <h3 className="v-modal-title">¿Cómo te llaman en WhatsApp?</h3>
                <p className="v-modal-sub">Para que podamos identificar tu pedido.</p>
                <input
                  className="v-modal-input"
                  autoFocus
                  type="text"
                  placeholder="Tu nombre"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !submitting && customerName.trim() && handleSendOrder()}
                />
                <button className="v-wa-btn" onClick={handleSendOrder} disabled={submitting || !customerName.trim()}>
                  {submitting ? 'Registrando…' : <><Whatsapp size={18} /> Enviar pedido</>}
                </button>
                <button className="v-modal-cancel" onClick={() => setShowNameModal(false)}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
