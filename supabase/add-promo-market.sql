-- 「なんでもPR」タブ用の追加設定。Supabase の SQL Editor に貼って Run してください（何度実行しても大丈夫です）。
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  country text check (country is null or country ~ '^[A-Z]{2}$'),
  title text not null check (char_length(title) between 1 and 60),
  kind text check (kind in ('YouTube・SNS','お店・サービス','商品','仕事の募集・依頼','イベント','その他')),
  body text not null check (char_length(body) between 1 and 300),
  link text check (link is null or (link ~* '^https://' and char_length(link) <= 300)),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);

alter table public.promos add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');

alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('place','review','channel','stay','promo'));

create or replace function public.reports_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.reports where kind = new.kind and target = new.target;
  if n >= 3 then
    if new.kind = 'place' then update public.places set hidden = true where id::text = new.target;
    elsif new.kind = 'review' then update public.reviews set hidden = true where id::text = new.target;
    elsif new.kind = 'channel' then update public.channels set hidden = true where id::text = new.target;
    elsif new.kind = 'stay' then update public.stays set hidden = true where id::text = new.target;
    elsif new.kind = 'promo' then update public.promos set hidden = true where id::text = new.target;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists promos_rate on public.promos;
create trigger promos_rate before insert on public.promos for each row execute function public.rate_limit();

alter table public.promos enable row level security;
drop policy if exists promos_read on public.promos;
create policy promos_read on public.promos for select using (not hidden or public.is_mod());
drop policy if exists promos_insert on public.promos;
create policy promos_insert on public.promos for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists promos_update on public.promos;
create policy promos_update on public.promos for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists promos_delete on public.promos;
create policy promos_delete on public.promos for delete to authenticated using (created_by = auth.uid() or public.is_mod());

grant select on public.promos to anon, authenticated;
grant insert, update, delete on public.promos to authenticated;
-- 「マーケット」タブ用の追加設定。Supabase の SQL Editor に貼って Run してください（何度実行しても大丈夫です）。
create table if not exists public.market (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 40),
  kind text not null check (kind in ('譲ります','探してます')),
  title text not null check (char_length(title) between 1 and 60),
  price text check (char_length(price) <= 40),
  body text not null check (char_length(body) between 1 and 300),
  contact text check (char_length(contact) <= 80),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);

alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('place','review','channel','stay','promo','market'));

create or replace function public.reports_after() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.reports where kind = new.kind and target = new.target;
  if n >= 3 then
    if new.kind = 'place' then update public.places set hidden = true where id::text = new.target;
    elsif new.kind = 'review' then update public.reviews set hidden = true where id::text = new.target;
    elsif new.kind = 'channel' then update public.channels set hidden = true where id::text = new.target;
    elsif new.kind = 'stay' then update public.stays set hidden = true where id::text = new.target;
    elsif new.kind = 'promo' then update public.promos set hidden = true where id::text = new.target;
    elsif new.kind = 'market' then update public.market set hidden = true where id::text = new.target;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists market_rate on public.market;
create trigger market_rate before insert on public.market for each row execute function public.rate_limit();

alter table public.market enable row level security;
drop policy if exists market_read on public.market;
create policy market_read on public.market for select using (not hidden or public.is_mod());
drop policy if exists market_insert on public.market;
create policy market_insert on public.market for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists market_update on public.market;
create policy market_update on public.market for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists market_delete on public.market;
create policy market_delete on public.market for delete to authenticated using (created_by = auth.uid() or public.is_mod());

grant select on public.market to anon, authenticated;
grant insert, update, delete on public.market to authenticated;
