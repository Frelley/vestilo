// Shared Atelier display bits: status badge + color dots
import { STATUS_TONES, COLOR_DOTS, colorsArray } from '../lib/constants.js'

export function StatusBadge({ status }) {
  const tone = STATUS_TONES[status] || STATUS_TONES.Disponible
  return (
    <span className="v-status" style={{ color: tone }}>
      <span className="v-status-dot" style={{ background: tone }} />
      {status}
    </span>
  )
}

export function ColorDots({ color, size = 10 }) {
  const colors = colorsArray(color)
  return colors.map(c => (
    <span key={c} className="v-cdot" title={c}
      style={{ width: size, height: size, background: COLOR_DOTS[c] || '#ccc' }} />
  ))
}
