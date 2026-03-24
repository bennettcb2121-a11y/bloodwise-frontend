-- Optional health score goal for dashboard (e.g. 80)
alter table public.profiles add column if not exists score_goal smallint default null;
