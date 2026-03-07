# Bloodwise Supabase setup

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project → **SQL Editor**.
2. Run the contents of `migrations/001_bloodwise_schema.sql` to create `profiles`, `bloodwork_saves`, and RLS policies.
3. Run `migrations/004_subscriptions.sql` to create the `subscriptions` table (for Stripe webhook).
4. Ensure **Authentication** is enabled and **Email** sign-up is allowed (or configure as needed).
5. For **Google / GitHub login**: enable those providers under Authentication → Providers and add redirect URLs; see [SETUP.md](../SETUP.md) for details.
6. In the app, set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` – your project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` – the anon/public key from Project Settings → API
   - For Stripe webhook: `SUPABASE_SERVICE_ROLE_KEY` (server-side only; never expose to client)

After that, sign up and log in from the Bloodwise UI (email or Google/GitHub); profile and bloodwork data save and load automatically. For full website + Stripe subscription setup, see **[SETUP.md](../SETUP.md)**.
