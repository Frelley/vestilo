-- Run once in Supabase SQL editor
-- Creates the search_logs table for tracking public search queries

create table if not exists search_logs (
  id           bigserial   primary key,
  query        text        not null,
  tags         text[]      not null default '{}',
  result_count int         not null default 0,
  created_at   timestamptz not null default now()
);

alter table search_logs enable row level security;

-- Authenticated admins can read
create policy "Authenticated can read search logs"
  on search_logs for select
  to authenticated
  using (true);

-- Note: inserts are done server-side via service role key (bypasses RLS)
