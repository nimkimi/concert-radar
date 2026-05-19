# Concert Radar — Design Tokens (v1, HISTORICAL)

> ⚠️ **Superseded by v2 (shipped 2026-05-18).** This file describes the v1 festival-poster look that was rejected after MVP. The current canonical token set lives in `src/app/globals.css` (the `@theme` block + `[data-theme="dark"]` overrides). v2 mockups are at `nimkimi/project-ideas/projects/concert-radar-redesign/v2/` (desktop) and `v2-mobile/` (mobile); the design brief is at `concert-radar-redesign/design-brief.md`. Do not port from the file below.

---

**Mode:** Festival-poster maximalism, dark only.
**Companion to:** the static HTML mockups in this folder. Tokens here drive `style.css`. When implementing in Next.js + Tailwind, extend the theme with these values.

---

## Colors

### Surfaces

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0A0A` | Page background (true near-black) |
| `bg-elevated` | `#121212` | Spec-aligned card background tier 1 |
| `surface` | `#1E1E1E` | Card surface tier 2 |
| `surface-2` | `#262626` | Hover / focus surface |
| `border` | `rgba(255,255,255,0.08)` | Default border |
| `border-strong` | `rgba(255,255,255,0.16)` | Inputs, prominent borders |

### Text

| Token | Hex | Use |
|---|---|---|
| `text` | `#FFFFFF` | Primary text |
| `text-muted` | `#A0A0A0` | Secondary text |
| `text-dim` | `#6E6E6E` | Tertiary, captions, metadata |

### Brand & Accents

| Token | Hex | Use |
|---|---|---|
| `spotify` | `#1DB954` | Primary accent — CTAs, active states, brand presence |
| `spotify-bright` | `#1ED760` | Hover state for Spotify green |
| `magenta` | `#FF2E88` | Secondary accent — value-prop "02", hero gradient, share |
| `cyan` | `#00E5FF` | Tertiary accent — "deduped" indicator, value-prop "03" |
| `gold` | `#FFC700` | Reserved for "sold fast" / urgency labels |

### Source brand colors (badges)

Each source uses its own platform color. The badge is small, high-saturation, and white-text.

| Source | Hex | Tailwind suggestion |
|---|---|---|
| Ticketmaster | `#026CDF` | `bg-blue-600` (close match) — use exact hex |
| Bandsintown | `#FF4F4F` | `bg-red-500` (close) — use exact hex |
| Songkick | `#FF6B00` | `bg-orange-500` (close) — use exact hex |
| Billetto | `#5B3FF5` | `bg-violet-600` (close) — use exact hex |

### Gradients

- **Hero (landing):** layered radial gradients combining `magenta`, `spotify`, `billetto-purple`, atop `#0A0A0A`, blurred and overlaid with a dark-to-bg vertical gradient. See `--grad-hero` in `style.css`.
- **Concert card overlay:** `linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.4) 45%, rgba(10,10,10,0.95) 100%)`. Sits between full-bleed image and text content for legibility.
- **Body backdrop:** subtle large-radius radial gradients in `spotify` (top center) and `magenta` (bottom right), each at 10-15% opacity.

---

## Typography

**Family:** Inter (variable). Use weights 400, 500, 600, 700, 800, 900.
The festival-poster feel comes from **extreme weight + scale contrast**, not from font choice — Inter Black at 100px+ paired with Inter Regular at 14px is the rhythm.

### Type scale

| Token | Value | Use |
|---|---|---|
| `type-hero` | `clamp(80px, 14vw, 220px)` | Landing hero ("NEVER MISS A CONCERT AGAIN") |
| `type-display` | `clamp(56px, 8vw, 120px)` | Page titles ("23 upcoming shows…") |
| `type-h1` | `clamp(40px, 5vw, 64px)` | Section heroes |
| `type-h2` | `32px` | Section titles in settings |
| `type-h3` | `22px` | Info-block values, card hover artist names |
| `type-body` | `16px` | Body copy |
| `type-small` | `14px` | Secondary text, button labels |
| `type-micro` | `12px` | Metadata, timestamps |
| `type-overline` | `11px`, uppercase, `0.12em` tracking | Labels, "01 / LANDING", stats |

### Display-type rules

- Page titles and date headers use `font-weight: 900`, `letter-spacing: -0.04em` to `-0.06em`, `line-height: 0.85–0.9`, uppercase.
- One color word per title (Spotify green) plus one outlined word (`-webkit-text-stroke: 2px var(--text); color: transparent;`) for textural contrast.
- Date headers split day and month into colored + outlined halves: `14 JUN` where `14` is green-filled and `JUN` is stroke-only.

### Body type

- Default `font-feature-settings: 'cv11', 'ss01', 'ss03';` (Inter stylistic alternates) for slightly more character.
- Antialiasing on: `-webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;`

---

## Spacing

8-step linear scale; mostly multiples of 4.

| Token | Value |
|---|---|
| `s-1` | 4px |
| `s-2` | 8px |
| `s-3` | 12px |
| `s-4` | 16px |
| `s-5` | 24px |
| `s-6` | 32px |
| `s-7` | 48px |
| `s-8` | 64px |
| `s-9` | 96px |
| `s-10` | 128px |

Use the scale for padding, gaps, and margins. Avoid arbitrary values.

---

## Radius

| Token | Value | Use |
|---|---|---|
| `r-sm` | 6px | Source badges, micro pills |
| `r-md` | 12px | Cards, inputs, modals |
| `r-lg` | 20px | Hero cards, featured cards |
| `r-xl` | 32px | Large feature surfaces |
| `r-pill` | 999px | Pills, chips, primary buttons |

---

## Shadow / Elevation

Festival-maximalism uses **dramatic** shadows, not subtle ones.

| Token | Value | Use |
|---|---|---|
| `shadow-card` | `0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)` | Default concert card |
| `shadow-hover` | `0 16px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4)` | Hover state |
| Glow | `0 0 16px <color>` | Status dots (pulsing Spotify-green dot in nav) |

---

## Motion

| Token | Value | Use |
|---|---|---|
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default transitions |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Pulses, breathing |
| `dur-fast` | 150ms | Color swaps, button states |
| `dur-base` | 240ms | Hover, focus rings, card lift |
| `dur-slow` | 400ms | Image zoom on hover, transforms |

### Patterns

- **Card hover:** lift 4px + image scale 1.05 + reveal arrow CTA (opacity + scale).
- **Staggered intro:** landing hero title words each get `animation-delay` 0.05s, 0.15s, 0.25s, 0.35s.
- **Pulse:** brand dot in nav scales 1 → 1.3, opacity 1 → 0.7, 2.4s infinite.
- **Ticker:** horizontal infinite scroll, 40s linear, masked with edge fade.

Respect `prefers-reduced-motion: reduce` — implementations should disable animation on those users.

---

## Component patterns

### `ConcertCard`

- **Shape:** aspect-ratio 4/5 default, 16/10 for featured.
- **Layers (back to front):**
  1. Artist image (full-bleed, `object-fit: cover`)
  2. Gradient overlay (transparent → dark)
  3. Top-left: distance pill (`rgba(0,0,0,0.5)` blurred bg)
  4. Top-right: source badges (one or more)
  5. Below badges (when deduped): cyan "⚡ 2 sources" pill
  6. Bottom-left: artist name (bold, large), venue, time
  7. Bottom-right hover: round green CTA (arrow)
- **Hover:** lift 4px, image zoom 1.05, CTA fades in.
- **Featured variant:** spans 2 columns, larger artist type (56px).

### `SourceBadge`

- 22px tall pill, 8px horizontal padding, 6px radius.
- Background = source brand color, text white, uppercase, 700 weight, 11px size, 0.06em tracking.
- Short label (`TM`, `BIT`, `SK`, `BLT`) on cards; full label (`Ticketmaster`, `Bandsintown`) on detail page.

### `DateHeader` (group header)

- Two stacked elements:
  - Weekday in 11px uppercase, 0.16em tracking, muted color.
  - Date in `clamp(64px, 9vw, 140px)` weight 900, with day in Spotify green and month outlined.
- Right column: small text with show count and city summary.
- `position: sticky; top: 64px;` with a vertical fade gradient backing to mask scrolled content.

### `RadiusSelector`

- 4-segment horizontal toggle.
- Active segment: solid Spotify green, black text, no rounded edges between segments.
- Each segment shows value (large, bold) + label (micro overline).
- Country-wide segment shows `NO+` as the value and `Country-wide` as the label.

### `ArtistCard`

- Aspect 1/1.2.
- Image fills top ~70% of card; bottom is a flat info bar on `--surface`.
- Top-left genre pill, top-right exclude toggle (round, blurred bg).
- Excluded state: image desaturated + dimmed, name struck through, toggle red.

### `Toggle` (switch)

- 52×30 pill, 22px thumb, 3px inset.
- Off: `surface-2` bg, white thumb.
- On: Spotify green bg + green border.

### `Stats strip`

- Horizontal row of 4 mini cards separated by 1px borders.
- Tiny uppercase label + 36px bold value.
- Apply Spotify green color to one or two emphasized values per row.

### `Chip` (filter / radius indicator)

- 32px tall pill, 16px horizontal padding.
- Default: surface bg, muted text, subtle border.
- Active: green-tinted bg (`rgba(29,185,84,0.12)`) + green border + green text.

---

## Tailwind theme extension

Drop this into `tailwind.config.ts` under `theme.extend`. Tokens map 1:1 to the names above.

```ts
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        'bg-elevated': '#121212',
        surface: { DEFAULT: '#1E1E1E', 2: '#262626' },
        text: { DEFAULT: '#FFFFFF', muted: '#A0A0A0', dim: '#6E6E6E' },
        spotify: { DEFAULT: '#1DB954', bright: '#1ED760' },
        magenta: '#FF2E88',
        cyan: '#00E5FF',
        gold: '#FFC700',
        source: {
          ticketmaster: '#026CDF',
          bandsintown:  '#FF4F4F',
          songkick:     '#FF6B00',
          billetto:     '#5B3FF5',
        },
      },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      fontSize: {
        hero:     'clamp(80px, 14vw, 220px)',
        display:  'clamp(56px, 8vw, 120px)',
        'h1-fluid': 'clamp(40px, 5vw, 64px)',
        overline: ['11px', { letterSpacing: '0.12em', textTransform: 'uppercase' }],
      },
      letterSpacing: { tighter2: '-0.04em', display: '-0.05em', hero: '-0.06em' },
      borderRadius: { sm: '6px', md: '12px', lg: '20px', xl: '32px', pill: '999px' },
      boxShadow: {
        card: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.55), 0 4px 12px rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      transitionDuration: { fast: '150ms', base: '240ms', slow: '400ms' },
      backgroundImage: {
        'card-overlay': 'linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.4) 45%, rgba(10,10,10,0.95) 100%)',
      },
    },
  },
}
```

### Inter font setup

In `src/app/layout.tsx`:

```tsx
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800','900'], variable: '--font-inter' });
```

Apply `${inter.variable}` to `<html>` and use `font-sans` everywhere.

---

## Accessibility notes

- Color contrast on body text: `#FFFFFF` on `#0A0A0A` = 19.1:1 (AAA).
- Muted text `#A0A0A0` on `#0A0A0A` = 8.5:1 (AAA). Don't go dimmer than `#6E6E6E` for any text that conveys meaning (about 4.6:1, AA).
- Source badge text (`#FFFFFF` on `#026CDF` Ticketmaster) = 4.5:1, AA — acceptable for the badge sizes used.
- Focus rings: use 2px Spotify-green outline with 2px offset on all interactive elements (not shown in static mocks).
- Respect `prefers-reduced-motion: reduce`.
- All concert images need alt text in the real implementation (mocks use empty alt — placeholders).

---

## Asset notes (for implementation)

- Artist images come from Spotify's artist `images[0].url` (typically 640×640). Render in card via `next/image` with `fill` + `object-fit: cover`. Provide an Inter-fallback placeholder for missing images.
- Source SVG icons aren't strictly required — the colored badge alone is recognizable. Optionally include small marks (TM ®, BIT bolt, etc.) as part of the badge content.
- The "noise grain" overlay is a fixed SVG at 4% opacity, mix-blend `overlay`. Don't increase it.
