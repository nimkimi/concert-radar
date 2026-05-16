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
- Prisma 6 + **Postgres** (Vercel Postgres / Neon in prod, local Postgres or Neon dev branch locally)
- NextAuth v5 with Spotify OAuth + custom AES-GCM encrypted-token adapter
- Vitest (unit + integration with recorded fixtures)
- Vercel Cron · Resend email
- Concert sources: Ticketmaster, Bandsintown (active); Songkick, Billetto (flag-gated, default off)

## Local development

You need a Postgres instance. Easiest is Docker:

```bash
docker run --rm -d --name cr-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=concert_radar postgres:16
```

Then:

```bash
npm install
cp .env.example .env.local   # fill POSTGRES_PRISMA_URL + secrets
npx prisma db push           # syncs schema to your DB
npm run dev                  # http://127.0.0.1:3000
```

For a postgres-on-localhost setup, set both:
```
POSTGRES_PRISMA_URL=postgresql://postgres:dev@localhost:5432/concert_radar
POSTGRES_URL_NON_POOLING=postgresql://postgres:dev@localhost:5432/concert_radar
```

See `.env.example` for the full list of env vars.

## Production deploy (Vercel)

1. `vercel link` (or import the repo via the Vercel dashboard)
2. Project → Storage → **Create Database** → Postgres. Vercel injects `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING` automatically.
3. Project → Settings → Environment Variables, paste in every non-DB secret (`NEXTAUTH_SECRET`, `AUTH_URL`/`NEXTAUTH_URL`, `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET`, `SPOTIFY_*`, `TICKETMASTER_API_KEY`, `BANDSINTOWN_APP_ID`, `RESEND_*`, feature flags).
4. Spotify dashboard → app → add the production callback URL: `https://your-domain.vercel.app/api/auth/callback/spotify`.
5. Push to `main` — Vercel build runs `prisma generate && prisma db push && next build`, then `vercel.json` registers the daily cron at 07:00 UTC.

Cron auth: Vercel automatically sets `Authorization: Bearer ${CRON_SECRET}` on cron requests when `CRON_SECRET` is in env. Our `/api/cron/sync` route validates that header.

## Definition of Done

The MVP DoD checklist lives in `SPEC.md` (Definition of Done section + addendum section 8). Tick items as they complete.
