-- PENA STEEL — configuração do banco (cole tudo no Supabase > SQL Editor > Run)
-- >>> ANTES DE RODAR: troque SEU-EMAIL@EXEMPLO.COM (linha da função is_admin) pelo e-mail do administrador.

-- 1) Tabelas ---------------------------------------------------------------
create table if not exists public.products (
  id           text primary key default gen_random_uuid()::text,
  created_at   timestamptz not null default now(),
  name         text not null,
  category     text not null,
  price        numeric(10,2) not null check (price >= 0),
  promo_price  numeric(10,2),
  stock        integer not null default 0,
  description  text,
  features     text[] not null default '{}',
  image_url    text,
  featured     boolean not null default false
);

create table if not exists public.orders (
  id          text primary key,
  created_at  timestamptz not null default now(),
  customer    jsonb not null,
  items       jsonb not null,
  total       numeric(10,2) not null,
  status      text not null default 'Aguardando confirmação'
);

-- 2) Quem é o administrador (apenas este e-mail altera dados) ----------------
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = lower('penasteel6@gmail.com')
$$;

-- 3) Segurança (RLS): ligada nas duas tabelas ---------------------------------
alter table public.products enable row level security;
alter table public.orders   enable row level security;

drop policy if exists "produtos: todos veem"        on public.products;
drop policy if exists "produtos: admin gerencia"    on public.products;
drop policy if exists "pedidos: qualquer um cria"   on public.orders;
drop policy if exists "pedidos: admin le"           on public.orders;
drop policy if exists "pedidos: admin atualiza"     on public.orders;

create policy "produtos: todos veem"     on public.products for select using (true);
create policy "produtos: admin gerencia" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "pedidos: qualquer um cria" on public.orders for insert to anon, authenticated
  with check (status = 'Aguardando confirmação' and total >= 0);
create policy "pedidos: admin le"        on public.orders for select to authenticated using (public.is_admin());
create policy "pedidos: admin atualiza"  on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant insert on public.orders to anon;
grant select, insert, update on public.orders to authenticated;

-- 4) Fotos dos produtos (Storage): pasta pública para leitura, só o admin envia ---
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true)
on conflict (id) do nothing;

drop policy if exists "fotos: admin envia"   on storage.objects;
drop policy if exists "fotos: admin troca"   on storage.objects;
drop policy if exists "fotos: admin apaga"   on storage.objects;
create policy "fotos: admin envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'produtos' and public.is_admin());
create policy "fotos: admin troca" on storage.objects for update to authenticated
  using (bucket_id = 'produtos' and public.is_admin());
create policy "fotos: admin apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'produtos' and public.is_admin());

-- 5) Produtos de exemplo (apague depois, pelo painel) --------------------------
insert into public.products (name, category, price, promo_price, stock, description, features, featured) values
 ('Relógio Steel Classic','masculino',289.90,249.90,5,'Caixa e pulseira em aço inoxidável.','{"Aço inoxidável","Cor prata"}',true),
 ('Pulseira Tennis Steel','pulseiras',149.90,null,5,'Pulseira com pedras e fecho reforçado.','{"Aço inoxidável","Pedras zircônia"}',true),
 ('Anel Aço Polido','aneis',79.90,null,5,'Anel liso com acabamento espelhado.','{"Aço inoxidável"}',false);
