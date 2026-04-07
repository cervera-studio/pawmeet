import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import type { TextInputProps } from 'react-native';
import { Pressable, Text, View } from 'react-native';
import { Input } from '@/components/ui/Input';

interface FormFieldProps extends TextInputProps {
  /** Validation error message — when present, displayed below the input in red */
  error?: string;
  /** Bottom spacing applied when there is no error (defaults to "mb-4") */
  spacingClassName?: string;
}

/**
 * Wraps a TextInput with consistent error display and spacing.
 * When an error is present, shows the message and uses reduced bottom margin.
 * When no error, applies the default spacing to keep form layout consistent.
 */
export function FormField({
  error,
  spacingClassName = 'mb-4',
  className = '',
  secureTextEntry,
  ...inputProps
}: FormFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { colorScheme } = useColorScheme();
  const isPassword = secureTextEntry === true;

  return (
    <View>
      <View className="relative">
        <Input
          className={`mb-1 ${isPassword ? 'pr-12' : ''} ${className}`}
          secureTextEntry={isPassword && !passwordVisible}
          {...inputProps}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setPasswordVisible((v) => !v)}
            className="absolute right-3 top-0 bottom-1 items-center justify-center"
            hitSlop={8}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colorScheme === 'dark' ? '#9CA3AF' : '#6B7280'}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="mb-3 px-1 text-sm text-red-500">{error}</Text>
      ) : (
        <View className={spacingClassName} />
      )}
    </View>
  );
}
