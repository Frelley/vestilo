// CartHeart icon — cart outline with a heart inside.
// liked=true  → heart filled (currentColor)
// liked=false → heart transparent (outline only)
export default function CartHeart({ liked = false, size = 24, color, style }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color || 'currentColor'}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {/* Cart body */}
      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12" />
      <circle cx="9" cy="21" r="1" />
      <circle cx="17" cy="21" r="1" />
      {/* Heart — filled when liked, outline-only when not */}
      <path
        d="M13.5 7c-1.3-1.3-3-1.7-3.9-.8s-1.3 2.6-.4 3.9l.9.9 1.7 1.7 1.7-1.7.9-.9c.9-1.3.9-3-.4-3.9s-2.6-.5-3.9.8z"
        fill={liked ? (color || 'currentColor') : 'none'}
        stroke={color || 'currentColor'}
        strokeWidth="1.2"
      />
    </svg>
  )
}
