-- Clarion Lite vs full subscription tier (synced from Stripe subscription price via webhook)
alter table public.profiles
  add column if not exists plan_tier text not null default 'none';

comment on column public.profiles.plan_tier is 'Subscription tier: none | lite | full — from Stripe price (STRIPE_LITE_PRICE_ID vs Clarion+ price). Lab unlock remains analysis_purchased_at.';
