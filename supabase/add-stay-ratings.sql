-- 宿の「ノマド目線の5項目評価」（各1〜5の星）を追加します。何度実行しても安全です。
alter table public.stays add column if not exists r1 smallint;  -- Wi-Fi・回線
alter table public.stays add column if not exists r2 smallint;  -- 作業環境（机・イス・電源）
alter table public.stays add column if not exists r3 smallint;  -- 静かさ・眠りやすさ
alter table public.stays add column if not exists r4 smallint;  -- 清潔さ・安心感
alter table public.stays add column if not exists r5 smallint;  -- コスパ・長期滞在のしやすさ

alter table public.stays drop constraint if exists stays_ratings_check;
alter table public.stays add constraint stays_ratings_check check (
  (r1 is null or r1 between 1 and 5) and (r2 is null or r2 between 1 and 5) and (r3 is null or r3 between 1 and 5)
  and (r4 is null or r4 between 1 and 5) and (r5 is null or r5 between 1 and 5));

-- メモ（感想）は、書かなくてもよくします（300字まで）。
alter table public.stays alter column body drop not null;
alter table public.stays drop constraint if exists stays_body_check;
alter table public.stays add constraint stays_body_check check (body is null or char_length(body) <= 300);
