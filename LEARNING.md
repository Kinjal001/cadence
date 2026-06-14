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

### Responsive layout with Tailwind breakpoints
Tailwind has responsive prefixes: `md:` applies a class only at `768px` and wider, `lg:` at `1024px`, etc. On mobile (below `md`), classes without a prefix apply. This lets you write mobile-first styles and progressively override them for larger screens.

For example: `flex-col md:flex-row` means "stack vertically on mobile, side-by-side from md up."

**Why we used it:** On desktop the sidebar is always visible; on mobile it would take too much space, so we hide it (`hidden md:flex`) and show a fixed bottom navigation bar instead (`flex md:hidden`).

**Where:** `app/page.tsx` — the sidebar wrapper div (`hidden md:flex`), the bottom nav (`md:hidden`), and the two-column body (`flex-col md:flex-row`).
