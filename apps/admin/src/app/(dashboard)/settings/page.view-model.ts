import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

export function useSettingsViewModel() {
  const { data: settings, isLoading } = trpc.admin.getSettings.useQuery();
  const utils = trpc.useUtils();

  const [appName, setAppName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [photoConfidence, setPhotoConfidence] = useState(95);
  const [maxReports, setMaxReports] = useState(5);

  // Sync form state with fetched data
  useEffect(() => {
    if (settings) {
      setAppName(settings.appName);
      setSupportEmail(settings.supportEmail);
      setPhotoConfidence(settings.photoConfidenceThreshold);
      setMaxReports(settings.maxReportsBeforeSuspension);
    }
  }, [settings]);

  const updateMutation = trpc.admin.updateSettings.useMutation({
    onSuccess: () => {
      utils.admin.getSettings.invalidate();
      toast.success('Impostazioni salvate');
    },
    onError: () => toast.error('Errore durante il salvataggio'),
  });

  function handleSaveGeneral() {
    updateMutation.mutate({ appName, supportEmail });
  }

  function handleSaveModeration() {
    updateMutation.mutate({
      photoConfidenceThreshold: photoConfidence,
      maxReportsBeforeSuspension: maxReports,
    });
  }

  function handleClearCache() {
    toast.info('Funzionalita non ancora implementata');
  }

  const isSaving = updateMutation.isPending;

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
