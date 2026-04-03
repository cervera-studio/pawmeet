import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, Text, useColorScheme, View } from 'react-native';
import { getDateLocale } from '@/lib/i18n';

interface DatePickerFieldProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder: string;
  error?: string;
  /** Label shown in the iOS BottomSheet header */
  sheetTitle?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  spacingClassName?: string;
}

/**
 * Unified date picker field.
 * - Android: native date dialog on tap
 * - iOS: BottomSheetModal with spinner picker
 */
export function DatePickerField({
  value,
  onChange,
  placeholder,
  error,
  sheetTitle,
  minimumDate = new Date(1920, 0, 1),
  maximumDate = new Date(),
  spacingClassName = 'mb-8',
}: DatePickerFieldProps) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%'], []);

  const openPicker = useCallback(() => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(true);
    } else {
      bottomSheetModalRef.current?.present();
    }
  }, []);

  const closePicker = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
    ),
    [],
  );

  return (
    <>
      <View>
        <Pressable
          onPress={openPicker}
          className="mb-1 min-h-[52px] justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 dark:border-[#38383A] dark:bg-[#2C2C2E]"
        >
          <Text
            className={
              value ? 'text-base text-gray-900 dark:text-[#F5F5F7]' : 'text-base text-[#9CA3AF]'
            }
          >
            {value
              ? value.toLocaleDateString(getDateLocale(), {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : placeholder}
          </Text>
        </Pressable>
        {error ? (
          <Text className="mb-3 px-1 text-sm text-red-500">{error}</Text>
        ) : (
          <View className={spacingClassName} />
        )}
      </View>

      {Platform.OS === 'android' && showAndroidPicker && (
        <DateTimePicker
          value={value ?? new Date(new Date().getFullYear() - 2, new Date().getMonth(), 1)}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(_event, selectedDate) => {
            setShowAndroidPicker(false);
            if (selectedDate) onChange(selectedDate);
          }}
        />
      )}

      {Platform.OS === 'ios' && (
        <BottomSheetModal
          ref={bottomSheetModalRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: isDark ? '#1C1C1E' : '#fff' }}
          handleIndicatorStyle={{ backgroundColor: isDark ? '#48484A' : '#D1D5DB', width: 40 }}
        >
          <BottomSheetView style={{ flex: 1, paddingHorizontal: 20 }}>
            <Text className="mb-2 text-center text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
              {sheetTitle ?? placeholder}
            </Text>
            <DateTimePicker
              value={value ?? new Date(new Date().getFullYear() - 2, new Date().getMonth(), 1)}
              mode="date"
              display="spinner"
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              onChange={(_event, selectedDate) => {
                if (selectedDate) onChange(selectedDate);
              }}
            />
            <Pressable onPress={closePicker} className="mt-4 mb-8 rounded-2xl bg-primary py-3">
              <Text className="text-center text-base font-semibold text-white">
                {t('common.confirm')}
              </Text>
            </Pressable>
          </BottomSheetView>
        </BottomSheetModal>
      )}
    </>
  );
}
