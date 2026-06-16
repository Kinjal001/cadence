# Cadence — Project Context

> Handoff doc for a fresh Claude instance. Read this first, then PLAN.md for slice details and LEARNING.md for concept explanations.

---

## What it is

**Cadence** is a personal productivity PWA for one user (Kinjal). The vision: *keep the rhythm* — a lightweight daily check-in tool that makes good habits feel effortless through streaks, history, and a clean Today view. Not a feature-heavy habit tracker; more like a calm daily ritual.

**V1 scope:** Dailies + Tasks only. Goals and Projects are explicitly deferred past v1.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 — App Router, TypeScript, Turbopack dev server |
| Styling | Tailwind CSS v4 (CSS-first config — no `tailwind.config.ts`) |
| Backend | Supabase (Postgres + Auth + real-time) — wired; `dailies`, `daily_logs`, `tasks` tables live |
| Deployment | Vercel — auto-deploys on push to `master` |
| Fonts | Bricolage Grotesque (headings) · Plus Jakarta Sans (body/UI) · JetBrains Mono (numbers/mono) |
| Colors | OKLCH color space — perceptually uniform; see color system below |

**Repo:** https://github.com/Kinjal001/cadence  
**Live URL:** https://cadence-zeta-ruby.vercel.app/

---

## Color system

All tokens live in `app/globals.css` `:root`. Components never hardcode hex — they use `var(--token-name)`.

| Token | Value | Used for |
|---|---|---|
| `--app-bg` | `#F4F3FF` | Page background — subtle lavender tint |
| `--card-bg` | `#ffffff` | Cards and sidebar |
| `--violet` | `#A78BFA` | Soft lavender — nav active bg accent, hover text, focus borders |
| `--violet-dark` | `#7C5CE8` | Button hover state |
| `--violet-active` | `#EDE9FE` | Nav active background fill, avatar bg, subtle fills |
| `--btn-primary` | `#815BEB` | **Dark primary** — logo bg, action buttons, checkboxes (filled), spinners, active nav text, completion ring stroke |
| `--text-primary` | `#1E1B3A` | Main body text — deep navy-purple |
| `--text-secondary` | `#6B6889` | Dates, meta, subtitles |
| `--border` | `#E5E3F3` | Card and input borders |
| `--border-strong` | `#DDD9F5` | Sidebar right border |

**Two-purple rule:** `--btn-primary` (`#815BEB`) is the "dark primary" — used everywhere a filled, interactive element needs visual weight: logo background, checkboxes when checked, loading spinners, active nav tab text, the completion ring stroke, all action buttons. `--violet` (`#A78BFA`) is the "soft accent" — used only for hover states, focus borders, and nav active background fills where you want a hint of color, not a strong statement.

**Per-daily accent classes** (`.accent-violet`, `.accent-blue`, `.accent-emerald`, `.accent-amber`, `.accent-pink`, `.accent-cyan`) set `--accent`, `--accent-empty`, `--accent-shadow` on the card wrapper; children read via `bg-[var(--accent)]`.

**Priority dot colors** are completely separate and must never change with the brand theme:
- High: `oklch(0.55 0.20 25)` (red)
- Medium: `oklch(0.70 0.13 76)` (amber)
- Low: `oklch(0.68 0.01 264)` (neutral gray)

---

## Design direction

- **Theme:** Always light — `color-scheme: light` on `:root`, never dark mode
- **Card radius:** 14px dailies, 12px tasks, 16px insight card
- **Card shadow:** `card-lift` utility (`@utility` in globals.css) — soft lavender-tinted shadow so white cards lift off the `#F4F3FF` background
- **Buttons:** `bg-[var(--btn-primary)]` + `hover:bg-[var(--violet-dark)]` + `transition-colors`
- **Accent pattern:** Don't pass colors as props. Add `accent-${name}` class to wrapper; children read `var(--accent)`.

---

## What "Dailies" means

A Daily is a recurring daily behavior the user checks in on — e.g. Movement, Journaling, Learning. Each daily has:
- A **name** and optional **description**
- An **accent color** (one of 6 options: violet / blue / emerald / amber / pink / cyan)
- A **streak counter** (consecutive days done)
- A **7-day dot row** (past 6 days + today, filled = done)
- A **done/not-done toggle** for today

This is distinct from a Task (one-off, has a deadline, category, and priority). There is no separate Habits concept — Dailies absorbed it.

---

## Slice status

| Slice | Name | Status |
|---|---|---|
| 0 | Project setup | ✅ Complete |
| 1a | Supabase setup + Dailies CRUD | ✅ Complete |
| 1b | Today screen UI + state | ✅ Complete |
| 2 | Tasks (full CRUD route) | ✅ Complete (2026-06-15) |
| 3 | Dailies management page | ✅ Complete (2026-06-15) |
| 4 | Insights view | ✅ Complete (2026-06-15) |
| 5 | PWA (installable, offline) | ✅ Complete (2026-06-15) |
| v1.5 | Polish & Fixes | 🔄 In Progress |
| 6 | Auth (multi-device) | ⬜ Not started |

**Note:** App is installed as a PWA and being used daily by Kinjal. All v1 core features are shipped.

---

## What's built right now

**File structure (non-boilerplate):**
```
app/
  globals.css         — light theme tokens, 6 accent classes, @theme inline fonts, card-lift utility
  layout.tsx          — 3 Google fonts via next/font/google, html/body setup
  page.tsx            — Today screen (all state lives here, Supabase reads/writes)
  dailies/
    page.tsx          — Dailies management (add/edit/delete, 6-color picker, streak + best + 7-day history)
  insights/
    page.tsx          — Insights (stats row, two-col bar chart + consistency/leaderboard, 26-week heatmap)
  tasks/
    page.tsx          — Tasks page (filter tabs, priority, category, deadline, completed section)
components/
  Sidebar.tsx         — desktop sidebar: logo, nav, progress ring, account menu
  DailyCard.tsx       — individual daily card (used on Today screen); Accent type = violet|blue|emerald|amber|pink|cyan
lib/
  supabase.ts         — lazy singleton Supabase client (db() function)
public/
  manifest.json       — PWA web app manifest (name, icons, theme color, display: standalone)
  icon-192.png        — 192×192 PWA icon (purple square with white C; generated by scripts/generate-icons.mjs)
  icon-512.png        — 512×512 PWA icon (same)
scripts/
  generate-icons.mjs  — Node.js script that writes the PNG icons using built-in zlib + hand-rolled PNG encoder
```

**Today screen (`/`) — Supabase-backed:**
- Large greeting (time-aware: morning/afternoon/evening) + today's full date in monospace; K avatar button (mobile) with account dropdown
- **Daily motivational quote card** — 20 stoic/growth quotes, rotated by day-of-year; gradient background (`#EDE9FE → #F5F3FF`), large decorative `"` watermark (72px, `#A78BFA`, 28% opacity) top-left, 16px italic text, 1px `#DDD6FE` border, rounded-2xl; appears between greeting and date strip; shown on today's view only
- **Scrollable date strip** — horizontal scroll, past 30 days + next 14 days (45 cells total); today highlighted with filled `--btn-primary` pill; selected non-today date gets filled pill; auto-scrolls to center today on load; future dates allowed; scrollbar hidden (`no-scrollbar` utility)
  - **Month/year label** above strip (e.g. "June 2026") — clicking opens an inline calendar picker (full month grid in JSX, no library, Mon-first, prev/next month nav); clicking any date selects it and closes picker; "Today" jump button appears on the right when not viewing today
- **Equal 50/50 two-column layout** (desktop): Left = Dailies, Right = Tasks + streak insight below; stacks vertically on mobile (dailies first, then tasks, then streak insight)
- Dailies (left column): toggle done/not-done for selected date, 7-day dot row, streak counter; completed items sort to bottom; "+ Add daily" inline form
- Tasks (right column — today view):
  - **Pending**: all incomplete tasks sorted by deadline ascending (overdue first, no-deadline last)
  - **Completed today**: sub-section showing only tasks whose `completed_date` matches the viewed date — done tasks from other days are excluded; `completed_date` is written to Supabase when a task is checked off
  - "+ Add task" inline form with title, category, deadline, priority
- Tasks (right column — past/future date view): tasks with `deadline === viewDate`, read-only (no add form)
- **Streak insight card** — sits at the bottom of the right (tasks) column; visible on both desktop and mobile; full width of that column; purple gradient with top streak name, days-to-milestone countdown, and progress bar
- Sidebar: logo, nav (Today active), rhythm progress ring, account menu
- Mobile: bottom nav, sidebar hidden

**Dailies page (`/dailies`) — Supabase-backed:**
- Header with count + "+ Add daily" button
- 2-column card grid (1-col on mobile): each card shows accent dot + name, description, current streak, longest-ever streak, 7-day dot history row, pencil + trash icons
- Edit mode: clicking pencil transforms the card in-place into a form (name, description, 6-color picker); Save writes to Supabase and updates local state
- Delete: optimistic removal from UI; Supabase cascade deletes associated `daily_logs`
- Add form: opens above the grid; same fields + color picker with ring+checkmark selection indicator
- 6-color picker: violet, blue, emerald, amber, pink, cyan — swatches use the actual CSS oklch values
- Empty state with call-to-action button
- Sidebar "Dailies" nav item active; rhythm ring live

**Insights page (`/insights`) — read-only, Supabase-backed:**
- Header with total check-ins + daily habit count
- Stats row: 2×2 grid on mobile, 4-column on desktop — large colored numbers (lavender/amber/emerald/slate)
- Two-column layout: full-width stacked on mobile (`md:items-start`, `w-full` on both columns); 50/50 side-by-side on desktop
  - Left card — "This week" bar chart: today `#815BEB`, past `#C4B5FD`, future `#EDE9FE`
  - Right card — "Consistency · 30 days" progress bars + "Streak leaderboard"
- Heatmap: desktop shows full 26-week history; mobile auto-fits weeks to screen width and shows most recent N weeks; "View full history" toggle expands to all weeks since first check-in
- Sidebar "Insights" nav item active; rhythm ring live

**Tasks page (`/tasks`) — Supabase-backed:**
- Header with "**+ Add task**" button (opens inline add form; deadline pre-filled with currently selected date)
- **Scrollable date strip** — same 45-cell horizontal strip as Today page (past 30 + next 14); today highlighted; clicking month/year label opens calendar picker; "Today" jump button when off today
- **Filter chips** (below date strip): **All · Pending · Done**
- **All tab — smart date sections:**
  - Today selected: **Overdue** (red, incomplete tasks past deadline) → **Due Today** → **No Date** → **Completed** (all done tasks)
  - Future date selected: **Due on [date]** → **Upcoming · 7 Days** (next 7 days, collapsible, hidden by default) → **No Date**
  - Past date selected: all tasks with `deadline = selected date` (complete and incomplete), incomplete first
- **Pending tab**: all incomplete tasks sorted by deadline ascending (overdue first, no-deadline last) — ignores date strip
- **Done tab**: all completed tasks — ignores date strip
- Task cards: priority dot (red/amber/gray), title, category pill (hashed color), deadline, overdue badge (red), checkbox, `completed_date` written on toggle, delete button
- Inline add form: title (required), category, deadline date picker (pre-filled with view date), priority selector
- Empty state per context (with add button)
- Sidebar shows correct "Today's rhythm" ring (fetches daily counts alongside tasks)
- Mobile: bottom nav

**Data model (Supabase Postgres — RLS disabled, no user_id yet):**
```
dailies     — id, name, description, color, created_at
daily_logs  — id, daily_id → dailies, date, created_at  (unique per daily per day)
tasks       — id, title, category, deadline, done, priority, created_at
```
Note: `priority` column was added via `ALTER TABLE tasks ADD COLUMN priority text DEFAULT 'medium'` — not in the original PLAN.md schema.

---

## Key decisions

| Decision | Reason |
|---|---|
| Web PWA, not Flutter | Dropped the earlier Flutter/Jarvis project — web-first means no native toolchain, instant Vercel deploys, easier AI pair programming |
| Supabase | Postgres + auth + real-time in one service; generous free tier; first-class Next.js support |
| Auth deferred to Slice 5 | Single-device use covers v1; auth adds friction without shipping value early |
| Habits → Dailies rename | The distinction added complexity without clear user value at v1 scale |
| Goals/Projects deferred | The Dailies + Tasks loop needs to feel right before adding planning layers |
| OKLCH colors | Perceptually uniform — accent colors at the same lightness/chroma look equally vivid regardless of hue |
| Tailwind v4 (CSS-first) | Project was scaffolded with it; config lives entirely in `globals.css` — no `tailwind.config.ts` |
| `--btn-primary` split from `--violet` | Buttons need higher contrast than the soft lavender accent; state indicators (rings, checkboxes, nav active) stay soft |

---

## What's next — v1.5 Polish (in progress)

**Tags system** — ✅ shipped. SQL migration required in Supabase:
```sql
CREATE TABLE IF NOT EXISTS tags (id uuid primary key default gen_random_uuid(), name text not null unique, color text not null default 'violet', created_at timestamptz default now());
CREATE TABLE IF NOT EXISTS task_tags (task_id uuid references tasks(id) on delete cascade, tag_id uuid references tags(id) on delete cascade, primary key (task_id, tag_id));
CREATE TABLE IF NOT EXISTS daily_tags (daily_id uuid references dailies(id) on delete cascade, tag_id uuid references tags(id) on delete cascade, primary key (daily_id, tag_id));
```

**Remaining v1.5:**
- Today page — user avatar account/settings menu (wire up real settings page)

**After v1.5: Slice 6 (Auth)**
- Supabase magic-link or Google OAuth sign-in at `/login`
- Middleware to protect all routes; RLS policies on all tables
- Replace hardcoded placeholder with `auth.uid()`

---

## Gotchas to know

- **Tailwind v4** — no `tailwind.config.ts`. All config in `globals.css`. Custom utilities use `@utility`. Arbitrary values like `bg-[var(--violet)]` work fine. Shadow arbitrary values (`shadow-[0_4px_12px_...]`) cannot interpolate CSS variables inside the oklch() — hardcode those.
- **`color-scheme: light`** — must be on `:root` or system dark mode bleeds in even with explicit hex backgrounds.
- **`'use client'`** — required on any file using `useState`, event handlers, or browser APIs. All page and component files have it.
- **`export const dynamic = "force-dynamic"`** — required on every page that imports `lib/supabase.ts`, or Next.js tries to statically prerender it at build time and fails.
- **Lazy Supabase client** — `db()` in `lib/supabase.ts` defers `createClient()` to first call. Never move it to module level — it throws at build time when env vars aren't yet set.
- **`a { color: inherit }`** — in `globals.css`. Without it, `<Link>` renders as `<a>` with the browser's default blue link color overriding CSS variables.
- **`localDate()`** — uses `getFullYear()/getMonth()/getDate()`, not `toISOString()`. UTC shifts the date for UTC+5:30 users.
- **Sidebar data on every page** — each page that renders `<Sidebar>` must fetch daily counts and pass `doneCount` + `totalDailies` props, or the rhythm ring shows 0/0.
- **GitHub CLI** — installed at `C:\Program Files\GitHub CLI\gh.exe`; user is `Kinjal001`.
- **Dev server** — `npm run dev` on port 3000, uses Turbopack.
