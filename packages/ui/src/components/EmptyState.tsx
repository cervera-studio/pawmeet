import { StyleSheet, Text, View } from 'react-native';
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
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
});
