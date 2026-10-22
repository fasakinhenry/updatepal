# updatebase frontend

react 19, vite, typescript, tailwind v4, phosphor icons, pwa. a standalone repo. it talks to the updatebase express backend (separate repo). there is no demo data: every screen reads and writes real data through the api.

## setup
```bash
bun install
cp .env.example .env     # set VITE_API_BASE_URL to your backend, for example http://localhost:4000/api
bun run dev
```
scripts: `bun run dev`, `bun run typecheck`, `bun run build`, `bun run preview`.

## env
only `VITE_` values reach the browser, so never put secrets here. `VITE_API_BASE_URL` (required), `VITE_APP_URL`, `VITE_GOOGLE_CLIENT_ID` (optional, enables google sign in and must match the backend), `VITE_DICEBEAR_BASE_URL` (optional).

## how it works
- the access token is kept in memory only. the refresh token is an httpOnly cookie, so a page reload restores your session through `POST /auth/refresh`. requests retry once automatically after a 401.
- every server call goes through `src/lib/http.ts` and the feature services (`features/*/..-service.ts`). errors become `ApiError` with a code, so screens react to specific cases (for example `email_not_verified`).
- permissions in the ui (`features/org/model.ts`) only hide controls. the backend enforces them.
- ai features (update formatting, profile conversation, organization bio, search keywords) are called through the backend. when ai is unavailable the backend uses rule based fallbacks, and the ui says which one was used.

## structure
`src/app` router and providers, `src/lib` http, env and shared types, `src/components` ui primitives, `src/features/<name>` one folder per feature (landing, auth, onboarding, feed, discover, social, org, shell, legal, ai).

## design
zobo inspired tokens in `src/styles/index.css`. spline sans for headings, sentient for emphasis, manrope for body. light by default with a real dark theme. no gradients. reduced motion is respected. lowercase interface copy.

## deploy (vercel)
import the repo, preset vite, build `bun run build`, output `dist`. `vercel.json` rewrites all paths to `/index.html`. set `VITE_API_BASE_URL` in the project settings. the backend must allow this origin in `CLIENT_ORIGIN`, and both sides must use https so the refresh cookie works across sites.

## features worth knowing about
- messages are end to end encrypted in the browser (`features/messages/e2ee.ts`, web crypto only). it needs https or localhost. people set a messaging passcode, which restores their keys on a new device and cannot be recovered if forgotten.
- tipping and the wallet appear only when the backend reports a payment provider. people choose bachs or paypal in the tip dialog and save a preferred method and a paypal payout email in settings. the ai tip planner (wallet page) proposes a split of a budget across updates you liked, and you approve it before paying.
- `/admin` appears only for the verified email set as `ADMIN_EMAIL` on the backend.
- live pings (new alerts and messages) arrive through server sent events, with slow polling as a backup.
- images upload through the backend (avatar, logo, banner, story and update images).

## tests and build
```bash
bun run typecheck
bun test           # end to end encryption tests
bun run build      # typechecks, then builds with vendor chunk splitting
```

## not built yet
direct posting to social channels (copy and paste is the workflow), encrypted attachments and voice notes, story comments and editing, video, a public (logged out) organization page, automated browser tests.

## seo and rendering
this is a client rendered vite app. public pages are ready for prerendering later, but indexing is not guaranteed. add a 1200x630 `public/og.png` and reference it in `index.html` for share previews.

## checks run
`tsc --noEmit`, the unit tests above and a production build. no browser testing yet, so check layout, dark theme and mobile views yourself.

## git
```bash
git init && git add . && git commit -m "feat: add updatebase frontend"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
```
