import { logger } from '@pawmeet/utils';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

type ProposeInput = {
  matchId: string;
  scheduledAt: string;
  durationMin: number;
  title?: string;
  location?: string;
  notes?: string;
};

export function useProposeWalkViewModel(
  matchId: string,
  onPropose: (input: ProposeInput) => Promise<void>,
  onClose: () => void,
) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMin, setDurationMin] = useState(30);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setDate('');
    setTime('');
    setDurationMin(30);
    setTitle('');
    setLocation('');
    setNotes('');
  }, []);

  const handleSubmit = useCallback(async () => {
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
  }, [date, time, durationMin, title, location, notes, matchId, onPropose, onClose, resetForm]);

  return {
    date,
    setDate,
    time,
    setTime,
    durationMin,
    setDurationMin,
    title,
    setTitle,
    location,
    setLocation,
    notes,
    setNotes,
    submitting,
    handleSubmit,
  };
}
