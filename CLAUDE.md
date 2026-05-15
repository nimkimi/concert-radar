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
