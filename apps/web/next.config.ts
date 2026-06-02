import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jarvis/shared"],
  reactStrictMode: true,
};

export default nextConfig;
