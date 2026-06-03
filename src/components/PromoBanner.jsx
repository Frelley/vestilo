import { Tag } from './AtelierIcons.jsx'

// Single light Atelier theme; `dark` prop kept for call-site compatibility but unused.
export default function PromoBanner() {
  return (
    <div className="v-promo">
      <span className="v-promo-mark"><Tag size={14} style={{ color: '#fff' }} /></span>
      <span className="v-promo-txt">
        Llevá <b>3 o más</b> y bajamos <b>Bs. 5</b> a cada prenda{' '}
        <span className="v-promo-fine">(mínimo Bs. 20 c/u)</span>
      </span>
    </div>
  )
}
