"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Place } from "@/lib/nominatim";

type RadiusValue = 25 | 50 | 100 | 9999;
type Frequency = "INSTANT" | "DAILY_DIGEST";

export type SettingsInitial = {
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  notificationsEnabled: boolean;
  notificationFrequency: Frequency;
  displayName: string | null;
  email: string | null;
};

const RADIUS_OPTIONS: { value: RadiusValue; display: string; label: string }[] = [
  { value: 25, display: "25", label: "km" },
  { value: 50, display: "50", label: "km" },
  { value: 100, display: "100", label: "km" },
  { value: 9999, display: "NO+", label: "Country-wide" },
];

const COUNTRY_NAME: Record<string, string> = {
  NO: "Norway",
  SE: "Sweden",
  DK: "Denmark",
};

function normalizeInitialRadius(km: number): RadiusValue {
  if (km <= 25) return 25;
  if (km <= 50) return 50;
  if (km <= 100) return 100;
  return 9999;
}

export function SettingsForm({ initial }: { initial: SettingsInitial }) {
  const [cityQuery, setCityQuery] = useState(initial.cityName ?? "");
  const [selected, setSelected] = useState<Place | null>(
    initial.cityName && initial.latitude != null && initial.longitude != null
      ? { name: initial.cityName, lat: initial.latitude, lon: initial.longitude, country: "NO" }
      : null,
  );
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [radius, setRadius] = useState<RadiusValue>(normalizeInitialRadius(initial.radiusKm));
  const [notificationsEnabled, setNotificationsEnabled] = useState(initial.notificationsEnabled);
  const [frequency, setFrequency] = useState<Frequency>(initial.notificationFrequency);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pending, startTransition] = useTransition();

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = cityQuery.trim();
    if (q.length < 2 || q === selected?.name) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const places = (await res.json()) as Place[];
        setSuggestions(places);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [cityQuery, selected]);

  function chooseCity(p: Place) {
    setSelected(p);
    setCityQuery(p.name);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function save() {
    if (!selected) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cityName: selected.name,
          latitude: selected.lat,
          longitude: selected.lon,
          radiusKm: radius,
          notificationsEnabled,
          notificationFrequency: frequency,
        }),
      });
      setStatus(res.ok ? "saved" : "error");
      if (res.ok) window.setTimeout(() => setStatus("idle"), 2000);
    });
  }

  async function deleteAccount() {
    if (!window.confirm("Permanently delete your Concert Radar account? This can't be undone.")) {
      return;
    }
    // Wired up in issue #14. For now, no-op + alert.
    window.alert("Account deletion ships in a later release.");
  }

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr] pb-16">
      <nav
        className="hidden md:flex flex-col gap-1 border-l border-(--color-border) pl-4 sticky top-24 self-start"
        aria-label="Settings sections"
      >
        {[
          ["#location", "Location", true],
          ["#radius", "Radius", false],
          ["#notifications", "Notifications", false],
          ["#account", "Account", false],
          ["#danger", "Danger zone", false],
        ].map(([href, label, active]) => (
          <a
            key={href as string}
            href={href as string}
            className={
              active
                ? "py-2 text-sm font-semibold border-l-2 border-(--color-spotify) -ml-4 pl-4 text-(--color-text)"
                : "py-2 text-sm text-(--color-text-muted) hover:text-(--color-text)"
            }
          >
            {label}
          </a>
        ))}
      </nav>

      <div>
        <Section id="location" title="Location" desc="Your home city. We use this to calculate the distance to every concert. Start typing to search; we cover Norway, Sweden, and Denmark.">
          <div className="relative max-w-[480px]">
            <input
              className="w-full h-14 px-5 bg-(--color-surface) border border-(--color-border-strong) rounded-(--radius-md) text-(--color-text) text-lg font-semibold outline-none focus:border-(--color-spotify) transition-colors"
              type="text"
              value={cityQuery}
              placeholder="Search for your city…"
              onChange={(e) => {
                setCityQuery(e.target.value);
                setShowSuggestions(true);
                if (selected && e.target.value !== selected.name) setSelected(null);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
              aria-autocomplete="list"
              aria-expanded={showSuggestions && suggestions.length > 0}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-(--color-surface) border border-(--color-border-strong) rounded-(--radius-md) overflow-hidden z-10">
                {suggestions.map((p, i) => (
                  <button
                    key={`${p.name}-${p.lat}-${p.lon}-${i}`}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 border-t border-(--color-border) first:border-t-0 hover:bg-(--color-surface-2) text-left"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chooseCity(p);
                    }}
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs text-(--color-text-muted)">
                      {COUNTRY_NAME[p.country] ?? p.country} · {p.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <p className="mt-3 text-xs text-(--color-text-muted)">
              Pinned to {selected.lat.toFixed(3)}, {selected.lon.toFixed(3)}
            </p>
          )}
        </Section>

        <Section id="radius" title="Radius" desc="How far you'll travel. Country-wide includes Sweden + Denmark (Copenhagen, Stockholm and beyond).">
          <div className="grid grid-cols-4 bg-(--color-surface) border border-(--color-border-strong) rounded-(--radius-md) overflow-hidden max-w-[600px]">
            {RADIUS_OPTIONS.map((opt, idx) => {
              const active = radius === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRadius(opt.value)}
                  className={
                    "flex flex-col items-center justify-center px-3 py-4 transition-colors cursor-pointer " +
                    (idx < RADIUS_OPTIONS.length - 1 ? "border-r border-(--color-border) " : "") +
                    (active
                      ? "bg-(--color-spotify) text-black"
                      : "hover:bg-(--color-surface-2)")
                  }
                  aria-pressed={active}
                >
                  <span className="text-2xl font-extrabold tracking-tight">{opt.display}</span>
                  <span
                    className={
                      "text-[11px] uppercase tracking-[0.1em] mt-0.5 " +
                      (active ? "text-black/70" : "text-(--color-text-muted)")
                    }
                  >
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        <Section id="notifications" title="Notifications" desc="When we find a new concert by an artist you follow, how do you want to hear about it?">
          <ToggleRow
            label="Email notifications"
            sub="Master switch. When off, we sync but stay silent."
            value={notificationsEnabled}
            onChange={setNotificationsEnabled}
          />
          <div className="mt-5">
            <div className="text-base font-semibold mb-3">Frequency</div>
            <div className="grid grid-cols-2 bg-(--color-surface) border border-(--color-border-strong) rounded-(--radius-md) overflow-hidden max-w-[480px]">
              {([
                { v: "DAILY_DIGEST", t: "Daily digest", d: "One email per day. Only if there's new stuff." },
                { v: "INSTANT", t: "Instant", d: "One email per concert as we find it." },
              ] as const).map((o, i) => {
                const active = frequency === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    disabled={!notificationsEnabled}
                    onClick={() => setFrequency(o.v)}
                    className={
                      "px-5 py-4 text-left transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed " +
                      (i === 0 ? "border-r border-(--color-border) " : "") +
                      (active
                        ? "bg-(--color-spotify) text-black"
                        : "hover:bg-(--color-surface-2)")
                    }
                    aria-pressed={active}
                  >
                    <div className="font-bold text-[15px]">{o.t}</div>
                    <div
                      className={
                        "text-xs mt-0.5 " +
                        (active ? "text-black/70" : "text-(--color-text-muted)")
                      }
                    >
                      {o.d}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section id="account" title="Account" desc="Authenticated via Spotify. Your email comes from your Spotify profile and can't be edited here.">
          <div className="flex items-center gap-4 p-5 border border-(--color-border) rounded-(--radius-md) bg-(--color-surface) max-w-[600px]">
            <div
              className="w-14 h-14 rounded-full"
              style={{
                background:
                  "linear-gradient(135deg, var(--color-magenta), var(--color-spotify))",
              }}
              aria-hidden
            />
            <div>
              <div className="font-bold text-[17px]">{initial.displayName ?? "Spotify user"}</div>
              <div className="text-xs text-(--color-text-muted) mt-0.5">
                {initial.email || "no email on Spotify profile"}
              </div>
            </div>
            <div className="ml-auto text-xs text-(--color-spotify-bright) flex items-center gap-2">
              <span
                aria-hidden
                className="w-2 h-2 rounded-full bg-(--color-spotify-bright)"
              />
              Connected
            </div>
          </div>
        </Section>

        <section
          id="danger"
          className="pb-7"
          aria-labelledby="danger-title"
        >
          <h2
            id="danger-title"
            className="text-[28px] font-extrabold tracking-tight text-(--color-source-bandsintown)"
          >
            Danger zone
          </h2>
          <p className="text-sm text-(--color-text-muted) mt-2 mb-5 max-w-[560px] leading-relaxed">
            Deleting your account removes your tracked artists, notification history, and Spotify tokens. Concerts other people might be tracking stay in the database.
          </p>
          <div
            className="p-5 border rounded-(--radius-md) max-w-[600px]"
            style={{
              borderColor: "var(--color-source-bandsintown)",
              background: "rgba(255, 79, 79, 0.06)",
            }}
          >
            <div className="font-bold text-(--color-source-bandsintown)">
              Disconnect Spotify & delete account
            </div>
            <div className="text-xs text-(--color-text-muted) mt-2 mb-4 leading-relaxed">
              This action cannot be undone. You'll have to reconnect Spotify and re-sync your artists to come back.
            </div>
            <button type="button" className="cr-btn cr-btn--danger" onClick={deleteAccount}>
              Delete my account
            </button>
          </div>
        </section>

        <div className="sticky bottom-0 mt-10 -mx-8 px-8 py-4 bg-(--color-bg)/85 backdrop-blur border-t border-(--color-border) flex items-center gap-4 z-10">
          <button
            type="button"
            onClick={save}
            disabled={pending || !selected}
            className="cr-btn cr-btn--primary disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" && (
            <span className="text-sm text-(--color-spotify-bright)">Saved.</span>
          )}
          {status === "error" && (
            <span className="text-sm text-(--color-source-bandsintown)">
              {selected ? "Something went wrong. Try again." : "Pick a city first."}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  desc,
  children,
}: {
  id: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="pb-7 border-b border-(--color-border) mb-7"
    >
      <h2 className="text-[28px] font-extrabold tracking-tight">{title}</h2>
      <p className="text-sm text-(--color-text-muted) mt-2 mb-5 max-w-[560px] leading-relaxed">
        {desc}
      </p>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex justify-between items-center py-4">
      <div>
        <div className="text-base font-semibold">{label}</div>
        <div className="text-[13px] text-(--color-text-muted) mt-0.5">{sub}</div>
      </div>
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={
          "relative w-[52px] h-[30px] rounded-full cursor-pointer transition-colors border " +
          (value
            ? "bg-(--color-spotify) border-(--color-spotify)"
            : "bg-(--color-surface-2) border-(--color-border-strong)")
        }
      >
        <span
          aria-hidden
          className={
            "absolute top-[3px] left-[3px] w-[22px] h-[22px] rounded-full bg-white transition-transform " +
            (value ? "translate-x-[22px]" : "translate-x-0")
          }
        />
      </button>
    </div>
  );
}
