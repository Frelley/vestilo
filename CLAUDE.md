# Vestilo a tu sonso — Project Map

## Live URLs
- Public: https://vestilo.vercel.app
- Admin:  https://vestilo.vercel.app/admin/login

## Credentials
- Supabase: https://vlyliwsmmzjvhavahjbl.supabase.co
- WA: 59175506716
- Vercel: vestilo | GitHub: https://github.com/Frelley/vestilo (public)

## Version: v2.9 (next: v3.0) ✓

## Stack
React 18 + Vite + Supabase + Vercel. All src/ files use top-level imports, no require(). Pure JS changes → edit files directly on GitHub, Vercel auto-deploys in ~2 min. package.json changes → full rebuild needed.

## Deploy method
No local git setup. Edit files directly on GitHub in the browser → Vercel auto-deploys.
Claude in Chrome extension can push files via GitHub API using a classic token (repo scope).

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
