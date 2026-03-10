import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

type Dog = RouterOutput['dogs']['get']['dog'];
type DogPhoto = RouterOutput['dogs']['get']['photos'][number];

import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useImageUpload } from '@/hooks/useImageUpload';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

const MAX_PHOTOS = 6;

const LABEL_MAP: Record<string, string> = {
  toy: 'Toy',
  piccola: 'Piccola',
  media: 'Media',
  grande: 'Grande',
  gigante: 'Gigante',
  bassa: 'Bassa',
  alta: 'Alta',
  molto_alta: 'Molto alta',
  molto_socievole: 'Molto socievole',
  socievole: 'Socievole',
  selettivo: 'Selettivo',
  reattivo: 'Reattivo',
  timido: 'Timido',
  diffidente: 'Diffidente',
  eccellente: 'Eccellente',
  buono: 'Buono',
  in_addestramento: 'In addestramento',
  difficile: 'Difficile',
  affidabile: 'Affidabile',
  parziale: 'Parziale',
  non_affidabile: 'Non affidabile',
  maschio: 'Maschio',
  femmina: 'Femmina',
  mattina_presto: 'Mattina presto',
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  sera: 'Sera',
  sera_tardi: 'Sera tardi',
  urbano: 'Urbano',
  parco: 'Parco',
  campagna: 'Campagna',
  spiaggia: 'Spiaggia',
  montagna: 'Montagna',
};

function label(value: string): string {
  return LABEL_MAP[value] ?? value;
}

function calculateAge(birthDate: Date | string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  if (years < 1) {
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    return `${months} mesi`;
  }
  return `${years} ${years === 1 ? 'anno' : 'anni'}`;
}

function InfoChip({ title, value }: { title: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
      <Text className="text-xs text-gray-500">{title}</Text>
      <Text className="text-center text-sm font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

export default function DogDetailScreen() {
  const params = useLocalSearchParams<{ dogId: string }>();
  const router = useRouter();
  const storeDog = useDogsStore((s) => s.dogs.find((d) => d.id === params.dogId));
  const updateDogInStore = useDogsStore((s) => s.updateDog);
  const removeDogFromStore = useDogsStore((s) => s.removeDog);
  const [dog, setDog] = useState<Dog | null>(storeDog ?? null);
  const [photos, setPhotos] = useState<DogPhoto[]>([]);
  const [loading, setLoading] = useState(!storeDog);
  const [deleting, setDeleting] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const { uploading, uploadDogPhoto } = useImageUpload();

  useEffect(() => {
    if (params.dogId) {
      api.dogs.get
        .query({ id: params.dogId })
        .then(({ dog: d, photos: p }) => {
          setDog(d);
          setPhotos(p);
          setLoading(false);
        })
        .catch((e) => {
          logger.warn('DogDetail', 'Failed to fetch dog', e);
          setLoading(false);
        });
    }
  }, [params.dogId]);

  const handleUploadPhoto = async () => {
    if (!dog) return;
    const photo = await uploadDogPhoto(dog.id);
    if (photo) {
      setPhotos((prev) => [...prev, photo]);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (!dog) return;
    Alert.alert('Elimina foto', 'Sei sicuro di voler eliminare questa foto?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: async () => {
          setDeletingPhotoId(photoId);
          try {
            await api.dogs.deletePhoto.mutate({ dogId: dog.id, photoId });
            setPhotos((prev) => prev.filter((p) => p.id !== photoId));
          } catch (e) {
            logger.warn('DogDetail', 'Failed to delete photo', e);
            Alert.alert('Errore', 'Impossibile eliminare la foto. Riprova.');
          } finally {
            setDeletingPhotoId(null);
          }
        },
      },
    ]);
  };

  const handleToggleActive = async () => {
    if (!dog) return;
    try {
      if (dog.isActive) {
        await api.dogs.delete.mutate({ id: dog.id });
        setDog({ ...dog, isActive: false });
        updateDogInStore(dog.id, { isActive: false });
        return;
      }
      // Reactivation not yet supported via tRPC
    } catch (e) {
      logger.warn('DogDetail', 'Failed to toggle active status', e);
    }
  };

  const handleDelete = async () => {
    if (!dog) return;
    setDeleting(true);
    try {
      await api.dogs.delete.mutate({ id: dog.id });
      removeDogFromStore(dog.id);
      router.back();
    } catch (e) {
      logger.warn('DogDetail', 'Failed to delete dog', e);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: true, title: 'Caricamento...', headerBackTitle: 'Profilo' }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </>
    );
  }

  if (!dog) {
    return (
      <>
        <Stack.Screen
          options={{ headerShown: true, title: 'Errore', headerBackTitle: 'Profilo' }}
        />
        <View className="flex-1 items-center justify-center bg-white">
          <Text className="text-gray-500">Cane non trovato</Text>
        </View>
      </>
    );
  }

  // Use the first photo as the avatar image, if available
  const primaryPhoto = photos.find((p) => p.isPrimary) ?? photos[0];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: dog.name,
          headerBackTitle: 'Profilo',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <ScrollView contentContainerClassName="px-6 py-4">
          {/* Header */}
          <View className="items-center">
            <Avatar name={dog.name} imageUrl={primaryPhoto?.url} size="lg" />
            <Text className="mt-3 text-2xl font-bold text-gray-900">{dog.name}</Text>
            <Text className="text-base text-gray-500">{dog.breed}</Text>
            {dog.breedSecondary ? (
              <Text className="text-sm text-gray-400">Incrocio con {dog.breedSecondary}</Text>
            ) : null}
            <Text className="text-sm text-gray-400">
              {calculateAge(dog.birthDate)} - {label(dog.gender)} -{' '}
              {dog.isNeutered ? 'Sterilizzato/a' : 'Non sterilizzato/a'}
            </Text>
            {!dog.isActive && (
              <View className="mt-2 rounded-full bg-gray-200 px-3 py-1">
                <Text className="text-xs font-medium text-gray-600">Profilo disattivato</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {dog.bio ? (
            <View className="mt-6 rounded-2xl bg-gray-50 p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500">Bio</Text>
              <Text className="text-base text-gray-700">{dog.bio}</Text>
            </View>
          ) : null}

          {/* Stats row 1 */}
          <View className="mt-4 flex-row gap-3">
            <InfoChip title="Taglia" value={label(dog.size)} />
            <InfoChip title="Peso" value={`${dog.weightKg} kg`} />
            <InfoChip title="Energia" value={label(dog.energyLevel)} />
          </View>

          {/* Temperament */}
          <View className="mt-4 gap-3">
            <Text className="text-base font-semibold text-gray-900">Temperamento</Text>
            <View className="flex-row gap-3">
              <InfoChip title="Con cani" value={label(dog.behaviorWithDogs)} />
              <InfoChip title="Con persone" value={label(dog.behaviorWithPeople)} />
            </View>
            <View className="flex-row gap-3">
              <InfoChip title="Guinzaglio" value={label(dog.leashBehavior)} />
              {dog.recallReliability ? (
                <InfoChip title="Richiamo" value={label(dog.recallReliability)} />
              ) : (
                <View className="flex-1" />
              )}
            </View>
          </View>

          {/* Walk preferences */}
          <View className="mt-4 gap-3">
            <Text className="text-base font-semibold text-gray-900">Preferenze passeggiata</Text>
            <View className="rounded-2xl bg-gray-50 p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500">Orari</Text>
              <Text className="text-base text-gray-700">
                {dog.walkPrefTime.map(label).join(', ')}
              </Text>
            </View>
            <View className="rounded-2xl bg-gray-50 p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500">Terreno</Text>
              <Text className="text-base text-gray-700">
                {dog.walkPrefTerrain.map(label).join(', ')}
              </Text>
            </View>
            <View className="rounded-2xl bg-gray-50 p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500">Durata</Text>
              <Text className="text-base text-gray-700">
                {dog.walkPrefDurationMin} - {dog.walkPrefDurationMax} minuti
              </Text>
            </View>
          </View>

          {/* Photo gallery */}
          <View className="mt-4">
            <Text className="mb-2 text-base font-semibold text-gray-900">
              Foto ({photos.length}/{MAX_PHOTOS})
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onLongPress={() => handleDeletePhoto(photo.id)}
                  className="relative h-24 w-24 overflow-hidden rounded-xl"
                >
                  <Image source={{ uri: photo.url }} className="h-full w-full" resizeMode="cover" />
                  {deletingPhotoId === photo.id && (
                    <View className="absolute inset-0 items-center justify-center bg-black/40">
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                  {photo.moderationStatus === 'pending' && (
                    <View className="absolute bottom-1 left-1 rounded-full bg-yellow-500 px-1.5 py-0.5">
                      <Text className="text-[10px] font-medium text-white">In revisione</Text>
                    </View>
                  )}
                  {photo.moderationStatus === 'rejected' && (
                    <View className="absolute bottom-1 left-1 rounded-full bg-red-500 px-1.5 py-0.5">
                      <Text className="text-[10px] font-medium text-white">Rifiutata</Text>
                    </View>
                  )}
                </Pressable>
              ))}

              {/* Upload button — shown only when under the limit */}
              {photos.length < MAX_PHOTOS && (
                <Pressable
                  onPress={handleUploadPhoto}
                  disabled={uploading}
                  className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-300"
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FF6B35" />
                  ) : (
                    <Text className="text-2xl text-gray-400">+</Text>
                  )}
                </Pressable>
              )}
            </View>
            {photos.length > 0 && (
              <Text className="mt-1 text-xs text-gray-400">
                Tieni premuto su una foto per eliminarla
              </Text>
            )}
          </View>

          {/* Actions */}
          <View className="mt-8 gap-3 pb-4">
            <Button
              onPress={handleToggleActive}
              label={dog.isActive ? 'Disattiva profilo' : 'Attiva profilo'}
              variant="outline"
            />
            <Pressable onPress={handleDelete} disabled={deleting} className="items-center py-3">
              <Text className="text-base font-medium text-red-500">
                {deleting ? 'Eliminazione...' : 'Elimina profilo cane'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
