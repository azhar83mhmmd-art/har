# HAR ANIMASI — Voice Actor Portal

## Status: Phase 1 + Phase 2 complete

### ✅ Built
- `schema.sql` — full Postgres schema: profiles, voice_samples, castings, casting_characters,
  voice_auditions, applications, notifications, triggers (auto profile creation,
  `updated_at`, status-change notifications), RLS policies, storage bucket policies,
  and seed data for the "Misteri Rumah Tua" casting with YONAS / HASAN / IZHAR / RAKA.
- `style.css` — cinematic dark design system (cards, buttons, forms, badges, toast,
  modal, skeleton, empty/error states, responsive grid) **plus** a responsive app-shell
  (collapsible sidebar + topbar) used by every dashboard/admin page, data tables, tabs,
  dropzone uploads, notification list, and toggle switches.
- `app.js` — Supabase client init + shared utilities (toast, modal, auth guards, nav,
  `renderAppShell()` for the sidebar/topbar, `withTimeout()` so slow/dropped network
  calls fail gracefully instead of spinning forever, `getSignedUrl()` for private audio
  playback, `getQueryParam()`).
- `auth.js` — login + register (Supabase Auth, voluntary-participation terms checkbox),
  timeout-guarded and redirecting straight to `dashboard`/`admin` when a session already
  exists.
- `casting.js` — open casting list + casting detail.
- `character-selection.js` — dynamic character grid, single-select. **No sample
  playback for actors** (see "Recent changes" below) — actors choose based on the
  written description/voice direction only.
- `audition.js` — MediaRecorder-based recorder with clear, specific error messages
  (see "Recent changes"), timer, min-duration + size validation, audio preview player
  (no autoplay), record-again, submit confirmation modal, upload to `voice-auditions`
  bucket, creates `voice_auditions` + `applications` rows.
- `dashboard.js` — voice-actor area: `dashboard` (stats + recent auditions),
  `profile` (edit profile + voice sample upload/delete), `auditions`
  (status tabs + recording playback), `notifications` (mark read/unread),
  `settings` (change password, logout).
- `admin.js` — admin area: `admin` (overview stats + recent applications),
  `admin-castings` (create/edit/delete casting calls), `admin-characters`
  (per-casting character CRUD + sample upload), `admin-applications` (filter,
  quick-test-play in the table, full review modal with duration/format + open-in-new-tab,
  update status), `admin-actors` (search, view profile + samples, suspend/activate,
  promote/demote admin).
- Logo: the HAR ANIMASI crown lockup (`assets/logo.png`) replaces the old "H" letter
  mark everywhere — navbar, sidebar, auth pages, and favicon.
- Clean URLs: every internal link/redirect uses extensionless paths (`admin`, not
  `admin.html`) — see "Clean URLs" below.

### Recent changes (this round)
- **Fixed voice recording.** The recorder now detects *why* it can't record instead of
  showing one vague "permission denied" message for everything:
  - Not served over **HTTPS** (and not `localhost`) → clear message telling you to
    deploy to an HTTPS host. Browsers refuse microphone access entirely on insecure
    origins — this is the #1 reason recording silently doesn't work when testing by
    just double-clicking `index.html` or serving over plain `http://`.
  - Browser doesn't support `getUserMedia` / `MediaRecorder` (e.g. some in-app
    browsers like Instagram/TikTok/WhatsApp's built-in browser) → tells the user to
    open in Chrome/Firefox/Edge/Safari instead.
  - Actual mic permission denied, no mic found, mic busy in another app, etc. → each
    now has its own specific message.
  - The "not supported" state is now also detected **before** rendering the recorder,
    so the page shows an explanation box instead of a dead "START RECORDING" button.
  - If `MediaRecorder` truly can't be created, the acquired microphone stream is now
    properly released instead of leaking (mic light staying on with nothing usable).
- **Admin can now properly test/check submitted recordings**: a quick "▶" test-play
  button right in the Applications table (no need to open the review modal), and the
  review modal itself now shows duration + audio format and an "Open / Download in new
  tab" button (uses a signed URL, since the bucket is private) so admins can double-check
  a recording in their OS's own player if anything looks off in-app.
- **Removed sample playback for voice actors** on the character-selection screen —
  actors now choose a character from its name/category/description only, with no
  "PLAY SAMPLE" button. Admins still upload and can play reference samples from
  `admin-characters` for their own management purposes; actors just no longer hear them
  before auditioning.
- **Clean URLs** (`/admin` instead of `/admin.html`) — every `<a href>` and
  `location.href` in the project now points at the extensionless path, and
  `vercel.json` (`cleanUrls: true`) makes Vercel serve `admin.html`'s content at `/admin`
  and 308-redirect any old `/admin.html` link to `/admin`. See below for other hosts.

### Known follow-ups (optional, not required for the app to work)
- Supabase Realtime wiring for live notifications/status updates (currently
  poll-on-load; refresh the page to see new notifications).
- `applications_update` RLS currently allows a voice actor to update their own
  application row — harmless today since nothing in the UI does this, but if you
  want to lock it down further, restrict that policy to `is_admin()` only.

## Setup

1. Open your Supabase project → **SQL Editor** → paste and run `schema.sql`.
2. In **Storage**, confirm the three buckets were created: `voice-samples`,
   `voice-auditions` (both private), `character-samples` (public).
3. In `app.js`, replace:
   ```js
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
   ```
   with your project's URL and **anon** key (Project Settings → API).
   Never put the `service_role` key in frontend code.
4. To make your own account an admin, run in SQL Editor after registering:
   ```sql
   update profiles set role = 'admin' where id = 'YOUR_USER_UUID';
   ```
5. Serve the folder with any static server — no build step needed. Two important
   requirements for the microphone to work (see "Recording requires HTTPS" below):
   don't just double-click `index.html`, and don't use plain `http://`.

## Recording requires HTTPS (or localhost)

Browsers only allow microphone access (`getUserMedia`) on a **secure context**: an
`https://` page, or `http://localhost`. If you open the file directly
(`file:///.../index.html`) or serve it over plain `http://` on a real domain,
`navigator.mediaDevices` doesn't exist at all and recording cannot work — no
exception, no browser permission prompt, nothing. The app now detects this and shows
an explanation instead of a silently-broken button, but the fix is always the same:
serve/deploy over HTTPS (or `localhost` while developing).

For local testing:
```bash
npx serve .
```
`serve` runs on `http://localhost:<port>`, which counts as secure — recording works.

For production: any host that gives you HTTPS by default (Vercel, Netlify, Cloudflare
Pages, GitHub Pages, etc.) is fine.

## Clean URLs (no `.html`)

Every internal link now points at e.g. `admin` instead of `admin.html`.

- **Vercel** (recommended, zero extra setup): the included `vercel.json` sets
  `"cleanUrls": true`, so `admin.html` is served at `/admin`, and anyone who hits
  `/admin.html` directly gets redirected to `/admin` automatically. Just deploy the
  folder as-is.
- **Netlify**: Netlify serves clean URLs for static sites by default (a request to
  `/admin` is matched to `admin.html`) — no extra config needed either way.
- **Local testing** (`npx serve .`): `serve` also resolves an extensionless path to
  the matching `.html` file automatically, so `http://localhost:PORT/admin` works
  out of the box too.
- **Any other static host**: if it doesn't auto-resolve extensionless paths to
  `.html` files, you'll need that host's equivalent of a rewrite rule (e.g. an
  Nginx `try_files $uri $uri.html =404;` or an Apache `MultiViews` config).

## Tech
Pure HTML5 / CSS3 / vanilla JavaScript + Supabase JS client (Auth, Postgres, Storage),
loaded from `https://unpkg.com/@supabase/supabase-js@2`.
No frameworks, no bundler.
