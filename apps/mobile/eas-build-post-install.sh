#!/bin/bash
# EAS Build lifecycle hook: runs after npm install and prebuild.
# Removes the Sentry dSYM upload build phase to prevent build failures.

if [[ "$EAS_BUILD_PLATFORM" == "ios" ]]; then
  PBXPROJ="ios/PawMeet.xcodeproj/project.pbxproj"
  if [ -f "$PBXPROJ" ]; then
    echo "Removing Sentry dSYM upload build phase..."
    python3 -c "
import re, sys
with open('$PBXPROJ', 'r') as f:
    c = f.read()
# Find UUID
m = re.findall(r'([A-F0-9]{24})\s*/\*\s*Upload Debug Symbols to Sentry', c)
if not m:
    print('No Sentry upload phase found'); sys.exit(0)
uid = m[0]
# Remove from buildPhases list
c = re.sub(r'\s*' + uid + r'\s*/\*[^*]*\*/,?\n?', '\n', c)
# Remove the shell script block
c = re.sub(r'\s*' + uid + r'\s*/\*[^*]*\*/\s*=\s*\{[^}]*\};\n?', '\n', c, flags=re.DOTALL)
with open('$PBXPROJ', 'w') as f:
    f.write(c)
print('Removed Sentry upload build phase: ' + uid)
"
  fi
fi
