import { Pressable, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface DogProfileCardProps {
  name: string;
  breed: string;
  age: string;
  imageUrl?: string | null;
  onPress?: () => void;
}

export function DogProfileCard({ name, breed, age, onPress }: DogProfileCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center rounded-2xl bg-white dark:bg-[#1C1C1E] p-4 shadow-sm"
    >
      <Avatar name={name} size="md" />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">{name}</Text>
        <Text className="text-sm text-gray-500 dark:text-neutral-500">
          {breed} - {age}
        </Text>
      </View>
      <Text className="text-gray-400 dark:text-neutral-500">›</Text>
    </Pressable>
  );
}
