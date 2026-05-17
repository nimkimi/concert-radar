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

const BRAND = `
  <div style="font-family:Inter,system-ui,sans-serif;font-weight:900;font-size:18px;letter-spacing:-0.02em;color:#1db954;margin-bottom:24px;">
    CONCERT RADAR
  </div>
`;

function concertCardHtml(c: Concert): string {
  const date = formatLongEventDate(c.eventDate, c.venueTimezone);
  const time = formatEventTime(c.eventDate, c.venueTimezone);
  const artist = escapeHtml(c.artistName);
  const venue = escapeHtml(c.venueName);
  const city = escapeHtml(c.venueCity);
  const cta = c.ticketUrl
    ? `<a href="${escapeHtml(c.ticketUrl)}" style="display:inline-block;background:#1db954;color:#000;padding:10px 20px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px;">Get tickets →</a>`
    : "";
  return `
    <div style="border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:16px;background:#1e1e1e;">
      <div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;color:#fff;">${artist}</div>
      <div style="font-size:14px;color:#a0a0a0;margin-top:6px;">${venue} · ${city}</div>
      <div style="font-size:13px;color:#a0a0a0;margin-top:4px;">${escapeHtml(date)} · ${escapeHtml(time)}</div>
      ${cta ? `<div style="margin-top:16px;">${cta}</div>` : ""}
    </div>
  `;
}

function concertLineText(c: Concert): string {
  const date = formatLongEventDate(c.eventDate, c.venueTimezone);
  const time = formatEventTime(c.eventDate, c.venueTimezone);
  return `${c.artistName} — ${c.venueName}, ${c.venueCity}\n${date} · ${time}${c.ticketUrl ? `\n${c.ticketUrl}` : ""}`;
}

export function buildInstantEmail(user: User, concert: Concert): ComposedEmail {
  const artist = escapeHtml(concert.artistName);
  const subject = `New show: ${concert.artistName} in ${concert.venueCity}`;

  const html = `
    <body style="background:#0a0a0a;margin:0;padding:32px;color:#fff;font-family:Inter,system-ui,sans-serif;">
      <div style="max-width:560px;margin:0 auto;">
        ${BRAND}
        <h1 style="font-size:32px;font-weight:900;letter-spacing:-0.03em;margin:0 0 8px;color:#fff;">
          ${artist} just announced a show near you.
        </h1>
        <p style="font-size:15px;color:#a0a0a0;margin:0 0 24px;">
          Hi ${greeting(user)} — here's the detail.
        </p>
        ${concertCardHtml(concert)}
        <p style="font-size:12px;color:#6e6e6e;margin-top:32px;">
          You're getting this because you track this artist on Spotify and asked for instant alerts.
          Change your preferences any time on Concert Radar.
        </p>
      </div>
    </body>
  `.trim();

  const text = [
    `New show — ${concert.artistName} in ${concert.venueCity}`,
    "",
    concertLineText(concert),
    "",
    "— Concert Radar",
  ].join("\n");

  return { subject, html, text };
}

export function buildDigestEmail(user: User, concerts: Concert[]): ComposedEmail {
  const n = concerts.length;
  const subject =
    n === 1
      ? `1 new concert for you on Concert Radar`
      : `${n} new concerts for you on Concert Radar`;

  const html = `
    <body style="background:#0a0a0a;margin:0;padding:32px;color:#fff;font-family:Inter,system-ui,sans-serif;">
      <div style="max-width:560px;margin:0 auto;">
        ${BRAND}
        <h1 style="font-size:32px;font-weight:900;letter-spacing:-0.03em;margin:0 0 8px;color:#fff;">
          Hi ${greeting(user)}, ${n} new ${n === 1 ? "show" : "shows"} landed.
        </h1>
        <p style="font-size:15px;color:#a0a0a0;margin:0 0 24px;">
          Artists you track are playing within your radius.
        </p>
        ${concerts.map(concertCardHtml).join("")}
        <p style="font-size:12px;color:#6e6e6e;margin-top:32px;">
          You're getting this digest daily when there are new shows.
          Change your preferences any time on Concert Radar.
        </p>
      </div>
    </body>
  `.trim();

  const text = [
    `Hi ${user.name?.split(/\s+/)[0] ?? "there"} — ${n} new ${n === 1 ? "show" : "shows"} for you.`,
    "",
    ...concerts.map((c) => concertLineText(c) + "\n"),
    "— Concert Radar",
  ].join("\n");

  return { subject, html, text };
}

// ============================================================
// Send + NotificationLog dedup
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
