-- VESTILO — Scored product search RPC
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Returns products whose ai_tags overlap with search_tags,
-- ordered by number of matching tags (most relevant first).
--
-- Usage (PostgREST):
--   POST /rest/v1/rpc/search_products_scored
--   Body: { "search_tags": ["negro", "oversize", "streetwear"] }
--
-- Returns: [{ id: uuid, score: bigint }, ...]

CREATE OR REPLACE FUNCTION search_products_scored(search_tags text[])
RETURNS TABLE(id uuid, score bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    (
      SELECT COUNT(*)
      FROM unnest(p.ai_tags) AS t
      WHERE t = ANY(search_tags)
    ) AS score
  FROM products p
  WHERE p.status = 'Disponible'
    AND p.ai_tags && search_tags
  ORDER BY score DESC;
$$;
