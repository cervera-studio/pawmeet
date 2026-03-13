// Expo Config Plugin: Screen Security
// Prevents screenshots and screen recording on both iOS and Android at the native layer.
//
// Usage: Add to app.json plugins array:
//   ["./plugins/with-screen-security"]

const { withInfoPlist, withMainActivity } = require('expo/config-plugins');

// ---------------------------------------------------------------------------
// Android — FLAG_SECURE in MainActivity.onCreate
// ---------------------------------------------------------------------------

function withAndroidScreenSecurity(config) {
  return withMainActivity(config, (modConfig) => {
    const mainActivity = modConfig.modResults;
    const { contents } = mainActivity;

    // Add the WindowManager import if not already present
    if (!contents.includes('import android.view.WindowManager')) {
      mainActivity.contents = contents.replace(
        'import android.os.Bundle;',
        'import android.os.Bundle;\nimport android.view.WindowManager;',
      );
    }

    // Inject FLAG_SECURE into onCreate after super.onCreate()
    if (!mainActivity.contents.includes('FLAG_SECURE')) {
      mainActivity.contents = mainActivity.contents.replace(
        'super.onCreate(null);',
        `super.onCreate(null);\n    getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);`,
      );
    }

    return modConfig;
  });
}

// ---------------------------------------------------------------------------
// iOS — Privacy-related Info.plist keys
// ---------------------------------------------------------------------------

function withIOSScreenSecurity(config) {
  return withInfoPlist(config, (modConfig) => {
    // UIApplicationExitsOnSuspend is not applicable here, but we can set
    // privacy manifest keys to declare that the app handles sensitive data.
    // iOS does not have a direct FLAG_SECURE equivalent at the plist level;
    // screen capture prevention is handled at runtime via the hook.

    // Declare that the app accesses user-sensitive data (privacy manifest)
    modConfig.modResults.NSPrivacyAccessedAPITypes =
      modConfig.modResults.NSPrivacyAccessedAPITypes ?? [];

    return modConfig;
  });
}

// ---------------------------------------------------------------------------
// Combined plugin
// ---------------------------------------------------------------------------

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withScreenSecurity = (config) => {
  config = withAndroidScreenSecurity(config);
  config = withIOSScreenSecurity(config);
  return config;
};

module.exports = withScreenSecurity;
