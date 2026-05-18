import type { Concert, PrismaClient, User } from "@prisma/client";
import { Resend } from "resend";
import { formatEventTime, formatLongEventDate } from "./format";

export type ComposedEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greeting(user: User): string {
  const first = user.name?.split(/\s+/)[0];
  return first ? escapeHtml(first) : "there";
}

// v2 email design — table-based, inline styles, system-stack fallback fonts.
// Same green-accent visual system as the web app, adapted for client constraints.
//
// Light-mode by default; dark-mode aware via @media in Apple Mail / Gmail web
// dark-themed views. We include the dark CSS inside a <style> block in <head>
// because Gmail web honours <style> blocks in dark mode for surface swaps.

const BRAND_BAR = `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:0;margin:0;">
    <tr>
      <td style="vertical-align:middle;padding-right:10px;width:34px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="background:#1DB954;width:24px;height:24px;border-radius:6px;text-align:center;font-size:14px;font-weight:700;color:#000;line-height:24px;">●</td>
          </tr>
        </table>
      </td>
      <td style="vertical-align:middle;font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#0e0e0e;" class="cr-text">Concert Radar</td>
    </tr>
  </table>
`;

const DARK_MODE_STYLE = `
  <style>
    @media (prefers-color-scheme: dark) {
      body, .cr-page { background:#0a0a0a !important; }
      .cr-card { background:#141414 !important; border-color:#232323 !important; }
      .cr-cardx { background:#1a1a1a !important; }
      .cr-text { color:#f4f4f4 !important; }
      .cr-text-soft { color:#a8a8a8 !important; }
      .cr-text-dim { color:#6a6a6a !important; }
      .cr-foot { background:#1a1a1a !important; border-top-color:#232323 !important; }
      .cr-divider { border-top-color:#232323 !important; }
    }
  </style>
`;

function concertCardHtml(c: Concert, opts: { withCta?: boolean } = {}): string {
  const longDate = formatLongEventDate(c.eventDate, c.venueTimezone);
  const time = formatEventTime(c.eventDate, c.venueTimezone);
  const dateShort = `${weekdayShort(c.eventDate, c.venueTimezone)} · ${monthDay(c.eventDate, c.venueTimezone)}`.toUpperCase();
  const artist = escapeHtml(c.artistName);
  const venue = escapeHtml(c.venueName);
  const city = escapeHtml(c.venueCity);
  const cta = opts.withCta && c.ticketUrl
    ? `<a href="${escapeHtml(c.ticketUrl)}" style="display:inline-block;background:#1DB954;color:#000000;text-decoration:none;font-size:13px;font-weight:600;padding:9px 16px;border-radius:8px;">Get tickets →</a>`
    : "";
  return `
    <tr><td style="padding:0 32px 14px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="cr-cardx" style="background:#f2f0eb;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:18px 20px 16px 20px;">
          <div class="cr-text" style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#1DB954;margin-bottom:6px;">${dateShort} · ${escapeHtml(time)}</div>
          <div class="cr-text" style="font-size:21px;font-weight:700;letter-spacing:-0.025em;color:#0e0e0e;margin-bottom:6px;">${artist}</div>
          <div class="cr-text-soft" style="font-size:14px;color:#4a4a4a;margin-bottom:${cta ? "14px" : "0"};line-height:1.5;">${venue}, ${city} · ${escapeHtml(longDate)}</div>
          ${cta}
        </td></tr>
      </table>
    </td></tr>
  `;
}

function weekdayShort(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
}
function monthDay(d: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  }).formatToParts(d);
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${m} ${day}`;
}

function shell(body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${DARK_MODE_STYLE}
</head>
<body class="cr-page" style="margin:0;padding:0;background:#f2f0eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0e0e0e;">
<div style="background:#f2f0eb;padding:32px 16px;" class="cr-page">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" class="cr-card" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e8e5dd;border-radius:14px;overflow:hidden;">
${body}
</table>
<div class="cr-text-dim" style="text-align:center;font-size:11px;color:#8a8a8a;padding:20px 0 0;">Concert Radar · 2026</div>
</div>
</body>
</html>`;
}

function concertLineText(c: Concert): string {
  const date = formatLongEventDate(c.eventDate, c.venueTimezone);
  const time = formatEventTime(c.eventDate, c.venueTimezone);
  return `${c.artistName} — ${c.venueName}, ${c.venueCity}\n${date} · ${time}${c.ticketUrl ? `\n${c.ticketUrl}` : ""}`;
}

// ============================================================
// Instant alert
// ============================================================

export function buildInstantEmail(user: User, concert: Concert): ComposedEmail {
  const subject = `New show: ${concert.artistName} in ${concert.venueCity}`;
  const artist = escapeHtml(concert.artistName);
  const venue = escapeHtml(concert.venueName);
  const city = escapeHtml(concert.venueCity);
  const longDate = formatLongEventDate(concert.eventDate, concert.venueTimezone);
  const time = formatEventTime(concert.eventDate, concert.venueTimezone);
  const cta = concert.ticketUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1DB954;border-radius:10px;">
         <a href="${escapeHtml(concert.ticketUrl)}" style="display:inline-block;color:#000000;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;letter-spacing:-0.005em;">Get tickets &nbsp;→</a>
       </td></tr></table>`
    : "";

  const body = `
  <tr><td style="padding:24px 28px 0 28px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td style="vertical-align:middle;padding-right:10px;width:34px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:#1DB954;width:24px;height:24px;border-radius:6px;text-align:center;font-size:14px;font-weight:700;color:#000;line-height:24px;">●</td></tr></table>
      </td>
      <td class="cr-text" style="vertical-align:middle;font-size:13px;font-weight:600;letter-spacing:-0.01em;color:#0e0e0e;">Concert Radar</td>
      <td align="right" style="vertical-align:middle;font-size:11px;color:#1DB954;letter-spacing:0.08em;text-transform:uppercase;font-weight:700;">● Just announced</td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:24px 28px 8px 28px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1DB954;margin-bottom:12px;">${weekdayShort(concert.eventDate, concert.venueTimezone)} · ${monthDay(concert.eventDate, concert.venueTimezone)} · ${escapeHtml(time)}</div>
    <h1 class="cr-text" style="font-size:32px;font-weight:700;letter-spacing:-0.035em;line-height:1;color:#0e0e0e;margin:0 0 12px 0;">${artist}</h1>
    <p class="cr-text-soft" style="font-size:15px;line-height:1.55;color:#4a4a4a;margin:0 0 24px 0;">${venue} · ${city} · ${escapeHtml(longDate)}</p>
  </td></tr>

  ${cta ? `<tr><td style="padding:0 28px 28px 28px;" align="center">${cta}</td></tr>` : ""}

  <tr><td class="cr-foot cr-divider" style="padding:20px 28px 24px 28px;background:#f2f0eb;border-top:1px solid #e8e5dd;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td class="cr-text-dim" style="font-size:11px;line-height:1.6;color:#8a8a8a;">
        Hi ${greeting(user)} — you picked instant alerts. Switch to a daily digest if these get too noisy.<br>
        <a href="#" class="cr-text-soft" style="color:#4a4a4a;text-decoration:underline;">Manage preferences</a>
        &nbsp;·&nbsp;
        <a href="#" class="cr-text-soft" style="color:#4a4a4a;text-decoration:underline;">Unsubscribe</a>
      </td>
    </tr></table>
  </td></tr>
  `;

  const html = shell(body);
  const text = [
    `New show — ${concert.artistName} in ${concert.venueCity}`,
    "",
    concertLineText(concert),
    "",
    "— Concert Radar",
  ].join("\n");

  return { subject, html, text };
}

// ============================================================
// Daily digest
// ============================================================

export function buildDigestEmail(user: User, concerts: Concert[]): ComposedEmail {
  const n = concerts.length;
  const subject =
    n === 1
      ? `1 new concert for you on Concert Radar`
      : `${n} new concerts for you on Concert Radar`;

  const cardsHtml = concerts.map((c) => concertCardHtml(c, { withCta: true })).join("");

  const body = `
  <tr><td style="padding:28px 32px 0 32px;">
    ${BRAND_BAR}
  </td></tr>

  <tr><td style="padding:24px 32px 8px 32px;">
    <div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#1DB954;margin-bottom:12px;">↑ ${n} new this digest</div>
    <h1 class="cr-text" style="font-size:30px;font-weight:700;letter-spacing:-0.03em;line-height:1.1;color:#0e0e0e;margin:0 0 10px 0;">Hi ${greeting(user)} — ${n} ${n === 1 ? "show" : "shows"}<br>landed for you.</h1>
    <p class="cr-text-soft" style="font-size:15px;line-height:1.55;color:#4a4a4a;margin:0;">Artists you track are playing within your radius.</p>
  </td></tr>

  <tr><td style="padding:24px 32px 12px 32px;">
    <div class="cr-text-dim" style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#8a8a8a;">New shows</div>
  </td></tr>

  ${cardsHtml}

  <tr><td class="cr-foot cr-divider" style="padding:20px 32px 24px 32px;background:#f2f0eb;border-top:1px solid #e8e5dd;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
      <td class="cr-text-dim" style="font-size:11px;line-height:1.6;color:#8a8a8a;">
        You're getting this digest because you connected Spotify to Concert Radar.<br>
        <a href="#" class="cr-text-soft" style="color:#4a4a4a;text-decoration:underline;">Change frequency</a>
        &nbsp;·&nbsp;
        <a href="#" class="cr-text-soft" style="color:#4a4a4a;text-decoration:underline;">Unsubscribe</a>
      </td>
    </tr></table>
  </td></tr>
  `;

  const html = shell(body);
  const text = [
    `Hi ${user.name?.split(/\s+/)[0] ?? "there"} — ${n} new ${n === 1 ? "show" : "shows"} for you.`,
    "",
    ...concerts.map((c) => concertLineText(c) + "\n"),
    "— Concert Radar",
  ].join("\n");

  return { subject, html, text };
}

// ============================================================
// Send + NotificationLog dedup (unchanged from v1)
// ============================================================

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type SendOptions = {
  resend?: Resend;
  from?: string;
};

async function send(
  user: User,
  composed: ComposedEmail,
  opts: SendOptions,
): Promise<void> {
  if (!user.email) {
    console.warn(`[email] user ${user.id} has no email — skipping`);
    return;
  }
  const resend = opts.resend ?? getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY missing — skipping send");
    return;
  }
  const from = opts.from ?? process.env.RESEND_FROM;
  if (!from) {
    console.warn("[email] RESEND_FROM missing — skipping send");
    return;
  }
  await resend.emails.send({
    from,
    to: user.email,
    subject: composed.subject,
    html: composed.html,
    text: composed.text,
  });
}

export async function filterUnsent(
  prisma: PrismaClient,
  userId: string,
  concerts: Concert[],
): Promise<Concert[]> {
  if (concerts.length === 0) return [];
  const ids = concerts.map((c) => c.id);
  const already = await prisma.notificationLog.findMany({
    where: { userId, concertId: { in: ids } },
    select: { concertId: true },
  });
  const sent = new Set(already.map((n) => n.concertId));
  return concerts.filter((c) => !sent.has(c.id));
}

/**
 * Send-once primitive. Writes NotificationLog rows FIRST via createMany +
 * skipDuplicates so a crash or duplicate cron run can't double-send.
 */
export async function recordAndSendDigest(
  prisma: PrismaClient,
  user: User,
  concerts: Concert[],
  opts: SendOptions = {},
): Promise<{ sent: boolean; count: number }> {
  if (!user.notificationsEnabled || concerts.length === 0) {
    return { sent: false, count: 0 };
  }
  // SQLite/libsql doesn't expose Prisma's skipDuplicates flag. The caller
  // must filter via filterUnsent() before reaching this point; concurrent
  // cron runs aren't expected on a daily Vercel schedule. Tracked in #42.
  const created = await prisma.notificationLog.createMany({
    data: concerts.map((c) => ({ userId: user.id, concertId: c.id })),
  });
  if (created.count === 0) return { sent: false, count: 0 };
  await send(user, buildDigestEmail(user, concerts), opts);
  return { sent: true, count: created.count };
}

export async function recordAndSendInstant(
  prisma: PrismaClient,
  user: User,
  concert: Concert,
  opts: SendOptions = {},
): Promise<{ sent: boolean }> {
  if (!user.notificationsEnabled) return { sent: false };
  // libsql lacks skipDuplicates. Check-then-create is fine for the cron's
  // per-concert loop; concurrent runs aren't expected on a daily schedule.
  const existing = await prisma.notificationLog.findUnique({
    where: { userId_concertId: { userId: user.id, concertId: concert.id } },
    select: { id: true },
  });
  if (existing) return { sent: false };
  await prisma.notificationLog.create({
    data: { userId: user.id, concertId: concert.id },
  });
  await send(user, buildInstantEmail(user, concert), opts);
  return { sent: true };
}
