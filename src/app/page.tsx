import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/nextauth";
import { SignInButton } from "@/components/SignInButton";

const ARTISTS = [
  "SIGUR RÓS",
  "AURORA",
  "THE 1975",
  "RØYKSOPP",
  "TAME IMPALA",
  "PHOEBE BRIDGERS",
  "HONNINGBARNA",
  "KING KRULE",
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <section className="cr-hero">
        <div className="cr-hero__bg" />
        <div className="cr-hero__overlay" />
        <div className="cr-frame cr-hero__content">
          <div className="cr-hero__top">
            <div className="cr-hero__logo">CONCERT RADAR</div>
            <div className="cr-hero__meta">v0.1 mvp</div>
          </div>
          <div>
            <h1 className="cr-hero__title">
              NEVER <span className="word--outline">MISS</span>
              <br />
              <span className="word--accent">A CONCERT</span>{" "}
              <span className="word--magenta">AGAIN.</span>
            </h1>
            <p className="cr-hero__sub">
              Connect Spotify, set your city, and we&apos;ll alert you when your artists announce shows nearby. Ticketmaster and Bandsintown — all in one feed.
            </p>
            <div className="cr-hero__cta-row">
              <SignInButton />
              <span className="cr-hero__legal">No password. Spotify is your login.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="cr-value-props">
        <div className="cr-frame">
          <div className="cr-value-props__grid">
            <div className="cr-vp cr-vp--1">
              <div className="cr-vp__num">01</div>
              <div className="cr-vp__title">Connect Spotify</div>
              <p className="cr-vp__desc">We read your top + followed artists. No password, no separate account, no spam.</p>
            </div>
            <div className="cr-vp cr-vp--2">
              <div className="cr-vp__num">02</div>
              <div className="cr-vp__title">Set your city</div>
              <p className="cr-vp__desc">Pick Bergen, Oslo, anywhere — and choose how far you&apos;ll travel: 25, 50, 100km, or Norway+Nordics.</p>
            </div>
            <div className="cr-vp cr-vp--3">
              <div className="cr-vp__num">03</div>
              <div className="cr-vp__title">Get notified</div>
              <p className="cr-vp__desc">Daily digest or instant email when your artists announce a show in your radius.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="cr-ticker">
        <div className="cr-ticker__inner">
          {[...ARTISTS, ...ARTISTS].map((name, i) => (
            <span key={i} className="cr-ticker__item">
              {name}
              <span className="cr-ticker__dot" />
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
