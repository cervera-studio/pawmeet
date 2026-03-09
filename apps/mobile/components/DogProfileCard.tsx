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
      className="flex-row items-center rounded-2xl bg-white p-4 shadow-sm"
    >
      <Avatar name={name} size="md" />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-gray-900">{name}</Text>
        <Text className="text-sm text-gray-500">
          {breed} - {age}
        </Text>
      </View>
      <Text className="text-gray-400">›</Text>
    </Pressable>
  );
}
