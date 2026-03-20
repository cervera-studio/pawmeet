export interface ConsentRecord {
  consentType: string;
  granted: boolean;
  grantedAt: Date;
  source: string;
}

export interface ConsentRepository {
  upsert(
    userId: string,
    consentType: string,
    granted: boolean,
    source: string,
    ipAddress: string | null,
    userAgent: string | null,
  ): Promise<void>;
  findByUser(userId: string): Promise<ConsentRecord[]>;
}
