// Expo Config Plugin: Certificate Pinning
// Configures native SSL pinning on both iOS (NSPinnedDomains) and Android
// (Network Security Config) at prebuild time.
//
// Usage: Add to app.json plugins array:
//   ["./plugins/with-certificate-pinning"]

const { withInfoPlist, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

// Pinned domains — keep in sync with lib/certificate-pinning.ts
// We duplicate the config here because config plugins run at build time
// in a plain Node.js context (no bundler, no TS path aliases).
//
// To extract real hashes once the domain is live, run:
//   scripts/extract-cert-pins.sh
//
// Or manually:
//   echo | openssl s_client -connect api.pawmeet.io:443 \
//     -servername api.pawmeet.io 2>/dev/null \
//     | openssl x509 -pubkey -noout \
//     | openssl pkey -pubin -outform DER \
//     | openssl dgst -sha256 -binary \
//     | openssl enc -base64
const PINNED_DOMAINS = {
  'api.pawmeet.io': {
    pins: [
      // Primary pin — Azure managed cert leaf SPKI SHA-256 (2026-03-21)
      'QawYz97HZlViUUrBejo2rDKc3ORcuil3O3Zwj1ySMeQ=',
      // Backup pin — pre-generated EC P-256 key (stored in infra/backup-pin.key)
      'tmSbNE/31YOQQ7uZWklFltWn8Ry0asjZ+MxzppOtl5A=',
    ],
    includeSubdomains: true,
  },
};

const PLACEHOLDER_PATTERN = /^[A-B]{43}=$/;

/**
 * Validate that certificate pins have been replaced with real hashes.
 * Throws during EAS Build if placeholders are still present (prevents
 * shipping a production build without proper pinning).
 */
function validatePinsForBuild() {
  for (const [domain, config] of Object.entries(PINNED_DOMAINS)) {
    const placeholders = config.pins.filter((pin) => PLACEHOLDER_PATTERN.test(pin));
    if (placeholders.length > 0) {
      console.warn(
        `[with-certificate-pinning] WARNING: Domain "${domain}" has ${placeholders.length} ` +
          'placeholder pin(s). Replace with real SPKI SHA-256 hashes before production release. ' +
          'Run: scripts/extract-cert-pins.sh',
      );
    }
  }
}

// ---------------------------------------------------------------------------
// iOS — NSAppTransportSecurity > NSPinnedDomains (iOS 14+)
// ---------------------------------------------------------------------------

function withIOSCertificatePinning(config) {
  return withInfoPlist(config, (modConfig) => {
    const pinnedDomains = {};

    for (const [domain, domainConfig] of Object.entries(PINNED_DOMAINS)) {
      pinnedDomains[domain] = {
        NSIncludesSubdomains: domainConfig.includeSubdomains,
        NSPinnedLeafIdentities: domainConfig.pins.map((hash) => ({
          'SPKI-SHA256-BASE64': hash,
        })),
      };
    }

    // Merge with existing ATS config (preserve NSAllowsArbitraryLoads for dev, etc.)
    modConfig.modResults.NSAppTransportSecurity = {
      ...modConfig.modResults.NSAppTransportSecurity,
      NSPinnedDomains: pinnedDomains,
    };

    return modConfig;
  });
}

// ---------------------------------------------------------------------------
// Android — Network Security Configuration XML
// ---------------------------------------------------------------------------

function generateNetworkSecurityXml() {
  const domainEntries = Object.entries(PINNED_DOMAINS)
    .map(([domain, config]) => {
      const pinElements = config.pins
        .map((pin) => `            <pin digest="SHA-256">${pin}</pin>`)
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

function withAndroidCertificatePinning(config) {
  // Step 1: Write the network_security_config.xml file
  let updatedConfig = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const resXmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );

      // Ensure the xml directory exists
      fs.mkdirSync(resXmlDir, { recursive: true });

      const xmlPath = path.join(resXmlDir, 'network_security_config.xml');
      fs.writeFileSync(xmlPath, generateNetworkSecurityXml(), 'utf-8');

      // Debug variant: allow cleartext for Metro dev server (LAN IP)
      const debugResXmlDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'debug',
        'res',
        'xml',
      );
      fs.mkdirSync(debugResXmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(debugResXmlDir, 'network_security_config.xml'),
        `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>`,
        'utf-8',
      );

      return modConfig;
    },
  ]);

  // Step 2: Reference it in AndroidManifest.xml
  updatedConfig = withAndroidManifest(updatedConfig, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return modConfig;
  });

  return updatedConfig;
}

// ---------------------------------------------------------------------------
// Combined plugin
// ---------------------------------------------------------------------------

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withCertificatePinning = (config) => {
  validatePinsForBuild();
  let updatedConfig = withIOSCertificatePinning(config);
  updatedConfig = withAndroidCertificatePinning(updatedConfig);
  return updatedConfig;
};

module.exports = withCertificatePinning;
