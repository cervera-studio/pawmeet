import { StyleSheet, Text, View } from 'react-native';

type BadgeVariant =
  | 'compatibilityHigh'
  | 'compatibilityMedium'
  | 'verified'
  | 'premium'
  | 'size'
  | 'energy'
  | 'new'
  | 'counter';

type BadgeSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<BadgeVariant, { backgroundColor: string; color: string }> = {
  compatibilityHigh: { backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34C759' },
  compatibilityMedium: { backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#FF9500' },
  verified: { backgroundColor: 'rgba(0, 122, 255, 0.1)', color: '#007AFF' },
  premium: { backgroundColor: '#FFF8E1', color: '#FFD700' },
  size: { backgroundColor: '#F2F2F7', color: '#4A4A5A' },
  energy: { backgroundColor: '#F2F2F7', color: '#4A4A5A' },
  new: { backgroundColor: '#065F46', color: '#FFFFFF' },
  counter: { backgroundColor: '#065F46', color: '#FFFFFF' },
};

const SIZE_STYLES: Record<
  BadgeSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { height: 20, paddingHorizontal: 6, fontSize: 11 },
  md: { height: 24, paddingHorizontal: 8, fontSize: 13 },
  lg: { height: 32, paddingHorizontal: 12, fontSize: 13 },
};

const ROUND_VARIANTS: ReadonlySet<BadgeVariant> = new Set([
  'compatibilityHigh',
  'compatibilityMedium',
  'verified',
  'premium',
  'new',
  'counter',
]);

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  testID?: string;
}

export function Badge({ label, variant = 'size', size = 'md', testID }: BadgeProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const sizeStyle = SIZE_STYLES[size];
  const borderRadius = ROUND_VARIANTS.has(variant) ? 9999 : 4;

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          backgroundColor: variantStyle.backgroundColor,
          borderRadius,
        },
      ]}
    >
      <Text style={[styles.text, { color: variantStyle.color, fontSize: sizeStyle.fontSize }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '500',
  },
});
