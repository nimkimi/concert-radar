# Concert Radar — Discovery Features Plan

> **Status:** Draft for manual iteration. Not yet scheduled for implementation.
> Covers: Taste Profile · Recommendations · Discovery Feed · Shareable Card · AI integration.

## Context

Spotify locked down its API: extended/public quota now requires a registered org with 250k+ MAU — unattainable for Concert Radar. The team is migrating the data source away from per-user Spotify OAuth to a **"paste a public Spotify playlist URL"** model (read via Spotify client-credentials, no per-user allowlist). That migration is a **separate prerequisite and out of scope for this plan.**

The new flow loses the frictionless "just log in, we handle the rest" UX. To make the app worth the extra step, we add taste-driven discovery features. Spotify also deprecated Recommendations / Related-Artists / Audio-Features for new apps (Nov 2024), so the recommendation engine must come from **outside Spotify**.

**Outcome:** from a pasted playlist, build a music taste profile, recommend artists the user doesn't track yet (multi-source), surface those recommended artists *when they have a concert in radius* (the key hook), make the profile shareable, and use the Claude API to make all of it feel human.

### Prerequisite dependency (not built here)

The playlist-ingest migration must populate four new `TrackedArtist` fields this plan adds: `popularity`, `followerCount`, `topReleaseYear`, `firstReleaseYear`. Without them, obscurity/era scoring degrades. Flag this when scoping the migration.

### Decisions locked

- **Mobile nav:** 4-tab bar (Dashboard / Artists / Discover / Settings); Taste profile reached from inside Discover + dashboard header — no 5th tab.
- **Share card:** opaque random share slug, not `userId`; user opts in by generating it.
- **AI compute:** cron-warmed with 24h cache. Cost analysis required before merge (see end).

### Repository strategy

This work will **not** be done in the current `concert-radar` repo. That repo stays frozen as-is — it is the finished, Spotify-OAuth MVP and serves as a **portfolio project** (clean history, working deploy, self-contained story).

Instead, **fork the repo** into a new project (e.g. `concert-radar-discovery` or `concert-radar-v3`) and do the playlist-ingest migration + this discovery work there. Implications:

- The current repo's README/CLAUDE.md/PLAN.md remain accurate for what it is; no churn from an architecture pivot.
- The fork starts from the current `main` and immediately diverges — there is no intent to merge back, so it is a true fork, not a branch.
- Update `nimkimi/project-ideas/PROJECTS.md`: keep the existing Concert Radar entry, add the fork as a separate, related project so both can be shown.
- All slice file paths below are relative to the **fork's** root, not this repo.
- The playlist-ingest migration (the out-of-scope prerequisite) also happens in the fork — this repo never gets the playlist code.
- Decide before forking: GitHub "Fork" (keeps a visible upstream link) vs. a fresh repo seeded from a clone (independent history). A fresh repo is cleaner for portfolio framing since the two projects are presented as peers, not parent/child.

---

## Architecture

- **New state:** `TasteProfile` (1/user), `ArtistRecommendation` (cached candidate set/user), 4 new `TrackedArtist` fields. JSON stored as `String` — SQLite/libsql has no JSON column.
- **Taste profile:** pure logic over the user's `TrackedArtist` rows.
- **Recommendations:** multi-source aggregator (Last.fm + ListenBrainz + Spotify genre search) behind an on-demand API route and the daily cron — not on artist sync (keeps sync fast).
- **AI layer:** single `src/lib/ai/` module wrapping `@anthropic-ai/sdk` with prompt caching; every call has a deterministic fallback so the feature works fully with `ANTHROPIC_API_KEY` unset.
- **Discovery feed:** reuses `Concert` rows + `groupForDashboard` + radius filter from `src/lib/sync.ts`.

Project convention: PR-sized vertical slices, one GitHub issue per slice, branch `issue-N-slug`. TDD required for pure logic and API-response parsing; UI slices invoke the `frontend-design` skill and port from `concert-radar-redesign/v2`. Tests are Vitest with recorded fixtures in `__fixtures__/` — no live network in CI.

---

## Slice 1 — Schema additions

**Type:** schema. No TDD. Unblocks everything.

Files: `prisma/schema.prisma`; new hand-written `prisma/migrations/<ts>_discovery_features/migration.sql` (Prisma `migrate dev` is flaky here per CLAUDE.md; pipe SQL to Turso via `turso db shell`); `.env.example`, `.env.local`.

`TrackedArtist` += `popularity Int?`, `followerCount Int?`, `topReleaseYear Int?`, `firstReleaseYear Int?` (populated by the prereq migration).

New models:
- **`TasteProfile`** — `userId @unique`, `genreHistogram String "{}"`, `obscurityScore Float`, `eraLean Int?`, `eraSpread Float`, `diversity Float`, `vibeLabel String`, `vibeDescription String`, `profileHash String` (for AI-skip), `shareSlug String? @unique`, `computedAt DateTime`.
- **`ArtistRecommendation`** — `userId`, `candidateName`, `spotifyArtistId String?`, `imageUrl String?`, `genres String`, `score Float`, `sourceBreakdown String "{}"`, `seedArtistIds String "[]"`, `whyText String`, `computedAt DateTime`, `@@unique([userId, candidateName])`.

Add `tasteProfile TasteProfile?` and `recommendations ArtistRecommendation[]` relations on `User`.

## Slice 2 — Taste-profile computation (pure logic)

**Type:** pure. **TDD required.**

Files: `src/lib/taste/profile.ts`, `tests/taste-profile.test.ts`, fixture `__fixtures__/taste/sample-artists.json`.

```ts
export function computeTasteProfile(input: TasteInput): TasteProfileResult;
// genreHistogram (normalized weights), obscurityScore = 100 - avg(popularity ?? 50),
// eraLean (weighted-median release year), eraSpread (stddev), diversity (normalized
// Shannon entropy), topGenres[]. Handles empty input / all-null popularity.
```

`genres` is the existing comma-separated string on `TrackedArtist` — split, lowercase, count. `vibeLabel`/`vibeDescription` come from the AI layer, not here — this module stays deterministic and offline.

## Slice 3 — Recommendation source adapters

**Type:** parsing pure (TDD); fetch wrappers network.

Files: `src/lib/reco/types.ts`; `src/lib/reco/sources/{lastfm,listenbrainz,spotify-genre}.ts`; tests per source; fixtures under `__fixtures__/reco/`.

`RecoSource` interface mirrors `src/lib/sources/types.ts`. Each source: a pure `parse<X>Response(json): RecoCandidate[]` (TDD target) + a thin fetch wrapper. Spotify-genre source reuses the client-credentials token helper added by the playlist-ingest prereq — do not duplicate. Every source returns `[]` on missing key / non-200 — never throws past the wrapper, so one dead source can't kill aggregation. Rate limits: Last.fm inter-call delay like `sync.ts`; ListenBrainz needs a `User-Agent`.

## Slice 4 — Multi-source aggregator + engine

**Type:** scoring pure (TDD); orchestration network.

Files: `src/lib/reco/aggregate.ts` (pure), `src/lib/reco/engine.ts` (orchestration), `src/lib/reco/cache.ts` (TTL `Map`, mirrors `sync.ts` `fetchCache`), `tests/reco-aggregate.test.ts`.

```ts
export function aggregateCandidates(contributions, excludeNames: Set<string>): ScoredCandidate[];
// score = Σ (sourceWeight × rawWeight), boosted ×(1 + 0.15×(distinctSeeds-1)).
// Dedup by normalizeArtistName (reuse src/lib/normalize.ts). Exclude already-tracked. Cap ~60.
```

`engine.generateRecommendations(prisma, userId, opts)`: load non-excluded `TrackedArtist` seeds → fan out across sources × seeds (with delay) → `aggregateCandidates` → resolve `spotifyArtistId`/`imageUrl` for top ~30 via Spotify search (rate-limit guard) → upsert `ArtistRecommendation` rows (loop upserts — no `createMany skipDuplicates` on libsql). Skip recompute if `computedAt` < 24h unless `force`.

## Slice 5 — AI layer (Anthropic SDK, prompt caching, graceful degradation)

**Type:** module + network. TDD for pure prompt builders + fallbacks; live call mocked.

Add dep `@anthropic-ai/sdk`. Env: `ANTHROPIC_API_KEY`, optional `ANTHROPIC_MODEL` (default `claude-haiku-4-5`). **Invoke the `claude-api` skill** during implementation for caching + current model IDs.

Files: `src/lib/ai/client.ts` (lazy client, `null` if no key), `vibe.ts`, `why.ts`, `curate.ts`, `prompts.ts` (pure, TDD), `fallbacks.ts` (pure, TDD); tests for prompts + fallbacks.

- `generateVibe(profile)` → `{ label, description }`. Called only when `profileHash` changed.
- `generateWhyText(...)` → **one batched call** for all candidates (JSON list in/out) so the cached system prefix is reused.
- `curateFeed(items, profile)` → reordered feed.

**Prompt caching:** stable system block (instructions + profile description) marked `cache_control: ephemeral`; only the user turn varies. **Graceful degradation (mandatory):** every export wraps the call in try/catch and returns the deterministic fallback on missing key / error — vibe label from top genres + obscurity bucket, why-text from a template, curate = score-order passthrough.

## Slice 6 — Discovery feed query

**Type:** matching pure (TDD).

Files: `src/lib/reco/discovery.ts`, `tests/discovery-feed.test.ts`.

`getDiscoveryFeed(prisma, userId, opts)`: load `ArtistRecommendation` rows → match `candidateName` to `Concert.artistName` via `normalizeArtistName` → apply the **existing radius filter from `sync.ts`** (export/move it to a shared module — do not copy) → `groupForDashboard` → sort by recommendation `score` → optional `curateFeed` pass when AI enabled. A recommended artist surfaces **only if** they have an upcoming in-radius concert.

## Slice 7 — API routes + cron wiring

**Type:** route glue.

Files: `src/app/api/recommendations/refresh/route.ts` (POST, auth'd), `src/app/api/taste-profile/route.ts` (GET cached / POST recompute). Helper `recomputeAndStoreProfile(prisma, userId)` runs Slice 2 + Slice 5 vibe and upserts `TasteProfile`.

Modify `src/app/api/cron/sync/route.ts`: after `runSyncForUser`, call `generateRecommendations` + `recomputeAndStoreProfile`, wrapped in its own try/catch so a reco/AI failure never aborts the concert/email pipeline. Routes guard on `auth()`; refresh respects 24h cache unless `?force=1`.

## Slice 8 — UI: Discover + Taste pages, nav

**Type:** UI. Invoke `frontend-design`; port from `concert-radar-redesign/v2` + `v2-mobile`; read tokens from `src/app/globals.css`. No TDD.

Files created: `src/app/dashboard/discover/page.tsx`, `src/app/dashboard/taste/page.tsx`, `src/components/TasteFingerprint.tsx`, `RecommendationCard.tsx`, `DiscoveryFeedList.tsx`, plus empty/loading states ("no recommendations yet — tap refresh").

Files modified: `src/components/AppNav.tsx` (add Discover + Taste links); `src/components/MobileTabBar.tsx` (**4 tabs**: Dashboard / Artists / Discover / Settings — change `grid-cols-3` → `grid-cols-4`; Taste is **not** a tab — link to it from the Discover page header + dashboard header).

Reuse `ShareButton`, `SourceBadge`, `ConcertCard`.

## Slice 9 — Shareable taste card (OG ImageResponse)

**Type:** route + UI. Light TDD on the pure layout-data helper.

**Approach:** Next.js `ImageResponse` OG-image route (not client canvas) — server-rendered, real shareable URL that unfurls on social.

Files: `src/app/api/taste-card/[slug]/route.ts` (`ImageResponse`, 1200×630, reads `TasteProfile` by `shareSlug`); `src/app/share/taste/[slug]/page.tsx` (public landing page with OG meta + app CTA); `src/lib/taste/card-data.ts` (pure) + `tests/taste-card-data.test.ts`. Modify `src/app/dashboard/taste/page.tsx` to add a "Share my taste card" button.

**Privacy:** card is keyed by an **opaque random `shareSlug`** generated on demand, never `userId` — profiles are not enumerable. User opts in by generating the slug.

---

## Cross-cutting

**Env vars:** `ANTHROPIC_API_KEY` (absent → AI fallbacks), `ANTHROPIC_MODEL` (optional), `LASTFM_API_KEY` (absent → Last.fm source disabled). ListenBrainz/MusicBrainz need no key. Document in `.env.example`, CLAUDE.md deploy section, Vercel env.

**Rate limits:** Last.fm ~5 req/s inter-seed delay, `[]` on 429; ListenBrainz polite `User-Agent` ~1 req/s; Spotify search bounded to top ~30 candidates/refresh; Anthropic — batched "why" call + one curate call + prompt caching. All multi-API work confined to cron + explicit user refresh, never page render.

### AI cost analysis (do before merge)

Per active user per 24h, AI fires at most: 1 vibe call (**only when `profileHash` changed** — rare after first run), 1 batched why call (~30 candidates), 1 curate call. Rough order: ~6k input + ~3.5k output tokens/user/day on `claude-haiku-4-5`, with the cached system prefix (~1–2k tokens) billed at ~0.1× on cache hits. Expected well under $0.01/user/day — but **verify current Haiku token rates and measure real token counts at implementation time** before enabling the cron path. Cost controls to implement: (1) skip cron AI for users with no playlist activity in 30 days; (2) `profileHash` gate on the vibe call; (3) the 24h cache on recommendations; (4) a kill-switch env var to disable cron AI and fall back to deterministic text if cost runs high.

### Verification

- Unit (Vitest, fixtures, no live network): taste-profile math, each source parser, aggregator scoring, discovery matching, AI prompt builders + fallbacks, card-data.
- Integration: cron route with mocked sources; refresh route with mocked AI client.
- Manual (`npm run dev`): refresh recommendations; confirm discovery feed shows only in-radius concerts; **confirm the app works fully with `ANTHROPIC_API_KEY` unset** (fallback text everywhere); verify OG image renders at `/api/taste-card/[slug]`; verify mobile bottom bar is 4 tabs and Taste is reachable.
- `npm run build` clean; new migration piped to Turso via `turso db shell` (Prisma CLI rejects `libsql://`).

### Critical files to reference

- `prisma/schema.prisma`
- `src/lib/sync.ts` (radius filter, `groupForDashboard`, `fetchCache`, inter-call delay)
- `src/lib/dedup.ts` (`DashboardConcert`, grouping)
- `src/lib/normalize.ts` (`normalizeArtistName`)
- `src/lib/sources/types.ts` (adapter interface convention)
- `src/app/api/cron/sync/route.ts`
- `src/components/{AppNav,MobileTabBar,ShareButton}.tsx`

### Suggested sequencing

Slices 1→2→3→4→5→6→7→8→9 are dependency-ordered. 1 unblocks all; 2+3 can run in parallel; 5 depends on 2+4; 6 on 4+5; 7 on 2/4/5/6; 8 on 7; 9 on 7+8.
