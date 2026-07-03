import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Security headers for the internet-facing Pantry UI. Scoped to the anti-
  // clickjacking + hardening set that is safe for a Next.js app: none of these
  // restrict script/style sources, so Next's inline hydration is unaffected. A
  // full script-src CSP would need nonce middleware and is intentionally left out.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const pantryUrl = process.env.PANTRY_API_URL || "http://localhost:7721";
    return [
      {
        source: "/v1/:path*",
        destination: `${pantryUrl}/v1/:path*`,
      },
      {
        source: "/health",
        destination: `${pantryUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
