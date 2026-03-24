-- Idempotent Stripe webhook processing: one row per Stripe event id (replay-safe).
create table if not exists public.stripe_webhook_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

comment on table public.stripe_webhook_events is 'Stripe event ids processed by /api/webhooks/stripe (service role only).';
