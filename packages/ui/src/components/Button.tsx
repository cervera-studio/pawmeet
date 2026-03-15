import { lightColors, radius, spacing, typography } from '@pawmeet/design-tokens';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from 'react-native';

const VARIANT_STYLES = {
  primary: {
    backgroundColor: lightColors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: lightColors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  destructive: {
    backgroundColor: lightColors.error,
  },
} as const satisfies Record<string, ViewStyle>;

const TEXT_COLORS: Record<ButtonVariant, string> = {
  primary: lightColors.textInverse,
  secondary: lightColors.primary,
  ghost: lightColors.textSecondary,
  destructive: lightColors.textInverse,
};

const HEIGHTS: Record<ButtonSize, number> = {
  compact: spacing['3xl'], // 40
  standard: spacing['4xl'], // 48
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
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  disabled: {
    opacity: 0.4,
  },
  text: {
    fontSize: typography.labelLarge.fontSize,
    fontWeight: typography.labelLarge.fontWeight,
    lineHeight: typography.labelLarge.lineHeight,
  },
});
