import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';

const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
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
  const placeholderColor = type === 'dog' ? '#FFF3ED' : '#E5E5EA';

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
    borderColor: '#FFFFFF',
  },
});
