export const WA_NUMBER = import.meta.env.VITE_WA_NUMBER || '59175506716'

export const SIZES   = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
export const COLORS  = ['Negro', 'Blanco', 'Gris', 'Azul', 'Azul marino', 'Rojo', 'Vino', 'Verde', 'Café', 'Beige', 'Amarillo', 'Rosa', 'Morado', 'Naranja', 'Multicolor']
export const STYLES  = ['Oversize', 'Slim fit', 'Crop', 'Manga larga', 'Bordado', 'Estampado', 'Tie-dye', 'Básica', 'Vintage']
export const CATS    = ['Básica', 'Diseño', 'Premium', 'Vintage', 'Deportiva', 'Edición limitada']

export const COLOR_DOTS = {
  Negro: '#1a1a1a', Blanco: '#f0ede8', Gris: '#9e9e9e', Azul: '#1565c0',
  'Azul marino': '#1a237e', Rojo: '#c62828', Vino: '#6d1b2e', Verde: '#2e7d32',
  Café: '#6d4c41', Beige: '#d4b896', Amarillo: '#f9a825',
  Rosa: '#e91e8c', Morado: '#6a1b9a', Naranja: '#e65100',
  Multicolor: 'linear-gradient(135deg,#f44336 0%,#2196f3 50%,#4caf50 100%)',
}

export const STATUS_STYLES = {
  Disponible: { bg: '#e8f5e9', color: '#2e7d32' },
  Vendido:    { bg: '#ffebee', color: '#c62828' },
  Reservado:  { bg: '#fff3e0', color: '#e65100' },
  Archivado:  { bg: '#f0ede8', color: '#9e8a6a' },
}

export function daysSince(dateStr) {
  if (!dateStr) return 0
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// helpers for multi-color
export function colorsArray(color) {
  if (!color) return []
  return Array.isArray(color) ? color : [color]
}

export function colorsLabel(color) {
  return colorsArray(color).join(', ')
}

export function waMessage(product) {
  const colorStr = product.color ? `, color ${colorsLabel(product.color)}` : ''
  return encodeURIComponent(
    `Hola! Me interesa la camiseta *"${product.name}"* (Bs. ${product.price}, talla ${product.size}${colorStr}). ¿Está disponible?`
  )
}
