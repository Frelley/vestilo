---
project: vestilo
points: 1
created: 2026-05-21
completed: 2026-05-21
status: done
---

# Replace Haiku AI calls with OpenAI nano

## What was done
Replaced the Claude Haiku usage in `api/detect-colors.js` and `api/search.js` with a shared OpenAI Responses helper in `api/_openai.js`. Kept the same route contracts for color detection and search fallback.

## Result
Vestilo can run low-cost live AI classification/search fallback through OpenAI `gpt-5.4-nano` instead of Claude Haiku.

## Notes
`analyze-product.js` still uses Claude Sonnet because product analysis needs separate quality testing before replacing it.
