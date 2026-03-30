#!/bin/sh
# Wrapper for EAS prebuild — EAS passes extra flags (--platform ios) that tsx rejects.
npx tsx scripts/validate-cert-pins.ts
