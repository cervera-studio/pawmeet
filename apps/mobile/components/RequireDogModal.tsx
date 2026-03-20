import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';

interface RequireDogModalProps {
  visible: boolean;
  onDismiss: () => void;
  onAddDog: () => void;
}

export function RequireDogModal({ visible, onDismiss, onAddDog }: RequireDogModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        onPress={onDismiss}
        className="flex-1 items-center justify-center bg-black/50 px-8"
      >
        <View
          className="w-full rounded-3xl bg-white dark:bg-[#2C2C2E] px-6 py-8"
          onStartShouldSetResponder={() => true}
        >
          <Text className="mb-2 text-center text-4xl">🐾</Text>
          <Text className="mb-2 text-center text-xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {t('requireDog.title')}
          </Text>
          <Text className="mb-6 text-center text-sm text-gray-500 dark:text-neutral-500">
            {t('requireDog.description')}
          </Text>
          <Button onPress={onAddDog} label={t('requireDog.addDog')} />
          <Pressable onPress={onDismiss} className="mt-3 items-center py-2">
            <Text className="text-sm text-gray-400 dark:text-neutral-500">
              {t('requireDog.later')}
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
