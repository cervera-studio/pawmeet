import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import { lightColors, spacing } from '@pawmeet/design-tokens';

const SIZES = {
  xs: spacing.xl,       // 24
  sm: spacing['2xl'],   // 32
  md: spacing['3xl'],   // 40
  lg: spacing['4xl'],   // 48
  xl: spacing['5xl'],   // 64
  '2xl': 96,
} as const;

type AvatarSize = keyof typeof SIZES;
type AvatarType = 'user' | 'dog';

interface AvatarProps {
  source?: ImageSourcePropType;
  size?: AvatarSize;
  type?: AvatarType;
  bordered?: boolean;
  testID?: string;
}

export function Avatar({
  source,
  size = 'md',
  type = 'user',
  bordered = false,
  testID,
}: AvatarProps) {
  const dimension = SIZES[size];
  const placeholderColor = type === 'dog' ? lightColors.primary50 : lightColors.surfaceCard;

  return (
    <View
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={type === 'dog' ? 'Dog avatar' : 'User avatar'}
      style={[
        styles.container,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
        bordered && styles.bordered,
        !source && { backgroundColor: placeholderColor },
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{
            width: dimension - (bordered ? 4 : 0),
            height: dimension - (bordered ? 4 : 0),
            borderRadius: (dimension - (bordered ? 4 : 0)) / 2,
          }}
          testID={testID ? `${testID}-image` : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bordered: {
    borderWidth: 2,
    borderColor: lightColors.textInverse,
  },
});
