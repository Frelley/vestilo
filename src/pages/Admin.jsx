import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, updateProduct, deleteProduct, freeLabel, supabase, getOrders, confirmOrderSold, releaseOrder } from '../lib/supabase.js'
import CartHeart from '../components/CartHeart.jsx'
import { STATUS_STYLES, daysSince, formatDate, colorsArray } from '../lib/constants.js'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import BundleManager from '../components/BundleManager.jsx'
import { Toast, useToast } from '../components/Toast.jsx'
import { PosterModal, usePosterModal } from '../components/PosterModal.jsx'
import { ShareModal, useShareModal } from '../components/ShareModal.jsx'
import { SellModal, useSellModal } from '../components/SellModal.jsx'
import { formatContentTag } from '../../api/content-themes.js'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60)    return 'ahora'
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function needsAiAnalysis(product) {
  if (!product || product.status === 'Vendido' || product.status === 'Archivado') return false
  if (!(product.photos?.length || product.photo_url)) return false
  return !product.ai_tags?.length || !product.content_themes?.length
}

function buildContentClusters(products, key) {
  const clusters = {}
  products.forEach(product => {
    ;(product[key] || []).forEach(tag => {
      if (!clusters[tag]) clusters[tag] = []
      clusters[tag].push(product)
    })
  })
  return Object.entries(clusters)
    .map(([tag, items]) => ({ tag, items }))
    .sort((a, b) => b.items.length - a.items.length || a.tag.localeCompare(b.tag))
}

function sanitizeDownloadName(value) {
  return String(value || 'vestilo')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function downloadProductPhotos(products, prefix = 'vestilo') {
  for (const product of products) {
    const photos = product.photos?.length ? product.photos : product.photo_url ? [product.photo_url] : []
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i]
      if (!photo) continue
      try {
        const res = await fetch(photo)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${sanitizeDownloadName(prefix)}-${sanitizeDownloadName(product.name)}-${i + 1}.jpg`
        a.click()
        URL.revokeObjectURL(url)
      } catch {
        window.open(photo, '_blank')
      }
      await sleep(120)
    }
  }
}

function ThemeClusterPanel({ products, backfilling, onBackfill }) {
  const activeProducts = products.filter(p => p.status !== 'Vendido' && p.status !== 'Archivado')
  const themeClusters = buildContentClusters(activeProducts, 'content_themes')
  const entityClusters = buildContentClusters(activeProducts, 'content_entities')
  const groupedCount = activeProducts.filter(p => p.content_themes?.length || p.content_entities?.length).length
  const missingCount = activeProducts.filter(p => !p.content_themes?.length).length

  function renderCluster(cluster, kind) {
    return (
      <div key={`${kind}-${cluster.tag}`} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1 }}>{kind === 'entity' ? 'Entidad' : 'Tema'}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 18, fontWeight: 700, color: '#1a1209' }}>{formatContentTag(cluster.tag)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1209', background: '#f5f0e8', borderRadius: 999, padding: '4px 10px' }}>
              {cluster.items.length} prenda{cluster.items.length !== 1 ? 's' : ''}
            </span>
            <button className="btn" onClick={() => downloadProductPhotos(cluster.items, cluster.tag)} style={{ fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' }}>
              ⬇ Fotos
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {cluster.items.slice(0, 6).map(product => {
            const photo = product.photos?.[0] || product.photo_url
            return (
              <Link
                key={product.id}
                to={`/admin/upload/${product.id}`}
                style={{ display: 'flex', gap: 8, alignItems: 'center', textDecoration: 'none', color: '#1a1209', background: '#faf8f5', border: '1px solid #f0ede8', borderRadius: 10, padding: 8 }}
              >
                {photo
                  ? <img src={photo} alt="" style={{ width: 42, height: 42, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  : <div style={{ width: 42, height: 42, borderRadius: 6, background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👕</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</div>
                  <div style={{ fontSize: 11, color: '#9e8a6a', marginTop: 2 }}>Talla {product.size} · Bs. {product.price}</div>
                </div>
              </Link>
            )
          })}
        </div>

        {cluster.items.length > 6 && (
          <div style={{ marginTop: 10, fontSize: 11, color: '#9e8a6a' }}>+{cluster.items.length - 6} más en este grupo</div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Marketing</div>
          <div style={{ fontSize: 13, color: '#1a1209' }}>Clusters y descargas crudas. Sin captions ni poster automáticos.</div>
        </div>
        <button className="btn" onClick={() => downloadProductPhotos(activeProducts, 'marketing')} style={{ whiteSpace: 'nowrap' }}>
          ⬇ Descargar fotos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
        {[
          ['Con grupos', groupedCount, '#1a1209'],
          ['Sin tema', missingCount, missingCount > 0 ? '#e65100' : '#2e7d32'],
          ['Temas únicos', themeClusters.length, '#2e7d32'],
          ['Entidades únicas', entityClusters.length, '#1565c0'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {missingCount > 0 && (
        <div style={{ background: '#fff8e1', border: '1px solid #ffe0b2', color: '#7a4b00', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 13 }}>Hay {missingCount} prenda{missingCount !== 1 ? 's' : ''} sin grupos de contenido. Recorre IA para llenar los clusters.</div>
          <button className="btn" onClick={() => onBackfill(false)} disabled={backfilling} style={{ whiteSpace: 'nowrap' }}>
            {backfilling ? 'Analizando…' : '✦ IA faltantes'}
          </button>
        </div>
      )}

      {entityClusters.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Franquicias y fandoms</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {entityClusters.map(cluster => renderCluster(cluster, 'entity'))}
          </div>
        </div>
      )}

      {themeClusters.length > 0 ? (
        <div>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Temas para reels</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {themeClusters.map(cluster => renderCluster(cluster, 'theme'))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 50, color: '#9e8a6a', background: '#fff', border: '1px solid #e8e0d4', borderRadius: 12 }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🎬</div>
          <div style={{ fontFamily: "'Nunito', sans-serif", color: '#1a1209', marginBottom: 6 }}>Aún no hay clusters de contenido</div>
          <div style={{ fontSize: 13 }}>Cuando la IA detecte temas como Harry Potter, cartoon o anime, aparecerán aquí.</div>
        </div>
      )}
    </div>
  )
}

function SearchLog() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('search_logs').select('*').order('created_at', { ascending: false }).limit(300)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  const now       = new Date()
  const dayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000)

  const todayLogs = logs.filter(l => new Date(l.created_at) >= dayStart)
  const weekLogs  = logs.filter(l => new Date(l.created_at) >= weekStart)
  const zeroRate  = logs.length ? Math.round((logs.filter(l => l.result_count === 0).length / logs.length) * 100) : 0

  const freq = {}
  logs.forEach(l => { freq[l.query] = (freq[l.query] || 0) + 1 })
  const topQueries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12)

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          ['Hoy',        todayLogs.length, '#1a1209'],
          ['Esta semana', weekLogs.length, '#2e7d32'],
          ['Total',       logs.length,     '#9e8a6a'],
          ['Sin resultados', `${zeroRate}%`, zeroRate > 30 ? '#c62828' : '#9e8a6a'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {topQueries.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Búsquedas más frecuentes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topQueries.map(([query, count], i) => (
              <div key={query} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#c4b9a8', width: 16, textAlign: 'right' }}>{i + 1}</span>
                <div style={{ flex: 1, background: '#f0ede8', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#1a1209', width: `${Math.round((count / topQueries[0][1]) * 100)}%`, borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, color: '#1a1209', flex: 2 }}>{query}</span>
                <span style={{ fontSize: 12, color: '#9e8a6a', fontWeight: 600 }}>×{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e0d4', fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1 }}>Historial reciente</div>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9e8a6a', fontSize: 13 }}>Aún no hay búsquedas registradas</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#faf8f5' }}>
                  {['Búsqueda', 'Tags', 'Resultados', 'Hace'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, borderBottom: '1px solid #e8e0d4', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                    <td style={{ padding: '8px 12px', color: '#1a1209', fontWeight: 500 }}>{l.query}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(l.tags || []).map(t => (
                          <span key={t} style={{ fontSize: 10, background: '#f0ede8', color: '#3d3020', borderRadius: 4, padding: '2px 6px' }}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontWeight: 600, color: l.result_count === 0 ? '#c62828' : '#2e7d32' }}>{l.result_count}</span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#9e8a6a', whiteSpace: 'nowrap' }}>{timeAgo(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ModeLog() {
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('mode_logs').select('*').order('created_at', { ascending: false }).limit(500)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [])

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  const swipe = logs.filter(l => l.mode === 'swipe').length
  const grid  = logs.filter(l => l.mode === 'grid').length
  const total = swipe + grid
  const swipePct = total ? Math.round((swipe / total) * 100) : 0
  const gridPct  = total ? Math.round((grid  / total) * 100) : 0

  const now        = new Date()
  const dayStart   = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart  = new Date(dayStart.getTime() - 6 * 24 * 60 * 60 * 1000)
  const todayLogs  = logs.filter(l => new Date(l.created_at) >= dayStart)
  const weekLogs   = logs.filter(l => new Date(l.created_at) >= weekStart)

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          ['Total', total,           '#1a1209'],
          ['Swipe', swipe,           '#2e7d32'],
          ['Catálogo', grid,         '#1565c0'],
          ['Esta semana', weekLogs.length, '#9e8a6a'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, padding: '16px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Preferencia de modo</div>
          {[['👆 Swipe', swipePct, '#2e7d32'], ['🗂️ Catálogo', gridPct, '#1565c0']].map(([label, pct, color]) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1a1209', marginBottom: 5 }}>
                <span>{label}</span><span style={{ fontWeight: 700 }}>{pct}%</span>
              </div>
              <div style={{ background: '#f0ede8', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: color, width: `${pct}%`, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e0d4', fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1 }}>Historial reciente</div>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9e8a6a', fontSize: 13 }}>Aún no hay registros</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#faf8f5' }}>
                  {['Modo', 'Acción', 'Hace'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, borderBottom: '1px solid #e8e0d4' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 100).map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: i < logs.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ fontWeight: 600, color: l.mode === 'swipe' ? '#2e7d32' : '#1565c0' }}>
                        {l.mode === 'swipe' ? '👆 Swipe' : '🗂️ Catálogo'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#9e8a6a' }}>{l.action === 'pick' ? 'Elegido' : 'Cambió'}</td>
                    <td style={{ padding: '8px 12px', color: '#9e8a6a', whiteSpace: 'nowrap' }}>{timeAgo(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function OrdersPanel({ products, onRefresh }) {
  const [orders,          setOrders]          = useState([])
  const [loading,         setLoading]         = useState(true)
  const [confirmingId,    setConfirmingId]     = useState(null)
  const [salePrice,       setSalePrice]        = useState('')
  const [saving,          setSaving]           = useState(false)
  const { toast, show }                        = useToast()

  useEffect(() => {
    getOrders().then(({ data }) => { setOrders(data || []); setLoading(false) })
  }, [])

  function getOrderProducts(order) {
    return (order.product_ids || []).map(id => products.find(p => p.id === id)).filter(Boolean)
  }

  function startConfirm(order) {
    const suggested = ((order.nominal_total || 0) - (order.discount || 0)).toFixed(2)
    setSalePrice(suggested)
    setConfirmingId(order.id)
  }

  async function handleConfirmSold(order) {
    const total = parseFloat(salePrice)
    if (!total || total <= 0) return
    setSaving(true)
    const prods = getOrderProducts(order)
    await confirmOrderSold(order.id, total, prods)
    await Promise.all(prods.map(p => freeLabel(p.size, p.name)))
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'sold', sold_total: total } : o))
    setConfirmingId(null)
    setSaving(false)
    show('Venta registrada ✓')
    onRefresh()
  }

  async function handleRelease(order) {
    await releaseOrder(order.id, order.product_ids || [])
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'released' } : o))
    show('Pedido liberado')
    onRefresh()
  }

  const pending  = orders.filter(o => o.status === 'pending')
  const resolved = orders.filter(o => o.status !== 'pending')

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      <Toast toast={toast} />
      {orders.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontFamily: "'Nunito', sans-serif" }}>No hay pedidos todavía</div>
        </div>
      )}

      {pending.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Pendientes ({pending.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {pending.map(order => {
              const prods     = getOrderProducts(order)
              const isConfirming = confirmingId === order.id
              const nominal   = (order.nominal_total || 0) - (order.discount || 0)
              return (
                <div key={order.id} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e8e0d4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: '#1a1209', fontSize: 15 }}>{order.customer_name}</div>
                      <div style={{ fontSize: 11, color: '#9e8a6a', marginTop: 2 }}>#{order.ref} · {timeAgo(order.created_at)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: '#1a1209' }}>Bs. {nominal.toFixed(2)}</div>
                      {order.discount > 0 && <div style={{ fontSize: 11, color: '#2e7d32' }}>− Bs. {order.discount} dto.</div>}
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {prods.map(p => {
                      const photo = p.photos?.[0] || p.photo_url
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#faf8f5', borderRadius: 8, padding: '6px 10px', border: '1px solid #e8e0d4' }}>
                          {photo
                            ? <img src={photo} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                            : <div style={{ width: 32, height: 32, background: '#f0ede8', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👕</div>}
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1209' }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: '#9e8a6a' }}>Talla {p.size} · Bs. {p.price}</div>
                          </div>
                        </div>
                      )
                    })}
                    {(order.product_ids?.length || 0) > prods.length && (
                      <div style={{ fontSize: 12, color: '#9e8a6a', alignSelf: 'center' }}>+{order.product_ids.length - prods.length} más</div>
                    )}
                  </div>
                  {isConfirming ? (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e0d4', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 13, color: '#1a1209', fontWeight: 600, marginRight: 4 }}>Total vendido (Bs.)</div>
                      <input
                        type="number"
                        value={salePrice}
                        onChange={e => setSalePrice(e.target.value)}
                        style={{ width: 100, padding: '8px 10px', borderRadius: 8, border: '1px solid #e8e0d4', fontSize: 14, fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleConfirmSold(order)}
                        disabled={saving || !parseFloat(salePrice)}
                        style={{ padding: '8px 16px', background: '#c62828', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        {saving ? 'Guardando…' : 'Confirmar vendido'}
                      </button>
                      <button onClick={() => setConfirmingId(null)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #e8e0d4', borderRadius: 8, color: '#9e8a6a', fontSize: 13, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 16px', borderTop: '1px solid #e8e0d4', display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => startConfirm(order)}
                        style={{ flex: 1, padding: '9px', background: '#ffebee', color: '#c62828', border: '1px solid #ffcdd2', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        Confirmar vendido
                      </button>
                      <button
                        onClick={() => handleRelease(order)}
                        style={{ flex: 1, padding: '9px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                      >
                        Liberar
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Historial</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resolved.map(order => (
              <div key={order.id} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1a1209', fontSize: 14 }}>{order.customer_name}</div>
                  <div style={{ fontSize: 11, color: '#9e8a6a' }}>#{order.ref} · {timeAgo(order.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: order.status === 'sold' ? '#ffebee' : '#f0ede8', color: order.status === 'sold' ? '#c62828' : '#9e8a6a' }}>
                    {order.status === 'sold' ? `Vendido · Bs. ${order.sold_total}` : 'Liberado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Admin() {
  const [products, setProducts]         = useState([])
  const [swipeStats, setSwipeStats]     = useState({})
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [view, setView]                 = useState('grid')
  const [activeTab, setActiveTab]       = useState('all')
  const [backfilling, setBackfilling]   = useState(false)
  const [backfillProgress, setBackfillProgress] = useState(null)
  const [selected, setSelected]         = useState({})   // { [id]: true }
  const [selectMode, setSelectMode]     = useState(false)

  const { toast, show }                                                 = useToast()
  const { posterProduct, open: openPoster, close: closePoster }         = usePosterModal()
  const { shareProduct,  open: openShare,  close: closeShare }          = useShareModal()
  const { sellProduct,   open: openSell,   close: closeSell }           = useSellModal()

  const selectedCount = Object.keys(selected).length

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: prods }, { data: swipes }] = await Promise.all([
      getProducts(),
      supabase.from('swipe_stats').select('*'),
    ])
    if (prods) setProducts(prods)
    if (swipes) {
      const map = {}
      swipes.forEach(s => { map[s.product_id] = s })
      setSwipeStats(map)
    }
    setLoading(false)
  }

  async function handleStatusChange(id, status) {
    if (status === 'Vendido') {
      const product = products.find(p => p.id === id)
      if (product) openSell(product)
      return
    }
    await updateProduct(id, { status })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    show(`Marcado como ${status}`)
  }

  async function handleSold(updatedProduct) {
    if (updatedProduct.size && updatedProduct.name) {
      await freeLabel(updatedProduct.size, updatedProduct.name)
    }
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
    show('Venta registrada ✓')
  }

  async function handleBackfill(force = false) {
    const pending = products.filter(p => {
      if (force) return p.status !== 'Vendido' && p.status !== 'Archivado' && (p.photos?.length || p.photo_url)
      return needsAiAnalysis(p)
    })
    if (!pending.length) { show('Todos los productos ya tienen análisis IA'); return }
    setBackfilling(true)
    setBackfillProgress({ done: 0, total: pending.length })
    const emptyThemeNames = []
    const failedNames = []
    for (let i = 0; i < pending.length; i++) {
      const p = pending[i]
      const photos = p.photos?.length ? p.photos : p.photo_url ? [p.photo_url] : []
      try {
        let attempts = 0
        let finished = false

        while (!finished && attempts < 3) {
          attempts++
          const res = await fetch('/api/analyze-product', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: p.id, photo_urls: photos, force })
          })
          const data = await res.json().catch(() => null)

          if (res.status === 429) {
            const retryAfterSec = Number(data?.retryAfter || 1)
            await sleep((retryAfterSec * 1000) + 250)
            continue
          }

          finished = true
          if (!res.ok) {
            failedNames.push(p.name)
          } else if (!data?.content_themes?.length && !data?.content_entities?.length) {
            emptyThemeNames.push(p.name)
          }
        }

        if (!finished) failedNames.push(p.name)
      } catch {
        failedNames.push(p.name)
      }
      setBackfillProgress({ done: i + 1, total: pending.length })
    }
    setBackfilling(false)
    setBackfillProgress(null)
    show(`Análisis IA completado para ${pending.length} productos`)
    if (failedNames.length) console.warn('Backfill failures:', failedNames)
    if (emptyThemeNames.length) console.warn('Backfill empty content tags:', emptyThemeNames)
    load()
  }

  // Soft-delete: moves to Archivado (hidden from public, recoverable)
  async function handleArchive(id) {
    await updateProduct(id, { status: 'Archivado' })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'Archivado' } : p))
    show('Producto archivado')
  }

  // Restore an archived product back to Disponible
  async function handleRestore(id) {
    await updateProduct(id, { status: 'Disponible' })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'Disponible' } : p))
    show('Producto restaurado')
  }

  // Permanent delete — only surfaced from the Archivados tab
  async function handleDelete(id, name, size, label) {
    if (!confirm(`¿Eliminar permanentemente "${name}"? Esta acción no se puede deshacer.`)) return
    await deleteProduct(id)
    if (size && label) await freeLabel(size, label)
    setProducts(prev => prev.filter(p => p.id !== id))
    show('Producto eliminado')
  }

  // Bulk status update for selected products
  async function handleBulkAction(action) {
    const ids = Object.keys(selected)
    if (!ids.length) return
    const labels = { Disponible: 'marcar disponible', Reservado: 'reservar', Vendido: 'marcar vendido', Archivado: 'archivar' }
    const label = labels[action] || action
    if (!confirm(`¿${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} producto${ids.length !== 1 ? 's' : ''}?`)) return
    const updates = { status: action }
    if (action === 'Vendido') updates.sold_at = new Date().toISOString()
    await supabase.from('products').update(updates).in('id', ids)
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...updates } : p))
    setSelected({})
    show(`${ids.length} producto${ids.length !== 1 ? 's' : ''} actualizados`)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedCount === filtered.length && filtered.length > 0) {
      setSelected({})
    } else {
      const next = {}
      filtered.forEach(p => { next[p.id] = true })
      setSelected(next)
    }
  }

  const summary = {
    total:     products.filter(p => p.status !== 'Archivado').length,
    available: products.filter(p => p.status === 'Disponible').length,
    reserved:  products.filter(p => p.status === 'Reservado').length,
    sold:      products.filter(p => p.status === 'Vendido').length,
    old:       products.filter(p => p.status === 'Disponible' && daysSince(p.created_at) > 30).length,
  }

  const filtered = products.filter(p => {
    if (activeTab !== 'archived' && p.status === 'Archivado') return false
    if (activeTab === 'archived' && p.status !== 'Archivado') return false
    const q = search.toLowerCase()
    if (q && !`${p.name} ${colorsArray(p.color).join(' ')} ${p.size} ${p.cat} ${p.bundle_label || ''}`.toLowerCase().includes(q)) return false
    if (filterStatus && p.status !== filterStatus) return false
    if (activeTab === 'old'       && !(p.status === 'Disponible' && daysSince(p.created_at) > 30)) return false
    if (activeTab === 'sold'      && p.status !== 'Vendido') return false
    if (activeTab === 'available' && p.status !== 'Disponible') return false
    if (activeTab === 'popular') {
      const s = swipeStats[p.id]
      if (!s || s.likes === 0) return false
    }
    return true
  }).sort((a, b) => {
    if (activeTab === 'popular') {
      const la = swipeStats[a.id]?.likes || 0
      const lb = swipeStats[b.id]?.likes || 0
      return lb - la
    }
    return 0
  })

  const tabStyle = t => ({
    padding: '8px 14px', background: 'transparent',
    border: 'none', borderBottom: activeTab === t ? '2px solid #1a1209' : '2px solid transparent',
    fontSize: 13, cursor: 'pointer', color: activeTab === t ? '#1a1209' : '#9e8a6a',
    fontWeight: activeTab === t ? 500 : 400, marginBottom: -1, whiteSpace: 'nowrap',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <Header admin />
      <Toast toast={toast} />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, padding: '12px 16px' }}>
        {[
          ['Total',       summary.total,     '#1a1209'],
          ['Disponibles', summary.available,  '#2e7d32'],
          ['Reservados',  summary.reserved,   '#e65100'],
          ['Vendidos',    summary.sold,       '#c62828'],
          ['+30 días',    summary.old,        '#9e8a6a'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px 10px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, padding: '0 16px', background: '#fff', borderBottom: '1px solid #e8e0d4', overflowX: 'auto' }}>
        {[
          ['all',      'Todos'],
          ['available','Disponibles'],
          ['popular',  'Más gustados'],
          ['sold',     'Vendidos'],
          ['old',      '+30 días'],
          ['archived', '🗄 Archivados'],
          ['orders',   '📋 Pedidos'],
          ['bundles',  '📦 Lotes'],
          ['searches', '🔍 Búsquedas'],
          ['modes',    '👆 Modos'],
        ].map(([key, label]) => (
          <button key={key} style={tabStyle(key)} onClick={() => { setActiveTab(key); setFilterStatus(''); setSelectMode(false); setSelected({}) }}>
            {label}
          </button>
        ))}
        <button style={tabStyle('marketing')} onClick={() => { setActiveTab('marketing'); setFilterStatus(''); setSelectMode(false); setSelected({}) }}>
          ðŸŽ¬ Marketing
        </button>
      </div>

      {/* Toolbar — hidden on Orders, Bundles, Searches, and Modes tabs */}
      {activeTab !== 'orders' && activeTab !== 'bundles' && activeTab !== 'marketing' && activeTab !== 'searches' && activeTab !== 'modes' && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e8e0d4', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, talla, etiqueta…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 140 }}
          />
          {activeTab !== 'archived' && (
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
              <option value="">Estado</option>
              <option>Disponible</option>
              <option>Vendido</option>
              <option>Reservado</option>
            </select>
          )}
          {activeTab !== 'archived' && (
            <>
              <button
                className="btn"
                onClick={() => handleBackfill(false)}
                disabled={backfilling}
                style={{ padding: '8px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
              >
                {backfilling
                  ? `IA ${backfillProgress?.done}/${backfillProgress?.total}`
                  : `✦ IA ${products.filter(p => !p.ai_tags && p.status !== 'Vendido' && p.status !== 'Archivado' && (p.photos?.length || p.photo_url)).length}`
                }
              </button>
              <button
                className="btn"
                onClick={() => handleBackfill(true)}
                disabled={backfilling}
                style={{ padding: '8px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
                title="Regenerar descripciones con el nuevo estilo"
              >
                {backfilling ? `IA ${backfillProgress?.done}/${backfillProgress?.total}` : '↺ IA todo'}
              </button>
            </>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn" style={{ padding: '8px 10px', fontWeight: view === 'grid'  ? 700 : 400 }} onClick={() => setView('grid')}>⊞</button>
            <button className="btn" style={{ padding: '8px 10px', fontWeight: view === 'table' ? 700 : 400 }} onClick={() => setView('table')}>☰</button>
          </div>
          <button
            className="btn"
            style={{
              padding: '8px 10px', fontSize: 12,
              fontWeight: selectMode ? 700 : 400,
              background: selectMode ? '#1a1209' : undefined,
              color: selectMode ? '#f5e6c8' : undefined,
            }}
            onClick={() => { setSelectMode(v => !v); setSelected({}) }}
          >
            {selectMode ? `✓ ${selectedCount}` : '☐ Sel.'}
          </button>
        </div>
      )}

      {/* Modals */}
      <PosterModal product={posterProduct} onClose={closePoster} />
      <ShareModal  product={shareProduct}  onClose={closeShare} />
      <SellModal   product={sellProduct}   onClose={closeSell}  onSold={handleSold} />

      {/* Bulk action bar — floats at bottom when items are selected */}
      {selectMode && selectedCount > 0 && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1209', color: '#f5e6c8', borderRadius: 12, padding: '10px 16px',
          display: 'flex', gap: 8, alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)', zIndex: 100, whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, marginRight: 4 }}>{selectedCount} sel.</span>
          {activeTab === 'archived' ? (
            <button onClick={() => handleBulkAction('Disponible')} className="btn" style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12 }}>↩ Restaurar</button>
          ) : (
            <>
              <button onClick={() => handleBulkAction('Disponible')} className="btn" style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 12 }}>Disponible</button>
              <button onClick={() => handleBulkAction('Reservado')}  className="btn" style={{ background: '#fff3e0', color: '#e65100', fontSize: 12 }}>Reservar</button>
              <button onClick={() => handleBulkAction('Vendido')}    className="btn" style={{ background: '#ffebee', color: '#c62828', fontSize: 12 }}>Vendido</button>
              <button onClick={() => handleBulkAction('Archivado')}  className="btn" style={{ background: '#f0ede8', color: '#9e8a6a', fontSize: 12 }}>🗄 Archivar</button>
            </>
          )}
          <button onClick={() => setSelected({})} style={{ background: 'transparent', border: 'none', color: '#c4b9a8', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>✕</button>
        </div>
      )}

      {/* Content */}
      {activeTab === 'orders' ? (
        <OrdersPanel products={products} onRefresh={load} />
      ) : activeTab === 'themes' || activeTab === 'marketing' ? (
        <ThemeClusterPanel products={products} backfilling={backfilling} onBackfill={handleBackfill} />
      ) : activeTab === 'searches' ? (
        <SearchLog />
      ) : activeTab === 'modes' ? (
        <ModeLog />
      ) : activeTab === 'bundles' ? (
        <BundleManager />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ padding: '8px 16px', fontSize: 12, color: '#9e8a6a', display: 'flex', alignItems: 'center', gap: 8 }}>
            {`${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`}
            {selectMode && filtered.length > 0 && (
              <button
                onClick={toggleSelectAll}
                style={{ fontSize: 12, background: 'none', border: 'none', color: '#1a1209', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
              >
                {selectedCount === filtered.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{activeTab === 'archived' ? '🗄' : '📦'}</div>
              <div style={{ fontFamily: "'Nunito', sans-serif" }}>
                {activeTab === 'archived' ? 'No hay productos archivados' : 'No hay productos aquí'}
              </div>
              {activeTab !== 'archived' && (
                <Link to="/admin/upload" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex', textDecoration: 'none' }}>
                  + Agregar producto
                </Link>
              )}
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: 16 }}>
              {filtered.map(p => {
                const s          = swipeStats[p.id]
                const isSelected = !!selected[p.id]
                return (
                  <div key={p.id} style={{ position: 'relative' }}>
                    {/* Select overlay */}
                    {selectMode && (
                      <div
                        onClick={() => toggleSelect(p.id)}
                        style={{
                          position: 'absolute', inset: 0, zIndex: 10, cursor: 'pointer',
                          background: isSelected ? 'rgba(26,18,9,0.12)' : 'transparent',
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 8, left: 8,
                          width: 22, height: 22, borderRadius: 4,
                          background: isSelected ? '#1a1209' : '#fff',
                          border: '2px solid #1a1209',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#f5e6c8', fontSize: 13, fontWeight: 700,
                        }}>
                          {isSelected ? '✓' : ''}
                        </div>
                      </div>
                    )}

                    <ProductCard product={p} admin onStatusChange={handleStatusChange} />

                    {s && (s.likes > 0 || s.skips > 0 || s.wa_requests > 0) && (
                      <div style={{ display: 'flex', gap: 6, padding: '6px 10px', background: '#fff', borderTop: '1px solid #e8e0d4', fontSize: 11 }}>
                        <span style={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: 3 }}><CartHeart liked size={13} /> {s.likes || 0}</span>
                        <span style={{ color: '#9e8a6a' }}>✕ {s.skips || 0}</span>
                        {s.wa_requests > 0 && <span style={{ color: '#1565c0' }}>💬 {s.wa_requests}</span>}
                        {s.likes > 0 && <span style={{ color: '#9e8a6a', marginLeft: 'auto' }}>{Math.round((s.likes / ((s.likes || 0) + (s.skips || 0))) * 100)}%</span>}
                      </div>
                    )}

                    {activeTab === 'archived' ? (
                      <div style={{ padding: '6px 10px', background: '#fff', borderTop: '1px solid #e8e0d4', display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleRestore(p.id)}
                          style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #c8e6c9', background: '#e8f5e9', color: '#2e7d32', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          ↩ Restaurar
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name, p.size, p.name)}
                          style={{ padding: 6, borderRadius: 6, border: '1px solid #ffcdd2', background: '#ffebee', color: '#c62828', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ padding: '6px 10px', background: '#fff', borderTop: '1px solid #e8e0d4', display: 'flex', gap: 6 }}>
                        <button onClick={() => openShare(p)} style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf8f5', color: '#1a1209', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          📤
                        </button>
                        <button onClick={() => openPoster(p)} style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf8f5', color: '#1a1209', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          🖼️
                        </button>
                        <button onClick={() => handleArchive(p.id)} title="Archivar" style={{ padding: 6, borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf8f5', color: '#9e8a6a', fontSize: 12, cursor: 'pointer' }}>
                          🗄
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', padding: '0 16px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e0d4' }}>
                <thead>
                  <tr style={{ background: '#1a1209', color: '#f5e6c8' }}>
                    {selectMode && (
                      <th style={{ padding: '10px 12px', width: 32 }}>
                        <input
                          type="checkbox"
                          checked={selectedCount === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                    )}
                    {['Producto','Lote','Talla','Precio','Venta','Dto','Ingreso','Días','Estado','🛒','Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, letterSpacing: 0.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const days        = daysSince(p.created_at)
                    const dotColor    = days > 60 ? '#c62828' : days > 30 ? '#e65100' : '#2e7d32'
                    const st          = STATUS_STYLES[p.status] || STATUS_STYLES.Disponible
                    const sw          = swipeStats[p.id]
                    const hasDiscount = p.discount && p.discount > 0
                    const isSelected  = !!selected[p.id]
                    return (
                      <tr key={p.id} style={{ background: isSelected ? '#f5f0e8' : i % 2 === 0 ? '#fff' : '#faf8f5', borderBottom: '1px solid #e8e0d4' }}>
                        {selectMode && (
                          <td style={{ padding: '9px 12px' }}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} style={{ cursor: 'pointer' }} />
                          </td>
                        )}
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {p.photo_url
                              ? <img src={p.photo_url} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                              : <div style={{ width: 32, height: 32, background: '#f0ede8', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👕</div>
                            }
                            <Link to={`/admin/upload/${p.id}`} style={{ fontWeight: 600, color: '#1a1209', textDecoration: 'none', fontSize: 13 }}>
                              {p.name}
                            </Link>
                          </div>
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 11, color: '#9e8a6a' }}>{p.bundle_label || '—'}</td>
                        <td style={{ padding: '9px 12px', color: '#9e8a6a' }}>{p.size}</td>
                        <td style={{ padding: '9px 12px', fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}>Bs. {p.price}</td>
                        <td style={{ padding: '9px 12px' }}>
                          {p.sold_price
                            ? <span style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 700, color: p.sold_price < p.price ? '#c62828' : '#2e7d32' }}>Bs. {p.sold_price}</span>
                            : <span style={{ color: '#c4b9a8' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          {hasDiscount
                            ? <span style={{ color: '#e65100', fontWeight: 600 }}>− {p.discount}</span>
                            : <span style={{ color: '#c4b9a8' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '9px 12px', fontWeight: 600, color: '#2e7d32' }}>
                          {p.sold_price ? `Bs. ${p.sold_price}` : '—'}
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span style={{ fontSize: 12, color: dotColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="age-dot" style={{ background: dotColor }} />
                            {days === 0 ? 'Hoy' : `${days}d`}
                          </span>
                        </td>
                        <td style={{ padding: '9px 12px' }}>
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{p.status}</span>
                        </td>
                        <td style={{ padding: '9px 12px', color: '#2e7d32', fontWeight: 600 }}>{sw?.likes || 0}</td>
                        <td style={{ padding: '9px 12px' }}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {activeTab === 'archived' ? (
                              <>
                                <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#2e7d32' }} onClick={() => handleRestore(p.id)}>↩ Restaurar</button>
                                <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#c62828', borderColor: '#ffcdd2' }} onClick={() => handleDelete(p.id, p.name, p.size, p.name)}>✕ Eliminar</button>
                              </>
                            ) : (
                              <>
                                {p.status !== 'Disponible' && <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#2e7d32' }} onClick={() => handleStatusChange(p.id, 'Disponible')}>Disponible</button>}
                                {p.status !== 'Vendido'    && <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#c62828' }} onClick={() => openSell(p)}>Vendido</button>}
                                {p.status !== 'Reservado'  && <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#e65100' }} onClick={() => handleStatusChange(p.id, 'Reservado')}>Reservar</button>}
                                <button className="btn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openShare(p)}>📤</button>
                                <button className="btn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openPoster(p)}>🖼️</button>
                                <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#9e8a6a' }} title="Archivar" onClick={() => handleArchive(p.id)}>🗄</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
