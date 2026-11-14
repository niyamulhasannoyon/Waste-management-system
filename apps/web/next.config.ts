import path from 'node:path';
import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

export default function nextConfig(phase: string): NextConfig {
  const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'http', hostname: '127.0.0.1' },
    { protocol: 'https', hostname: 'clean-savar-api.onrender.com' },
    { protocol: 'https', hostname: 'clean-savar.shuttle.app' },
    { protocol: 'https', hostname: 'wosjqtspcblftirykphs.supabase.co' },
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

  return {
    // Isolate dev artifacts from `next build` so running both never corrupts `.next`.
    distDir:
      process.env.NEXT_DIST_DIR ||
      (phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next'),
    output: 'standalone',
    serverExternalPackages: ['firebase-admin', 'jwks-rsa', 'jose'],
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
    async rewrites() {
      const apiTarget = (
        process.env.INTERNAL_API_URL ||
        process.env.NEXT_PUBLIC_API_URL ||
        'https://clean-savar-api.onrender.com/api/v1'
      ).replace(/\/$/, '');
      const uploadsBase = apiTarget.replace(/\/api\/v1\/?$/, '/uploads');

      return [
        {
          source: '/api/v1/:path*',
          destination: `${apiTarget}/:path*`,
        },
        {
          source: '/uploads/:path*',
          destination: `${uploadsBase}/:path*`,
        },
        {
          source: '/downloads/clean-savar.apk',
          destination: '/clean-savar.apk',
        },
      ];
    },
  };
}
