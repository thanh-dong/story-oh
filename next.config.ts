import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webSocketPort: 0,
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
