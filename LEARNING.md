# Cadence — Learning Log

A running record of every concept, tool, and pattern introduced in this project — explained simply, organized by the Slice where it first appeared. Add new entries as slices are completed.

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
