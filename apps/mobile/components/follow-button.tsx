import { ActivityIndicator, Pressable, Text } from 'react-native';
import type { FollowState } from './follow-button.view-model';
import { useFollowButtonViewModel } from './follow-button.view-model';

const LABELS: Record<FollowState, string> = {
  idle: 'Segui',
  following: 'Seguendo',
  follows_you: 'Segui anche tu',
  loading: 'Segui',
};

type Props = {
  userId: string;
  size?: 'sm' | 'md';
};

export function FollowButton({ userId, size = 'md' }: Props) {
  const vm = useFollowButtonViewModel(userId);

  const isFilled = vm.state === 'idle' || vm.state === 'follows_you' || vm.state === 'loading';
  const paddingClass = size === 'sm' ? 'px-3 py-1.5' : 'px-5 py-2.5';

  return (
    <Pressable
      onPress={vm.handlePress}
      disabled={vm.loading}
      className={`items-center justify-center rounded-xl ${paddingClass} ${
        isFilled ? 'bg-primary' : 'border border-primary bg-transparent'
      } ${vm.loading ? 'opacity-60' : ''}`}
    >
      {vm.loading ? (
        <ActivityIndicator size="small" color={isFilled ? '#ffffff' : '#065F46'} />
      ) : (
        <Text
          className={`font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'} ${
            isFilled ? 'text-white' : 'text-primary'
          }`}
        >
          {LABELS[vm.state]}
        </Text>
      )}
    </Pressable>
  );
}
