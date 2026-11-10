-- ノマドノート：Supabase 用スキーマ（SQL Editor に貼って実行）
-- 前提：Supabase の新規プロジェクト。何度実行してもエラーにならないように作ってあります。

-- ========== プロフィール（Discordログインした人） ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '旅人',
  role text not null default 'member' check (role in ('member','moderator')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '旅人'), 40))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_mod() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'moderator');
$$;

-- ========== 国別コスト（1か国＝1行。街・グルメ・安全も中に入る） ==========
create table if not exists public.countries (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) < 20000),
  rev int not null default 1,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.country_revisions (
  id bigserial primary key,
  code text not null,
  rev int not null,
  data jsonb not null,
  edited_by uuid references public.profiles(id) on delete set null,
  edited_at timestamptz not null default now()
);

-- 編集のたびに、履歴を残して版を進める。1時間に30回を超える編集は止める。
create or replace function public.countries_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if not public.is_mod() then
      if (select count(*) from public.country_revisions where edited_by = auth.uid() and edited_at > now() - interval '1 hour') >= 30 then
        raise exception 'rate_limit';
      end if;
    end if;
    insert into public.country_revisions(code, rev, data, edited_by, edited_at)
      values (old.code, old.rev, old.data, old.updated_by, old.updated_at);
    new.rev := old.rev + 1;
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists countries_before on public.countries;
create trigger countries_before before insert or update on public.countries
for each row execute function public.countries_before();

-- ========== お店（旅人が追加したもの） ==========
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 40),
  area text check (char_length(area) <= 40),
  name text not null check (char_length(name) between 1 and 80),
  dish text check (char_length(dish) <= 100),
  addr text check (char_length(addr) <= 160),
  note text check (char_length(note) <= 200),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);

-- ========== レビュー（お店のidは、旅人が追加した店のuuid、または最初から載っている店のid） ==========
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_key text not null check (char_length(place_key) between 1 and 60),
  stars int not null check (stars between 1 and 5),
  body text not null check (char_length(body) between 1 and 300),
  visited text check (char_length(visited) <= 20),
  price text check (char_length(price) <= 30),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);
create unique index if not exists reviews_one_per_user on public.reviews(place_key, created_by);

-- ========== チャンネル紹介 ==========
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  url text not null check (url ~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/' and char_length(url) <= 200),
  countries text[] not null default '{}' check (cardinality(countries) <= 10),
  genre text check (char_length(genre) <= 40),
  descr text check (char_length(descr) <= 100),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);

-- ========== 穴場の宿 ==========
create table if not exists public.stays (
  id uuid primary key default gen_random_uuid(),
  country text not null check (country ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 40),
  name text not null check (char_length(name) between 1 and 60),
  kind text check (kind in ('ホステル','ゲストハウス','コリビング','ホテル','アパート・民泊','その他')),
  price text check (char_length(price) <= 40),
  work text check (work in ('◎','○','△','×')),
  body text not null check (char_length(body) between 1 and 300),
  link text check (link is null or (link ~* '^https://' and char_length(link) <= 300)),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);

-- ========== 通報（3人が通報すると自動で隠れる） ==========
create table if not exists public.reports (
  kind text not null check (kind in ('place','review','channel','stay')),
  target text not null,
  reporter uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (kind, target, reporter)
);

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
    end if;
  end if;
  return new;
end $$;

drop trigger if exists reports_after on public.reports;
create trigger reports_after after insert on public.reports
for each row execute function public.reports_after();

-- ========== 連続投稿の制限（1時間に、各テーブル10件まで） ==========
create or replace function public.rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.is_mod() then return new; end if;
  execute format('select count(*) from public.%I where created_by = $1 and created_at > now() - interval ''1 hour''', tg_table_name)
    into n using new.created_by;
  if n >= 10 then raise exception 'rate_limit'; end if;
  return new;
end $$;

drop trigger if exists places_rate on public.places;
create trigger places_rate before insert on public.places for each row execute function public.rate_limit();
drop trigger if exists reviews_rate on public.reviews;
create trigger reviews_rate before insert on public.reviews for each row execute function public.rate_limit();
drop trigger if exists channels_rate on public.channels;
create trigger channels_rate before insert on public.channels for each row execute function public.rate_limit();
drop trigger if exists stays_rate on public.stays;
create trigger stays_rate before insert on public.stays for each row execute function public.rate_limit();

-- ========== アクセス権（RLS） ==========
alter table public.profiles enable row level security;
alter table public.countries enable row level security;
alter table public.country_revisions enable row level security;
alter table public.places enable row level security;
alter table public.reviews enable row level security;
alter table public.channels enable row level security;
alter table public.stays enable row level security;
alter table public.reports enable row level security;

-- 見るのは誰でもOK（隠された投稿は、世話役だけ）
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);
drop policy if exists countries_read on public.countries;
create policy countries_read on public.countries for select using (true);
drop policy if exists revisions_read on public.country_revisions;
create policy revisions_read on public.country_revisions for select using (true);
drop policy if exists places_read on public.places;
create policy places_read on public.places for select using (not hidden or public.is_mod());
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (not hidden or public.is_mod());
drop policy if exists channels_read on public.channels;
create policy channels_read on public.channels for select using (not hidden or public.is_mod());

-- 書けるのはログインした人だけ
drop policy if exists countries_insert on public.countries;
create policy countries_insert on public.countries for insert to authenticated with check (true);
drop policy if exists countries_update on public.countries;
create policy countries_update on public.countries for update to authenticated using (true) with check (true);

drop policy if exists places_insert on public.places;
create policy places_insert on public.places for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists places_update on public.places;
create policy places_update on public.places for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists places_delete on public.places;
create policy places_delete on public.places for delete to authenticated using (created_by = auth.uid() or public.is_mod());

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete to authenticated using (created_by = auth.uid() or public.is_mod());

drop policy if exists channels_insert on public.channels;
create policy channels_insert on public.channels for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists channels_update on public.channels;
create policy channels_update on public.channels for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists channels_delete on public.channels;
create policy channels_delete on public.channels for delete to authenticated using (created_by = auth.uid() or public.is_mod());
drop policy if exists stays_read on public.stays;
create policy stays_read on public.stays for select using (not hidden or public.is_mod());
drop policy if exists stays_insert on public.stays;
create policy stays_insert on public.stays for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists stays_update on public.stays;
create policy stays_update on public.stays for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists stays_delete on public.stays;
create policy stays_delete on public.stays for delete to authenticated using (created_by = auth.uid() or public.is_mod());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (reporter = auth.uid());
drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated using (public.is_mod());

-- 一般ユーザー（member）は、自分のプロフィールの表示名だけ直せる（権限は変えられない）
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update on public.countries to authenticated;
grant insert, update, delete on public.places, public.reviews, public.channels, public.stays to authenticated;
grant insert on public.reports to authenticated;
grant update (display_name) on public.profiles to authenticated;
