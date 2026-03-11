/** Set test-only environment variables before any module is imported */
process.env.JWT_SECRET ??= 'test-jwt-secret-do-not-use-in-production';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-do-not-use-in-production';
