import { View, Text } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface MatchCardProps {
  dogName: string;
  ownerName: string;
  breed: string;
  matchedAt: string;
}

export function MatchCard({ dogName, ownerName, breed, matchedAt }: MatchCardProps) {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-white p-4 shadow-sm">
      <Avatar name={dogName} size="md" />
      <View className="ml-3 flex-1">
        <Text className="text-base font-semibold text-gray-900">
          {dogName} & {ownerName}
        </Text>
        <Text className="text-sm text-gray-500">{breed}</Text>
      </View>
      <Text className="text-xs text-gray-400">{matchedAt}</Text>
    </View>
  );
}
