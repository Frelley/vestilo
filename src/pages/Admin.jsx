import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, updateProduct, deleteProduct, freeLabel, supabase } from '../lib/supabase.js'
import { STATUS_STYLES, daysSince, formatDate, colorsArray } from '../lib/constants.js'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import BundleManager from '../components/BundleManager.jsx'
import { Toast, useToast } from '../components/Toast.jsx'
import { PosterModal, usePosterModal } from '../components/PosterModal.jsx'
import { ShareModal, useShareModal } from '../components/ShareModal.jsx'
import { SellModal, useSellModal } from '../components/SellModal.jsx'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60)    return 'ahora'
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
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

  // Top queries by frequency
  const freq = {}
  logs.forEach(l => { freq[l.query] = (freq[l.query] || 0) + 1 })
  const topQueries = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 12)

  return (
    <div style={{ padding: 16, maxWidth: 720 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
        {[
          ['Hoy',        todayLogs.length, '#1a1209'],
          ['Esta semana', weekLogs.length, '#2e7d32'],
          ['Total',       logs.length,     '#9e8a6a'],
          ['Sin resultados', `${zeroRate}%`, zeroRate > 30 ? '#c62828' : '#9e8a6a'],
        ].map(([label, val, color]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px', borderTop: `3px solid ${color}` }}>
            <div style={{ fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Top queries */}
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

      {/* Recent log */}
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

export default function Admin() {
  const [products, setProducts]   = useState([])
  const [swipeStats, setSwipeStats] = useState({})
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [view, setView]           = useState('grid')
  const [activeTab, setActiveTab] = useState('all')
  const [backfilling, setBackfilling] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState(null)

  const { toast, show }                           = useToast()
  const { posterProduct, open: openPoster, close: closePoster } = usePosterModal()
  const { shareProduct, open: openShare, close: closeShare }   = useShareModal()
  const { sellProduct, open: openSell, close: closeSell }      = useSellModal()


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

  // For non-Vendido status changes (Disponible ↔ Reservado)
  async function handleStatusChange(id, status) {
    if (status === 'Vendido') {
      // Route through SellModal to capture price + discount
      const product = products.find(p => p.id === id)
      if (product) openSell(product)
      return
    }
    await updateProduct(id, { status })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    show(`Marcado como ${status}`)
  }

  // Called when SellModal confirms the sale — free label for physical reuse (UUID preserves history)
  async function handleSold(updatedProduct) {
    if (updatedProduct.size && updatedProduct.name) {
      await freeLabel(updatedProduct.size, updatedProduct.name)
    }
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p))
    show('Venta registrada ✓')
  }

  async function handleBackfill(force = false) {
    const pending = products.filter(p => p.status !== 'Vendido' && (p.photos?.length || p.photo_url) && (force || !p.ai_tags))
    if (!pending.length) { show('Todos los productos ya tienen análisis IA'); return }
    setBackfilling(true)
    setBackfillProgress({ done: 0, total: pending.length })
    for (let i = 0; i < pending.length; i++) {
      const p = pending[i]
      const photos = p.photos?.length ? p.photos : p.photo_url ? [p.photo_url] : []
      await fetch('/api/analyze-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: p.id, photo_urls: photos, force })
      }).catch(() => {})
      setBackfillProgress({ done: i + 1, total: pending.length })
    }
    setBackfilling(false)
    setBackfillProgress(null)
    show(`Análisis IA completado para ${pending.length} productos`)
    load()
  }

  async function handleDelete(id, name, size, label) {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    await deleteProduct(id)
    // Free the label for reuse
    if (size && label) await freeLabel(size, label)
    setProducts(prev => prev.filter(p => p.id !== id))
    show('Producto eliminado')
  }

  const summary = {
    total:     products.length,
    available: products.filter(p => p.status === 'Disponible').length,
    reserved:  products.filter(p => p.status === 'Reservado').length,
    sold:      products.filter(p => p.status === 'Vendido').length,
    old:       products.filter(p => p.status === 'Disponible' && daysSince(p.created_at) > 30).length,
  }

  const filtered = products.filter(p => {
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
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
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
          ['bundles',  '📦 Lotes'],
          ['searches', '🔍 Búsquedas'],
        ].map(([key, label]) => (
          <button key={key} style={tabStyle(key)} onClick={() => { setActiveTab(key); setFilterStatus('') }}>
            {label}
          </button>
        ))}
      </div>

      {/* Toolbar — hidden on Bundles and Searches tabs */}
      {activeTab !== 'bundles' && activeTab !== 'searches' && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e8e0d4', flexWrap: 'wrap' }}>
          <input type="text" placeholder="Buscar por nombre, talla, etiqueta…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width: 'auto' }}>
            <option value="">Estado</option>
            <option>Disponible</option>
            <option>Vendido</option>
            <option>Reservado</option>
          </select>
          <button
            className="btn"
            onClick={() => handleBackfill(false)}
            disabled={backfilling}
            style={{ padding: '8px 10px', fontSize: 12, whiteSpace: 'nowrap' }}
          >
            {backfilling
              ? `IA ${backfillProgress?.done}/${backfillProgress?.total}`
              : `✦ IA ${products.filter(p => !p.ai_tags && p.status !== 'Vendido' && (p.photos?.length || p.photo_url)).length}`
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
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn" style={{ padding: '8px 10px', fontWeight: view === 'grid' ? 700 : 400 }} onClick={() => setView('grid')}>⊞</button>
            <button className="btn" style={{ padding: '8px 10px', fontWeight: view === 'table' ? 700 : 400 }} onClick={() => setView('table')}>☰</button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PosterModal product={posterProduct} onClose={closePoster} />
      <ShareModal  product={shareProduct}  onClose={closeShare} />
      <SellModal   product={sellProduct}   onClose={closeSell} onSold={handleSold} />

      {/* Content */}
      {activeTab === 'searches' ? (
        <SearchLog />
      ) : activeTab === 'bundles' ? (
        <BundleManager />
      ) : loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <>
          <div style={{ padding: '8px 16px', fontSize: 12, color: '#9e8a6a' }}>
            {`${filtered.length} producto${filtered.length !== 1 ? 's' : ''}`}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
              <div style={{ fontFamily: "'Playfair Display', serif" }}>No hay productos aquí</div>
              <Link to="/admin/upload" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex', textDecoration: 'none' }}>
                + Agregar producto
              </Link>
            </div>
          ) : view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: 16 }}>
              {filtered.map(p => {
                const s = swipeStats[p.id]
                return (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <ProductCard product={p} admin onStatusChange={handleStatusChange} />
                    {s && (s.likes > 0 || s.skips > 0 || s.wa_requests > 0) && (
                      <div style={{ display: 'flex', gap: 6, padding: '6px 10px', background: '#fff', borderTop: '1px solid #e8e0d4', fontSize: 11 }}>
                        <span style={{ color: '#2e7d32' }}>♥ {s.likes || 0}</span>
                        <span style={{ color: '#9e8a6a' }}>✕ {s.skips || 0}</span>
                        {s.wa_requests > 0 && <span style={{ color: '#1565c0' }}>💬 {s.wa_requests}</span>}
                        {s.likes > 0 && <span style={{ color: '#9e8a6a', marginLeft: 'auto' }}>{Math.round((s.likes / ((s.likes || 0) + (s.skips || 0))) * 100)}%</span>}
                      </div>
                    )}
                    <div style={{ padding: '6px 10px', background: '#fff', borderTop: '1px solid #e8e0d4', display: 'flex', gap: 6 }}>
                      <button onClick={() => openShare(p)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf8f5', color: '#1a1209', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        📤
                      </button>
                      <button onClick={() => openPoster(p)} style={{ flex: 1, padding: '6px', borderRadius: 6, border: '1px solid #e8e0d4', background: '#faf8f5', color: '#1a1209', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        🖼️
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', padding: '0 16px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e8e0d4' }}>
                <thead>
                  <tr style={{ background: '#1a1209', color: '#f5e6c8' }}>
                    {['Producto','Lote','Talla','Precio','Venta','Dto','Ingreso','Días','Estado','♥','Acciones'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, letterSpacing: 0.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const days     = daysSince(p.created_at)
                    const dotColor = days > 60 ? '#c62828' : days > 30 ? '#e65100' : '#2e7d32'
                    const st       = STATUS_STYLES[p.status] || STATUS_STYLES.Disponible
                    const sw       = swipeStats[p.id]
                    const hasDiscount = p.discount && p.discount > 0
                    return (
                      <tr key={p.id} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f5', borderBottom: '1px solid #e8e0d4' }}>
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
                        <td style={{ padding: '9px 12px', fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>Bs. {p.price}</td>
                        <td style={{ padding: '9px 12px' }}>
                          {p.sold_price
                            ? <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: p.sold_price < p.price ? '#c62828' : '#2e7d32' }}>Bs. {p.sold_price}</span>
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
                            {p.status !== 'Disponible' && <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#2e7d32' }} onClick={() => handleStatusChange(p.id, 'Disponible')}>Disponible</button>}
                            {p.status !== 'Vendido'    && <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#c62828' }} onClick={() => openSell(p)}>Vendido</button>}
                            {p.status !== 'Reservado'  && <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#e65100' }} onClick={() => handleStatusChange(p.id, 'Reservado')}>Reservar</button>}
                            <button className="btn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openShare(p)}>📤</button>
                            <button className="btn" style={{ fontSize: 11, padding: '3px 7px' }} onClick={() => openPoster(p)}>🖼️</button>
                            <button className="btn" style={{ fontSize: 11, padding: '3px 7px', color: '#c62828', borderColor: '#ffcdd2' }} onClick={() => handleDelete(p.id, p.name, p.size, p.name)}>✕</button>
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
