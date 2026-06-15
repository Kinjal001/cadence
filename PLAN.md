# Cadence — Project Plan

**Live URL:** https://cadence-zeta-ruby.vercel.app/
**Repo:** https://github.com/Kinjal001/cadence
**Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS · Supabase · Vercel
**v1 Scope:** Dailies (daily check-in behaviors with streaks, history, notes) + Tasks — Goals and Projects deferred to later

---

## Design Direction

- **Theme:** Clean light, OKLCH color space for perceptually uniform daily colors
- **Fonts:** Bricolage Grotesque (headings/display) · Plus Jakarta Sans (body/UI) · JetBrains Mono (numbers, streaks, stats)
- **Motifs:** Completion rings on dailies, streak counters, subtle animation on check-in

---

## Slices

---

### Slice 0: Project Setup — ✅ Complete

**Goal:** Scaffold the project, connect to GitHub, and get a live deployment URL.

- [x] Next.js 16 with TypeScript and App Router
- [x] Tailwind CSS configured
- [x] Placeholder homepage ("Cadence / keep the rhythm")
- [x] GitHub repository connected: github.com/Kinjal001/cadence
- [x] Deployed to Vercel: https://cadence-zeta-ruby.vercel.app/

**Data model additions:** none

**Done when:** Opening the Vercel URL shows the Cadence placeholder page. ✅

---

### Slice 1: Dailies — Today View with Check-in and Streaks — ✅ Complete (2026-06-14)

**Goal:** The core loop — see today's dailies, tap to check them off, watch a streak grow. Backed by Supabase so data persists across sessions.

This slice is split into two sub-steps. Complete them in order.

#### Step 1a: Supabase setup + Dailies CRUD — ✅ Complete

- [x] Create a Supabase project and get the project URL + anon key
- [x] Add env vars to `.env.local` and the Vercel dashboard (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [x] Install `@supabase/supabase-js` and create `lib/supabase.ts` client
- [x] Run the `dailies`, `daily_logs`, and `tasks` migrations in the Supabase SQL editor (schema below)
- [x] Today screen reads dailies + logs + tasks from Supabase on mount
- [x] Toggle daily done/not-done writes to `daily_logs` (insert/delete)
- [x] Toggle task done writes to `tasks` table (`done` column)
- [x] Add daily writes to `dailies` table
- [x] Add task writes to `tasks` table
- [x] Streak computed from `daily_logs` (consecutive days, timezone-safe)
- [x] 7-day dot row computed from `daily_logs`

#### Step 1b: Today check-in + streaks + completion ring UI

- [x] Add the three fonts via `next/font/google` in `layout.tsx`
- [x] Define OKLCH color tokens as CSS custom properties in `globals.css`
- [x] Today view (make `/` the landing page): shows dailies due today
- [x] Tapping a daily toggles done state (React useState — Supabase in Step 1a)
- [x] Completion ring SVG component — animates in sidebar on check-in
- [x] Streak counter: increments/decrements on toggle, display with JetBrains Mono
- [x] Undo check-in: tap again to uncheck the daily and decrement streak
- [x] 4 default dailies (Movement, Healthy Food, Journaling, Learning) with distinct accent colors
- [x] 3 default tasks with inline toggle
- [x] Add daily: text input form with Enter/Add/Cancel
- [x] Add task: always-visible input row, Enter to submit
- [x] Light theme enforced (color-scheme: light, explicit #F8F8FC backgrounds)
- [x] All violet hue references updated to oklch hue 255 as specified

**Data model additions:**

```sql
-- Run in Supabase SQL editor

create table dailies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,       -- hardcoded placeholder until Slice 5 adds real auth
  name        text not null,
  color       text not null,       -- oklch string, e.g. 'oklch(0.72 0.15 250)'
  icon        text,                -- emoji or null
  sort_order  integer default 0,
  archived_at timestamptz,
  created_at  timestamptz default now()
);

create table daily_logs (
  id         uuid primary key default gen_random_uuid(),
  daily_id   uuid references dailies(id) on delete cascade,
  date       date not null,
  created_at timestamptz default now(),
  unique(daily_id, date)           -- one check-in per daily per day
);
```

**Done when:** You can add a daily, see it on the Today view, tap it to fill its completion ring, and after two consecutive days the streak counter reads 2.

---

### Slice 2: Tasks — Add, Complete, and Filter — ✅ Complete (2026-06-15)

**Goal:** A lightweight task list — add tasks with optional due dates, mark them done, filter by status. No projects, labels, or priorities in v1.

- [x] Run the `tasks` migration (schema below)
- [x] `/tasks` route with a scrollable task list
- [x] Quick-add form: title + optional due date picker
- [x] Mark task complete: strikethrough animation, task moves to Completed section
- [x] Delete task (swipe or trash icon)
- [x] Filter tabs: **All · Active · Completed**
- [x] Overdue badge: red indicator if due date is in the past and task is still active

**Data model additions:**

```sql
create table tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  title        text not null,
  due_date     date,
  completed_at timestamptz,
  created_at   timestamptz default now()
);
```

**Done when:** You can add "Buy groceries" with a due date of tomorrow, mark it done, see it move to Completed, and confirm that a past-due uncompleted task shows the overdue indicator.

---

### Slice 3: Dailies — Management Page — ✅ Complete (2026-06-15)

**Goal:** A dedicated page for managing dailies — add, edit, delete — separate from the Today check-in screen. Exposes streak history, longest-ever streak, and a color picker.

- [x] `/dailies` route with a 2-column card grid
- [x] Each card: accent dot + name, description, current streak, longest streak, 7-day dot history row
- [x] Edit button: card transforms in-place into a form (name, description, color)
- [x] Delete button: removes the daily (cascades to `daily_logs` via Supabase FK)
- [x] `+ Add daily` header button: opens an inline form above the grid
- [x] Color picker: 6 preset swatches (violet, blue, emerald, amber, pink, cyan) with ring + checkmark selection indicator
- [x] Empty state with call-to-action button
- [x] Sidebar "Dailies" nav item active; rhythm ring reads live counts
- [x] Extended `Accent` type and added `.accent-pink` / `.accent-cyan` CSS classes so new colors work on Today screen too

**Data model additions:** none (reads/writes to existing `dailies` table; `daily_logs` cascade-deleted on daily delete)

**Done when:** You can add a new daily with a pink color, see it appear on both `/dailies` and the Today screen, edit its name, and delete it — confirming it disappears from both places.

---

### Slice 4: Insights — Weekly Stats and Consistency View

**Goal:** A read-only view that surfaces how you're doing — completion rates, streaks over the last four weeks, and a week summary. No new data — everything is derived from existing tables.

- [ ] `/insights` route
- [ ] This week's summary card: dailies completed today (X of Y), tasks closed this week
- [ ] Per-daily consistency grid: GitHub-style heatmap for the last 28 days
- [ ] Streak stats per daily: Current streak · Longest streak (using JetBrains Mono for numbers)
- [ ] Tasks closed this week vs last week comparison

**Data model additions:** none (reads from `daily_logs`, `tasks`)

**Done when:** After a few days of use, `/insights` shows a partially filled heatmap, accurate streak numbers, and a tasks-closed count that matches what you actually completed.

---

### Slice 5: PWA Setup — Installable and Offline-Friendly

**Goal:** Make Cadence installable to the home screen on mobile and desktop, with a cached shell so the Today view loads instantly even without a network connection.

- [ ] `public/manifest.json` with name, short name, icons, theme color (`oklch`-based hex fallback), display: `standalone`
- [ ] App icons: at minimum 192×192 and 512×512 PNG (can use a simple wordmark for v1)
- [ ] Wire up the manifest in `layout.tsx` via `<link rel="manifest">`
- [ ] Service worker via `next-pwa` package (or manual registration in `layout.tsx`)
- [ ] Offline fallback page at `/offline` — friendly message + cached ring logo
- [ ] Cache the Today view shell so it renders while Supabase data loads
- [ ] Verify "Add to Home Screen" prompt appears on Chrome/Safari mobile

**Data model additions:** none

**Done when:** On your phone, you can install Cadence to the home screen, open it in airplane mode, and see the Today view shell render (with a loading state for the data) rather than a browser error page.

---

### Slice 6: Auth — Multi-Device Access

**Goal:** Add Supabase Auth so your data follows you across devices. Deliberately deferred — single-device use should feel solid first.

- [ ] Enable Supabase Auth in the dashboard (magic link email, or Google OAuth)
- [ ] Sign-in page at `/login` using Supabase's auth helpers
- [ ] Middleware to protect all routes — redirect unauthenticated users to `/login`
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Add RLS policies: users can only read/write their own rows
- [ ] Replace the hardcoded `user_id` placeholder with `auth.uid()` everywhere
- [ ] Sign-out button in the nav

**Data model additions:**

```sql
-- Enable RLS and add policies on every table
-- (repeat this pattern for dailies, daily_logs, tasks)

alter table dailies enable row level security;

create policy "users see own dailies"
  on dailies for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

**Done when:** You sign in on a second device (or an incognito window), and your dailies and tasks are all there. A signed-out visitor hitting `/` is redirected to `/login`.

---

## Decisions Log

| Date | Decision | Reason |
|------|----------|--------|
| 2026-06-14 | Started fresh with Next.js, retiring the Flutter project (Jarvis) | Web-first means no native build toolchain, instant deploys, easier to iterate with AI pair programming |
| 2026-06-14 | Supabase as the backend | Postgres + auth + real-time in one service; generous free tier; first-class Next.js support |
| 2026-06-14 | Auth deferred to Slice 6 | Single-device use covers the v1 use case; adding auth earlier adds friction without shipping value |
| 2026-06-14 | Goals and Projects deferred past v1 | The Dailies + Tasks loop needs to feel right before adding planning layers on top |
| 2026-06-14 | Merged Habits and Dailies into a single "Dailies" concept | The distinction added complexity without clear user value at v1 scale; one unified daily check-in model is simpler to build and use |
| 2026-06-14 | OKLCH color space for daily colors | Perceptually uniform — two dailies at the same lightness/chroma but different hues look equally vivid, unlike HSL |
| 2026-06-14 | Bricolage Grotesque + Plus Jakarta Sans | Bricolage adds personality to headings; Jakarta Sans is clean and highly legible for UI text at small sizes |
| 2026-06-14 | JetBrains Mono for numbers | Tabular figures and monospace rhythm make streak counts and stats feel precise and data-y |
| 2026-06-15 | Split button color from accent: `--btn-primary` `#815BEB` vs `--violet` `#A78BFA` | Buttons need to read as interactive controls; soft lavender `#A78BFA` is too low-contrast for a fill. Checkboxes, rings, and nav active stay lavender because they're state indicators, not actions. |
| 2026-06-15 | Background `#F4F3FF` instead of near-white `#F8F8FC` | Subtle lavender tint gives cards something to lift off of; pure near-white felt flat with white cards |
| 2026-06-15 | Tasks page extended beyond v1 plan: added priority + category | Priority (high/medium/low) and freeform category felt essential to make task cards useful; added `priority` column via `ALTER TABLE` |
| 2026-06-15 | Added Dailies management page as Slice 3 (not in original plan) | Today screen only has a quick-add form; a dedicated page for edit/delete/history was needed to make dailies feel manageable |
| 2026-06-15 | Extended accent palette from 4 to 6 colors (added pink + cyan) | More variety makes the daily grid visually richer; both colors are implemented as CSS accent classes and work across all pages |
