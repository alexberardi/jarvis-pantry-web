import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
