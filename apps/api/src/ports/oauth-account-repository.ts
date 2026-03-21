export interface OAuthAccountRecord {
  id: string;
  userId: string;
  provider: string;
  providerUserId: string;
  providerEmail: string | null;
  linkedAt: Date;
}

export interface OAuthAccountRepository {
  findByProviderUid(provider: string, providerUserId: string): Promise<OAuthAccountRecord | null>;
  findByUserId(userId: string): Promise<OAuthAccountRecord[]>;
  upsert(input: {
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail?: string | null;
  }): Promise<OAuthAccountRecord>;
  deleteByUserAndProvider(userId: string, provider: string): Promise<void>;
}
