import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useSafetyViewModel } from './_safety.view-model';

export default function SafetyModal() {
  const { t } = useTranslation();
  const vm = useSafetyViewModel();

  return (
    <ScrollView className="flex-1 bg-white dark:bg-[#1C1C1E]" contentContainerClassName="px-6 py-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900 dark:text-[#F5F5F7]">
        {t('safety.title')}
      </Text>
      <Text className="mb-6 text-sm text-gray-400 dark:text-neutral-500">
        {t('safety.description')}
      </Text>

      <View className="gap-1">
        {/* Emergency contacts section */}
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('safety.contactsSection')}
        </Text>

        {vm.loading ? (
          <View className="items-center py-8">
            <ActivityIndicator />
          </View>
        ) : (
          <>
            {vm.contacts.length === 0 ? (
              <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 py-6">
                <Text className="text-center text-sm text-gray-400 dark:text-neutral-500">
                  {t('safety.noContacts')}
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {vm.contacts.map((contact) => (
                  <View
                    key={contact.id}
                    className="flex-row items-center justify-between rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 py-4"
                  >
                    <View className="flex-1">
                      <Text className="text-base font-medium text-gray-700 dark:text-[#D1D1D6]">
                        {contact.name}
                      </Text>
                      <Text className="text-sm text-gray-400 dark:text-neutral-500">
                        {contact.phone}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => vm.removeContact(contact.id, contact.name)}
                      className="ml-3 h-8 w-8 items-center justify-center rounded-full"
                      hitSlop={8}
                    >
                      <Text className="text-lg font-bold text-red-500">✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {vm.canAddMore && (
              <View className="mt-4 border-t border-gray-100 dark:border-[#38383A] pt-4">
                <Text className="mb-3 text-sm font-medium text-gray-700 dark:text-[#D1D1D6]">
                  {t('safety.addContact')}
                </Text>

                <FormField
                  placeholder={t('safety.namePlaceholder')}
                  value={vm.form.name}
                  onChangeText={vm.setName}
                  error={vm.form.nameError}
                  autoCapitalize="words"
                  autoCorrect={false}
                />

                <FormField
                  placeholder={t('safety.phonePlaceholder')}
                  value={vm.form.phone}
                  onChangeText={vm.setPhone}
                  error={vm.form.phoneError}
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />

                <Button
                  onPress={vm.addContact}
                  label={vm.adding ? t('safety.adding') : t('common.add')}
                  disabled={vm.adding}
                />
              </View>
            )}
          </>
        )}

        {/* SOS info section */}
        <Text className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-neutral-500">
          {t('safety.howSosWorks')}
        </Text>

        <View className="rounded-2xl bg-gray-50 dark:bg-[#2C2C2E] px-4 py-4">
          <Text className="mb-2 text-sm leading-5 text-gray-700 dark:text-[#D1D1D6]">
            {t('safety.sosDescription')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
