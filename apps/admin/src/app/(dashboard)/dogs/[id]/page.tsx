import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/formatters';
import { fetchDog } from './actions';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="font-medium text-neutral-900">{value}</span>
    </div>
  );
}

interface DogDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DogDetailPage({ params }: DogDetailPageProps) {
  const { id } = await params;
  const [dog, t, tc] = await Promise.all([
    fetchDog(id),
    getTranslations('dogs'),
    getTranslations('common'),
  ]);

  if (!dog) notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {dog.photos.length > 0 ? (
            <img
              src={dog.photos[0]?.url}
              alt={dog.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900 text-2xl font-bold text-primary-700 dark:text-primary-300">
              {dog.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{dog.name}</h1>
            <p className="text-neutral-500">{dog.breed ?? '-'}</p>
          </div>
        </div>
        <Badge variant={dog.isActive ? 'success' : 'outline'}>
          {dog.isActive ? tc('active') : tc('inactive')}
        </Badge>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={t('detail.breed')} value={dog.breed ?? '-'} />
            {dog.breedSecondary && (
              <InfoRow label={t('detail.breedSecondary')} value={dog.breedSecondary} />
            )}
            <InfoRow label={t('detail.size')} value={t(`sizes.${dog.size}`)} />
            <InfoRow label={t('detail.weight')} value={dog.weightKg ? `${dog.weightKg} kg` : '-'} />
            <InfoRow label={t('detail.gender')} value={dog.gender ?? '-'} />
            <InfoRow
              label={t('detail.neutered')}
              value={dog.isNeutered == null ? '-' : dog.isNeutered ? tc('yes') : tc('no')}
            />
            <InfoRow label={t('detail.addedAt')} value={formatDate(dog.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.behaviorAndEnergy')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label={t('detail.energyLevel')} value={dog.energyLevel ?? '-'} />
            <InfoRow label={t('detail.behaviorWithDogs')} value={dog.behaviorWithDogs ?? '-'} />
            <InfoRow label={t('detail.behaviorWithPeople')} value={dog.behaviorWithPeople ?? '-'} />
            <InfoRow label={t('detail.leashBehavior')} value={dog.leashBehavior ?? '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.owner')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dog.ownerId ? (
              <a
                href={`/users/${dog.ownerId}`}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                {dog.ownerName ?? tc('unknown')}
              </a>
            ) : (
              <p className="text-sm text-neutral-500">{tc('unknown')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bio */}
      {dog.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.bio')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-700">{dog.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Photo Gallery */}
      {dog.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('detail.photos', { count: dog.photos.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {dog.photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg">
                  <img src={photo.url} alt={dog.name} className="h-full w-full object-cover" />
                  <Badge
                    variant={photo.moderationStatus === 'approved' ? 'success' : 'secondary'}
                    className="absolute bottom-2 left-2 text-xs"
                  >
                    {photo.moderationStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
