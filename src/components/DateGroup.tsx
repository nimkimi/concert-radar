import type { ReactNode } from "react";

export type DateGroupProps = {
  weekday: string;
  day: string;
  month: string;
  rightLabel?: string;
  children: ReactNode;
};

export function DateGroup({ weekday, day, month, rightLabel, children }: DateGroupProps) {
  return (
    <section className="mb-12">
      <div
        className="grid grid-cols-[1fr_auto] items-end py-5 sticky z-10"
        style={{
          top: 64,
          background: "linear-gradient(180deg, var(--color-bg) 70%, transparent)",
        }}
      >
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-(--color-text-muted) font-bold">
            {weekday}
          </div>
          <div
            className="font-black leading-[0.85] tracking-[-0.05em]"
            style={{ fontSize: "clamp(48px, 7vw, 96px)" }}
          >
            <span className="text-(--color-spotify)">{day}</span>
            <span
              className="ml-1"
              style={{
                WebkitTextStroke: "1.5px var(--color-text)",
                color: "transparent",
              }}
            >
              {month}
            </span>
          </div>
        </div>
        {rightLabel && (
          <div className="text-right text-[13px] text-(--color-text-muted)">{rightLabel}</div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{children}</div>
    </section>
  );
}
