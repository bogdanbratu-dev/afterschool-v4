import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/profesionisti', destination: '/colaboratori', permanent: true },
      { source: '/profesionisti/:path*', destination: '/colaboratori/:path*', permanent: true },
    ];
  },
};
export default nextConfig;
