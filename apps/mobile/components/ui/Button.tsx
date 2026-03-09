import { Pressable, Text } from 'react-native';

interface ButtonProps {
  onPress: () => void;
  label: string;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
}

export function Button({ onPress, label, variant = 'primary', disabled = false }: ButtonProps) {
  const baseClass = 'items-center rounded-2xl py-4';

  const variantClasses = {
    primary: 'bg-primary',
    secondary: 'bg-secondary',
    outline: 'border-2 border-primary bg-transparent',
  };

  const textVariantClasses = {
    primary: 'text-white',
    secondary: 'text-white',
    outline: 'text-primary',
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`${baseClass} ${variantClasses[variant]} ${disabled ? 'opacity-50' : ''}`}
    >
      <Text className={`text-base font-semibold ${textVariantClasses[variant]}`}>{label}</Text>
    </Pressable>
  );
}
