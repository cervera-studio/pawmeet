import { Modal, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useConsentModalViewModel } from './ConsentModal.view-model';

interface ConsentModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ConsentModal({ visible, onDismiss }: ConsentModalProps) {
  const vm = useConsentModalViewModel(onDismiss);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 py-8">
        <Text className="mb-2 text-2xl font-bold text-gray-900">Privacy e consensi</Text>
        <Text className="mb-6 text-base text-gray-500">
          Scegli quali servizi opzionali attivare. Puoi modificare le tue preferenze in qualsiasi
          momento dalle Impostazioni.
        </Text>

        {/* Analytics */}
        <View className="mb-4 rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">Analisi di utilizzo</Text>
            <Switch
              value={vm.analytics}
              onValueChange={(v) => vm.setConsent('analytics', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500">
            Ci aiuta a capire come usi l'app per migliorarla. Dati anonimi e aggregati.
          </Text>
        </View>

        {/* A/B Testing (experiment logging, not remote config) */}
        <View className="mb-4 rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">Esperimenti A/B</Text>
            <Switch
              value={vm.abTesting}
              onValueChange={(v) => vm.setConsent('abTesting', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500">
            Partecipa a test comparativi per aiutarci a scegliere le funzionalità migliori. La
            configurazione base dell'app funziona sempre, anche senza questo consenso.
          </Text>
        </View>

        {/* Error Tracking — enriches Sentry reports with full context */}
        <View className="mb-4 rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">Segnalazione errori</Text>
            <Switch
              value={vm.errorTracking}
              onValueChange={(v) => vm.setConsent('errorTracking', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500">
            Invia report dettagliati quando qualcosa non funziona. Senza questo consenso, le
            segnalazioni sono comunque inviate in forma anonima.
          </Text>
        </View>

        {/* AI Training */}
        <View className="mb-4 rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">Addestramento AI</Text>
            <Switch
              value={vm.aiTraining}
              onValueChange={(v) => vm.setConsent('aiTraining', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500">
            Aiuta a migliorare il matching addestrando modelli AI sul profilo anonimizzato del tuo
            cane
          </Text>
        </View>

        {/* Marketing */}
        <View className="mb-6 rounded-xl bg-gray-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-gray-800">Comunicazioni marketing</Text>
            <Switch
              value={vm.marketing}
              onValueChange={(v) => vm.setConsent('marketing', v)}
              trackColor={{ true: '#065F46' }}
            />
          </View>
          <Text className="mt-1 text-sm text-gray-500">
            Ricevi aggiornamenti su novità, eventi e promozioni via email.
          </Text>
        </View>

        {/* Actions */}
        <Pressable
          onPress={vm.acceptSelected}
          className="mb-3 items-center rounded-xl bg-primary px-6 py-4"
        >
          <Text className="text-base font-semibold text-white">Accetta selezionati</Text>
        </Pressable>

        <Pressable onPress={vm.rejectAll} className="items-center rounded-xl px-6 py-4">
          <Text className="text-base font-medium text-gray-500">Rifiuta tutto</Text>
        </Pressable>

        <Pressable className="mt-4 items-center">
          <Text className="text-sm text-gray-400 underline">Leggi la Privacy Policy completa</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}
