import type { RouterOutput } from '@dogwalk/api-client';
import { formatDogAge } from '@dogwalk/utils';
import { Stack } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { label, MAX_PHOTOS, useDogDetailViewModel } from './[dogId].view-model';

type Dog = RouterOutput['dogs']['get']['dog'];
type DogPhoto = RouterOutput['dogs']['get']['photos'][number];

function InfoChip({ title, value }: { title: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-xl bg-primary-50 p-3">
      <Text className="text-xs text-gray-500">{title}</Text>
      <Text className="text-center text-sm font-semibold text-gray-900">{value}</Text>
    </View>
  );
}

function DogHeader({ dog, primaryPhotoUrl }: { dog: Dog; primaryPhotoUrl: string | undefined }) {
  return (
    <View className="items-center">
      <Avatar name={dog.name} imageUrl={primaryPhotoUrl} size="lg" />
      <Text className="mt-3 text-2xl font-bold text-gray-900">{dog.name}</Text>
      <Text className="text-base text-gray-500">{dog.breed}</Text>
      {dog.breedSecondary ? (
        <Text className="text-sm text-gray-400">Incrocio con {dog.breedSecondary}</Text>
      ) : null}
      <Text className="text-sm text-gray-400">
        {formatDogAge(new Date(dog.birthDate))} - {label(dog.gender)} -{' '}
        {dog.isNeutered ? 'Sterilizzato/a' : 'Non sterilizzato/a'}
      </Text>
      {!dog.isActive && (
        <View className="mt-2 rounded-full bg-gray-200 px-3 py-1">
          <Text className="text-xs font-medium text-gray-600">Profilo disattivato</Text>
        </View>
      )}
    </View>
  );
}

function DogInfoChips({ dog }: { dog: Dog }) {
  return (
    <View className="mt-4 flex-row gap-3">
      <InfoChip title="Taglia" value={label(dog.size)} />
      <InfoChip title="Peso" value={`${dog.weightKg} kg`} />
      <InfoChip title="Energia" value={label(dog.energyLevel)} />
    </View>
  );
}

function DogTraits({ dog }: { dog: Dog }) {
  return (
    <>
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
          <Text className="text-base text-gray-700">{dog.walkPrefTime.map(label).join(', ')}</Text>
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
    </>
  );
}

function PhotoGallery({
  photos,
  deletingPhotoId,
  uploading,
  onUploadPhoto,
  onDeletePhoto,
}: {
  photos: DogPhoto[];
  deletingPhotoId: string | null;
  uploading: boolean;
  onUploadPhoto: () => void;
  onDeletePhoto: (photoId: string) => void;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-base font-semibold text-gray-900">
        Foto ({photos.length}/{MAX_PHOTOS})
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((photo) => (
          <Pressable
            key={photo.id}
            onLongPress={() => onDeletePhoto(photo.id)}
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
            onPress={onUploadPhoto}
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
        <Text className="mt-1 text-xs text-gray-400">Tieni premuto su una foto per eliminarla</Text>
      )}
    </View>
  );
}

function DogActions({
  isActive,
  deleting,
  onToggleActive,
  onDelete,
}: {
  isActive: boolean;
  deleting: boolean;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="mt-8 gap-3 pb-4">
      <Button
        onPress={onToggleActive}
        label={isActive ? 'Disattiva profilo' : 'Attiva profilo'}
        variant="outline"
      />
      <Pressable onPress={onDelete} disabled={deleting} className="items-center py-3">
        <Text className="text-base font-medium text-red-500">
          {deleting ? 'Eliminazione...' : 'Elimina profilo cane'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function DogDetailScreen() {
  const vm = useDogDetailViewModel();

  if (vm.loading) {
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

  if (!vm.dog) {
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
          title: vm.dog.name,
          headerBackTitle: 'Profilo',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <ScrollView contentContainerClassName="px-6 py-4">
          {/* Header */}
          <DogHeader dog={vm.dog} primaryPhotoUrl={vm.primaryPhoto?.url} />

          {/* Rating */}
          {vm.dogRating && vm.dogRating.count > 0 && (
            <View className="mt-3 flex-row items-center justify-center gap-1">
              <Text className="text-base">{'\u{2B50}'}</Text>
              <Text className="text-base font-semibold text-gray-900">
                {vm.dogRating.average?.toFixed(1) ?? '-'}
              </Text>
              <Text className="text-sm text-gray-500">
                ({vm.dogRating.count} {vm.dogRating.count === 1 ? 'recensione' : 'recensioni'})
              </Text>
            </View>
          )}

          {/* Badges */}
          <View className="mt-4">
            <Text className="mb-2 text-base font-semibold text-gray-900">Badge</Text>
            <BadgeDisplay badges={vm.badges} />
          </View>

          {/* Bio */}
          {vm.dog.bio ? (
            <View className="mt-6 rounded-2xl bg-gray-50 p-4">
              <Text className="mb-1 text-sm font-medium text-gray-500">Bio</Text>
              <Text className="text-base text-gray-700">{vm.dog.bio}</Text>
            </View>
          ) : null}

          {/* Stats */}
          <DogInfoChips dog={vm.dog} />

          {/* Traits & Walk preferences */}
          <DogTraits dog={vm.dog} />

          {/* Photo gallery */}
          <PhotoGallery
            photos={vm.photos}
            deletingPhotoId={vm.deletingPhotoId}
            uploading={vm.uploading}
            onUploadPhoto={vm.handleUploadPhoto}
            onDeletePhoto={vm.handleDeletePhoto}
          />

          {/* Actions */}
          <DogActions
            isActive={vm.dog.isActive}
            deleting={vm.deleting}
            onToggleActive={vm.handleToggleActive}
            onDelete={vm.handleDelete}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
