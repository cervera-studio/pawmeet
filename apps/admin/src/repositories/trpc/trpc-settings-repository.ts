import type { ApiClient } from '@dogwalk/api-client';
import type { AppSettings, SettingsRepository, UpdateSettingsInput } from '../interfaces';

export function createTrpcSettingsRepository(api: ApiClient): SettingsRepository {
  return {
    async get(): Promise<AppSettings> {
      return api.admin.getSettings.query();
    },
    async update(input: UpdateSettingsInput): Promise<AppSettings> {
      return api.admin.updateSettings.mutate(input);
    },
  };
}
