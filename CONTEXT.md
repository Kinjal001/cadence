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
| Backend | Supabase (Postgres + Auth + real-time) — not yet wired |
| Deployment | Vercel — auto-deploys on push to `master` |
| Fonts | Bricolage Grotesque (headings) · Plus Jakarta Sans (body/UI) · JetBrains Mono (numbers/mono) |
| Colors | OKLCH color space — perceptually uniform; violet brand = `oklch(0.58 0.16 255)` |

**Repo:** https://github.com/Kinjal001/cadence  
**Live URL:** https://cadence-zeta-ruby.vercel.app/

---

## Design direction

- **Theme:** Always light — `color-scheme: light` on `:root`, never dark mode
- **Background:** `#F8F8FC` (off-white app bg), `#ffffff` (cards and sidebar)
- **Text:** `#1C1C2E` primary, `#5A5A78` secondary, `#8A8AA4` subtle
- **Accent:** Violet `oklch(0.58 0.16 255)` — used for active nav, check buttons, focus rings
- **Per-daily accent colors:** violet / blue / emerald / amber — defined as `.accent-{name}` CSS classes in `globals.css` that set `--accent`, `--accent-empty`, `--accent-shadow` custom properties; child elements read them via `bg-[var(--accent)]`
- **Card radius:** 14px dailies, 12px tasks, 16px insight card
- **Design reference file:** `Cadence Today.dc.html` (was fetched from Anthropic design API during Slice 1b implementation)

---

## What "Dailies" means

A Daily is a recurring daily behavior the user wants to check in on — e.g. Movement, Journaling, Learning. Each daily has:
- A **name** and optional **description**
- An **accent color** (one of 4 options)
- A **streak counter** (consecutive days done)
- A **7-day dot row** (past 6 days + today, filled = done)
- A **done/not-done toggle** for today

This is distinct from a Task (one-off, has a deadline and category). There is no separate Habits concept — Dailies absorbed it.

---

## Slice status

| Slice | Name | Status |
|---|---|---|
| 0 | Project setup | ✅ Complete |
| 1a | Supabase setup + Dailies CRUD | ⬜ Not started |
| 1b | Today screen UI + state | ✅ Complete |
| 2 | Tasks (full CRUD route) | ⬜ Not started |
| 3 | Insights view | ⬜ Not started |
| 4 | PWA (installable, offline) | ⬜ Not started |
| 5 | Auth (multi-device) | ⬜ Not started |

Slice 1 is split: the UI (1b) is done with React state; the Supabase wiring (1a) is next.

---

## What's built right now

**File structure (non-boilerplate):**
```
app/
  globals.css       — light theme tokens, accent classes, @theme inline fonts
  layout.tsx        — 3 Google fonts loaded via next/font/google, html/body setup
  page.tsx          — Today screen (entire UI, all state lives here)
components/
  Sidebar.tsx       — desktop sidebar: logo, nav, progress ring, account menu
  DailyCard.tsx     — individual daily card component
```

**Today screen features (all React useState, no DB yet):**
- Greeting + date header + "best streak" badge
- Dailies grid — 4 defaults (Movement, Healthy Food, Journaling, Learning)
  - Toggle done/not-done → streak increments/decrements
  - 7-day dot row updates correctly
  - "+ Add daily" expands inline card with Name (required) + Description (optional) fields
- Streak insight card — violet gradient, shows top streak + days to next milestone
- "Up next" task list — 3 defaults
  - Toggle done → strikethrough
  - "+ Add task" expands inline card with Task name (required), Category (optional), Deadline date picker (optional)
  - Saved task shows `Category · Jun 20` in the meta line
- Sidebar: logo, nav (Today active), today's rhythm progress ring, account menu
- Mobile: bottom nav bar, sidebar hidden

**Data model (in-memory only, no Supabase yet):**
```ts
interface Daily { id, name, desc, accent, streak, past: boolean[6], doneToday }
interface Task  { id, label, meta, done }
```

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
| Tailwind v4 (CSS-first) | Project was scaffolded with it; config lives entirely in `globals.css` via `@import "tailwindcss"`, `@theme inline`, and `@utility` — no `tailwind.config.ts` |
| State in `page.tsx` | Simplest location for now; will migrate to Supabase queries in Slice 1a |

---

## What's next — Slice 1a

Wire Supabase so data persists:

1. Create a Supabase project → get `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Add env vars to `.env.local` and Vercel dashboard
3. Install `@supabase/supabase-js`, create `lib/supabase.ts` client
4. Run migrations in Supabase SQL editor (schemas in PLAN.md → Slice 1):
   - `dailies` table (id, user_id, name, desc, color, sort_order, archived_at, created_at)
   - `daily_logs` table (id, daily_id, date, created_at) — unique(daily_id, date)
5. Replace `DEFAULT_DAILIES` / `DEFAULT_TASKS` with Supabase reads
6. Toggle handlers → insert/delete rows in `daily_logs`
7. Streak = count of consecutive dates in `daily_logs` for that daily

> Note: `user_id` will be a hardcoded placeholder UUID until Slice 5 adds real auth.

---

## Gotchas to know

- **Tailwind v4** — no `tailwind.config.ts`. All config is in `globals.css`. Custom utilities use `@utility`, not `plugin()`. Arbitrary values like `bg-[var(--violet)]` work fine.
- **`color-scheme: light`** — must be on `:root` or system dark mode bleeds into the app even with explicit hex backgrounds.
- **`'use client'`** — required on any file using `useState`, event handlers, or browser APIs. `page.tsx`, `Sidebar.tsx`, `DailyCard.tsx` all have it.
- **GitHub CLI** — installed at `C:\Program Files\GitHub CLI\gh.exe`; user is `Kinjal001`.
- **Dev server** — `npm run dev` on port 3000, uses Turbopack.
- **Accent color pattern** — don't pass color strings as props or inline styles. Add `accent-${name}` class to the card wrapper; children read `var(--accent)` via Tailwind arbitrary values.
