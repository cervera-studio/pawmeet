export { ScreenErrorBoundary as ErrorBoundary } from '@/components/ErrorBoundary';

import type { DiscoveryFilters } from '@pawmeet/types';
import { formatDogAge } from '@pawmeet/utils';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DogSelector } from '@/components/DogSelector';
import { MatchCelebration } from '@/components/MatchCelebration';
import { SwipeCard } from '@/components/SwipeCard';
import { useDiscoveryViewModel } from './index.view-model';

// ── Filter configuration ────────────────────────────────────────────────────

type FilterSection<K extends keyof DiscoveryFilters> = {
  key: K;
  label: string;
  options: { value: string; label: string }[];
};

const FILTER_SECTIONS: FilterSection<keyof DiscoveryFilters>[] = [
  {
    key: 'size',
    label: 'Taglia',
    options: [
      { value: 'toy', label: 'Toy' },
      { value: 'piccola', label: 'Piccola' },
      { value: 'media', label: 'Media' },
      { value: 'grande', label: 'Grande' },
      { value: 'gigante', label: 'Gigante' },
    ],
  },
  {
    key: 'energyLevel',
    label: 'Energia',
    options: [
      { value: 'bassa', label: 'Bassa' },
      { value: 'media', label: 'Media' },
      { value: 'alta', label: 'Alta' },
      { value: 'molto_alta', label: 'Molto alta' },
    ],
  },
  {
    key: 'gender',
    label: 'Genere',
    options: [
      { value: 'maschio', label: 'Maschio' },
      { value: 'femmina', label: 'Femmina' },
    ],
  },
  {
    key: 'behaviorWithDogs',
    label: 'Comportamento',
    options: [
      { value: 'molto_socievole', label: 'Molto socievole' },
      { value: 'socievole', label: 'Socievole' },
      { value: 'selettivo', label: 'Selettivo' },
      { value: 'reattivo', label: 'Reattivo' },
    ],
  },
  {
    key: 'walkPrefTime',
    label: 'Orari',
    options: [
      { value: 'mattina_presto', label: 'Mattina presto' },
      { value: 'mattina', label: 'Mattina' },
      { value: 'pomeriggio', label: 'Pomeriggio' },
      { value: 'sera', label: 'Sera' },
      { value: 'sera_tardi', label: 'Sera tardi' },
    ],
  },
  {
    key: 'walkPrefTerrain',
    label: 'Terreno',
    options: [
      { value: 'urbano', label: 'Urbano' },
      { value: 'parco', label: 'Parco' },
      { value: 'campagna', label: 'Campagna' },
      { value: 'spiaggia', label: 'Spiaggia' },
      { value: 'montagna', label: 'Montagna' },
    ],
  },
];

const DISTANCE_STEPS = [1, 3, 5, 10, 15, 20, 30, 50];

// ── Chip component ──────────────────────────────────────────────────────────

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 rounded-full px-4 py-2 ${selected ? 'bg-primary' : 'bg-gray-200'}`}
    >
      <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

// ── Filter modal ────────────────────────────────────────────────────────────

function FilterModal({
  visible,
  filters,
  onApply,
  onClose,
}: {
  visible: boolean;
  filters: DiscoveryFilters;
  onApply: (f: DiscoveryFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DiscoveryFilters>(filters);

  // Sync draft when modal opens
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const toggleValue = (key: keyof DiscoveryFilters, value: string) => {
    setDraft((prev) => {
      const current = (prev[key] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next.length > 0 ? next : undefined };
    });
  };

  const handleReset = () => setDraft({});

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
          {/* Handle bar */}
          <View className="mb-4 items-center">
            <View className="h-1 w-10 rounded-full bg-gray-300" />
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-gray-900">Filtri</Text>
            <Pressable onPress={handleReset}>
              <Text className="font-semibold text-primary">Resetta</Text>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {FILTER_SECTIONS.map((section) => (
              <View key={section.key} className="mb-5">
                <Text className="mb-2 text-sm font-semibold text-gray-600">{section.label}</Text>
                <View className="flex-row flex-wrap">
                  {section.options.map((opt) => {
                    const selected = ((draft[section.key] as string[] | undefined) ?? []).includes(
                      opt.value,
                    );
                    return (
                      <FilterChip
                        key={opt.value}
                        label={opt.label}
                        selected={selected}
                        onPress={() => toggleValue(section.key, opt.value)}
                      />
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Distance slider (discrete steps) */}
            <View className="mb-5">
              <Text className="mb-2 text-sm font-semibold text-gray-600">
                Distanza massima
                {draft.maxDistanceKm ? ` — ${draft.maxDistanceKm} km` : ''}
              </Text>
              <View className="flex-row flex-wrap">
                {DISTANCE_STEPS.map((km) => (
                  <FilterChip
                    key={km}
                    label={`${km} km`}
                    selected={draft.maxDistanceKm === km}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        maxDistanceKm: prev.maxDistanceKm === km ? undefined : km,
                      }))
                    }
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={handleApply} className="mt-2 rounded-2xl bg-primary py-4">
            <Text className="text-center text-base font-bold text-white">Applica filtri</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Discovery screen ────────────────────────────────────────────────────────

export default function DiscoveryScreen() {
  const vm = useDiscoveryViewModel();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Scopri</Text>
          <Text className="text-sm text-gray-500">Cani nelle vicinanze</Text>
        </View>
        <Pressable
          onPress={vm.openFilterModal}
          className="relative h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <Text className="text-lg">{vm.activeFilterCount > 0 ? '\u2699\uFE0F' : '\u2699'}</Text>
          {vm.activeFilterCount > 0 && (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
              <Text className="text-xs font-bold text-white">{vm.activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Dog selector (visible only with multiple dogs) */}
      <DogSelector />

      {/* Card area */}
      <View className="flex-1 items-center justify-center px-4">
        {vm.dogs.length === 0 ? (
          <View className="items-center px-8">
            <Text className="text-5xl">{'\u{1F436}'}</Text>
            <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
              Aggiungi il tuo cane
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Per iniziare a scoprire cani compatibili, aggiungi il tuo primo cane.
            </Text>
            <Pressable
              onPress={vm.navigateToAddDog}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">Aggiungi cane</Text>
            </Pressable>
          </View>
        ) : !vm.coordinates ? (
          <View className="items-center px-8">
            <Text className="text-5xl">📍</Text>
            <Text className="mt-4 text-center text-lg font-semibold text-gray-900">
              Posizione necessaria
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Abilita la posizione per scoprire cani nelle vicinanze.
            </Text>
            <Pressable
              onPress={vm.getCurrentLocation}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">Abilita posizione</Text>
            </Pressable>
          </View>
        ) : vm.isLoading ? (
          <View className="items-center">
            <ActivityIndicator size="large" color="#065F46" />
            <Text className="mt-4 text-gray-400">Cerco cani compatibili...</Text>
          </View>
        ) : vm.currentProfile && vm.hasMore ? (
          <SwipeCard
            dog={{
              dogId: vm.currentProfile.dog.id,
              name: vm.currentProfile.dog.name,
              breed: vm.currentProfile.dog.breed,
              age: formatDogAge(new Date(vm.currentProfile.dog.birthDate)),
              distanceKm: vm.currentProfile.distanceKm,
              compatibilityScore: vm.currentProfile.compatibilityScore,
              ownerName: vm.currentProfile.dog.ownerId,
              imageUrl: null,
            }}
            onSwipeRight={vm.handleSwipeRight}
            onSwipeLeft={vm.handleSwipeLeft}
            onSwipeUp={vm.handleSuperLike}
          />
        ) : (
          <View className="items-center">
            <Text className="text-5xl">🐕</Text>
            <Text className="mt-4 text-lg font-semibold text-gray-900">Nessun altro profilo</Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Hai visto tutti i cani nelle vicinanze. Riprova più tardi!
            </Text>
            <Pressable
              onPress={vm.fetchSuggestions}
              className="mt-6 rounded-2xl bg-primary px-8 py-3"
            >
              <Text className="font-semibold text-white">Aggiorna</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Action buttons */}
      {vm.currentProfile && vm.hasMore && (
        <View className="flex-row items-center justify-center gap-6 pb-4">
          <Pressable
            onPress={vm.handleSwipeLeft}
            className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-md"
          >
            <Text className="text-2xl">✕</Text>
          </Pressable>
          <Pressable
            onPress={vm.handleSuperLike}
            className="h-14 w-14 items-center justify-center rounded-full bg-blue-500 shadow-md"
          >
            <Text className="text-xl text-white">★</Text>
          </Pressable>
          <Pressable
            onPress={vm.handleSwipeRight}
            className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-md"
          >
            <Text className="text-2xl">🐾</Text>
          </Pressable>
        </View>
      )}

      {/* Match celebration overlay */}
      {vm.newMatch?.isMatch && (
        <MatchCelebration
          onDismiss={vm.dismissMatch}
          onChat={() => {
            vm.dismissMatch();
            if (vm.newMatch?.match) {
              vm.navigateToChat(vm.newMatch.match.id);
            }
          }}
        />
      )}

      {/* Filter modal */}
      <FilterModal
        visible={vm.filterModalVisible}
        filters={vm.filters}
        onApply={vm.handleApplyFilters}
        onClose={vm.closeFilterModal}
      />
    </SafeAreaView>
  );
}
