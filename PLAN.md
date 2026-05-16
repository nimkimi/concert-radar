# Concert Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. TDD is per-task: tasks marked **TDD-required** must follow tests-first; tasks marked **TDD-optional** may skip TDD if Claude is ≥95% confident, announcing the skip per `BUILD_PROCESS.md`.

**Goal:** Build the MVP of Concert Radar: a Spotify-connected web app that aggregates upcoming concerts for the user's tracked artists across Ticketmaster + Bandsintown (with Songkick/Billetto behind feature flags), shows them on a dashboard within a user-set radius, and emails the user when new shows appear.

**Architecture:** Next.js 15 App Router app, SQLite via Prisma. NextAuth v5 handles Spotify OAuth with a custom adapter that AES-encrypts tokens at rest. Concert APIs are abstracted behind a shared `SourceAdapter` interface; each adapter has unit-tested logic and fixture-backed integration tests. A daily Vercel Cron job syncs all users, writes per-source `SyncLog` rows, and triggers Resend emails (daily digest or instant per user setting). Dashboard deduplicates cross-source duplicates by `(normalizedArtist, venueCity, eventDate)`.

**Tech Stack:** Next.js 15 (App Router) · Tailwind CSS · Prisma + SQLite · NextAuth v5 · Vitest · Vercel Cron · Resend · OpenStreetMap Nominatim · TypeScript strict

**Source of truth for requirements:** `projects/concert-radar.md` including the 2026-05-15 Addendum.

**Each task = one GitHub issue = one PR.** Tasks are ordered; later tasks depend on earlier ones unless explicitly marked independent.

---

## Status (as of 2026-05-16)

**Merged to `main`:** Tasks 1, 2, 3, 4, 4.5, 5, 6, 7, 8, 9 (10 of 15).
**Open PR:** Task 10 (sync orchestrator + dedup) — PR [#25](https://github.com/nimkimi/concert-radar/pull/25), 111/111 tests passing, awaiting review.
**Not started:** Tasks 11, 12, 13, 14.

Total tests in suite: **111 passing.** `npm run build` clean.

Next up after #10 merges: **#11 Dashboard** (first UI-flavored task since #6 — invokes `frontend-design` to port `design/dashboard.html`).

See [Post-MVP follow-ups](#post-mvp-follow-ups) at the bottom for tech-debt issues filed during MVP work — none block MVP.

---

## File structure

```
concert-radar/
├── prisma/
│   └── schema.prisma                 # all tables
├── src/
│   ├── app/
│   │   ├── layout.tsx                # root layout, dark theme, Inter
│   │   ├── page.tsx                  # landing / "Connect with Spotify"
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── cron/sync/route.ts    # protected by CRON_SECRET
│   │   │   └── sync-now/route.ts     # per-user, rate-limited
│   │   └── dashboard/
│   │       ├── layout.tsx            # auth-gated, header w/ city + sync
│   │       ├── page.tsx              # main concert list
│   │       ├── artists/page.tsx
│   │       ├── concerts/[id]/page.tsx
│   │       └── settings/page.tsx
│   ├── components/                   # ConcertCard, ArtistCard, SourceBadge, etc.
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── nextauth.ts           # NextAuth config
│   │   │   └── encrypted-adapter.ts  # custom adapter wrapping prisma-adapter
│   │   ├── crypto.ts                 # AES-GCM helpers
│   │   ├── db.ts                     # Prisma singleton
│   │   ├── sources/
│   │   │   ├── types.ts              # SourceAdapter interface, ConcertHit type
│   │   │   ├── ticketmaster.ts
│   │   │   ├── bandsintown.ts
│   │   │   ├── songkick.ts           # behind ENABLE_SONGKICK
│   │   │   ├── billetto.ts           # behind ENABLE_BILLETTO
│   │   │   └── registry.ts           # returns active adapters based on flags
│   │   ├── spotify.ts                # client wrappers
│   │   ├── geo.ts                    # Haversine, country-to-tz, Nominatim
│   │   ├── normalize.ts              # artist name normalization
│   │   ├── dedup.ts                  # cross-source grouping
│   │   ├── sync.ts                   # orchestrator used by cron + sync-now
│   │   └── email.ts                  # Resend client + digest + instant
│   └── env.ts                        # zod-validated env loader
├── __fixtures__/
│   ├── ticketmaster/                 # recorded JSON for integration tests
│   └── bandsintown/
├── tests/
│   ├── unit/                         # pure logic
│   └── integration/                  # adapters w/ fixtures
├── vercel.json                       # cron schedule
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Task 1: Repo scaffold

**Goal:** A bootable Next.js 15 + Tailwind + Vitest + Prisma project with strict TypeScript and a dark base layout.

**TDD:** optional (pure scaffolding).

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `prisma/schema.prisma`, `.env.example`, `src/env.ts`, `src/lib/db.ts`, `.gitignore`, `README.md`

**Steps:**

- [ ] **1.** `npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"` then accept defaults.
- [ ] **2.** Install runtime deps:
  ```
  npm i prisma @prisma/client next-auth@beta @auth/prisma-adapter zod resend
  npm i -D vitest @vitest/ui @types/node
  ```
- [ ] **3.** `npx prisma init --datasource-provider sqlite` then commit the generated `prisma/schema.prisma` shell.
- [ ] **4.** Replace `src/app/layout.tsx` with a dark-mode root layout that uses Inter and applies bg `#121212`, text white. Set `<html lang="en" className="dark">`.
- [ ] **5.** Replace `src/app/page.tsx` with a placeholder landing page (real one comes in Task 3).
- [ ] **6.** Create `src/env.ts`:
  ```ts
  import { z } from "zod";
  const schema = z.object({
    DATABASE_URL: z.string(),
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().url(),
    SPOTIFY_CLIENT_ID: z.string(),
    SPOTIFY_CLIENT_SECRET: z.string(),
    TOKEN_ENCRYPTION_KEY: z.string().length(64), // hex of 32 bytes
    CRON_SECRET: z.string().min(16),
    TICKETMASTER_API_KEY: z.string(),
    BANDSINTOWN_APP_ID: z.string(),
    SONGKICK_API_KEY: z.string().optional(),
    BILLETTO_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string(),
    RESEND_FROM: z.string().email(),
    ENABLE_SONGKICK: z.enum(["true","false"]).default("false"),
    ENABLE_BILLETTO: z.enum(["true","false"]).default("false"),
    SEED_FROM_FIXTURES: z.enum(["true","false"]).default("false"),
  });
  export const env = schema.parse(process.env);
  ```
- [ ] **7.** Create `src/lib/db.ts` exporting a singleton `PrismaClient` (with the standard `globalThis` guard for dev hot-reload).
- [ ] **8.** Add `vitest.config.ts` pointing tests at `tests/**/*.test.ts` and aliasing `@/` to `src/`.
- [ ] **9.** Add scripts to `package.json`: `dev`, `build`, `start`, `test`, `prisma:migrate`, `prisma:generate`.
- [ ] **10.** Write a placeholder `tests/unit/smoke.test.ts` that asserts `1 + 1 === 2`. Run `npm test` — expect PASS.
- [ ] **11.** Run `npm run build` — expect PASS.
- [ ] **12.** Commit: `chore: scaffold Next.js 15 + Tailwind + Prisma + Vitest`.

---

## Task 2: Prisma schema (all tables)

**Goal:** All tables from the spec + addendum land in one migration so feature work doesn't churn the schema.

**TDD:** optional (declarative).

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*` (generated)

**Steps:**

- [ ] **1.** Replace `prisma/schema.prisma` with the full schema. Include NextAuth's required `Account`, `Session`, `VerificationToken` tables (the prisma adapter contract) plus the spec's domain tables:

  ```prisma
  generator client { provider = "prisma-client-js" }
  datasource db { provider = "sqlite"; url = env("DATABASE_URL") }

  model User {
    id                    String   @id @default(cuid())
    spotifyId             String   @unique
    email                 String
    name                  String
    avatarUrl             String?
    cityName              String?
    latitude              Float?
    longitude             Float?
    radiusKm              Int      @default(50)
    notificationsEnabled  Boolean  @default(true)
    notificationFrequency NotificationFrequency @default(DAILY_DIGEST)
    lastArtistSyncAt      DateTime?
    lastConcertSyncAt     DateTime?
    createdAt             DateTime @default(now())
    accounts              Account[]
    sessions              Session[]
    trackedArtists        TrackedArtist[]
    notifications         NotificationLog[]
  }

  enum NotificationFrequency { INSTANT DAILY_DIGEST }

  // NextAuth Account: access_token + refresh_token will be stored ENCRYPTED
  // (the custom adapter handles this transparently — columns remain String?).
  model Account {
    id                String  @id @default(cuid())
    userId            String
    type              String
    provider          String
    providerAccountId String
    refresh_token     String? // encrypted ciphertext
    access_token      String? // encrypted ciphertext
    expires_at        Int?
    token_type        String?
    scope             String?
    id_token          String?
    session_state     String?
    user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([provider, providerAccountId])
  }

  model Session {
    id           String   @id @default(cuid())
    sessionToken String   @unique
    userId       String
    expires      DateTime
    user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  }

  model VerificationToken {
    identifier String
    token      String   @unique
    expires    DateTime
    @@unique([identifier, token])
  }

  model TrackedArtist {
    id              String   @id @default(cuid())
    userId          String
    spotifyArtistId String
    name            String
    imageUrl        String?
    genres          String   @default("")
    isExcluded      Boolean  @default(false)
    createdAt       DateTime @default(now())
    user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    @@unique([userId, spotifyArtistId])
  }

  model Concert {
    id             String   @id @default(cuid())
    externalId     String
    source         Source
    artistName     String
    venueName      String
    venueCity      String
    venueCountry   String   @default("NO")
    venueTimezone  String   @default("Europe/Oslo")
    latitude       Float?
    longitude      Float?
    eventDate      DateTime
    ticketUrl      String?
    status         ConcertStatus @default(UPCOMING)
    createdAt      DateTime @default(now())
    notifications  NotificationLog[]
    @@unique([externalId, source])
  }

  enum Source { TICKETMASTER BANDSINTOWN SONGKICK BILLETTO }
  enum ConcertStatus { UPCOMING CANCELLED POSTPONED }

  model NotificationLog {
    id        String   @id @default(cuid())
    userId    String
    concertId String
    sentAt    DateTime @default(now())
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    concert   Concert  @relation(fields: [concertId], references: [id], onDelete: Cascade)
    @@unique([userId, concertId])
  }

  model SyncLog {
    id             String   @id @default(cuid())
    source         Source
    status         SyncStatus
    errorMessage   String?
    ranAt          DateTime @default(now())
    durationMs     Int
    concertsFound  Int      @default(0)
  }

  enum SyncStatus { OK FAIL }
  ```

- [ ] **2.** Set `DATABASE_URL="file:./dev.db"` in `.env`.
- [ ] **3.** Run `npx prisma migrate dev --name init` and verify migration succeeds.
- [ ] **4.** Run `npx prisma generate`.
- [ ] **5.** Add a smoke test `tests/unit/db.test.ts`:
  ```ts
  import { prisma } from "@/lib/db";
  import { describe, it, expect } from "vitest";
  describe("schema", () => {
    it("connects and counts users", async () => {
      const n = await prisma.user.count();
      expect(typeof n).toBe("number");
    });
  });
  ```
- [ ] **6.** Run `npm test` — PASS.
- [ ] **7.** Commit: `feat(db): initial Prisma schema for all tables`.

---

## Task 3: Pure utility libs (Haversine, normalize, country→TZ, source priority)

**Goal:** All pure-logic helpers, fully unit-tested. These have no I/O so TDD is cheap and correctness matters.

**TDD:** **required.**

**Files:**
- Create: `src/lib/geo.ts`, `src/lib/normalize.ts`, `src/lib/sources/priority.ts`
- Test: `tests/unit/geo.test.ts`, `tests/unit/normalize.test.ts`, `tests/unit/priority.test.ts`

**Steps:**

- [ ] **1.** Write failing tests for `haversineKm(a, b)` in `tests/unit/geo.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { haversineKm, countryToTimezone } from "@/lib/geo";
  describe("haversineKm", () => {
    it("returns 0 for identical points", () => {
      expect(haversineKm({ lat: 60.39, lon: 5.32 }, { lat: 60.39, lon: 5.32 })).toBe(0);
    });
    it("returns ~308km between Bergen and Oslo", () => {
      const d = haversineKm({ lat: 60.39, lon: 5.32 }, { lat: 59.91, lon: 10.75 });
      expect(d).toBeGreaterThan(300);
      expect(d).toBeLessThan(320);
    });
  });
  describe("countryToTimezone", () => {
    it.each([["NO","Europe/Oslo"],["SE","Europe/Stockholm"],["DK","Europe/Copenhagen"]])(
      "%s -> %s", (c, tz) => expect(countryToTimezone(c)).toBe(tz));
    it("defaults to Europe/Oslo for unknown", () => expect(countryToTimezone("ZZ")).toBe("Europe/Oslo"));
  });
  ```
- [ ] **2.** Run — expect FAIL ("not defined").
- [ ] **3.** Implement `src/lib/geo.ts`:
  ```ts
  export type LatLon = { lat: number; lon: number };
  export function haversineKm(a: LatLon, b: LatLon): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const x = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  const TZ: Record<string,string> = { NO: "Europe/Oslo", SE: "Europe/Stockholm", DK: "Europe/Copenhagen" };
  export function countryToTimezone(c: string): string { return TZ[c.toUpperCase()] ?? "Europe/Oslo"; }
  ```
- [ ] **4.** Run — PASS.
- [ ] **5.** Write failing tests for `normalizeArtistName` in `tests/unit/normalize.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { normalizeArtistName } from "@/lib/normalize";
  describe("normalizeArtistName", () => {
    it.each([
      ["The 1975", "1975"],
      ["Sigur Rós", "sigur ros"],
      ["Beyoncé feat. Jay-Z", "beyonce jay-z"],
      ["Tame Impala (Live)", "tame impala"],
      ["  Spacey  Name  ", "spacey name"],
    ])("%s -> %s", (i, o) => expect(normalizeArtistName(i)).toBe(o));
  });
  ```
- [ ] **6.** Implement `src/lib/normalize.ts`:
  ```ts
  export function normalizeArtistName(input: string): string {
    return input
      .normalize("NFD").replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")           // drop parens
      .replace(/\b(the|feat\.?|featuring)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  ```
- [ ] **7.** Run — PASS.
- [ ] **8.** Write failing tests for `pickPrioritySource` in `tests/unit/priority.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { pickPrioritySource } from "@/lib/sources/priority";
  describe("pickPrioritySource", () => {
    it("prefers TICKETMASTER over BANDSINTOWN", () => {
      expect(pickPrioritySource(["BANDSINTOWN","TICKETMASTER"])).toBe("TICKETMASTER");
    });
    it("falls back to next available", () => {
      expect(pickPrioritySource(["SONGKICK","BANDSINTOWN"])).toBe("BANDSINTOWN");
    });
  });
  ```
- [ ] **9.** Implement `src/lib/sources/priority.ts`:
  ```ts
  import type { Source } from "@prisma/client";
  const ORDER: Source[] = ["TICKETMASTER","BILLETTO","BANDSINTOWN","SONGKICK"];
  export function pickPrioritySource(present: Source[]): Source {
    return ORDER.find(s => present.includes(s)) ?? present[0];
  }
  ```
- [ ] **10.** Run all tests — PASS.
- [ ] **11.** Commit: `feat(lib): haversine, artist normalization, source priority`.

---

## Task 4: AES-GCM crypto + encrypted NextAuth adapter

**Goal:** A `crypto.ts` for AES-GCM encrypt/decrypt of strings, and an adapter that wraps `@auth/prisma-adapter` and transparently encrypts/decrypts `access_token` and `refresh_token` on `Account` rows.

**TDD:** **required** (crypto correctness is non-negotiable).

**Files:**
- Create: `src/lib/crypto.ts`, `src/lib/auth/encrypted-adapter.ts`
- Test: `tests/unit/crypto.test.ts`, `tests/unit/encrypted-adapter.test.ts`

**Steps:**

- [ ] **1.** Write `tests/unit/crypto.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { encrypt, decrypt } from "@/lib/crypto";
  const KEY = "0".repeat(64); // 32 bytes hex
  describe("crypto", () => {
    it("round-trips", () => {
      const ct = encrypt("hello", KEY);
      expect(ct).not.toBe("hello");
      expect(decrypt(ct, KEY)).toBe("hello");
    });
    it("produces different ciphertext each call (random IV)", () => {
      expect(encrypt("x", KEY)).not.toBe(encrypt("x", KEY));
    });
    it("decrypt fails on tampered ciphertext", () => {
      const ct = encrypt("hello", KEY);
      const bad = ct.slice(0, -2) + "00";
      expect(() => decrypt(bad, KEY)).toThrow();
    });
  });
  ```
- [ ] **2.** Implement `src/lib/crypto.ts` using Node `crypto` (AES-256-GCM, 12-byte IV, base64 output as `iv:ct:tag`):
  ```ts
  import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
  function keyBuf(hex: string) { return Buffer.from(hex, "hex"); }
  export function encrypt(plain: string, keyHex: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyBuf(keyHex), iv);
    const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, ct, tag].map(b => b.toString("base64")).join(":");
  }
  export function decrypt(payload: string, keyHex: string): string {
    const [ivB64, ctB64, tagB64] = payload.split(":");
    const decipher = createDecipheriv("aes-256-gcm", keyBuf(keyHex), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const pt = Buffer.concat([decipher.update(Buffer.from(ctB64, "base64")), decipher.final()]);
    return pt.toString("utf8");
  }
  ```
- [ ] **3.** Run — PASS.
- [ ] **4.** Implement `src/lib/auth/encrypted-adapter.ts` that wraps `PrismaAdapter(prisma)` and overrides:
  - `linkAccount(account)` — encrypts `access_token`/`refresh_token` before passing through.
  - `getUserByAccount` — no token reading needed; pass through.
  - Add a `getAccountTokens(userId)` helper that fetches the row and decrypts both tokens for runtime use (Spotify API calls).

  Provide the full file body (~50 lines) wrapping `PrismaAdapter` and re-exporting other methods unchanged. Use `env.TOKEN_ENCRYPTION_KEY`.

- [ ] **5.** Write `tests/unit/encrypted-adapter.test.ts` that uses an in-memory mock prisma to verify `linkAccount` writes ciphertext and `getAccountTokens` returns plaintext.
- [ ] **6.** Run — PASS.
- [ ] **7.** Commit: `feat(auth): AES-GCM token encryption + NextAuth adapter wrapper`.

---

## Task 4.5: Design tokens & shared layout

**Goal:** Land the visual system from `concert-radar-design/` into the codebase before any feature-UI work. Output of Phase 1.5 retrofit.

**TDD:** optional.

**Files:**
- Modify: `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/components/AppNav.tsx`, `src/components/SourceBadge.tsx`, `src/components/Chip.tsx`, `src/components/Button.tsx`, `src/components/ConcertCard.tsx` (primitive)

**Steps:**

- [ ] Inter font via `next/font/google` (weights 400–900), applied to `<html>`.
- [ ] Extend `tailwind.config.ts` with the theme snippet at the bottom of `design-tokens.md` (colors, type scale, radius, shadow, motion, source colors).
- [ ] Global CSS: body backdrop radial gradients, SVG noise grain overlay (4% opacity, overlay blend), antialiased text rendering.
- [ ] Implement shared components per `design/style.css` patterns: `<AppNav>` (sticky, pulsing brand dot, active underline), `<SourceBadge variant=...>` (4 variants), `<Chip>`, `<Button>` (spotify, ghost, primary, danger), `<ConcertCard>` primitive.
- [ ] Respect `prefers-reduced-motion: reduce`.
- [ ] Manual visual diff against `design/index.html`.
- [ ] `npm run build` clean.
- [ ] Commit: `feat(design): tokens, AppNav, SourceBadge, Chip, Button, ConcertCard primitive`.

**Reference:** `concert-radar-design/index.html` for visual target; `concert-radar-design/design-tokens.md` for canonical values; `concert-radar-design/style.css` for patterns to port.

**Blocks:** Tasks 5, 6, 11, 12.

---

## Task 5: NextAuth Spotify OAuth + landing page

**Goal:** End-to-end: clicking "Connect with Spotify" on `/` redirects through Spotify OAuth and lands the user on `/dashboard` with a populated `User` row.

**TDD:** optional (mostly integration/UI).

**Files:**
- Create: `src/lib/auth/nextauth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/app/page.tsx` (replace placeholder), `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx` (placeholder), `src/middleware.ts`

**Steps:**

- [ ] **1.** Implement `src/lib/auth/nextauth.ts`:
  ```ts
  import NextAuth from "next-auth";
  import Spotify from "next-auth/providers/spotify";
  import { encryptedPrismaAdapter } from "./encrypted-adapter";
  import { env } from "@/env";
  export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: encryptedPrismaAdapter(),
    providers: [Spotify({
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      authorization: { params: { scope: "user-top-read user-follow-read user-read-email user-library-read" }},
    })],
    callbacks: {
      async signIn({ user, account, profile }) {
        // Populate spotifyId, name, avatarUrl on first sign-in.
        return true;
      },
      async session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
    session: { strategy: "database" },
  });
  ```
- [ ] **2.** Implement `src/app/api/auth/[...nextauth]/route.ts`:
  ```ts
  export { handlers as GET, handlers as POST } from "@/lib/auth/nextauth";
  ```
- [ ] **3.** Implement `src/app/page.tsx` — landing with the spec's value-prop bullets and an "Connect with Spotify" button (Spotify green `#1DB954`) that calls `signIn("spotify", { callbackUrl: "/dashboard" })`.
- [ ] **4.** Implement `src/app/dashboard/layout.tsx` — calls `auth()`; if no session, `redirect("/")`. Renders header with city + sync button (placeholders).
- [ ] **5.** Implement `src/app/dashboard/page.tsx` as `<div>Dashboard placeholder</div>` for now.
- [ ] **6.** Implement `src/middleware.ts` to protect `/dashboard/*`.
- [ ] **7.** Manual verification: register a Spotify app at developer.spotify.com, set callback `http://localhost:3000/api/auth/callback/spotify`, copy id/secret to `.env`. Run `npm run dev`, log in, confirm a User and Account row exist in SQLite, and Account tokens are ciphertext.
- [ ] **8.** Commit: `feat(auth): Spotify OAuth login and protected dashboard`.

---

## Task 6: Settings page — city geocode + radius + notification frequency

**Goal:** User can set their home city (geocoded via Nominatim), radius (25/50/100/9999), and notification frequency (instant/digest). City save resolves lat/lon and persists timezone-correct data.

**TDD:** mixed — the Nominatim parsing function is TDD-required; the form is TDD-optional.

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`, `src/app/api/settings/route.ts`, `src/lib/nominatim.ts`
- Test: `tests/unit/nominatim.test.ts`, `tests/integration/settings.test.ts`
- Fixture: `__fixtures__/nominatim/bergen.json`

**Steps:**

- [ ] **1.** Save a sample Nominatim response for "Bergen" to `__fixtures__/nominatim/bergen.json`.
- [ ] **2.** Write `tests/unit/nominatim.test.ts` for `parseNominatimResults(json)` — expect city name + lat + lon + country code extracted.
- [ ] **3.** Implement `src/lib/nominatim.ts`:
  ```ts
  export type Place = { name: string; lat: number; lon: number; country: string };
  export function parseNominatimResults(json: any[]): Place[] {
    return json
      .filter(r => ["NO","SE","DK"].includes(r.address?.country_code?.toUpperCase()))
      .map(r => ({
        name: r.address.city ?? r.address.town ?? r.address.village ?? r.display_name.split(",")[0],
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        country: r.address.country_code.toUpperCase(),
      }));
  }
  export async function searchCity(q: string): Promise<Place[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=no,se,dk&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "User-Agent": "Concert Radar (concert-radar.app)" }});
    return parseNominatimResults(await res.json());
  }
  ```
- [ ] **4.** Run unit tests — PASS.
- [ ] **5.** Implement `src/app/dashboard/settings/page.tsx`:
  - City input with autocomplete (debounced 300ms, calls `searchCity` server-action or `/api/cities?q=`).
  - Radius segmented toggle: 25 / 50 / 100 / Country-wide (9999).
  - Notification frequency toggle: Daily digest / Instant.
  - "Disconnect Spotify & delete account" button (real action wired in Task 14).
- [ ] **6.** Implement `src/app/api/settings/route.ts` — `POST` accepts `{cityName, lat, lon, radiusKm, notificationFrequency, notificationsEnabled}`, updates `User`.
- [ ] **7.** Manual verify: set city to "Bergen", radius 50, digest. Confirm DB row.
- [ ] **8.** Commit: `feat(settings): city geocoding, radius, notification preferences`.

---

## Task 7: Spotify artist sync (top + followed + cold-start fallback)

**Goal:** On demand (and at login), fetch the user's top 50 artists + followed artists, write/update `TrackedArtist` rows. If `< 5` distinct artists, also pull saved albums.

**TDD:** Spotify response parsing is TDD-required; the orchestration function is TDD-optional.

**Files:**
- Create: `src/lib/spotify.ts`, `src/app/api/sync-artists/route.ts`
- Test: `tests/integration/spotify-artist-sync.test.ts`
- Fixtures: `__fixtures__/spotify/top-artists.json`, `__fixtures__/spotify/followed-artists.json`, `__fixtures__/spotify/saved-albums.json`

**Steps:**

- [ ] **1.** Record three fixture JSON files reflecting the real Spotify endpoint shapes (`/me/top/artists`, `/me/following?type=artist`, `/me/albums`).
- [ ] **2.** Write integration test: given fixtures, calling `syncArtistsForUser(userId, mockedSpotifyClient)` results in N TrackedArtist rows with correct fields, dedup by `(userId, spotifyArtistId)`, and triggers saved-album fallback when first two endpoints return < 5 artists.
- [ ] **3.** Implement `src/lib/spotify.ts`:
  - `spotifyFetch(userId, path)` — looks up encrypted tokens via `getAccountTokens`, refreshes on 401, makes the call.
  - `getTopArtists(userId)`, `getFollowedArtists(userId)`, `getSavedAlbumArtists(userId)` — return `{spotifyArtistId, name, imageUrl, genres}[]`.
  - `syncArtistsForUser(userId)` — orchestrates the three, upserts `TrackedArtist`, updates `User.lastArtistSyncAt`.
- [ ] **4.** Run tests — PASS.
- [ ] **5.** Implement `src/app/api/sync-artists/route.ts` — `POST` auth-required, calls `syncArtistsForUser(session.user.id)`. Wired to a "Re-sync from Spotify" button (built in Task 10).
- [ ] **6.** Hook into NextAuth `signIn` callback to kick off `syncArtistsForUser` in the background (fire-and-forget) on first login.
- [ ] **7.** Commit: `feat(spotify): artist sync from top, followed, saved albums`.

---

## Task 8: Source adapter interface + Ticketmaster + Bandsintown

**Goal:** Define the `SourceAdapter` interface and ship the two MVP-active adapters with fixture-driven integration tests.

**TDD:** **required** for the per-adapter `parseResponse` function; the network wrapper is TDD-optional.

**Files:**
- Create: `src/lib/sources/types.ts`, `src/lib/sources/ticketmaster.ts`, `src/lib/sources/bandsintown.ts`, `src/lib/sources/registry.ts`
- Test: `tests/integration/ticketmaster.test.ts`, `tests/integration/bandsintown.test.ts`
- Fixtures: `__fixtures__/ticketmaster/*.json`, `__fixtures__/bandsintown/*.json`

**Steps:**

- [ ] **1.** Define `src/lib/sources/types.ts`:
  ```ts
  import type { Source, ConcertStatus } from "@prisma/client";
  export type ConcertHit = {
    externalId: string;
    source: Source;
    artistName: string;
    venueName: string;
    venueCity: string;
    venueCountry: string;
    venueTimezone: string;
    latitude?: number;
    longitude?: number;
    eventDate: Date;        // UTC
    ticketUrl?: string;
    status: ConcertStatus;
  };
  export interface SourceAdapter {
    source: Source;
    fetchForArtist(args: { artistName: string; spotifyArtistId: string }): Promise<ConcertHit[]>;
  }
  ```
- [ ] **2.** Record real Ticketmaster + Bandsintown JSON responses for 2 sample artists each, save to fixtures.
- [ ] **3.** Write `tests/integration/ticketmaster.test.ts` and `tests/integration/bandsintown.test.ts` that import the adapter's exported `parseResponse(json)` and assert correct `ConcertHit[]` mapping — including timezone derivation from country and UTC eventDate conversion.
- [ ] **4.** Implement both adapters in `src/lib/sources/{ticketmaster,bandsintown}.ts`. Each exports a `parseResponse` (pure) and a `fetchForArtist` that hits the live API. Use `countryToTimezone` from Task 3. Skip Songkick/Billetto (Task 9). Filter to country codes NO/SE/DK.
- [ ] **5.** Implement `src/lib/sources/registry.ts`:
  ```ts
  import { env } from "@/env";
  import { ticketmaster } from "./ticketmaster";
  import { bandsintown } from "./bandsintown";
  import { songkick } from "./songkick";
  import { billetto } from "./billetto";
  import type { SourceAdapter } from "./types";
  export function activeAdapters(): SourceAdapter[] {
    const a: SourceAdapter[] = [ticketmaster, bandsintown];
    if (env.ENABLE_SONGKICK === "true") a.push(songkick);
    if (env.ENABLE_BILLETTO === "true") a.push(billetto);
    return a;
  }
  ```
- [ ] **6.** Run tests — PASS.
- [ ] **7.** Commit: `feat(sources): Ticketmaster and Bandsintown adapters`.

---

## Task 9: Songkick + Billetto adapters (scaffolded, flag-gated)

**Goal:** Same interface, basic implementations, registered only when their feature flag is `true`. Do not block the MVP if API keys are missing.

**TDD:** **required** for `parseResponse`.

**Files:**
- Create: `src/lib/sources/songkick.ts`, `src/lib/sources/billetto.ts`
- Test: `tests/integration/songkick.test.ts`, `tests/integration/billetto.test.ts`
- Fixtures: minimal recorded JSON (one event each)

**Steps:**

- [ ] **1.** Write tests asserting `parseResponse` correctness against recorded fixtures (use docs to construct plausible JSON if keys aren't yet available — tests run against fixtures, not the live API).
- [ ] **2.** Implement both adapters following the same shape as Task 8.
- [ ] **3.** Run tests — PASS.
- [ ] **4.** Verify `npm run build` PASS with both flags off (default) — adapters compile but are not invoked.
- [ ] **5.** Commit: `feat(sources): Songkick and Billetto adapters behind feature flags`.

---

## Task 10: Sync orchestrator + dedup

**Goal:** A single `runSyncForUser(userId)` function used by both cron and `/api/sync-now`. It enumerates active adapters, queries each for each non-excluded TrackedArtist, applies 100ms inter-call delay + 6h per-artist cache, upserts `Concert` rows, writes per-source `SyncLog`, and returns `{ newConcerts: Concert[] }`.

The dashboard-side grouping (cross-source dedup) is implemented as a query helper here too: `getDedupedConcertsForUser(userId)`.

**TDD:** `dedup.ts` (pure) is **required**; orchestrator is **optional** (covered by integration test in Task 13).

**Files:**
- Create: `src/lib/sync.ts`, `src/lib/dedup.ts`
- Test: `tests/unit/dedup.test.ts`

**Steps:**

- [ ] **1.** Write failing test for `groupForDashboard(concerts)` in `tests/unit/dedup.test.ts`:
  ```ts
  // given 3 Concert rows: same normalized artist + city + date from TICKETMASTER and BANDSINTOWN,
  // plus a different concert in another city — expect 2 groups, the dup group reports both sources
  // and picks Ticketmaster ticketUrl per priority.
  ```
- [ ] **2.** Implement `src/lib/dedup.ts`:
  ```ts
  import type { Concert, Source } from "@prisma/client";
  import { normalizeArtistName } from "./normalize";
  import { pickPrioritySource } from "./sources/priority";
  export type DashboardConcert = {
    key: string;
    representative: Concert;
    sources: Source[];
    ticketUrl: string | null;
  };
  export function groupForDashboard(concerts: Concert[]): DashboardConcert[] {
    const map = new Map<string, Concert[]>();
    for (const c of concerts) {
      const day = c.eventDate.toISOString().slice(0, 10);
      const key = `${normalizeArtistName(c.artistName)}|${c.venueCity.toLowerCase()}|${day}`;
      (map.get(key) ?? map.set(key, []).get(key)!).push(c);
    }
    return [...map.entries()].map(([key, rows]) => {
      const sources = rows.map(r => r.source);
      const winnerSource = pickPrioritySource(sources);
      const rep = rows.find(r => r.source === winnerSource)!;
      return { key, representative: rep, sources, ticketUrl: rep.ticketUrl };
    }).sort((a, b) => a.representative.eventDate.getTime() - b.representative.eventDate.getTime());
  }
  ```
- [ ] **3.** Run — PASS.
- [ ] **4.** Implement `src/lib/sync.ts`:
  - `runSyncForUser(userId)`:
    1. Load non-excluded `TrackedArtist[]` for user.
    2. For each adapter in `activeAdapters()`: for each artist, call `fetchForArtist` with 100ms delay, gather hits. On exception, write `SyncLog{status:FAIL, errorMessage}` for that source and continue.
    3. Upsert results into `Concert` via `(externalId, source)` unique constraint. Apply 6h cache: skip artists whose `lastFetchedAt` (a new ephemeral KV in-memory map keyed on `${source}:${spotifyArtistId}`) is < 6h old.
    4. Write `SyncLog{status:OK, concertsFound, durationMs}` per source.
    5. Update `User.lastConcertSyncAt`.
    6. Return the newly-inserted `Concert[]` (collected from upsert results).
  - `getDedupedConcertsForUser(userId)`:
    1. Load `User` (need lat/lon, radius, excluded artists).
    2. Load `Concert` rows whose `eventDate > now()`, joined-or-filtered to user's non-excluded `TrackedArtist` names (via normalized match).
    3. Compute distance with `haversineKm`. Drop rows outside `radiusKm` (unless radiusKm = 9999 — country-wide includes NO/SE/DK regardless of distance).
    4. Run `groupForDashboard`. Attach distanceKm to each group's representative for display.
- [ ] **5.** Commit: `feat(sync): orchestrator and cross-source dashboard dedup`.

---

## Task 11: Dashboard page (main concert list) + ConcertCard + SourceBadge

**Goal:** `/dashboard` renders the deduped concert list grouped by date, with rich artist-image cards, source badges, distance label, and a "sync now" button.

**TDD:** optional (UI assembly).

**Files:**
- Modify: `src/app/dashboard/page.tsx`, `src/app/dashboard/layout.tsx`
- Create: `src/components/ConcertCard.tsx`, `src/components/SourceBadge.tsx`, `src/components/DateGroup.tsx`, `src/components/SyncNowButton.tsx`, `src/app/api/sync-now/route.ts`

**Steps:**

- [ ] **1.** Implement `src/app/api/sync-now/route.ts`:
  - Auth-required.
  - Rate limit: reject 429 if `user.lastConcertSyncAt > now - 5min`.
  - Else: call `runSyncForUser(session.user.id)` and return `{ newConcerts: n }`.
- [ ] **2.** Implement `src/components/SourceBadge.tsx` — small pill with platform brand color.
- [ ] **3.** Implement `src/components/ConcertCard.tsx` — artist image as background with gradient overlay, artist name, venue, city, date (formatted in `representative.venueTimezone`), distance, source badges (one per `sources[]`), "Get Tickets" button linking to `ticketUrl`.
- [ ] **4.** Implement `src/components/DateGroup.tsx` — sticky date header + concert cards.
- [ ] **5.** Implement `src/components/SyncNowButton.tsx` — client component, POSTs to `/api/sync-now`, shows toast on success, disables and shows countdown if 429.
- [ ] **6.** Implement `src/app/dashboard/page.tsx`:
  - Server component, calls `getDedupedConcertsForUser`.
  - Renders header "X upcoming concerts near {City}" + radius chip + last-synced timestamp + sync button.
  - Groups by date, renders `<DateGroup />` per day.
  - Empty state with "Try increasing your radius in settings" link.
- [ ] **7.** Manual verify with seeded data (use `prisma db seed` or run a sync once).
- [ ] **8.** Commit: `feat(dashboard): main concert list with dedup, distance, and sync-now`.

---

## Task 12: Artist list + Concert detail pages

**Goal:** `/dashboard/artists` shows the user's tracked artists with exclude toggles + re-sync button; `/dashboard/concerts/[id]` shows full detail for one concert (the representative row).

**TDD:** optional.

**Files:**
- Create: `src/app/dashboard/artists/page.tsx`, `src/components/ArtistCard.tsx`, `src/app/api/artists/exclude/route.ts`, `src/app/dashboard/concerts/[id]/page.tsx`, `src/components/ShareButton.tsx`

**Steps:**

- [ ] **1.** Implement `/dashboard/artists/page.tsx` — grid of `ArtistCard` per `TrackedArtist`, with upcoming-shows count (`Concert` count within radius for that artist), exclude toggle, re-sync button (POST `/api/sync-artists` from Task 7).
- [ ] **2.** Implement `/api/artists/exclude/route.ts` — `POST { artistId, isExcluded }`.
- [ ] **3.** Implement `/dashboard/concerts/[id]/page.tsx` — server component fetching the `Concert` by id, rendering artist header (Spotify image), full venue address, date/time in venueTimezone, distance, source row, "Get Tickets", and a `<ShareButton />` (uses Web Share API; falls back to clipboard).
- [ ] **4.** Manual verify.
- [ ] **5.** Commit: `feat(dashboard): artist management and concert detail page`.

---

## Task 13: Vercel Cron + daily sync + email (digest + instant)

**Goal:** A daily cron at 08:00 CET syncs all users, then sends each user the right email (digest or instant) for newly found concerts that aren't already in `NotificationLog`. CRON_SECRET enforced.

**TDD:** email composition is **required**; cron route is **optional** (smoke-tested).

**Files:**
- Create: `src/app/api/cron/sync/route.ts`, `src/lib/email.ts`, `vercel.json`
- Test: `tests/unit/email.test.ts`

**Steps:**

- [ ] **1.** Create `vercel.json`:
  ```json
  { "crons": [{ "path": "/api/cron/sync", "schedule": "0 7 * * *" }] }
  ```
  (07:00 UTC = 08:00 CET in winter; this is the simplest cron schedule. Document the DST caveat in `README`.)
- [ ] **2.** Write `tests/unit/email.test.ts` for `buildDigestEmail(user, newConcerts)` and `buildInstantEmail(user, concert)` — verifies subject, HTML contains all concerts, displays times in venue TZ.
- [ ] **3.** Implement `src/lib/email.ts`:
  - `sendDigest(user, concerts)` and `sendInstant(user, concert)` using Resend.
  - Both insert `NotificationLog` rows per `(userId, concertId)` BEFORE sending, using `createMany({ skipDuplicates: true })` — guarantees one send per concert ever.
  - Skip if `user.notificationsEnabled === false`.
- [ ] **4.** Implement `src/app/api/cron/sync/route.ts`:
  ```ts
  import { env } from "@/env";
  import { NextResponse } from "next/server";
  // GET (Vercel cron calls GET)
  export async function GET(req: Request) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.CRON_SECRET}`) return new NextResponse("unauthorized", { status: 401 });
    const users = await prisma.user.findMany();
    for (const u of users) {
      const { newConcerts } = await runSyncForUser(u.id);
      const unsent = await filterUnsent(u.id, newConcerts);
      if (unsent.length === 0) continue;
      if (u.notificationFrequency === "DAILY_DIGEST") await sendDigest(u, unsent);
      else for (const c of unsent) await sendInstant(u, c);
    }
    return NextResponse.json({ ok: true });
  }
  ```
- [ ] **5.** Run tests — PASS.
- [ ] **6.** Manual verify locally: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync` triggers sync; unauthorized call returns 401.
- [ ] **7.** Commit: `feat(cron): daily sync with digest and instant emails`.

---

## Task 14: Delete account + final DoD pass

**Goal:** Account deletion is wired up, and all DoD checkboxes from the spec + addendum are verified.

**TDD:** optional (deletion is straightforward).

**Files:**
- Create: `src/app/api/account/delete/route.ts`
- Modify: `src/app/dashboard/settings/page.tsx` (wire the button)

**Steps:**

- [ ] **1.** Implement `/api/account/delete`:
  - Auth-required.
  - Transaction: delete `NotificationLog`, `TrackedArtist`, `Session`, `Account`, then `User`. Keep `Concert` rows.
  - Sign out, redirect to `/`.
- [ ] **2.** Wire the Settings page button to confirm-modal + POST.
- [ ] **3.** Run `npm run build` — must pass with no TypeScript errors.
- [ ] **4.** Walk the spec's DoD + addendum DoD checklists in order. For each item, perform a manual or test-based check. Tick boxes in `projects/concert-radar.md` (in the project-ideas repo) as items complete.
- [ ] **5.** Commit: `feat(account): delete account flow; close out DoD`.

---

## Test commands quick-reference

```
npm test                     # all Vitest
npm test -- tests/unit       # unit only
npm test -- tests/integration
npm run build                # TypeScript + Next build (must pass cleanly)
npx prisma studio            # inspect data
```

## Environment variables to set before Task 5

```
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=<openssl rand -hex 32>
NEXTAUTH_URL=http://localhost:3000
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
TOKEN_ENCRYPTION_KEY=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 16>
TICKETMASTER_API_KEY=...
BANDSINTOWN_APP_ID=concert-radar
RESEND_API_KEY=...
RESEND_FROM=alerts@concert-radar.app
ENABLE_SONGKICK=false
ENABLE_BILLETTO=false
```

---

## Mapping plan tasks → GitHub issues (for Phase 4)

| Task | Issue title | Labels | Status |
|---|---|---|---|
| 1 | Scaffold Next.js + Tailwind + Prisma + Vitest | `mvp`, `setup` | ✅ merged |
| 2 | Prisma schema for all tables | `mvp`, `db` | ✅ merged |
| 3 | Pure utility libs: haversine, normalize, source priority | `mvp`, `lib` | ✅ merged |
| 4 | AES-GCM crypto + encrypted NextAuth adapter | `mvp`, `security` | ✅ merged |
| 4.5 | Design tokens & shared layout | `mvp`, `ui`, `setup` | ✅ merged |
| 5 | NextAuth Spotify OAuth + landing page | `mvp`, `auth` | ✅ merged (PR #20) |
| 6 | Settings page (city, radius, notifications) | `mvp`, `ui` | ✅ merged (PR #21) |
| 7 | Spotify artist sync (top + followed + fallback) | `mvp`, `spotify` | ✅ merged (PR #22) |
| 8 | Ticketmaster + Bandsintown adapters | `mvp`, `sources` | ✅ merged (PR #23) |
| 9 | Songkick + Billetto adapters (flag-gated) | `phase-2`, `sources` | ✅ merged (PR #24) |
| 10 | Sync orchestrator + cross-source dedup | `mvp`, `sync` | 🟡 PR #25 open |
| 11 | Dashboard concert list + sync-now | `mvp`, `ui` | ⏳ pending |
| 12 | Artist list + concert detail pages | `mvp`, `ui` | ⏳ pending |
| 13 | Vercel Cron + digest + instant emails | `mvp`, `cron`, `email` | ⏳ pending |
| 14 | Delete account + DoD pass | `mvp`, `cleanup` | ⏳ pending |

---

## Post-MVP follow-ups

Shortcuts deliberately taken during MVP execution, filed as `tech-debt` / `post-mvp` issues on GitHub. **None block MVP.** Each issue describes the shortcut, why it was acceptable for MVP, and the suggested clean fix.

| # | Title | Area |
|---|---|---|
| [#26](https://github.com/nimkimi/concert-radar/issues/26) | Replace in-memory 6h sync cache with DB-backed TTL | sync, scalability |
| [#27](https://github.com/nimkimi/concert-radar/issues/27) | Persist `normalizedArtistName` on Concert + index it | db, scalability |
| [#28](https://github.com/nimkimi/concert-radar/issues/28) | Replace "new concert" detection heuristic in `runSyncForUser` | sync, correctness |
| [#29](https://github.com/nimkimi/concert-radar/issues/29) | Enrich saved-album fallback artists with `/artists/{ids}` lookup | spotify, data quality |
| [#30](https://github.com/nimkimi/concert-radar/issues/30) | Spotify token refresh: target specific Account row, not `updateMany` | spotify, security |
| [#31](https://github.com/nimkimi/concert-radar/issues/31) | Remove Next.js 16 + Spotify OAuth dev workarounds when upstream lands fixes | auth |
| [#32](https://github.com/nimkimi/concert-radar/issues/32) | Bandsintown TZ math: replace ad-hoc Intl trick with Luxon/Temporal | sources, correctness |
| [#33](https://github.com/nimkimi/concert-radar/issues/33) | Rate-limit `/api/sync-artists`, `/api/cities`, `/api/settings` | security |
| [#34](https://github.com/nimkimi/concert-radar/issues/34) | Surface per-artist sync failures (currently only `console.warn`) | sync, observability |
| [#35](https://github.com/nimkimi/concert-radar/issues/35) | Replace hand-crafted Bandsintown/Songkick/Billetto fixtures with recorded responses | sources, tests |
| [#36](https://github.com/nimkimi/concert-radar/issues/36) | Encrypted tokens: add key version + IV format header for rotation | security |
| [#37](https://github.com/nimkimi/concert-radar/issues/37) | Push tracked-artist filter into the Concert query (currently JS-side) | sources (depends on #27) |
