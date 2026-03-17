'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { getServerTrpcClient } from '@/lib/server-api';
import type { AppSettings, UpdateSettingsInput } from '@/repositories/interfaces';

export async function fetchSettings(): Promise<AppSettings> {
  const api = await getServerTrpcClient();
  return api.admin.getSettings.query();
}

export async function updateSettings(
  data: UpdateSettingsInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.updateSettings.mutate(data);
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('[updateSettings]', error);
    const tt = await getTranslations('toast');
    return { success: false, error: tt('settings.saveError') };
  }
}
