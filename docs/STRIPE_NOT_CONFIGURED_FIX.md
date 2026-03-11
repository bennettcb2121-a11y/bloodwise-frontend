# Fix: "Stripe is not configured (STRIPE_SECRET_KEY)"

That error means the **API route** that runs when you click "Unlock for $49" can’t see `STRIPE_SECRET_KEY`. Fix depends on **where** you’re testing.

---

## If you’re on **localhost** (http://localhost:3000)

1. **Create or edit `.env.local`** in your project root (same folder as `package.json`).

2. **Add this line** (use your real key from Stripe → Developers → API keys):
   ```env
   STRIPE_SECRET_KEY=sk_live_xxxxxxxx
   ```
   Or for testing without real charges, use a **test** key: `sk_test_xxxxxxxx`

3. **No quotes, no spaces** around the `=`.

4. **Restart the dev server**: stop it (Ctrl+C), then run `npm run dev` again. Env vars are only loaded when the server starts.

5. Try "Unlock for $49" again.

---

## If you’re on the **live site** (e.g. clarionlabs.tech)

1. **Open Vercel** → your project → **Settings** → **Environment Variables**.

2. **Add a variable** (or fix the name if it’s wrong):
   - **Name (must be exact):** `STRIPE_SECRET_KEY`
   - **Value:** your Stripe **Secret key** (starts with `sk_live_` in live mode).
   - **Environment:** check **Production** (and Preview if you use it).

3. **Redeploy** so the new variable is used:
   - **Deployments** → open the **⋯** on the latest deployment → **Redeploy** (no need to change code),
   - **or** push a new commit so Vercel builds again.

4. Wait for the new deployment to finish, then try "Unlock for $49" on the live site again.

---

## Checklist

- [ ] Variable name is exactly `STRIPE_SECRET_KEY` (case-sensitive).
- [ ] **Local:** `.env.local` exists in project root and server was restarted after adding the key.
- [ ] **Live:** Variable is set in Vercel for Production and you redeployed after adding/changing it.
- [ ] Key is from the correct Stripe mode (live key for real payments, test key for testing).

If it still fails, say whether you’re on localhost or the live URL and what you’ve already set (e.g. “I added STRIPE_SECRET_KEY in Vercel and redeployed”).
