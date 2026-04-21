// Currently unused — v3.9 auto-detects mobile→swipe, desktop→grid.
// Kept for potential re-enable.
export default function ModePicker({ onPick }) {
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #2d1f12 0%, #1a1209 65%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 30, fontWeight: 700, textAlign: 'center', marginBottom: 6 }}>Vestilo a tu sonso!</div>
      <div style={{ color: '#9e8a6a', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 10 }}>Santa Cruz · Bolivia</div>
      <div style={{ width: 32, height: 1, background: '#3d3020', marginBottom: 32 }} />
      <div style={{ fontSize: 13, color: '#7a6a55', marginBottom: 20, textAlign: 'center' }}>¿Cómo querés explorar?</div>
      <div style={{ display: 'flex', gap: 14, width: '100%', maxWidth: 340 }}>
        {[
          { key: 'swipe', icon: '👆', label: 'Swipe', desc: 'Desliza una por una y armá tu lista de compra' },
          { key: 'grid',  icon: '🗂️', label: 'Catálogo', desc: 'Ve todas las prendas en una cuadrícula' },
        ].map(opt => (
          <button key={opt.key} onClick={() => onPick(opt.key)} className="mode-card" style={{
            background: '#241810', border: '1px solid #3d3020',
          }}>
            <span style={{ fontSize: 38 }}>{opt.icon}</span>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#f5e6c8', fontSize: 15, fontWeight: 700 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: '#9e8a6a', textAlign: 'center', lineHeight: 1.55 }}>{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
