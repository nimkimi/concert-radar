// Time-horizon grouping for the dashboard feed.
//
// Date-by-date headers fall apart on a sparse feed (one concert per day
// across nine months produces nine headers with one item each). Bucket by
// urgency instead — empty buckets are dropped at the call site.

export type Horizon =
  | "this-week"
  | "this-month"
  | "soon"
  | "later-this-year"
  | "next-year"
  | "beyond";

export type HorizonMeta = {
  id: Horizon;
  title: string;
  helper: string;
};

export function horizonFor(eventDate: Date, now: Date = new Date()): Horizon {
  const ms = eventDate.getTime() - now.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  if (days <= 7) return "this-week";

  // "This month" = remaining days of the current calendar month.
  if (
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth()
  ) {
    return "this-month";
  }

  if (days <= 60) return "soon";

  if (eventDate.getFullYear() === now.getFullYear()) return "later-this-year";
  if (eventDate.getFullYear() === now.getFullYear() + 1) return "next-year";
  return "beyond";
}

const ORDER: Horizon[] = [
  "this-week",
  "this-month",
  "soon",
  "later-this-year",
  "next-year",
  "beyond",
];

export function metaFor(h: Horizon, now: Date = new Date()): HorizonMeta {
  const currentYear = now.getFullYear();
  switch (h) {
    case "this-week":
      return { id: h, title: "This week", helper: "next 7 days" };
    case "this-month":
      return {
        id: h,
        title: "This month",
        helper: `rest of ${now.toLocaleString("en", { month: "long" })}`,
      };
    case "soon":
      return { id: h, title: "Soon", helper: "in the next 60 days" };
    case "later-this-year":
      return { id: h, title: `Later in ${currentYear}`, helper: "" };
    case "next-year":
      return { id: h, title: String(currentYear + 1), helper: "" };
    case "beyond":
      return { id: h, title: `${currentYear + 2} and beyond`, helper: "" };
  }
}

// Group an ordered list of concert-shaped items into horizon buckets,
// preserving the input order within each bucket. Empty buckets are
// omitted. Caller supplies an accessor for the event date so this helper
// is independent of the dedup-group shape.
export function groupByHorizon<T>(
  items: T[],
  getDate: (item: T) => Date,
  now: Date = new Date(),
): Array<{ horizon: Horizon; meta: HorizonMeta; items: T[] }> {
  const buckets = new Map<Horizon, T[]>();
  for (const item of items) {
    const h = horizonFor(getDate(item), now);
    const list = buckets.get(h);
    if (list) list.push(item);
    else buckets.set(h, [item]);
  }
  const out: Array<{ horizon: Horizon; meta: HorizonMeta; items: T[] }> = [];
  for (const h of ORDER) {
    const list = buckets.get(h);
    if (!list || list.length === 0) continue;
    out.push({ horizon: h, meta: metaFor(h, now), items: list });
  }
  return out;
}
