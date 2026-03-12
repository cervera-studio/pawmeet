import { logger } from '@pawmeet/utils';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useGroupEvents } from '@/hooks/useGroupEvents';
import { useLocation } from '@/hooks/useLocation';
import { useDogsStore } from '@/stores/dogs';

export function useCreateEventViewModel() {
  const router = useRouter();
  const { createEvent } = useGroupEvents();
  const { coordinates, getCurrentLocation } = useLocation();
  const selectedDogId = useDogsStore((s) => s.selectedDogId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [durationMin, setDurationMin] = useState(60);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  const isValid = title.trim().length > 0 && location.trim().length > 0;

  const handleDateChange = useCallback((_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, []);

  const toggleDatePicker = useCallback(() => {
    setShowDatePicker((prev) => !prev);
  }, []);

  const incrementDuration = useCallback(() => {
    setDurationMin((prev) => Math.min(prev + 15, 240));
  }, []);

  const decrementDuration = useCallback(() => {
    setDurationMin((prev) => Math.max(prev - 15, 15));
  }, []);

  const incrementParticipants = useCallback(() => {
    setMaxParticipants((prev) => Math.min(prev + 1, 50));
  }, []);

  const decrementParticipants = useCallback(() => {
    setMaxParticipants((prev) => Math.max(prev - 1, 2));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid) return;

    if (!selectedDogId) {
      Alert.alert('Errore', 'Seleziona un cane dal profilo prima di creare un evento.');
      return;
    }

    setSubmitting(true);
    try {
      // Get current coordinates for the event
      let coords = coordinates;
      if (!coords) {
        coords = await getCurrentLocation();
      }

      if (!coords) {
        Alert.alert('Errore', 'Impossibile ottenere la posizione. Abilita la geolocalizzazione.');
        setSubmitting(false);
        return;
      }

      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: date.toISOString(),
        durationMin,
        location: location.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        maxParticipants,
        visibility: 'public',
        dogId: selectedDogId,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      logger.warn('CreateEvent', 'Failed to create event', e);
      Alert.alert('Errore', "Impossibile creare l'evento. Riprova.");
    } finally {
      setSubmitting(false);
    }
  }, [
    isValid,
    selectedDogId,
    title,
    description,
    date,
    durationMin,
    location,
    coordinates,
    getCurrentLocation,
    maxParticipants,
    createEvent,
    router,
  ]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    location,
    setLocation,
    date,
    showDatePicker,
    durationMin,
    maxParticipants,
    submitting,
    isValid,
    handleDateChange,
    toggleDatePicker,
    incrementDuration,
    decrementDuration,
    incrementParticipants,
    decrementParticipants,
    handleSubmit,
  };
}
