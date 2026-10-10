# Sara Timesheet

A mobile-first personal overtime tracker built with React, Vite and Supabase. Three sections: Add (always the initial screen), History and Summary. No public registration, no Render backend, and no local timesheet database.

## Run locally

Use Node.js 22.12+ (Node 24 recommended).

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` in the project root and replace both values:
   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   ```
   Find these in your Supabase project connection/API settings. Use the publishable key, never a secret or service-role key. Vite embeds these public configuration values at build time. Restart the development server after changing them.
3. Run `npm run dev` and open the displayed localhost URL.
4. Run `npm test` to verify the calculation rules.
5. Run `npm run build` to produce `dist`. Run `npm run preview` to inspect that production build.

Without configuration, the app shows a friendly setup message. It does not fake a login or save entries locally.

## Supabase setup (existing table)

The app uses the existing `public.timesheets` table with exactly these columns: `id uuid`, `user_id uuid`, `work_date date`, `time_in time`, `time_out time`, `day_type text`, `notes text`, `created_at timestamptz`. Ensure `id` defaults to `gen_random_uuid()` and `created_at` defaults to `now()`. Keep `id` a primary key. No calculated fields are written. Existing notes are preserved when an entry is edited.

In Supabase Authentication, disable new user sign-ups and create Sara's email/password user through the dashboard. The app only offers Sign in. Set your production site URL in Authentication URL configuration.

**Enable Row Level Security before use.** Review existing policies first: PostgreSQL permissive policies combine with OR, so remove any existing policies that allow access to other users' rows. `supabase/security.sql` contains the required owner-only policies and default-column setup for this existing table; review and execute it in Supabase's SQL editor. It does not create or replace your table. The logged-in user must match `user_id` on existing entries. Verify with two test users that neither can read, change or delete the other's rows.

Timesheets are only persisted to Supabase. The Supabase library persists authentication tokens in browser storage so Sara normally stays signed in. This is session storage, not a timesheet database. Signing out clears the displayed entries. There is no offline save queue; unsaved form values remain on screen after a failed save but will be lost if the page is closed or refreshed.

## Calculation details

The work date is a calendar string (`YYYY-MM-DD`); times are wall-clock strings. They are never converted into UTC timestamps for storage. Weekdays use parsed calendar components with UTC-only weekday access, avoiding local timezone shifts. An earlier time out means the following day; identical times mean zero hours. A shift cannot represent 24 hours or more. For a zero-hour Absent day, use `00:00` for both times.

Duration is calculated in whole minutes. Worked hours are rounded to two decimals **before** applying these rules, in order:

1. Dayoff: use 1 of 25 annual leave days per calendar year; overtime is 0 while covered, then −8 hours per further entry. Dayoff has zero worked hours and this rule overrides weekend rules.
2. Otherwise Sunday or Holiday: hours × 2.
3. Otherwise Saturday or Sick: hours.
4. Otherwise Absent: hours − 8 (including negatives).
5. Otherwise: max(hours − 8, 0).

The Summary breakdown assigns each entry to one category, so its rows add to total overtime. Dayoff is always categorised as Dayoff. For other entries, Holiday takes the label when present; otherwise Sunday, followed by Saturday ahead of Sick. Monthly and custom-range summaries use the shift’s starting work date, including overnight shifts. Custom ranges include both the From and To dates. History shows 25 compact entries per page, newest first. Worked-time totals use original minutes; overtime totals use the calculated decimal hours and are displayed rounded to the nearest minute. No additional pay rules or breaks are assumed.

## Deploy on Render Static Site

1. Push this project, including `package-lock.json`, to a GitHub or GitLab repository.
2. In Render, choose **New → Static Site** and connect the repository and desired branch.
3. Leave Root Directory empty when the app is at the repository root.
4. Set Build Command to `npm ci && npm run build`.
5. Set Publish Directory to `dist`.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Render's Environment settings before the build. Optionally set `NODE_VERSION` to `24`.
7. Add a rewrite: Source `/*`, Destination `/index.html`, Action **Rewrite**.
8. Create the Static Site. No Web Service or server is needed. Render supplies HTTPS.
9. Sign in on the deployed site, save a shift, reload, edit it, verify Summary, and delete the test entry. Change build environment values only by rebuilding/redeploying.

Reference: [Vite's Render deployment instructions](https://vite.dev/guide/static-deploy#render), [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword).

## Install on a phone

Open the HTTPS deployment. On iPhone Safari, use Share → Add to Home Screen. On Android Chrome, use the browser's Install app / Add to Home screen action. The app has a standalone manifest, safe-area padding, 192/512px icons and an Apple touch icon. Replace the files in `public` to change the logo. The production service worker precaches the app shell only; it does not cache Supabase responses or support offline saving. PWA registration is enabled for production builds; use `npm run build` then `npm run preview` for local checks.

## Verification

`npm test` covers the ten requested examples plus branch priorities, minute rounding, zero duration, PostgreSQL times, invalid input, negative formatting, timezone independence and summary categorisation. Before launch, use the real Supabase account to verify authentication, owner-only policies, create/edit/delete, session restoration, error handling and phone installation. These integration checks require your project configuration.

## Default hours, multiple dates and computation

New entries start at 12:00–20:00. Saving resets the form to today with those same defaults; editing preserves the saved times. Use **Add another date** for up to 31 distinct dates sharing the entered hours and day type. The dates are saved together in one database insert, with overtime calculated individually for each date. For different hours, save separate entries. Duplicate dates within a batch are rejected; existing entries are never overwritten.

Expand **How is this calculated?** below the totals to see the duration, decimal-hours rounding, applicable rule and overtime equation for each date. Open an existing History entry to see its computation too.

## Annual leave

The allowance resets to 25 days every 1 January, with no carryover. All Dayoff entries use the allowance in chronological order across the complete saved history, before month, custom-range or pagination filters. Each entry counts as one day, including weekend entries and separate entries on the same date. Same-date entries are ordered by creation time then ID. Enter one Dayoff entry per leave day.

The first 25 Dayoff entries have zero overtime; every further entry deducts 8 hours, including when the total becomes negative. Dayoff contributes no worked hours; saved times on older Dayoff rows are ignored, and newly saved Dayoff rows use 00:00 for both times. Other day types retain their existing rules. No database migration or stored calculated balance is needed. Existing entries automatically use the new rule. Edits, deletions and backdated entries recalculate subsequent allocations.

Summary shows annual leave used, remaining, and excess Dayoff deductions for each year represented in the selected period. Balances count entries from January through the selected period’s end, including recorded future leave. Range overtime still includes only entries inside the range, while using earlier leave to determine whether the allowance is exhausted. Record all leave taken in the year for an accurate balance.

## Print and PDF export

Open Summary and choose Month, Custom range, or All entries, then tap **Print / Save as PDF**. In the browser print window choose a printer or Save as PDF (on iPhone, use the print preview's sharing options to save the PDF). The report contains every selected entry, not just the 25 entries visible on a History page, in chronological order. Hours, overtime breakdown and annual leave balances appear at the end. Earlier leave outside a selected period is still included when calculating the allowance.

The print layout uses A4 portrait, narrow 12mm margins, compact 9pt table text, repeated column headings and a two-column summary. Rows and the summary stay together where they fit; extra pages are added only as needed. Notes are included and can increase the page count. For a cleaner PDF, turn off the browser's own headers and footers. No timesheet data is sent to a separate export service.
