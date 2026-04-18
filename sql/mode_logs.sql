-- Run once in Supabase SQL editor
create table if not exists mode_logs (
  id         bigint generated always as identity primary key,
  created_at timestamptz default now(),
  mode       text not null check (mode in ('swipe', 'grid')),
  action     text not null check (action in ('pick', 'switch'))
);

alter table mode_logs enable row level security;
create policy "public insert" on mode_logs for insert with check (true);
create policy "admin read"   on mode_logs for select using (auth.role() = 'authenticated');
