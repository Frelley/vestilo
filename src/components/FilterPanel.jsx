import { SIZES } from '../lib/constants.js'

export default function FilterPanel({ dark, filterSize, setFilterSize, priceMax, setPriceMax, maxPrice, hasFilter }) {
  const bg     = dark ? '#241810' : '#f0ede8'
  const border = dark ? '#3d3020' : '#e8e0d4'
  const selectBg    = dark ? '#1a1209' : undefined
  const selectColor = dark ? '#f5e6c8' : undefined
  const allSizesLabel = dark ? 'Talla' : 'Todas las tallas'

  return (
    <div style={{ background: bg, margin: '0 12px 8px', borderRadius: 10, padding: '12px 14px', border: `1px solid ${border}` }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ flex: '1 1 80px', background: selectBg, color: selectColor, border: `1px solid ${border}`, borderRadius: 6, padding: '7px 10px', fontSize: 13 }}>
          <option value="">{allSizesLabel}</option>
          {SIZES.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '2 1 160px' }}>
          <span style={{ fontSize: 11, color: '#9e8a6a', whiteSpace: 'nowrap' }}>Hasta Bs. {priceMax}</span>
          <input type="range" min={0} max={maxPrice} step={10} value={priceMax} onChange={e => setPriceMax(+e.target.value)} style={{ flex: 1 }} />
        </div>
        {hasFilter && <button onClick={() => { setFilterSize(''); setPriceMax(maxPrice) }} style={{ fontSize: 11, color: '#9e8a6a', background: 'transparent', border: `1px solid ${border}`, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Limpiar</button>}
      </div>
    </div>
  )
}
