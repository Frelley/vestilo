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
import { Search, Close } from '../components/AtelierIcons.jsx'

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
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (loadError) return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--serif)', color: 'var(--ink)', fontSize: 22, fontWeight: 500, marginBottom: 8 }}>No se pudo cargar el catálogo</div>
      <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>Revisá tu conexión e intentá de nuevo</div>
      <button onClick={load} className="v-search-btn" style={{ padding: '11px 22px' }}>Reintentar</button>
    </div>
  )

  const searchBar = (
    <div className="v-search-wrap">
      <form className="v-search" onSubmit={e => { e.preventDefault(); doSearch(searchQuery) }}>
        <div className="v-search-field">
          <Search size={16} style={{ color: 'var(--muted)', flexShrink: 0 }} />
          <input
            className="v-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {!searchQuery && !searchFocused && (
            <div key={suggIdx} className="v-search-ghost">
              Buscar con IA… <span className="v-search-eg">ej: {SEARCH_SUGGESTIONS[suggIdx]}</span>
            </div>
          )}
        </div>
        <button type="submit" className="v-search-btn" disabled={isSearching || !searchQuery.trim()}>
          {isSearching ? '…' : 'Buscar'}
        </button>
        {searchIds !== null && (
          <button type="button" className="v-search-clear" onClick={clearSearch}><Close size={15} /></button>
        )}
      </form>
      {searchIds !== null && (
        <div className="v-search-meta">
          {queue.length === 0
            ? <span>Sin resultados · <button type="button" className="v-link" onClick={clearSearch}>limpiar búsqueda</button></span>
            : `${queue.length} resultado${queue.length !== 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )

  const filterBar = (
    <>
      {searchBar}
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
      searchBar={searchBar}
      showFilters={showFilters} setShowFilters={setShowFilters} hasFilter={hasFilter}
      filterSize={filterSize} setFilterSize={setFilterSize}
      priceMax={priceMax} setPriceMax={setPriceMax} maxPrice={maxPrice}
    />
  )
}
