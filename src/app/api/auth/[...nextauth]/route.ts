import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth/nextauth";

// Next.js 16 dev hard-codes req.url's origin to localhost, regardless of
// the bind address or Host header. Auth.js uses req.url.origin when
// constructing Location headers for its redirects (success → callbackUrl,
// failure → /api/auth/error). If we leave that alone, the browser at
// http://127.0.0.1 gets bounced to http://localhost — a different origin,
// session cookies don't apply, and the user appears un-signed-in.
// Rewriting Location is a no-op in production where req.url already
// matches AUTH_URL.

const { GET: rawGET, POST: rawPOST } = handlers;
const PUBLIC_ORIGIN = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "")
  .replace(/\/+$/, "");

function rewriteLocation(res: Response): Response {
  if (!PUBLIC_ORIGIN) return res;
  const loc = res.headers.get("location");
  if (!loc) return res;
  let absolute: URL;
  try {
    absolute = new URL(loc, "http://localhost");
  } catch {
    return res;
  }
  const target = new URL(PUBLIC_ORIGIN);
  if (absolute.protocol === target.protocol && absolute.host === target.host) {
    return res;
  }
  absolute.protocol = target.protocol;
  absolute.host = target.host;
  // Mutate the existing Response.headers in place — copying via
  // `new Headers(res.headers)` collapses multiple Set-Cookie values
  // into one, which kills Auth.js's PKCE / session cookies.
  res.headers.set("location", absolute.toString());
  return res;
}

export async function GET(req: NextRequest) {
  return rewriteLocation(await rawGET(req));
}

export async function POST(req: NextRequest) {
  return rewriteLocation(await rawPOST(req));
}
