# Fix the "Generation" / Build Error (2 min)

## What’s going wrong

When you run **`npm run build`**, Next.js tries to pre-render some pages (e.g. the 404 page).  
Those pages (or something they import) end up creating a **Supabase client**.  
Supabase needs two env vars. If they’re **missing at build time**, the build fails with something like:

- *"Your project's URL and API key are required to create a Supabase client!"*
- Or an error during "Generating static pages" / "prerendering"

So the fix is: **make sure those two variables exist wherever the build runs** (your machine and/or Vercel).

---

## Fix 1: Build on your computer

1. Open your project folder in the terminal (same folder as `package.json`).

2. Create a file named **`.env.local`** in that folder (if it doesn’t exist).

3. Add these two lines (replace with your real values from Supabase):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. Get the real values:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project.
   - Click **Settings** (gear) → **API**.
   - **Project URL** → copy → paste as `NEXT_PUBLIC_SUPABASE_URL`.
   - **Project API keys** → **anon public** → copy → paste as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

5. Save `.env.local`, then run:

   ```bash
   npm run build
   ```

   The build should get past the “Generating static pages” step. If it still fails, the message will usually point to a different problem.

**Important:** Don’t commit `.env.local` to Git (it should be in `.gitignore`). It’s only for your machine.

---

## Fix 2: Build on Vercel (deploys)

Vercel runs `npm run build` on their servers. They don’t use your `.env.local`, so you have to set the same variables there.

1. Go to [Vercel Dashboard](https://vercel.com) → your project (e.g. Clarion Labs).

2. Open **Settings** → **Environment Variables**.

3. Add two variables:

   - **Name:** `NEXT_PUBLIC_SUPABASE_URL`  
     **Value:** your Supabase Project URL (same as in Fix 1).  
     **Environment:** tick **Production** (and Preview if you use preview deployments).

   - **Name:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`  
     **Value:** your Supabase anon/public key (same as in Fix 1).  
     **Environment:** Production (and Preview if you want).

4. Save.

5. **Redeploy** the project (Deployments → … on latest deployment → Redeploy, or push a new commit).  
   The next build on Vercel will see the variables and the “generation”/prerender step should succeed.

---

## Quick checklist

- [ ] `.env.local` in project root with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for local builds.
- [ ] Same two variables added in Vercel → Settings → Environment Variables for production builds.
- [ ] Redeploy on Vercel after adding or changing env vars.

That’s it. Once those two are set where the build runs, the generation/build error should be fixed.
