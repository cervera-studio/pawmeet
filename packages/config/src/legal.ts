/**
 * Legal document version registry.
 * Bump these when Terms of Service or Privacy Policy change.
 * The version is recorded at registration and consent time for audit trail.
 */
export const LEGAL_VERSIONS = {
  TERMS_OF_SERVICE: 'v1.0',
  PRIVACY_POLICY: 'v1.0',
  CONSENT_SCHEMA: 'v1.0',
} as const;

/** Minimum age to use PawMeet (no parental consent flow for now). */
export const MIN_AGE_YEARS = 14;
