# Google Sign-In (Continue with Google)

Do these in order. You need both **Supabase** and **Google Cloud Console**.

---

## Step 1: Get the callback URL from Supabase

1. Open **Supabase** → your project → **Authentication** → **Providers** (or **Sign In / Providers**).
2. Find **Google** and turn it **on** (enable).
3. You’ll see a field for **Client ID** and **Client Secret**, and somewhere it shows a **Callback URL** (or “Redirect URI”). It looks like:
   ```text
   https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
   ```
4. **Copy that exact URL** — you’ll paste it into Google in Step 3.

(If you don’t see a callback URL, look for a “Redirect URL” or “Callback URL” in the Google provider section or in the Supabase Auth docs for Google.)

---

## Step 2: Create a project in Google Cloud (if you don’t have one)

1. Go to **https://console.cloud.google.com**
2. Top bar: click the **project dropdown** → **New Project**.
3. Name it (e.g. “Clarion Labs”), click **Create**. Wait for it to finish, then select that project.

---

## Step 3: Configure the OAuth consent screen (one-time)

1. In Google Cloud: **APIs & Services** → **OAuth consent screen** (left menu).
2. Choose **External** (unless you use a Google Workspace org) → **Create**.
3. Fill in:
   - **App name:** Clarion Labs
   - **User support email:** your email
   - **Developer contact:** your email
4. Click **Save and Continue** → **Save and Continue** (skip “Scopes” for now) → **Save and Continue** (skip “Test users” for now) → **Back to Dashboard**.

---

## Step 4: Create OAuth client ID (Web)

1. In Google Cloud: **APIs & Services** → **Credentials** (left menu).
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type:** **Web application**.
4. **Name:** e.g. “Clarion Labs Web”.
5. **Authorized JavaScript origins** — click **+ Add URI** and add:
   - `https://clarionlabs.tech`
   - If you use www: `https://www.clarionlabs.tech`
   - For local testing: `http://localhost:3000`
6. **Authorized redirect URIs** — click **+ Add URI** and paste the **exact** Supabase callback URL from Step 1, e.g.:
   - `https://abcdefghijk.supabase.co/auth/v1/callback`
   - (Use the real URL from your Supabase Google provider.)
7. Click **Create**.
8. A popup shows **Client ID** and **Client secret**. Copy both (you can also download the JSON). Keep the secret safe.

---

## Step 5: Put Client ID and Secret into Supabase

1. Back in **Supabase** → **Authentication** → **Providers** → **Google**.
2. Paste **Client ID** into the Client ID field.
3. Paste **Client secret** into the Client Secret field.
4. Click **Save**.

---

## Step 6: Redirect URL allow list in Supabase

Your app must be allowed to receive the redirect after Google sign-in:

1. **Supabase** → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, make sure you have:
   - `https://clarionlabs.tech/auth/callback`
   - (or `https://www.clarionlabs.tech/auth/callback` if you use www)
3. **Save** if you changed anything.

---

## Checklist

- [ ] Google provider **enabled** in Supabase.
- [ ] OAuth consent screen configured in Google Cloud.
- [ ] OAuth client ID created (Web application).
- [ ] **Authorized redirect URI** in Google = Supabase callback URL (`https://xxx.supabase.co/auth/v1/callback`).
- [ ] **Authorized JavaScript origins** in Google include `https://clarionlabs.tech` (and www if you use it).
- [ ] Client ID and Client Secret pasted into Supabase Google provider and saved.
- [ ] Supabase Redirect URLs include `https://clarionlabs.tech/auth/callback`.

If “Continue with Google” still fails, open the browser’s Developer Tools (F12) → **Console** and **Network** tabs, try again, and check for errors or a `redirect_uri_mismatch` message — that means the redirect URI in Google doesn’t exactly match the Supabase callback URL.
