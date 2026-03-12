'use server';

import { revalidatePath } from 'next/cache';
import { getServerTrpcClient } from '@/lib/server-api';
import type { UpdateSettingsInput } from '@/repositories/interfaces';

export async function updateSettings(
  data: UpdateSettingsInput,
): Promise<{ success: boolean; error?: string }> {
  try {
    const api = await getServerTrpcClient();
    await api.admin.updateSettings.mutate(data);
    revalidatePath('/settings');
    return { success: true };
  } catch {
    return { success: false, error: 'Errore durante il salvataggio' };
  }
}
