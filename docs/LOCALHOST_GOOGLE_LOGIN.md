# Google login redirects to production (clarionlabs.tech) instead of localhost

**Symptom:** You sign in with Google on `http://localhost:3000`, but after Google approves, you end up on `https://clarionlabs.tech` instead of back on localhost.

**Cause:** Supabase only redirects users to URLs that are in the **Redirect URLs** whitelist. If `http://localhost:3000/auth/callback` is missing, Supabase falls back to your **Site URL** (e.g. clarionlabs.tech), so you land on production.

**Fix (about 1 minute):**

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project.
2. Go to **Authentication** → **URL Configuration**.
3. Under **Redirect URLs**, click **Add URL** and add exactly:
   ```text
   http://localhost:3000/auth/callback
   ```
4. Save.

Keep your production URL in the list too, e.g.:

- `https://clarionlabs.tech/auth/callback`
- `http://localhost:3000/auth/callback`

After this, when you sign in with Google on localhost, Supabase will redirect back to `http://localhost:3000/auth/callback` and you’ll stay on localhost.

**Note:** Google OAuth redirect URI stays as the Supabase URL (`https://<your-project>.supabase.co/auth/v1/callback`). You do **not** add localhost to Google; only Supabase needs the localhost redirect URL.
