import { useState } from 'react';
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: implementare login
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 justify-center px-8">
          <Text className="mb-2 text-4xl font-bold text-gray-900">Bentornato!</Text>
          <Text className="mb-8 text-lg text-gray-500">
            Accedi per continuare
          </Text>

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
            className="mb-2"
          />

          <Pressable className="mb-8 self-end">
            <Text className="text-sm text-primary">Password dimenticata?</Text>
          </Pressable>

          <Button onPress={handleLogin} label="Accedi" />

          {/* Social login placeholders */}
          <View className="mt-8">
            <View className="mb-4 flex-row items-center">
              <View className="flex-1 border-b border-gray-200" />
              <Text className="mx-4 text-gray-400">oppure</Text>
              <View className="flex-1 border-b border-gray-200" />
            </View>

            <Pressable className="mb-3 flex-row items-center justify-center rounded-2xl border border-gray-200 py-4">
              <Text className="text-base font-medium text-gray-700">
                Continua con Google
              </Text>
            </Pressable>

            <Pressable className="flex-row items-center justify-center rounded-2xl border border-gray-200 py-4">
              <Text className="text-base font-medium text-gray-700">
                Continua con Apple
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="px-8 pb-8">
          <Pressable
            onPress={() => router.push('/(auth)/register')}
            className="items-center py-2"
          >
            <Text className="text-base text-gray-500">
              Non hai un account?{' '}
              <Text className="font-semibold text-primary">Registrati</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
