import { Text, View } from 'react-native';

interface AvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-24 w-24',
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-3xl',
};

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      className={`items-center justify-center rounded-full bg-primary-100 ${sizeClasses[size]}`}
    >
      <Text className={`font-semibold text-primary ${textSizeClasses[size]}`}>{initials}</Text>
    </View>
  );
}
