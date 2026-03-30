import process from 'node:process';
import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const releaseVersion = process.env.APP_VERSION
  ? `pawmeet-admin@${process.env.APP_VERSION}`
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Type checking runs in CI (pnpm typecheck) — skip during Docker build where
    // tRPC inferred types break without full project references
    ignoreBuildErrors: !!process.env.DOCKER_BUILD,
  },
  transpilePackages: ['@pawmeet/types', '@pawmeet/validation', '@pawmeet/i18n'],
  env: {
    NEXT_PUBLIC_SENTRY_RELEASE: releaseVersion,
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  release: {
    name: releaseVersion,
  },
});
