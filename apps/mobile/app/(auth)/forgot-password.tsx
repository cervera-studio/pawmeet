import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useForgotPasswordViewModel } from './forgot-password.view-model';

export default function ForgotPasswordScreen() {
  const vm = useForgotPasswordViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#1C1C1E]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Text className="mb-2 text-4xl font-bold text-gray-900 dark:text-[#F5F5F7]">
            {vm.phase === 'request' ? 'Recupera password' : 'Reimposta password'}
          </Text>
          <Text className="mb-8 text-lg text-gray-500 dark:text-neutral-500">
            {vm.phase === 'request'
              ? 'Inserisci la tua email per ricevere un codice di verifica'
              : 'Inserisci il codice ricevuto e la nuova password'}
          </Text>

          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.apiError}</Text>
            </View>
          ) : null}

          {vm.phase === 'request' ? (
            <>
              <FormField
                placeholder="Email"
                value={vm.email}
                onChangeText={vm.setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={vm.errors.email}
              />

              <Button
                onPress={vm.handleRequestReset}
                label={vm.loading ? 'Invio in corso...' : 'Invia codice'}
                disabled={vm.loading}
              />
            </>
          ) : (
            <>
              <FormField
                placeholder="Codice di verifica (6 cifre)"
                value={vm.otp}
                onChangeText={vm.setOtp}
                keyboardType="number-pad"
                maxLength={6}
                error={vm.errors.otp}
              />

              <FormField
                placeholder="Nuova password"
                value={vm.newPassword}
                onChangeText={vm.setNewPassword}
                secureTextEntry
                error={vm.errors.newPassword}
              />

              <FormField
                placeholder="Conferma password"
                value={vm.confirmPassword}
                onChangeText={vm.setConfirmPassword}
                secureTextEntry
                error={vm.errors.confirmPassword}
                spacingClassName="mb-2"
              />

              <Pressable
                onPress={vm.handleResendCode}
                disabled={vm.resendDisabled}
                className="mb-6 self-end"
              >
                <Text
                  className={`text-sm ${vm.resendDisabled ? 'text-gray-400 dark:text-neutral-600' : 'text-primary'}`}
                >
                  Reinvia codice
                </Text>
              </Pressable>

              <Button
                onPress={vm.handleResetPassword}
                label={vm.loading ? 'Reimpostazione...' : 'Reimposta password'}
                disabled={vm.loading}
              />
            </>
          )}
        </View>

        <View className="px-8 pb-8">
          <Pressable onPress={vm.navigateToLogin} className="items-center py-2">
            <Text className="text-base text-gray-500 dark:text-neutral-500">
              Torna al <Text className="font-semibold text-primary">Login</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
