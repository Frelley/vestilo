import { SIZES } from '../lib/constants.js'

// Single light Atelier theme; `dark` prop kept for call-site compatibility but unused.
export default function FilterPanel({ filterSize, setFilterSize, priceMax, setPriceMax, maxPrice, hasFilter }) {
  return (
    <div className="v-filters">
      <div className="v-filter-row">
        <div className="v-field">
          <label>Talla</label>
          <select value={filterSize} onChange={e => setFilterSize(e.target.value)}>
            <option value="">Todas</option>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="v-field v-field-grow">
          <label>Hasta <b>Bs. {priceMax}</b></label>
          <input type="range" min={0} max={maxPrice} step={5} value={priceMax}
            onChange={e => setPriceMax(+e.target.value)} />
        </div>
        {hasFilter && (
          <button className="v-btn-ghost" onClick={() => { setFilterSize(''); setPriceMax(maxPrice) }}>
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}
