import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';

const REPORT_REASONS = [
  'Profilo falso',
  'Contenuto inappropriato',
  'Comportamento molesto',
  'Spam',
  'Altro',
];

export default function ReportModal() {
  const router = useRouter();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');

  const handleSubmit = () => {
    // TODO: inviare segnalazione
    router.back();
  };

  return (
    <View className="flex-1 bg-white px-6 py-4">
      <Text className="mb-2 text-2xl font-bold text-gray-900">Segnala</Text>
      <Text className="mb-6 text-base text-gray-500">Seleziona il motivo della segnalazione</Text>

      <View className="gap-2">
        {REPORT_REASONS.map((reason) => (
          <Pressable
            key={reason}
            onPress={() => setSelectedReason(reason)}
            className={`rounded-xl border px-4 py-3 ${
              selectedReason === reason ? 'border-primary bg-primary-50' : 'border-gray-200'
            }`}
          >
            <Text
              className={`text-base ${
                selectedReason === reason ? 'font-medium text-primary' : 'text-gray-700'
              }`}
            >
              {reason}
            </Text>
          </Pressable>
        ))}
      </View>

      <TextInput
        className="mt-4 h-24 rounded-xl border border-gray-200 p-4 text-base"
        placeholder="Dettagli aggiuntivi (opzionale)"
        value={details}
        onChangeText={setDetails}
        multiline
        textAlignVertical="top"
      />

      <View className="mt-6">
        <Button onPress={handleSubmit} label="Invia segnalazione" disabled={!selectedReason} />
      </View>
    </View>
  );
}
