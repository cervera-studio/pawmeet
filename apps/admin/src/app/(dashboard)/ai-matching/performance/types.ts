export interface ModelEntry {
  id: string;
  version: string;
  trainingSamplesCount: number | null;
  metrics: unknown;
  isActive: boolean;
  promotedAt: string | Date | null;
  createdAt: string | Date;
}
