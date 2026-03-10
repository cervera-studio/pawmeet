import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

type Dog = RouterOutput['dogs']['get']['dog'];

import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/trpc';
import { useDogsStore } from '@/stores/dogs';

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
  const [loading, setLoading] = useState(!storeDog);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!storeDog && params.dogId) {
      api.dogs.get
        .query({ id: params.dogId })
        .then(({ dog: d }) => {
          setDog(d);
          setLoading(false);
        })
        .catch((e) => {
          logger.warn('DogDetail', 'Failed to fetch dog', e);
          setLoading(false);
        });
    }
  }, [storeDog, params.dogId]);

  const handleToggleActive = async () => {
    if (!dog) return;
    try {
      // Toggle active status via soft delete/reactivate
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
            <Avatar name={dog.name} size="lg" />
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

          {/* Photo placeholder */}
          <View className="mt-4">
            <Text className="mb-2 text-base font-semibold text-gray-900">Foto</Text>
            <View className="flex-row gap-2">
              <View className="h-24 w-24 items-center justify-center rounded-xl bg-gray-100">
                <Text className="text-2xl">🐕</Text>
              </View>
              <Pressable className="h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-gray-200">
                <Text className="text-2xl">+</Text>
              </Pressable>
            </View>
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
