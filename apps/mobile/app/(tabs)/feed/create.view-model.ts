import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { usePostUpload } from '@/hooks/usePostUpload';

interface SelectedMedia {
  uri: string;
  type: string;
  fileSize: number;
}

export function useCreatePostViewModel() {
  const router = useRouter();
  const { coordinates, getCurrentLocation } = useLocation();
  const { uploading, progress, createPost, uploadMedia } = usePostUpload();

  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [includeLocation, setIncludeLocation] = useState(false);

  const pickMedia = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - selectedMedia.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newMedia: SelectedMedia[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
        fileSize: asset.fileSize ?? 0,
      }));
      setSelectedMedia((prev) => [...prev, ...newMedia].slice(0, 10));
    }
  }, [selectedMedia.length]);

  const removeMedia = useCallback((index: number) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedMedia.length === 0) {
      Alert.alert('Errore', 'Seleziona almeno una foto o video');
      return;
    }

    let lat: number | null = null;
    let lng: number | null = null;
    if (includeLocation) {
      const coords = coordinates ?? (await getCurrentLocation());
      if (coords) {
        lat = coords.latitude;
        lng = coords.longitude;
      }
    }

    const post = await createPost({
      caption: caption.trim() || null,
      latitude: lat,
      longitude: lng,
      walkId: null,
    });

    if (!post) {
      Alert.alert('Errore', 'Impossibile creare il post');
      return;
    }

    const success = await uploadMedia(post.id, selectedMedia);

    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert('Errore', 'Caricamento media fallito');
    }
  }, [
    selectedMedia,
    caption,
    includeLocation,
    coordinates,
    getCurrentLocation,
    createPost,
    uploadMedia,
    router,
  ]);

  const canSubmit = selectedMedia.length > 0 && !uploading;

  return {
    caption,
    setCaption,
    selectedMedia,
    includeLocation,
    setIncludeLocation,
    uploading,
    progress,
    canSubmit,
    pickMedia,
    removeMedia,
    handleSubmit,
    goBack: () => router.back(),
  };
}
