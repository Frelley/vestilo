---
project: vestilo
points: 3
created: 2026-05-21
completed: 2026-05-21
status: done
---

# Add ecommerce photo cleanup workflow

## What was done
Added `api/process-product-photos.js`, `sql/photo_processing.sql`, admin controls in `src/pages/Admin.jsx`, upload metadata handling in `src/pages/Upload.jsx`, and schema/version docs. The workflow preserves original photos, processes one product at a time through OpenAI image edits, uploads processed images to Supabase Storage, and updates `photo_url` / `photos`.

## Result
Admin now has a per-product `Fondo` action and a bulk `Fondo N` action for pending product photos. New uploads are marked pending automatically.

## Notes
Before production use, run `sql/photo_processing.sql` in Supabase and add `OPENAI_API_KEY` to Vercel.
