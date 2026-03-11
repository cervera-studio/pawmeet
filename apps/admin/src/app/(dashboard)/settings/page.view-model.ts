import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { settingsRepository } from '@/repositories';

export function useSettingsViewModel() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [appName, setAppName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [photoConfidence, setPhotoConfidence] = useState(95);
  const [maxReports, setMaxReports] = useState(5);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await settingsRepository.get();
      setAppName(settings.appName);
      setSupportEmail(settings.supportEmail);
      setPhotoConfidence(settings.photoConfidenceThreshold);
      setMaxReports(settings.maxReportsBeforeSuspension);
    } catch (error) {
      console.error('[Settings] Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  async function handleSaveGeneral() {
    setIsSaving(true);
    try {
      await settingsRepository.update({ appName, supportEmail });
      toast.success('Impostazioni salvate');
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveModeration() {
    setIsSaving(true);
    try {
      await settingsRepository.update({
        photoConfidenceThreshold: photoConfidence,
        maxReportsBeforeSuspension: maxReports,
      });
      toast.success('Impostazioni salvate');
    } catch {
      toast.error('Errore durante il salvataggio');
    } finally {
      setIsSaving(false);
    }
  }

  function handleClearCache() {
    toast.info('Funzionalita non ancora implementata');
  }

  return {
    isLoading,
    isSaving,
    appName,
    setAppName,
    supportEmail,
    setSupportEmail,
    photoConfidence,
    setPhotoConfidence,
    maxReports,
    setMaxReports,
    handleSaveGeneral,
    handleSaveModeration,
    handleClearCache,
  };
}
