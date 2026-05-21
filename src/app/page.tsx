import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/nextauth";
import { SignInButton } from "@/components/SignInButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden text-white px-8 pt-32 pb-20 text-center">
        {/* Looping hero video. Scaled up and bottom-anchored so the
            stage-marker artifact in the upper portion of the source
            footage falls outside the visible crop. The hero overflow is
            already hidden by the section. */}
        <video
          aria-hidden
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=2200&q=85"
          className="absolute inset-0 w-full h-full object-cover z-0"
          style={{
            filter: "saturate(0.85) contrast(1.05)",
            transform: "scale(1.4)",
            transformOrigin: "50% 100%",
          }}
        >
          <source src="/concert-radar-hero.mp4" type="video/mp4" />
        </video>
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0,0,0,0.2), rgba(0,0,0,0.7) 90%), linear-gradient(180deg, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.78) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "radial-gradient(ellipse 40% 30% at 50% 50%, rgba(29,185,84,0.18), transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
        {/* Grain overlay */}
        <div
          aria-hidden
          className="absolute inset-0 z-[2] pointer-events-none opacity-[0.18]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Top nav over hero */}
        <nav className="absolute top-0 left-0 right-0 z-[5] flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-2.5 font-semibold text-base tracking-[-0.01em]">
            <span className="w-7 h-7 rounded-lg bg-(--color-green) text-black grid place-items-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </span>
            Concert Radar
          </div>
          <div className="hidden md:flex items-center gap-7 text-sm">
            <a href="#how" className="text-white/75 hover:text-white transition-colors">How it works</a>
            <a href="#features" className="text-white/75 hover:text-white transition-colors">Features</a>
            <a href="#faq" className="text-white/75 hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle tone="dark" />
          </div>
        </nav>

        <div className="relative z-[3] max-w-[880px]">
          <span
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-7"
            style={{
              background: "rgba(29,185,84,0.14)",
              border: "1px solid rgba(29,185,84,0.4)",
              color: "#d6f5e1",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-(--color-green)"
              style={{ boxShadow: "0 0 8px var(--color-green)" }}
            />
            Built on Spotify · Norway, Sweden, Denmark
          </span>
          <h1
            className="font-black leading-[0.96] tracking-[-0.045em] mb-6"
            style={{ fontSize: "clamp(44px, 8vw, 88px)" }}
          >
            Never miss a show
            <br />
            from an artist you
            <br />
            <span style={{ color: "var(--color-green)" }}>actually listen to.</span>
          </h1>
          <p
            className="text-white/75 max-w-[600px] mx-auto mb-10 leading-[1.5]"
            style={{ fontSize: "clamp(17px, 1.8vw, 21px)" }}
          >
            Connect your Spotify, set your city, and we&apos;ll email you when artists you love
            announce a concert near you. No browsing, no algorithms, no spam.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
            <SignInButton />
            <a
              href="https://github.com/nimkimi/concert-radar"
              target="_blank"
              rel="noopener noreferrer"
              className="cr-btn cr-btn--lg cr-btn--pill"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
              View on GitHub
            </a>
          </div>
          <div className="mt-9 inline-flex gap-4 items-center text-[13px] text-white/55">
            Trusted by Spotify users across Norway, Sweden and Denmark.
          </div>
        </div>

      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="border-b border-(--color-border) py-28 px-8">
        <div className="cr-frame">
          <span className="cr-kicker mb-4">How it works</span>
          <h2 className="font-bold tracking-[-0.035em] leading-[1.04] mb-4 max-w-[720px]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
            Three steps. One time.
          </h2>
          <p className="text-[17px] leading-[1.55] text-(--color-text-soft) max-w-[560px]">
            You set this up once. After that, your inbox does the work — we&apos;ll only reach out
            when an artist you actually listen to announces a show within your radius.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-14">
            <Step
              num="01"
              title="Connect Spotify"
              desc="One tap. We read your top artists, your follow list, and the artists hiding in your saved albums. Read-only — we don't touch playlists."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
              }
            />
            <Step
              num="02"
              title="Set your city"
              desc="Bergen, Oslo, Copenhagen, Stockholm — pick a city and a radius (10–500 km, or country-wide). We respect the boundary."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
            <Step
              num="03"
              title="Get the email"
              desc="Daily digest by default, or instant alerts if you can't wait. Each email is a curated short list — never a feed."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="border-b border-(--color-border) py-28 px-8">
        <div className="cr-frame">
          <span className="cr-kicker mb-4">What you get</span>
          <h2 className="font-bold tracking-[-0.035em] leading-[1.04] mb-4 max-w-[720px]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
            A quiet, opinionated layer on top of your listening.
          </h2>
          <p className="text-[17px] leading-[1.55] text-(--color-text-soft) max-w-[560px]">
            We aggregate Ticketmaster and Bandsintown so you don&apos;t have to. Dedupe across sources.
            Match against your real taste, not a billboard.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14">
            <Feature
              wide
              title="Three sources, one list, no duplicates"
              desc="We pull from Ticketmaster, Bandsintown, and (soon) Songkick. The same show isn't going to show up twice — we match by artist, date, and venue, and merge."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              }
            />
            <Feature
              title="You stay in control"
              desc="Exclude artists you don't want to hear about. Change your radius any time. We re-sync from Spotify on demand."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              }
            />
            <Feature
              title="Your data, encrypted at rest"
              desc="Spotify tokens are encrypted in the database with AES-GCM. We never see them in the clear, and we never sell anything."
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ============ DASHBOARD PREVIEW ============ */}
      <section className="border-b border-(--color-border) py-28 px-8">
        <div className="cr-frame">
          <span className="cr-kicker mb-4">Inside the app</span>
          <h2 className="font-bold tracking-[-0.035em] leading-[1.04] mb-4 max-w-[720px]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
            A dashboard that respects your time.
          </h2>
          <p className="text-[17px] leading-[1.55] text-(--color-text-soft) max-w-[560px]">
            The next show you should care about is the first thing you see. Everything else
            groups by urgency — this week, this month, soon, later in the year.
          </p>

          <div
            className="mt-16 cr-card overflow-hidden"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            {/* mac-style chrome */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-(--color-border) bg-(--color-bg-subtle)">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-(--color-border-strong)" />
                <span className="w-2.5 h-2.5 rounded-full bg-(--color-border-strong)" />
                <span className="w-2.5 h-2.5 rounded-full bg-(--color-border-strong)" />
              </div>
              <div className="flex-1 text-center text-xs text-(--color-text-dim)">
                concert-radar.app/dashboard
              </div>
              <div className="w-10" />
            </div>

            <div className="p-8">
              <div className="flex justify-between items-end mb-7">
                <div>
                  <h4 className="text-[22px] font-bold tracking-[-0.02em]">
                    6 upcoming shows <span className="text-(--color-green)">near Bergen</span>
                  </h4>
                  <div className="text-xs text-(--color-text-dim) mt-1">
                    Last synced 4 minutes ago · within 50 km · 12 artists tracked
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-(--color-bg-subtle) text-(--color-text-soft)">
                  ⟳ Sync now
                </span>
              </div>

              {/* Hero card */}
              <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 p-5 rounded-xl bg-(--color-bg-subtle) mb-7">
                <div
                  className="aspect-square rounded-lg bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url(https://upload.wikimedia.org/wikipedia/commons/9/92/Sigrid_p%C3%A5_scenen_i_Oslo_Spektrum_i_2022._211328.jpg)",
                  }}
                />
                <div className="flex flex-col justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-(--color-green) mb-1.5">
                      ↑ Up next · in 11 days
                    </div>
                    <div className="text-[28px] font-bold tracking-[-0.025em] mb-3">Sigrid</div>
                    <div className="text-sm text-(--color-text-soft) leading-[1.7]">
                      <strong className="text-(--color-text) font-medium">USF Verftet</strong>, Bergen<br />
                      Fri, May 29 · 20:30 · 3 km from you
                    </div>
                  </div>
                  <div className="flex gap-2.5 mt-4">
                    <span className="bg-(--color-green) text-black px-3.5 py-2 rounded-full text-[13px] font-semibold">
                      Get tickets →
                    </span>
                    <span className="bg-(--color-bg-elev) border border-(--color-border) text-(--color-text-soft) px-3.5 py-2 rounded-full text-[13px] font-medium">
                      Share
                    </span>
                  </div>
                </div>
              </div>

              {/* Later in 2026 row */}
              <div className="cr-section-label mb-3">
                Later in 2026 <span className="count">3</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: "Slowdive", meta: "Sentrum Scene · Aug 22", img: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Slowdive_live_1992.jpg" },
                  { name: "Big Thief", meta: "Hulen · Oct 14", img: "https://upload.wikimedia.org/wikipedia/commons/3/31/Big_Thief_performing_at_The_National%27s_Homecoming_festival_in_Cincinnati%2C_Ohio_-_April_29%2C_2018.jpg" },
                  { name: "Mitski", meta: "Olavshallen · Nov 5", img: "https://upload.wikimedia.org/wikipedia/commons/a/ac/MitskiUnionChap111023_%2813_of_30%29_%2853252051563%29_%28cropped%29_2.jpg" },
                ].map((c) => (
                  <div key={c.name} className="rounded-lg overflow-hidden bg-(--color-bg-subtle)">
                    <div
                      className="aspect-[16/10] bg-cover bg-center"
                      style={{ backgroundImage: `url(${c.img})` }}
                    />
                    <div className="px-3 py-2.5">
                      <div className="text-[13px] font-semibold">{c.name}</div>
                      <div className="text-[11px] text-(--color-text-dim) mt-0.5">{c.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ EMAIL PREVIEW ============ */}
      <section className="border-b border-(--color-border) py-28 px-8">
        <div className="cr-frame">
          <span className="cr-kicker mb-4">Email is first class</span>
          <h2 className="font-bold tracking-[-0.035em] leading-[1.04] mb-4 max-w-[720px]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
            Designed to be read, not skimmed.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-12 items-start mt-16">
            <div>
              <p className="text-[15px] leading-[1.6] text-(--color-text-soft) mb-5">
                Most users open Concert Radar via the email, not the app. So the email has to carry its weight.
              </p>
              <ul className="list-none">
                {[
                  "Renders identically in Gmail, Apple Mail, Outlook, Proton.",
                  "Dark mode aware — no white-text-on-white nightmares.",
                  "Table-based for client compatibility, but doesn't look like it.",
                  "One link per concert, no tracking pixels, no dark patterns.",
                ].map((line) => (
                  <li
                    key={line}
                    className="relative text-sm text-(--color-text-soft) py-2 pl-7 border-b border-(--color-border)"
                  >
                    <span
                      className="absolute left-0 top-3.5 w-3 h-3 rounded-full"
                      style={{
                        background: "var(--color-green-soft)",
                        border: "2px solid var(--color-green)",
                      }}
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="cr-card overflow-hidden"
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div className="px-4.5 py-3.5 border-b border-(--color-border) text-xs text-(--color-text-dim)">
                From <strong className="text-(--color-text) font-medium">alerts@concert-radar.app</strong> · 07:00
              </div>
              <div className="p-6">
                <div className="text-[11px] font-bold tracking-[0.16em] text-(--color-green) mb-4">
                  CONCERT RADAR
                </div>
                <h4 className="text-[22px] font-bold tracking-[-0.02em] leading-[1.15] mb-2">
                  2 new shows landed.
                </h4>
                <p className="text-[13px] text-(--color-text-soft) mb-5">
                  Hi Nima — artists you track are playing within your radius this week.
                </p>

                {[
                  { name: "Sigrid · USF Verftet, Bergen", meta: "Fri, May 29 · 20:30", img: "https://upload.wikimedia.org/wikipedia/commons/9/92/Sigrid_p%C3%A5_scenen_i_Oslo_Spektrum_i_2022._211328.jpg", cta: true },
                  { name: "Aurora · Bergenhus Festning", meta: "Sat, Jun 13 · 21:00", img: "https://upload.wikimedia.org/wikipedia/commons/6/65/AURORA%2C_Ravnedalen_Live_festival%2C_Kristiansand%2C_Norway_%2853867200364%29_%28cropped%29.jpg", cta: false },
                ].map((c) => (
                  <div key={c.name} className="border border-(--color-border) rounded-xl overflow-hidden mb-3 last:mb-0">
                    <div
                      className="h-[120px] bg-cover bg-center"
                      style={{ backgroundImage: `url(${c.img})` }}
                    />
                    <div className="px-3.5 py-3">
                      <div className="text-sm font-semibold">{c.name}</div>
                      <div className="text-[11px] text-(--color-text-dim) mt-0.5">{c.meta}</div>
                      {c.cta && (
                        <span className="inline-block bg-(--color-green) text-black px-3 py-1.5 rounded-md text-[12px] font-semibold mt-2">
                          Get tickets →
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="border-b border-(--color-border) py-28 px-8">
        <div className="cr-frame">
          <span className="cr-kicker mb-4">Questions</span>
          <h2 className="font-bold tracking-[-0.035em] leading-[1.04] mb-12 max-w-[720px]" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>
            Frequently asked.
          </h2>
          <div className="max-w-[720px]">
            <Faq q="Is it free?" a="Yes. Concert Radar is a portfolio project. The Spotify connection is read-only and we run on free tiers — there are no plans to charge or sell data." defaultOpen />
            <Faq q="Which countries does it cover?" a="Norway, Sweden and Denmark out of the box. Concerts from Ticketmaster and Bandsintown are pulled daily. More countries are easy to enable — we just haven't yet." />
            <Faq q="How often will I get emailed?" a="By default: a daily digest only if there's something new. If nothing's been announced, no email. You can switch to instant alerts in settings." />
            <Faq q="Can I exclude specific artists?" a="Yes — go to the Artists page, hover any artist, and hit hide. We'll respect that until you unhide them." />
            <Faq q="What does Concert Radar know about me?" a="Your Spotify ID, email, city, and a list of artists you listen to. That's it. Tokens are encrypted at rest. We don't track clicks in emails and we don't share data with anyone." />
            <Faq q="Why does it have to be Spotify?" a="Spotify gives us your real listening data — that's what makes the recommendations precise. Apple Music + Last.fm support is on the roadmap but not built yet." />
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="px-8 py-14">
        <div className="cr-frame grid grid-cols-1 md:grid-cols-3 gap-10">
          <div className="text-(--color-text-dim) text-[13px] leading-[1.6] max-w-[280px]">
            <div className="w-8 h-8 rounded-lg bg-(--color-green) text-black grid place-items-center mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="4" />
              </svg>
            </div>
            <div className="text-base font-semibold text-(--color-text) mb-1.5 tracking-[-0.01em]">Concert Radar</div>
            A portfolio project by an engineer who got tired of finding out about shows the week after.
          </div>
          <div>
            <div className="cr-section-label mb-4">Product</div>
            <FootLink href="#how">How it works</FootLink>
            <FootLink href="#features">Features</FootLink>
            <FootLink href="#faq">FAQ</FootLink>
          </div>
          <div>
            <div className="cr-section-label mb-4">About</div>
            <FootLink href="https://github.com/nimkimi/concert-radar">GitHub</FootLink>
            <FootLink href="/privacy">Privacy</FootLink>
            <FootLink href="mailto:hi@concert-radar.app">Contact</FootLink>
          </div>
          <div className="md:col-span-3 pt-8 mt-2 border-t border-(--color-border) flex justify-between text-xs text-(--color-text-dim)">
            <span>© 2026 Concert Radar · Not affiliated with Spotify.</span>
            <span>
              <Link href="/dashboard" className="hover:text-(--color-green) transition-colors">
                Sign in →
              </Link>
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ====== local components ====== */

function Step({
  num,
  title,
  desc,
  icon,
}: {
  num: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="cr-card cr-card--lift p-8">
      <div className="text-[13px] font-semibold text-(--color-green) tracking-[0.04em] mb-6">Step {num}</div>
      <div
        className="w-12 h-12 rounded-xl grid place-items-center mb-5"
        style={{ background: "var(--color-green-soft)", color: "var(--color-green)" }}
      >
        <span style={{ display: "inline-block", width: 22, height: 22 }}>{icon}</span>
      </div>
      <h3 className="text-[19px] font-semibold tracking-[-0.018em] mb-2">{title}</h3>
      <p className="text-sm leading-[1.55] text-(--color-text-soft)">{desc}</p>
    </div>
  );
}

function Feature({
  title,
  desc,
  icon,
  wide = false,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`cr-card cr-card--lift p-9 ${wide ? "md:col-span-2" : ""}`}>
      <div
        className="w-10 h-10 rounded-lg grid place-items-center mb-5"
        style={{ background: "var(--color-bg-subtle)", color: "var(--color-text)" }}
      >
        <span style={{ display: "inline-block", width: 20, height: 20 }}>{icon}</span>
      </div>
      <h3 className="text-xl font-semibold tracking-[-0.02em] mb-2">{title}</h3>
      <p className="text-sm leading-[1.55] text-(--color-text-soft)">{desc}</p>
    </div>
  );
}

function Faq({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  return (
    <details
      open={defaultOpen}
      className="border-b border-(--color-border) py-5 group"
    >
      <summary className="list-none cursor-pointer flex justify-between items-center text-[17px] font-medium tracking-[-0.01em]">
        {q}
        <span className="text-2xl font-light text-(--color-text-dim) transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3.5 text-[15px] leading-[1.6] text-(--color-text-soft) pr-15">{a}</p>
    </details>
  );
}

function FootLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block text-sm text-(--color-text-soft) hover:text-(--color-green) transition-colors py-1">
      {children}
    </Link>
  );
}
