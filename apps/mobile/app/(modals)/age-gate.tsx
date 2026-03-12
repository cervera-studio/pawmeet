import { MIN_USER_AGE } from '@pawmeet/config';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/Button';
import { useAgeGateViewModel } from './age-gate.view-model';

export default function AgeGateScreen() {
  const vm = useAgeGateViewModel();

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
          <Text className="mb-2 text-4xl font-bold text-gray-900">Verifica età</Text>
          <Text className="mb-8 text-lg text-gray-500">
            Per continuare a usare DogWalk, inserisci la tua data di nascita. Devi avere almeno{' '}
            {MIN_USER_AGE} anni (D.Lgs. 101/2018).
          </Text>

          {vm.error ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{vm.error}</Text>
            </View>
          ) : null}

          <FormField
            placeholder="Data di nascita (AAAA-MM-GG)"
            value={vm.dateOfBirth}
            onChangeText={vm.setDateOfBirth}
            keyboardType="numbers-and-punctuation"
            error={undefined}
            spacingClassName="mb-8"
          />

          <Button
            onPress={vm.handleSubmit}
            label={vm.loading ? 'Invio...' : 'Conferma'}
            disabled={vm.loading}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
