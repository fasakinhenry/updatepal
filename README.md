# updatebase frontend

react 19, vite, typescript, tailwind v4, phosphor icons, pwa. standalone repo, backend lives elsewhere.

## setup
```bash
bun install
cp .env.example .env
bun run dev
```
## scripts
`bun run dev`, `bun run typecheck`, `bun run build`, `bun run preview`

## structure
`src/app` router, `src/styles` tokens and fonts, `src/components/ui` primitives, `src/features/<name>` one folder per feature (landing is first).

## design
zobo-inspired tokens live in `src/styles/index.css` (`@theme`). fonts: spline sans (headings), sentient (emphasis), manrope (body). no gradients anywhere.

## env
only `VITE_` values reach the browser. never put secrets or ai keys here. see `.env.example`.

## deploy (vercel)
import the repo, framework preset vite, build command `bun run build`, output `dist`. add a rewrite of all paths to `/index.html` for client routing.

## notes
add a 1200x630 png at `public/og.png` and reference it in `index.html` for social previews.

## mock mode and backend contract
`src/lib/mock.ts` and `src/features/org/model.ts` hold demo data and adapters. swap them for http calls to `VITE_API_BASE_URL` without changing screens. permissions in the ui (`can()`) only hide controls, the backend must enforce them. wallet numbers, ai formatting, numbering, invites, uploads, scheduling and messaging are mocked.

## git
```bash
git init && git add . && git commit -m "feat: add updatebase frontend"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
```
## ssr and seo
this is a client rendered vite app. public pages are ready for prerendering later, but indexing is not guaranteed.

## status
working in the browser (local state, demo data): landing, auth screens, onboarding, feed with optimistic reactions, discover, stories and composer, bookmarks, profile tabs, org creation, org shell, publishing workspace with the rule based formatter, documents (metadata), calendar, members and invitations, analytics, feedback, wallet and tip previews, settings, legal pages and cookie preferences, dark theme, offline banner.

mocked, needs the backend: authentication and google linking, ai formatting, update numbering, invitations and tokens, file storage and signed urls, scheduling and channel publishing, wallet and tipping, messaging and encryption, permissions enforcement.

not built yet: story video, a shared drawer and tooltip component, a mutual connections model, formal popularity sorting.

checks run on this code: `tsc --noEmit` only. no production build and no browser testing yet.
