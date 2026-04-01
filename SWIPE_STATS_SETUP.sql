-- ============================================================
-- VESTILO — Swipe stats update
-- Run in Supabase → SQL Editor → New query
-- ============================================================

-- 1. Stats table — one row per product
create table if not exists swipe_stats (
  product_id  uuid primary key references products(id) on delete cascade,
  likes       integer default 0,
  skips       integer default 0,
  updated_at  timestamptz default now()
);

-- 2. Enable RLS
alter table swipe_stats enable row level security;

-- 3. Anyone can read stats (needed for admin dashboard)
create policy "Public can read stats"
  on swipe_stats for select
  using (true);

-- 4. Function to record a swipe atomically
create or replace function record_swipe(p_product_id uuid, p_type text)
returns void language plpgsql security definer as $$
begin
  insert into swipe_stats (product_id, likes, skips)
  values (p_product_id, 0, 0)
  on conflict (product_id) do nothing;

  if p_type = 'like' then
    update swipe_stats set likes = likes + 1, updated_at = now() where product_id = p_product_id;
  elsif p_type = 'skip' then
    update swipe_stats set skips = skips + 1, updated_at = now() where product_id = p_product_id;
  end if;
end;
$$;

-- 5. Also add photos column if not already there (from v1.2)
alter table products add column if not exists photos text[] default '{}';
