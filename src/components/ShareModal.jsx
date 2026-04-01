import { useState, useCallback } from 'react'
import { WA_NUMBER } from '../lib/constants.js'

const STORE_URL = 'https://vestilo.vercel.app'

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useShareModal() {
  const [shareProduct, setShareProduct] = useState(null)
  const open  = useCallback(p => setShareProduct(p), [])
  const close = useCallback(() => setShareProduct(null), [])
  return { shareProduct, open, close }
}

// ─── Build message text ───────────────────────────────────────────────────────
function buildMessage(product, template) {
  const url      = `${STORE_URL}/p/${product.id}`
  const styles   = product.styles?.length ? product.styles.join(' · ') : null
  const cat      = product.cat ? product.cat.toUpperCase() : null
  const colorStr = product.color ? `  |  Color: *${product.color}*` : ''
  const styleStr = styles ? `_${styles}_\n` : ''
  const catStr   = cat ? `_${cat}_\n` : ''

  if (template === 'elegant') return [
    `✨ *${product.name}*`,
    ``,
    catStr + `Talla: *${product.size}*${colorStr}`,
    styleStr,
    `💰 *Bs. ${product.price}*`,
    ``,
    `¿Te interesa? Escríbenos y lo apartamos 🤍`,
    ``,
    `🔗 ${url}`,
    `📍 Santa Cruz, Bolivia`,
  ].join('\n')

  if (template === 'hype') return [
    `🔥 *¡NUEVA LLEGADA!* 🔥`,
    ``,
    `👕 *${product.name}*`,
    `📐 Talla ${product.size}${product.color ? `  •  ${product.color}` : ''}`,
    styleStr,
    `💵 *SOLO Bs. ${product.price}*`,
    ``,
    `⚡ Pocas unidades — primero en escribir se lleva la prenda`,
    ``,
    `👉 Mírala aquí: ${url}`,
    `📍 SCZ · Bolivia`,
  ].join('\n')

  if (template === 'minimal') return [
    `*${product.name}*`,
    `Talla ${product.size}${product.color ? ` · ${product.color}` : ''}`,
    `Bs. ${product.price}`,
    ``,
    url,
  ].join('\n')

  return ''
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function ShareModal({ product, onClose }) {
  const [template, setTemplate] = useState('elegant')
  const [copied, setCopied]     = useState(false)

  if (!product) return null

  const photos  = product.photos?.length ? product.photos : product.photo_url ? [product.photo_url] : []
  const photo   = photos[0] || null
  const message = buildMessage(product, template)

  function handleCopy() {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`, '_blank')
  }

  const templates = [
    { key: 'elegant', label: '✨ Elegante' },
    { key: 'hype',    label: '🔥 Hype'    },
    { key: 'minimal', label: '◻ Minimal'  },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 200, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#faf8f5', borderRadius: '18px 18px 0 0',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#c4b9a8' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#1a1209' }}>
            Compartir por WhatsApp
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#9e8a6a', cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        {/* Product snapshot */}
        <div style={{ display: 'flex', gap: 12, padding: '0 20px 16px', alignItems: 'center' }}>
          {photo
            ? <img src={photo} alt={product.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0, border: '1px solid #e8e0d4' }} />
            : <div style={{ width: 56, height: 56, background: '#f0ede8', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>👕</div>
          }
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: '#1a1209', marginBottom: 2 }}>{product.name}</div>
            <div style={{ fontSize: 12, color: '#9e8a6a' }}>Talla {product.size}{product.color ? ` · ${product.color}` : ''}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 14, color: '#1a1209', marginTop: 2 }}>Bs. {product.price}</div>
          </div>
        </div>

        <div style={{ height: 1, background: '#e8e0d4', margin: '0 20px' }} />

        {/* Template picker */}
        <div style={{ padding: '14px 20px 10px' }}>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Estilo del mensaje</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {templates.map(t => (
              <button
                key={t.key}
                onClick={() => setTemplate(t.key)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  border: template === t.key ? '2px solid #1a1209' : '1px solid #e8e0d4',
                  background: template === t.key ? '#1a1209' : '#fff',
                  color: template === t.key ? '#f5e6c8' : '#9e8a6a',
                  fontWeight: template === t.key ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* WhatsApp-style preview bubble */}
        <div style={{ padding: '8px 20px 16px' }}>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Vista previa</div>
          <div style={{ background: '#ECE5DD', borderRadius: 8, padding: 10 }}>
            <div style={{
              background: '#fff', borderRadius: '0 10px 10px 10px',
              padding: '10px 13px', fontSize: 13, lineHeight: 1.65,
              color: '#111', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              maxHeight: 240, overflowY: 'auto',
            }}>
              <MessagePreview text={message} />
              <div style={{ fontSize: 10, color: '#9e8a6a', textAlign: 'right', marginTop: 4 }}>
                {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 36px' }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1, padding: '13px', borderRadius: 10,
              border: `1px solid ${copied ? '#a5d6a7' : '#e8e0d4'}`,
              background: copied ? '#e8f5e9' : '#fff',
              color: copied ? '#2e7d32' : '#1a1209',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            {copied ? '✓ Copiado' : '📋 Copiar'}
          </button>
          <button
            onClick={handleWhatsApp}
            style={{
              flex: 2, padding: '13px', borderRadius: 10, border: 'none',
              background: '#25D366', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Abrir en WhatsApp
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Render WhatsApp-style *bold* and _italic_ inline ────────────────────────
function MessagePreview({ text }) {
  return (
    <>
      {text.split('\n').map((line, i, arr) => (
        <span key={i}>
          {parseLine(line)}
          {i < arr.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

function parseLine(line) {
  const parts = line.split(/(\*[^*]+\*|_[^_]+_)/g)
  return parts.map((part, i) => {
    if (part.startsWith('*') && part.endsWith('*'))
      return <strong key={i}>{part.slice(1, -1)}</strong>
    if (part.startsWith('_') && part.endsWith('_'))
      return <em key={i}>{part.slice(1, -1)}</em>
    if (part.startsWith('http'))
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#128C7E', textDecoration: 'underline' }}>{part}</a>
    return part
  })
}
