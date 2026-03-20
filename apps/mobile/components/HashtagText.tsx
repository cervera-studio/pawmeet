import { useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { Text } from 'react-native';

interface HashtagTextProps {
  text: string;
  authorName?: string;
  className?: string;
  numberOfLines?: number;
}

const HASHTAG_REGEX = /#(\w{2,})/g;

/**
 * Renders text with tappable hashtags that navigate to the hashtag feed screen.
 */
export const HashtagText = memo(function HashtagText({
  text,
  authorName,
  className,
  numberOfLines,
}: HashtagTextProps) {
  const router = useRouter();

  const handleHashtagPress = useCallback(
    (hashtag: string) => {
      router.push(`/(tabs)/feed/hashtag?hashtag=${encodeURIComponent(hashtag)}`);
    },
    [router],
  );

  const parts: Array<{ text: string; isHashtag: boolean; tag?: string }> = [];
  let lastIndex = 0;

  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push({ text: text.slice(lastIndex, matchIndex), isHashtag: false });
    }
    parts.push({ text: match[0], isHashtag: true, tag: match[1] });
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isHashtag: false });
  }

  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {authorName ? <Text className="font-semibold">{authorName} </Text> : null}
      {parts.map((part) =>
        part.isHashtag ? (
          <Text
            key={part.text}
            className="font-semibold text-emerald-700 dark:text-emerald-400"
            onPress={() => handleHashtagPress(part.tag!)}
          >
            {part.text}
          </Text>
        ) : (
          <Text key={part.text}>{part.text}</Text>
        ),
      )}
    </Text>
  );
});
