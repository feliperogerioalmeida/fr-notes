import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@workspace/ui", "@workspace/auth"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
