// Atelier icon set — 1.7px stroke, round caps. Outline/filled heart pattern.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function Search({ size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <circle {...base} cx="11" cy="11" r="7" />
      <line {...base} x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

export function Heart({ size = 18, filled = false, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path {...base} fill={filled ? 'currentColor' : 'none'}
        d="M12 21S3.5 15.6 3.5 9.8C3.5 6.9 5.6 5 8 5c1.7 0 3.1 1 4 2.4C12.9 6 14.3 5 16 5c2.4 0 4.5 1.9 4.5 4.8C20.5 15.6 12 21 12 21z" />
    </svg>
  )
}

export function Close({ size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <line {...base} x1="6" y1="6" x2="18" y2="18" />
      <line {...base} x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

export function ArrowLeft({ size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <line {...base} x1="20" y1="12" x2="5" y2="12" />
      <polyline {...base} points="11 6 5 12 11 18" />
    </svg>
  )
}

export function ChevL({ size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <polyline {...base} strokeWidth="2" points="15 5 8 12 15 19" />
    </svg>
  )
}

export function ChevR({ size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <polyline {...base} strokeWidth="2" points="9 5 16 12 9 19" />
    </svg>
  )
}

export function Filter({ size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <line {...base} x1="4" y1="7" x2="20" y2="7" />
      <line {...base} x1="4" y1="12" x2="20" y2="12" />
      <line {...base} x1="4" y1="17" x2="20" y2="17" />
      <circle {...base} fill="var(--paper)" cx="9" cy="7" r="2.4" />
      <circle {...base} fill="var(--paper)" cx="15" cy="12" r="2.4" />
      <circle {...base} fill="var(--paper)" cx="8" cy="17" r="2.4" />
    </svg>
  )
}

export function GridIco({ size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <rect {...base} x="4" y="4" width="7" height="7" rx="1" />
      <rect {...base} x="13" y="4" width="7" height="7" rx="1" />
      <rect {...base} x="4" y="13" width="7" height="7" rx="1" />
      <rect {...base} x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  )
}

export function SwipeIco({ size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <rect {...base} x="7" y="4" width="13" height="16" rx="2" />
      <path {...base} d="M7 8 L3 9.5 L7 17" />
    </svg>
  )
}

export function MapPin({ size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path {...base} d="M12 22s7-6.1 7-12a7 7 0 0 0-14 0c0 5.9 7 12 7 12z" />
      <circle {...base} cx="12" cy="10" r="2.6" />
    </svg>
  )
}

export function Tag({ size = 16, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <path {...base} d="M3 3h7l11 11-7 7L3 10V3z" />
      <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function Check({ size = 22, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <polyline {...base} strokeWidth="2" points="5 12.5 10 17.5 19 6.5" />
    </svg>
  )
}

export function Whatsapp({ size = 18, color = '#fff', style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

// Garment placeholder — tonal studio backdrop + soft tee glyph, shown when no photo.
export function Placeholder({ tone = '#E7DECF', photoIndex = 0, style }) {
  const tones = ['rgba(21,16,10,0.10)', 'rgba(21,16,10,0.085)', 'rgba(21,16,10,0.07)']
  const g = tones[photoIndex % tones.length]
  const teePath = 'M17 6 L11 11 L6 17 L11.5 21.5 L14 19.5 L14 42 L34 42 L34 19.5 L36.5 21.5 L42 17 L37 11 L31 6 C29 10 19 10 17 6 Z'
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: `radial-gradient(120% 90% at 50% 18%, ${tone} 0%, color-mix(in srgb, ${tone} 82%, #15100a) 140%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', ...style,
    }}>
      <svg viewBox="0 0 48 48" style={{ width: '42%', height: '42%' }}>
        <path d={teePath} fill={g} />
      </svg>
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0, textAlign: 'center',
        fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontSize: 11,
        color: 'rgba(21,16,10,0.22)', letterSpacing: 0.4,
      }}>Vestilo</div>
    </div>
  )
}
