-- When user finishes the guided results flow (score → insights → stack → summary) and clicks "Go to Dashboard"
alter table public.profiles
  add column if not exists results_flow_completed_at timestamptz;

comment on column public.profiles.results_flow_completed_at is 'Set when user completes the post-payment guided flow and clicks Go to Dashboard';
