#!/bin/bash
# Switch mobile app between local and production API

ENV_FILE="$(dirname "$0")/../.env"

case "$1" in
  local|dev)
    IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
    sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$IP:3000|" "$ENV_FILE"
    sed -i '' "s|EXPO_PUBLIC_WS_URL=.*|EXPO_PUBLIC_WS_URL=ws://$IP:3000/ws|" "$ENV_FILE"
    echo "API -> LOCAL (http://$IP:3000)"
    echo "Restart Metro with: npx expo start -c"
    ;;
  prod|production)
    sed -i '' "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=https://api.pawmeet.io|" "$ENV_FILE"
    sed -i '' "s|EXPO_PUBLIC_WS_URL=.*|EXPO_PUBLIC_WS_URL=wss://api.pawmeet.io/ws|" "$ENV_FILE"
    echo "API -> PRODUCTION (https://api.pawmeet.io)"
    echo "Restart Metro with: npx expo start -c"
    ;;
  status|"")
    echo "Current API:"
    grep "EXPO_PUBLIC_API_URL=" "$ENV_FILE"
    grep "EXPO_PUBLIC_WS_URL=" "$ENV_FILE"
    echo ""
    echo "Usage: pnpm api:local | pnpm api:prod"
    ;;
esac
