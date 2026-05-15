import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Spotify rejects http://localhost callbacks but accepts 127.0.0.1.
  // Next.js dev blocks cross-origin requests to its dev resources
  // (HMR, fonts) by default, so we explicitly allow 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
