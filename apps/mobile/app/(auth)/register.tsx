import { registerSchema } from '@dogwalk/validation';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setErrors({});
    setApiError('');

    // Check password confirmation first
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: 'Le password non coincidono' });
      return;
    }

    const result = registerSchema.safeParse({ displayName, email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) {
          fieldErrors[key] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      await register(displayName, email, password);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
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

          {apiError ? (
            <View className="mb-4 rounded-xl bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-600">{apiError}</Text>
            </View>
          ) : null}

          <Input
            placeholder="Nome completo"
            value={displayName}
            onChangeText={setDisplayName}
            className="mb-1"
          />
          {errors.displayName ? (
            <Text className="mb-3 px-1 text-sm text-red-500">{errors.displayName}</Text>
          ) : (
            <View className="mb-4" />
          )}

          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            className="mb-1"
          />
          {errors.email ? (
            <Text className="mb-3 px-1 text-sm text-red-500">{errors.email}</Text>
          ) : (
            <View className="mb-4" />
          )}

          <Input
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            className="mb-1"
          />
          {errors.password ? (
            <Text className="mb-3 px-1 text-sm text-red-500">{errors.password}</Text>
          ) : (
            <View className="mb-4" />
          )}

          <Input
            placeholder="Conferma password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            className="mb-1"
          />
          {errors.confirmPassword ? (
            <Text className="mb-3 px-1 text-sm text-red-500">{errors.confirmPassword}</Text>
          ) : (
            <View className="mb-8" />
          )}

          <Button
            onPress={handleRegister}
            label={loading ? 'Registrazione...' : 'Registrati'}
            disabled={loading}
          />

          <Text className="mt-4 text-center text-sm text-gray-400">
            Registrandoti accetti i nostri Termini di Servizio e la Privacy Policy
          </Text>

          <Pressable onPress={() => router.back()} className="mt-6 items-center py-2">
            <Text className="text-base text-gray-500">
              Hai già un account? <Text className="font-semibold text-primary">Accedi</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
