# Retest reminders (email + optional SMS)

Users get in-app reminders and can receive **email** (and optionally **SMS**) when it’s time to retest (default: 8 weeks after their last panel).

---

## What’s in place

- **Profiles** store `email` (synced from login), optional `phone`, and `retest_weeks` (default 8).
- **In-app**: Main page and dashboard show a “Time to retest?” banner when their last test was ≥ `retest_weeks` ago.
- **Cron API** `GET/POST /api/cron/retest-reminders` finds users due for retest and sends email via Resend.

Run the migration **`supabase/migrations/005_retest_reminders.sql`** in Supabase so `profiles` has `email`, `phone`, and `retest_weeks`.

---

## 1. Email (Resend)

1. Sign up at [resend.com](https://resend.com) and get an **API key**.
2. (Recommended) Add and verify your domain so “from” can be e.g. `reminders@clarionlabs.tech`. Otherwise you can use Resend’s test domain for development.
3. In **Vercel** → your project → **Settings** → **Environment Variables**, add:
   - `RESEND_API_KEY` = your Resend API key  
   - `RESEND_FROM_EMAIL` = e.g. `Clarion Labs <reminders@clarionlabs.tech>` (or leave unset to use default)
   - `CRON_SECRET` = a long random string (e.g. from `openssl rand -hex 32`) so only your cron can call the API
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase service role key (same as for Stripe webhook)
4. Redeploy so the new env vars are used.

---

## 2. Run the cron (Vercel Cron)

**Option A – Vercel Cron (recommended)**  
In the project root, create or edit **`vercel.json`**:

```json
{
  "crons": [
    {
      "path": "/api/cron/retest-reminders",
      "schedule": "0 10 * * 1"
    }
  ]
}
```

That runs the job every **Monday at 10:00** (project’s timezone). Deploy; Vercel will call the route with the cron secret automatically.

**Option B – Manual or external cron**  
Call the endpoint with your secret so it’s authorized:

```bash
curl -X GET "https://clarionlabs.tech/api/cron/retest-reminders?secret=YOUR_CRON_SECRET"
# or
curl -X POST "https://clarionlabs.tech/api/cron/retest-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Use the same value you set for `CRON_SECRET` in Vercel.

---

## 3. Optional: SMS (Twilio)

To send **text** reminders as well:

1. Add a **phone** field in your app (e.g. in profile/settings), store it in `profiles.phone` (E.164 format).
2. Sign up at [twilio.com](https://twilio.com), get **Account SID**, **Auth Token**, and a **Twilio phone number**.
3. In the API route `/api/cron/retest-reminders/route.ts`, add Twilio: when iterating over `due`, if `u.phone` is set, call Twilio’s API to send an SMS (e.g. “Clarion Labs: It’s been 8+ weeks since your last panel. Retest when you can: [link]”).
4. In Vercel env, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER`.

Compliance: only send SMS to users who have opted in and have provided their number; include a way to opt out (e.g. “Reply STOP to unsubscribe”).

---

## Summary

| Item | Purpose |
|------|--------|
| `005_retest_reminders.sql` | Adds `email`, `phone`, `retest_weeks` to `profiles`. Run in Supabase. |
| In-app banner | “Time to retest?” when last test ≥ `retest_weeks` ago. |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Sending reminder emails. |
| `CRON_SECRET` | Securing the cron endpoint. |
| `SUPABASE_SERVICE_ROLE_KEY` | Letting the cron read profiles and bloodwork. |
| Vercel Cron or manual call | Triggers the job on a schedule (e.g. weekly). |
