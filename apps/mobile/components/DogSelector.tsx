import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { useDogsStore } from '@/stores/dogs';

/**
 * Horizontal chip selector for switching the active dog.
 * Hidden when the user has only one dog.
 */
export function DogSelector() {
  const dogs = useDogsStore((s) => s.dogs);
  const selectedDogId = useDogsStore((s) => s.selectedDogId);
  const setSelectedDog = useDogsStore((s) => s.setSelectedDog);

  // Don't render if user has 0 or 1 dog
  if (dogs.length <= 1) return null;

  return (
    <View className="px-4 py-2">
      <Text className="mb-2 text-xs font-medium text-gray-500 dark:text-neutral-500">Scopri con</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2">
          {dogs.map((dog) => {
            const isSelected = dog.id === selectedDogId;
            return (
              <Pressable
                key={dog.id}
                onPress={() => setSelectedDog(dog.id)}
                className={`flex-row items-center rounded-full px-3 py-2 ${
                  isSelected ? 'bg-primary' : 'bg-gray-100 dark:bg-[#38383A]'
                }`}
              >
                <Avatar name={dog.name} size="sm" />
                <Text
                  className={`ml-2 text-sm font-medium ${
                    isSelected ? 'text-white' : 'text-gray-700 dark:text-[#D1D1D6]'
                  }`}
                >
                  {dog.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
