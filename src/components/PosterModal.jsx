import { useEffect, useRef, useState, useCallback } from 'react'

const STORE_URL = 'https://vestilo.vercel.app'

const COLOR_BG = {
  'Azul':        '#070f1a',
  'Azul marino': '#05090f',
  'Celeste':     '#071218',
  'Rojo':        '#160707',
  'Vino':        '#120412',
  'Rosa':        '#150810',
  'Verde':       '#071207',
  'Naranja':     '#160c04',
  'Amarillo':    '#131002',
  'Morado':      '#0e0614',
  'Gris':        '#0c0c0e',
  'Negro':       '#080808',
  'Blanco':      '#1a1209',
  'Beige':       '#1a1407',
}

function getBgColor(color) {
  return COLOR_BG[color] || '#1a1209'
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export function usePosterModal() {
  const [posterProduct, setPosterProduct] = useState(null)
  const open  = useCallback(p => setPosterProduct(p), [])
  const close = useCallback(() => setPosterProduct(null), [])
  return { posterProduct, open, close }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

async function fetchPosterText(product) {
  try {
    const res = await fetch('/api/generate-poster-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cat: product.cat,
        color: product.color,
        size: product.size,
        ai_tags: product.ai_tags,
        notes: product.notes,
      }),
    })
    if (res.ok) return await res.json()
  } catch {}
  return { vibe: null, cta: null }
}

async function drawPoster(canvas, product, posterText = {}) {
  const SIZE = 1080
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  const url = `${STORE_URL}/p/${product.id}`
  const photos = product.photos?.length ? product.photos : product.photo_url ? [product.photo_url] : []

  const bgColor = getBgColor(product.color)
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, SIZE, SIZE)

  if (photos[0]) {
    try {
      const img = await loadImage(photos[0])
      const scale = Math.max(SIZE / img.width, SIZE / img.height)
      const w = img.width * scale
      const h = img.height * scale
      const x = (SIZE - w) / 2
      const y = (SIZE - h) / 2
      ctx.drawImage(img, x, y, w, h)
    } catch {}
  }

  const [r, g, b] = hexToRgb(bgColor)
  const grad = ctx.createLinearGradient(0, SIZE * 0.55, 0, SIZE)
  grad.addColorStop(0,    `rgba(${r},${g},${b},0)`)
  grad.addColorStop(0.28, `rgba(${r},${g},${b},0.55)`)
  grad.addColorStop(0.55, `rgba(${r},${g},${b},0.85)`)
  grad.addColorStop(1,    `rgba(${r},${g},${b},0.96)`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Brand — bigger, stronger
  ctx.fillStyle = 'rgba(245,230,200,0.95)'
  ctx.font = 'bold 44px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText('VESTILO A TU SONSO!', 52, 72)
  ctx.strokeStyle = 'rgba(245,230,200,0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(52, 84)
  ctx.lineTo(420, 84)
  ctx.stroke()
  ctx.fillStyle = 'rgba(158,138,106,0.85)'
  ctx.font = '18px Arial, sans-serif'
  ctx.fillText('SANTA CRUZ · BOLIVIA', 52, 108)

  // Description + vibe label
  const desc = (product.notes || '').trim()
  let descStartY = SIZE - 290

  if (desc) {
    ctx.fillStyle = '#f5e6c8'
    ctx.font = '500 38px Georgia, serif'
    ctx.textAlign = 'left'
    const words = desc.split(' ')
    const lines = []
    let line = ''
    for (const word of words) {
      const test = line ? line + ' ' + word : word
      if (ctx.measureText(test).width > 900) { lines.push(line); line = word }
      else line = test
    }
    if (line) lines.push(line)
    const lineH = 50
    descStartY = SIZE - 290 - (lines.length - 1) * lineH

    // Vibe pill above description
    if (posterText.vibe) {
      ctx.font = 'bold 18px Arial, sans-serif'
      const vibeText = posterText.vibe.toUpperCase()
      const vibeW = ctx.measureText(vibeText).width + 28
      const vibeTop = descStartY - 52
      ctx.fillStyle = 'rgba(245,230,200,0.15)'
      ctx.strokeStyle = 'rgba(245,230,200,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(52, vibeTop, vibeW, 32, 6)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#f5e6c8'
      ctx.fillText(vibeText, 66, vibeTop + 22)
    }

    ctx.fillStyle = '#f5e6c8'
    ctx.font = '500 38px Georgia, serif'
    ctx.textAlign = 'left'
    lines.forEach((l, i) => ctx.fillText(l, 52, descStartY + i * lineH))
  } else if (posterText.vibe) {
    // No description — vibe pill still shows above price area
    ctx.font = 'bold 18px Arial, sans-serif'
    const vibeText = posterText.vibe.toUpperCase()
    const vibeW = ctx.measureText(vibeText).width + 28
    const vibeTop = SIZE - 320
    ctx.fillStyle = 'rgba(245,230,200,0.15)'
    ctx.strokeStyle = 'rgba(245,230,200,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(52, vibeTop, vibeW, 32, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f5e6c8'
    ctx.fillText(vibeText, 66, vibeTop + 22)
  }

  // Price — brighter, bigger
  ctx.shadowColor = 'rgba(0,0,0,0.5)'
  ctx.shadowBlur = 14
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 80px Georgia, serif'
  ctx.textAlign = 'left'
  ctx.fillText(`Bs. ${product.price}`, 52, SIZE - 148)
  ctx.shadowBlur = 0

  // Size pill — pill shape, cleaner border
  ctx.font = '600 22px Arial, sans-serif'
  const sizeText = `Talla ${product.size}`
  const pillW = ctx.measureText(sizeText).width + 36
  const pillTop = SIZE - 124
  ctx.fillStyle = 'rgba(245,230,200,0.15)'
  ctx.strokeStyle = 'rgba(245,230,200,0.65)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(52, pillTop, pillW, 40, 20)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f5e6c8'
  ctx.textAlign = 'center'
  ctx.fillText(sizeText, 52 + pillW / 2, pillTop + 27)

  // CTA text
  if (posterText.cta) {
    ctx.fillStyle = 'rgba(245,230,200,0.72)'
    ctx.font = 'italic 22px Georgia, serif'
    ctx.textAlign = 'left'
    ctx.fillText(posterText.cta, 52, SIZE - 58)
  }

  // QR code
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js')
    const qrSize = 160
    const qrPad  = 48
    const container = document.createElement('div')
    container.style.position = 'fixed'
    container.style.left = '-9999px'
    document.body.appendChild(container)
    new QRCode(container, { text: url, width: qrSize, height: qrSize, colorDark: '#f5e6c8', colorLight: bgColor })
    await new Promise(r => setTimeout(r, 200))
    const qrCanvas = container.querySelector('canvas')
    if (qrCanvas) {
      const qrX = SIZE - qrSize - qrPad
      const qrY = SIZE - qrSize - qrPad
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12)
      ctx.fill()
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)
    }
    document.body.removeChild(container)
  } catch {}
}

export function PosterModal({ product, onClose }) {
  const canvasRef  = useRef(null)
  const [ready, setReady]     = useState(false)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied]   = useState(null)

  useEffect(() => {
    if (!product || !canvasRef.current) return
    setReady(false)
    async function run() {
      const posterText = await fetchPosterText(product)
      await drawPoster(canvasRef.current, product, posterText)
      setReady(true)
    }
    run()
  }, [product])

  if (!product) return null

  const url     = `${STORE_URL}/p/${product.id}`
  const caption = `${product.notes ? product.notes + '\n\n' : ''}Talla ${product.size} · Bs. ${product.price}\n\n${url}`

  async function copyImage() {
    if (!canvasRef.current) return
    setCopying(true)
    try {
      canvasRef.current.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied('image')
          setTimeout(() => setCopied(null), 2500)
        } catch {
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `poster-${product.id}.png`
          a.click()
        }
        setCopying(false)
      }, 'image/png')
    } catch { setCopying(false) }
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption)
    setCopied('caption')
    setTimeout(() => setCopied(null), 2500)
  }

  async function downloadImage() {
    if (!canvasRef.current) return
    canvasRef.current.toBlob(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `poster-${product.id}.png`
      a.click()
    }, 'image/png')
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: '#faf8f5', borderRadius: '18px 18px 0 0', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 -8px 32px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#c4b9a8' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 12px' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#1a1209' }}>Poster para redes sociales</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#9e8a6a', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
            <canvas ref={canvasRef} style={{ width: '100%', borderRadius: 12, display: 'block', border: '1px solid #e8e0d4' }} />
            {!ready && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(250,248,245,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
                <div className="spinner" />
              </div>
            )}
          </div>
        </div>
        <div style={{ margin: '0 20px 16px', background: '#f0ede8', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Caption</div>
          <div style={{ fontSize: 13, color: '#3d3020', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{caption}</div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '0 20px 36px', flexWrap: 'wrap' }}>
          <button onClick={copyImage} disabled={!ready || copying} style={{ flex: 1, minWidth: 120, padding: '13px', borderRadius: 10, border: `1px solid ${copied === 'image' ? '#a5d6a7' : '#e8e0d4'}`, background: copied === 'image' ? '#e8f5e9' : '#fff', color: copied === 'image' ? '#2e7d32' : '#1a1209', fontSize: 13, fontWeight: 600, cursor: ready ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
            {copied === 'image' ? '✓ Imagen copiada' : copying ? '...' : '📋 Copiar imagen'}
          </button>
          <button onClick={downloadImage} disabled={!ready} style={{ flex: 1, minWidth: 120, padding: '13px', borderRadius: 10, border: '1px solid #e8e0d4', background: '#fff', color: '#1a1209', fontSize: 13, fontWeight: 600, cursor: ready ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ⬇️ Descargar
          </button>
          <button onClick={copyCaption} style={{ flex: 1, minWidth: 120, padding: '13px', borderRadius: 10, border: `1px solid ${copied === 'caption' ? '#a5d6a7' : '#e8e0d4'}`, background: copied === 'caption' ? '#e8f5e9' : '#fff', color: copied === 'caption' ? '#2e7d32' : '#1a1209', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.2s' }}>
            {copied === 'caption' ? '✓ Caption copiado' : '📝 Copiar caption'}
          </button>
        </div>
      </div>
    </>
  )
}
