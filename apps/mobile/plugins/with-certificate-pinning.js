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
const PINNED_DOMAINS = {
  'api.dogwalk.app': {
    pins: [
      // Primary pin — current leaf certificate SPKI SHA-256
      // TODO(#220): Replace with actual hash after first production deploy
      'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      // Backup pin — pre-generated backup key SPKI SHA-256
      // TODO(#220): Replace with actual backup hash
      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    ],
    includeSubdomains: true,
  },
};

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
  config = withDangerousMod(config, [
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

      return modConfig;
    },
  ]);

  // Step 2: Reference it in AndroidManifest.xml
  config = withAndroidManifest(config, (modConfig) => {
    const mainApplication = modConfig.modResults.manifest.application?.[0];
    if (mainApplication) {
      mainApplication.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    }
    return modConfig;
  });

  return config;
}

// ---------------------------------------------------------------------------
// Combined plugin
// ---------------------------------------------------------------------------

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withCertificatePinning = (config) => {
  config = withIOSCertificatePinning(config);
  config = withAndroidCertificatePinning(config);
  return config;
};

module.exports = withCertificatePinning;
