-- Tabla de packs/bonos para GF Studio
create table if not exists public.gf_packs (
  id bigserial primary key,
  name text not null,
  services_included text,
  pack_price numeric not null,
  list_price numeric,
  uses_count integer not null default 1,
  created_at timestamptz default now()
);

-- RLS wide-open (igual que las otras tablas)
alter table public.gf_packs enable row level security;
create policy "public read" on public.gf_packs for select using (true);
create policy "public write" on public.gf_packs for all using (true);
