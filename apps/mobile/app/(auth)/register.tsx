import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleRegister = () => {
    // TODO: implementare registrazione
    router.replace('/(tabs)');
  };

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

          <Input placeholder="Nome completo" value={name} onChangeText={setName} className="mb-4" />

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="mb-4"
          />

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="mb-4"
          />

          <Input
            placeholder="Conferma password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            className="mb-8"
          />

          <Button onPress={handleRegister} label="Registrati" />

          <Text className="mt-4 text-center text-sm text-gray-400">
            Registrandoti accetti i nostri Termini di Servizio e la Privacy Policy
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
