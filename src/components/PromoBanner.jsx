export default function PromoBanner({ dark }) {
  const bg     = dark ? '#2a1f10' : '#fdf6e8'
  const border = dark ? '#3d3020' : '#e8d9b0'
  const text   = dark ? '#c4b9a8' : '#5a4020'
  const accent = dark ? '#f5e6c8' : '#1a1209'
  return (
    <div style={{ margin: '4px 12px 0', background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14 }}>🏷️</span>
      <span style={{ fontSize: 12, color: text, lineHeight: 1.4 }}>
        Comprá <span style={{ fontWeight: 700, color: accent }}>3 o más</span> camisetas
        {' '}y bajamos <span style={{ fontWeight: 700, color: accent }}>Bs. 5</span> a cada una
        {' '}<span style={{ fontSize: 11, color: dark ? '#9e8a6a' : '#7a6651' }}>(mínimo Bs. 20 c/u)</span>
      </span>
    </div>
  )
}
