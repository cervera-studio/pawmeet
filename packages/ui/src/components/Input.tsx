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

  const borderStyle = error
    ? styles.borderError
    : focused
      ? styles.borderFocus
      : styles.borderDefault;

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
        placeholderTextColor="#8E8E93"
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
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: '#4A4A5A',
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1A1A2E',
  },
  borderDefault: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
  },
  borderFocus: {
    borderWidth: 2,
    borderColor: '#065F46',
  },
  borderError: {
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  error: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
});
