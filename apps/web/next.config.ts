import path from 'node:path';
import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
  { protocol: 'http', hostname: 'localhost' },
  { protocol: 'http', hostname: '127.0.0.1' },
];

const configuredApi = process.env.NEXT_PUBLIC_API_URL;
if (configuredApi) {
  try {
    const parsed = new URL(configuredApi);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      remotePatterns.push({
        protocol: parsed.protocol.slice(0, -1) as 'http' | 'https',
        hostname: parsed.hostname,
      });
    }
  } catch {
    // Ignore invalid build-time API URL cleanly.
  }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  images: {
    unoptimized: true,
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), geolocation=(self), microphone=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
