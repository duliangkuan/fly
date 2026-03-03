import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    remotePatterns: [],
  },
  experimental: {
    serverBodySizeLimit: '20mb',
  },
};

export default nextConfig;
