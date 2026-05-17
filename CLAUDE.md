@AGENTS.md

# Concert Radar

A Spotify-connected concert discovery app that alerts users when artists they love announce shows within their chosen distance. Aggregates Ticketmaster + Bandsintown (with Songkick + Billetto behind feature flags).

## Source of truth

- **Spec (canonical):** [`nimkimi/project-ideas/projects/concert-radar.md`](https://github.com/nimkimi/project-ideas/blob/main/projects/concert-radar.md) including the 2026-05-15 Addendum.
- **Spec (mirror):** [`SPEC.md`](./SPEC.md) in this repo.
- **Plan:** [`PLAN.md`](./PLAN.md) — 15 PR-sized vertical-slice tasks (1, 2, 3, 4, 4.5, 5–14). Each task maps to one GitHub issue.
- **Visual design:** [`design/`](./design/) — static HTML mockups + `design-tokens.md`. Open `design/index.html` to preview. Source of truth lives in `nimkimi/project-ideas/projects/concert-radar-design/`.

If `SPEC.md` and the project-ideas copy ever diverge, project-ideas wins.

## Build process

This project was bootstrapped using `nimkimi/project-ideas/BUILD_PROCESS.md` and is currently in **Phase 5 (execute issues)**. Work proceeds one issue at a time, branch `issue-N-<slug>`, one PR per issue.

**TDD policy:** required for pure logic, crypto, and API response parsing. Optional for scaffolding and UI when Claude is ≥95% confident — announce `Skipping TDD for #N because <reason>` before proceeding.

**UI policy:** for UI-flavored issues, invoke `frontend-design` and faithfully port the corresponding mockup in `design/` into Next.js components. `design/design-tokens.md` is the canonical spec for colors, type scale, spacing, motion, and Tailwind theme extension.

**Verification before merge:** invoke `superpowers:verification-before-completion`.

## Current state — MVP complete (2026-05-16)

All 15 plan tasks merged to `main`. 29 of 30 DoD checkboxes ticked in [SPEC.md](./SPEC.md); the one open item ([#44](https://github.com/nimkimi/concert-radar/issues/44)) is cosmetic dashboard polish.

See [PLAN.md → Status](./PLAN.md#status--mvp-complete-2026-05-16) for the task-by-task breakdown, and [PLAN.md → Post-MVP follow-ups](./PLAN.md#post-mvp-follow-ups) for the 14 tech-debt issues tracking MVP shortcuts (each has the reason it was acceptable + a suggested fix).

**Tests:** 123 passing across 17 files. Run with `npm test`. `npm run build` clean.

**Environment quirks that bit us during #5 (documented for future Claude):**
- Spotify dashboard rejects `http://localhost` callbacks → use `127.0.0.1` everywhere.
- Next.js 16 + Turbopack hard-codes `request.url`'s origin to localhost in dev. Workarounds in `src/lib/auth/nextauth.ts` (`customFetch` rewrite of `redirect_uri` in the token POST body) and `src/app/api/auth/[...nextauth]/route.ts` (Location-header rewrite). Both are no-ops in production. Tracked for removal in [#31](https://github.com/nimkimi/concert-radar/issues/31) when upstream lands fixes.
- `prisma migrate dev` rejects non-interactive shells in some flows — we wrote two SQL migrations by hand (`auth_js_compat`, `email_unique`). Use the Prisma CLI normally; fall back to hand-written SQL only when blocked.

## Tech stack

- Next.js 16 (App Router) · TypeScript strict
- Tailwind CSS v4 · Inter font · dark mode only
- Prisma 6 + SQLite locally / **Turso (libsql)** in prod via the `@prisma/adapter-libsql` driver adapter — same schema dialect, runtime swap in `src/lib/db.ts`
- NextAuth v5 with Spotify OAuth + custom AES-GCM encrypted-token adapter
- Vitest (unit + integration with recorded fixtures)
- Vercel Cron · Resend email
- Concert sources: Ticketmaster, Bandsintown (active); Songkick, Billetto (flag-gated, default off)

## Local development

```bash
npm install
cp .env.example .env.local   # fill API keys; leave TURSO_* blank for local
npx prisma migrate dev       # creates ./dev.db
npm run dev                  # http://127.0.0.1:3000
```

When `TURSO_DATABASE_URL` is unset (the default for `.env.local`), Prisma uses the SQLite file driver against `DATABASE_URL=file:./dev.db`. When it IS set (production), `src/lib/db.ts` instantiates Prisma with the libsql driver adapter pointed at Turso.

## Production deploy (Vercel + Turso)

1. **Install the Turso CLI:** `brew install tursodatabase/tap/turso` (or per their install docs), then `turso auth login`.
2. **Create the database** (pick a region close to your users):
   ```bash
   turso db create concert-radar --location ams   # ams = Amsterdam, close to NO/SE/DK
   turso db show concert-radar --url              # copy → TURSO_DATABASE_URL
   turso db tokens create concert-radar           # copy → TURSO_AUTH_TOKEN
   ```
3. **Push the schema to Turso once:**
   ```bash
   DATABASE_URL="libsql://<your-db>.turso.io?authToken=<token>" \
     npm run turso:push
   ```
   (Prisma's `db push` needs a single connection string. After this, the app uses the driver adapter and `DATABASE_URL` is ignored in prod.)
4. **Vercel:** import the repo, then **Settings → Environment Variables**:
   - `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` (from step 2)
   - `NEXTAUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`
   - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
   - `TICKETMASTER_API_KEY`, `BANDSINTOWN_APP_ID`
   - `RESEND_API_KEY`, `RESEND_FROM`
   - `ENABLE_SONGKICK=false`, `ENABLE_BILLETTO=false`
5. **Spotify dashboard** → app → add the production callback URL: `https://your-domain.vercel.app/api/auth/callback/spotify`.
6. **Push to `main`** — Vercel runs `prisma generate && next build` and registers the daily cron from `vercel.json`.

Cron auth: Vercel sets `Authorization: Bearer ${CRON_SECRET}` on scheduled requests when `CRON_SECRET` is in env. Our `/api/cron/sync` validates that header.

### Why this DB shape?
SQLite locally → libsql in prod is a deliberate trade-off: zero local-dev setup, tiny in-process driver, generous Turso free tier (9 GB storage, 1B reads/mo, 25M writes/mo). Costs: no `createMany({ skipDuplicates: true })` ([#42](https://github.com/nimkimi/concert-radar/issues/42)), weaker full-text search than Postgres, narrower vendor ecosystem. For our write-light, single-region workload it's a comfortable fit.

## Definition of Done

The MVP DoD checklist lives in `SPEC.md` (Definition of Done section + addendum section 8). Tick items as they complete.
