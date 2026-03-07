# Bloodwise Supabase setup

1. In the [Supabase Dashboard](https://supabase.com/dashboard), open your project → **SQL Editor**.
2. Run the contents of `migrations/001_bloodwise_schema.sql` to create `profiles`, `bloodwork_saves`, and RLS policies.
3. Ensure **Authentication** is enabled and **Email** sign-up is allowed (or configure as needed).
4. In the app, set environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` – your project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` – the anon/public key from Project Settings → API

After that, sign up and log in from the Bloodwise UI; profile and bloodwork data will save and load automatically.
