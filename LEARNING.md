# Cadence — Learning Log

A running record of every concept, tool, and pattern introduced in this project — explained simply, organized by the Slice where it first appeared. Add new entries as slices are completed.

**v1 scope:** Dailies (daily check-in behaviors with streaks, history, notes) + Tasks.

---

## Slice 0: Project Setup

### Next.js (App Router)
Next.js is a framework built on top of React that adds routing, server-side rendering, and a lot of sensible defaults so you don't have to set everything up from scratch. The "App Router" is its newer routing system (introduced in Next.js 13) where you create folders inside `app/` and each folder's `page.tsx` file becomes a URL route. For example, `app/page.tsx` is the homepage (`/`), and `app/habits/page.tsx` would become `/habits`.

**Why we used it:** It handles routing, fonts, image optimization, and deployment configuration out of the box — much less setup than plain React.

**Where:** Every file inside the `app/` folder.

---

### TypeScript
TypeScript is JavaScript with types added. You declare what shape your data is (e.g. "this variable is a string", "this function returns a number") and TypeScript warns you if you use it wrong — before the code even runs.

**Why we used it:** Catches mistakes early, especially useful when working with database data where a missing field can cause a silent bug.

**Where:** Every `.tsx` and `.ts` file in the project. The `tsconfig.json` file configures it.

---

### Tailwind CSS
Tailwind is a CSS library where instead of writing separate `.css` files, you style things by adding small class names directly to your HTML/JSX. For example, `className="text-center font-bold text-stone-900"` instead of creating a `.heading { text-align: center; font-weight: bold; color: #1c1917; }` rule somewhere.

**Why we used it:** Faster to style things without switching files. The design stays close to the markup, which is easier to read.

**Where:** The `className` props on elements throughout `app/page.tsx` and `app/layout.tsx`. Configuration lives in `postcss.config.mjs`.

---

### App Router file conventions: `layout.tsx` and `page.tsx`
In the App Router, two special filenames matter most:
- `page.tsx` — the actual content of a route. What the user sees when they visit that URL.
- `layout.tsx` — a wrapper that wraps around every page inside its folder. Used for things that should appear on every page: fonts, a nav bar, global styles.

**Why we used it:** `layout.tsx` at the root level sets up the fonts and the `<html>` and `<body>` tags once, so every page inherits them automatically.

**Where:** `app/layout.tsx` (global wrapper) and `app/page.tsx` (homepage).

---

### `next/font/google`
A built-in Next.js feature for loading Google Fonts. Instead of adding a `<link>` tag in your HTML (which causes a flash of unstyled text), Next.js downloads the font at build time and serves it from your own server. Faster and no layout shift.

**Why we used it:** The Cadence design uses Geist Sans (loaded this way by default from `create-next-app`). Bricolage Grotesque, Plus Jakarta Sans, and JetBrains Mono will be added the same way in Slice 1b.

**Where:** `app/layout.tsx` — the `Geist` and `Geist_Mono` imports at the top.

---

### CSS custom properties (variables)
A way to define a value once and reuse it everywhere in your CSS. Written as `--variable-name: value` and used as `var(--variable-name)`. Next.js/Tailwind uses these to pass font family names from the JS font loader into CSS.

**Why we used it:** The font loaded in `layout.tsx` is exposed as `--font-geist-sans`, and the page applies it via `style={{ fontFamily: "var(--font-geist-sans)" }}`. This way the font is always in sync even if the class name changes.

**Where:** `app/layout.tsx` (sets the variable on `<html>`) and `app/page.tsx` (uses it via inline style).

---

### `suppressHydrationWarning`
React renders your page on the server first (producing HTML), then "hydrates" it on the client — attaching JavaScript event listeners to the existing HTML. If the HTML on the server doesn't exactly match what React expects on the client, React throws a hydration warning. Browser extensions like Grammarly inject extra attributes into the `<body>` tag, causing this mismatch. Adding `suppressHydrationWarning` to `<body>` tells React: "ignore attribute differences on this element specifically."

**Why we used it:** Grammarly was injecting `data-gr-*` attributes into `<body>`, causing a console error on every page load even though nothing was actually broken.

**Where:** `app/layout.tsx` — the `<body>` tag.

---

### Git and GitHub
Git is a version control tool — it tracks every change you make to your code, lets you go back in time, and lets multiple people (or AI tools) work on the same codebase safely. GitHub is a website that hosts your Git repository online.

Key terms:
- **commit** — a saved snapshot of your code at a point in time, with a message describing what changed
- **push** — upload your local commits to GitHub
- **branch** — a separate line of development (we're using `master`, the default)

**Why we used it:** So no work is ever lost, and so Vercel can watch the repo and auto-deploy on every push.

**Where:** The hidden `.git/` folder, `.gitignore`, and the remote at github.com/Kinjal001/cadence.

---

### `.gitignore`
A file that tells Git which files and folders to never track. Common entries: `node_modules/` (thousands of dependency files you can always reinstall), `.env.local` (secrets that should never be committed), `.next/` (the build output that gets regenerated).

**Why we used it:** Without it, a `git add .` would try to commit 300MB+ of `node_modules` and your secret API keys.

**Where:** `.gitignore` in the project root. Generated automatically by `create-next-app`.

---

### Vercel
A hosting platform built specifically for Next.js (they made both). You connect your GitHub repo, and every time you push to `master`, Vercel automatically rebuilds and deploys your app. No server to manage.

**Why we used it:** Zero-config deployment for Next.js, free tier is generous, and automatic preview URLs for branches are useful later.

**Where:** Live at https://cadence-zeta-ruby.vercel.app/. Config can go in `vercel.json` if needed (we don't have one yet).

---

### GitHub CLI (`gh`)
A command-line tool for interacting with GitHub — creating repos, opening PRs, checking status — without using the browser. Installed separately from Git.

**Why we used it:** Created the `cadence` GitHub repository and pushed the initial code from the terminal in one command (`gh repo create`).

**Where:** Used once during setup. Not part of the app code itself.

---

### `create-next-app`
A scaffolding tool (`npx create-next-app@latest`) that generates a new Next.js project with all the config files, folder structure, and dependencies pre-set. Like a project starter template.

**Why we used it:** Saves 30+ minutes of manual config. Got us TypeScript + Tailwind + App Router + ESLint all wired up correctly from the start.

**Where:** Used once to generate the initial project. The files it created are now the project's foundation.

---
<!-- NEW ENTRIES GO BELOW THIS LINE, GROUPED BY SLICE -->

---

## Slice 1 (Step 1b): Today Screen UI

### `'use client'` directive
In Next.js App Router, all components are server components by default — they run on the server and send plain HTML to the browser. When a component needs interactivity (clicks, typed input, local state), you add `'use client'` at the very top of the file. This tells Next.js to send that component's JavaScript to the browser so it can respond to events.

**Why we used it:** The Today page tracks which dailies are checked off and which tasks are done — both need `useState`, which is browser-only. `Sidebar.tsx` also uses it for the account menu open/close state.

**Where:** `app/page.tsx`, `components/Sidebar.tsx`, `components/DailyCard.tsx`.

---

### `useState` (React hook)
A React function that gives a component its own memory. You call `useState(initialValue)` and get back two things: the current value, and a function to update it. Every time the value changes, React re-renders the component with the new value.

**Why we used it:** We track the `dailies` array (which ones are checked) and `tasks` array (which ones are done) in the page component. When you tap a daily card, `toggleDaily` calls `setDailies` with the updated array, and the UI re-renders to show the check mark and updated streak.

**Where:** `app/page.tsx` — `const [dailies, setDailies] = useState(SEED_DAILIES)` and `const [tasks, setTasks] = useState(SEED_TASKS)`.

---

### CSS custom properties (`var()`) for design tokens
CSS custom properties (also called CSS variables) let you define a value once and reuse it everywhere. In `globals.css` we define things like `--violet: oklch(0.56 0.18 295)` in `:root`, then use `var(--violet)` anywhere in the CSS. Tailwind's arbitrary value syntax accepts these: `bg-[var(--violet)]`.

**Why we used it:** The design uses OKLCH colors (see below) that aren't in Tailwind's default palette. Defining them as CSS variables means we write the OKLCH value once and reference the name everywhere — easier to change later, and avoids repeating long `oklch(...)` strings in every class.

**Where:** `app/globals.css` defines the tokens (`:root { --violet: ... }`). Every component uses them via Tailwind arbitrary values like `text-[var(--text-primary)]`, `bg-[var(--border)]`.

---

### OKLCH color space
Colors on screens are usually described in hex (`#7c3aed`) or HSL (hue, saturation, lightness). OKLCH is a newer, perceptually uniform color space — "perceptually uniform" means that if you change the lightness number by 10, the color *looks* 10% different to the human eye, not just mathematically different. This makes it much easier to create color palettes where all the habit accent colors feel equally vivid at the same lightness setting.

**Why we used it:** The design specifies OKLCH colors for everything. Using OKLCH lets us pick accent colors for each daily (violet, blue, emerald, amber) that look visually balanced next to each other without manual tweaking.

**Where:** `app/globals.css` — all color custom properties use `oklch(lightness chroma hue)` format, e.g. `oklch(0.56 0.18 295)` for violet.

---

### Tailwind arbitrary values
Tailwind's utility classes cover common values (like `text-sm`, `p-4`), but sometimes you need a very specific value that's not in the default scale. Tailwind lets you write any value you want inside square brackets: `text-[15px]`, `rounded-[14px]`, `tracking-[-0.035em]`, `bg-[var(--violet)]`. This is called an "arbitrary value."

**Why we used it:** The design specifies exact pixel sizes (`34px` buttons, `264px` sidebar width) and custom colors (`oklch(...)`) that don't exist as named Tailwind classes. Arbitrary values let us match the design precisely without writing separate CSS files.

**Where:** Throughout all components — e.g. `w-[264px]`, `rounded-[14px]`, `text-[var(--text-primary)]`, `tracking-[-0.035em]`.

---

### `@utility` in Tailwind v4
Tailwind v4 (the version this project uses) configures everything via CSS instead of a `tailwind.config.js` file. One feature is `@utility`, which lets you define a custom Tailwind utility class in `globals.css`. Any class defined this way is available globally and won't be removed by Tailwind's unused-class purging.

**Why we used it:** The insight card has a complex violet gradient (`linear-gradient(150deg, oklch(...), oklch(...))`) that can't be expressed cleanly as a single Tailwind arbitrary value. Defining `.insight-card { background: ...; box-shadow: ...; }` as a `@utility` lets us just write `className="insight-card"` in the component.

**Where:** `app/globals.css` — `@utility insight-card { ... }`. Used in `app/page.tsx` on the insight card div.

---

### Accent color token pattern (CSS variable inheritance)
When you have multiple variants of a component that each use a different color (violet daily, blue daily, etc.), you can avoid passing color strings as inline styles by defining a CSS class that sets CSS variable values, then having child elements read those variables.

We define `.accent-violet { --accent: oklch(...); }`, `.accent-blue { --accent: oklch(...); }` etc. The card wrapper gets `className="accent-violet"`, and child elements use `bg-[var(--accent)]`. CSS variables cascade down through the DOM, so children automatically get the right color.

**Why we used it:** Tailwind can't generate classes for dynamic values at build time (it needs to see the class name literally in the source). This pattern gives us dynamic colors without inline styles and without dozens of conditional class strings.

**Where:** `app/globals.css` defines `.accent-{name}` classes. `components/DailyCard.tsx` applies `accent-${accent}` on the wrapper div, and child spans use `bg-[var(--accent)]` and `bg-[var(--accent-empty)]`.

---

### SVG progress ring (stroke-dasharray / stroke-dashoffset)
An SVG circle can be turned into a progress arc by using two CSS properties: `stroke-dasharray` sets the total dash length (equal to the circle's circumference), and `stroke-dashoffset` shifts where the dash starts. By animating the offset from full circumference (empty) to 0 (full circle), you get a progress ring.

Circumference formula: `C = 2 × π × radius`. For `r=34`: `C ≈ 213.6px`.

**Why we used it:** The sidebar's "Today's rhythm" section shows a small ring that fills as you complete more dailies. It's a core visual motif of the design.

**Where:** `components/Sidebar.tsx` — the `<circle>` element with `strokeDasharray` and `strokeDashoffset` computed from `doneCount / totalDailies`. The `style` prop is used here specifically because these are dynamically computed SVG animation values.

---

### `color-scheme: light`
A CSS property set on `:root` that tells the browser "this page is always light." Without it, if a user's OS is in dark mode, the browser overrides default element colors (scrollbars, form controls, and even `background` on `<html>`) to dark values — even if you haven't written any dark-mode CSS. Adding `color-scheme: light` in `:root` opts the entire page out of the system dark theme.

**Why we used it:** The app was rendering a black background on machines with OS-level dark mode enabled, because Tailwind's `@import "tailwindcss"` doesn't set `color-scheme`. Adding it to `:root` in `globals.css` was the single fix that locked the app to a light theme.

**Where:** `app/globals.css` — `:root { color-scheme: light; }`.

---

### Responsive layout with Tailwind breakpoints
Tailwind has responsive prefixes: `md:` applies a class only at `768px` and wider, `lg:` at `1024px`, etc. On mobile (below `md`), classes without a prefix apply. This lets you write mobile-first styles and progressively override them for larger screens.

For example: `flex-col md:flex-row` means "stack vertically on mobile, side-by-side from md up."

**Why we used it:** On desktop the sidebar is always visible; on mobile it would take too much space, so we hide it (`hidden md:flex`) and show a fixed bottom navigation bar instead (`flex md:hidden`).

**Where:** `app/page.tsx` — the sidebar wrapper div (`hidden md:flex`), the bottom nav (`md:hidden`), and the two-column body (`flex-col md:flex-row`).

---

### Controlled inputs and form state (React)
A "controlled input" is an `<input>` whose value is always set from React state. You wire `value={stateVar}` and `onChange={(e) => setStateVar(e.target.value)}` together. The component is the single source of truth — the browser's input box just reflects what React says.

**Why we used it:** The "Add daily" name field and the "Add task" field both need their values available to the submit handler. With controlled inputs, `addDaily()` simply reads `newDailyName` from state — no `ref` or DOM query needed.

**Where:** `app/page.tsx` — the `newDailyName` and `newTaskLabel` state vars wired to their `<input>` elements.

---

---

## Slice 1 (Step 1a): Supabase Integration

### Database tables and foreign keys
A database table is like a spreadsheet — it has named columns (like `id`, `name`, `created_at`) and rows of data. Each row gets a unique `id` column so you can refer to it precisely. A **foreign key** is a column in one table that points to a row in another table. For example, `daily_logs.daily_id` is a foreign key referencing `dailies.id` — it says "this log entry belongs to that specific daily." The database enforces that the referenced row actually exists; if you try to insert a log for a daily that doesn't exist, it fails. `on delete cascade` means: if a daily is deleted, all its logs are automatically deleted too, so you never get orphaned rows.

**Why we used it:** `daily_logs` records one check-in per daily per day. It needs a foreign key to `dailies` so each log is linked to the right habit. The `unique(daily_id, date)` constraint means you can only check in once per day per daily — no accidental duplicates.

**Where:** The SQL run in Supabase's SQL Editor during Slice 1a. Reflected in `PLAN.md` under Slice 1 → Data model.

---

### Client-side state vs. a real database
Before Slice 1a, all data lived in React's `useState` — arrays stored in the browser's memory while the tab was open. Refresh the page and everything resets to the hardcoded defaults. A real database (Supabase / Postgres in our case) stores data on a server, so it persists across refreshes, devices, and time. The tradeoff: a database requires a network round-trip to read and write, so you need patterns like `useEffect` for initial load and optimistic updates to keep the UI feeling fast.

**Why we learned it:** Switching from `useState` seed data to Supabase is the central step of Slice 1a. Understanding the difference helps explain why we need `useEffect`, `Promise.all`, loading states, error handling, and optimistic updates — all patterns that exist to bridge the gap between instant in-memory state and a remote database.

**Where:** `app/page.tsx` — the entire page was rewritten to fetch from Supabase on mount and write back on every toggle/add. Before this, it used `SEED_DAILIES` and `SEED_TASKS` constants.

---

### Supabase client (`@supabase/supabase-js`)
Supabase is a hosted Postgres database with a JavaScript client library. `createClient(url, anonKey)` gives you an object you can use to query and mutate any table in your database using a chainable API — no SQL required in most cases.

**Why we used it:** It's Cadence's backend — all dailies, logs, and tasks persist here so data survives page refreshes and eventually multiple devices (once auth is added in Slice 5).

**Where:** `lib/supabase.ts` creates and exports the single shared client. `app/page.tsx` imports it for all reads and writes.

---

### Environment variables (`NEXT_PUBLIC_` prefix)
Next.js reads `.env.local` at build/dev time and injects variables into the app. Variables prefixed with `NEXT_PUBLIC_` are included in the client-side JavaScript bundle — safe for public API keys like Supabase's anon key. Variables without the prefix are server-only. `.env.local` is gitignored by `.env*` in `.gitignore`.

**Why we used it:** The Supabase URL and anon key need to reach the browser (since we use the browser Supabase client). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to expose — the anon key only allows what Supabase RLS policies permit.

**Where:** `.env.local` (local values, gitignored). Vercel dashboard (production values, set manually).

---

### `useEffect` for data fetching in client components
In Next.js App Router, a `'use client'` component can't be `async`. To fetch data on mount, you use `useEffect(() => { fetchData(); }, [])` — the empty array means "run once after the component first renders." Inside, you call an async function that writes results into state.

**Why we used it:** `page.tsx` is a client component (it needs `useState` for all the interactive form state). We can't make it `async`, so `useEffect` + a `loadData()` function is the right pattern for initial data fetching.

**Where:** `app/page.tsx` — `useEffect(() => { loadData(); }, [])`.

---

### Optimistic updates
An "optimistic update" means you update the UI *immediately* when a user clicks, before the server confirms the change. Then you fire the actual database write in the background. If the write succeeds, nothing changes visually. If it fails, you'd roll back (we don't handle rollback yet — that's fine for a personal app).

**Why we used it:** Toggling a daily or task feels instant. Without this, there would be a visible delay while the Supabase round-trip completes (~100–300ms). With it, the check appears the moment you tap.

**Where:** `toggleDaily` and `toggleTask` in `app/page.tsx` — `setDailies(...)` / `setTasks(...)` is called before `await supabase...`.

---

### Timezone-safe local date strings
`new Date().toISOString()` returns the date in UTC. For someone in UTC+5:30, midnight local time is 18:30 UTC the *previous* day — so `toISOString().split('T')[0]` can give yesterday's date. The fix is to build the date string from local getters (`getFullYear()`, `getMonth()`, `getDate()`), which always reflect the user's local clock.

**Why we used it:** Cadence's core feature is daily check-ins by date. Getting the date wrong by one day would mean a check-in at 11pm appearing on the wrong day in the database.

**Where:** `localDate(daysAgo?)` helper in `app/page.tsx` — used for today's date, the "since" query bound, past-week dots, and streak computation.

---

### `Promise.all` for parallel fetches
`Promise.all([p1, p2, p3])` fires all three promises at the same time and waits for all of them to resolve. This is faster than `await p1; await p2; await p3` (sequential), which would take 3× the round-trip time.

**Why we used it:** On page load we need dailies, daily_logs, and tasks — three independent Supabase queries. Running them in parallel halves the loading time.

**Where:** `loadData()` in `app/page.tsx` — `const [a, b, c] = await Promise.all([...])`.

---

### `onKeyDown` for keyboard submit
Instead of a `<form onSubmit>`, you can listen for `e.key === "Enter"` inside `onKeyDown` on an input and call the submit handler directly. Combined with `e.key === "Escape"` to cancel, this gives fast keyboard flow without a `<form>` element.

**Why we used it:** The task input row is designed to feel like a quick-capture field — press Enter to add, no button click required. The Add-daily form also supports Escape to dismiss.

**Where:** `app/page.tsx` — both input elements' `onKeyDown` handlers.

---

## Slice 2: Tasks Page + Design Polish

### `export const dynamic = "force-dynamic"`
By default, Next.js tries to statically render (pre-build) pages that have no server-side data. When a page imports `lib/supabase.ts`, Next.js can try to evaluate that module at build time — which fails because the env vars aren't set during the build. Exporting this constant at the top of the page file tells Next.js: "never pre-render this page; always render it at request time."

**Why we used it:** Both `app/page.tsx` and `app/tasks/page.tsx` use `useEffect` to fetch Supabase data client-side, but Next.js still tried to analyze their imports at build time and threw a build error. This one line fixed the Vercel deployment failure.

**Where:** Line 3 in `app/page.tsx` and `app/tasks/page.tsx`.

---

### Lazy singleton pattern for Supabase client
Instead of calling `createClient(url, key)` at the module's top level, we wrap it in a function that only calls it the first time it runs — storing the result in a module-level variable and reusing it on subsequent calls. This is called a "lazy singleton."

**Why we used it:** Next.js evaluates module code during static analysis at build time, before env vars are available. A top-level `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, ...)` was throwing `undefined` errors. Deferring the call inside a function means it only runs when the page actually loads in a browser, where env vars exist.

**Where:** `lib/supabase.ts` — `export function db(): SupabaseClient { if (!_client) { _client = createClient(...) } return _client; }`.

---

### `a { color: inherit }` — preventing default browser link color
HTML `<a>` tags have a browser-default style of `color: blue`. When Next.js's `<Link>` component renders (it outputs an `<a>` tag), that browser default overrides your CSS variable-based colors. Adding `a { color: inherit }` in `globals.css` tells all links to use whatever color their parent element has, instead of the browser default blue.

**Why we used it:** The sidebar nav items were showing blue text on active state instead of the designed violet, even though the classes were correct. The issue was the browser's default link color winning. This one rule in `globals.css` fixed all nav items at once.

**Where:** `app/globals.css` — top-level `a { color: inherit; }`.

---

### OKLCH hue calibration: why hue 255 looks blue
OKLCH's hue is measured in degrees around a color wheel. Hue 240 is pure blue. Hue 255 is blue-violet — it *appears blue* to the human eye, not violet. Hue 270 is where violet starts, hue 283 is a clean violet, and hue 293 is a purple-violet. This matters because it's not obvious: you'd expect hue 270 to be "middle violet," but perceptually you need to go further.

**Why we used it:** The entire app accent was rendering as blue even though we thought we were using violet. Shifting from hue 255 → 283 → 293 across the design system is what turned it from blue-leaning to visually purple-violet. The final brand color landed at `#A78BFA` (a soft lavender-violet).

**Where:** `app/globals.css` — `--violet`, `--violet-dark`, `--violet-active`, and all `oklch(...)` accent values.

---

### CSS variable cascade = one-line global theme change
Because every component reads colors from CSS variables (`var(--violet)`, `var(--text-primary)`, etc.) rather than hardcoding hex values, changing a global color only requires updating the variable in `globals.css`. All components that use that variable update automatically — no component files need to be touched.

**Why we used it:** We went through several full-app color changes (blue → violet → lavender, then a contrast lift) during Slice 2 polish. Each one was just a few lines in `globals.css` instead of a grep-and-replace across 5 files. The only hardcoded values that need updating are SVG `stroke` attributes and Tailwind shadow arbitrary values (which can't use CSS variables in their `oklch(...)` inside `shadow-[...]` — a known Tailwind v4 limitation).

**Where:** `app/globals.css` — `:root { --violet: ...; --text-primary: ...; }` etc.

---

### `@utility card-lift` — custom Tailwind utility for card shadows
In Tailwind v4, `@utility` in `globals.css` defines a new utility class you can use anywhere in the app, just like a built-in Tailwind class. Unlike Tailwind's built-in `shadow-sm` (which uses a neutral gray), we defined `card-lift` to use a lavender-tinted shadow (`oklch(0.55 0.08 293 / 0.07)`) that matches the app's purple hue.

**Why we used it:** White cards on a near-white background need a shadow to "lift" off the page and feel tangible. Using a hue-matched shadow (purple tint instead of plain gray) makes the depth feel cohesive rather than generic.

**Where:** `app/globals.css` — `@utility card-lift { box-shadow: ... }`. Applied via `className="... card-lift"` on daily cards (`DailyCard.tsx`) and task card divs in `page.tsx` and `tasks/page.tsx`.

---

### Priority dots vs. accent color
The app has two separate color systems that must never mix: (1) the brand accent (soft lavender `#A78BFA`) used for buttons, checkboxes, active states, and rings; (2) priority indicators (red for high, amber for medium, neutral gray for low). Priority colors use red/amber/gray regardless of the brand theme. This is intentional — they need to communicate urgency, not brand identity.

**Why we learned it:** During accent color changes, there was a risk of accidentally updating priority dot colors to match the brand violet. They are hardcoded OKLCH values that never change: `oklch(0.55 0.20 25)` (red), `oklch(0.70 0.13 76)` (amber), `oklch(0.68 0.01 264)` (gray).

**Where:** `PRIORITY_COLOR` constant in both `app/page.tsx` and `app/tasks/page.tsx`.

---

### Fetching sidebar data on every page
The sidebar's "Today's rhythm" completion ring shows the daily check-in progress (e.g. "3/5 dailies done"). On the Tasks page, that data doesn't come for free — the page only fetches tasks by default. To keep the ring accurate, `tasks/page.tsx` fetches `dailies` count and today's `daily_logs` count alongside the tasks in the same `Promise.all`, and passes the result as `doneCount` and `totalDailies` props to `<Sidebar>`.

**Why we used it:** Without this, the sidebar showed "0/0 dailies done" on every non-Today page. Each page that includes the sidebar needs to supply the ring data.

**Where:** `loadData()` in `app/tasks/page.tsx` — the extra two Supabase queries in `Promise.all`, and `setSidebarDone` / `setSidebarTotal` state vars passed to `<Sidebar>`.

---

### Deterministic color from a hash
When you have many category names (e.g. "Work", "Personal", "Study") and want each one to get a consistent color without storing which color it is, you can hash the string to a number and use `number % palette.length` to pick a color. The same string always produces the same number, so the color is stable.

**Why we used it:** Task categories are freeform text — users type whatever they want. We don't store a color for each category. The `pillColor(cat)` function computes a simple hash of the category name (multiplying char codes by 31, a common string-hashing trick) and picks from 5 color palettes. Same category name → same color, every time, on any device.

**Where:** `pillColor()` helper in `app/tasks/page.tsx`. Used to style category pill badges on task cards.

---

### Separating button color from accent color (`--btn-primary`)
Not all uses of a brand color should be the same shade. There are two roles:
- **Accent / state indicator** — the soft lavender `#A78BFA` tells you something *is* active (nav item selected, checkbox checked, ring filled). These need to be noticeable but not loud.
- **Action button fill** — a button needs enough contrast and visual weight to say "press me." The soft lavender was too pale for this.

Introducing `--btn-primary: #815BEB` (slightly darker, more saturated than `#A78BFA`) gives buttons a clear interactive feel while leaving the lighter lavender for everything else.

**Why we used it:** After switching to lavender, buttons felt weak — the eye didn't naturally want to click them. A dedicated button token lets us tune button contrast independently without touching checkboxes, rings, or nav active states.

**Where:** `app/globals.css` — `--btn-primary: #815BEB`. Used via `bg-[var(--btn-primary)]` on all action buttons in `app/page.tsx` and `app/tasks/page.tsx`. Hover state uses the existing `--violet-dark: #7C5CE8`.

---

## Slice 3: Dailies Management Page

### CRUD operations — Create, Read, Update, Delete
CRUD is the four fundamental things you can do with data stored in a database:
- **Create** — insert a new row (`INSERT`)
- **Read** — fetch rows (`SELECT`)
- **Update** — change an existing row (`UPDATE`)
- **Delete** — remove a row (`DELETE`)

Most features in an app are just CRUD in disguise. The Dailies management page is a pure CRUD interface: the add form creates, the card view reads, the edit form updates, and the trash button deletes.

**Why we used it:** The Today screen only has create (quick-add) and read (see today's dailies). The Dailies page adds the missing pieces: edit (change a name or color after the fact) and delete (remove a daily you no longer want to track).

**Where:** `app/dailies/page.tsx` — `addDaily()` (create), `loadData()` (read), `saveEdit()` (update), `deleteDaily()` (delete). Each maps to a Supabase call: `.insert()`, `.select()`, `.update()`, `.delete()`.

---

### In-place edit state pattern (`editingId`)
Instead of opening a separate modal or navigating to a new page to edit something, you can track which item is being edited with a single piece of state — the id of the item. The list renderer checks `editingId === item.id` and renders either the normal view or the edit form, depending on the match.

**Why we used it:** Editing a daily in-place (the card transforms into a form) feels faster and more fluid than a modal. It also avoids managing open/close modal state separately — `editingId = null` means "nothing is editing," and `editingId = "some-uuid"` means "that card is in edit mode."

**Where:** `app/dailies/page.tsx` — `const [editingId, setEditingId] = useState<string | null>(null)`. Inside the `.map()`, each card checks `if (editingId === daily.id)` and branches to the edit form or the normal card view.

---

### Color picker with `ring` selection indicator
A color picker is just a row of buttons where each button's background is a color value. To show which one is selected, Tailwind's `ring-2 ring-offset-2` utilities add a visible outline ring with a white gap between the ring and the button. The `ring-offset` uses the background of the parent (white card) to create that gap visually — it's implemented as a layered `box-shadow` under the hood.

**Why we used it:** Color swatches are circular and small (30px) so there's no room for a label. The ring makes the selected state obvious without adding text or extra elements. A white checkmark SVG inside the swatch gives a second visual confirmation.

**Where:** `ColorPicker` component in `app/dailies/page.tsx`. Reused in both the add form and the edit form to avoid duplicating the 6-swatch row.

---

### Extracting a sub-component to avoid duplication
When the same chunk of JSX needs to appear in two places in the same file (here: the color picker appears in both the add form and the in-place edit form), you extract it into a small component defined in the same file. You only need a single `function` above the main page component — no separate file required.

**Why we used it:** The `ColorPicker` component with its 6 swatches, label, and selection logic would need to be copy-pasted into both the add form and each card's edit form. One extraction means one place to change if the color palette grows.

**Where:** `ColorPicker` function in `app/dailies/page.tsx`, defined before `DailiesPage`. Takes `value: Accent` and `onChange: (a: Accent) => void` as props — same pattern as a controlled input.

---

### Computing longest streak from log history
The "current streak" only looks backward from today. The "longest streak" requires scanning all historical dates and finding the longest consecutive run — a different algorithm.

The approach: sort all logged dates in chronological order, then walk the array comparing each date to the previous one. If they're exactly 1 day apart, extend the current run; otherwise, reset to 1. Track the maximum seen so far.

**Why we used it:** Showing both "current streak" and "best ever" makes the stats motivating — you can see your personal record even if your current streak has reset.

**Where:** `computeLongestStreak(dates: Set<string>)` helper in `app/dailies/page.tsx`. Takes a `Set<string>` of ISO date strings (e.g. `"2026-06-10"`). ISO strings sort correctly as plain strings because they're zero-padded (YYYY-MM-DD), so `.sort()` on an array of them gives chronological order without a custom comparator.

---

### `import type` — importing only the TypeScript type, not the runtime value
When you only need a TypeScript type from another file (not a function or component), you can write `import type { Foo } from "./bar"`. This tells TypeScript: "I only need Foo at compile time for type-checking. Don't include the module in the JavaScript bundle for this feature."

**Why we used it:** `app/dailies/page.tsx` needs the `Accent` type (to annotate state variables and function parameters) but doesn't use the `DailyCard` component itself. Writing `import type { Accent }` makes the intent explicit and keeps the bundle clean.

**Where:** `app/dailies/page.tsx` — `import type { Accent } from "@/components/DailyCard"`.

---

### Data consistency across pages: one source of truth
When the same data appears on multiple pages (dailies appear on both `/` and `/dailies`), changes made on one page need to also show up on the other. In this app, both pages fetch fresh data from Supabase on mount, so any change is reflected the next time you navigate to that page.

**Why we learned it:** A daily created on the Dailies page with a pink color needed to appear correctly on the Today screen. This only works because both pages read from the same `dailies` table, and the `DailyCard` component on the Today screen had its `Accent` type extended to include `"pink"` and `"cyan"` — and the CSS `.accent-pink` and `.accent-cyan` classes were added to `globals.css`. If any of those three things were missing, pink dailies would render without a color.

**Where:** The `Accent` type lives in `components/DailyCard.tsx` and is imported (via `import type`) by `app/dailies/page.tsx`. The accent CSS classes live in `app/globals.css` and apply globally to any element with the matching class name.

---

## Slice 4: Insights Page

### Read-only derived views — no mutations needed
Some pages only read data and compute summaries — they don't need add/edit/delete handlers, form state, or optimistic updates. The Insights page is entirely derived from `dailies` + `daily_logs`. All the interesting logic (streaks, consistency %, heatmap grid, perfect days) is pure computation run on the client after a single pair of Supabase fetches.

**Why we used it:** Separating read-only views from CRUD pages keeps the code simpler. There's no state management overhead — just `useState` for the data, a single `loadData()`, and pure helper functions for the computations.

**Where:** `app/insights/page.tsx` — no mutation handlers; all state is set once in `loadData()`.

---

### Day-of-week arithmetic: converting JS's Sunday=0 to Monday=0
JavaScript's `Date.getDay()` returns 0 for Sunday, 1 for Monday, …, 6 for Saturday. Most apps (and calendars) want weeks to start on Monday. The conversion is: `(date.getDay() + 6) % 7` — this maps Sun→6, Mon→0, Tue→1, …, Sat→5.

**Why we used it:** The weekly bar chart needs to find "Monday of the current week" to align bars left-to-right Mon→Sun. The heatmap also needs Monday=0 so that row 0 of each column is always Monday. Without this conversion, weeks would start on Sunday and the grid would be off by a day.

**Where:** `getWeekDates()` and `buildHeatmapGrid()` in `app/insights/page.tsx` — `const dayOfWeek = (new Date().getDay() + 6) % 7`.

---

### String comparison for ISO dates
ISO date strings in YYYY-MM-DD format compare correctly as plain strings because they're zero-padded and ordered largest-unit-first. So `"2026-06-15" > "2026-06-10"` is `true`, and `"2026-01-01" < "2026-06-15"` is also `true`. This means you can check if a date is in the future with `date > localDate()` — no `Date` parsing required.

**Why we used it:** In the heatmap, each cell needs to know if it's a future date (to render as empty). Comparing ISO strings directly is simpler and faster than converting to `Date` objects.

**Where:** `buildHeatmapGrid()` in `app/insights/page.tsx` — `const isFuture = date > todayStr`.

---

### Building a grid from date math
A GitHub-style heatmap is a 2D grid where each cell represents a specific calendar date. The trick is computing which date each cell corresponds to, given its column (week number) and row (day of week). Starting from a known anchor date (Monday of the oldest week), you add `col * 7 + row` days to get each cell's date. Using `localDate(daysAgo)` — which accepts negative values (future) via `setDate` — keeps the helper simple.

**Why we used it:** The 10-week × 7-day heatmap has 70 cells, each needing a date. Generating them programmatically with `Array.from({ length: 10 }, (_, col) => Array.from({ length: 7 }, (_, row) => ...))` is far cleaner than hardcoding.

**Where:** `buildHeatmapGrid()` in `app/insights/page.tsx`.

---

### Month label detection with `.slice(-2) === "01"`
To show month labels on the heatmap (e.g. "Jun" above the column where June starts), you need to know when the 1st of a month falls within a given column's dates. Since dates are ISO strings (`YYYY-MM-DD`), checking `date.slice(-2) === "01"` tells you if it's the 1st of a month — no `Date` parsing needed.

**Why we used it:** The heatmap doesn't have fixed-width months and weeks don't align neatly to months. Scanning each week's 7 dates for a "-01" suffix is a simple way to find where to place the label.

**Where:** `monthLabel(week)` helper in `app/insights/page.tsx`.

---

### Bar chart with CSS percentage heights in a flex container
A proportional bar chart can be built entirely with CSS: put each bar in a `flex-col` container, give the container a fixed height, and set the bar's height as `${pct * 100}%`. `flex items-end` ensures bars grow from the bottom up. The track (background) is the full container height; the fill sits at the bottom.

**Why we used it:** No charting library needed — pure CSS handles proportional bars. The today bar uses `var(--btn-primary)` (rich purple), past bars use a muted violet (`oklch(0.70 0.19 293 / 0.55)` — the `/0.55` sets 55% opacity), and future bars show nothing. A minimum height of 5% prevents tiny completions from being invisible.

**Where:** This-week section in `app/insights/page.tsx` — `div` with `flex-1` (grows to fill height), `bg-[#ECEAF8]` track, inner div with `height: \`${Math.max(pct * 100, 5)}%\``.

---

### "Perfect days" — aggregating across all dailies
A "perfect day" is any day where every current daily was checked in. To count them, you look at how many check-ins happened on each date (`logsByDate[date]`), and compare that to `totalDailies`. If the count equals or exceeds `totalDailies`, that was a perfect day. You can also check this using the heatmap's `pct === 1` condition.

**Why we used it:** It's a motivating metric — shows how many days you hit a 100% completion. Even with 5+ dailies, a perfect day is achievable and feels good to see go up.

**Where:** `loadData()` in `app/insights/page.tsx` — iterates the last 30 days with `localDate(i)` and counts where `byDate[dt] >= totalDailiesCount`.

---

### Semantic color coding for stat numbers
Different metrics carry different emotional weight. Using distinct colors for each stat card number — instead of one uniform brand color — lets the user read meaning at a glance before even reading the label. Lavender (brand color) for total check-ins signals "this is your main activity." Amber signals energy/momentum for best streak. Emerald signals achievement for perfect days. Slate (neutral) for active dailies signals "this is just a count, not an accomplishment."

**Why we used it:** A single purple number on all four cards made the stats feel uniform and flat. Color differentiation makes the row scannable — your eye goes to whichever number is biggest or most colorful, which is usually the most motivating one.

**Where:** `app/insights/page.tsx` — stats row, inline `style={{ color }}` on the number `div`. Colors: `#A78BFA` (lavender), `oklch(0.62 0.16 76)` (amber), `oklch(0.55 0.16 165)` (emerald), `oklch(0.48 0.03 264)` (slate).

---

### Three-row bar chart structure (labels / bars / day names)
Instead of floating percentage labels above variable-height bars (which requires absolute positioning and clips at the top), split the chart into three separate horizontal rows: (1) a fixed-height row of percentage labels, (2) a fixed-height row of bar tracks with fills, (3) a fixed-height row of day labels. Each bar column is a `flex-1` div that aligns across all three rows.

**Why we used it:** Floating labels that track bar height look nice in prototypes but are fiddly in CSS — you need absolute positioning, translate offsets, and overflow handling. Three separate rows are simpler: each row aligns itself with `flex justify-center` per column, and there's no absolute positioning at all. The trade-off is that the percentage doesn't visually "sit on top of" the bar, but a fixed-position label above a fixed-position track reads just as clearly.

**Where:** This-week section in `app/insights/page.tsx` — three `div.flex.gap-[5px]` rows stacked vertically: % labels row (mb-[5px]), bars row (h-[84px]), day labels row (mt-[6px]).

---

### `min-w-0` to enforce equal flex columns
In a flex-row container, `flex-1` on each child makes them share available space equally — in theory. In practice, if a child's content has a natural minimum width (e.g. a bar chart with 7 fixed-gap columns, or a list with long daily names), the flex algorithm uses that as a floor and the column refuses to shrink. Adding `min-w-0` overrides the default `min-width: auto` and tells the column it may shrink to zero, allowing the flex algorithm to divide space correctly.

**Why we used it:** The two-column layout (bar chart left, consistency right) was unequal — the bar chart column was wider because the seven bar divs set a minimum content width. Adding `min-w-0` to both columns fixed it to a true 50/50 split.

**Where:** `app/insights/page.tsx` — the `flex-1 min-w-0` classes on both the left and right column `div`s in the two-column section.

---

### Fixed-width name + `flex-1` bar for stretching progress rows
In a progress-bar row with three elements (name · bar · percentage), the bar should fill whatever horizontal space is left after the name and percentage take their share. The pattern is: give the name a fixed `width` (e.g. `w-[72px]`) and `flex-shrink-0` so it never compresses, give the percentage a fixed width too, and give the bar container `flex-1` so it expands to fill the rest.

**Why we used it:** The original consistency bars had a fixed `w-[80px]` bar regardless of the panel width, which left large empty gaps on the right when the panel was wider. Switching the bar to `flex-1` means it always stretches to fill the column — the panel can be any width and the bar fills it correctly.

**Where:** `app/insights/page.tsx` — consistency rows: `<span className="... w-[72px] flex-shrink-0">` for names, `<div className="flex-1 h-[5px] ...">` for bars, `<span className="... w-[26px]">` for percentages.

---

## Slice 5: PWA Setup

### Web App Manifest
A "web app manifest" is a JSON file that tells the browser how to present your app when it's installed on a device. It's what enables "Add to Home Screen" — the browser reads the manifest to know the app's name, icon, background color, and whether to run it in standalone mode (no browser chrome). Without a manifest, the browser won't offer the install prompt.

**Why we used it:** To make Cadence installable as a PWA on Android and iOS. The manifest at `public/manifest.json` sets `display: standalone` so the app opens full-screen without a browser URL bar, like a native app.

**Where:** `public/manifest.json` — linked via `metadata.manifest = "/manifest.json"` in `app/layout.tsx`.

---

### Service Worker
A service worker is a JavaScript file that runs in the background, separate from the page. It intercepts network requests and can cache responses, enabling offline functionality. The browser registers it once via `navigator.serviceWorker.register('/sw.js')`, and from then on it runs even when the page isn't open. A service worker is required (alongside the manifest) for a site to be considered a full PWA.

**Why we used it:** To make Cadence work offline — the service worker caches the app shell so the Today view renders even without a network connection. Also, Chrome and Safari require an active service worker before showing the "Add to Home Screen" prompt.

**Where:** `public/sw.js` — generated automatically during `next build` by `@ducanh2912/next-pwa`. Registered by injected script in the built output.

---

### `@ducanh2912/next-pwa`
This is a Next.js plugin that automates service worker generation. You wrap the Next.js config with `withPWA({ dest: "public", disable: process.env.NODE_ENV === "development" })` and it generates a `sw.js` + `workbox-*.js` in `public/` every time you run `next build`. In development it's disabled (so you don't accidentally see a cached stale page while coding).

**Why we used it:** Writing a service worker from scratch that handles caching strategies, cache versioning, and update logic is complex. This plugin uses Workbox (Google's service worker library) under the hood and generates all that boilerplate automatically from your Next.js page routes.

**Where:** `next.config.ts` — `export default withPWA({...})(baseConfig)`. The generated `public/sw.js` is gitignored since Vercel rebuilds it on each deploy.

---

### Turbopack vs webpack — why `--webpack` was needed
Next.js 16 made Turbopack the default bundler for BOTH dev server and production builds (previously it was only for dev). Turbopack is faster, but it doesn't support webpack plugins. `next-pwa` works by adding a webpack plugin to inject the service worker, which breaks when Turbopack runs the build.

The fix is `"build": "next build --webpack"` in `package.json`. The `--webpack` flag forces the production build to use webpack, making the PWA plugin work. The dev server still uses Turbopack (fast HMR), but since `disable: true` in development, the service worker plugin never runs in dev anyway.

**Why we care:** This is a breaking change in Next.js 16 that silently affected any existing `next-pwa` setup. The error message `"webpack config with no turbopack config"` is what revealed it.

**Where:** `package.json` — `"build": "next build --webpack"`.

---

### Next.js Metadata API: `manifest` and `viewport.themeColor`
Next.js App Router has a typed `Metadata` object you export from `layout.tsx` to set `<head>` tags without writing raw HTML. `metadata.manifest = "/manifest.json"` outputs `<link rel="manifest" href="/manifest.json">`. Theme color is handled separately via a `Viewport` export: `export const viewport: Viewport = { themeColor: "#815BEB" }` outputs `<meta name="theme-color" content="#815BEB">`. Next.js split these into two exports (metadata vs viewport) because viewport/theme-color are visual hints to the browser, not SEO metadata.

**Why we used it:** Clean, typed way to add PWA head tags in App Router — no raw `<head>` JSX needed.

**Where:** `app/layout.tsx` — `export const metadata: Metadata = { manifest: "/manifest.json" }` and `export const viewport: Viewport = { themeColor: "#815BEB" }`.

---

### Mobile UX: sort completed items to the bottom

When users check off items in a list, moving them to the bottom keeps the uncompleted work visible at the top without requiring a separate "done" section. The pattern is a single sort before rendering: `[...arr].sort((a, b) => Number(a.done) - Number(b.done))`. `Number(false) = 0`, `Number(true) = 1`, so unchecked items sort before checked ones. A spread `[...]` creates a copy so the original state array is not mutated.

**Why we used it:** On the Today screen, checking off a daily or task caused it to stay in place — cluttering the top of the list with greyed-out items while pending work hid below. The sort makes the remaining work always visible at the top.

**Where:** `app/page.tsx` — `sortedDailies` and `sortedTasks` derived from state; these are passed to `.map()` instead of the raw arrays.

---

### `isMobile` state — safe window access in a client component

In Next.js, even `'use client'` components are pre-rendered on the server (no `window`). Reading `window.innerWidth` at the top level of a component throws `ReferenceError: window is not defined` on the server. The fix: `const [isMobile, setIsMobile] = useState(false)` starts false (safe for SSR), then a `useEffect` runs only in the browser and sets the real value. Combine with a `resize` listener to keep it in sync.

**Why we used it:** The heatmap compact-weeks calculation and the mobile-only rhythm ring both need to know the actual screen width, which is only available in the browser.

**Where:** `app/insights/page.tsx` — `isMobile` state + `useEffect` that calls `window.innerWidth < 768` and `Math.floor((window.innerWidth - 88) / 18)`.

---

### Responsive `items-start` — why mobile columns shrink to content width

In a `flex-col` container (the default on mobile), `items-start` means `align-items: flex-start` — which makes children shrink horizontally to their content width. On desktop in `flex-row` mode, `items-start` aligns items at the top, which is the desired effect. The fix: change `items-start` to `md:items-start` so it only applies from the tablet breakpoint up. Add `w-full` to both column children so they span the full width when stacked vertically on mobile.

**Why we used it:** The Insights two-column section (bar chart + consistency) had full-width columns on desktop but content-width columns on mobile, leaving a narrow strip instead of spanning the screen. This was the root cause.

**Where:** `app/insights/page.tsx` — the two-column `div` changed from `items-start` to `md:items-start`; both child column divs got `w-full` added.

---

### Compact heatmap with "View full history" toggle

A full 26-week heatmap is 26 × 18px = 468px wide plus labels — too wide for a phone. The solution: calculate how many week columns fit the screen with `Math.floor((window.innerWidth - padding - dayLabels) / cellWidth)`, show only the most recent N weeks by slicing `fullGrid.slice(-N)`, and offer a "View full history" toggle that switches to the full grid. The full history can extend beyond 26 weeks by computing the actual distance from the first ever check-in date.

**Why we used it:** The heatmap was horizontally scrolling on mobile, which felt awkward. Fitting the grid to the screen width and showing a toggle is friendlier — you see recent data immediately, and the full history is one tap away.

**Where:** `app/insights/page.tsx` — `compactWeeks` state, `showFullHeatmap` toggle, `displayWeeks` derived value, `buildHeatmapGrid(numWeeks, ...)` updated to accept a `numWeeks` parameter, "View full history" / "Show less" button below the legend.

---

### Click-outside overlay for dropdown menus

A simple way to close a dropdown when the user clicks anywhere outside it: render a full-screen invisible `div` (`fixed inset-0`) with a lower z-index than the dropdown, and attach an `onClick` that closes the menu. The menu itself has a higher z-index. When the user clicks outside the dropdown, they hit the overlay div; when they click inside the dropdown, the event is intercepted by the dropdown content before it reaches the overlay (event bubbling stops at the dropdown). No `useRef` or `document.addEventListener` needed.

**Why we used it:** The mobile avatar button opens an account menu (Settings / Log out). Tapping anywhere outside needs to dismiss it. The overlay pattern is the simplest implementation — one div, one state setter.

**Where:** `app/page.tsx` — the `mobileMenuOpen` state, the `fixed inset-0 z-40` overlay div, and the dropdown `z-50` panel.

---

### `--btn-primary` (#815BEB) vs `--violet` (#A78BFA) — consistent color roles

The app uses two purple shades with distinct roles:
- `--violet` (`#A78BFA`) — soft lavender for state indicators: hover text, focus borders, active dots. These need to be subtle and not demanding.
- `--btn-primary` (`#815BEB`) — richer, darker purple for filled interactive elements: button backgrounds, checkbox fills, loading spinners, active nav tabs, the ring stroke. These need to read as "interactive / selected."

When these got mixed (some filled elements using the soft lavender), buttons and checkboxes looked washed out. The fix was a grep-and-replace across all pages to ensure filled elements always use `--btn-primary`.

**Why we used it:** Separating the two roles means you can tune button contrast independently without affecting hover states and focus rings. `--violet` stays soft; `--btn-primary` stays assertive.

**Where:** `components/Sidebar.tsx`, `app/page.tsx`, `app/tasks/page.tsx`, `app/dailies/page.tsx`, `app/insights/page.tsx` — all `border-t-[var(--btn-primary)]` spinners, `bg-[var(--btn-primary)]` checkboxes, `text-[var(--btn-primary)]` active nav items.

---

### Mobile rhythm ring — duplicating a sidebar widget inline

On desktop, the sidebar always shows the "Today's rhythm" completion ring. On mobile there's no sidebar — so we add a compact inline version directly in the Today page header area, visible only on mobile (`md:hidden`). The ring uses the same SVG + `CIRC` / `dashOffset` math as the sidebar component; it just gets a smaller physical size (40×40px rendering a 80px-viewBox SVG, which scales it down).

**Why we used it:** The completion percentage and ring are core to the daily feel of the app. Hiding them on mobile would make the mobile experience feel feature-reduced vs desktop.

**Where:** `app/page.tsx` — the `md:hidden` rhythm card block, sharing `CIRC` and `dashOffset` with the loading state and using the same SVG arc formula.

---

### Generating binary PNG files with Node.js built-ins
PNG is a binary format with a specific structure: an 8-byte magic signature, then "chunks" (length + type + data + CRC32 checksum), with an IHDR chunk (image dimensions), an IDAT chunk (zlib-compressed pixel rows), and IEND. You can generate valid PNGs without any npm packages using Node's built-in `zlib.deflateSync()` for compression and a hand-rolled CRC32 function (a standard lookup-table algorithm). Each pixel row starts with a "filter byte" (0 = no filter), then RGB bytes for each pixel.

**Why we used it:** Needed static 192×192 and 512×512 PNG icons for the PWA manifest. Rather than installing an image library (sharp, canvas) just for a one-time icon, a ~60-line Node.js script using only built-ins generates them. The anti-aliased C shape is computed by super-sampling each pixel (4×4 subpixels) and blending purple→white based on how much of the subpixel grid falls inside the arc.

**Where:** `scripts/generate-icons.mjs` — run once with `node scripts/generate-icons.mjs` to write `public/icon-192.png` and `public/icon-512.png`.
