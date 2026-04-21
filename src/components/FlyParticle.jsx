export default function FlyParticle({ src, fromX, fromY, toX, toY }) {
  return (
    <div style={{
      position: 'fixed', left: fromX - 20, top: fromY - 20,
      width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
      border: '2px solid #4CAF50', pointerEvents: 'none', zIndex: 9999,
      animation: 'fly-to-cart 0.65s ease-out forwards',
      '--fly-dx': `${toX - fromX}px`, '--fly-dy': `${toY - fromY}px`,
    }}>
      {src
        ? <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
        : <div style={{ width: '100%', height: '100%', background: '#4CAF50' }} />}
    </div>
  )
}
