import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(self)',
  },
]

const nextConfig: NextConfig = {
  images: {
    // Style Explorer's inspiration pool is sourced live from Pinterest
    // (see src/lib/pinterestSearch.ts, filtered to i.pinimg.com only) —
    // next/image refuses to render any remote host that isn't listed here,
    // which is why those images were never showing up.
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pinimg.com' },
    ],
  },
  async headers() {
    return [
      {
        // Hashed, immutable build assets — never tell the browser to evict
        // its cache for these, or in-flight chunk fetches can get cut off
        // mid-load and leave the page stuck unhydrated.
        source: '/_next/static/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/((?!_next/static).*)',
        headers: [
          {
            key: 'Clear-Site-Data',
            value: '"cache"',
          },
          ...securityHeaders,
        ],
      },
    ]
  },
}

export default nextConfig;
