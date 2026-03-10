import type { RouterOutput } from '@dogwalk/api-client';
import { logger } from '@dogwalk/utils';

/** Photo type as returned by the tRPC layer (Dates serialized as strings). */
type DogPhotoResponse = RouterOutput['dogs']['confirmPhoto']['photo'];

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';
import { api } from '@/lib/trpc';
import { useAuthStore } from '@/stores/auth';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — must match server-side constant

/** Pick a single image from the device library. Returns null if cancelled or denied. */
async function pickImage(
  aspect: [number, number] = [1, 1],
): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permesso necessario', "Consenti l'accesso alla galleria per caricare una foto.");
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

/** Upload a local file to a presigned PUT URL via blob fetch. */
async function uploadToPresignedUrl(
  uploadUrl: string,
  uri: string,
  contentType: string,
): Promise<void> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed with status ${uploadResponse.status}`);
  }
}

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);

  /**
   * Full flow: pick image -> get presigned URL -> upload to R2 -> confirm with backend.
   * Returns the confirmed DogPhoto or null on cancel/error.
   */
  const uploadDogPhoto = async (dogId: string): Promise<DogPhotoResponse | null> => {
    const asset = await pickImage([1, 1]);
    if (!asset) return null;

    setUploading(true);
    try {
      const contentType = resolveContentType(asset);
      const fileSize = asset.fileSize ?? 0;

      if (fileSize > MAX_FILE_SIZE) {
        Alert.alert('File troppo grande', 'La foto non può superare i 5 MB.');
        return null;
      }

      // Step 1: get presigned upload URL
      const { uploadUrl, key } = await api.dogs.uploadPhotoUrl.mutate({
        dogId,
        contentType,
        fileSize,
      });

      // Step 2: upload file directly to R2
      await uploadToPresignedUrl(uploadUrl, asset.uri, contentType);

      // Step 3: confirm upload with backend
      const { photo } = await api.dogs.confirmPhoto.mutate({ dogId, key });

      return photo;
    } catch (e) {
      logger.warn('useImageUpload', 'Dog photo upload failed', e);
      Alert.alert('Errore', 'Impossibile caricare la foto. Riprova.');
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
      const contentType = resolveContentType(asset);
      const fileSize = asset.fileSize ?? 0;

      if (fileSize > MAX_FILE_SIZE) {
        Alert.alert('File troppo grande', 'La foto non può superare i 5 MB.');
        return null;
      }

      // Step 1: get presigned upload URL
      const { uploadUrl, key } = await api.users.uploadAvatarUrl.mutate({
        contentType,
        fileSize,
      });

      // Step 2: upload file directly to R2
      await uploadToPresignedUrl(uploadUrl, asset.uri, contentType);

      // Step 3: confirm upload with backend
      const { avatarUrl } = await api.users.confirmAvatar.mutate({ key });

      // Update the auth store with the new avatar URL
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, avatarUrl });
      }

      return avatarUrl;
    } catch (e) {
      logger.warn('useImageUpload', 'Avatar upload failed', e);
      Alert.alert('Errore', "Impossibile caricare l'immagine del profilo. Riprova.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, uploadDogPhoto, uploadAvatar };
}
