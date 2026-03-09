import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dogwalk/types', '@dogwalk/validation'],
};

export default nextConfig;
