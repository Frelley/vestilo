import { useState, useEffect, useCallback } from 'react'
import {
  getBundles, createBundle, updateBundle, deleteBundle,
  getBundleWithProducts, getBundleAudit
} from '../lib/supabase.js'
import { Toast, useToast } from './Toast.jsx'
import { STATUS_STYLES, formatDate } from '../lib/constants.js'

// ─── Bundle status pill ───────────────────────────────────────────────────────
const BUNDLE_STATUS = {
  active:    { bg: '#e8f5e9', color: '#2e7d32', label: 'Activo' },
  completed: { bg: '#e3f2fd', color: '#1565c0', label: 'Completado' },
  archived:  { bg: '#fafafa', color: '#9e8a6a', label: 'Archivado' },
}

// ─── Profit badge ─────────────────────────────────────────────────────────────
function ProfitBadge({ value }) {
  const positive = value > 0
  const zero     = value === 0
  return (
    <span style={{
      fontWeight: 700,
      color: zero ? '#9e8a6a' : positive ? '#2e7d32' : '#c62828',
      fontFamily: "'Playfair Display', serif",
    }}>
      {positive ? '+' : ''}Bs. {(value || 0).toFixed(2)}
    </span>
  )
}

// ─── Margin bar ───────────────────────────────────────────────────────────────
function MarginBar({ value }) {
  const pct   = parseFloat(value) || 0
  const color = pct > 30 ? '#2e7d32' : pct > 0 ? '#e65100' : '#c62828'
  const width = Math.min(Math.abs(pct), 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: '#f0ede8', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${width}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 44, textAlign: 'right' }}>
        {pct > 0 ? '+' : ''}{pct.toFixed(1)}%
      </span>
    </div>
  )
}

// ─── Create / Edit Bundle Form ────────────────────────────────────────────────
function BundleForm({ bundle, onSave, onCancel }) {
  const editing = Boolean(bundle)
  const [form, setForm] = useState({
    name:          bundle?.name          || '',
    description:   bundle?.description   || '',
    source:        bundle?.source        || '',
    cost_per_unit: bundle?.cost_per_unit || '',
    total_quantity: bundle?.total_quantity || '',
    prefix:        bundle?.prefix        || '',   // label prefix e.g. "L5"
    status:        bundle?.status        || 'active',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSave() {
    if (!form.name || !form.cost_per_unit || !form.total_quantity) {
      setError('Nombre, costo y cantidad son requeridos')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      cost_per_unit:  parseFloat(form.cost_per_unit),
      total_quantity: parseInt(form.total_quantity, 10),
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#1a1209' }}>
        {editing ? 'Editar lote' : 'Nuevo lote'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Nombre del lote *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lote 5 — Feria Exposición" />
        </div>
        <div>
          <label style={lbl}>Fuente</label>
          <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Feria, Donación" />
        </div>
        <div>
          <label style={lbl}>Costo por prenda (Bs.) *</label>
          <input type="number" value={form.cost_per_unit} onChange={e => setForm(f => ({ ...f, cost_per_unit: e.target.value }))} placeholder="35" />
        </div>
        <div>
          <label style={lbl}>Cantidad total *</label>
          <input type="number" value={form.total_quantity} onChange={e => setForm(f => ({ ...f, total_quantity: e.target.value }))} placeholder="50" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Notas internas</label>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} style={{ resize: 'vertical' }} placeholder="Observaciones sobre este lote..." />
        </div>
        {editing && (
          <div>
            <label style={lbl}>Estado</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Activo</option>
              <option value="completed">Completado</option>
              <option value="archived">Archivado</option>
            </select>
          </div>
        )}
      </div>

      {form.cost_per_unit && form.total_quantity && (
        <div style={{ background: '#f0ede8', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#3d3020' }}>
          Inversión total estimada: <strong style={{ fontFamily: "'Playfair Display', serif" }}>Bs. {(parseFloat(form.cost_per_unit) * parseInt(form.total_quantity, 10)).toFixed(2)}</strong>
        </div>
      )}

      {error && (
        <div style={{ background: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} className="btn" style={{ flex: 1 }}>Cancelar</button>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ flex: 2 }}>
          {saving ? <span className="spinner" style={{ width: 16, height: 16, borderTopColor: '#f5e6c8' }} /> : editing ? 'Guardar cambios' : 'Crear lote →'}
        </button>
      </div>
    </div>
  )
}

// ─── Bundle Detail Drawer ─────────────────────────────────────────────────────
function BundleDetail({ bundleId, onClose }) {
  const [bundle, setBundle] = useState(null)
  const [audit, setAudit]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bundleId) return
    setLoading(true)
    Promise.all([
      getBundleWithProducts(bundleId),
      getBundleAudit(bundleId, 30),
    ]).then(([bundleRes, auditRes]) => {
      if (bundleRes.data) setBundle(bundleRes.data)
      if (auditRes.data)  setAudit(auditRes.data)
      setLoading(false)
    })
  }, [bundleId])

  if (!bundleId) return null

  const bs = BUNDLE_STATUS[bundle?.status] || BUNDLE_STATUS.active

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 500,
        background: '#faf8f5', zIndex: 301, overflowY: 'auto',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e8e0d4', position: 'sticky', top: 0, background: '#faf8f5', zIndex: 1 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#9e8a6a', cursor: 'pointer' }}>←</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: '#1a1209' }}>Detalle del lote</div>
          <div style={{ width: 28 }} />
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : !bundle ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9e8a6a' }}>No se encontró el lote</div>
        ) : (
          <div style={{ padding: 20 }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#1a1209' }}>{bundle.name}</div>
                <span className="badge" style={{ background: bs.bg, color: bs.color }}>{bs.label}</span>
              </div>
              {bundle.source && <div style={{ fontSize: 13, color: '#9e8a6a' }}>Fuente: {bundle.source}</div>}
              {bundle.description && <div style={{ fontSize: 13, color: '#9e8a6a', marginTop: 4 }}>{bundle.description}</div>}
              <div style={{ fontSize: 11, color: '#c4b9a8', marginTop: 4 }}>Creado {formatDate(bundle.created_at)}</div>
            </div>

            {/* KPI grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                ['💰 Inversión', `Bs. ${(bundle.total_cost || 0).toFixed(2)}`, '#1a1209'],
                ['📈 Ingresos', `Bs. ${(bundle.total_revenue || 0).toFixed(2)}`, '#2e7d32'],
                ['✂️ Descuentos', `− Bs. ${(bundle.total_discounts || 0).toFixed(2)}`, '#e65100'],
                ['📦 Costo unit.', `Bs. ${(bundle.cost_per_unit || 0).toFixed(2)}`, '#1a1209'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: '#9e8a6a', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 16, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Ganancia + margen */}
            <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Rentabilidad</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#3d3020' }}>Ganancia bruta</span>
                <ProfitBadge value={bundle.gross_profit} />
              </div>
              <MarginBar value={bundle.profit_margin_percent} />
              {bundle.avg_selling_price > 0 && (
                <div style={{ fontSize: 12, color: '#9e8a6a', marginTop: 10 }}>
                  Precio promedio de venta: <strong style={{ color: '#1a1209' }}>Bs. {(bundle.avg_selling_price || 0).toFixed(2)}</strong>
                </div>
              )}
            </div>

            {/* Progress */}
            <div style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Progreso del lote</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  ['Vendidas', bundle.units_sold || 0, '#2e7d32'],
                  ['Reservadas', bundle.units_reserved || 0, '#e65100'],
                  ['Disponibles', bundle.units_remaining || 0, '#9e8a6a'],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: '#9e8a6a' }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: '#f0ede8', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${bundle.total_quantity > 0 ? ((bundle.units_sold || 0) / bundle.total_quantity * 100) : 0}%`,
                  background: 'linear-gradient(90deg, #2e7d32, #66bb6a)',
                  transition: 'width 0.5s ease',
                  borderRadius: 4,
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#9e8a6a', marginTop: 6, textAlign: 'right' }}>
                {bundle.units_sold || 0} / {bundle.total_quantity} vendidas ({bundle.total_quantity > 0 ? Math.round((bundle.units_sold || 0) / bundle.total_quantity * 100) : 0}%)
              </div>
            </div>

            {/* Products list */}
            {bundle.products?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Prendas en este lote ({bundle.products.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {bundle.products.map(p => {
                    const st = STATUS_STYLES[p.status] || STATUS_STYLES.Disponible
                    return (
                      <div key={p.id} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {p.photo_url
                          ? <img src={p.photo_url} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 36, background: '#f0ede8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>👕</div>
                        }
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1209' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#9e8a6a' }}>
                            {p.bundle_label && <span style={{ marginRight: 6 }}>🏷 {p.bundle_label}</span>}
                            Talla {p.size} · Bs. {p.price}
                            {p.status === 'Vendido' && p.sold_price && p.sold_price !== p.price && (
                              <span style={{ color: p.sold_price < p.price ? '#c62828' : '#2e7d32' }}> → Bs. {p.sold_price}</span>
                            )}
                          </div>
                        </div>
                        <span className="badge" style={{ background: st.bg, color: st.color, flexShrink: 0 }}>{p.status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Audit log */}
            {audit.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Actividad reciente</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {audit.map(entry => (
                    <div key={entry.id} style={{ display: 'flex', gap: 10, fontSize: 12, color: '#3d3020', borderLeft: '2px solid #e8e0d4', paddingLeft: 10 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600 }}>{entry.action}</span>
                        {entry.details?.new_status && <span style={{ color: '#9e8a6a' }}> → {entry.details.new_status}</span>}
                        {entry.details?.sold_price && entry.details.sold_price !== entry.details.price && (
                          <span style={{ color: '#e65100' }}> (Bs. {entry.details.sold_price})</span>
                        )}
                      </div>
                      <div style={{ color: '#c4b9a8', whiteSpace: 'nowrap' }}>
                        {new Date(entry.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main BundleManager ───────────────────────────────────────────────────────
export default function BundleManager() {
  const [bundles, setBundles]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingBundle, setEditingBundle] = useState(null)
  const [detailId, setDetailId]   = useState(null)
  const { toast, show } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await getBundles()
    if (data) setBundles(data)
    setLoading(false)
  }

  async function handleCreate(payload) {
    const { data, error } = await createBundle(payload)
    if (error) { show('Error al crear lote', 'error'); return }
    setBundles(prev => [data, ...prev])
    setShowCreate(false)
    show('Lote creado ✓')
  }

  async function handleUpdate(id, payload) {
    const { data, error } = await updateBundle(id, payload)
    if (error) { show('Error al actualizar', 'error'); return }
    setBundles(prev => prev.map(b => b.id === id ? data : b))
    setEditingBundle(null)
    show('Lote actualizado ✓')
  }

  async function handleDelete(b) {
    if (!confirm(`¿Eliminar "${b.name}"? Los productos del lote quedarán sin asignar.`)) return
    await deleteBundle(b.id)
    setBundles(prev => prev.filter(x => x.id !== b.id))
    show('Lote eliminado')
  }

  const summaryTotals = bundles.reduce((acc, b) => ({
    invested: acc.invested + (b.total_cost || 0),
    revenue:  acc.revenue  + (b.total_revenue || 0),
    profit:   acc.profit   + (b.gross_profit || 0),
    discounts: acc.discounts + (b.total_discounts || 0),
  }), { invested: 0, revenue: 0, profit: 0, discounts: 0 })

  return (
    <div style={{ padding: 16 }}>
      <Toast toast={toast} />
      <BundleDetail bundleId={detailId} onClose={() => setDetailId(null)} />

      {/* Global KPIs */}
      {bundles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: 16 }}>
          {[
            ['Invertido', `Bs. ${summaryTotals.invested.toFixed(0)}`, '#c62828'],
            ['Ingresos', `Bs. ${summaryTotals.revenue.toFixed(0)}`, '#2e7d32'],
            ['Ganancia', `${summaryTotals.profit >= 0 ? '+' : ''}Bs. ${summaryTotals.profit.toFixed(0)}`, summaryTotals.profit >= 0 ? '#2e7d32' : '#c62828'],
            ['Descuentos', `− Bs. ${summaryTotals.discounts.toFixed(0)}`, '#e65100'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 8, padding: '10px 12px', borderTop: `3px solid ${color}` }}>
              <div style={{ fontSize: 10, color: '#9e8a6a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: '#1a1209' }}>
          Lotes de inventario
        </div>
        <button onClick={() => { setShowCreate(true); setEditingBundle(null) }} className="btn btn-primary" style={{ fontSize: 12 }}>
          + Nuevo lote
        </button>
      </div>

      {showCreate && (
        <BundleForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : bundles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#9e8a6a' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: '#1a1209', marginBottom: 6 }}>Sin lotes registrados</div>
          <div style={{ fontSize: 13 }}>Crea tu primer lote para empezar a trackear rentabilidad</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bundles.map(b => {
            const bs      = BUNDLE_STATUS[b.status] || BUNDLE_STATUS.active
            const pct     = b.total_quantity > 0 ? Math.round((b.units_sold || 0) / b.total_quantity * 100) : 0
            const isEditing = editingBundle?.id === b.id

            if (isEditing) return (
              <BundleForm
                key={b.id}
                bundle={editingBundle}
                onSave={payload => handleUpdate(b.id, payload)}
                onCancel={() => setEditingBundle(null)}
              />
            )

            return (
              <div key={b.id} style={{ background: '#fff', border: '1px solid #e8e0d4', borderRadius: 12, overflow: 'hidden' }}>
                {/* Top row */}
                <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 15, color: '#1a1209' }}>{b.name}</div>
                      <span className="badge" style={{ background: bs.bg, color: bs.color }}>{bs.label}</span>
                    </div>
                    {b.source && <div style={{ fontSize: 12, color: '#9e8a6a', marginTop: 2 }}>{b.source}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => setDetailId(b.id)} className="btn" style={{ fontSize: 11, padding: '4px 8px' }}>Ver</button>
                    <button onClick={() => { setEditingBundle(b); setShowCreate(false) }} className="btn" style={{ fontSize: 11, padding: '4px 8px' }}>Editar</button>
                    <button onClick={() => handleDelete(b)} className="btn" style={{ fontSize: 11, padding: '4px 8px', color: '#c62828', borderColor: '#ffcdd2' }}>✕</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ padding: '0 16px 8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9e8a6a', marginBottom: 4 }}>
                    <span>{b.units_sold || 0} vendidas · {b.units_reserved || 0} reservadas · {b.units_remaining || 0} disponibles</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ background: '#f0ede8', borderRadius: 3, height: 6, display: 'flex', overflow: 'hidden' }}>
                    <div style={{ width: `${b.total_quantity > 0 ? (b.units_sold || 0) / b.total_quantity * 100 : 0}%`, background: '#2e7d32', transition: 'width 0.4s' }} />
                    <div style={{ width: `${b.total_quantity > 0 ? (b.units_reserved || 0) / b.total_quantity * 100 : 0}%`, background: '#ffb74d', transition: 'width 0.4s' }} />
                  </div>
                </div>

                {/* Financials */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0, borderTop: '1px solid #f0ede8' }}>
                  {[
                    ['Invertido', `Bs. ${(b.total_cost || 0).toFixed(0)}`, '#9e8a6a'],
                    ['Ingresos', `Bs. ${(b.total_revenue || 0).toFixed(0)}`, '#2e7d32'],
                    ['Ganancia', `${(b.gross_profit || 0) >= 0 ? '+' : ''}${(b.gross_profit || 0).toFixed(0)}`, (b.gross_profit || 0) >= 0 ? '#2e7d32' : '#c62828'],
                    ['Margen', `${(b.profit_margin_percent || 0).toFixed(1)}%`, (b.profit_margin_percent || 0) >= 0 ? '#1a1209' : '#c62828'],
                  ].map(([label, val, color], i) => (
                    <div key={label} style={{ padding: '10px 12px', borderRight: i < 3 ? '1px solid #f0ede8' : 'none' }}>
                      <div style={{ fontSize: 10, color: '#9e8a6a', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const lbl = {
  fontSize: 11, color: '#9e8a6a', display: 'block',
  marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1
}
