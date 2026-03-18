import { lightColors, radius, spacing, typography } from '@pawmeet/design-tokens';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  testID?: string;
}

export function Input({ label, error, testID, onFocus, onBlur, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const borderStyle = (() => {
    if (error) return styles.borderError;
    if (focused) return styles.borderFocus;
    return styles.borderDefault;
  })();

  return (
    <View testID={testID} style={styles.wrapper}>
      {label ? (
        <Text style={styles.label} testID={testID ? `${testID}-label` : undefined}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholderTextColor={lightColors.textPlaceholder}
        accessibilityLabel={label}
        testID={testID ? `${testID}-input` : undefined}
        style={[styles.input, borderStyle]}
      />
      {error ? (
        <Text style={styles.error} testID={testID ? `${testID}-error` : undefined}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  label: {
    fontSize: typography.labelMedium.fontSize,
    fontWeight: typography.labelMedium.fontWeight,
    lineHeight: typography.labelMedium.lineHeight,
    color: lightColors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    height: spacing['4xl'],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.bodyMedium.fontSize,
    color: lightColors.textPrimary,
  },
  borderDefault: {
    borderWidth: 1,
    borderColor: lightColors.border,
  },
  borderFocus: {
    borderWidth: 2,
    borderColor: lightColors.primary,
  },
  borderError: {
    borderWidth: 2,
    borderColor: lightColors.error,
  },
  error: {
    fontSize: typography.bodySmall.fontSize - 1,
    color: lightColors.error,
    marginTop: spacing.xs,
  },
});
