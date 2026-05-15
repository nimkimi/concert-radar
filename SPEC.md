# Project: Concert Radar

## One-liner

A Spotify-connected concert discovery app that alerts you when artists you love announce shows within your chosen distance — aggregating data from Ticketmaster, Bandsintown, Songkick, and Billetto.

---

## Problem

Music fans miss concerts by artists they follow because show announcements are scattered across Instagram, Spotify, venue websites, and email newsletters. There is no single place to say "tell me when any of my Spotify artists plays within 100km of Bergen." Bandsintown and Songkick cover this partially but individually — combining them with Ticketmaster and Billetto (the dominant Norwegian/Nordic platform) produces far better coverage, especially for smaller venues and touring acts that announce on some platforms but not others.

---

## Target User

**Persona:** Kristoffer, 29, lives in Bergen, listens to 60–80 distinct artists on Spotify. He loves indie rock and electronic music. He found out about a favorite band's Oslo concert three days after it sold out — via a friend's Instagram story. He doesn't follow every artist on social media and can't realistically check five different ticket sites weekly.

---

## MVP Scope

**In scope:**
- Spotify OAuth login — no separate registration, Spotify is the identity provider
- Sync the user's top 50 artists (from Spotify's "top artists" endpoint) and followed artists
- Pull upcoming concerts from Ticketmaster, Bandsintown, Songkick, and Billetto for each tracked artist
- User sets their home city + monitoring radius: 25km / 50km / 100km / Country-wide
- Dashboard of upcoming concerts within radius, sorted by date
- Concert cards: artist photo (from Spotify), venue, city, date, distance from user, source badge, ticket link
- Email notification via Resend when new concerts are found during a daily sync (Vercel Cron)
- Duplicate notification prevention — one email per concert per user, ever
- Artist management — user can exclude specific artists from monitoring
- Manual "sync now" button to force a fresh fetch

**Out of scope (future):**
- Multi-country monitoring (currently Norway-only)
- Radius monitoring for multiple cities
- In-app ticket purchasing or affiliate links
- Calendar sync (iCal / Google Calendar export)
- Social features (share concerts with friends)
- Dice.fm integration (partners-only API — revisit if access is granted)
- Eventim integration (no public API)

---

## Key Screens & Flows

### Landing / Login — `/`

**Purpose:** Welcome screen and Spotify OAuth entry point.
**Contains:**
- App name "Concert Radar" + tagline: "Never miss a concert again."
- Short value prop: 3 bullet points (connect Spotify → set your city → get notified)
- "Connect with Spotify" button — initiates OAuth flow
- No email/password fields; Spotify is the only auth method

**Actions:** Initiate Spotify OAuth

### Dashboard — `/dashboard`

**Purpose:** All upcoming concerts within the user's radius, sorted by date.
**Contains:**
- Header: "X upcoming concerts near [City]" with a radius chip (e.g., "within 100km")
- Date-grouped concert list: each group shows the date as a sticky header, with concert cards beneath
- Each concert card: artist photo as card background (dark gradient overlay), artist name, venue name, city, date + time, distance label, source badge (Ticketmaster / Bandsintown / Songkick / Billetto), "Get Tickets" button
- "Last synced X minutes ago" timestamp + "Sync now" button
- Empty state: "No upcoming concerts found within [radius]. Try increasing your radius in settings."

**Actions:** Click "Get Tickets" (opens external ticket URL), click artist name (opens artist page), sync now

### Artist List — `/dashboard/artists`

**Purpose:** View and manage all tracked artists from Spotify.
**Contains:**
- Grid of artist cards: Spotify cover photo, name, genre tags, "X upcoming shows" count within radius
- Exclude toggle on each artist (excluded artists are greyed out and their concerts are hidden from the dashboard)
- "Re-sync from Spotify" button — refreshes the tracked artist list from the Spotify API

**Actions:** Toggle artist exclusion, re-sync from Spotify

### Concert Detail — `/dashboard/concerts/[id]`

**Purpose:** Full details for a single concert.
**Contains:**
- Artist header: Spotify image + name + genres
- Venue name, full address, city
- Date and time
- Distance from user's location (e.g., "312km away")
- Source platform with logo (Ticketmaster / Bandsintown / Songkick / Billetto)
- "Get Tickets" CTA button (opens ticket URL in new tab)
- "Share" button (copies link or native Web Share API on mobile)

**Actions:** Open ticket URL, share concert

### Settings — `/dashboard/settings`

**Contains:**
- City input with autocomplete (queries Nominatim geocoding API as user types — suggests matching Norwegian cities)
- Radius selector: 25km / 50km / 100km / Country-wide (segmented toggle, not a dropdown)
- Email notifications toggle: on/off
- Email address shown (from Spotify — display only, not editable)
- "Disconnect Spotify & delete account" button (deletes all user data)

**Actions:** Update city, update radius, toggle notifications, delete account

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Database:** Prisma + SQLite
- **Auth:** NextAuth v5 (Spotify OAuth provider — scopes: `user-top-read`, `user-follow-read`, `user-read-email`)
- **Concert APIs:**
  - **Ticketmaster Discovery API** — largest global database; free tier 5,000 req/day; API key from developer.ticketmaster.com; query by artist keyword + country code "NO"
  - **Bandsintown API v3** — artist-based lookup, excellent for matching Spotify artists; free with `app_id` param; docs at help.artists.bandsintown.com
  - **Songkick API** — 6M+ concerts, free API key required at songkick.com/developer; search by artist + location
  - **Billetto API** — Nordic-focused events platform with the best Norwegian venue depth; public API at api.billetto.com; search by keyword
- **Geocoding:** OpenStreetMap Nominatim (free, no key required) — resolves city name to lat/lon on settings save
- **Distance:** Haversine formula implemented inline (no library needed — ~10 lines)
- **Email:** Resend
- **Background jobs:** Vercel Cron Jobs — configured in `vercel.json`, runs daily at 08:00 CET, hits `/api/cron/sync`
- **Deployment:** Vercel

---

## Data Model

### User

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| spotifyId | String | Unique |
| email | String | From Spotify |
| name | String | From Spotify |
| avatarUrl | String? | From Spotify |
| spotifyAccessToken | String | Store encrypted |
| spotifyRefreshToken | String | Store encrypted |
| tokenExpiresAt | DateTime | |
| cityName | String | e.g. "Bergen" |
| latitude | Float | Resolved on city save |
| longitude | Float | Resolved on city save |
| radiusKm | Int | 25, 50, 100, or 9999 (country-wide) |
| notificationsEnabled | Boolean | Default true |
| lastArtistSyncAt | DateTime? | |
| lastConcertSyncAt | DateTime? | |
| createdAt | DateTime | Auto |

### TrackedArtist

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User |
| spotifyArtistId | String | |
| name | String | |
| imageUrl | String? | Spotify artist image |
| genres | String | Comma-separated |
| isExcluded | Boolean | Default false |
| createdAt | DateTime | Auto |

**Unique constraint:** `(userId, spotifyArtistId)`

### Concert

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| externalId | String | ID from source API |
| source | Enum | TICKETMASTER, BANDSINTOWN, SONGKICK, BILLETTO |
| artistName | String | As returned by source API |
| trackedArtistId | String? | FK → TrackedArtist — null if artist not in user's list |
| venueName | String | |
| venueCity | String | |
| venueCountry | String | Default "NO" |
| latitude | Float? | Venue coordinates |
| longitude | Float? | Venue coordinates |
| eventDate | DateTime | |
| ticketUrl | String? | |
| status | Enum | UPCOMING, CANCELLED, POSTPONED |
| createdAt | DateTime | Auto |

**Unique constraint:** `(externalId, source)` — prevents duplicate concerts across daily syncs

### NotificationLog

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| userId | String | FK → User |
| concertId | String | FK → Concert |
| sentAt | DateTime | Auto |

**Unique constraint:** `(userId, concertId)` — one notification per concert per user, ever

**Relationships:**
- User has many TrackedArtists, many NotificationLogs
- TrackedArtist optionally links to Concerts via trackedArtistId
- Concert has many NotificationLogs

---

## Design Direction

- **Aesthetic:** Dark and music-first — this should feel like a native companion to Spotify; dark surfaces, vibrant artist imagery, green accents
- **Color palette:** Background #121212, card surfaces #1E1E1E, Spotify green #1DB954 as the primary accent, white text, subtle grey for secondary info
- **Concert cards:** Artist's Spotify image fills the card background; a dark gradient overlay (bottom-to-top) makes the text readable; feels editorial, not like a list app
- **Typography:** Inter
- **Dark mode:** Dark is the only mode — this is a deliberate design choice matching Spotify's aesthetic
- **Key UI notes:** The dashboard must feel compelling on first load — rich artist images, not a bare table. Distance label ("312km away") should be shown in muted text beneath the venue. Source badges (Ticketmaster, Bandsintown, etc.) should use the platform's brand color. The "Connect with Spotify" button on the landing page must use Spotify's official green and brand font.

---

## Definition of Done (MVP)

- [ ] User can log in with Spotify and grant the required OAuth scopes
- [ ] App fetches and stores the user's top 50 artists from Spotify (`user-top-read`)
- [ ] App fetches and stores the user's followed artists from Spotify (`user-follow-read`)
- [ ] User can set their home city — city name is geocoded to lat/lon via Nominatim
- [ ] User can set monitoring radius (25km / 50km / 100km / Country-wide)
- [ ] App queries Ticketmaster for upcoming Norwegian shows by each tracked artist
- [ ] App queries Bandsintown for upcoming shows by each tracked artist
- [ ] App queries Songkick for upcoming shows by each tracked artist
- [ ] App queries Billetto for upcoming events matching each tracked artist name
- [ ] Concerts are deduped by `(externalId, source)` — no duplicate cards in the dashboard
- [ ] Dashboard displays concerts within the user's radius, sorted by date
- [ ] Distance from user's location is calculated (Haversine) and shown on each card
- [ ] Vercel Cron runs daily, syncs all users' concerts, sends email via Resend for newly found shows
- [ ] NotificationLog prevents the same concert being emailed to the same user twice
- [ ] User can exclude an artist — their concerts disappear from the dashboard
- [ ] "Sync now" button triggers an immediate re-fetch for the current user
- [ ] Settings page saves city + radius changes and re-computes concert distances
- [ ] Spotify access tokens are refreshed automatically when expired
- [ ] No TypeScript errors (`npm run build` passes)

---

## Open Questions

- **Billetto API auth:** Billetto requires API key registration — confirm API key flow before building that integration; if approval is slow, scaffold the integration but leave it behind a feature flag for MVP.
- **Songkick API key:** Songkick requires manual approval of API key requests (they review applications); if rejected, the spec still works without it — Ticketmaster + Bandsintown cover the gap.
- **Spotify token storage:** Storing OAuth tokens in the database requires encryption at rest. Recommendation: use `@auth/prisma-adapter` with NextAuth's built-in session handling so tokens are managed by NextAuth rather than stored raw.
- **Artist matching across APIs:** Ticketmaster and Songkick use free-text artist name search, which can produce false positives (e.g., searching "The 1975" may also return "1975 Anniversary Concert"). Recommendation: normalize artist names and filter by Spotify artist popularity as a confidence signal.
- **Rate limits during initial sync:** A user with 200 tracked artists hitting 4 APIs = potentially 800 API calls at once. Recommendation: queue artist lookups with a small delay (100ms between requests) and cache results for 6 hours per artist.
- **Country-wide radius:** For Norway, "country-wide" should include all Norwegian venues. Should it also include Copenhagen and Stockholm (close to the Norwegian border and commonly visited for concerts)? Recommendation: yes — include SE and DK as secondary countries for country-wide mode.

---

## Addendum (2026-05-15)

This addendum resolves the Open Questions above and fills gaps surfaced during Phase 1 brainstorming. It is binding for the implementation plan.

### 1. Open Questions resolved

- **Billetto + Songkick:** behind feature flags `ENABLE_BILLETTO` and `ENABLE_SONGKICK`, both default `false`. MVP ships with Ticketmaster + Bandsintown only. Adapters are scaffolded but unused unless the flag is on.
- **Country-wide radius:** includes Norway + Sweden + Denmark.
- **Spotify token storage:** NextAuth + `@auth/prisma-adapter` wrapped in a custom adapter that AES-encrypts the `access_token` and `refresh_token` columns on the NextAuth `Account` table using `TOKEN_ENCRYPTION_KEY` from env.
- **Artist matching:** normalize names by lowercasing + stripping diacritics + dropping `the`, `feat.`, and parenthetical suffixes. Use Spotify artist popularity as a confidence signal when matching free-text API results to tracked artists.
- **Rate limits:** 100ms delay between external API calls, 6h per-artist cache.

### 2. Architecture decisions

- **Cross-source dedup.** The dashboard groups concerts by `(normalizedArtist, venueCity, eventDate)`. One card per group with one or more source badges. The ticket CTA uses source priority `TICKETMASTER > BILLETTO > BANDSINTOWN > SONGKICK`.
- **Failed-source resilience.** Each daily sync writes per-source rows to a new `SyncLog` table. On failure, log, skip that source, continue. The email is still sent for concerts found by successful sources.
- **Initial-sync UX.** After Spotify OAuth, the user is redirected straight to the dashboard. A background job runs the first sync. The dashboard shows a "Syncing X / Y artists" banner; concerts appear as they're found.
- **Time zones.** `Concert.eventDate` is stored UTC. `Concert.venueTimezone` (e.g. `Europe/Oslo`) is derived from the venue's country at ingest time. The UI displays times in the venue's local time zone, not the user's.

### 3. Schema deltas

These extend the Data Model section above.

| Table | Change |
|---|---|
| `User` | `+ notificationFrequency` enum `INSTANT \| DAILY_DIGEST`, default `DAILY_DIGEST` |
| `Concert` | `+ venueTimezone` String (IANA TZ, e.g. `Europe/Oslo`) |
| `SyncLog` (new) | `id`, `source` (enum, same as Concert.source), `status` (`OK` \| `FAIL`), `errorMessage?`, `ranAt`, `durationMs`, `concertsFound` Int |

### 4. Operations & security

- **Cron auth.** `/api/cron/sync` checks `Authorization: Bearer ${CRON_SECRET}`. Any other request returns 401.
- **Sync-now rate limit.** Once per 5 minutes per user, enforced via `User.lastConcertSyncAt`. The button shows a countdown when disabled.
- **Account deletion.** Hard-delete the `User`, their `TrackedArtist` rows, and their `NotificationLog` rows. `Concert` rows are retained — they're shared across users and keep external API calls down.
- **New env vars:** `CRON_SECRET`, `TOKEN_ENCRYPTION_KEY`, `ENABLE_SONGKICK=false`, `ENABLE_BILLETTO=false`, `SEED_FROM_FIXTURES` (local dev only).

### 5. Email

- **Default:** daily digest. Sent only if `newConcertsCount > 0` for that user that day. One email with all new concerts grouped.
- **Alternate:** instant per concert, selectable in Settings via `User.notificationFrequency`.
- Both modes write one `NotificationLog` row per `(userId, concertId)` to prevent re-sending.

### 6. Cold-start fallback

If a user's Spotify top + followed artists yields fewer than 5 distinct artists, also seed `TrackedArtist` rows from their saved albums (`user-library-read` scope added).

### 7. Testing

- **Framework:** Vitest.
- **Unit tests** for pure logic: Haversine distance, artist-name normalization, dedup grouping, source-priority selection.
- **Integration tests** for each API adapter, run against recorded JSON fixtures in `__fixtures__/` — no live network in CI.
- **No Playwright / E2E** for MVP.
- **Local dev:** real API keys in `.env.local`. Setting `SEED_FROM_FIXTURES=true` switches adapters to load fixture data instead of hitting live APIs.

### 8. Definition of Done — additions

These are added on top of the existing DoD checklist.

- [ ] Cross-source duplicate concerts collapse to one card with multiple source badges
- [ ] `/api/cron/sync` rejects unauthenticated requests with 401
- [ ] "Sync now" is rate-limited to one call per 5 minutes per user
- [ ] Spotify access and refresh tokens are AES-encrypted at rest
- [ ] User can switch between daily digest and instant emails in Settings
- [ ] Concert times display in the venue's local time zone
- [ ] `SyncLog` rows are written per `(source, run)` and a failed source does not abort the run
- [ ] `ENABLE_BILLETTO` and `ENABLE_SONGKICK` feature flags gate their adapters
- [ ] Initial sync runs in the background; dashboard shows progress while it runs
- [ ] Cold-start fallback seeds saved albums when top + followed artists < 5
