# Vestilo a tu sonso — Project Map

## Definition of Done
First paid sales coming through the live store AND the marketing artifacts (ad creative, content, store polish) are portfolio-grade enough to showcase as Fiverr-sellable marketing work.

## Current Milestone
Start marketing content pipeline: create first social artifact (reel, poster, or ad creative) as a doubled-purpose portfolio piece.

## Ladders to
First income (short-term goal in `C:\dev\RichardBot\context\goals.md`)

## Deadline
None

## Phases
| Phase | Goal | Done? |
|-------|------|-------|
| 1 | Live store — product catalogue, swipe/like, cart, WhatsApp checkout | [x] |
| 2 | Growth — full catalogue (20+ products), social content pipeline, first sales | [ ] |
| 3 | Monetize — consistent weekly sales, Instagram audience, paid ads profitable | [ ] |

Current phase: 2

## Live URLs
- Public: https://vestilo.vercel.app
- Admin:  https://vestilo.vercel.app/admin/login

## Credentials
- Supabase: https://vlyliwsmmzjvhavahjbl.supabase.co
- WA: 59175506716
- Vercel: vestilo | GitHub: https://github.com/Frelley/vestilo (public)

## Version: v7.6 (next: v7.7)

## Stack
React 18 + Vite + Supabase + Vercel. Top-level imports only, no require(). Pure JS changes → edit on GitHub, Vercel auto-deploys in ~2 min. package.json changes → full rebuild.

## Deploy
`git push` from PowerShell/CMD → Vercel auto-deploys in ~2 min.

## File Structure
```
src/
  main.jsx · App.jsx · index.css
  lib/        supabase.js · constants.js · catalogueHelpers.js
  pages/      Catalogue.jsx · Product.jsx · Login.jsx · Admin.jsx · Upload.jsx
  components/ Header · ProductCard · Toast · ShareModal · PosterModal · FilterPanel
              SwipeView · GridView · LikedList · PromoBanner · ModePicker
              FlyParticle · WhatsappIcon · BundleManager · SellModal · CartHeart
api/          search · analyze-product · detect-colors
              tags · meta-feed · tiktok-feed · _rateLimit
sql/          orders · search_logs · mode_logs · add_ai_tags
db/           SCHEMA.md ← Supabase tables, columns, RLS, storage
```

## Key component notes
- **ShareModal** — admin WA share, 3 templates, live preview, copy/open-WA/photo download
- **PosterModal** — 1080x1080 canvas poster; no caption API call; uses `product.notes` as description (not `product.name`)
- **Catalogue** — mode picker (swipe/grid), smart sort (new float + like ratio), size/price filters (hard), color (soft sort only). Swipe is carousel; description is last slide
- **Upload** — up to 4 photos, reorder, auto-label SIZE-NNN, price rounds to .99 on blur, AI color detect on first photo
- **Admin** — tabs: products, 🔍 Búsquedas, 👆 Modos, 📋 Pedidos, 🗄 Archivados
- **catalogueHelpers.js** — storage wrappers, getPhotos, bulkSavings, vibe, genRef, recordInteraction

## Routes
`/` Catalogue · `/p/:id` Product · `/admin/login` Login
`/admin` Admin (protected) · `/admin/upload[/:id]` Upload (protected)

## Routing Table
| Task | Go to | Read | Skills |
|---|---|---|---|
| Feature / bug / UI work | `src/` | CLAUDE.md | `/simplify` · `/review` · `/security-review` |
| API or product feeds | `api/` | CLAUDE.md | `/simplify` · `/security-review` |
| DB / schema changes | `db/` | db/SCHEMA.md | — |
| Marketing strategy | `marketing/strategy/` | CONTEXT.md | `/content-strategy` · `/marketing-ideas` · `/competitor-profiling` · `/pricing-strategy` |
| Create content | `marketing/content-creation/` | CONTEXT.md | `/copywriting` · `/social-content` · `/ad-creative` · `/image` · `/video` |
| Plan or record a publish | `marketing/publishing/` | CONTEXT.md | `/analytics-tracking` · `/paid-ads` |

## Rules
1. Read file before editing
2. No require() — top-level imports only
3. Bump version before every change (current v6.6, next v6.7)
4. No reused filenames for zips
5. Color filter is ALWAYS soft sort, never hard filter
6. New Supabase table/function → write .sql file first, update db/SCHEMA.md
7. Liked list stays in localStorage only
8. Version history → CHANGELOG.md | DB details → db/SCHEMA.md
9. Root-level duplicates (Catalogue.jsx, ShareModal.jsx, constants.js, node_modules/, vestilo-v1.1.zip) are stale — harmless but should be cleaned up
