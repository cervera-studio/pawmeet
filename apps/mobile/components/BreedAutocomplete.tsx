import { BREED_CODES, getBreedName } from '@pawmeet/config';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface BreedAutocompleteProps {
  value: string;
  onSelect: (breedCode: string) => void;
  placeholder: string;
  error?: string;
}

export function BreedAutocomplete({ value, onSelect, placeholder, error }: BreedAutocompleteProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const displayName = value ? getBreedName(value, locale) : '';

  const sortedBreedCodes = useMemo(
    () =>
      [...BREED_CODES].sort((a, b) =>
        getBreedName(a, locale).localeCompare(getBreedName(b, locale), locale),
      ),
    [locale],
  );

  const results = useMemo(() => {
    if (!query || query.length < 2) return sortedBreedCodes.slice(0, 20);
    const lower = query.toLowerCase();
    return sortedBreedCodes.filter((code) => {
      const name = getBreedName(code, locale).toLowerCase();
      const nameEn = getBreedName(code, 'en').toLowerCase();
      return name.includes(lower) || nameEn.includes(lower);
    });
  }, [query, locale, sortedBreedCodes]);

  const handleOpen = useCallback(() => {
    setQuery('');
    setOpen(true);
  }, []);

  const handleSelect = useCallback(
    (code: string) => {
      onSelect(code);
      setOpen(false);
    },
    [onSelect],
  );

  const handleClear = useCallback(() => {
    onSelect('');
  }, [onSelect]);

  return (
    <View>
      <Pressable
        onPress={handleOpen}
        className="mb-1 min-h-[52px] flex-row items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#38383A] dark:bg-[#2C2C2E]"
      >
        <Text
          className={
            value ? 'text-base text-gray-900 dark:text-[#F5F5F7]' : 'text-base text-[#9CA3AF]'
          }
        >
          {value ? displayName : placeholder}
        </Text>
        {value ? (
          <Pressable onPress={handleClear} hitSlop={8}>
            <Text className="text-sm text-gray-400">✕</Text>
          </Pressable>
        ) : (
          <Text className="text-lg text-gray-400">›</Text>
        )}
      </Pressable>
      {error ? <Text className="mb-3 px-1 text-sm text-red-500">{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pb-2 pt-2">
            <Pressable onPress={() => setOpen(false)}>
              <Text className="text-base text-primary">{t('common.cancel')}</Text>
            </Pressable>
            <Text className="text-base font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {placeholder}
            </Text>
            <View className="w-16" />
          </View>

          {/* Search */}
          <View className="px-4 pb-2">
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={t('common.search')}
              placeholderTextColor="#9CA3AF"
              autoFocus
              className="rounded-xl bg-gray-100 px-4 py-3 text-base text-gray-900 dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
            />
          </View>

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item)}
                className={`flex-row items-center justify-between border-b border-gray-100 px-4 py-3.5 dark:border-[#38383A] ${
                  item === value ? 'bg-primary/10 dark:bg-primary/15' : ''
                }`}
              >
                <Text
                  className={`text-base ${
                    item === value
                      ? 'font-semibold text-primary'
                      : 'text-gray-700 dark:text-[#D1D1D6]'
                  }`}
                >
                  {getBreedName(item, locale)}
                </Text>
                {item === value && <Text className="text-primary">✓</Text>}
              </Pressable>
            )}
            ListEmptyComponent={
              <View className="items-center py-10">
                <Text className="text-sm text-gray-400 dark:text-neutral-500">
                  {t('common.noResults')}
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
