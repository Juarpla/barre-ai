import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // YouTube thumbnails
      { protocol: 'https', hostname: 'i.ytimg.com' },
      // Vimeo thumbnails
      { protocol: 'https', hostname: 'i.vimeocdn.com' },
      // Dailymotion thumbnails
      { protocol: 'https', hostname: 's1.dmcdn.net' },
      { protocol: 'https', hostname: 's2.dmcdn.net' },
    ],
  },
};

export default nextConfig;
