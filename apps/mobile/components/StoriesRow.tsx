import { memo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

interface StoryGroup {
  author: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  stories: unknown[];
  hasUnviewed: boolean;
}

interface StoriesRowProps {
  groups: StoryGroup[];
  onPress: (authorId: string) => void;
  onCreateStory?: () => void;
}

const StoryCircle = memo(function StoryCircle({
  group,
  onPress,
}: {
  group: StoryGroup;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center px-2">
      <View
        className={`rounded-full p-0.5 ${group.hasUnviewed ? 'border-2 border-emerald-700' : 'border-2 border-gray-200 dark:border-[#38383A]'}`}
      >
        <Avatar size="md" imageUrl={group.author.avatarUrl} name={group.author.displayName} />
      </View>
      <Text className="mt-1 text-xs text-gray-600 dark:text-[#D1D1D6]" numberOfLines={1}>
        {group.author.displayName.split(' ')[0]}
      </Text>
    </Pressable>
  );
});

function CreateStoryButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="items-center px-2">
      <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-emerald-700">
        <Text className="text-lg text-emerald-700">+</Text>
      </View>
      <Text className="mt-1 text-xs text-emerald-700">La tua</Text>
    </Pressable>
  );
}

export const StoriesRow = memo(function StoriesRow({
  groups,
  onPress,
  onCreateStory,
}: StoriesRowProps) {
  return (
    <View className="border-b border-gray-100 dark:border-[#38383A] py-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2">
        {onCreateStory ? <CreateStoryButton onPress={onCreateStory} /> : null}
        {groups.map((group) => (
          <StoryCircle
            key={group.author.id}
            group={group}
            onPress={() => onPress(group.author.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
});
