import { useState, useEffect } from 'react'
import { getProductsSorted, supabase } from '../lib/supabase.js'
import {
  SEARCH_SUGGESTIONS,
  getLiked, saveLiked, saveMode, getDefaultMode,
  getSavedFilters, saveFiltersToSession,
  recordInteraction, vibe,
} from '../lib/catalogueHelpers.js'
import GridView from '../components/GridView.jsx'
import SwipeView from '../components/SwipeView.jsx'
import FilterPanel from '../components/FilterPanel.jsx'

export default function Catalogue() {
  const [mode, setMode]           = useState(getDefaultMode)
  const [products, setProducts]   = useState([])
  const [queue, setQueue]         = useState([])
  const [index, setIndex]         = useState(0)
  const [photoIdx, setPhotoIdx]   = useState(0)
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [likedIds, setLikedIds]   = useState(getLiked)
  const [showFilters, setShowFilters] = useState(false)
  const [filterSize, setFilterSize]   = useState(() => getSavedFilters().filterSize || '')
  const [priceMax, setPriceMax]       = useState(() => getSavedFilters().priceMax ?? 1000)
  const [maxPrice, setMaxPrice]       = useState(1000)
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchIds, setSearchIds]         = useState(null)   // null = no search active
  const [isSearching, setIsSearching]     = useState(false)
  const [searchFocused, setSearchFocused] = useState(false)
  const [suggIdx, setSuggIdx]             = useState(0)

  useEffect(() => {
    if (searchQuery) return
    const t = setInterval(() => setSuggIdx(i => (i + 1) % SEARCH_SUGGESTIONS.length), 3000)
    return () => clearInterval(t)
  }, [searchQuery])

  useEffect(() => { load() }, [])
  useEffect(() => { saveLiked(likedIds) }, [likedIds])
  useEffect(() => { saveFiltersToSession({ filterSize, priceMax }) }, [filterSize, priceMax])

  async function load() {
    setLoading(true)
    setLoadError(false)
    try {
      const { data, error } = await getProductsSorted({ status: 'Disponible' })
      if (error) throw error
      if (data) {
        setProducts(data)
        const max = Math.max(...data.map(p => p.price), 500)
        setMaxPrice(max); setPriceMax(max)
      }
    } catch {
      setLoadError(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    const filtered = products.filter(p => {
      if (searchIds !== null && !searchIds.includes(p.id)) return false
      if (filterSize && p.size !== filterSize) return false
      if (p.price > priceMax) return false
      return true
    })
    const arr = [...filtered]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    setQueue(arr); setIndex(0); setPhotoIdx(0)
  }, [filterSize, priceMax, products, searchIds])

  function pickMode(m, action = 'pick') {
    setMode(m); saveMode(m)
    supabase.from('mode_logs').insert({ mode: m, action }).then(() => {})
  }
  function switchMode() { pickMode(mode === 'swipe' ? 'grid' : 'swipe', 'switch') }
  function toggleLike(p) {
    vibe(likedIds.includes(p.id) ? 8 : 15)
    setLikedIds(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])
    recordInteraction(p.id, likedIds.includes(p.id) ? 'skip' : 'like')
  }
  function removeLiked(id) { setLikedIds(prev => prev.filter(x => x !== id)) }

  const likedProducts = products.filter(p => likedIds.includes(p.id))
  const hasFilter     = filterSize || priceMax < maxPrice

  async function doSearch(q) {
    if (!q.trim()) { setSearchIds(null); return }
    setIsSearching(true)
    try {
      const res = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) })
      const data = await res.json()
      setSearchIds(data.ids ?? [])
    } catch { setSearchIds([]) }
    setIsSearching(false)
  }

  function clearSearch() { setSearchQuery(''); setSearchIds(null) }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 32, height: 32, border: '2px solid #3d3020', borderTopColor: '#f5e6c8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (loadError) return (
    <div style={{ minHeight: '100vh', background: '#1a1209', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: "'Nunito', sans-serif", color: '#f5e6c8', fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No se pudo cargar el catálogo</div>
      <div style={{ color: '#9e8a6a', fontSize: 13, marginBottom: 24 }}>Revisá tu conexión e intentá de nuevo</div>
      <button onClick={load} style={{ background: '#c8622e', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Reintentar</button>
    </div>
  )

  const searchBar = (isDark) => (
    <div style={{ padding: '6px 12px 2px' }}>
      <form onSubmit={e => { e.preventDefault(); doSearch(searchQuery) }} style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder=""
            style={{ width: '100%', background: isDark ? '#241810' : '#fff', color: isDark ? '#f5e6c8' : '#1a1209', border: `1px solid ${isDark ? '#3d3020' : '#e8e0d4'}`, borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}
          />
          {!searchQuery && !searchFocused && (
            <div key={suggIdx} className="search-suggestion" style={{ color: isDark ? '#9e8a6a' : '#7a6651' }}>
              <span style={{ color: isDark ? '#9e8a6a' : '#9e8a6a' }}>Buscar con IA… </span>
              <span>ej: {SEARCH_SUGGESTIONS[suggIdx]}</span>
            </div>
          )}
        </div>
        <button type="submit" disabled={isSearching || !searchQuery.trim()} style={{ background: isDark ? '#f5e6c8' : '#1a1209', color: isDark ? '#1a1209' : '#f5e6c8', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer', opacity: (!searchQuery.trim() || isSearching) ? 0.5 : 1, whiteSpace: 'nowrap' }}>
          {isSearching ? '…' : 'Buscar'}
        </button>
        {searchIds !== null && (
          <button type="button" onClick={clearSearch} style={{ background: 'transparent', color: isDark ? '#9e8a6a' : '#7a6651', border: `1px solid ${isDark ? '#3d3020' : '#e8e0d4'}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✕
          </button>
        )}
      </form>
      {searchIds !== null && (
        <div style={{ fontSize: 11, color: isDark ? '#9e8a6a' : '#7a6651', padding: '4px 4px 2px' }}>
          {queue.length === 0
            ? <span>Sin resultados · <button type="button" onClick={clearSearch} style={{ background: 'none', border: 'none', color: isDark ? '#9e8a6a' : '#7a6651', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, padding: 0 }}>Limpiar búsqueda</button></span>
            : `${queue.length} resultado${queue.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )

  const filterBar = (
    <>
      {searchBar(false)}
      {showFilters && (
        <FilterPanel
          filterSize={filterSize} setFilterSize={setFilterSize}
          priceMax={priceMax} setPriceMax={setPriceMax} maxPrice={maxPrice}
          hasFilter={hasFilter}
        />
      )}
    </>
  )

  if (mode === 'grid') return (
    <GridView
      products={queue} likedIds={likedIds} onToggleLike={toggleLike}
      onSwitchMode={switchMode} filterBar={filterBar}
      likedProducts={likedProducts} onRemoveLiked={removeLiked}
      showFilters={showFilters} setShowFilters={setShowFilters} hasFilter={hasFilter}
    />
  )

  return (
    <SwipeView
      queue={queue}
      index={index} setIndex={setIndex}
      photoIdx={photoIdx} setPhotoIdx={setPhotoIdx}
      setLikedIds={setLikedIds}
      likedProducts={likedProducts}
      onRemoveLiked={removeLiked}
      onSwitchMode={switchMode}
      searchBar={searchBar(true)}
      showFilters={showFilters} setShowFilters={setShowFilters} hasFilter={hasFilter}
      filterSize={filterSize} setFilterSize={setFilterSize}
      priceMax={priceMax} setPriceMax={setPriceMax} maxPrice={maxPrice}
    />
  )
}
