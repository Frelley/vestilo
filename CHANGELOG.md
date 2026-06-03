# Vestilo — Version History

| Version | Changes |
|---|---|
| v7.7 | Atelier redesign (admin pass): restyled Login, Upload, Sell modal, admin product cards, and the dashboard shell (stats, tabs, toolbar) to the Atelier system. Deep utility modals (Share, Poster, Bundles) inherit the new palette. |
| v7.6 | Atelier visual redesign (storefront pass): new Bodoni Moda + Hanken Grotesk type system, warm paper palette, unified single light theme (Swipe deck no longer dark), custom SVG icon set replacing emoji, restyled catalogue grid, product detail, swipe deck, and lista de compra. Admin/Upload/Login restyle pending. |
| v7.4 | Auto-started ecommerce background cleanup for new uploads and moved first-photo cleanup onto OpenAI Batch API with polling finalization. |
| v7.3 | Restored high-fidelity image model and limited default background cleanup to the first photo to reduce per-product cost without sacrificing product accuracy. |
| v7.2 | Switched ecommerce photo cleanup to the budget image model while keeping strict background/edge-only prompt constraints. |
| v7.1 | Reverted photo cleanup to high-fidelity background/edge-only edits to prevent product, mannequin, and logo hallucination. |
| v7.0 | Locked ecommerce photo cleanup to the budget model with medium quality and lighter ironing that preserves natural fabric texture. |
| v6.9 | Limited ecommerce photo cleanup to the first two product photos so front/back are processed while extra detail photos stay unchanged. |
| v6.8 | Updated ecommerce photo cleanup prompt to lightly iron/steam shirts by reducing harsh wrinkles while preserving fabric texture and product details. |
| v6.7 | Tuned ecommerce photo cleanup quality defaults: medium image quality, lighter JPEG compression, and stricter product-preservation prompt. |
| v6.6 | Added OpenAI ecommerce photo cleanup: per-product processing, pending-batch admin action, original photo preservation, and Supabase processing metadata. |
| v6.5 | Replaced Claude Haiku live AI calls with OpenAI `gpt-5.4-nano` for color detection and search fallback. |
| v1.0 | Initial build |
| v1.1 | Real credentials |
| v1.2 | Multi-photo support |
| v1.3 | Tinder swipe, liked list, swipe stats |
| v1.4 | Bugfix cardRef |
| v1.5 | Bugfix useRef |
| v1.6 | ShareModal (admin, 3 WA templates + URL). Customer share on swipe card + product page + liked list |
| v1.7 | Color filter → soft sort (matches float up, all cards visible). Size dropdown XS→XXL. Filter badge + dot indicator |
| v1.8 | XXXL size. Auto-inventory label (SIZE-NNN) on Upload, editable after autofill |
| v1.9 | Photo download button (🖼️ Foto) in ShareModal |
| v2.0 | Mode picker on entry (Swipe vs Catálogo). Grid catalogue view with heart buttons. Mode toggle in top bar. Shared liked list across both modes |
| v2.1 | Price column → numeric(10,2). Price rounding to .99 on blur in Upload |
| v2.2 | Smart sort: items < 2 days old float to top, then by like ratio (likes/total swipes) |
| v2.5 | Tap main product image cycles photos. Title updated to "Vestilo a tu sonso!" everywhere |
| v2.6 | PosterModal: 1080x1080 social media poster generator with QR code, copy image, download, copy caption |
| v2.7 | AI features: auto-analyze product photos on upload (Claude Sonnet), generates description + hidden ai_tags. Admin backfill button. AI search bar via /api/search |
| v2.8 | All prices set to 34.99 Bs. Location section added (Centro, calle Charcas). Swipe card flip: tap center = flip to back |
| v2.9 | Shared tag dictionary (api/tags.js): canonical vocab, synonym map, semantic groups, ANTONYMS, Levenshtein fuzzy matching. Antonym exclusion in search. Scored RPC min score ≥ 2 |
| v3.0 | Visual polish: grid cards hover lift + image zoom, mode picker radial gradient, swipe action buttons with glow shadows |
| v3.1 | Search: rotating animated placeholder suggestions. Search logging to search_logs table. Admin "🔍 Búsquedas" tab with stats and bar chart |
| v3.2 | Bulk actions: select mode, checkboxes, floating bulk bar. Soft delete + "🗄 Archivados" tab. API rate limiting (search 30/min, analyze 10/min) |
| v3.3 | AI color auto-detection on first photo upload (Claude Haiku). Default price → 35 Bs |
| v3.4 | Expanded colors (Beige, Azul marino, Vino). Tag dictionary: garment types, fixed sudadera→hoodie bug |
| v3.5 | Favorites page: removed WA onboarding overlay, WA button is floating pill |
| v3.6 | Bulk discount promo: buy 3+ shirts → Bs. 5 off each (floor Bs. 20/shirt). PromoBanner in both modes |
| v3.7 | Mode usage logging: mode_logs table. Admin "👆 Modos" tab |
| v3.8 | Renamed "Mis favoritas" → "Lista de compra". Removed SpotlightOnboarding entirely |
| v3.9 | UX: skip mode picker (auto-detect mobile→swipe, desktop→grid). Zero-results shows "Limpiar búsqueda". Photo arrows on swipe cards. Grid scroll + filter state persists via sessionStorage |
| v4.0 | Swipe UX overhaul: description is last slide in photo sequence. Cart badge fix. Skip/like labels. Mode toggles as text |
| v4.4 | Orders system: name modal → order in DB, products auto-reserved. Admin "📋 Pedidos" tab |
| v4.5 | Haptic feedback: 15ms like, 8ms skip, 20ms order send |
| v4.8 | Catalogue.jsx refactored: extracted SwipeView, GridView, LikedList, PromoBanner, FlyParticle, ModePicker, WhatsappIcon, catalogueHelpers.js |
| v4.9 | FilterPanel component: dedupes light/dark filter UI into one component with `dark` prop |
| v5.0 | Bulk discount threshold lowered to 3 shirts. PromoBanner updated |
| v5.1 | Swipe queue shuffled randomly each session (Fisher-Yates). Loop-around on swipe past last/first |
| v5.6 | Carousel swipe: prev/next shirts slide in from left/right as you drag |
| v5.7 | Meta Commerce Manager product feed: /api/meta-feed returns CSV in Meta feed format |
| v6.0 | Poster redesign: brand header 44px, color-tinted background (15 themes), vibe label badge, CTA text, pill size tag, price 80px, URL removed |
| v6.1 | TikTok product feed: /api/tiktok-feed returns CSV in TikTok catalogue format |
| v6.2 | Separate content-theme pipeline for reels: `content_themes` + `content_entities`, new dictionary in `api/content-themes.js`, analyzer writes reel clusters, admin shows grouped content buckets |
