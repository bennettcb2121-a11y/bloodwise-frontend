# Reconnect This Project to Vercel (clarionlabs.tech)

## 1. Link this repo to the right Vercel project

Your app URL: **https://clarionlabs.tech** (use HTTPS in production).

### Option A: Reconnect in Vercel Dashboard (recommended)

1. Go to **[vercel.com](https://vercel.com)** and log in.
2. Open the project that should serve **clarionlabs.tech** (e.g. "bloodwise" or "clarionlabs").
3. **Settings** → **Git**:
   - If it says **Disconnected**, click **Connect Git Repository**.
   - Choose **GitHub** → **bennettcb2121-a11y/bloodwise-frontend**.
   - Set **Production Branch** to `main` (or your default branch).
4. **Settings** → **Domains**:
   - Add **clarionlabs.tech** (and **www.clarionlabs.tech** if you use it).
   - Vercel will show DNS instructions; point your domain’s A/CNAME to Vercel.

After this, every push to `main` will deploy and be live at clarionlabs.tech.

### Option B: Re-link from the CLI (same machine)

In this repo:

```bash
cd /Users/charliebennett/Desktop/bloodwise-frontend
npx vercel link
```

- When asked for **Scope**, pick the team that owns the project.
- When asked for **Project**, pick the one you use for clarionlabs.tech (or **Link to existing project** and choose it).
- If you want to create a new project instead, run `npx vercel` and follow the prompts, then add the domain in the dashboard.

---

## 2. Confirm the domain

- In Vercel: **Project** → **Settings** → **Domains**.
- **clarionlabs.tech** should be listed and assigned to this project.
- DNS must point to Vercel (A record `76.76.21.21` or CNAME `cname.vercel-dns.com` per Vercel’s instructions).

---

## 3. Deploy

- **From Git:** Push to `main`; Vercel will build and deploy.
- **From CLI:** Run `npx vercel --prod` in this folder (after `vercel link`).

Your production URL will be **https://clarionlabs.tech** once the domain is set and DNS has propagated.
