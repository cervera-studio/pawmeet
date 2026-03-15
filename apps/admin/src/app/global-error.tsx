'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Si è verificato un errore</h2>
          <button type="button" onClick={reset}>
            Riprova
          </button>
        </div>
      </body>
    </html>
  );
}
