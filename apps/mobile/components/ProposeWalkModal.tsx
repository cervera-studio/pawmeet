import { WALK_DURATION_MAX, WALK_DURATION_MIN } from '@dogwalk/config';
import { logger } from '@dogwalk/utils';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

type Props = {
  visible: boolean;
  matchId: string;
  onClose: () => void;
  onPropose: (input: {
    matchId: string;
    scheduledAt: string;
    durationMin: number;
    title?: string;
    location?: string;
    notes?: string;
  }) => Promise<void>;
};

export function ProposeWalkModal({ visible, matchId, onClose, onPropose }: Props) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setDate('');
    setTime('');
    setDurationMin(30);
    setTitle('');
    setLocation('');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!date || !time) {
      Alert.alert('Errore', 'Inserisci data e ora');
      return;
    }

    // Parse date (expected: YYYY-MM-DD) and time (expected: HH:MM)
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      Alert.alert('Errore', 'Data o ora non valida. Usa il formato AAAA-MM-GG e HH:MM');
      return;
    }

    if (scheduledAt <= new Date()) {
      Alert.alert('Errore', 'La data deve essere nel futuro');
      return;
    }

    setSubmitting(true);
    try {
      await onPropose({
        matchId,
        scheduledAt: scheduledAt.toISOString(),
        durationMin,
        title: title || undefined,
        location: location || undefined,
        notes: notes || undefined,
      });
      resetForm();
      onClose();
    } catch (e) {
      logger.warn('ProposeWalkModal', 'Failed to propose walk', e);
      Alert.alert('Errore', 'Impossibile proporre la passeggiata');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4">
          <Pressable onPress={onClose}>
            <Text className="text-base text-gray-500">Annulla</Text>
          </Pressable>
          <Text className="text-lg font-bold text-gray-900">Proponi passeggiata</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView className="flex-1 px-4 py-4" keyboardShouldPersistTaps="handled">
          {/* Date input */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">
              Data (AAAA-MM-GG) *
            </Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-03-15"
              className="rounded-xl border border-gray-200 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Time input */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">Ora (HH:MM) *</Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="10:00"
              className="rounded-xl border border-gray-200 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Duration selector */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-gray-700">Durata</Text>
            <View className="flex-row flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDurationMin(d)}
                  className={`rounded-xl px-4 py-2 ${
                    durationMin === d ? 'bg-primary' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      durationMin === d ? 'text-white' : 'text-gray-700'
                    }`}
                  >
                    {d} min
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">Titolo</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Es. Passeggiata al parco"
              className="rounded-xl border border-gray-200 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {/* Location */}
          <View className="mb-4">
            <Text className="mb-1 text-sm font-medium text-gray-700">Luogo</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Es. Parco Sempione, Milano"
              className="rounded-xl border border-gray-200 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={200}
            />
          </View>

          {/* Notes */}
          <View className="mb-6">
            <Text className="mb-1 text-sm font-medium text-gray-700">Note</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Es. Ci vediamo all'ingresso principale"
              className="rounded-xl border border-gray-200 px-4 py-3 text-base"
              placeholderTextColor="#9CA3AF"
              maxLength={500}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit button */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            className={`items-center rounded-xl py-4 ${
              submitting ? 'bg-gray-300' : 'bg-primary'
            }`}
          >
            <Text className="text-base font-bold text-white">
              {submitting ? 'Invio...' : 'Proponi'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
