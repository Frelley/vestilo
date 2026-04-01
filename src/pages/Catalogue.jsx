import { useState, useEffect } from 'react'
import { getProducts } from '../lib/supabase.js'
import { SIZES, COLORS, STYLES, COLOR_DOTS } from '../lib/constants.js'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'

export default function Catalogue() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [filterColor, setFilterColor] = useState('')
  const [filterStyle, setFilterStyle] = useState('')
  const [priceMax, setPriceMax] = useState(1000)
  const [maxPrice, setMaxPrice] = useState(1000)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await getProducts({ status: 'Disponible' })
    if (data) {
      setProducts(data)
      const max = Math.max(...data.map(p => p.price), 500)
      setMaxPrice(max)
      setPriceMax(max)
    }
    setLoading(false)
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    if (q && !`${p.name} ${p.color} ${p.cat} ${(p.styles||[]).join(' ')}`.toLowerCase().includes(q)) return false
    if (filterSize && p.size !== filterSize) return false
    if (filterColor && p.color !== filterColor) return false
    if (filterStyle && !(p.styles||[]).includes(filterStyle)) return false
    if (p.price > priceMax) return false
    return true
  })

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f5' }}>
      <Header />

      {/* Hero */}
      <div style={{ background: '#1a1209', padding: '28px 20px 24px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          Vestilo a tu sonso
        </h1>
        <p style={{ color: '#9e8a6a', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' }}>
          Camisetas únicas · Santa Cruz, Bolivia
        </p>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e0d4', padding: '12px 16px' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, color, estilo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 10 }}
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ flex: '1 1 80px' }}>
            <option value="">Talla</option>
            {SIZES.map(s => <option key={s}>{s}</option>)}
          </select>

          <select value={filterColor} onChange={e => setFilterColor(e.target.value)} style={{ flex: '1 1 100px' }}>
            <option value="">Color</option>
            {COLORS.map(c => <option key={c}>{c}</option>)}
          </select>

          <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} style={{ flex: '1 1 110px' }}>
            <option value="">Estilo</option>
            {STYLES.map(s => <option key={s}>{s}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '2 1 160px' }}>
            <span style={{ fontSize: 12, color: '#9e8a6a', whiteSpace: 'nowrap' }}>
              Hasta Bs. {priceMax}
            </span>
            <input
              type="range" min={0} max={maxPrice} step={10}
              value={priceMax} onChange={e => setPriceMax(+e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          {(search || filterSize || filterColor || filterStyle || priceMax < maxPrice) && (
            <button className="btn" style={{ fontSize: 12, padding: '8px 12px' }} onClick={() => {
              setSearch(''); setFilterSize(''); setFilterColor(''); setFilterStyle(''); setPriceMax(maxPrice)
            }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      <div style={{ padding: '10px 16px', fontSize: 12, color: '#9e8a6a' }}>
        {loading ? 'Cargando...' : `${filtered.length} producto${filtered.length !== 1 ? 's' : ''} disponible${filtered.length !== 1 ? 's' : ''}`}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9e8a6a' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16 }}>
            No encontramos lo que buscas
          </div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Intenta con otros filtros</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
          padding: 16
        }}>
          {filtered.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '24px 16px', color: '#9e8a6a', fontSize: 12, borderTop: '1px solid #e8e0d4', marginTop: 20 }}>
        Vestilo a tu sonso · Santa Cruz, Bolivia
      </div>
    </div>
  )
}
