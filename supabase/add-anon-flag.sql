-- 匿名（ログインなし）ユーザーを見分けるための印を追加します。称号は、ログインした人だけにつけるために使います。
alter table public.profiles add column if not exists anon boolean not null default false;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, anon)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '旅人'), 40), coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;
  return new;
end $$;

update public.profiles p set anon = true from auth.users u where u.id = p.id and u.is_anonymous;
