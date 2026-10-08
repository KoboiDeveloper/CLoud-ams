import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    proxyClientMaxBodySize: '2gb',
    middlewareClientMaxBodySize: '2gb',
  } as NextConfig['experimental'],
  trailingSlash: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'dl.dropbox.com', pathname: '/**' },
      { protocol: 'https', hostname: 'dl.dropboxusercontent.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.dropbox.com', pathname: '/**' },
    ],
  },
  async rewrites() {
    const backend =
      process.env.BACKEND_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:1000';

    return {
      fallback: [
        {
          source: '/api/:path*',
          destination: `${backend}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
