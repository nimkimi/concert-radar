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

const RADIUS_OPTIONS: { value: RadiusValue; label: string }[] = [
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
  { value: 9999, label: "Country-wide" },
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
    if (
      !window.confirm(
        "Permanently delete your Concert Radar account?\n\nThis removes your tracked artists, " +
          "notification history, and stored Spotify tokens. This action cannot be undone.",
      )
    ) {
      return;
    }
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) {
      window.alert("Couldn't delete the account — please try again.");
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* LOCATION */}
      <Panel
        title="Where you live"
        sub="We use this to compute distance to each venue and to filter the daily sync."
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="city" className="text-[13px] font-medium text-(--color-text-soft)">
            City
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-(--color-text-dim) pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <input
              id="city"
              className="w-full pl-10 pr-4 py-3 bg-(--color-bg) border border-(--color-border) rounded-lg text-(--color-text) text-sm font-medium outline-none focus:border-(--color-green) hover:border-(--color-border-strong) transition-colors"
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
              <div
                className="absolute top-[calc(100%+6px)] left-0 right-0 bg-(--color-bg-elev) border border-(--color-border) rounded-lg p-1.5 z-10"
                style={{ boxShadow: "var(--shadow-md)" }}
              >
                {suggestions.map((p, i) => (
                  <button
                    key={`${p.name}-${p.lat}-${p.lon}-${i}`}
                    type="button"
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-md hover:bg-(--color-bg-subtle) text-left text-sm"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      chooseCity(p);
                    }}
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-(--color-text-dim)">
                      {COUNTRY_NAME[p.country] ?? p.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <span className="text-xs text-(--color-text-dim)">
              Pinned to {selected.lat.toFixed(3)}, {selected.lon.toFixed(3)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5 mt-5">
          <label className="text-[13px] font-medium text-(--color-text-soft)">Radius</label>
          <div className="flex gap-1 p-1 bg-(--color-bg-subtle) rounded-xl">
            {RADIUS_OPTIONS.map((opt) => {
              const active = radius === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRadius(opt.value)}
                  className={`flex-1 py-2.5 px-3 rounded-lg text-[13px] font-medium transition-all ${
                    active
                      ? "bg-(--color-bg-elev) text-(--color-text)"
                      : "bg-transparent text-(--color-text-soft) hover:text-(--color-text)"
                  }`}
                  style={active ? { boxShadow: "0 1px 3px rgba(0,0,0,0.06)" } : undefined}
                  aria-pressed={active}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-(--color-text-dim) mt-0.5">
            Country-wide pulls events from Norway, Sweden, and Denmark.
          </span>
        </div>
      </Panel>

      {/* NOTIFICATIONS */}
      <Panel
        title="Email notifications"
        sub="When and how we reach out. We never email when there's nothing to say."
      >
        <ToggleRow
          label="Notifications"
          sub="Master switch. Turn this off and we'll stop emailing entirely."
          value={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />

        <div className="flex flex-col gap-1.5 mt-5">
          <label className="text-[13px] font-medium text-(--color-text-soft)">Frequency</label>
          <div className="flex flex-col gap-2">
            {(
              [
                {
                  v: "DAILY_DIGEST",
                  title: "Daily digest",
                  desc: "One email per day at 07:00 — only when there's new shows.",
                  meta: "07:00 CEST",
                },
                {
                  v: "INSTANT",
                  title: "Instant alerts",
                  desc: "The moment a new show drops, you get an email.",
                  meta: "Real-time",
                },
              ] as const
            ).map((o) => {
              const active = frequency === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setFrequency(o.v)}
                  disabled={!notificationsEnabled}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    active
                      ? "border-(--color-green) bg-(--color-green-soft)"
                      : "border-(--color-border) hover:border-(--color-border-strong)"
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 relative ${
                      active
                        ? "border-2 border-(--color-green)"
                        : "border-2 border-(--color-border-strong)"
                    }`}
                  >
                    {active && (
                      <span
                        className="absolute rounded-full"
                        style={{
                          inset: 2,
                          background: "var(--color-green)",
                        }}
                      />
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{o.title}</span>
                    <span className="block text-[13px] text-(--color-text-dim) mt-0.5">{o.desc}</span>
                  </span>
                  <span className="text-xs text-(--color-text-dim) font-medium">{o.meta}</span>
                </button>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* ACCOUNT */}
      <Panel
        title="Connected account"
        sub="Read-only Spotify connection. We never modify your playlists or library."
      >
        <div className="flex items-center gap-3.5 p-4 rounded-lg bg-(--color-bg) border border-(--color-border)">
          <div
            className="w-9 h-9 rounded-full flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, var(--color-green), #19a448)",
            }}
            aria-hidden
          />
          <div className="flex-1">
            <div className="text-sm font-medium">
              {initial.displayName ?? "Spotify user"}
            </div>
            <div className="text-xs text-(--color-text-dim) mt-0.5">
              {initial.email || "no email on Spotify profile"}
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-(--color-green) px-2.5 py-1 rounded-full bg-(--color-green-soft)">
            <span className="w-1.5 h-1.5 rounded-full bg-(--color-green)" />
            Connected
          </span>
        </div>
      </Panel>

      {/* DANGER */}
      <Panel
        title="Danger zone"
        sub="These actions can't be undone."
        danger
      >
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="text-sm font-medium">Delete account</h3>
            <p className="text-[13px] text-(--color-text-dim) mt-0.5 leading-[1.5]">
              Removes your account, history, encrypted tokens, and all notification logs. Permanent.
            </p>
          </div>
          <button type="button" onClick={deleteAccount} className="cr-btn cr-btn--danger flex-shrink-0">
            Delete account
          </button>
        </div>
      </Panel>

      {/* SAVE BAR */}
      <div
        className="sticky bottom-6 flex justify-end gap-2.5 p-3 mt-6 bg-(--color-bg-elev) border border-(--color-border) rounded-xl"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {status === "saved" && (
          <span className="text-sm text-(--color-green) font-medium px-3 self-center">
            ✓ Saved
          </span>
        )}
        {status === "error" && (
          <span className="text-sm text-(--color-red) px-3 self-center">
            {selected ? "Something went wrong" : "Pick a city first"}
          </span>
        )}
        <button type="button" className="cr-btn cr-btn--secondary">
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending || !selected}
          className="cr-btn cr-btn--primary"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  sub,
  children,
  danger = false,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`cr-card overflow-hidden ${
        danger ? "border-[rgba(217,45,32,0.25)] dark:border-[rgba(248,113,113,0.25)]" : ""
      }`}
    >
      <div className="px-6 py-5 border-b border-(--color-border)">
        <h2 className={`text-base font-semibold tracking-[-0.015em] ${danger ? "text-(--color-red)" : ""}`}>
          {title}
        </h2>
        <p className="text-[13px] text-(--color-text-dim) mt-1">{sub}</p>
      </div>
      <div className="px-6 py-6 flex flex-col gap-5">{children}</div>
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
    <div className="flex items-start justify-between gap-6">
      <div>
        <h3 className="text-sm font-medium">{label}</h3>
        <p className="text-[13px] text-(--color-text-dim) mt-0.5 leading-[1.5]">{sub}</p>
      </div>
      <button
        type="button"
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className="cr-switch flex-shrink-0 mt-0.5"
        aria-label="Toggle notifications"
      />
    </div>
  );
}
