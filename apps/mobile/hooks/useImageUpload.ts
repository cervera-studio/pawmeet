import { logger } from '@pawmeet/utils';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';
import i18n from '@/lib/i18n';
import { uploadToPresignedUrl } from '@/lib/upload';
import { container } from '@/repositories/container';
import type { MediaContentType } from '@/repositories/interfaces';
import { MEDIA_REPOSITORY } from '@/repositories/tokens';
import { useAuthStore } from '@/stores/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — must match server-side constant

const mediaRepo = container.resolve(MEDIA_REPOSITORY);

/** Pick a single image from the device library. Returns null if cancelled or denied. */
async function pickImage(
  aspect: [number, number] = [1, 1],
): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(i18n.t('common.permissionRequired'), i18n.t('common.galleryPermission'));
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    aspect,
  });

  if (result.canceled) return null;
  return result.assets[0] ?? null;
}

/** Resolve a content:// or file:// URI to a content type usable for the presigned URL. */
function resolveContentType(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.mimeType) return asset.mimeType;
  const ext = asset.uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  /**
   * Full flow: pick image -> get presigned URL -> upload to R2 -> confirm with backend.
   * Returns the confirmed DogPhoto or null on cancel/error.
   */
  const uploadDogPhoto = async (dogId: string) => {
    const asset = await pickImage([1, 1]);
    if (!asset) return null;

    setUploading(true);
    try {
      const contentType = resolveContentType(asset) as MediaContentType;
      const fileSize = asset.fileSize ?? 0;

      if (fileSize > MAX_FILE_SIZE) {
        Alert.alert(i18n.t('common.fileTooLarge'), i18n.t('common.fileTooLargeMessage'));
        return null;
      }

      const { uploadUrl, key } = await mediaRepo.getDogPhotoUploadUrl(dogId, contentType, fileSize);
      await uploadToPresignedUrl(uploadUrl, asset.uri, contentType);
      const { photo } = await mediaRepo.confirmDogPhoto(dogId, key);

      return photo;
    } catch (e) {
      logger.warn('useImageUpload', 'Dog photo upload failed', e);
      Alert.alert(i18n.t('common.error'), i18n.t('common.uploadPhotoError'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  /**
   * Full flow: pick image -> get presigned URL -> upload to R2 -> confirm with backend.
   * Returns the new avatar URL or null on cancel/error.
   */
  const uploadAvatar = async (): Promise<string | null> => {
    const asset = await pickImage([1, 1]);
    if (!asset) return null;

    setUploading(true);
    try {
      const contentType = resolveContentType(asset) as MediaContentType;
      const fileSize = asset.fileSize ?? 0;

      if (fileSize > MAX_FILE_SIZE) {
        Alert.alert(i18n.t('common.fileTooLarge'), i18n.t('common.fileTooLargeMessage'));
        return null;
      }

      const { uploadUrl, key } = await mediaRepo.getAvatarUploadUrl(contentType, fileSize);
      await uploadToPresignedUrl(uploadUrl, asset.uri, contentType);
      const { avatarUrl } = await mediaRepo.confirmAvatar(key);

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, avatarUrl });
      }

      return avatarUrl;
    } catch (e) {
      logger.warn('useImageUpload', 'Avatar upload failed', e);
      Alert.alert(i18n.t('common.error'), i18n.t('common.uploadAvatarError'));
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadDogPhoto, uploadAvatar };
}
