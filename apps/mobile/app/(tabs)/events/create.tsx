import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateEventViewModel } from './create.view-model';

// ── Stepper component ────────────────────────────────────────────────────────

function Stepper({
  label,
  value,
  suffix,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  suffix: string;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-medium text-gray-700">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          onPress={onDecrement}
          className="h-10 w-10 items-center justify-center rounded-l-xl bg-gray-100"
        >
          <Text className="text-lg font-bold text-gray-600">-</Text>
        </Pressable>
        <View className="h-10 flex-1 items-center justify-center bg-gray-50">
          <Text className="text-base font-semibold text-gray-900">
            {value} {suffix}
          </Text>
        </View>
        <Pressable
          onPress={onIncrement}
          className="h-10 w-10 items-center justify-center rounded-r-xl bg-gray-100"
        >
          <Text className="text-lg font-bold text-gray-600">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Helper ───────────────────────────────────────────────────────────────────

function formatDateTime(date: Date): string {
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function CreateEventScreen() {
  const vm = useCreateEventViewModel();

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="p-4"
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Titolo *</Text>
            <TextInput
              value={vm.title}
              onChangeText={vm.setTitle}
              placeholder="Es. Passeggiata al parco"
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Descrizione</Text>
            <TextInput
              value={vm.description}
              onChangeText={vm.setDescription}
              placeholder="Aggiungi una descrizione..."
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Location */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Luogo *</Text>
            <TextInput
              value={vm.location}
              onChangeText={vm.setLocation}
              placeholder="Es. Parco Sempione, Milano"
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={200}
            />
          </View>

          {/* Date picker */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Data e ora *</Text>
            <Pressable
              onPress={vm.toggleDatePicker}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
            >
              <Text className="text-base text-gray-900">{formatDateTime(vm.date)}</Text>
            </Pressable>
            {vm.showDatePicker && (
              <DateTimePicker
                value={vm.date}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={vm.handleDateChange}
                locale="it-IT"
              />
            )}
          </View>

          {/* Duration stepper */}
          <Stepper
            label="Durata"
            value={vm.durationMin}
            suffix="min"
            onIncrement={vm.incrementDuration}
            onDecrement={vm.decrementDuration}
          />

          {/* Max participants stepper */}
          <Stepper
            label="Partecipanti massimi"
            value={vm.maxParticipants}
            suffix=""
            onIncrement={vm.incrementParticipants}
            onDecrement={vm.decrementParticipants}
          />

          {/* Submit */}
          <Pressable
            onPress={vm.handleSubmit}
            disabled={!vm.isValid || vm.submitting}
            className={`mt-4 items-center rounded-xl py-4 ${
              vm.isValid && !vm.submitting ? 'bg-primary' : 'bg-gray-200'
            }`}
          >
            {vm.submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`font-semibold ${vm.isValid ? 'text-white' : 'text-gray-400'}`}>
                Crea evento
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
