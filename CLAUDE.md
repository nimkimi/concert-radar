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

## Current state (2026-05-16)

**MVP progress:** 10 of 15 tasks merged. Open PR #25 (Task 10 — sync orchestrator). Tasks 11–14 pending.

See [PLAN.md → Status](./PLAN.md#status-as-of-2026-05-16) for the up-to-date task-by-task breakdown, and [PLAN.md → Post-MVP follow-ups](./PLAN.md#post-mvp-follow-ups) for the tech-debt issues (#26–#37) tracking shortcuts taken during MVP. None block MVP.

**Tests:** 111 passing across 16 files. Run with `npm test`. `npm run build` is expected to be clean on every PR.

**Environment quirks that bit us during #5 (documented for future Claude):**
- Spotify dashboard rejects `http://localhost` callbacks → use `127.0.0.1` everywhere.
- Next.js 16 + Turbopack hard-codes `request.url`'s origin to localhost in dev. Workarounds in `src/lib/auth/nextauth.ts` (`customFetch` rewrite of `redirect_uri` in the token POST body) and `src/app/api/auth/[...nextauth]/route.ts` (Location-header rewrite). Both are no-ops in production. Tracked for removal in [#31](https://github.com/nimkimi/concert-radar/issues/31) when upstream lands fixes.
- `prisma migrate dev` rejects non-interactive shells in some flows — we wrote two SQL migrations by hand (`auth_js_compat`, `email_unique`). Use the Prisma CLI normally; fall back to hand-written SQL only when blocked.

## Tech stack

- Next.js 15 (App Router) · TypeScript strict
- Tailwind CSS · Inter font · dark mode only
- Prisma + SQLite
- NextAuth v5 with Spotify OAuth + custom AES-GCM encrypted-token adapter
- Vitest (unit + integration with recorded fixtures)
- Vercel Cron · Resend email
- Concert sources: Ticketmaster, Bandsintown (active); Songkick, Billetto (flag-gated, default off)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in API keys
npx prisma migrate dev
npm run dev
```

See `PLAN.md` Task 1 for the full env var list.

## Definition of Done

The MVP DoD checklist lives in `SPEC.md` (Definition of Done section + addendum section 8). Tick items as they complete.
