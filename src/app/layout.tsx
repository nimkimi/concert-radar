import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Concert Radar — Never miss a show again.",
  description:
    "Spotify-connected concert alerts. Get notified when your artists play near you.",
};

// Inlined as an unminified function string so Next can inject it without React
// hydration races. Reads localStorage and falls back to system preference; runs
// before paint so light/dark doesn't flash on first load.
const themeBootstrap = `
(function () {
  try {
    var saved = localStorage.getItem('cr-theme');
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved);
    }
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
