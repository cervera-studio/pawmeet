import { StyleSheet, Text, View } from 'react-native';
import { lightColors, spacing, typography } from '@pawmeet/design-tokens';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({ title, description, actionLabel, onAction, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.container} accessibilityRole="summary">
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="compact"
          testID={testID ? `${testID}-action` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
  },
  title: {
    fontSize: typography.headingMedium.fontSize,
    fontWeight: typography.headingMedium.fontWeight,
    lineHeight: typography.headingMedium.lineHeight,
    color: lightColors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: typography.bodyMedium.fontWeight,
    lineHeight: typography.bodyMedium.lineHeight,
    color: lightColors.textPlaceholder,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
