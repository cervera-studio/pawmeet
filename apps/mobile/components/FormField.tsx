import { Text, View } from 'react-native';
import type { TextInputProps } from 'react-native';
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
  ...inputProps
}: FormFieldProps) {
  return (
    <View>
      <Input className={`mb-1 ${className}`} {...inputProps} />
      {error ? (
        <Text className="mb-3 px-1 text-sm text-red-500">{error}</Text>
      ) : (
        <View className={spacingClassName} />
      )}
    </View>
  );
}
