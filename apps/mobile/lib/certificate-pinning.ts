// ---------------------------------------------------------------------------
// Certificate Pinning Configuration
// ---------------------------------------------------------------------------
// SSL/TLS certificate pinning prevents MITM attacks by validating that the
// server certificate matches a known, trusted pin. We pin the SPKI (Subject
// Public Key Info) SHA-256 hash of the server's leaf certificate and a backup.
//
// Pins are configured at the native layer via expo-build-properties and the
// Expo config plugin below. The JavaScript layer provides runtime validation
// helpers and pin metadata for monitoring/rotation.
// ---------------------------------------------------------------------------

/**
 * Pinned domains and their SPKI SHA-256 hashes.
 *
 * Each domain requires at least two pins:
 * - Primary: current leaf certificate's public key hash
 * - Backup: a separately-generated key hash for rotation
 *
 * To extract the SPKI hash from a live server:
 * ```bash
 * openssl s_client -connect api.pawmeet.io:443 -servername api.pawmeet.io 2>/dev/null \
 *   | openssl x509 -pubkey -noout \
 *   | openssl pkey -pubin -outform DER \
 *   | openssl dgst -sha256 -binary \
 *   | openssl enc -base64
 * ```
 *
 * IMPORTANT: Update these pins before certificate renewal. Set a calendar
 * reminder 30 days before expiry. If both pins become invalid, the app will
 * refuse all API connections until an update is deployed.
 */
import { logger } from '@pawmeet/utils';

export const PINNED_DOMAINS = {
  'api.pawmeet.io': {
    // Pin the public key hash, not the certificate itself,
    // so renewals with the same key pair don't break pinning.
    pins: [
      // Primary pin — Azure managed cert leaf SPKI SHA-256 (2026-03-21)
      'sha256/QawYz97HZlViUUrBejo2rDKc3ORcuil3O3Zwj1ySMeQ=',
      // Backup pin — pre-generated EC P-256 key (stored in infra/backup-pin.key)
      'sha256/tmSbNE/31YOQQ7uZWklFltWn8Ry0asjZ+MxzppOtl5A=',
    ],
    includeSubdomains: true,
  },
} as const;

export type PinnedDomain = keyof typeof PINNED_DOMAINS;

/**
 * Pin expiry tracking for monitoring and alerting.
 * Update these dates when rotating certificates.
 */
export const PIN_METADATA = {
  'api.pawmeet.io': {
    // TODO(#220): Set actual expiry date after first deploy
    primaryExpiry: new Date('2027-01-01'),
    lastRotated: new Date('2026-03-11'),
    alertDaysBeforeExpiry: 30,
  },
} as const satisfies Record<PinnedDomain, PinRotationInfo>;

interface PinRotationInfo {
  readonly primaryExpiry: Date;
  readonly lastRotated: Date;
  readonly alertDaysBeforeExpiry: number;
}

// ---------------------------------------------------------------------------
// Runtime helpers
// ---------------------------------------------------------------------------

/** Placeholder pattern used before real hashes are extracted. */
const PLACEHOLDER_PATTERN = /^sha256\/[A-B]{43}=$/;

/**
 * Validate that certificate pins have been replaced with real SPKI hashes.
 * Call this at app startup. In production builds it throws immediately so the
 * app cannot silently run without pinning. In __DEV__ it logs a warning.
 *
 * To extract the real hashes once the domain is live, run:
 * ```bash
 * # Leaf certificate (primary pin):
 * echo | openssl s_client -connect api.pawmeet.io:443 \
 *   -servername api.pawmeet.io 2>/dev/null \
 *   | openssl x509 -pubkey -noout \
 *   | openssl pkey -pubin -outform DER \
 *   | openssl dgst -sha256 -binary \
 *   | openssl enc -base64
 *
 * # Intermediate CA (backup pin) — use -showcerts and pick cert index 1:
 * echo | openssl s_client -connect api.pawmeet.io:443 \
 *   -servername api.pawmeet.io -showcerts 2>/dev/null \
 *   | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{ if(n==1) print } /END CERTIFICATE/{n++}' \
 *   | openssl x509 -pubkey -noout \
 *   | openssl pkey -pubin -outform DER \
 *   | openssl dgst -sha256 -binary \
 *   | openssl enc -base64
 * ```
 *
 * Or run: `scripts/extract-cert-pins.sh`
 *
 * @throws {Error} In production when placeholder hashes are still present.
 */
export function validatePinsInitialized(): void {
  for (const [domain, config] of Object.entries(PINNED_DOMAINS)) {
    const placeholders = config.pins.filter((pin) => PLACEHOLDER_PATTERN.test(pin));
    if (placeholders.length > 0) {
      const message =
        `[CertificatePinning] Domain "${domain}" still has ${placeholders.length} placeholder ` +
        'pin(s). Replace them with real SPKI SHA-256 hashes before shipping to production. ' +
        'Run scripts/extract-cert-pins.sh to extract hashes.';

      if (__DEV__) {
        logger.warn('CertificatePinning', message);
      } else {
        throw new Error(message);
      }
    }
  }
}

/**
 * Check if any pinned certificate is approaching expiry.
 * Call this on app startup and report to Sentry if a pin is about to expire.
 *
 * @returns Array of domains whose pins expire within the alert window.
 */
export function getExpiringPins(): PinnedDomain[] {
  const now = new Date();
  const expiring: PinnedDomain[] = [];

  for (const [domain, meta] of Object.entries(PIN_METADATA)) {
    const daysUntilExpiry = Math.floor(
      (meta.primaryExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilExpiry <= meta.alertDaysBeforeExpiry) {
      expiring.push(domain as PinnedDomain);
    }
  }

  return expiring;
}
