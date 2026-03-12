import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pawmeet/types', '@pawmeet/validation'],
};

export default nextConfig;
