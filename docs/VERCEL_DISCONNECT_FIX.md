# Why Your Vercel Project Keeps Disconnecting (and How to Fix It)

Your repo is **`bennettcb2121-a11y/bloodwise-frontend`** and the Vercel project is linked locally (`.vercel/project.json` → project **bloodwise**, team org). "Disconnecting" almost always means the **Git integration** between Vercel and GitHub breaks. Here are the usual causes and fixes.

---

## 1. GitHub App / OAuth access revoked (most common)

If you (or an org admin) revoke Vercel’s access to GitHub, the project will show as disconnected and deployments won’t run on push.

**Fix:**

1. Go to **GitHub** → **Settings** → **Applications** → **Authorized OAuth Apps** (or **Installed GitHub Apps**).
2. Find **Vercel** and open it.
3. Make sure your account (or the org **bennettcb2121-a11y**) has granted access to the **bloodwise-frontend** repo (or “All repositories”).
4. If the repo is under an **organization**:
   - Go to **GitHub** → **bennettcb2121-a11y** → **Settings** → **Third-party access** (or **Integrations**).
   - Find **Vercel** and ensure it’s allowed and has access to **bloodwise-frontend**.

Then in **Vercel Dashboard** → your project → **Settings** → **Git**:

- If it says “Disconnected” or “Reconnect”, click **Connect Git Repository** and choose **bennettcb2121-a11y/bloodwise-frontend** again.

---

## 2. Repo was renamed or transferred

If the repo URL changed (e.g. renamed to `clarion-frontend` or moved to another org), Vercel still points at the old URL and the connection breaks.

**Fix:**

1. **Vercel Dashboard** → **bloodwise** → **Settings** → **Git**.
2. **Disconnect** the current repository.
3. **Connect Git Repository** and select the **current** repo (the one you actually push to).
4. Confirm the **Production Branch** (e.g. `main`) matches your default branch.

---

## 3. Wrong repository connected

Sometimes a fork or a repo with a similar name gets connected instead of **bloodwise-frontend**.

**Fix:**

1. **Vercel Dashboard** → **bloodwise** → **Settings** → **Git**.
2. Check the listed repository; it should be exactly **bennettcb2121-a11y/bloodwise-frontend**.
3. If not, disconnect and connect the correct repo.

---

## 4. Vercel team vs personal account

Your project is under a **team** (`orgId` in `.vercel/project.json`). If you log in with a different account, or the team’s GitHub connection was removed, the project can look “gone” or disconnected.

**Fix:**

1. In Vercel, switch to the **team** that owns the project (top-left or profile menu).
2. In that team: **Settings** → **Git** (or **Integrations**). Ensure the GitHub connection is active and has access to **bennettcb2121-a11y** (and the repo).
3. Reconnect the project to the repo from **Project** → **Settings** → **Git** if needed.

---

## 5. Re-link after fixing GitHub access

After fixing GitHub permissions or repo name:

1. **Vercel Dashboard** → **bloodwise** → **Settings** → **Git**.
2. Click **Connect Git Repository** (or **Reconnect**).
3. Choose **GitHub** → **bennettcb2121-a11y/bloodwise-frontend**.
4. Save. Push a commit to **main** and confirm a deployment starts.

---

## 6. Local CLI link (optional)

Your local folder is already linked (`.vercel/project.json`). If you ever need to re-link from the CLI:

```bash
npx vercel link
```

Select the same team and project **bloodwise** when prompted. This only affects local deploys; it does **not** fix a broken Git connection in the dashboard. The dashboard Git settings are what control “connected” and auto-deploys.

---

## Summary

| Symptom | Likely cause | Action |
|--------|---------------|--------|
| “Disconnected” in Vercel Git settings | GitHub access revoked or repo moved | Re-authorize Vercel in GitHub; reconnect repo in Vercel |
| No deployments on push | Git integration broken or wrong repo | Connect correct repo in Project → Settings → Git |
| Project not visible | Wrong team or account | Switch to correct team in Vercel |
| Repo renamed/transferred | Old URL in Vercel | Disconnect and connect the current repo |

If it keeps disconnecting again after reconnecting, check whether an org admin is changing GitHub app permissions or if the repo is being transferred/renamed repeatedly.
