import NextAuth, { customFetch } from "next-auth";
import Spotify from "next-auth/providers/spotify";
import type { AdapterUser } from "next-auth/adapters";
import { encryptedPrismaAdapter } from "./encrypted-adapter";
import { prisma } from "@/lib/db";

const SCOPES = [
  "user-top-read",
  "user-follow-read",
  "user-read-email",
  "user-library-read",
].join(" ");

// Dev workaround for Next.js 16 + Turbopack:
//   Route-handler `request.url` is hard-coded with a localhost origin,
//   regardless of the bind address, Host header, or AUTH_URL. Auth.js
//   derives the OAuth redirect_uri from request.url, so the value Spotify
//   sees ends up as http://localhost/... — and Spotify rejects http://
//   localhost callbacks (it requires the loopback IP 127.0.0.1).
//
// We force redirect_uri = AUTH_URL/api/auth/callback/spotify at the two
// points where it leaves our process:
//   1. authorize URL: via authorization.params.redirect_uri.
//   2. token-endpoint POST: via the customFetch hook, which rewrites the
//      redirect_uri parameter in the request body before it goes out.
//
// In production (or any environment where request.url already matches
// AUTH_URL) the override is a no-op.
const AUTH_URL = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
const SPOTIFY_REDIRECT_URI = AUTH_URL
  ? `${AUTH_URL.replace(/\/+$/, "")}/api/auth/callback/spotify`
  : undefined;

const spotifyFetch: typeof fetch = async (input, init) => {
  if (!SPOTIFY_REDIRECT_URI) return fetch(input, init);

  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input instanceof Request
      ? input.url
      : "";
  if (!url.includes("accounts.spotify.com/api/token")) return fetch(input, init);

  let bodyText: string | null = null;
  if (typeof init?.body === "string") bodyText = init.body;
  else if (init?.body instanceof URLSearchParams) bodyText = init.body.toString();
  else if (input instanceof Request) bodyText = await input.clone().text();
  if (bodyText === null) return fetch(input, init);

  const params = new URLSearchParams(bodyText);
  if (!params.has("redirect_uri")) return fetch(input, init);
  params.set("redirect_uri", SPOTIFY_REDIRECT_URI);

  const method = init?.method ?? (input instanceof Request ? input.method : "POST");
  const headers = new Headers(
    init?.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  const target = typeof input === "string" || input instanceof URL ? input : url;
  return fetch(target, { method, headers, body: params.toString() });
};

type SpotifyProfile = {
  id: string;
  display_name?: string | null;
  email?: string | null;
  images?: { url: string }[];
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: encryptedPrismaAdapter(prisma, process.env.TOKEN_ENCRYPTION_KEY!),
  providers: [
    Spotify({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      [customFetch]: spotifyFetch,
      authorization: {
        url: "https://accounts.spotify.com/authorize",
        params: {
          scope: SCOPES,
          ...(SPOTIFY_REDIRECT_URI ? { redirect_uri: SPOTIFY_REDIRECT_URI } : {}),
        },
      },
      profile(profile: SpotifyProfile): AdapterUser & { spotifyId: string } {
        return {
          id: profile.id,
          spotifyId: profile.id,
          name: profile.display_name ?? null,
          email: profile.email ?? "",
          emailVerified: null,
          image: profile.images?.[0]?.url ?? null,
        };
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
