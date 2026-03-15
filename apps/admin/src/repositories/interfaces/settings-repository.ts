export interface AppSettings {
  appName: string;
  supportEmail: string;
  photoConfidenceThreshold: number;
  maxReportsBeforeSuspension: number;
  matchWeightSize: number;
  matchWeightEnergy: number;
  matchWeightBehavior: number;
  matchWeightWalk: number;
  matchWeightDistance: number;
  matchWeightLeash: number;
}

export interface UpdateSettingsInput {
  appName?: string;
  supportEmail?: string;
  photoConfidenceThreshold?: number;
  maxReportsBeforeSuspension?: number;
  matchWeightSize?: number;
  matchWeightEnergy?: number;
  matchWeightBehavior?: number;
  matchWeightWalk?: number;
  matchWeightDistance?: number;
  matchWeightLeash?: number;
}

export interface SettingsRepository {
  get(): Promise<AppSettings>;
  update(input: UpdateSettingsInput): Promise<AppSettings>;
}
