import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  // TODO: Fetch user from API
  // const user = await api.get(`/admin/users/${id}`);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-neutral-200" />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Utente #{id}</h1>
            <p className="text-neutral-500">user@example.com</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">Attivo</Badge>
          <Button variant="outline" size="sm">
            Sospendi
          </Button>
          <Button variant="destructive" size="sm">
            Banna
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informazioni</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nome" value="Placeholder User" />
            <InfoRow label="Email" value="user@example.com" />
            <InfoRow label="Telefono" value="+39 123 456 7890" />
            <InfoRow label="Registrato il" value="15 Gen 2024" />
            <InfoRow label="Ultimo accesso" value="Oggi, 14:30" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cani</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-neutral-400">
              {/* TODO: List of dogs */}
              Lista cani (placeholder)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attivita</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-neutral-400">
              {/* TODO: Activity log */}
              Log attivita (placeholder)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storico Match</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-48 items-center justify-center text-neutral-400">
            {/* TODO: Match history table */}
            Storico match (placeholder)
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}
