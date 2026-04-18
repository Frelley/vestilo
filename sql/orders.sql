-- ============================================================
-- VESTILO — Orders table
-- Run in: Supabase → SQL Editor → New query
-- ============================================================

create table if not exists orders (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  ref           text not null,
  customer_name text not null,
  status        text default 'pending' check (status in ('pending', 'sold', 'released')),
  product_ids   uuid[] not null,
  nominal_total numeric(10,2),
  discount      numeric(10,2) default 0,
  sold_total    numeric(10,2),
  wa_message    text
);

alter table orders enable row level security;

-- Anonymous customers can create orders
create policy "Public can create orders"
  on orders for insert
  with check (true);

-- Authenticated admins can read and update
create policy "Admins can view orders"
  on orders for select
  to authenticated
  using (true);

create policy "Admins can update orders"
  on orders for update
  to authenticated
  using (true);
