'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h2 className="text-xl font-semibold text-neutral-900">Qualcosa è andato storto</h2>
      <p className="text-neutral-500">{error.message || 'Errore nel caricamento della pagina'}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
      >
        Riprova
      </button>
    </div>
  );
}
