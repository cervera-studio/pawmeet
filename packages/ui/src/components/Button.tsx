import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';

const VARIANT_STYLES = {
  primary: {
    backgroundColor: '#FF6B35',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: '#FF3B30',
  },
} as const satisfies Record<string, ViewStyle>;

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: '#FFFFFF',
  secondary: '#FF6B35',
  ghost: '#4A4A5A',
  destructive: '#FFFFFF',
};

const HEIGHTS: Record<ButtonSize, number> = {
  compact: 40,
  standard: 48,
  large: 56,
};

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type ButtonSize = 'compact' | 'standard' | 'large';

interface ButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'standard',
  loading = false,
  disabled = false,
  onPress,
  testID,
}: ButtonProps) {
  const textColor = TEXT_COLORS[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading }}
      testID={testID}
      style={[
        styles.base,
        { height: HEIGHTS[size] },
        VARIANT_STYLES[variant],
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} testID={testID ? `${testID}-loader` : undefined} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 22,
  },
});
