/**
 * Pre-build validation script for certificate pinning.
 *
 * Ensures placeholder SPKI hashes have been replaced with real values
 * before a production or preview build can proceed. Run by EAS Build
 * via the `prebuild` hook in eas.json.
 *
 * Usage: npx tsx scripts/validate-cert-pins.ts
 */

import process from 'node:process';

const PLACEHOLDER_PATTERN = /^sha256\/[A-B]{43}=$/;

// Inline the pin config to avoid importing modules that require React Native
const PINNED_DOMAINS: Record<string, { pins: readonly string[] }> = {
  'api.pawmeet.io': {
    pins: [
      'sha256/QawYz97HZlViUUrBejo2rDKc3ORcuil3O3Zwj1ySMeQ=',
      'sha256/tmSbNE/31YOQQ7uZWklFltWn8Ry0asjZ+MxzppOtl5A=',
    ],
  },
};

// Dynamically read from the actual source file to stay in sync
async function loadPins(): Promise<Record<string, { pins: readonly string[] }>> {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const filePath = path.resolve(import.meta.dirname, '../lib/certificate-pinning.ts');
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract pins from the source file using regex
  const pinsMatch = content.match(/pins:\s*\[([\s\S]*?)\]/);
  if (!pinsMatch) {
    return PINNED_DOMAINS; // Fallback to hardcoded values
  }

  const rawMatch = pinsMatch[1];
  if (!rawMatch) return PINNED_DOMAINS;
  const pinStrings = [...rawMatch.matchAll(/'([^']+)'/g)]
    .map((m) => m[1])
    .filter((s): s is string => s != null);
  if (pinStrings.length > 0) {
    return {
      'api.pawmeet.io': { pins: pinStrings },
    };
  }

  return PINNED_DOMAINS;
}

async function main() {
  const pins = await loadPins();
  const errors: string[] = [];

  for (const [domain, config] of Object.entries(pins)) {
    const placeholders = config.pins.filter((pin) => PLACEHOLDER_PATTERN.test(pin));
    if (placeholders.length > 0) {
      errors.push(
        `Domain "${domain}" has ${placeholders.length} placeholder pin(s). ` +
          'Replace them with real SPKI SHA-256 hashes before building for production. ' +
          'Run: scripts/extract-cert-pins.sh',
      );
    }
  }

  if (errors.length > 0) {
    // biome-ignore lint/suspicious/noConsole: build script uses console for output
    console.error('\n[CertificatePinning] Build blocked:\n');
    for (const err of errors) {
      // biome-ignore lint/suspicious/noConsole: build script uses console for output
      console.error(`  - ${err}`);
    }
    // biome-ignore lint/suspicious/noConsole: build script uses console for output
    console.error('');
    process.exit(1);
  }

  // biome-ignore lint/suspicious/noConsole: build script uses console for output
  console.log('[CertificatePinning] All pins validated successfully.');
}

main();
