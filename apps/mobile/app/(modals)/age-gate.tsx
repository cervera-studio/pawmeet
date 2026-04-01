import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { MIN_USER_AGE } from '@pawmeet/config';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useAgeGateViewModel } from './_vm/age-gate.view-model';

export default function AgeGateScreen() {
  const { t } = useTranslation();
  const vm = useAgeGateViewModel();
  const isDark = useColorScheme() === 'dark';

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  const openDatePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      vm.openPicker();
    } else {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [vm]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-8"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-[#F5F5F7]">
          {t('auth.ageGate.title')}
        </Text>
        <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
          {t('auth.ageGate.description', { age: MIN_USER_AGE })}
        </Text>

        {vm.error ? (
          <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-600">{vm.error}</Text>
          </View>
        ) : null}

        <View>
          <Pressable
            onPress={openDatePicker}
            className="mb-1 min-h-[52px] justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#38383A] dark:bg-[#2C2C2E]"
          >
            <Text
              className={
                vm.dateOfBirth
                  ? 'text-base text-gray-900 dark:text-[#F5F5F7]'
                  : 'text-base text-[#9CA3AF]'
              }
            >
              {vm.dateOfBirth
                ? vm.dateOfBirth.toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : t('auth.ageGate.dateOfBirthPlaceholder')}
            </Text>
          </Pressable>
          <View className="mb-8" />
        </View>

        <Button
          onPress={vm.handleSubmit}
          label={vm.loading ? t('auth.ageGate.submitting') : t('auth.ageGate.submitButton')}
          disabled={vm.loading}
        />
      </ScrollView>

      {Platform.OS === 'android' && vm.showPicker && (
        <DateTimePicker
          value={vm.dateOfBirth ?? new Date(2000, 0, 1)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
          onChange={(_event, selectedDate) => {
            vm.closePicker();
            if (selectedDate) vm.setDateOfBirth(selectedDate);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#fff' }}
          handleIndicatorStyle={{ backgroundColor: isDark ? '#48484A' : '#D1D5DB', width: 40 }}
        >
          <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
            <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {t('auth.ageGate.dateOfBirthPlaceholder')}
            </Text>
            <DateTimePicker
              value={vm.dateOfBirth ?? new Date(2000, 0, 1)}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              onChange={(_event, selectedDate) => {
                if (selectedDate) vm.setDateOfBirth(selectedDate);
              }}
            />
          </BottomSheetView>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
}
