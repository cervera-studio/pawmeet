const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withSentryAllowFailure(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const sentryBuildPhase = xcodeProject.pbxItemByComment(
      'Upload Debug Symbols to Sentry',
      'PBXShellScriptBuildPhase',
    );

    if (sentryBuildPhase) {
      const script = JSON.parse(sentryBuildPhase.shellScript);
      if (!script.includes('SENTRY_ALLOW_FAILURE')) {
        sentryBuildPhase.shellScript = JSON.stringify(
          `export SENTRY_ALLOW_FAILURE=true\n${script}`,
        );
      }
    }

    return config;
  });
};
