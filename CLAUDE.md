# Vestilo a tu sonso — Project Map

## Live URLs
- Public: https://vestilo.vercel.app
- Admin:  https://vestilo.vercel.app/admin/login

## Credentials
- Supabase: https://vlyliwsmmzjvhavahjbl.supabase.co
- WA: 59175506716
- Vercel: vestilo | GitHub: https://github.com/Frelley/vestilo (public)

## Version: v5.1 (next: v5.2) ✓

## Stack
React 18 + Vite + Supabase + Vercel. All src/ files use top-level imports, no require(). Pure JS changes → edit files directly on GitHub, Vercel auto-deploys in ~2 min. package.json changes → full rebuild needed.

## Deploy method
`git push` from PowerShell/CMD → Vercel auto-deploys in ~2 min. (Claude in Chrome extension also works via GitHub API if needed.)

## File structure
src/
  main.jsx, App.jsx, index.css
  lib/
    supabase.js       — Supabase client + getProducts, getProductsSorted,
                        addProduct, updateProduct, deleteProduct, uploadPhoto,
                        signIn, signOut, getNextLabelForSize
    constants.js      — SIZES (XS S M L XL XXL XXXL), COLORS, STYLES, CATS,
                        COLOR_DOTS, STATUS_STYLES, WA_NUMBER,
                        daysSince(), formatDate(), waMessage()
  components/
    Header.jsx
    ProductCard.jsx   — Props: product, admin, onStatusChange, onShare
    Toast.jsx         — useToast() hook + <Toast>
    ShareModal.jsx    — Admin WA share modal. 3 templates (Elegante/Hype/Minimal),
                        live preview, copy + open-in-WA + photo download.
                        Product URL included.
                        Exports: useShareModal() + <ShareModal>
    PosterModal.jsx   — Admin social media poster generator.
                        Renders 1080x1080 canvas: product photo + dark gradient overlay,
                        notes as description text, price, size tag, brand name,
                        URL text, QR code bottom-right.
                        3 actions: copy image, download PNG, copy caption.
                        Exports: usePosterModal() + <PosterModal>
  pages/
    Catalogue.jsx     — Public UI. On entry: mode picker (Swipe or Catálogo).
                        Mode saved in localStorage key 'vestilo-mode'.
                        SWIPE: Tinder swipe UI. Tap card = flip to detail.
                        GRID: 2-column card grid, tap = /p/:id, heart = like.
                        Both modes share same sort, filters, liked list.
                        SORT: items < 2 days old float to top (newest first),
                        then sorted by like ratio (likes / total swipes).
                        Filters: size (hard), price (hard), color removed.
                        Active filter shows dot on Filtros button + dismissible badge.
                        Swipes recorded via record_swipe RPC.
                        Liked IDs in localStorage key 'vestilo-liked'.
    Product.jsx       — Public product page /p/:id. Photo gallery.
                        Tapping main photo cycles to next image.
                        "Compartir" button (Web Share API, fallback = clipboard).
                        WhatsApp button with pre-filled message.
    Login.jsx         — /admin/login. Supabase email+password.
    Admin.jsx         — /admin. Stats bar, tabs, grid+table toggle.
                        Each product has: 📤 WA (ShareModal) + 🖼️ Poster (PosterModal).
                        Swipe stats shown.
    Upload.jsx        — /admin/upload and /admin/upload/:id.
                        Up to 4 photos, reorder, first = thumbnail.
                        Auto-label: pick size → name fills as SIZE-NNN (e.g. M-003).
                        Price rounding: on blur snaps to nearest .99 (e.g. 120 → 119.99).

## Supabase schema
products: id (uuid PK), created_at, name, cat, size, color, price (numeric 10,2),
          styles (text[]), status (Disponible/Vendido/Reservado),
          photo_url (legacy), photos (text[]), notes (internal)
swipe_stats: product_id (FK→products PK), likes, skips, updated_at
Storage bucket: product-photos (public), path: products/{id}-{ts}.{ext}
Auth: email/password. RLS: public reads Disponible only.

## Routes
/ → Catalogue (public)
/p/:id → Product (public)
/admin/login → Login (public)
/admin → Admin (protected)
/admin/upload → Upload (protected)
/admin/upload/:id → Upload (protected)

## Version history
v1.0 Initial build
v1.1 Real credentials
v1.2 Multi-photo support
v1.3 Tinder swipe, liked list, swipe stats
v1.4 Bugfix cardRef
v1.5 Bugfix useRef
v1.6 ShareModal (admin, 3 WA templates + URL). Customer share on swipe card + product page + liked list.
v1.7 Color filter → soft sort (matches float up, all cards visible). Size dropdown XS→XXL. Filter badge + dot indicator.
v1.8 XXXL size. Auto-inventory label (SIZE-NNN) on Upload, editable after autofill.
v1.9 Photo download button (🖼️ Foto) in ShareModal.
v2.0 Mode picker on entry (Swipe vs Catálogo). Grid catalogue view with heart buttons. Mode toggle in top bar. Shared liked list across both modes.
v2.1 Price column → numeric(10,2). Price rounding to .99 on blur in Upload.
v2.2 Smart sort: items < 2 days old float to top, then by like ratio (likes/total swipes).
v2.3 (skipped)
v2.4 (skipped)
v2.5 Tap main product image cycles photos. Title updated to "Vestilo a tu sonso!" everywhere.
v2.6 PosterModal: 1080x1080 social media poster generator with QR code, copy image, download, copy caption. ShareModal wired into Admin. Both 📤 WA and 🖼️ Poster buttons on every product card.
v2.7 AI features: auto-analyze product photos on upload (Claude Sonnet), generates description (notes) + hidden ai_tags. Admin backfill button. AI search bar in Catalogue (both modes) via /api/search using Claude Haiku tag extraction + Supabase array overlap.
v2.8 All prices set to 34.99 Bs (price column converted integer→numeric(10,2)). Location section added (Centro, calle Charcas) to both swipe and grid views. Swipe card flip: tap center = flip to back showing description, tags, WA button; tap sides = cycle photos.
v2.9 Shared tag dictionary (api/tags.js): canonical vocabulary, synonym map, semantic groups, ANTONYMS map, Levenshtein fuzzy matching. analyze-product pins Claude to canonical tags + post-processes output. search: pure-JS first, Haiku fallback (3-5 specific tags, no generic ones), antonym exclusion (liso excludes estampado/grafico/etc via parallel Supabase query), scored RPC min score ≥ 2. Search UX: Buscar always visible, ✕ clear appears alongside when results active. Run api/search_products_scored.sql in Supabase once.
v3.0 Visual polish: grid cards with hover lift + image zoom (.product-card), mode picker radial gradient bg + card hover lift (.mode-card), swipe action buttons with colored glow shadows (.action-btn), swipe card drop-shadow filter, .card base shadow, .btn active scale, Product page photo arrows larger with blur backdrop.
v3.1 Search improvements: rotating animated placeholder suggestions in both swipe and grid search bars (10 real example queries, CSS fade-in animation, pauses while typing). Search logging: every query + tags + result count written to Supabase search_logs table (server-side, fire-and-forget). Admin "🔍 Búsquedas" tab: stats (today/week/total/zero-result rate), top queries bar chart, full chronological log with tags and result counts. Run sql/search_logs.sql in Supabase once.
v3.2 Bulk actions: select mode toggle in admin toolbar (☐ Sel.), checkboxes on grid cards + table rows, "Seleccionar todo" link, floating bulk action bar (Disponible/Reservar/Vendido/Archivar). Soft delete: 🗄 archive button replaces permanent delete on all normal views; archived products go to "🗄 Archivados" tab with Restaurar + Eliminar actions; Archivado status invisible to public. API rate limiting: /api/search (30 req/min), /api/analyze-product (10 req/min) via in-memory per-IP limiter (api/_rateLimit.js).
v3.3 AI color auto-detection: uploading the first photo calls /api/detect-colors (Claude Haiku) and pre-fills the color buttons if none are selected. Default price changed to 35 Bs.
v3.4 Expanded colors (Beige, Azul marino, Vino) added to UI and AI detection. Tag dictionary: added camisa/hoodie/buzo garment types, fixed sudadera→hoodie bug (was wrongly mapping to franela material), added chompa/campera/sweatshirt synonyms.
v3.5 Favorites page: removed WA onboarding overlay, WhatsApp button is now a floating pill fixed at bottom of screen.
v3.6 Bulk discount promo: buy 7+ shirts → Bs. 5 off each (floor Bs. 20/shirt). PromoBanner in both swipe and grid modes. LikedList shows savings breakdown when discount applies, teaser countdown when below threshold. WA message auto-includes discount total.
v3.7 Mode usage logging: mode_logs table in Supabase tracks every mode pick/switch. Admin "👆 Modos" tab shows swipe vs grid breakdown with % bars and event history.
v3.8 Renamed "Mis favoritas" → "Lista de compra" throughout. Removed SpotlightOnboarding entirely (component, state, refs, steps).
v3.9 UX: skip mode picker (auto-detect mobile→swipe, desktop→grid; preference saved). Zero-results search shows "Limpiar búsqueda" inline. Photo ‹ › arrows on swipe cards. Discount teaser shows ¡Casi! + projected savings. Grid scroll + filter state persists across /p/:id navigation (sessionStorage). Location updated to "Retiro en ~1h · Lun–Sáb 10–18h".
v4.5 Haptic feedback: 15ms on like/heart, 8ms on skip, 20ms on order send. No-op on iOS.
v4.4 Orders system: name modal before WA send creates order in DB, products auto-reserved. Admin "📋 Pedidos" tab: confirm sold (total price input, split per product) or liberar (back to Disponible). Run sql/orders.sql in Supabase first.
v4.0 Swipe UX overhaul: description is now the last slide in the photo sequence (tap › to reach it, ‹ to go back — no more center-tap flip). Cart badge uses likedProducts.length (sold items no longer inflate count). Skip/like buttons get "pasar"/"me gusta" labels. Mode toggles are now text ("Ver todo"/"Swipe"). Counter and card area padding fixed to prevent clipping on short screens.
v4.8 Catalogue.jsx refactored into multiple files (785 → 185 lines orchestrator). Extracted: SwipeView, GridView, LikedList, PromoBanner, FlyParticle, ModePicker, WhatsappIcon components; catalogueHelpers.js for storage wrappers, getPhotos, bulkSavings, vibe, genRef, recordInteraction, shared constants. Behavior preserved exactly (swipe index still persists across mode switches).
v4.9 FilterPanel component: dedupes light (grid) and dark (swipe) filter UI into one component with a `dark` prop.
v5.0 Bulk discount threshold lowered from 7 to 3 shirts (BULK_MIN 6→2). PromoBanner updated to "3 o más".
v5.1 Swipe queue shuffled randomly each session (Fisher-Yates in Catalogue.jsx). Swipe loop-around: swiping past last item wraps to first, swiping before first wraps to last.

## Rules
1. Read file before editing
2. No require() — top-level imports only
3. Increment version each change (current v2.9, next v3.0)
4. No reused filenames for zips
5. Color filter in Catalogue is ALWAYS soft sort, never hard filter
6. New Supabase table/function → provide .sql file first
7. Liked list stays in localStorage, no backend needed
8. Deploy: push via GitHub API using Claude in Chrome extension. Token is NOT stored anywhere — ask user to provide it or give them the file to replace manually.
9. Poster uses product.notes as description text (not product.name which is auto-label)
10. Repo has stale root-level duplicates (Catalogue.jsx, ShareModal.jsx, constants.js, node_modules/, vestilo-v1.1.zip) — harmless to build but should be cleaned up
