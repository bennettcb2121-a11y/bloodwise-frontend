# Retest reminders: steps one by one

Do these in order. One step at a time.

---

## Step 1: Add the new columns in Supabase

1. Open **Supabase** → your project.
2. Click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Copy the entire block below, paste into the editor, then click **Run**.

```sql
alter table public.profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists retest_weeks int not null default 8;
```

5. Wait until it says the query ran successfully. Then go to Step 2.

---

## Step 2: Sign up for Resend (email sending)

1. Open **https://resend.com** in your browser.
2. Sign up or log in.
3. In the Resend dashboard, go to **API Keys** (or **Integrations** / **API**).
4. Click **Create API Key**. Name it e.g. "Clarion Labs".
5. Copy the key (it starts with `re_`). Save it somewhere safe — you’ll paste it in Vercel in Step 4.
6. Then go to Step 3.

---

## Step 3: Create a secret for the cron job

1. On your computer, open **Terminal** (Mac) or **Command Prompt** (Windows).
2. Run this command and press Enter:

**On Mac/Linux:**
```bash
openssl rand -hex 32
```

**On Windows (PowerShell):**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

(If you prefer, you can use any long random string, e.g. 32+ random letters and numbers.)

3. Copy the result. This is your **CRON_SECRET**. You’ll add it in Vercel in Step 4.
4. Then go to Step 4.

---

## Step 4: Add environment variables in Vercel

1. Open **https://vercel.com** and go to your Clarion Labs project.
2. Click **Settings** in the top menu.
3. Click **Environment Variables** in the left sidebar.
4. Add **one variable at a time** as below. For each:
   - Click **Add New** (or **Add**).
   - Enter the **Key** (name) exactly as shown.
   - Paste the **Value**.
   - Leave **Environment** as Production (or check Production and Preview if you want).
   - Click **Save**.

**Variable 1**

- **Key:** `RESEND_API_KEY`  
- **Value:** (paste the Resend API key from Step 2)

**Variable 2**

- **Key:** `RESEND_FROM_EMAIL`  
- **Value:** `Clarion Labs <reminders@clarionlabs.tech>`  
  (If you use a different “from” address later, you can change this.)

**Variable 3**

- **Key:** `CRON_SECRET`  
- **Value:** (paste the secret you created in Step 3)

**Variable 4**

- **Key:** `SUPABASE_SERVICE_ROLE_KEY`  
- **Value:** (from Supabase: **Project Settings** → **API** → **service_role** key — copy it)  
  (This is the same key you may use for the Stripe webhook. Never put it in frontend code.)

5. When all four are saved, go to Step 5.

---

## Step 5: Redeploy so Vercel uses the new variables

1. Still in Vercel, click **Deployments** in the top menu.
2. Find the **latest** deployment (top of the list).
3. Click the **three dots (⋯)** on the right of that row.
4. Click **Redeploy**.
5. Confirm **Redeploy** if asked.
6. Wait until the new deployment shows **Ready**. Then go to Step 6.

---

## Step 6: Confirm the cron is set up

1. In your project folder you should have a file named **`vercel.json`** with a `crons` section that points to `/api/cron/retest-reminders` and runs every Monday at 10:00.
2. If you’ve already pushed that file to GitHub, Vercel will use it. No extra action needed.
3. If you’re not sure, open **Vercel** → your project → **Settings** → **Cron Jobs** and see if **retest-reminders** is listed. If it is, you’re done with this step.

---

## Step 7 (optional): Verify your domain in Resend

1. In **Resend**, go to **Domains** (or **Sender identities**).
2. Add your domain (e.g. `clarionlabs.tech`).
3. Follow Resend’s instructions to add the DNS records they give you (at your domain registrar or DNS provider).
4. When the domain shows as verified, reminder emails can be sent from e.g. `reminders@clarionlabs.tech`. Until then, you can still use Resend’s test domain for testing.

---

## Done

- **In the app:** When a user’s last test was 8+ weeks ago, they’ll see “Time to retest?” on the main page and dashboard.
- **Email:** Every Monday at 10:00 (Vercel’s cron), the app will email users who are due for a retest (using the email stored in their profile).

If you want to test the email without waiting for Monday: after Step 5, you can call the endpoint manually (see **REMINDERS.md**, “Option B – Manual or external cron”) using your `CRON_SECRET`.
