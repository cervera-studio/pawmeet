import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function NewDogScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');

  const steps = ['Info base', 'Carattere', 'Foto'];

  const handleCreate = () => {
    // TODO: creare profilo cane
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Nuovo cane',
          headerBackTitle: 'Profilo',
        }}
      />
      <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
        <ScrollView contentContainerClassName="px-6 py-4">
          {/* Step indicator */}
          <View className="mb-8 flex-row gap-2">
            {steps.map((s, stepIndex) => (
              <View key={s} className="flex-1 items-center">
                <View
                  className={`mb-1 h-1 w-full rounded-full ${
                    stepIndex <= step ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
                <Text className={`text-xs ${stepIndex <= step ? 'text-primary' : 'text-gray-400'}`}>
                  {s}
                </Text>
              </View>
            ))}
          </View>

          {step === 0 && (
            <View className="gap-4">
              <Text className="text-xl font-bold text-gray-900">Come si chiama il tuo cane?</Text>
              <Input placeholder="Nome" value={name} onChangeText={setName} />
              <Input placeholder="Razza" value={breed} onChangeText={setBreed} />
              <Input
                placeholder="Eta (anni)"
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
            </View>
          )}

          {step === 1 && (
            <View className="gap-4">
              <Text className="text-xl font-bold text-gray-900">Parlaci del suo carattere</Text>
              <Input
                placeholder="Bio (descrizione breve)"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
              />
              {/* TODO: tag per temperamento, taglia, energia */}
              <View className="rounded-xl bg-gray-50 p-4">
                <Text className="text-sm text-gray-400">
                  Placeholder per selezione temperamento, taglia, livello energia
                </Text>
              </View>
            </View>
          )}

          {step === 2 && (
            <View className="gap-4">
              <Text className="text-xl font-bold text-gray-900">Aggiungi delle foto</Text>
              <View className="h-48 items-center justify-center rounded-2xl border-2 border-dashed border-gray-200">
                <Text className="text-4xl">📷</Text>
                <Text className="mt-2 text-sm text-gray-400">Tocca per aggiungere foto</Text>
              </View>
            </View>
          )}

          <View className="mt-8">
            {step < steps.length - 1 ? (
              <Button onPress={() => setStep(step + 1)} label="Avanti" />
            ) : (
              <Button onPress={handleCreate} label="Crea profilo" />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
