-- 地図で探せるようにする（グルメ・宿に場所の座標を追加）と、旅チャンネルのコラボ募集の項目を追加します。
-- 何度実行しても安全です。

-- 1) 場所の座標（緯度・経度）。2つそろっているときだけ入れられます。
alter table public.places add column if not exists lat double precision;
alter table public.places add column if not exists lng double precision;
alter table public.stays  add column if not exists lat double precision;
alter table public.stays  add column if not exists lng double precision;

alter table public.places drop constraint if exists places_latlng_check;
alter table public.places add constraint places_latlng_check check (
  (lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180));
alter table public.stays drop constraint if exists stays_latlng_check;
alter table public.stays add constraint stays_latlng_check check (
  (lat is null and lng is null) or (lat between -90 and 90 and lng between -180 and 180));

-- 2) 旅チャンネルのコラボ募集
alter table public.channels add column if not exists collab boolean not null default false;
alter table public.channels add column if not exists collab_note text;
alter table public.channels add column if not exists subs text;
alter table public.channels add column if not exists contact text;

alter table public.channels drop constraint if exists channels_collab_note_check;
alter table public.channels add constraint channels_collab_note_check check (collab_note is null or char_length(collab_note) <= 120);
alter table public.channels drop constraint if exists channels_subs_check;
alter table public.channels add constraint channels_subs_check check (subs is null or subs in ('〜1,000人','1,000〜1万人','1万〜10万人','10万人〜'));
alter table public.channels drop constraint if exists channels_contact_check;
alter table public.channels add constraint channels_contact_check check (contact is null or char_length(contact) <= 80);
