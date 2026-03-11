export interface AppSettings {
  appName: string;
  supportEmail: string;
  photoConfidenceThreshold: number;
  maxReportsBeforeSuspension: number;
}

export interface UpdateSettingsInput {
  appName?: string;
  supportEmail?: string;
  photoConfidenceThreshold?: number;
  maxReportsBeforeSuspension?: number;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(input: UpdateSettingsInput): Promise<AppSettings>;
}
