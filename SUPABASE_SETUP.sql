-- ============================================================
-- VESTILO A TU SONSO — Supabase setup
-- Run this entire file in: Supabase → SQL Editor → New query
-- ============================================================

-- 1. Products table
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz default now(),
  name        text not null,
  cat         text,
  size        text,
  color       text,
  price       integer,
  styles      text[] default '{}',
  status      text default 'Disponible' check (status in ('Disponible','Vendido','Reservado')),
  photo_url   text,
  notes       text
);

-- 2. Enable Row Level Security
alter table products enable row level security;

-- 3. Public can read Disponible products only
create policy "Public can view available products"
  on products for select
  using (status = 'Disponible');

-- 4. Authenticated users (your team) can read all products
create policy "Admins can view all products"
  on products for select
  to authenticated
  using (true);

-- 5. Authenticated users can insert, update, delete
create policy "Admins can insert products"
  on products for insert
  to authenticated
  with check (true);

create policy "Admins can update products"
  on products for update
  to authenticated
  using (true);

create policy "Admins can delete products"
  on products for delete
  to authenticated
  using (true);

-- 6. Storage bucket for photos
insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict do nothing;

-- 7. Anyone can view photos (they are public)
create policy "Public photo access"
  on storage.objects for select
  using (bucket_id = 'product-photos');

-- 8. Authenticated users can upload photos
create policy "Admin photo upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-photos');

create policy "Admin photo update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-photos');

create policy "Admin photo delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-photos');

-- Done! Now go to Authentication → Users → Add user
-- to create your admin account.
