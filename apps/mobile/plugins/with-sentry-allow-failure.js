const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withSentryAllowFailure(config) {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;

    // Remove the "Upload Debug Symbols to Sentry" build phase entirely.
    // dSYMs are uploaded separately via sentry-cli in CI after the build.
    const nativeTargets = xcodeProject.pbxNativeTargetSection();
    for (const key of Object.keys(nativeTargets)) {
      const target = nativeTargets[key];
      if (target.buildPhases) {
        target.buildPhases = target.buildPhases.filter((phase) => {
          return phase.comment !== 'Upload Debug Symbols to Sentry';
        });
      }
    }

    // Also remove from PBXShellScriptBuildPhase section
    const shellScriptPhases = xcodeProject.hash.project.objects.PBXShellScriptBuildPhase;
    if (shellScriptPhases) {
      for (const key of Object.keys(shellScriptPhases)) {
        const phase = shellScriptPhases[key];
        if (typeof phase === 'object' && phase.name === '"Upload Debug Symbols to Sentry"') {
          delete shellScriptPhases[key];
          // Also delete the comment entry
          delete shellScriptPhases[`${key}_comment`];
        }
      }
    }

    return config;
  });
};
