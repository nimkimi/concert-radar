"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      type="button"
      className="cr-btn cr-btn--spotify"
      onClick={() => signIn("spotify", { callbackUrl: "/dashboard" })}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.41c-.2.32-.61.42-.93.22-2.54-1.55-5.74-1.9-9.5-1.04-.36.08-.72-.14-.8-.5-.08-.36.14-.72.5-.8 4.12-.94 7.66-.54 10.51 1.19.32.2.42.61.22.93zm1.22-2.72c-.25.4-.77.52-1.17.27-2.91-1.79-7.35-2.31-10.79-1.27-.45.14-.93-.12-1.06-.57-.13-.45.12-.93.57-1.06 3.93-1.19 8.83-.61 12.18 1.46.4.25.52.77.27 1.17zm.1-2.84C14.42 8.78 8.94 8.59 5.67 9.58c-.54.16-1.11-.14-1.27-.68-.16-.54.14-1.11.68-1.27 3.76-1.14 9.83-.92 13.71 1.39.49.29.65.92.36 1.41-.29.49-.92.65-1.41.36z" />
      </svg>
      Connect with Spotify
    </button>
  );
}
