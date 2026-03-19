import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { useVerifyEmailViewModel } from './verify-email.view-model';

export default function VerifyEmailScreen() {
  const vm = useVerifyEmailViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            Verifica la tua email
          </Text>
          <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
            Abbiamo inviato un codice a 6 cifre a{' '}
            <Text className="font-semibold text-gray-700 dark:text-[#D1D1D6]">{vm.email}</Text>
          </Text>

          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.apiError}</Text>
            </View>
          ) : null}

          <TextInput
            value={vm.otp}
            onChangeText={vm.setOtp}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-center text-3xl font-bold tracking-[12px] text-gray-900 dark:border-[#38383A] dark:bg-[#2C2C2E] dark:text-[#F5F5F7]"
            placeholder="000000"
            placeholderTextColor="#9CA3AF"
          />

          <Button
            onPress={vm.handleVerify}
            label={vm.loading ? 'Verificando...' : 'Verifica'}
            disabled={!vm.canVerify}
          />

          <Pressable
            onPress={vm.handleResend}
            disabled={vm.countdown > 0 || vm.resending}
            className="mt-6 items-center py-2"
          >
            <Text
              className={`text-base ${
                vm.countdown > 0 || vm.resending
                  ? 'text-gray-400 dark:text-neutral-600'
                  : 'font-semibold text-primary'
              }`}
            >
              {vm.resending
                ? 'Invio in corso...'
                : vm.countdown > 0
                  ? `Reinvia codice (${vm.countdown}s)`
                  : 'Reinvia codice'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
