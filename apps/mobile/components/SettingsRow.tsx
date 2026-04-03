import { Pressable, Switch, Text, View } from 'react-native';

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

const TRACK_COLOR = { true: '#065F46', false: '#636366' } as const;

export function SettingsRow({
  title,
  subtitle,
  value,
  onToggle,
  onPress,
  variant = 'default',
  disabled,
}: SettingsRowProps) {
  if (variant === 'danger') {
    return (
      <Pressable onPress={onPress} disabled={disabled} className="items-center py-3">
        <Text className="text-base font-medium text-red-500">{title}</Text>
      </Pressable>
    );
  }

  const content = (
    <>
      <View className="flex-1 pr-4">
        <Text className="text-base text-gray-700 dark:text-[#D1D1D6]">{title}</Text>
        {subtitle ? (
          <Text className="text-xs text-gray-400 dark:text-neutral-500">{subtitle}</Text>
        ) : null}
      </View>
      {onToggle != null ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={TRACK_COLOR}
          disabled={disabled}
        />
      ) : null}
      {onPress && !onToggle ? <Text className="text-lg text-gray-400">›</Text> : null}
    </>
  );

  if (onPress && !onToggle) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        className="flex-row items-center justify-between py-3"
      >
        {content}
      </Pressable>
    );
  }

  return <View className="flex-row items-center justify-between py-3">{content}</View>;
}
