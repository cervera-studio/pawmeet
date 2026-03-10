import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useRegisterViewModel } from './register.view-model';

export default function RegisterScreen() {
  const vm = useRegisterViewModel();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-8"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 text-4xl font-bold text-gray-900">Crea account</Text>
          <Text className="mb-8 text-lg text-gray-500">Unisciti alla community DogWalk</Text>

          {vm.apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.apiError}</Text>
            </View>
          ) : null}

          <FormField
            placeholder="Nome completo"
            value={vm.displayName}
            onChangeText={vm.setDisplayName}
            error={vm.errors.displayName}
          />

          <FormField
            placeholder="Email"
            value={vm.email}
            onChangeText={vm.setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={vm.errors.email}
          />

          <FormField
            placeholder="Password"
            value={vm.password}
            onChangeText={vm.setPassword}
            secureTextEntry
            error={vm.errors.password}
          />

          <FormField
            placeholder="Conferma password"
            value={vm.confirmPassword}
            onChangeText={vm.setConfirmPassword}
            secureTextEntry
            error={vm.errors.confirmPassword}
            spacingClassName="mb-8"
          />

          <Button
            onPress={vm.handleRegister}
            label={vm.loading ? 'Registrazione...' : 'Registrati'}
            disabled={vm.loading}
          />

          <Text className="mt-4 text-center text-sm text-gray-400">
            Registrandoti accetti i nostri Termini di Servizio e la Privacy Policy
          </Text>

          <Pressable onPress={vm.navigateToLogin} className="mt-6 items-center py-2">
            <Text className="text-base text-gray-500">
              Hai già un account? <Text className="font-semibold text-primary">Accedi</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
