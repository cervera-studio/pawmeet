import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const releaseVersion = process.env.VERCEL_GIT_COMMIT_SHA
  ? `pawmeet-admin@${process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7)}`
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
