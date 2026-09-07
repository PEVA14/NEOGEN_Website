import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Phase 2 will load .glb assets from /public/models. They are served as static
  // files, so no loader config is required — but they are large and immutable,
  // so give them a long-lived cache header.
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
