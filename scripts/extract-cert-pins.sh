#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# extract-cert-pins.sh
#
# Extracts SPKI SHA-256 hashes for certificate pinning from a live server.
# Run this once api.pawmeet.io is deployed, then paste the output hashes into:
#   - apps/mobile/lib/certificate-pinning.ts   (PINNED_DOMAINS.pins)
#   - apps/mobile/plugins/with-certificate-pinning.js  (PINNED_DOMAINS.pins)
#
# Usage:
#   ./scripts/extract-cert-pins.sh [hostname] [port]
#
# Defaults:
#   hostname = api.pawmeet.io
#   port     = 443
# ---------------------------------------------------------------------------

set -euo pipefail

HOST="${1:-api.pawmeet.io}"
PORT="${2:-443}"

echo "Extracting certificate pin hashes for ${HOST}:${PORT}"
echo "================================================================"
echo ""

# ---------------------------------------------------------------------------
# 1. Leaf certificate (primary pin)
# ---------------------------------------------------------------------------
echo "--- Leaf certificate (primary pin) ---"
LEAF_HASH=$(
  echo | openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" 2>/dev/null \
    | openssl x509 -pubkey -noout 2>/dev/null \
    | openssl pkey -pubin -outform DER 2>/dev/null \
    | openssl dgst -sha256 -binary \
    | openssl enc -base64 2>/dev/null
)

if [ -z "${LEAF_HASH}" ]; then
  echo "ERROR: Could not extract leaf certificate hash."
  echo "       Is ${HOST}:${PORT} reachable? Is the TLS certificate valid?"
  exit 1
fi

echo "sha256/${LEAF_HASH}"
echo ""

# ---------------------------------------------------------------------------
# 2. Intermediate CA certificate (backup pin)
# ---------------------------------------------------------------------------
echo "--- Intermediate CA certificate (backup pin) ---"
INTERMEDIATE_HASH=$(
  echo | openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" -showcerts 2>/dev/null \
    | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/{ if(n==1) print } /END CERTIFICATE/{n++}' \
    | openssl x509 -pubkey -noout 2>/dev/null \
    | openssl pkey -pubin -outform DER 2>/dev/null \
    | openssl dgst -sha256 -binary \
    | openssl enc -base64 2>/dev/null
)

if [ -z "${INTERMEDIATE_HASH}" ]; then
  echo "WARNING: Could not extract intermediate CA hash."
  echo "         The server may not send the full chain."
  echo "         Consider using a backup key you generated yourself."
  echo ""
else
  echo "sha256/${INTERMEDIATE_HASH}"
  echo ""
fi

# ---------------------------------------------------------------------------
# 3. Certificate expiry date
# ---------------------------------------------------------------------------
echo "--- Leaf certificate expiry ---"
EXPIRY=$(
  echo | openssl s_client -connect "${HOST}:${PORT}" -servername "${HOST}" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null \
    | sed 's/notAfter=//'
)

if [ -n "${EXPIRY}" ]; then
  echo "${EXPIRY}"
else
  echo "Could not determine expiry date."
fi

echo ""
echo "================================================================"
echo ""
echo "Next steps:"
echo "  1. Update PINNED_DOMAINS.pins in:"
echo "       apps/mobile/lib/certificate-pinning.ts"
echo "       apps/mobile/plugins/with-certificate-pinning.js"
echo ""
echo "  2. Update PIN_METADATA.primaryExpiry with the expiry date above"
echo "     in apps/mobile/lib/certificate-pinning.ts"
echo ""
echo "  3. Set PIN_METADATA.lastRotated to today's date"
echo ""
echo "  4. Run a prebuild to verify native configs are generated correctly:"
echo "       npx expo prebuild --clean"
echo ""
