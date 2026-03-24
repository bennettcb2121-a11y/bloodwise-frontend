# Dashboard experience improvements

## Quick wins (high impact, low effort)

1. **Align visual style with the rest of the app**
   - Use the same gradient background and purple/orange accent as onboarding (no blue/teal).
   - Use the same glass card tokens (`--clarion-card-bg`, `--clarion-gradient-accent` for CTAs).
   - Makes the app feel like one product, not two.

2. **Consolidate preference cards**
   - You currently show "Health & supplement preferences" and "Notification preferences" as two separate cards (and again in empty state).
   - Merge into one **Settings** (or **Preferences**) section at the bottom: improvement preference, supplements, spend, retest weeks, phone. One "Save preferences" button.
   - Reduces scroll and repetition.

3. **Clearer section order**
   - Hero (score) → Top priorities → Protocol tracker → Biomarker trends → Savings → Retest → Saved plan → Settings.
   - Or: put Protocol tracker higher (daily habit) and Trends after Savings so the flow is: score, priorities, daily protocol, savings, trends, retest, links, settings.

4. **Saved plan links that work**
   - "Biomarker insights" and "Supplement stack" point to `/#insights` and `/#stack`. If the user lands on the wrong step, they may see the wrong content.
   - Option A: Persist "last results step" and send them to the right step (e.g. `/?results=insights` that the app interprets).
   - Option B: Dedicated routes like `/results/insights` and `/results/stack` that load the same results view and scroll to the right section (requires a small results view page or state).

5. **Retest banner**
   - Already good. Optional: add "X weeks until suggested retest" or a simple countdown when you have `lastBloodworkAt` and `retestWeeks`.

## Medium effort

6. **Real trend data**
   - Biomarker trends use mock/synthetic history. When you have multiple bloodwork entries per user, drive the chart from real history so "Biomarker trends" feels meaningful.

7. **Protocol tracker persistence**
   - Tracker is localStorage-only. If you want it to sync across devices, store it in Supabase (e.g. `protocol_log` or `daily_check_ins` table) keyed by user and date.

8. **Score change**
   - When the user has more than one bloodwork, show "Score: 72 (+5 from last time)" or a small trend indicator next to the score.

9. **Empty states**
   - Empty state is clear. Optional: add one primary CTA ("Start analysis") and a secondary "Learn how it works" or "What you’ll see") so it feels guided.

## Nice to have

10. **Lazy load below the fold**
    - Sections below priorities (e.g. chart, savings, retest) can be lazy-loaded or rendered with lower priority to speed up first paint.

11. **Mobile**
    - Confirm grids (priorities, savings) stack to one column on small screens and cards don’t feel cramped. Touch targets ≥ 44px for links/buttons.

12. **Accessibility**
    - Ensure section titles are in order (h1 → h2), chart has a text summary or table for screen readers, and focus order is logical.
