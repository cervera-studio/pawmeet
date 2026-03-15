import { lightColors, radius, spacing, typography } from '@pawmeet/design-tokens';
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
  compatibilityHigh: { backgroundColor: `${lightColors.success}1A`, color: lightColors.success },
  compatibilityMedium: { backgroundColor: `${lightColors.warning}1A`, color: lightColors.warning },
  verified: { backgroundColor: `${lightColors.info}1A`, color: lightColors.info },
  premium: { backgroundColor: lightColors.secondary50, color: lightColors.secondaryText },
  size: { backgroundColor: lightColors.surfaceCard, color: lightColors.textSecondary },
  energy: { backgroundColor: lightColors.surfaceCard, color: lightColors.textSecondary },
  new: { backgroundColor: lightColors.primary, color: lightColors.textInverse },
  counter: { backgroundColor: lightColors.primary, color: lightColors.textInverse },
};

const SIZE_STYLES: Record<
  BadgeSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: {
    height: spacing.lg,
    paddingHorizontal: spacing.sm - 2,
    fontSize: typography.labelSmall.fontSize,
  },
  md: {
    height: spacing.xl,
    paddingHorizontal: spacing.sm,
    fontSize: typography.labelMedium.fontSize,
  },
  lg: {
    height: spacing['2xl'],
    paddingHorizontal: spacing.md,
    fontSize: typography.labelMedium.fontSize,
  },
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
  const borderRadius = ROUND_VARIANTS.has(variant) ? radius.full : radius.sm;

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
    fontWeight: typography.labelMedium.fontWeight,
  },
});
