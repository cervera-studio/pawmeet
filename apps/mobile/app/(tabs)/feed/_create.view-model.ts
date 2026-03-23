import { logger } from '@pawmeet/utils';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useLocation } from '@/hooks/useLocation';
import { usePostUpload } from '@/hooks/usePostUpload';
import { api } from '@/lib/trpc';

interface SelectedMedia {
  uri: string;
  type: string;
  fileSize: number;
}

export interface TagOption {
  type: 'user' | 'dog';
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export function useCreatePostViewModel() {
  const { t } = useTranslation();
  const router = useRouter();
  const { coordinates, getCurrentLocation } = useLocation();
  const { uploading, progress, createPost, uploadMedia } = usePostUpload();

  const [caption, setCaption] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia[]>([]);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  // Lazy-load tag options only when the picker is opened
  const [tagOptionsLoaded, setTagOptionsLoaded] = useState(false);
  useEffect(() => {
    if (!showTagPicker || tagOptionsLoaded) return;

    async function loadTagOptions() {
      try {
        const [dogsData, matchesData] = await Promise.all([
          api.dogs.list.query(),
          api.matches.list.query(),
        ]);

        const options: TagOption[] = [];
        const addedIds = new Set<string>();

        // Add user's own dogs
        for (const dog of dogsData.dogs) {
          if (!addedIds.has(dog.id)) {
            options.push({ type: 'dog', id: dog.id, name: dog.name });
            addedIds.add(dog.id);
          }
        }

        // Add matched users and their dogs
        for (const match of matchesData.matches) {
          if (match.otherOwner && !addedIds.has(match.otherOwner.id)) {
            options.push({
              type: 'user',
              id: match.otherOwner.id,
              name: match.otherOwner.displayName,
            });
            addedIds.add(match.otherOwner.id);
          }
          if (match.otherDog && !addedIds.has(match.otherDog.id)) {
            options.push({ type: 'dog', id: match.otherDog.id, name: match.otherDog.name });
            addedIds.add(match.otherDog.id);
          }
        }

        setTagOptions(options);
        setTagOptionsLoaded(true);
      } catch (e) {
        logger.warn('createPost', 'Failed to load tag options', e);
      }
    }
    void loadTagOptions();
  }, [showTagPicker, tagOptionsLoaded]);

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

  const toggleTag = useCallback((tag: TagOption) => {
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.type === tag.type && t.id === tag.id);
      if (exists) return prev.filter((t) => !(t.type === tag.type && t.id === tag.id));
      return [...prev, tag];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedMedia.length === 0) {
      Alert.alert(t('common.error'), t('feed.create.selectMediaError'));
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
      Alert.alert(t('common.error'), t('feed.create.createError'));
      return;
    }

    const success = await uploadMedia(post.id, selectedMedia);

    // Add tags if any selected
    if (selectedTags.length > 0) {
      try {
        await api.feed.addTags.mutate({
          postId: post.id,
          tags: selectedTags.map((t) => ({
            taggedUserId: t.type === 'user' ? t.id : null,
            taggedDogId: t.type === 'dog' ? t.id : null,
          })),
        });
      } catch (e) {
        logger.warn('createPost', 'Failed to add tags', e);
      }
    }

    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } else {
      Alert.alert(t('common.error'), t('feed.create.uploadMediaFailed'));
    }
  }, [
    selectedMedia,
    selectedTags,
    caption,
    includeLocation,
    coordinates,
    getCurrentLocation,
    createPost,
    uploadMedia,
    router,
    t,
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
    selectedTags,
    tagOptions,
    showTagPicker,
    setShowTagPicker,
    toggleTag,
    goBack: () => router.back(),
  };
}
