'use client';

import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useContentModerationViewModel } from './page.view-model';

const REASON_LABEL: Record<string, string> = {
  inappropriate: 'Contenuto inappropriato',
  spam: 'Spam',
  harassment: 'Molestie',
  violence: 'Violenza',
  other: 'Altro',
};

const TYPE_LABEL: Record<string, string> = {
  post: 'Post',
  comment: 'Commento',
  story: 'Storia',
};

export default function ContentModerationPage() {
  const vm = useContentModerationViewModel();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Moderazione contenuti</h1>
        <p className="text-neutral-500">Gestisci le segnalazioni sui contenuti del feed</p>
      </div>

      {vm.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`skeleton-${String(i)}`} className="animate-pulse p-6">
              <div className="h-4 w-1/3 rounded bg-neutral-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-neutral-200" />
            </Card>
          ))}
        </div>
      ) : vm.reports.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg text-neutral-500">Nessuna segnalazione in attesa</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {vm.reports.map((report) => (
            <Card key={report.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {TYPE_LABEL[report.contentType] ?? report.contentType}
                    </Badge>
                    <Badge variant="secondary">
                      {REASON_LABEL[report.reason] ?? report.reason}
                    </Badge>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Contenuto ID: <span className="font-mono text-xs">{report.contentId}</span>
                  </p>
                  <p className="text-sm text-neutral-600">
                    Segnalante: <span className="font-mono text-xs">{report.reporterId}</span>
                  </p>
                  {report.description ? (
                    <p className="text-sm text-neutral-500 italic">&quot;{report.description}&quot;</p>
                  ) : null}
                  <p className="text-xs text-neutral-400">
                    {new Date(report.createdAt).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={vm.isReviewing}
                    onClick={() => {
                      vm.handleReview(report.id, 'dismissed');
                      toast.success('Segnalazione archiviata');
                    }}
                  >
                    Archivia
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    disabled={vm.isReviewing}
                    onClick={() => {
                      vm.handleReview(report.id, 'reviewed');
                      toast.success('Segnalazione revisionata');
                    }}
                  >
                    Revisiona
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {vm.nextCursor ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={vm.loadMore} disabled={vm.isLoading}>
                Carica altri
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
