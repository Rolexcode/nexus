import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/", headers: noStoreHeaders },
      { source: "/reports", headers: noStoreHeaders },
      { source: "/admin", headers: noStoreHeaders },
      { source: "/services", headers: noStoreHeaders },
      { source: "/updates", headers: noStoreHeaders },
    ];
  },
};

export default nextConfig;
