-- 「コラボ依頼掲示板」用の追加設定。Supabase の SQL Editor に貼って Run してください（何度実行しても大丈夫です）。
create table if not exists public.collab_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 60),
  body text not null check (char_length(body) between 1 and 300),
  channel_name text check (channel_name is null or char_length(channel_name) <= 60),
  channel_url text check (channel_url is null or (channel_url ~* '^https://' and char_length(channel_url) <= 300)),
  region text check (region is null or char_length(region) <= 40),
  contact text check (contact is null or char_length(contact) <= 80),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  hidden boolean not null default false
);

alter table public.reports drop constraint if exists reports_kind_check;
alter table public.reports add constraint reports_kind_check check (kind in ('place','review','channel','stay','promo','market','collab'));

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
    elsif new.kind = 'collab' then update public.collab_posts set hidden = true where id::text = new.target;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists collab_posts_rate on public.collab_posts;
create trigger collab_posts_rate before insert on public.collab_posts for each row execute function public.rate_limit();

alter table public.collab_posts enable row level security;
drop policy if exists collab_posts_read on public.collab_posts;
create policy collab_posts_read on public.collab_posts for select using (not hidden or public.is_mod());
drop policy if exists collab_posts_insert on public.collab_posts;
create policy collab_posts_insert on public.collab_posts for insert to authenticated with check (created_by = auth.uid() and hidden = false);
drop policy if exists collab_posts_update on public.collab_posts;
create policy collab_posts_update on public.collab_posts for update to authenticated using (created_by = auth.uid() or public.is_mod()) with check (hidden = false or public.is_mod());
drop policy if exists collab_posts_delete on public.collab_posts;
create policy collab_posts_delete on public.collab_posts for delete to authenticated using (created_by = auth.uid() or public.is_mod());

grant select on public.collab_posts to anon, authenticated;
grant insert, update, delete on public.collab_posts to authenticated;
