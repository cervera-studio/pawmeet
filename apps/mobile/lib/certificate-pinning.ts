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
export const PINNED_DOMAINS = {
  'api.pawmeet.io': {
    // Pin the public key hash, not the certificate itself,
    // so renewals with the same key pair don't break pinning.
    pins: [
      // Primary pin — current leaf certificate SPKI SHA-256
      // TODO(#220): Replace with actual hash after first production deploy
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      // Backup pin — pre-generated backup key SPKI SHA-256
      // TODO(#220): Replace with actual backup hash
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
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
        console.warn(message);
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

/**
 * Validate that a domain is in the pinning allowlist.
 * Use this to guard network requests in development/testing.
 */
export function isPinnedDomain(hostname: string): boolean {
  return hostname in PINNED_DOMAINS;
}

/**
 * Get the SPKI pins for a given domain.
 * Returns undefined if the domain is not pinned.
 */
export function getPinsForDomain(domain: string): readonly string[] | undefined {
  const config = PINNED_DOMAINS[domain as PinnedDomain];
  return config?.pins;
}

// ---------------------------------------------------------------------------
// Network Security Configuration (Android)
// ---------------------------------------------------------------------------

/**
 * Generates the Android Network Security Config XML content.
 * This is used by the Expo config plugin to write the XML file and reference
 * it in AndroidManifest.xml.
 *
 * @see https://developer.android.com/privacy-and-security/security-config
 */
export function generateNetworkSecurityConfig(): string {
  const domainEntries = Object.entries(PINNED_DOMAINS)
    .map(([domain, config]) => {
      const pinElements = config.pins
        .map((pin) => {
          const hash = pin.replace('sha256/', '');
          return `            <pin digest="SHA-256">${hash}</pin>`;
        })
        .join('\n');

      return `        <domain-config>
            <domain includeSubdomains="${config.includeSubdomains}">${domain}</domain>
            <pin-set>
${pinElements}
            </pin-set>
        </domain-config>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
${domainEntries}
</network-security-config>`;
}

// ---------------------------------------------------------------------------
// iOS ATS (App Transport Security) pin format
// ---------------------------------------------------------------------------

/**
 * Generates the iOS Info.plist pinning entries for NSAppTransportSecurity.
 * iOS uses NSPinnedDomains (available since iOS 14) for native SSL pinning.
 *
 * @see https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity
 */
export function generateIOSPinningConfig(): Record<string, unknown> {
  const pinnedDomains: Record<string, unknown> = {};

  for (const [domain, config] of Object.entries(PINNED_DOMAINS)) {
    const publicKeyHashes = config.pins.map((pin) => pin.replace('sha256/', ''));

    pinnedDomains[domain] = {
      NSIncludesSubdomains: config.includeSubdomains,
      NSPinnedLeafIdentities: publicKeyHashes.map((hash) => ({
        'SPKI-SHA256-BASE64': hash,
      })),
    };
  }

  return {
    NSPinnedDomains: pinnedDomains,
  };
}
